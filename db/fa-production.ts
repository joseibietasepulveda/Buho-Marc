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
