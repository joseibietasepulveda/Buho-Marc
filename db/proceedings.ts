import type { TransactionSql } from "postgres";
import { actorId, organizationId } from "../lib/tenant-context";
import { proceedingLabel, type OppositionProceeding } from "../lib/opposition";
import type { ProceedingInput } from "../lib/proceeding-input";
import type { SourceRecord } from "../lib/source-contract";
export async function createProceeding(tx: TransactionSql, input: ProceedingInput, record: SourceRecord) {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${organizationId()}), 741028)`;
      const [existing] = await tx`SELECT public_code, proceeding FROM cases WHERE organization_id = ${organizationId()} AND proceeding->'record'->>'applicationNumber' = ${record.applicationNumber} AND COALESCE(proceeding->>'type', 'opposition') = ${input.type}`;
      if (existing) {
        if (existing.proceeding.role !== input.role) throw new Error("Ya existe este caso con otro rol. Revísalo en Casos antes de continuar.");
        return { existing: true, caseId: existing.public_code };
      }
      let basis: { id: string; name: string; kind: string } | undefined;
      if (input.basisCode) {
        const rows = await tx`SELECT id, name, 'brand' AS kind FROM brands WHERE organization_id = ${organizationId()} AND public_code = ${input.basisCode} AND archived_at IS NULL UNION ALL SELECT id, data->>'name' AS name, 'application' AS kind FROM registration_applications WHERE organization_id = ${organizationId()} AND public_code = ${input.basisCode} AND COALESCE(data->>'portfolioRole', 'own') <> 'third-party'`;
        basis = rows[0] as typeof basis;
        if (!basis) throw new Error("La marca o solicitud de fundamento no pertenece a este espacio");
      }
      const proceeding: OppositionProceeding = { type: input.type, role: input.role, clientName: input.opponent || "Cliente por confirmar", opponent: input.role === "opponent" ? input.opponent || "Cliente por confirmar" : "No informado", basisCode: input.basisCode, basisName: basis?.name, filedAt: input.filedAt, documentUrl: input.documentUrl, note: input.note, record };
      const code = `${input.type === "nullity" ? "NU" : "OP"}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
      const [item] = await tx`INSERT INTO cases (organization_id, public_code, brand_id, client_name, title, stage, priority, owner_id, created_by, proceeding) VALUES (${organizationId()}, ${code}, ${basis?.kind === "brand" ? basis.id : null}, ${proceeding.clientName!}, ${`${proceedingLabel(proceeding)} · ${record.name}`.slice(0, 220)}, 'En seguimiento', 'Alta', ${actorId()}, ${actorId()}, ${tx.json(proceeding)}) RETURNING id`;
      const [source] = await tx`INSERT INTO source_records (application_number, registration_number, data) VALUES (${record.applicationNumber}, ${record.registrationNumber}, ${tx.json(record)}) ON CONFLICT (application_number) DO UPDATE SET data = EXCLUDED.data, registration_number = EXCLUDED.registration_number, updated_at = now() RETURNING id`;
      await tx`INSERT INTO source_snapshots (organization_id, entity_id, entity_type, public_code, source_id, data) VALUES (${organizationId()}, ${item.id}, 'case', ${code}, ${source.id}, ${tx.json(record)})`;
      await tx`INSERT INTO case_tasks (organization_id, case_id, title, status, priority, assignee_id) VALUES (${organizationId()}, ${item.id}, ${`Revisar ${proceedingLabel(proceeding).toLowerCase()}, antecedentes y notificaciones; confirmar cliente y plazos`}, 'pending', 'Alta', ${actorId()})`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, ${`${input.type}.created`}, 'case', ${item.id}, ${tx.json({ applicationNumber: record.applicationNumber, role: input.role, type: input.type })})`;
      return { existing: false, caseId: code };
}
