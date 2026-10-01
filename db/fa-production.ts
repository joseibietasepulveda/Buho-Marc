import type { Sql } from "postgres";
import { hashPassword } from "../lib/password";

export const FA_PRODUCTION_ENVIRONMENT = "01262643-e6b7-499c-ae75-e83254e1c697";
const ACTION = "account.fa_production_prepared_2026_10_01";

/** Explicit one-off operator request; never expose this through a public route. */
export async function prepareFaProduction(sql: Sql, password: string, environmentId: string | undefined) {
  if (environmentId !== FA_PRODUCTION_ENVIRONMENT) throw new Error("La preparación de FA está autorizada solo en production");
  // The operator explicitly requested an 11-character credential. The ordinary
  // password-change policy remains unchanged (12 characters).
  if (password.length < 11 || password.length > 256) throw new Error("La clave administrativa de FA no cumple el largo requerido");
  const hash = await hashPassword(password);
  return sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(741031)`;
    const organizations = await tx`SELECT id, status FROM organizations WHERE slug = 'fa-abogados'`;
    const users = await tx`SELECT id, username FROM users WHERE lower(username) = 'fa_abogados'`;
    let organizationId: string, userId: string;
    const created = !organizations.length && !users.length;
    if (created) {
      const [org] = await tx`INSERT INTO organizations (name, slug) VALUES ('FA Abogados', 'fa-abogados') RETURNING id`;
      const [user] = await tx`INSERT INTO users (name, initials, username, password_hash, must_change_password) VALUES ('FA Abogados', 'FA', 'fa_abogados', ${hash}, false) RETURNING id`;
      organizationId = org.id; userId = user.id;
      await tx`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${organizationId}, ${userId}, 'admin')`;
    } else {
      if (organizations.length !== 1 || users.length !== 1 || users[0].username !== 'fa_abogados' || organizations[0].status !== 'active') throw new Error("No se confirmó la identidad del espacio FA; no se modificaron credenciales");
      organizationId = organizations[0].id; userId = users[0].id;
      const memberships = await tx`SELECT organization_id, role FROM organization_members WHERE user_id = ${userId}`;
      if (memberships.length !== 1 || memberships[0].organization_id !== organizationId || memberships[0].role !== 'admin') throw new Error("FA tiene una vinculación distinta; no se modificaron credenciales");
      const [done] = await tx`SELECT id FROM audit_events WHERE organization_id = ${organizationId} AND actor_user_id = ${userId} AND action = ${ACTION} LIMIT 1`;
      if (done) return { applied: false, created: false };
      await tx`UPDATE users SET password_hash = ${hash}, must_change_password = false, updated_at = now() WHERE id = ${userId}`;
    }
    await tx`DELETE FROM auth_sessions WHERE user_id = ${userId}`;
    await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId}, ${userId}, ${ACTION}, 'user', ${userId}, ${tx.json({ username: 'fa_abogados', created, credentialsUpdated: true })})`;
    return { applied: true, created };
  });
}

/** Preserve evidence, but invalidate only verified order-only alerts from FA's initial rollout. */
export async function repairFaPartyOrderNotices(sql: Sql, environmentId: string | undefined, runId: string) {
  if (environmentId !== FA_PRODUCTION_ENVIRONMENT || runId !== "6b4aacaa-bb3d-431d-8a24-69cbd8820710") throw new Error("La reparación no corresponde a la corrida FA verificada");
  return sql.begin(async tx => {
    const [org] = await tx`SELECT o.id, m.user_id FROM organizations o JOIN organization_members m ON m.organization_id = o.id JOIN users u ON u.id = m.user_id WHERE o.slug = 'fa-abogados' AND u.username = 'fa_abogados' AND m.role = 'admin'`;
    if (!org) throw new Error("No se confirmó el espacio FA");
    await tx`SELECT pg_advisory_xact_lock(hashtext(${org.id}), 741028)`;
    const [run] = await tx`SELECT started_at, completed_at, changed, notifications FROM source_sync_runs WHERE id = ${runId} AND organization_id = ${org.id} AND status = 'success'`;
    if (!run?.completed_at) throw new Error("No se confirmó la corrida de incorporación FA");
    const [done] = await tx`SELECT id FROM audit_events WHERE organization_id = ${org.id} AND action = 'source.fa_party_order_repaired_v2_2026_10_01'`;
    if (done) return { applied: false, invalidated: 0, completedTasks: 0 };
    const rows = await tx`SELECT id, change_detail FROM notifications WHERE organization_id = ${org.id} AND change_detail->>'runId' = ${runId}`;
    const names = (value: unknown) => typeof value === 'string' ? value.split(';').map(s => s.trim()).sort().join(';') : null;
    if (rows.length !== 89 || rows.some(row => !Array.isArray(row.change_detail.changes) || !row.change_detail.changes.length || row.change_detail.changes.some((c: { field: string; before: unknown; after: unknown }) => c.field !== 'representativeName' || names(c.before) === null || names(c.before) !== names(c.after)))) throw new Error("Los avisos incluyen diferencias distintas del orden; no se invalidaron");
    await tx`UPDATE notifications SET change_detail = change_detail || ${tx.json({ invalidated: true, invalidationReason: 'Solo cambió el orden de los mismos representantes, sin novedad del expediente' })}, updated_at = now() WHERE organization_id = ${org.id} AND change_detail->>'runId' = ${runId}`;
    let completedTasks = 0;
    for (const row of rows) {
      if (!row.change_detail.caseId) continue;
      const title = `Revisar nueva actuación de la solicitud con oposición ${row.change_detail.applicationNumber} (2026-10-01)`;
      // Compare timestamps inside PostgreSQL: JS Dates truncate microseconds,
      // whereas tasks and completed_at share the same transaction timestamp.
      const tasks = await tx`UPDATE case_tasks t SET status = 'completed', completed_at = now(), updated_at = now() FROM cases c, source_sync_runs sr WHERE t.case_id = c.id AND t.organization_id = ${org.id} AND c.organization_id = ${org.id} AND c.public_code = ${row.change_detail.caseId} AND t.title = ${title} AND t.status = 'pending' AND sr.id = ${runId} AND sr.organization_id = ${org.id} AND t.created_at >= sr.started_at AND t.created_at <= sr.completed_at RETURNING t.id`;
      completedTasks += tasks.length;
    }
    await tx`UPDATE source_sync_runs SET changed = 0, notifications = 0 WHERE id = ${runId} AND organization_id = ${org.id}`;
    await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, before_data, after_data) VALUES (${org.id}, ${org.user_id}, 'source.fa_party_order_repaired_v2_2026_10_01', 'organization', ${org.id}, ${tx.json({ runId, changed: run.changed, notifications: run.notifications })}, ${tx.json({ invalidated: rows.length, completedTasks, evidencePreserved: true })})`;
    return { applied: true, invalidated: rows.length, completedTasks };
  });
}
