import { randomUUID } from 'node:crypto';
import { getSql } from './index';
import { pendingDigestCandidates, loadDigestCandidate, readDigestAgenda, readDigestImages, storeDigestImages } from './watch-digest-data';
import { DIGEST_MANUAL_LIMIT, DIGEST_MODEL, DIGEST_PROMPT_VERSION, digestConfig, digestConfigurationProblems, latestDigestSlot, shiftDigestDay, type DigestPayload, type DigestCross, type DigestCandidate } from '../lib/watch-digest';
import { santiagoDay } from '../lib/source-schedule';
import { evaluateDigestGlm, GlmProviderError, type CallResult, type GlmCallAccounting, type GlmInputImage } from '../lib/watch-digest-glm';
import { digestMarkImage } from '../lib/watch-digest-images';
import { digestEmail } from '../lib/watch-digest-email';
import { sendResendEmail, ResendDeliveryError, type ResendEmail } from '../lib/resend-email';

type Run = { id: string; organization_id: string; organization_name: string; status: string; candidate_ids: string[]; cursor: number; evaluated: number; available: number; failures: number; limited: boolean; lease_token: string; email: ResendEmail | null; requested_by:string|null; send_attempts: number; first_send_at: Date | null; delivery_uncertain: boolean; evaluation_input: {batch: DigestCandidate[];images:GlmInputImage[];advance:number} | null };
export class DigestBudgetError extends Error { constructor() { super('Se alcanzó el presupuesto de vigilancia; los cruces restantes siguen pendientes'); } }
export async function digestOrganizations() {
  return getSql()`SELECT o.id,o.name,o.slug FROM organizations o WHERE o.status='active' AND (EXISTS(SELECT 1 FROM brands b WHERE b.organization_id=o.id AND b.archived_at IS NULL AND b.monitoring_config->>'provider'='inapi') OR EXISTS(SELECT 1 FROM registration_applications a WHERE a.organization_id=o.id AND a.data->>'provider'='inapi' AND COALESCE(a.data->>'portfolioRole','own') <> 'third-party')) ORDER BY o.name`;
}
export async function enqueueDigest(org: string, trigger: 'manual' | 'scheduled', key: string, actor?: string, now = new Date()) {
  const config = digestConfig();
  const problems = digestConfigurationProblems(config);
  if (problems.length) throw new Error(`Falta configurar: ${problems.join(', ')}`);
  return getSql().begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`digest-queue:${org}`}))`;
    const [organization] = await tx`SELECT id FROM organizations WHERE id=${org} AND status='active'`;
    if (!organization) throw new Error('Organización no disponible');
    const [duplicate] = await tx`SELECT id,status FROM watch_digest_runs WHERE organization_id=${org} AND (idempotency_key=${key} OR status IN ('queued','running','retry','sending')) ORDER BY created_at DESC LIMIT 1`;
    if (duplicate) return { id: duplicate.id as string, reused: true };
    const { available, selected, filteredLowScore } = await pendingDigestCandidates(org, trigger === 'manual' ? DIGEST_MANUAL_LIMIT : 10000, now);
    // Selection is fair across marks; physical calls share one reference and at most five candidates.
    const brandOrder = [...new Set(selected.map(c => c.brandId))];
    const ids = brandOrder.flatMap(brand => selected.filter(c => c.brandId === brand).map(c => c.matchId));
    const [row] = await tx`INSERT INTO watch_digest_runs(organization_id,idempotency_key,trigger,requested_by,candidate_ids,available,filtered_low_score,limited)
      VALUES(${org},${key},${trigger},${actor ?? null},${tx.json(ids)},${available},${filteredLowScore},${selected.length < available}) RETURNING id`;
    // Recover positive decisions if preparing a previous email failed before its outbox existed.
    await tx`UPDATE watch_glm_decisions d SET run_id=${row.id} WHERE d.organization_id=${org} AND d.notified_at IS NULL AND d.decision->>'show'='true'
      AND EXISTS(SELECT 1 FROM watch_digest_runs old WHERE old.id=d.run_id AND old.organization_id=d.organization_id AND old.status IN ('failed','prepared') AND old.email IS NULL)`;
    return { id: row.id as string, reused: false };
  });
}
export async function enqueueScheduledDigests(now = new Date()) {
  if (!digestConfig().enabled || digestConfigurationProblems().length) return 0;
  const slot = latestDigestSlot(now); let count = 0;
  for (const o of await digestOrganizations()) {
    const result = await enqueueDigest(o.id, 'scheduled', `weekly:${slot.day}`, undefined, now);
    if (!result.reused) count++;
  }
  return count;
}
export function digestAccounting(org: string, run: string, now = new Date(),userId:string|null=null): GlmCallAccounting {
  return {
    telemetryContext:{organizationId:org,userId},
    async lookup(hash) {
      const [r] = await getSql()`SELECT result FROM watch_glm_calls WHERE organization_id=${org} AND run_id=${run} AND request_hash=${hash}`;
      return r ? (r.result as CallResult | null) ?? { error: 'Intento interrumpido; cargo sin confirmar' } : null;
    },
    async reserve(amount, hash) {
      return getSql().begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(hashtext('watch-digest-global-budget'))`;
        const config = digestConfig();
        const month = santiagoDay(now).slice(0,7) + '-01';
        const [totals] = await tx`SELECT COALESCE(sum(COALESCE(cost_usd,reserved_usd)) FILTER(WHERE started_at >= (${month}::date::timestamp AT TIME ZONE 'America/Santiago')),0)::float8 AS monthly,
          COALESCE(sum(COALESCE(cost_usd,reserved_usd)) FILTER(WHERE run_id=${run}),0)::float8 AS running FROM watch_glm_calls`;
        if (!Number.isFinite(amount) || amount <= 0 || totals.monthly + amount > config.monthlyBudget || totals.running + amount > config.runBudget) throw new DigestBudgetError();
        const [call] = await tx`INSERT INTO watch_glm_calls(organization_id,run_id,request_hash,reserved_usd) VALUES(${org},${run},${hash},${amount}) RETURNING id`;
        return call.id as string;
      });
    },
    async record(id, result) {
      await getSql()`UPDATE watch_glm_calls SET result=${getSql().json(JSON.parse(JSON.stringify(result)))},cost_usd=${result.cost ?? null},completed_at=now() WHERE id=${id} AND organization_id=${org} AND run_id=${run}`;
    },
  };
}
async function claimDigest() {
  return getSql().begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('watch-digest-worker'))`;
    // A single global consumer bounds provider concurrency; leases recover a terminated server.
    const [active] = await tx`SELECT id FROM watch_digest_runs WHERE lease_until > now() AND status IN ('running','sending') LIMIT 1`;
    if (active) return null;
    const [row] = await tx`SELECT r.*,o.name AS organization_name FROM watch_digest_runs r JOIN organizations o ON o.id=r.organization_id
      WHERE o.status='active' AND r.status IN ('queued','running','retry','sending') AND r.available_at <= now() AND (r.lease_until IS NULL OR r.lease_until < now()) ORDER BY r.created_at LIMIT 1 FOR UPDATE OF r SKIP LOCKED`;
    if (!row) return null;
    const token = randomUUID();
    await tx`UPDATE watch_digest_runs SET lease_token=${token},lease_until=now()+interval '5 minutes',status=${row.email ? 'sending' : 'running'},updated_at=now() WHERE id=${row.id}`;
    return { ...row, lease_token: token } as Run;
  });
}
async function release(run: Run, status: string, error: string | null = null, delay = 0) {
  await getSql()`UPDATE watch_digest_runs SET status=${status},error=${error},lease_token=NULL,lease_until=NULL,available_at=now()+${delay}*interval '1 second',updated_at=now() WHERE id=${run.id} AND lease_token=${run.lease_token}`;
}
async function freezeDigest(run: Run, now: Date) {
  const sql = getSql(), org = run.organization_id;
  const [state] = await sql`SELECT evaluated,available,failures,limited,filtered_low_score FROM watch_digest_runs WHERE id=${run.id} AND organization_id=${org}`;
  const positives = await sql`SELECT cross_snapshot FROM watch_glm_decisions WHERE organization_id=${org} AND run_id=${run.id} AND decision->>'show'='true' AND notified_at IS NULL ORDER BY (cross_snapshot->>'score')::float8 DESC,created_at`;
  const crosses: DigestCross[] = [];
  for (const row of positives) {
    const cross = row.cross_snapshot as DigestCross;
    // State/review may have changed during processing; never email an already closed or dismissed alert.
    const current = await loadDigestCandidate(org, cross.matchId, now);
    if (current) crosses.push({ ...cross, candidate: current.candidate });
  }
  const [source] = await sql`SELECT max(completed_at) AS reviewed FROM monitoring_jobs WHERE organization_id=${org} AND status='success' AND result IS NOT NULL`;
  const from = santiagoDay(now);
  const payload: DigestPayload = { runId:run.id,organizationName:run.organization_name,generatedAt:now.toISOString(),from,through:shiftDigestDay(from,13),crosses,
    agenda:await readDigestAgenda(org,now),evaluated:state.evaluated,available:state.available,failures:state.failures,limited:state.limited,filteredLowScore:state.filtered_low_score,
    sourceReviewedAt:source.reviewed ? new Date(source.reviewed).toISOString() : null };
  const keys = [...new Set(crosses.slice(0,8).flatMap(c => [c.referenceImage,c.candidateImage]).filter((k): k is string => !!k))];
  const config = digestConfig();
  const email: ResendEmail = { from:config.from,to:[config.to],reply_to:config.replyTo,...digestEmail(payload,config.origin,await readDigestImages(org,keys)) };
  const [saved] = await sql`UPDATE watch_digest_runs SET payload=${sql.json(JSON.parse(JSON.stringify(payload)))},email=${sql.json(email)},updated_at=now() WHERE id=${run.id} AND lease_token=${run.lease_token} RETURNING id,email`;
  if (!saved) throw new Error('Se perdió el turno de procesamiento');
  run.email = saved.email as ResendEmail;
}
async function deliverDigest(run: Run, now: Date, fetcher: typeof fetch) {
  // Resend keeps idempotency for 24 h; an unknown acceptance is never retried outside it.
  if (run.delivery_uncertain && run.first_send_at && now.getTime()-new Date(run.first_send_at).getTime() >= 23*3600000) {
    await release(run,'uncertain','Confirmar en Resend: el correo puede haber sido aceptado. No se reenviará automáticamente.'); return;
  }
  const [sending] = await getSql()`UPDATE watch_digest_runs SET status='sending',send_attempts=send_attempts+1,first_send_at=COALESCE(first_send_at,now()),delivery_uncertain=true,updated_at=now()
    WHERE id=${run.id} AND lease_token=${run.lease_token} RETURNING send_attempts`;
  if (!sending) return;
  try {
    const id = await sendResendEmail(run.email!,digestConfig().resendKey,`watch-digest/${run.id}`,fetcher);
    await getSql().begin(async tx => {
      const [accepted] = await tx`UPDATE watch_digest_runs SET status='sent',resend_id=${id},sent_at=now(),error=NULL,delivery_uncertain=false,lease_until=NULL,lease_token=NULL,updated_at=now() WHERE id=${run.id} AND lease_token=${run.lease_token} RETURNING id`;
      if (accepted) await tx`UPDATE watch_glm_decisions SET notified_at=now() WHERE organization_id=${run.organization_id} AND run_id=${run.id} AND decision->>'show'='true'`;
    });
  } catch (error) {
    const uncertain = error instanceof ResendDeliveryError ? error.uncertain : true;
    await getSql()`UPDATE watch_digest_runs SET delivery_uncertain=${run.delivery_uncertain || uncertain} WHERE id=${run.id} AND lease_token=${run.lease_token}`;
    await release(run,sending.send_attempts < 3 ? 'retry' : 'failed','Resend no confirmó el envío; se conservó el correo para reintentar sin evaluar otra vez.',60*sending.send_attempts);
  }
}
export async function processDigestJob(options: { now?: Date; fetcher?: typeof fetch; imageLoader?: typeof digestMarkImage } = {}) {
  if (digestConfigurationProblems().length) return { skipped:true, reason:'configuration' };
  const now = options.now ?? new Date(), fetcher = options.fetcher ?? fetch;
  const run = await claimDigest();
  if (!run) return { idle:true };
  let batchAdvance = 0;
  try {
    if (!run.email && run.cursor < run.candidate_ids.length) {
      let batch: DigestCandidate[], images: GlmInputImage[], advance: number;
      if (run.evaluation_input) ({batch,images,advance}=run.evaluation_input);
      else {
        batch=[];advance=0;
        for (const id of run.candidate_ids.slice(run.cursor,run.cursor+5)) {
          const cross = await loadDigestCandidate(run.organization_id,id,now);
          if (cross && batch.length && cross.brandId !== batch[0].brandId) break;
          advance++;
          if (cross) batch.push(cross);
        }
        images=[];
        if (batch.length) {
          const marks = [...new Map([batch[0].reference,...batch.map(c => c.candidate)].map(m => [m.applicationId,m])).values()];
          const loader = options.imageLoader ?? digestMarkImage;
          const results = await Promise.all(marks.map(async mark => {
            try { const image = await loader(mark,run.organization_id,fetcher); return image ? { ...image,markId:mark.applicationId } : null; }
            catch { return null; }
          }));
          images = results.filter((i): i is NonNullable<typeof i> => i !== null);
          await storeDigestImages(run.organization_id,images);
          // Freeze inputs before the paid call: recovery uses the identical request and ledger.
          const input = {batch,images,advance};
          const [saved] = await getSql()`UPDATE watch_digest_runs SET evaluation_input=${getSql().json(JSON.parse(JSON.stringify(input)))} WHERE id=${run.id} AND lease_token=${run.lease_token} RETURNING id`;
          if (!saved) throw new Error('Se perdió el turno de procesamiento');
        }
      }
      batchAdvance = advance;
      if (batch.length) {
        const decisions = await evaluateDigestGlm(batch,images,digestConfig().glmKey,digestAccounting(run.organization_id,run.id,now,run.requested_by),fetcher);
        await getSql().begin(async tx => {
          const [lease] = await tx`SELECT id FROM watch_digest_runs WHERE id=${run.id} AND lease_token=${run.lease_token} FOR UPDATE`;
          if (!lease) throw new Error('Se perdió el turno de procesamiento');
          let inserted = 0;
          for (let n=0;n<batch.length;n++) {
            const cross: DigestCross = { ...batch[n],reason:decisions[n].reason,insufficient:decisions[n].insufficient,referenceImage:images.find(i => i.markId===batch[n].reference.applicationId)?.key,candidateImage:images.find(i => i.markId===batch[n].candidate.applicationId)?.key };
            const rows = await tx`INSERT INTO watch_glm_decisions(organization_id,match_id,run_id,model,prompt_version,decision,cross_snapshot)
              VALUES(${run.organization_id},${cross.matchId},${run.id},${DIGEST_MODEL},${DIGEST_PROMPT_VERSION},${tx.json(decisions[n])},${tx.json(JSON.parse(JSON.stringify(cross)))}) ON CONFLICT DO NOTHING RETURNING id`;
            inserted += rows.length;
          }
          await tx`UPDATE watch_digest_runs SET evaluated=evaluated+${inserted},cursor=cursor+${advance},evaluation_input=NULL,status='queued',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${run.id}`;
        });
      } else {
        await getSql()`UPDATE watch_digest_runs SET evaluation_input=NULL,cursor=cursor+${Math.max(1,advance)} WHERE id=${run.id} AND lease_token=${run.lease_token}`;
        await release(run,'queued');
      }
      return { progress:true,runId:run.id };
    }
    if (!run.email) await freezeDigest(run,now);
    await deliverDigest(run,now,fetcher);
    return { progress:true,runId:run.id };
  } catch (error) {
    if (error instanceof DigestBudgetError) {
      await getSql()`UPDATE watch_digest_runs SET evaluation_input=NULL,cursor=jsonb_array_length(candidate_ids),limited=true WHERE id=${run.id} AND lease_token=${run.lease_token}`;
      await release(run,'queued',error.message);
    } else if (error instanceof GlmProviderError) {
      await release(run,'failed','GLM no está disponible. Se conservan las decisiones anteriores y los cruces pendientes; revisa la conexión o la clave antes de iniciar otra ejecución.');
    } else if (!run.email) {
      // Keep those matches without a canonical decision; a future digest can retry them.
      const remaining = run.candidate_ids.length-run.cursor;
      if (remaining > 0) {
        const advance = Math.max(1, Math.min(batchAdvance || 1,remaining));
        await getSql()`UPDATE watch_digest_runs SET evaluation_input=NULL,cursor=cursor+${advance},failures=failures+${advance} WHERE id=${run.id} AND lease_token=${run.lease_token}`;
        await release(run,'queued','Evaluación incompleta; esos cruces continúan pendientes.');
      } else await release(run,'failed','No se pudo preparar la agenda o el correo. El próximo resumen recuperará las decisiones guardadas.');
    } else await release(run,'failed','No se pudo completar el envío. Se conservó el resumen.');
    return { progress:true,runId:run.id };
  }
}
export async function retryDigestEmail(org: string, id: string, now = new Date()) {
  return getSql().begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`digest-queue:${org}`}))`;
    const [r] = await tx`SELECT status,email,first_send_at,delivery_uncertain FROM watch_digest_runs WHERE organization_id=${org} AND id=${id} FOR UPDATE`;
    if (!r?.email || !['failed','uncertain'].includes(r.status)) throw new Error('Este resumen no requiere reenvío');
    if (r.delivery_uncertain && r.first_send_at && now.getTime()-new Date(r.first_send_at).getTime() >= 23*3600000) throw new Error('Antes de reenviar, confirma en Resend si el correo fue aceptado; se bloqueó un posible duplicado');
    const [active] = await tx`SELECT id FROM watch_digest_runs WHERE organization_id=${org} AND status IN ('queued','running','retry','sending')`;
    if (active) throw new Error('Ya hay un resumen en curso');
    await tx`UPDATE watch_digest_runs SET status='retry',send_attempts=0,first_send_at=${r.delivery_uncertain ? r.first_send_at : null},available_at=now(),lease_token=NULL,lease_until=NULL,error=NULL,updated_at=now() WHERE id=${id} AND organization_id=${org}`;
    return { id };
  });
}
export async function digestRun(org: string, id?: string) {
  const rows = id ? await getSql()`SELECT id,status,payload,created_at,sent_at FROM watch_digest_runs WHERE organization_id=${org} AND id=${id}` : await getSql()`SELECT id,status,payload,created_at,sent_at FROM watch_digest_runs WHERE organization_id=${org} AND payload IS NOT NULL ORDER BY created_at DESC LIMIT 1`;
  return rows[0] ?? null;
}
export async function digestAdminRuns(org: string) {
  return getSql()`SELECT r.id,r.status,r.trigger,r.created_at,r.sent_at,r.evaluated,r.available,r.failures,r.limited,r.filtered_low_score,jsonb_array_length(r.candidate_ids) AS selected,r.cursor,r.error,r.resend_id,r.delivery_uncertain,(r.payload IS NOT NULL) AS has_payload,(r.email IS NOT NULL) AS has_email,
    COALESCE(sum(c.cost_usd),0)::float8 AS confirmed_cost,COALESCE(sum(c.reserved_usd) FILTER(WHERE c.cost_usd IS NULL),0)::float8 AS unconfirmed_reserve
    FROM watch_digest_runs r LEFT JOIN watch_glm_calls c ON c.run_id=r.id AND c.organization_id=r.organization_id WHERE r.organization_id=${org}
    GROUP BY r.id ORDER BY r.created_at DESC LIMIT 15`;
}
