import { createHash, randomUUID } from "node:crypto";
import type { TransactionSql } from "postgres";
import { getSql } from "./index";
import { organizationId, actorId } from "../lib/tenant-context";
import { realBrandConfig } from "./inapi-portfolio";
import { fetchInapi } from "../lib/inapi-provider";
import { searchSimilar, similarityConfigured, SimilarityError, withRecord } from "../lib/similarity-provider";
import { WATCH_LIMIT, similarityExplanation, type SimilarityHit, type SimilarityResult } from "../lib/similarity-contract";
import type { SourceRecord } from "../lib/source-contract";
import { nextSourceReview, santiagoDay } from "../lib/source-schedule";

const code = (prefix: string, identity: string) => prefix + createHash("sha256").update(identity).digest("hex").slice(0, 22).replace(/[0-9]/g, n => "ghijklmnop"[Number(n)]);
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

// Mirror only owned pending applications into the existing brand identity used by
// matches/cases. They remain in Solicitudes, not the registered-portfolio screen.
export async function enrollWatchTargets() {
  if (!similarityConfigured()) return;
  const sql = getSql();
  await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${organizationId()}), 741028)`;
    const sources = await tx`SELECT DISTINCT ON (r.application_number) r.data, s.entity_type FROM source_snapshots s JOIN source_records r ON r.id = s.source_id
      WHERE s.organization_id = ${organizationId()} AND s.entity_type IN ('brand','application') AND r.data->>'provider' = 'inapi'
      AND ((s.entity_type = 'brand' AND EXISTS (SELECT 1 FROM brands b WHERE b.id = s.entity_id AND b.archived_at IS NULL)) OR (s.entity_type = 'application' AND EXISTS (SELECT 1 FROM registration_applications a WHERE a.id = s.entity_id AND COALESCE(a.data->>'portfolioRole', 'own') <> 'third-party')))
      AND NOT EXISTS (SELECT 1 FROM cases c WHERE c.organization_id = s.organization_id AND c.proceeding->'record'->>'applicationNumber' = r.application_number AND c.proceeding->>'role' = 'opponent')
      ORDER BY r.application_number, s.entity_type`;
    for (const row of sources) {
      const record = row.data as SourceRecord;
      const [existing] = await tx`SELECT id, monitoring_config FROM brands WHERE organization_id = ${organizationId()} AND monitoring_config->>'applicationNumber' = ${record.applicationNumber} AND archived_at IS NULL ORDER BY created_at LIMIT 1`;
      if (!existing) {
        const config = { ...realBrandConfig(record), watchOnly: row.entity_type === "application", monitoringEnabled: true };
        const [brand] = await tx`INSERT INTO brands (organization_id, public_code, name, word_mark, owner_name, registration_number, status, monitoring_config, created_by) VALUES (${organizationId()}, ${`BM-R-${record.applicationNumber}`}, ${record.name}, ${record.name}, ${record.owner}, ${record.registrationNumber}, 'Activa', ${tx.json(config)}, ${actorId()}) ON CONFLICT (organization_id, public_code) DO NOTHING RETURNING id`;
        if (brand) for (const niceClass of record.classes) await tx`INSERT INTO brand_classes (brand_id, nice_class) VALUES (${brand.id}, ${niceClass}) ON CONFLICT DO NOTHING`;
      } else {
        const enabled = existing.monitoring_config.monitoringEnabled !== false;
        await tx`UPDATE brands SET name = ${record.name}, owner_name = ${record.owner}, monitoring_config = monitoring_config || ${tx.json({ ...realBrandConfig(record), monitoringEnabled: enabled })}, status = ${enabled ? "Activa" : "Pausada"} WHERE id = ${existing.id}`;
      }
    }
  });
}

export async function queueWatch(brandCode?: string, now = new Date()) {
  await enrollWatchTargets();
  const sql = getSql();
  return sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${organizationId()}), 908101)`;
    const targets = await tx`SELECT b.*, (SELECT completed_at FROM monitoring_jobs j WHERE j.brand_id = b.id AND j.status = 'success' ORDER BY completed_at DESC LIMIT 1) AS last_success FROM brands b
      WHERE b.organization_id = ${organizationId()} AND b.archived_at IS NULL AND b.status <> 'Pausada' AND b.monitoring_config->>'provider' = 'inapi' AND b.monitoring_config->>'monitoringEnabled' = 'true' AND (${brandCode ?? null}::text IS NULL OR b.public_code = ${brandCode ?? null})`;
    let queued = 0;
    for (const target of targets) {
      const last = target.last_success ? new Date(target.last_success) : null;
      if (!brandCode && last && (process.env.MONITORING_SCHEDULER_ENABLED !== "true" || now < new Date(nextSourceReview(last, true)!))) continue;
      if (!brandCode && !last && process.env.MONITORING_SCHEDULER_ENABLED !== "true") continue;
      const request = { application_id: Number(target.monitoring_config.applicationNumber), limit: WATCH_LIMIT, grouped: false, exclude_same_holder: true, include: ["coverage"], since: last ? santiagoDay(new Date(last.getTime() - 2 * 86400000)) : null };
      const key = brandCode ? `manual:${target.id}:${randomUUID()}` : `v1:${target.id}:${santiagoDay(now)}`;
      const rows = await tx`INSERT INTO monitoring_jobs (organization_id, brand_id, status, idempotency_key, requested_by, request) VALUES (${organizationId()}, ${target.id}, 'queued', ${key}, ${actorId()}, ${tx.json(request)}) ON CONFLICT DO NOTHING RETURNING id`;
      queued += rows.length;
    }
    if (brandCode && !targets.length) throw new Error("Marca no disponible para vigilancia. Revisa si está pausada.");
    return queued;
  });
}

