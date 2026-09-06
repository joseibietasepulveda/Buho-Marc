import { readFileSync } from "node:fs";
import { getSql } from "../db/index";
import { DEMO_ORG_ID, ensureDemoSeed } from "../db/demo";
import { fetchInapi, isRealSource } from "../lib/inapi-provider";
import { importRealRecord } from "../db/inapi-portfolio";
import { stableJson, type FieldChange } from "../lib/source-contract";

// Intentionally restricted to the previously verified Dev environment.
if (!isRealSource() || process.env.RAILWAY_ENVIRONMENT_ID !== "9e2891f0-7281-4872-a992-2c48866a782d") throw new Error("Esta importación solo puede ejecutarse en Dev");
const cohort = JSON.parse(readFileSync(new URL("../data/inapi-cohort.json", import.meta.url), "utf8")) as { applicationNumber: string; kind: "brand" | "application" }[];
if (cohort.length !== 200 || new Set(cohort.map(r => r.applicationNumber)).size !== 200 || cohort.filter(r => r.kind === "brand").length !== 100) throw new Error("La muestra debe contener 100 solicitudes y 100 registros distintos");
const sql = getSql();
try {
  await ensureDemoSeed();
  // Keep an audit trail while invalidating only our verified key-order false positives.
  await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(741028)`;
    const runs = await tx`SELECT id, detail FROM source_sync_runs WHERE organization_id = ${DEMO_ORG_ID} AND status = 'success' AND notifications > 0`;
    for (const run of runs) {
      const details = run.detail as { changes: FieldChange[] }[];
      if (!details.length || !details.every(d => d.changes.length && d.changes.every(c => stableJson(c.before) === stableJson(c.after)))) continue;
      await tx`UPDATE notifications SET change_detail = change_detail || '{"invalidated":true}'::jsonb WHERE organization_id = ${DEMO_ORG_ID} AND change_detail->>'runId' = ${run.id} AND change_detail->>'source' = 'inapi'`;
      await tx`UPDATE source_sync_runs SET status = 'failed', changed = 0, notifications = 0, error = 'Corrida invalidada durante verificación: solo cambió el orden interno de los campos, sin cambios en expedientes. Los avisos se conservaron para auditoría y no se muestran.' WHERE id = ${run.id}`;
    }
  });
  // Undo only the archival performed by the first real-data import, if deployed.
  // Transaction timestamps identify our change without restoring user archives.
  await sql`UPDATE brands b SET archived_at = NULL WHERE b.organization_id = ${DEMO_ORG_ID}
    AND COALESCE(b.monitoring_config->>'provider', '') <> 'inapi'
    AND b.archived_at IN (SELECT started_at FROM source_sync_runs WHERE organization_id = ${DEMO_ORG_ID} AND trigger = 'initial' AND status = 'success')`;
  const [prior] = await sql`SELECT id FROM source_sync_runs WHERE organization_id = ${DEMO_ORG_ID} AND trigger = 'initial' AND status = 'success'`;
  if (prior) console.log("La importación inicial ya se realizó. Use Revisar para actualizar sin reemplazar el historial.");
  else {
    const response = await fetchInapi({ applicationIds: cohort.map(r => r.applicationNumber), registrationIds: [] });
    for (const r of response.records) {
      const selection = cohort.find(c => c.applicationNumber === r.applicationNumber)!;
      if (selection.kind === "brand" && (r.status !== "registered" || !r.registrationNumber || !r.registrationDate)) throw new Error(`Concesión no acreditada para ${r.applicationNumber}`);
      if (selection.kind === "application" && ["registered", "expired", "cancelled", "rejected-final"].includes(r.status)) throw new Error(`La solicitud ${r.applicationNumber} no está activa`);
    }
    await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(741028)`;
      const [exists] = await tx`SELECT id FROM source_sync_runs WHERE organization_id = ${DEMO_ORG_ID} AND trigger = 'initial' AND status = 'success'`;
      if (exists) throw new Error("Otra importación ya finalizó");
      // Existing mock brands and their surveillance remain visible alongside real records.
      for (const r of response.records) await importRealRecord(tx, r, cohort.find(c => c.applicationNumber === r.applicationNumber)!.kind);
      await tx`INSERT INTO source_sync_runs (organization_id, trigger, status, completed_at, requested, received, baseline, request) VALUES (${DEMO_ORG_ID}, 'initial', 'success', now(), 200, 200, 200, ${tx.json({ applicationIds: cohort.map(c => c.applicationNumber), registrationIds: [] })})`;
    });
    console.log("Dev: 100 solicitudes y 100 marcas registradas importadas; fotografía inicial guardada; 0 notificaciones históricas.");
  }
} finally { await sql.end(); }
