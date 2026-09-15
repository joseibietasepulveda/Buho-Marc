import { getSql } from "../db/index";
import { hashPassword } from "../lib/password";
import { DEMO_ACTOR, DEMO_ORGANIZATION } from "../lib/tenant-context";

const password = process.env.DANIEL_INITIAL_PASSWORD;
const sql = getSql();
try {
  const [existing] = await sql`SELECT id FROM users WHERE username = 'daniel_morales'`;
  if (!existing && password) {
    const hash = await hashPassword(password);
    await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(741030)`;
      const [again] = await tx`SELECT id FROM users WHERE username = 'daniel_morales'`;
      if (again) return;
      const [org] = await tx`INSERT INTO organizations (name, slug) VALUES ('Daniel Morales', 'daniel-morales') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
      const [user] = await tx`INSERT INTO users (username, password_hash, must_change_password, name, initials) VALUES ('daniel_morales', ${hash}, true, 'Daniel Morales', 'DM') RETURNING id`;
      await tx`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${org.id}, ${user.id}, 'admin')`;
    });
    console.log("Espacio de Daniel preparado; clave temporal configurada.");
  } else console.log(existing ? "La cuenta de Daniel ya existe; se conserva su clave." : "Cuenta piloto pendiente de configurar DANIEL_INITIAL_PASSWORD.");
  const previousSpacePassword = process.env.BUHO_INITIAL_PASSWORD;
  if (previousSpacePassword) {
    const hash = await hashPassword(previousSpacePassword);
    const activated = await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(741030)`;
      const [owner] = await tx`SELECT u.id, u.username, u.password_hash FROM users u
        JOIN organization_members m ON m.user_id = u.id
        JOIN organizations o ON o.id = m.organization_id
        WHERE u.id = ${DEMO_ACTOR} AND o.id = ${DEMO_ORGANIZATION}
        AND o.slug = 'estudio-ibieta-ip' AND o.status = 'active' AND m.role = 'admin'
        FOR UPDATE OF u`;
      if (!owner) throw new Error("No se encontró el administrador del espacio anterior. No se modificaron sus datos.");
      const [otherMembership] = await tx`SELECT organization_id FROM organization_members WHERE user_id = ${DEMO_ACTOR} AND organization_id <> ${DEMO_ORGANIZATION}`;
      if (otherMembership) throw new Error("El administrador tiene otro espacio vinculado; se requiere revisión antes de habilitar el acceso.");
      if (owner.username === 'buho_marc' && owner.password_hash) return false;
      if (owner.username || owner.password_hash) throw new Error("El administrador ya tiene credenciales distintas; no se reemplazaron.");
      const [conflict] = await tx`SELECT id FROM users WHERE lower(username) = 'buho_marc'`;
      if (conflict) throw new Error("El usuario solicitado ya está ocupado; no se vinculó a otro espacio.");
      await tx`UPDATE users SET username = 'buho_marc', password_hash = ${hash}, must_change_password = true, updated_at = now() WHERE id = ${DEMO_ACTOR}`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data)
        VALUES (${DEMO_ORGANIZATION}, ${DEMO_ACTOR}, 'account.access_enabled', 'user', ${DEMO_ACTOR}, ${tx.json({ username: 'buho_marc' })})`;
      return true;
    });
    console.log(activated ? "Acceso Buho_Marc habilitado al espacio anterior; cartera y asignaciones conservadas." : "El acceso Buho_Marc ya existe; se conserva su clave vigente.");
  }
} finally { await sql.end(); }
