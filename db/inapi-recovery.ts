import type { TransactionSql } from "postgres";
import { getSql } from "./index";
import { updatedApplication } from "./source";
import { realBrandConfig } from "./inapi-portfolio";
import type { RegistrationApplication } from "../lib/registration-data";
import { compareRecords, type SourceRecord } from "../lib/source-contract";
import { directRecoveryEnabled, recoveryDailyLimit, recoveryKey, recoveryNeeds } from "../lib/inapi-recovery";
import { fetchOfficialInapi, INAPI_REQUEST_INTERVAL_MS, INAPI_REQUEST_TIMEOUT_MS, mergeOfficialEvidence } from "../lib/inapi-official";

export async function enqueueInapiRecovery(tx: TransactionSql, sourceId: string, record: SourceRecord, application?: RegistrationApplication) {
  if (!directRecoveryEnabled()) return;
  // Serialize the per-antecedent check even when two organizations import
  // different subsets of the same dossier concurrently.
  await tx`SELECT pg_advisory_xact_lock(hashtext(${record.applicationNumber}), 741033)`;
  const previous = await tx`SELECT needs FROM inapi_recovery_jobs WHERE application_number = ${record.applicationNumber}`;
  const known = new Set(previous.flatMap(row => row.needs as string[]));
  const needs = recoveryNeeds(record, undefined, application).filter(need => !known.has(need));
  if (!needs.length) return;
  await tx`INSERT INTO inapi_recovery_jobs (source_id, application_number, need_key, needs) VALUES (${sourceId}, ${record.applicationNumber}, ${recoveryKey(needs)}, ${tx.json(needs)}) ON CONFLICT (application_number, need_key) DO NOTHING`;
}

/** Hold a session lock for the entire exchange. Commit a conservative timeout
 * reservation before HTTP so a process killed mid-request cannot lose the
 * cooldown on transaction rollback. Normal completion replaces it with the
 * actual finish timestamp, including caught failures. */
export async function officialRequestGate<T>(request: () => Promise<T>): Promise<T> {
  const connection = await getSql().reserve();
  let locked = false;
  try {
    await connection`SELECT pg_advisory_lock(741032)`;
    locked = true;
    const [clock] = await connection`SELECT last_finished_at, blocked_until, clock_timestamp() AS current_time FROM inapi_request_clock WHERE id = 1`;
    if (!clock) throw new Error("Falta aplicar la migración de recuperación INAPI");
    if (clock.blocked_until && new Date(clock.blocked_until) > new Date(clock.current_time)) throw new Error("La consulta oficial está en pausa o tiene una petición interrumpida");
    const wait = clock.last_finished_at ? Math.max(0, INAPI_REQUEST_INTERVAL_MS + 5 - (new Date(clock.current_time).getTime() - new Date(clock.last_finished_at).getTime())) : 0;
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    await connection`UPDATE inapi_request_clock SET blocked_until = clock_timestamp() + ${INAPI_REQUEST_TIMEOUT_MS + INAPI_REQUEST_INTERVAL_MS + 5}::double precision * interval '1 millisecond' WHERE id = 1`;
    try { return await request(); }
    finally { await connection`UPDATE inapi_request_clock SET last_finished_at = clock_timestamp(), blocked_until = NULL WHERE id = 1`; }
  } finally {
    try { if (locked) await connection`SELECT pg_advisory_unlock(741032)`; }
    finally { connection.release(); }
  }
}

export async function applySavedInapiRecord(tx: TransactionSql, sourceId: string, record: SourceRecord) {
  const applications = await tx`SELECT a.id, a.data FROM registration_applications a JOIN source_snapshots s ON s.entity_id = a.id AND s.organization_id = a.organization_id AND s.entity_type = 'application' WHERE s.source_id = ${sourceId} FOR UPDATE OF a`;
  for (const app of applications) await tx`UPDATE registration_applications SET data = ${tx.json(updatedApplication(app.data as RegistrationApplication, record, "Antecedentes guardados reinterpretados"))}, updated_at = now() WHERE id = ${app.id}`;
  await tx`UPDATE cases c SET proceeding = jsonb_set(c.proceeding, '{record}', ${tx.json(record)}), updated_at = now() FROM source_snapshots s WHERE s.source_id = ${sourceId} AND s.entity_type = 'case' AND c.id = s.entity_id AND c.organization_id = s.organization_id`;
  // Received cases may share the application's snapshot rather than owning one.
  await tx`UPDATE cases c SET proceeding = jsonb_set(c.proceeding, '{record}', ${tx.json(record)}), updated_at = now() WHERE c.proceeding->'record'->>'applicationNumber' = ${record.applicationNumber} AND EXISTS (SELECT 1 FROM source_snapshots s WHERE s.source_id = ${sourceId} AND s.organization_id = c.organization_id)`;
  await tx`UPDATE brands b SET monitoring_config = b.monitoring_config || ${tx.json(realBrandConfig(record))}, name = ${record.name}, word_mark = ${record.name}, owner_name = ${record.owner}, registration_number = ${record.registrationNumber}, registration_date = ${record.registrationDate}, updated_at = now() FROM source_snapshots s WHERE s.source_id = ${sourceId} AND s.entity_type = 'brand' AND b.id = s.entity_id AND b.organization_id = s.organization_id`;
}

