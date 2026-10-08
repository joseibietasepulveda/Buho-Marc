import { NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/db";
import { withSession } from "@/lib/auth";
import { organizationId, actorId } from "@/lib/tenant-context";
import { readAssistedImportFile, portfolioKind } from "@/lib/portfolio-import";
import { assignImportedClient } from "@/db/import-client";
import { discoveryCandidate } from "@/lib/inapi-discovery";
import { fetchInapi, isRealSource } from "@/lib/inapi-provider";
import { importRealRecord } from "@/db/inapi-portfolio";
import { isFiledOpposition } from "@/db/opposition-role";
import { sourceError, } from "@/lib/source-api";
import { statusLabel, type SourceRecord } from "@/lib/source-contract";
export const runtime = "nodejs";
export const maxDuration = 120;
// ownPortfolioConfirmed remains optional for compatibility with older clients; selection is sufficient.
const schema = z.object({ action: z.enum(["preview", "import"]), ids: z.array(z.string().regex(/^[1-9]\d{0,8}$/)).min(1).max(10), ownPortfolioConfirmed: z.boolean().optional(), assignments: z.record(z.string().regex(/^[1-9]\d{0,8}$/), z.object({ clientId: z.string().regex(/^CL-\d+$|^unassigned$/), clientRole: z.enum(["holder", "representative"]) }).strict()).optional() }).strict().refine(value => !value.assignments || Object.keys(value.assignments).every(id => value.ids.includes(id)), "La asignación debe corresponder a la selección.");
export const POST = withSession(async request => {
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      if (Number(request.headers.get("content-length") ?? 0) > 2.1 * 1024 * 1024) return NextResponse.json({ message: "El archivo supera 2 MB" }, { status: 413 });
      const file = (await request.formData()).get("file");
      if (!(file instanceof File)) return NextResponse.json({ message: "Selecciona un Excel o CSV" }, { status: 400 });
      return NextResponse.json(await readAssistedImportFile(Buffer.from(await file.arrayBuffer()), file.name));
    }
    const input = schema.parse(await request.json());
    if (!isRealSource()) return NextResponse.json({ message: "La consulta real de INAPI no está configurada en este ambiente. Los IDs pueden leerse, pero aún no se pueden incorporar expedientes." }, { status: 409 });
    const ids = [...new Set(input.ids)];
    if (input.action === "import" && input.assignments) {
      const clientIds = [...new Set(Object.values(input.assignments).map(a => a.clientId).filter(id => id !== "unassigned"))];
      if (clientIds.length) {
        const clients = await getSql()`SELECT public_code FROM client_contacts WHERE organization_id = ${organizationId()} AND public_code IN ${getSql()(clientIds)}`;
        if (clients.length !== clientIds.length) return NextResponse.json({ message: "Revisa los clientes de la selección: alguno no pertenece a tu espacio." }, { status: 400 });
      }
    }
    const records: SourceRecord[] = [];
    const errors = new Map<string, string>();
    try { records.push(...(await fetchInapi({ applicationIds: ids, registrationIds: [] })).records); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("INAPI no devolvió las solicitudes:")) throw error;
      const missing = error.message.split(":")[1].split(".")[0].split(",").map(s => s.trim());
      for (const id of missing) errors.set(id, "No encontrado en la fuente. Comprueba que sea el número de solicitud.");
      const found = ids.filter(id => !errors.has(id));
      if (found.length) records.push(...(await fetchInapi({ applicationIds: found, registrationIds: [] })).records);
    }
    const results = [];
    for (const id of ids) {
      const record = records.find(r => r.applicationNumber === id);
      if (!record) { results.push({ id, outcome: "error", message: errors.get(id) ?? "Sin respuesta del proveedor" }); continue; }
      const kind = portfolioKind(record);
      const outcome = await getSql().begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(hashtext(${organizationId()}), 741028)`;
        if (await isFiledOpposition(tx, id)) return "opposition";
        const [existing] = await tx`SELECT id FROM source_snapshots WHERE organization_id = ${organizationId()} AND entity_type IN ('brand', 'application') AND data->>'applicationNumber' = ${id}`;
        if (existing) return "existing";
        if (input.action === "preview") return "ready";
        await importRealRecord(tx, record, kind);
        await assignImportedClient(tx, id, kind, input.assignments?.[id]);
        await tx`INSERT INTO source_sync_runs (organization_id, trigger, status, completed_at, requested, received, baseline, request) VALUES (${organizationId()}, 'enrollment', 'success', now(), 1, 1, 1, ${tx.json({ applicationIds: [id], registrationIds: [] })})`;
        await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) SELECT ${organizationId()}, ${actorId()}, 'portfolio.imported', entity_type, entity_id, ${tx.json({ applicationNumber: id, destination: kind })} FROM source_snapshots WHERE organization_id = ${organizationId()} AND entity_type = ${kind} AND data->>'applicationNumber' = ${id}`;
        return "imported";
      });
      results.push({ id, outcome, name: record.name, destination: outcome === "opposition" ? "Casos · Oposición presentada" : kind === "brand" ? "Marcas" : "Solicitudes", status: statusLabel(record.status), registrationNumber: record.registrationNumber, candidate: { ...discoveryCandidate(record), tracked: outcome === "existing" || outcome === "imported" || outcome === "opposition" } });
    }
    return NextResponse.json({ results });
  } catch (error) { return sourceError(error); }
});
