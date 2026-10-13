import { getSql } from "../db/index";
import { runAs } from "../lib/tenant-context";
import { importRealRecord } from "../db/inapi-portfolio";
import { fetchSource } from "../lib/source-provider";
import { renewalReminder } from "../lib/renewal-reminder";
import { generateRenewalNotices } from "../db/renewal-notices";
import type { SourceRecord } from "../lib/source-contract";

const environments = ["9e2891f0-7281-4872-a992-2c48866a782d", "01262643-e6b7-499c-ae75-e83254e1c697"];
if (!environments.includes(process.env.RAILWAY_ENVIRONMENT_ID ?? "")) throw new Error("Ambiente fuera del alcance autorizado");
const apply = process.argv.includes("--apply");
const sql = getSql();
try {
  for (const slug of ["estudio-ibieta-ip", "barros-errazuriz"]) {
    const [org] = await sql`SELECT o.id, o.name, u.id AS user_id, u.name AS user_name, m.role FROM organizations o JOIN organization_members m ON m.organization_id = o.id JOIN users u ON u.id = m.user_id WHERE o.slug = ${slug} AND o.status = 'active' AND m.role = 'admin' ORDER BY m.created_at LIMIT 1`;
    if (!org) { console.log(JSON.stringify({ slug, missingWorkspace: true })); continue; }
    const identity = { organizationId: org.id, organizationName: org.name, userId: org.user_id, name: org.user_name, role: org.role, mustChangePassword: false };
    await runAs(identity, async () => {
      const rows = await sql`SELECT r.data FROM brands b JOIN source_snapshots s ON s.entity_id = b.id AND s.entity_type = 'brand' AND s.organization_id = b.organization_id JOIN source_records r ON r.id = s.source_id WHERE b.organization_id = ${org.id} AND b.archived_at IS NULL AND COALESCE(b.monitoring_config->>'watchOnly', 'false') <> 'true'`;
      const upcoming = rows.filter(row => renewalReminder(row.data as SourceRecord));
      let added = false;
      if (!upcoming.length && slug === "estudio-ibieta-ip") {
        if (!apply) { console.log(JSON.stringify({ slug, apply: false, upcoming: 0, exampleApplication: "1204333", externalRequests: 0 })); return; }
        // Explicit one-off operation. Never runs at startup or while viewing UI.
        const response = await fetchSource({ applicationIds: ["1204333"], registrationIds: [] });
        const record = response.records.find(r => r.applicationNumber === "1204333");
        if (!record || !renewalReminder(record)) throw new Error("El registro de ejemplo ya no cumple la vigencia requerida; no se incorpora");
        await sql.begin(async tx => {
          await tx`SELECT pg_advisory_xact_lock(hashtext(${org.id}), 741028)`;
          const [existing] = await tx`SELECT id FROM brands WHERE organization_id = ${org.id} AND public_code = 'BM-R-1204333'`;
          if (existing) return; // Do not overwrite an existing user's portfolio decision.
          await importRealRecord(tx, record, "brand");
          const [brand] = await tx`UPDATE brands SET monitoring_config = monitoring_config || ${tx.json({ monitoringEnabled: true })}, updated_at = now() WHERE organization_id = ${org.id} AND public_code = 'BM-R-1204333' RETURNING id`;
          await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${org.id}, ${org.user_id}, 'portfolio.renewal_example_added', 'brand', ${brand.id}, ${tx.json({ applicationNumber: record.applicationNumber, expirationDate: record.expirationDate, reason: "Ejemplo real de renovación solicitado por el usuario" })})`;
          added = true;
        });
      }
      console.log(JSON.stringify({ slug, apply, upcoming: upcoming.length, added, ...(apply ? await generateRenewalNotices() : { externalRequests: 0 }) }));
    });
  }
} finally { await sql.end(); }