async function milestone(tx: TransactionSql, org: string, brand: string, match: { id: string; public_code: string }, hit: SimilarityHit, kind: string, day: string) {
  const noticeCode = code("NW-", `${org}:${match.id}:${kind}:${day}`);
  const title = `${kind === "publication" ? "Publicación en Diario Oficial" : "Solicitud similar detectada"}: ${hit.name}`.slice(0, 220);
  const body = `${hit.name} · Solicitud ${hit.applicationId}\nMarca propia: ${brand}\nEstado INAPI: ${hit.status}\n${kind === "publication" ? "Publicación: " + day : "Ingreso: " + (hit.filedAt ?? "No informado")}\nRevisa la coincidencia y sus coberturas antes de decidir una acción.`;
  const [notice] = await tx`INSERT INTO notifications (organization_id, public_code, entity_type, entity_id, type, title, brand_name, urgency) VALUES (${org}, ${noticeCode}, 'match', ${match.id}, ${`similarity_${kind}`}, ${title}, ${brand}, 'Media') ON CONFLICT (organization_id, public_code) DO NOTHING RETURNING id`;
  if (notice) await tx`INSERT INTO email_drafts (organization_id, notification_id, subject, body) VALUES (${org}, ${notice.id}, ${title}, ${body})`;
}

