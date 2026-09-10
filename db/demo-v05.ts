import type { TransactionSql } from "postgres";
import type { RegistrationApplication } from "../lib/registration-data";
import { DEMO_V05_CASE_DATES, DEMO_V05_EXTRA_CASES, DEMO_V05_MATCH_DATES, DEMO_V05_MIN_DATE, upgradeDemoApplicationV05, upgradeDemoSourceDateV05 } from "../lib/demo-v05-data";

export const DEMO_V05_MIGRATION = "demo.v05.future-dates";

/** Run under the demo seed transaction/advisory lock. One durable, auditable migration per organization. */
export async function migrateDemoV05(tx: TransactionSql, organizationId: string, userId: string) {
  const [done] = await tx`SELECT id FROM audit_events WHERE organization_id = ${organizationId} AND action = ${DEMO_V05_MIGRATION} LIMIT 1`;
  if (done) return { alreadyApplied: true };
  // Legacy mock brands have stable seed UUIDs and no INAPI provider/snapshot. Missing provider alone is NOT proof.
  const brands = await tx`SELECT b.id FROM brands b WHERE b.organization_id = ${organizationId} AND COALESCE(b.monitoring_config->>'provider', '') <> 'inapi' AND (b.monitoring_config->>'provider' = 'mock' OR b.id::text LIKE '10000000-0000-4000-8000-%') AND NOT EXISTS (SELECT 1 FROM source_snapshots s JOIN source_records r ON r.id = s.source_id WHERE s.entity_id = b.id AND (s.data->>'provider' = 'inapi' OR r.data->>'provider' = 'inapi'))`;
  const brandIds = brands.map(row => String(row.id));
  const beforeCases = await tx`SELECT c.* FROM cases c WHERE c.organization_id = ${organizationId} AND c.brand_id = ANY(${brandIds}::uuid[]) AND c.status = 'active' AND c.stage <> 'Concluido'`;
  const caseIds = beforeCases.map(row => String(row.id));
  const beforeMatches = await tx`SELECT m.* FROM matches m WHERE m.organization_id = ${organizationId} AND m.brand_id = ANY(${brandIds}::uuid[]) AND (m.id::text LIKE '10000000-0000-4000-8000-%' OR EXISTS (SELECT 1 FROM match_scores s WHERE s.match_id = m.id AND s.engine_version = 'demo-only'))`;
  const matchIds = beforeMatches.map(row => String(row.id));
  const beforeTasks = await tx`SELECT * FROM case_tasks WHERE organization_id = ${organizationId} AND case_id = ANY(${caseIds}::uuid[]) AND status = 'pending' AND due_at::date < ${DEMO_V05_MIN_DATE}::date`;
  for (const item of beforeCases) {
    const date = DEMO_V05_CASE_DATES[String(item.public_code)] ?? DEMO_V05_MIN_DATE;
    await tx`UPDATE cases SET next_deadline = ${date}, description = COALESCE(description, 'Plazo: Revisar gestión y antecedentes · fecha de demostración'), updated_at = now() WHERE id = ${item.id} AND next_deadline < ${DEMO_V05_MIN_DATE}::date`;
  }
  for (const item of beforeMatches) await tx`UPDATE matches SET legal_deadline = ${DEMO_V05_MATCH_DATES[String(item.public_code)] ?? DEMO_V05_MIN_DATE}, updated_at = now() WHERE id = ${item.id} AND legal_deadline < ${DEMO_V05_MIN_DATE}::date AND review_status <> 'Descartada'`;
  await tx`UPDATE case_tasks SET due_at = ${DEMO_V05_MIN_DATE + "T12:00:00Z"}, updated_at = now() WHERE organization_id = ${organizationId} AND case_id = ANY(${caseIds}::uuid[]) AND status = 'pending' AND due_at::date < ${DEMO_V05_MIN_DATE}::date`;
  const beforeLegalDates = await tx`SELECT * FROM legal_deadlines WHERE organization_id = ${organizationId} AND (case_id = ANY(${caseIds}::uuid[]) OR match_id = ANY(${matchIds}::uuid[])) AND status IN ('upcoming', 'pending', 'overdue')`;
  for (const item of beforeLegalDates) await tx`UPDATE legal_deadlines SET legal_date = GREATEST(legal_date, ${DEMO_V05_MIN_DATE}::date), internal_date = CASE WHEN internal_date IS NULL THEN NULL ELSE GREATEST(internal_date, ${DEMO_V05_MIN_DATE}::date) END, status = CASE WHEN status = 'overdue' THEN 'upcoming' ELSE status END, updated_at = now() WHERE id = ${item.id} AND (legal_date < ${DEMO_V05_MIN_DATE}::date OR internal_date < ${DEMO_V05_MIN_DATE}::date)`;

  const beforeApplications = await tx`SELECT a.id, a.public_code, a.data FROM registration_applications a WHERE a.organization_id = ${organizationId} AND a.public_code ~ '^IM-0(0[3-9]|1[0-4])$' AND COALESCE(a.data->>'provider', '') <> 'inapi' AND NOT EXISTS (SELECT 1 FROM source_snapshots s JOIN source_records r ON r.id = s.source_id WHERE s.entity_id = a.id AND (s.data->>'provider' = 'inapi' OR r.data->>'provider' = 'inapi'))`;
  const applicationIds = beforeApplications.map(row => String(row.id));
  const beforeRegistrationTasks = await tx`SELECT * FROM registration_tasks WHERE organization_id = ${organizationId} AND application_id = ANY(${applicationIds}::uuid[]) AND status = 'pending' AND due_date < ${DEMO_V05_MIN_DATE}::date`;
  await tx`UPDATE registration_tasks SET due_date = ${DEMO_V05_MIN_DATE}, updated_at = now() WHERE organization_id = ${organizationId} AND application_id = ANY(${applicationIds}::uuid[]) AND status = 'pending' AND due_date < ${DEMO_V05_MIN_DATE}::date`;
  const beforeSources: typeof beforeApplications[number][] = [];
  for (const item of beforeApplications) {
    const current = item.data as RegistrationApplication;
    const next = upgradeDemoApplicationV05(current);
    if (JSON.stringify(current) !== JSON.stringify(next)) await tx`UPDATE registration_applications SET data = ${tx.json(next)}, updated_at = now() WHERE id = ${item.id}`;
    // Keep the simulated source baseline aligned so a later demo sync does not restore obsolete dates.
    const sources = await tx`SELECT s.id AS snapshot_id, s.data AS snapshot_data, r.id, r.data FROM source_snapshots s JOIN source_records r ON r.id = s.source_id WHERE s.organization_id = ${organizationId} AND s.entity_id = ${item.id} AND COALESCE(s.data->>'provider', '') <> 'inapi' AND COALESCE(r.data->>'provider', '') <> 'inapi' AND NOT EXISTS (SELECT 1 FROM source_snapshots other WHERE other.source_id = r.id AND (other.organization_id <> ${organizationId} OR other.data->>'provider' = 'inapi'))`;
    for (const source of sources) {
      beforeSources.push(source);
      const adjust = (data: Record<string, unknown>) => ({ ...data, filingDate: upgradeDemoSourceDateV05(String(item.public_code), data.filingDate as string | null), statusDate: upgradeDemoSourceDateV05(String(item.public_code), data.statusDate as string | null), publicationDate: upgradeDemoSourceDateV05(String(item.public_code), data.publicationDate as string | null) });
      const sourceData = adjust(source.data), snapshotData = adjust(source.snapshot_data);
      if (JSON.stringify(sourceData) !== JSON.stringify(source.data)) await tx`UPDATE source_records SET data = ${tx.json(sourceData)}, version = version + 1, updated_at = now() WHERE id = ${source.id}`;
      if (JSON.stringify(snapshotData) !== JSON.stringify(source.snapshot_data)) await tx`UPDATE source_snapshots SET data = ${tx.json(snapshotData)}, updated_at = now() WHERE id = ${source.snapshot_id}`;
    }
  }

  const addedCases: string[] = [];
  for (const fixture of DEMO_V05_EXTRA_CASES) {
    const match = beforeMatches.find(row => row.public_code === fixture.match && !row.case_id && row.review_status !== 'Descartada');
    if (!match) continue;
    const [brand] = await tx`SELECT owner_name FROM brands WHERE id = ${match.brand_id} AND archived_at IS NULL`;
    if (!brand) continue;
    const [created] = await tx`INSERT INTO cases (id, organization_id, public_code, source_match_id, brand_id, client_name, title, description, stage, priority, next_deadline, owner_id, created_by) VALUES (${fixture.id}, ${organizationId}, ${fixture.code}, ${match.id}, ${match.brand_id}, ${brand.owner_name}, ${fixture.title}, ${"Plazo: " + fixture.deadlineDescription + " · fecha de demostración"}, ${fixture.stage}, ${fixture.priority}, ${DEMO_V05_CASE_DATES[fixture.code]}, ${match.owner_id ?? userId}, ${userId}) ON CONFLICT DO NOTHING RETURNING id`;
    if (!created) continue;
    addedCases.push(String(created.id));
    await tx`UPDATE matches SET case_id = ${created.id}, review_status = 'En observación', updated_at = now() WHERE id = ${match.id} AND case_id IS NULL`;
    await tx`INSERT INTO case_tasks (organization_id, case_id, title, status, due_at, assignee_id) VALUES (${organizationId}, ${created.id}, ${fixture.task}, 'pending', ${DEMO_V05_CASE_DATES[fixture.code] + "T12:00:00Z"}, ${match.owner_id ?? userId})`;
  }
  // Only known, unedited legacy seed drafts: never rewrite a user's sent/customized correspondence.
  const beforeDrafts = await tx`SELECT d.id, d.body FROM email_drafts d WHERE d.organization_id = ${organizationId} AND d.id::text IN ('10000000-0000-4000-8000-000000000701', '10000000-0000-4000-8000-000000000702') AND d.template_version = 'v1' AND d.copied_at IS NULL AND d.marked_sent_at IS NULL`;
  for (const draft of beforeDrafts) {
    const body = String(draft.body).replace('vence el 27 de agosto de 2026', 'vence el 30 de septiembre de 2026 (fecha simulada)').replace('antes del 22 de agosto', 'antes del 1 de octubre de 2026 (fecha simulada)');
    if (body !== draft.body) await tx`UPDATE email_drafts SET body = ${body}, updated_at = now() WHERE id = ${draft.id}`;
  }
  await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, before_data, after_data) VALUES (${organizationId}, ${userId}, ${DEMO_V05_MIGRATION}, 'organization', ${organizationId}, ${tx.json({ cases: beforeCases, matches: beforeMatches, tasks: beforeTasks, registrationTasks: beforeRegistrationTasks, legalDates: beforeLegalDates, applications: beforeApplications, sources: beforeSources, drafts: beforeDrafts })}, ${tx.json({ minimumDemoDate: DEMO_V05_MIN_DATE, addedCases, realRecordsUntouched: true })})`;
  return { alreadyApplied: false, addedCases: addedCases.length };
}