export async function processInapiRecovery(fetcher: typeof fetch = fetch) {
  if (!directRecoveryEnabled()) return { skipped: true, reason: "disabled" };
  const sql = getSql(); const connection = await sql.reserve();
  let locked = false;
  try {
    const [lock] = await connection`SELECT pg_try_advisory_lock(741031) AS acquired`;
    locked = lock.acquired;
    if (!locked) return { skipped: true, reason: "running" };
    // An interrupted attempt is terminal: it is never silently repeated.
    await connection`UPDATE inapi_recovery_jobs SET status = 'failed', completed_at = now(), error = 'Consulta interrumpida; no se reintenta automáticamente' WHERE status = 'running'`;
    const [clock] = await connection`SELECT blocked_until > now() AS blocked FROM inapi_request_clock WHERE id = 1`;
    if (clock?.blocked) return { skipped: true, reason: "cooldown" };
    const [daily] = await connection`SELECT count(*)::int AS count FROM inapi_recovery_jobs WHERE started_at >= date_trunc('day', now() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago'`;
    if (daily.count >= recoveryDailyLimit()) return { skipped: true, reason: "daily-limit" };
    const [job] = await connection`SELECT j.*, r.data FROM inapi_recovery_jobs j JOIN source_records r ON r.id = j.source_id WHERE j.status = 'queued' AND EXISTS (SELECT 1 FROM source_snapshots s JOIN organizations o ON o.id = s.organization_id WHERE s.source_id = j.source_id AND o.status = 'active') ORDER BY j.created_at, j.id LIMIT 1`;
    if (!job) return { skipped: true, reason: "empty" };
    if (!recoveryNeeds(job.data).some(need => (job.needs as string[]).includes(need))) {
      await connection`UPDATE inapi_recovery_jobs SET status = 'cancelled', completed_at = now() WHERE id = ${job.id}`;
      return { cancelled: true };
    }
    await connection`UPDATE inapi_recovery_jobs SET status = 'running', started_at = now() WHERE id = ${job.id}`;
    try {
      const official = await fetchOfficialInapi(job.data, officialRequestGate, fetcher);
      const result = await sql.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(741028)`;
        const [saved] = await tx`SELECT data FROM source_records WHERE id = ${job.source_id} FOR UPDATE`;
        if (!saved) throw new Error("El expediente dejó de estar disponible");
        const checkedAt = official.retrieval!.officialCheckedAt!;
        const merged = mergeOfficialEvidence(saved.data, official, checkedAt);
        const changed = compareRecords(saved.data, merged).length > 0;
        merged.retrieval = { ...merged.retrieval, lastChangeDetectedAt: changed ? checkedAt : saved.data.retrieval?.lastChangeDetectedAt };
        await tx`UPDATE source_records SET data = ${tx.json(merged)}, registration_number = ${merged.registrationNumber}, version = version + ${changed ? 1 : 0}, updated_at = now() WHERE id = ${job.source_id}`;
        await applySavedInapiRecord(tx, job.source_id, merged);
        const unresolved = recoveryNeeds(merged).length > 0;
        await tx`UPDATE inapi_recovery_jobs SET status = ${unresolved ? "unresolved" : "success"}, completed_at = now() WHERE id = ${job.id}`;
        return { completed: true, resolved: !unresolved, changed };
      });
      return result;
    } catch (error) {
      // No upstream body, identifiers, opaque hashes or session cookies in logs.
      const message = error instanceof Error && !error.name.includes("Zod") ? error.message.slice(0, 400) : "La respuesta oficial no cumple el contrato esperado";
      await connection`UPDATE inapi_recovery_jobs SET status = 'failed', completed_at = now(), error = ${message} WHERE id = ${job.id}`;
      await connection`UPDATE inapi_request_clock SET blocked_until = now() + interval '1 hour' WHERE id = 1`;
      return { failed: true, message };
    }
  } finally {
    try { if (locked) await connection`SELECT pg_advisory_unlock(741031)`; }
    finally { connection.release(); }
  }
}