export async function persistWatch(job: { id: string; organization_id: string; brand_id: string; lease_token: string; attempt_count: number }, responses: SimilarityResult[], refreshed: SimilarityHit[] = []) {
  const sql = getSql();
  return sql.begin(async tx => {
    const [lease] = await tx`SELECT id, request FROM monitoring_jobs WHERE id = ${job.id} AND status = 'running' AND lease_token = ${job.lease_token} FOR UPDATE`;
    if (!lease) return false;
    const [brand] = await tx`SELECT * FROM brands WHERE id = ${job.brand_id} AND organization_id = ${job.organization_id} FOR UPDATE`;
    if (!brand || brand.archived_at || brand.status === 'Pausada') {
      await tx`UPDATE monitoring_jobs SET status = 'cancelled', completed_at = now(), lease_token = NULL WHERE id = ${job.id}`;
      await tx`UPDATE monitoring_job_attempts SET status = 'cancelled', completed_at = now() WHERE monitoring_job_id = ${job.id} AND attempt_no = ${job.attempt_count}`;
      return false;
    }
    const seen = new Map<string, SimilarityHit>();
    for (const response of responses) for (const hit of response.results) if (!seen.has(hit.applicationId)) seen.set(hit.applicationId, hit);
    // Refresh followed applications even when they leave the current top results.
    for (const hit of refreshed) if (!seen.has(hit.applicationId)) seen.set(hit.applicationId, hit);
    const resultIds: string[] = [];
    for (const hit of seen.values()) {
      const [old] = await tx`SELECT id, public_code, evidence, review_status FROM matches WHERE organization_id = ${job.organization_id} AND brand_id = ${brand.id} AND source = 'DeQuiénEs' AND source_record_id = ${hit.applicationId} FOR UPDATE`;
      const evidence = { hit, query: responses[0].query, fetchedAt: responses[0].fetchedAt };
      const [saved] = await tx`INSERT INTO matches (organization_id, public_code, brand_id, monitoring_job_id, source, source_record_id, published_at, found_name, applicant, application_number, level, total_score, explanation, review_status, evidence)
        VALUES (${job.organization_id}, ${code('CO-', `${brand.id}:${hit.applicationId}`)}, ${brand.id}, ${job.id}, 'DeQuiénEs', ${hit.applicationId}, ${hit.publishedAt}, ${hit.name.slice(0,180)}, ${(hit.holders.map(h => h.name).join('; ') || 'No informado').slice(0,180)}, ${hit.applicationId}, 'Sin clasificar', 0, ${similarityExplanation(hit)}, 'Detectada', ${tx.json(json(evidence))})
        ON CONFLICT (organization_id, brand_id, source, source_record_id) DO UPDATE SET published_at = EXCLUDED.published_at, found_name = EXCLUDED.found_name, applicant = EXCLUDED.applicant, explanation = EXCLUDED.explanation, evidence = EXCLUDED.evidence, monitoring_job_id = EXCLUDED.monitoring_job_id, updated_at = now() RETURNING id, public_code`;
      if (responses.some(r => r.results.some(h => h.applicationId === hit.applicationId))) resultIds.push(saved.public_code);
      if (lease.request.since && !old) await milestone(tx, job.organization_id, brand.name, { id: saved.id, public_code: saved.public_code }, hit, "filing", hit.filedAt ?? responses[0].fetchedAt.slice(0, 10));
      if (lease.request.since && hit.publishedAt && (!old || !old.evidence?.hit?.publishedAt)) await milestone(tx, job.organization_id, brand.name, { id: saved.id, public_code: saved.public_code }, hit, "publication", hit.publishedAt);
    }
    if (!lease.request.since && resultIds.length) {
      const title = `Se encontraron ${resultIds.length} coincidencias para ${brand.name}`.slice(0, 220);
      const [notice] = await tx`INSERT INTO notifications (organization_id, public_code, entity_type, entity_id, type, title, brand_name, urgency) VALUES (${job.organization_id}, ${code('NW-', `${brand.id}:initial`)}, 'brand', ${brand.id}, 'similarity_summary', ${title}, ${brand.name}, 'Media') ON CONFLICT (organization_id, public_code) DO NOTHING RETURNING id`;
      if (notice) await tx`INSERT INTO email_drafts (organization_id, notification_id, subject, body) VALUES (${job.organization_id}, ${notice.id}, ${title}, ${'Abre Vigilancia y despliega las coincidencias de esta marca para revisarlas y elegir cuáles pasar a seguimiento. Se muestran todos los estados; la semejanza no representa una probabilidad de conflicto.'})`;
    }
    await tx`UPDATE monitoring_jobs SET status = 'success', completed_at = now(), result = ${tx.json(json({ responses, resultIds }))}, error_code = NULL, lease_token = NULL WHERE id = ${job.id}`;
    await tx`UPDATE monitoring_job_attempts SET status = 'success', completed_at = now() WHERE monitoring_job_id = ${job.id} AND attempt_no = ${job.attempt_count}`;
    await tx`UPDATE brands SET last_reviewed_at = now() WHERE id = ${brand.id}`;
    return true;
  });
}

