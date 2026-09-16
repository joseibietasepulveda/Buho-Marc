import type { TransactionSql } from "postgres";
import { actorId, organizationId } from "../lib/tenant-context";
import { hasReceivedOpposition, type OppositionProceeding } from "../lib/opposition";
import { stableJson, type SourceRecord } from "../lib/source-contract";

/** Uses the owned application's source: no second snapshot, poll or notification. */
export async function syncReceivedOpposition(tx: TransactionSql, record: SourceRecord, allowCreate = true) {
  if (record.provider !== "inapi") return;
  await tx`SELECT pg_advisory_xact_lock(hashtext(${`${organizationId()}:${record.applicationNumber}`}), 741029)`;
  const [existing] = await tx`SELECT id, public_code, proceeding, status, stage FROM cases WHERE organization_id = ${organizationId()} AND proceeding->>'role' = 'respondent' AND proceeding->'record'->>'applicationNumber' = ${record.applicationNumber} FOR UPDATE`;
  if (existing) {
    const proceeding = { ...(existing.proceeding as OppositionProceeding), record };
    if (stableJson(existing.proceeding) !== stableJson(proceeding)) await tx`UPDATE cases SET proceeding = ${tx.json(proceeding)}, updated_at = now() WHERE id = ${existing.id} AND organization_id = ${organizationId()}`;
    // Closed/discarded cases are retained but never reopened or recreated by a poll.
    return existing.status === "active" && existing.stage !== "Concluido" ? { id: existing.id as string, code: existing.public_code as string, created: false } : undefined;
  }
  if (!allowCreate || !hasReceivedOpposition(record)) return;
  const [application] = await tx`SELECT public_code, data FROM registration_applications WHERE organization_id = ${organizationId()} AND data->>'applicationNumber' = ${record.applicationNumber}`;
  if (!application) return;
  const proceeding: OppositionProceeding = { role: "respondent", opponent: "No informado por la fuente", applicationCode: application.public_code, basisCode: application.public_code, basisName: record.name, record };
  const code = `OR-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const [item] = await tx`INSERT INTO cases (organization_id, public_code, client_name, title, stage, priority, owner_id, created_by, proceeding) VALUES (${organizationId()}, ${code}, ${application.data.client ?? "Sin cliente asignado"}, ${`Oposición recibida · ${record.name}`.slice(0, 220)}, 'En seguimiento', 'Alta', ${actorId()}, ${actorId()}, ${tx.json(proceeding)}) RETURNING id`;
  await tx`INSERT INTO case_tasks (organization_id, case_id, title, status, priority, assignee_id) VALUES (${organizationId()}, ${item.id}, 'Revisar oposición recibida, traslado y notificación; verificar plazos en la solicitud vinculada', 'pending', 'Alta', ${actorId()})`;
  await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, 'opposition.received', 'case', ${item.id}, ${tx.json({ applicationNumber: record.applicationNumber, role: "respondent", applicationCode: application.public_code })})`;
  return { id: item.id as string, code, created: true };
}

/** Reconciles already imported applications without an external call or old alerts. */
export async function reconcileReceivedOppositions(tx: TransactionSql) {
  // Match import/sync ordering before taking case locks for more than one dossier.
  await tx`SELECT pg_advisory_xact_lock(hashtext(${organizationId()}), 741028)`;
  const records = await tx`SELECT s.data FROM source_snapshots s JOIN registration_applications a ON a.id = s.entity_id AND a.organization_id = s.organization_id WHERE s.organization_id = ${organizationId()} AND s.entity_type = 'application' AND s.data->>'provider' = 'inapi' AND NOT EXISTS (SELECT 1 FROM cases c WHERE c.organization_id = s.organization_id AND c.proceeding->>'role' = 'respondent' AND c.proceeding->'record'->>'applicationNumber' = s.data->>'applicationNumber') ORDER BY s.data->>'applicationNumber'`;
  for (const row of records) {
    const record = row.data as SourceRecord;
    if (hasReceivedOpposition(record)) await syncReceivedOpposition(tx, record);
  }
}
