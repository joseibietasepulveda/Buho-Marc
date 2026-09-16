import { getSql } from "../db/index";
import { runAs } from "../lib/tenant-context";
import { correctReceivedToFiled } from "../db/opposition-role";

// User-confirmed correction, restricted to the verified Dev environment and Daniel's tenant.
if (process.env.RAILWAY_ENVIRONMENT_ID !== "9e2891f0-7281-4872-a992-2c48866a782d") {
  console.log("Corrección de oposiciones de Daniel: omitida fuera de Dev.");
} else {
  const sql = getSql();
  try {
    const identities = await sql`SELECT o.id AS organization_id, u.id AS user_id FROM organizations o JOIN organization_members m ON m.organization_id = o.id JOIN users u ON u.id = m.user_id WHERE o.slug = 'daniel-morales' AND u.username = 'daniel_morales' AND m.role = 'admin'`;
    if (identities.length !== 1) throw new Error("No se pudo identificar inequívocamente el espacio de Daniel para la corrección");
    const identity = identities[0];
    await runAs({ organizationId: identity.organization_id, userId: identity.user_id, name: "Daniel Morales", organizationName: "Daniel Morales", role: "admin", mustChangePassword: false }, async () => {
      const outcomes = await sql.begin(async tx => {
        const result = [];
        for (const id of ["1629865", "1670802", "1671640"]) result.push(await correctReceivedToFiled(tx, id));
        if (result.some(r => r.outcome === "absent")) throw new Error("Falta uno de los tres casos confirmados para corregir; no se aplicaron cambios parciales.");
        return result;
      });
      console.log("Corrección de roles de Daniel:", JSON.stringify(outcomes));
    });
  } finally { await sql.end(); }
}
