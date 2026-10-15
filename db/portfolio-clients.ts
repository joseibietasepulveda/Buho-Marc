import type { TransactionSql } from "postgres";
import { organizationId, actorId } from "../lib/tenant-context";
import type { SourceRecord } from "../lib/source-contract";
import { normalizedPartyName, normalizedRut, recordParties } from "../lib/portfolio-parties";
export async function linkHolderClients(tx: TransactionSql, record: SourceRecord, kind: "brand" | "application", entityId: string) {
  // Same organization lock as manual client creation: stable numbers and no duplicate imports.
  await tx`SELECT id FROM organizations WHERE id = ${organizationId()} FOR UPDATE`;
  const clients = await tx`SELECT id, public_code, data FROM client_contacts WHERE organization_id = ${organizationId()} AND is_mock = false`;
  const ids: string[] = [];
  for (const holder of recordParties(record, "holders")) {
    const matches = clients.filter(c => holder.rut ? normalizedRut(c.data.rut) === holder.rut : !normalizedRut(c.data.rut) && normalizedPartyName(c.data.name) === normalizedPartyName(holder.name));
    // Reuse the oldest stable code if legacy duplicates exist; do not merge edited contacts.
    let client = matches.sort((a, b) => a.public_code.localeCompare(b.public_code, "es", { numeric: true }))[0];
    if (!client) {
      const [number] = await tx`SELECT COALESCE(max(substring(public_code from 4)::bigint), 0) + 1 AS next FROM client_contacts WHERE organization_id = ${organizationId()} AND public_code ~ '^CL-[0-9]+$'`;
      const data = { name: holder.name, rut: holder.rut, contact: "", phone: "", email: "" };
      [client] = await tx`INSERT INTO client_contacts (organization_id, public_code, data, is_mock) VALUES (${organizationId()}, ${`CL-${String(number.next).padStart(2, "0")}`}, ${tx.json(data)}, false) RETURNING id, public_code, data`;
      clients.push(client);
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, 'client.created_from_holder', 'client', ${client.id}, ${tx.json({ applicationNumber: record.applicationNumber })})`;
    }
    ids.push(client.public_code);
  }
  if (!ids.length) {
    if (kind === "brand") await tx`UPDATE brands SET monitoring_config=monitoring_config || '{"holderClientsVersion":1}'::jsonb WHERE organization_id=${organizationId()} AND id=${entityId}`;
    else await tx`UPDATE registration_applications SET data=data || '{"holderClientsVersion":1}'::jsonb WHERE organization_id=${organizationId()} AND id=${entityId}`;
    return;
  }
  const link = { clientIds: [...new Set(ids)], holderClientsVersion: 1 };
  // Explicit client assignments remain the primary contact; co-holders are all linked.
  if (kind === "brand") await tx`UPDATE brands SET monitoring_config = ${tx.json({ clientId: ids[0], clientRole: "holder" })} || monitoring_config || ${tx.json(link)}, updated_at = now() WHERE organization_id = ${organizationId()} AND id = ${entityId}`;
  else await tx`UPDATE registration_applications SET data = data || (CASE WHEN data->>'clientId' IS NULL THEN ${tx.json({ clientId: ids[0], clientRole: "holder", client: clients.find(c => c.public_code === ids[0])!.data.name })}::jsonb ELSE '{}'::jsonb END) || ${tx.json(link)}, updated_at = now() WHERE organization_id = ${organizationId()} AND id = ${entityId}`;
}

export async function backfillHolderClients() {
  const { getSql } = await import("./index");
  return getSql().begin(async tx => {
    const rows = await tx`SELECT s.entity_type, s.entity_id, r.data FROM source_snapshots s JOIN source_records r ON r.id=s.source_id LEFT JOIN brands b ON s.entity_type='brand' AND b.id=s.entity_id AND b.organization_id=s.organization_id LEFT JOIN registration_applications a ON s.entity_type='application' AND a.id=s.entity_id AND a.organization_id=s.organization_id WHERE s.organization_id=${organizationId()} AND r.data->>'provider'='inapi' AND (b.id IS NOT NULL AND b.archived_at IS NULL AND COALESCE(b.monitoring_config->>'portfolioRole','own')='own' AND b.monitoring_config->>'holderClientsVersion' IS NULL OR a.id IS NOT NULL AND COALESCE(a.data->>'portfolioRole','own')='own' AND a.data->>'holderClientsVersion' IS NULL) ORDER BY s.entity_id LIMIT 100`;
    for (const r of rows) await linkHolderClients(tx, r.data, r.entity_type, r.entity_id);
    return rows.length;
  });
}
