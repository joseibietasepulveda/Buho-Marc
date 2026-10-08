import type { TransactionSql } from "postgres";
import { organizationId, actorId } from "../lib/tenant-context";
export type ImportClient = { clientId: string; clientRole: "holder" | "representative" };
export async function assignImportedClient(tx: TransactionSql, applicationNumber: string, kind: "brand" | "application", assignment?: ImportClient) {
  if (!assignment || assignment.clientId === "unassigned") return;
  const [client] = await tx`SELECT data FROM client_contacts WHERE organization_id = ${organizationId()} AND public_code = ${assignment.clientId}`;
  if (!client) throw new Error("El cliente elegido no pertenece a tu espacio.");
  const code = `${kind === "brand" ? "BM" : "IM"}-R-${applicationNumber}`;
  const data = { clientId: assignment.clientId, clientRole: assignment.clientRole, ...(kind === "application" ? { client: client.data.name } : {}) };
  const [row] = kind === "brand"
    ? await tx`UPDATE brands SET monitoring_config = monitoring_config || ${tx.json(data)}::jsonb, updated_at = now() WHERE organization_id = ${organizationId()} AND public_code = ${code} RETURNING id`
    : await tx`UPDATE registration_applications SET data = data || ${tx.json(data)}::jsonb, updated_at = now() WHERE organization_id = ${organizationId()} AND public_code = ${code} RETURNING id`;
  if (!row) throw new Error("No se pudo asociar el cliente al expediente.");
  await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, 'portfolio.client_assigned', ${kind}, ${row.id}, ${tx.json({ ...data, applicationNumber })})`;
}