export async function processWatchJob(searcher = searchSimilar, lookup = fetchInapi) {
  if (!similarityConfigured()) return { skipped: true };
  const sql = getSql();
  const job = await sql.begin(async tx => {
    // Global, short-lived claim lock: only one remote search at a time, across replicas.
    await tx`SELECT pg_advisory_xact_lock(908101, 1)`;
    const stale = await tx`UPDATE monitoring_jobs SET status = CASE WHEN attempt_count >= 3 THEN 'failed' ELSE 'retry' END, lease_token = NULL, error_code = 'La revisión se interrumpió; se recuperará automáticamente.', available_at = now() WHERE status = 'running' AND started_at < now() - interval '10 minutes' RETURNING id`;
    for (const item of stale) await tx`UPDATE monitoring_job_attempts SET status = 'interrupted', completed_at = now() WHERE monitoring_job_id = ${item.id} AND status = 'running'`;
    if ((await tx`SELECT id FROM monitoring_jobs WHERE status = 'running' LIMIT 1`).length) return null;
    const [next] = await tx`SELECT j.* FROM monitoring_jobs j JOIN brands b ON b.id = j.brand_id JOIN organizations o ON o.id = j.organization_id WHERE j.status IN ('queued','retry') AND j.available_at <= now() AND b.status <> 'Pausada' AND b.archived_at IS NULL AND o.status = 'active' ORDER BY j.available_at, j.created_at LIMIT 1 FOR UPDATE OF j SKIP LOCKED`;
    if (!next) return null;
    const [claimed] = await tx`UPDATE monitoring_jobs SET status = 'running', started_at = now(), lease_token = ${randomUUID()}, attempt_count = attempt_count + 1 WHERE id = ${next.id} RETURNING *`;
    await tx`INSERT INTO monitoring_job_attempts (monitoring_job_id, attempt_no, status) VALUES (${claimed.id}, ${claimed.attempt_count}, 'running')`;
    return claimed;
  });
  if (!job) return { skipped: true };
  try {
    const { since, ...request } = job.request;
    const responses = [await searcher(request)];
    // Independent windows mean OR, never accidentally AND the two milestones.
    if (since) {
      responses.push(await searcher({ ...request, filed_after: since }));
      responses.push(await searcher({ ...request, published_after: since }));
    }
    const knownIds = new Set(responses.flatMap(r => r.results.map(h => h.applicationId)));
    const followed = await sql`SELECT evidence FROM matches WHERE organization_id = ${job.organization_id} AND brand_id = ${job.brand_id} AND source = 'DeQuiénEs' AND review_status IN ('En seguimiento','Convertida en caso')`;
    const refreshHits = followed.map(row => row.evidence.hit as SimilarityHit).filter(hit => !knownIds.has(hit.applicationId));
    const refreshed: SimilarityHit[] = [];
    if (refreshHits.length) {
      const { records } = await lookup({ applicationIds: refreshHits.map(h => h.applicationId), registrationIds: [] });
      const byId = new Map(records.map(r => [r.applicationNumber, r]));
      for (const hit of refreshHits) {
        const record = byId.get(hit.applicationId);
        if (!record) throw new SimilarityError("La fuente no completó los antecedentes en seguimiento. Se reintentará.", 502, true);
        refreshed.push(withRecord(hit, record));
      }
    }
    const completed = await persistWatch(job as Parameters<typeof persistWatch>[0], responses, refreshed);
    return { completed, id: job.id, stockCount: responses[0].results.length, searchCount: responses.length };
  } catch (error) {
    const retry = (error instanceof SimilarityError ? error.retryable : true) && job.attempt_count < 3;
    const message = error instanceof SimilarityError ? error.message : "No se pudo completar la revisión. Se conservan los resultados anteriores.";
    await sql.begin(async tx => {
      const saved = await tx`UPDATE monitoring_jobs SET status = ${retry ? 'retry' : 'failed'}, error_code = ${message.slice(0,100)}, available_at = now() + ${job.attempt_count * 120} * interval '1 second', completed_at = now(), lease_token = NULL WHERE id = ${job.id} AND lease_token = ${job.lease_token} RETURNING id`;
      if (saved.length) await tx`UPDATE monitoring_job_attempts SET status = 'failed', completed_at = now(), error_payload = ${tx.json({ message })} WHERE monitoring_job_id = ${job.id} AND attempt_no = ${job.attempt_count}`;
    });
    return { failed: true, retry };
  }
}

