import { getSql } from "../db/index";

// One-time Dev recovery. Keep failed jobs/attempts as evidence and enqueue a new
// stock review only for active brands that have never completed the 50 upgrade.
if (process.env.RAILWAY_ENVIRONMENT_ID !== "9e2891f0-7281-4872-a992-2c48866a782d") {
  throw new Error("La recuperación está limitada al ambiente Dev verificado.");
}
const sql = getSql();
try {
  const apply = process.argv.includes("--apply");
  const recovered = await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(908101, 1)`;
    const candidates = await tx`SELECT b.id AS brand_id, b.organization_id, j.id AS failed_job, j.request, j.requested_by
      FROM brands b JOIN organizations o ON o.id = b.organization_id
      JOIN LATERAL (SELECT * FROM monitoring_jobs WHERE brand_id = b.id AND request <> '{}'::jsonb ORDER BY created_at DESC LIMIT 1) j ON true
      WHERE b.archived_at IS NULL AND b.status <> 'Pausada' AND o.status = 'active' AND o.automatic_monitoring
      AND b.monitoring_config->>'provider' = 'inapi' AND b.monitoring_config->>'monitoringEnabled' = 'true'
      AND j.status = 'failed' AND j.error_code = 'La fuente no autorizó esta consulta.'
      AND NOT EXISTS (SELECT 1 FROM monitoring_job_attempts a WHERE a.monitoring_job_id = j.id AND a.error_payload ? 'upstreamStatus')
      AND NOT EXISTS (SELECT 1 FROM monitoring_jobs s WHERE s.brand_id = b.id AND s.status = 'success' AND (s.request->>'limit')::int >= 50)
      AND NOT EXISTS (SELECT 1 FROM monitoring_jobs active WHERE active.brand_id = b.id AND active.status IN ('queued','running','retry'))
      AND NOT EXISTS (SELECT 1 FROM monitoring_jobs recovery WHERE recovery.organization_id = b.organization_id AND recovery.idempotency_key = 'recover-stock50-403-20260921:' || b.id::text)`;
    if (!apply) return { eligible: candidates.length, queued: 0, dryRun: true };
    let queued = 0;
    for (const candidate of candidates) {
      const inserted = await tx`INSERT INTO monitoring_jobs (organization_id, brand_id, status, idempotency_key, requested_by, request)
        VALUES (${candidate.organization_id}, ${candidate.brand_id}, 'queued', ${`recover-stock50-403-20260921:${candidate.brand_id}`}, ${candidate.requested_by}, ${tx.json({ ...candidate.request, limit: 50, since: null })})
        ON CONFLICT DO NOTHING RETURNING id`;
      queued += inserted.length;
    }
    return { eligible: candidates.length, queued, dryRun: false };
  });
  console.info("[vigilancia] Recuperación de stock tras HTTP 403:", JSON.stringify(recovered));
} finally { await sql.end(); }
