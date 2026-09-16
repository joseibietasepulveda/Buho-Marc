import { NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/db";
import { withSession } from "@/lib/auth";
import { actorId, organizationId } from "@/lib/tenant-context";
import { fetchInapi, isRealSource } from "@/lib/inapi-provider";
import { sourceError } from "@/lib/source-api";
import type { OppositionProceeding } from "@/lib/opposition";
const schema = z.object({
  applicationNumber: z.string().regex(/^[1-9]\d{0,8}$/), opponent: z.string().trim().min(2).max(180),
  basisCode: z.string().max(30).optional(), filedAt: z.string().date().optional(),
  documentUrl: z.string().url().max(1500).refine(v => { const url = new URL(v); return url.protocol === "https:" && !url.username && !url.password; }).optional(),
  note: z.string().max(3000).optional(), confirm: z.boolean().default(false),
}).strict();
export const POST = withSession(async request => {
  try {
    if (!isRealSource()) return NextResponse.json({ message: "La conexión real con INAPI no está configurada" }, { status: 409 });
    const input = schema.parse(await request.json());
    const { records: [record] } = await fetchInapi({ applicationIds: [input.applicationNumber], registrationIds: [] });
    if (!input.confirm) return NextResponse.json({ record });
    const result = await getSql().begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${organizationId()}), 741028)`;
      const [existing] = await tx`SELECT c.public_code FROM source_snapshots s JOIN cases c ON c.id = s.entity_id AND c.organization_id = s.organization_id WHERE s.organization_id = ${organizationId()} AND s.entity_type = 'case' AND s.data->>'applicationNumber' = ${record.applicationNumber} AND c.status = 'active'`;
      if (existing) return { existing: true, caseId: existing.public_code };
      let basis: { id: string; name: string; kind: string } | undefined;
      if (input.basisCode) {
        const rows = await tx`SELECT id, name, 'brand' AS kind FROM brands WHERE organization_id = ${organizationId()} AND public_code = ${input.basisCode} AND archived_at IS NULL UNION ALL SELECT id, data->>'name' AS name, 'application' AS kind FROM registration_applications WHERE organization_id = ${organizationId()} AND public_code = ${input.basisCode} AND COALESCE(data->>'portfolioRole', 'own') <> 'third-party'`;
        basis = rows[0] as typeof basis;
        if (!basis) throw new Error("La marca o solicitud de fundamento no pertenece a este espacio");
      }
      const proceeding: OppositionProceeding = { role: "opponent", opponent: input.opponent, basisCode: input.basisCode, basisName: basis?.name, filedAt: input.filedAt, documentUrl: input.documentUrl, note: input.note, record };
      const code = `OP-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
      const [item] = await tx`INSERT INTO cases (organization_id, public_code, brand_id, client_name, title, stage, priority, owner_id, created_by, proceeding) VALUES (${organizationId()}, ${code}, ${basis?.kind === "brand" ? basis.id : null}, ${input.opponent}, ${`Oposición a ${record.name}`.slice(0, 220)}, 'En seguimiento', 'Alta', ${actorId()}, ${actorId()}, ${tx.json(proceeding)}) RETURNING id`;
      const [source] = await tx`INSERT INTO source_records (application_number, registration_number, data) VALUES (${record.applicationNumber}, ${record.registrationNumber}, ${tx.json(record)}) ON CONFLICT (application_number) DO UPDATE SET data = EXCLUDED.data, registration_number = EXCLUDED.registration_number, updated_at = now() RETURNING id`;
      await tx`INSERT INTO source_snapshots (organization_id, entity_id, entity_type, public_code, source_id, data) VALUES (${organizationId()}, ${item.id}, 'case', ${code}, ${source.id}, ${tx.json(record)})`;
      await tx`INSERT INTO case_tasks (organization_id, case_id, title, status, priority, assignee_id) VALUES (${organizationId()}, ${item.id}, 'Revisar oposición presentada, notificaciones y gestiones pendientes del oponente', 'pending', 'Alta', ${actorId()})`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, 'opposition.created', 'case', ${item.id}, ${tx.json({ applicationNumber: record.applicationNumber, role: "opponent" })})`;
      return { existing: false, caseId: code };
    });
    return NextResponse.json(result);
  } catch (error) { return sourceError(error); }
});