export async function watchSnapshot() {
  const sql = getSql();
  const targets = await sql`SELECT b.public_code, b.name, b.status, b.monitoring_config,
    j.status AS job_status, j.error_code, j.created_at AS requested_at, j.started_at,
    s.completed_at, s.result FROM brands b
    LEFT JOIN LATERAL (SELECT * FROM monitoring_jobs WHERE brand_id = b.id AND request <> '{}'::jsonb ORDER BY created_at DESC LIMIT 1) j ON true
    LEFT JOIN LATERAL (SELECT * FROM monitoring_jobs WHERE brand_id = b.id AND status = 'success' ORDER BY completed_at DESC LIMIT 1) s ON true
    WHERE b.organization_id = ${organizationId()} AND b.archived_at IS NULL AND b.monitoring_config->>'provider' = 'inapi' AND b.monitoring_config ? 'monitoringEnabled' ORDER BY b.name`;
  const matches = await sql`SELECT public_code, brand_id, evidence, review_status, created_at FROM matches WHERE organization_id = ${organizationId()} AND source = 'DeQuiénEs'`;
  const map = new Map(matches.map(row => [row.public_code, row]));
  return { configured: similarityConfigured(), automaticEnabled: process.env.MONITORING_SCHEDULER_ENABLED === "true", targets: targets.map(t => ({ id: t.public_code, name: t.name, applicationId: t.monitoring_config.applicationNumber, image: t.result?.responses?.[0]?.query?.image || t.monitoring_config.logo || "", ownStatus: t.monitoring_config.sourceStatus || t.monitoring_config.registrationState, paused: t.status === 'Pausada', status: t.job_status ?? 'pending', error: t.error_code, reviewedAt: t.completed_at, nextReviewAt: t.completed_at && t.status !== 'Pausada' ? nextSourceReview(new Date(t.completed_at), process.env.MONITORING_SCHEDULER_ENABLED === 'true') : null, warnings: t.result?.responses?.flatMap((r: SimilarityResult) => r.warnings) ?? [], results: (t.result?.resultIds ?? []).map((id: string) => map.get(id)).filter(Boolean).map((m: { public_code: string; evidence: { hit: SimilarityHit }; review_status: string; created_at: string }) => ({ ...m.evidence.hit, history: [], matchId: m.public_code, reviewStatus: m.review_status, detectedAt: m.created_at })) })) };
}

export async function setWatchPaused(id: string, paused: boolean) {
  const rows = await getSql()`UPDATE brands SET status = ${paused ? 'Pausada' : 'Activa'}, monitoring_config = monitoring_config || ${getSql().json({ monitoringEnabled: !paused })} WHERE organization_id = ${organizationId()} AND public_code = ${id} AND archived_at IS NULL RETURNING id`;
  if (!rows.length) throw new Error("Marca no encontrada");
  if (paused) await getSql()`UPDATE monitoring_jobs SET status = 'cancelled', completed_at = now() WHERE brand_id = ${rows[0].id} AND organization_id = ${organizationId()} AND status IN ('queued','retry')`;
  else await queueWatch(id);
}

export async function followWatch(id: string) {
  const sql = getSql();
  return sql.begin(async tx => {
    const [match] = await tx`SELECT * FROM matches WHERE organization_id = ${organizationId()} AND public_code = ${id} AND source = 'DeQuiénEs' FOR UPDATE`;
    if (!match) throw new Error("Coincidencia no encontrada");
    if (['En seguimiento', 'Convertida en caso'].includes(match.review_status)) return;
    await tx`UPDATE matches SET review_status = 'En seguimiento', owner_id = COALESCE(owner_id, ${actorId()}), updated_at = now() WHERE id = ${match.id}`;
    await tx`INSERT INTO match_reviews (organization_id, match_id, reviewer_id, decision, comparison_snapshot) VALUES (${organizationId()}, ${match.id}, ${actorId()}, 'En seguimiento', ${tx.json(match.evidence)})`;
    await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id) VALUES (${organizationId()}, ${actorId()}, 'match.followed', 'match', ${match.id})`;
  });
}
