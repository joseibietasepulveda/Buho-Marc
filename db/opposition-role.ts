import type { TransactionSql } from "postgres";
import { actorId, organizationId } from "../lib/tenant-context";
import type { OppositionProceeding } from "../lib/opposition";

export async function isFiledOpposition(tx: TransactionSql, applicationNumber: string) {
  const [item] = await tx`SELECT id FROM cases WHERE organization_id = ${organizationId()} AND proceeding->>'role' = 'opponent' AND proceeding->'record'->>'applicationNumber' = ${applicationNumber} LIMIT 1`;
  return Boolean(item);
}

/** Correct an explicitly confirmed role, retaining IDs, work, stage and source baseline. */
export async function correctReceivedToFiled(tx: TransactionSql, applicationNumber: string) {
  await tx`SELECT pg_advisory_xact_lock(hashtext(${organizationId()}), 741028)`;
  const items = await tx`SELECT * FROM cases WHERE organization_id = ${organizationId()} AND proceeding->'record'->>'applicationNumber' = ${applicationNumber} FOR UPDATE`;
  if (!items.length) return { applicationNumber, outcome: "absent" };
  if (items.length !== 1) throw new Error(`La solicitud ${applicationNumber} tiene varios casos; requiere conciliación sin perder trabajo.`);
  const item = items[0];
  if (item.proceeding.role === "opponent") return { applicationNumber, outcome: "already-correct", caseId: item.public_code };
  if (item.proceeding.role !== "respondent") throw new Error("Rol de origen inesperado");
  const [application] = await tx`SELECT * FROM registration_applications WHERE organization_id = ${organizationId()} AND data->>'applicationNumber' = ${applicationNumber} FOR UPDATE`;
  if (!application) throw new Error(`No se encontró la solicitud vinculada a ${applicationNumber}`);
  const [snapshot] = await tx`SELECT * FROM source_snapshots WHERE organization_id = ${organizationId()} AND entity_type = 'application' AND entity_id = ${application.id} FOR UPDATE`;
  if (!snapshot || snapshot.data.applicationNumber !== applicationNumber) throw new Error("No se encontró la fuente de la solicitud a corregir");
  const record = snapshot.data as OppositionProceeding["record"];
  const proceeding: OppositionProceeding = {
    role: "opponent", opponent: "Cliente oponente por confirmar", record,
    ...(item.proceeding.note ? { note: item.proceeding.note } : {}),
    ...(item.proceeding.filedAt ? { filedAt: item.proceeding.filedAt } : {}),
    ...(item.proceeding.documentUrl ? { documentUrl: item.proceeding.documentUrl } : {}),
  };
  const tasks = await tx`SELECT * FROM case_tasks WHERE organization_id = ${organizationId()} AND case_id = ${item.id}`;
  const applicationTasks = await tx`SELECT * FROM registration_tasks WHERE organization_id = ${organizationId()} AND application_id = ${application.id}`;
  await tx`UPDATE cases SET proceeding = ${tx.json(proceeding)}, title = ${`Oposición presentada · ${record.name}`.slice(0, 220)}, brand_id = NULL, updated_at = now() WHERE id = ${item.id} AND organization_id = ${organizationId()}`;
  // Retain the original application as an archived classification record, not own portfolio.
  await tx`UPDATE registration_applications SET data = data || ${tx.json({ portfolioRole: "third-party", oppositionCaseCode: item.public_code })}, updated_at = now() WHERE id = ${application.id} AND organization_id = ${organizationId()}`;
  await tx`UPDATE source_snapshots SET entity_type = 'case', entity_id = ${item.id}, public_code = ${item.public_code}, updated_at = now() WHERE id = ${snapshot.id} AND organization_id = ${organizationId()}`;
  await tx`UPDATE case_tasks SET title = 'Revisar oposición presentada, notificaciones y gestiones pendientes del oponente', updated_at = now() WHERE organization_id = ${organizationId()} AND case_id = ${item.id} AND title = 'Revisar oposición recibida, traslado y notificación; verificar plazos en la solicitud vinculada' AND status = 'pending'`;
  for (const task of applicationTasks) await tx`INSERT INTO case_tasks (id, organization_id, case_id, title, status, priority, due_at, assignee_id, created_at, updated_at) VALUES (${task.id}, ${organizationId()}, ${item.id}, ${task.title}, ${task.status}, ${task.priority}, ${task.due_date}, ${task.assignee_id}, ${task.created_at}, ${task.updated_at}) ON CONFLICT (id) DO NOTHING`;
  await tx`UPDATE notifications SET entity_type = 'case', entity_id = ${item.id}, change_detail = COALESCE(change_detail, '{}'::jsonb) || ${tx.json({ caseId: item.public_code, roleCorrected: "opponent" })} WHERE organization_id = ${organizationId()} AND entity_type = 'application' AND entity_id = ${application.id}`;
  await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, before_data, after_data) VALUES (${organizationId()}, ${actorId()}, 'opposition.role_corrected', 'case', ${item.id}, ${tx.json({ proceeding: item.proceeding, title: item.title, brandId: item.brand_id, application: application.data, snapshot: { id: snapshot.id, entityType: snapshot.entity_type, entityId: snapshot.entity_id, publicCode: snapshot.public_code }, tasks, applicationTasks })}, ${tx.json({ applicationNumber, role: "opponent", reason: "Rol confirmado por el usuario a partir de los antecedentes de Daniel; se corrige la inferencia de cartera propia", applicationCode: application.public_code })})`;
  return { applicationNumber, outcome: "corrected", caseId: item.public_code };
}
