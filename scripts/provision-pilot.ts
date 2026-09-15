import { getSql } from "../db/index";
import { hashPassword } from "../lib/password";

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
} finally { await sql.end(); }
