import { NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/db";
import { withSession } from "@/lib/auth";
import { organizationId, actorId } from "@/lib/tenant-context";
import { readImportFile, portfolioKind } from "@/lib/portfolio-import";
import { fetchInapi, isRealSource } from "@/lib/inapi-provider";
import { importRealRecord } from "@/db/inapi-portfolio";
import { isFiledOpposition } from "@/db/opposition-role";
import { sourceError, } from "@/lib/source-api";
import { statusLabel, type SourceRecord } from "@/lib/source-contract";
export const runtime = "nodejs";
export const maxDuration = 120;
const schema = z.object({ action: z.enum(["preview", "import"]), ids: z.array(z.string().regex(/^[1-9]\d{0,8}$/)).min(1).max(10), ownPortfolioConfirmed: z.boolean().optional() }).strict();
export const POST = withSession(async request => {
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      if (Number(request.headers.get("content-length") ?? 0) > 2.1 * 1024 * 1024) return NextResponse.json({ message: "El archivo supera 2 MB" }, { status: 413 });
      const file = (await request.formData()).get("file");
      if (!(file instanceof File)) return NextResponse.json({ message: "Selecciona un Excel o CSV" }, { status: 400 });
      return NextResponse.json(await readImportFile(Buffer.from(await file.arrayBuffer()), file.name));
    }
    const input = schema.parse(await request.json());
    if (input.action === "import" && !input.ownPortfolioConfirmed) return NextResponse.json({ message: "Confirma que los números corresponden a solicitudes propias o de tus clientes como solicitantes. Las oposiciones presentadas se cargan en Casos." }, { status: 400 });
    if (!isRealSource()) return NextResponse.json({ message: "La consulta real de INAPI no está configurada en este ambiente. Los IDs pueden leerse, pero aún no se pueden incorporar expedientes." }, { status: 409 });
    const ids = [...new Set(input.ids)];
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
        await tx`INSERT INTO source_sync_runs (organization_id, trigger, status, completed_at, requested, received, baseline, request) VALUES (${organizationId()}, 'enrollment', 'success', now(), 1, 1, 1, ${tx.json({ applicationIds: [id], registrationIds: [] })})`;
        await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) SELECT ${organizationId()}, ${actorId()}, 'portfolio.imported', entity_type, entity_id, ${tx.json({ applicationNumber: id, destination: kind })} FROM source_snapshots WHERE organization_id = ${organizationId()} AND entity_type = ${kind} AND data->>'applicationNumber' = ${id}`;
        return "imported";
      });
      results.push({ id, outcome, name: record.name, destination: outcome === "opposition" ? "Casos · Oposición presentada" : kind === "brand" ? "Marcas" : "Solicitudes", status: statusLabel(record.status), registrationNumber: record.registrationNumber });
    }
    return NextResponse.json({ results });
  } catch (error) { return sourceError(error); }
});
