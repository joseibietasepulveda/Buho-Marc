import { createHash } from "node:crypto";
import type { TransactionSql } from "postgres";
import { getSql } from "./index";
import { actorId, organizationId } from "../lib/tenant-context";
import { chileToday } from "../lib/work-priorities";
import { registrationExpiry, renewalReminder } from "../lib/renewal-reminder";
import type { SourceRecord } from "../lib/source-contract";

// Runs against saved records only. No provider calls, legal facts or source
// changes are manufactured by the passage of time.
export async function createRenewalNotices(tx: TransactionSql, now = new Date()) {
  await tx`SELECT pg_advisory_xact_lock(hashtext(${organizationId()}), 741033)`;
  const today = chileToday(now);
  const rows = await tx`SELECT b.id, b.name, b.monitoring_config, r.data FROM brands b LEFT JOIN source_snapshots s ON s.entity_id = b.id AND s.entity_type = 'brand' AND s.organization_id = b.organization_id LEFT JOIN source_records r ON r.id = s.source_id WHERE b.organization_id = ${organizationId()} AND b.archived_at IS NULL AND COALESCE(b.monitoring_config->>'watchOnly', 'false') <> 'true' AND b.monitoring_config->>'provider' = 'inapi'`;
  let created = 0;
  for (const row of rows) {
    const record = row.data as SourceRecord | undefined;
    if (!record) continue; // An unverified portfolio row is insufficient.
    const expiry = registrationExpiry(record, today);
    // Preserve the reminder after its date passes; invalidate only evidence
    // superseded by a new source expiry/status. Dismissal/review never revives it.
    await tx`UPDATE notifications SET change_detail = change_detail || ${tx.json({ invalidated: true, invalidationReason: "La fuente cambió la vigencia o el estado del registro" })}, updated_at = now() WHERE organization_id = ${organizationId()} AND entity_type = 'brand' AND entity_id = ${row.id} AND type = 'renewal_reminder' AND COALESCE(change_detail->>'invalidated', 'false') <> 'true' AND change_detail->>'expirationDate' IS DISTINCT FROM ${expiry?.date ?? null}`;
    const reminder = renewalReminder(record, today);
    if (!reminder) continue;
    const key = createHash("sha256").update(`${record.applicationNumber}:${record.registrationNumber}:${reminder.date}`).digest("hex").slice(0, 24);
    const detail = { kind: "renewal-reminder", source: "platform", applicationNumber: record.applicationNumber, registrationNumber: record.registrationNumber, expirationDate: reminder.date, expiryOrigin: reminder.origin, renewalOpensAt: reminder.opens, officialUrl: record.officialUrl, lastSuccessfulQueryAt: record.retrieval?.lastSuccessfulQueryAt, changes: [], summary: reminder.summary };
    const [notice] = await tx`INSERT INTO notifications (organization_id, public_code, user_id, entity_type, entity_id, type, title, brand_name, urgency, change_detail) VALUES (${organizationId()}, ${`NR-${key}`}, ${actorId()}, 'brand', ${row.id}, 'renewal_reminder', ${reminder.title}, ${record.name}, 'Alta', ${tx.json(detail)}) ON CONFLICT (organization_id, public_code) DO NOTHING RETURNING id`;
    if (!notice) continue;
    await tx`INSERT INTO email_drafts (organization_id, notification_id, subject, body, generated_by) VALUES (${organizationId()}, ${notice.id}, ${reminder.title}, ${reminder.summary}, ${actorId()})`;
    await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, 'registration.renewal_reminder', 'brand', ${row.id}, ${tx.json({ applicationNumber: record.applicationNumber, expirationDate: reminder.date, origin: reminder.origin })})`;
    created++;
  }
  return { created, externalRequests: 0 };
}
export const generateRenewalNotices = (now = new Date()) => getSql().begin(tx => createRenewalNotices(tx, now));
