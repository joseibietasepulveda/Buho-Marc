import { getSql } from "../db/index";
import { applySavedInapiRecord, enqueueInapiRecovery } from "../db/inapi-recovery";
import { reprojectInapiRecord } from "../lib/inapi-provider";
import { stableJson, type SourceRecord } from "../lib/source-contract";

// Offline operation: no source-provider calls, no simulated extraction dates,
// no historical notifications. --queue prepares bounded recovery, never fetches.
const apply = process.argv.includes("--apply");
const queue = process.argv.includes("--queue");
if (queue && !apply) throw new Error("--queue requiere --apply; revisar primero el informe sin opciones");
const sql = getSql();
try {
  const records = await sql`SELECT id, data FROM source_records WHERE data->>'provider' = 'inapi' ORDER BY application_number`;
  let changed = 0;
  for (const row of records) {
    const next = reprojectInapiRecord(row.data as SourceRecord);
    if (stableJson(row.data) !== stableJson(next)) changed++;
    if (apply) await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(741028)`;
      const [current] = await tx`SELECT data FROM source_records WHERE id = ${row.id} FOR UPDATE`;
      if (!current) return;
      const projected = reprojectInapiRecord(current.data);
      await tx`UPDATE source_records SET data = ${tx.json(projected)} WHERE id = ${row.id}`;
      await applySavedInapiRecord(tx, row.id, projected);
      const snapshots = await tx`SELECT id, data FROM source_snapshots WHERE source_id = ${row.id}`;
      for (const snapshot of snapshots) await tx`UPDATE source_snapshots SET data = ${tx.json(reprojectInapiRecord(snapshot.data))} WHERE id = ${snapshot.id}`;
      // Eligibility is determined per own application, preserving manual proof.
      if (queue) {
        const applications = await tx`SELECT a.data FROM registration_applications a JOIN source_snapshots s ON s.entity_id = a.id AND s.entity_type = 'application' AND s.organization_id = a.organization_id WHERE s.source_id = ${row.id} AND COALESCE(a.data->>'portfolioRole', 'own') <> 'third-party'`;
        for (const application of applications) await enqueueInapiRecovery(tx, row.id, projected, application.data);
      }
    });
  }
  console.log(JSON.stringify({ mode: apply ? "applied" : "preview", records: records.length, projectionsChanged: changed, queuePrepared: apply && queue, externalRequests: 0 }));
} finally { await sql.end(); }
