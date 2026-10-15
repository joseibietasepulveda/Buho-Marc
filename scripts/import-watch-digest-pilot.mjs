// Dev-only import of an explicitly authorized local pilot. No inference and no email.
import { z } from 'zod';
import { getSql } from '../db/index.ts';
import { readDigestAgenda, loadDigestCandidate } from '../db/watch-digest-data.ts';
import { parseDigestDecisions } from '../lib/watch-digest-glm.ts';
import { DIGEST_MODEL, DIGEST_PROMPT_VERSION, DIGEST_MIN_SCORE, digestHash, shiftDigestDay } from '../lib/watch-digest.ts';
import { santiagoDay } from '../lib/source-schedule.ts';
if (!process.argv.includes('--apply') || process.env.RAILWAY_ENVIRONMENT_ID !== '9e2891f0-7281-4872-a992-2c48866a782d') throw new Error('Importación autorizada exclusivamente en Dev con --apply');
let raw='',bytes=0;for await (const chunk of process.stdin) { bytes+=chunk.length;if(bytes>20*1024*1024)throw new Error('Piloto demasiado extenso');raw+=chunk; }
const envelope=JSON.parse(raw), selection=envelope.selection, manifest=envelope.manifest;
z.uuid().parse(selection.runId);z.uuid().parse(selection.organizationId);
if(manifest.model!==DIGEST_MODEL || manifest.promptVersion!==DIGEST_PROMPT_VERSION || manifest.budget!==.10 || digestHash(selection)!==manifest.selectionHash)throw new Error('Modelo, muestra o autorización distintos');
const ids=selection.groups.flatMap(g=>g.candidates.map(c=>c.matchId));
if(ids.length>150 || ids.length!==manifest.crosses || new Set(ids).size!==ids.length || selection.groups.length>30 || selection.groups.some(g=>g.candidates.length>5))throw new Error('Fuera del piloto aprobado');
const valid=envelope.results.filter(r=>r.crosses);
const crosses=valid.flatMap(r=>{parseDigestDecisions(JSON.stringify({decisions:r.crosses.map(c=>c.decision)}),r.crosses.map(c=>c.id));return r.crosses;});
if(new Set(crosses.map(c=>c.matchId)).size!==crosses.length || crosses.some(c=>!ids.includes(c.matchId) || !(c.score>=DIGEST_MIN_SCORE&&c.score<=1)))throw new Error('Cruces fuera de la selección');
const spent=envelope.ledger.reduce((n,c)=>n+(c.result?.cost??c.reserve),0);if(!(spent>=0&&spent<=manifest.budget))throw new Error('Presupuesto de piloto inválido');
for(const image of envelope.images)if(digestHash(image.content)!==image.key)throw new Error('Imagen alterada');
const sql=getSql(),org=selection.organizationId,now=new Date();
try {
 const [organization]=await sql`SELECT name FROM organizations WHERE id=${org} AND status='active'`;if(!organization)throw new Error('Organización no disponible');
 const positives=[];for(const c of crosses.filter(c=>c.decision.show)){const current=await loadDigestCandidate(org,c.matchId,now);if(current){const {decision,...snapshot}=c;positives.push({...snapshot,candidate:current.candidate,reason:decision.reason,insufficient:decision.insufficient});}}
 const agenda=await readDigestAgenda(org,now),from=santiagoDay(now);
 const [source]=await sql`SELECT max(completed_at) AS reviewed FROM monitoring_jobs WHERE organization_id=${org} AND status='success' AND result IS NOT NULL`;
 const payload={runId:selection.runId,organizationName:organization.name,generatedAt:now.toISOString(),from,through:shiftDigestDay(from,13),crosses:positives,agenda,evaluated:crosses.length,available:ids.length,failures:ids.length-crosses.length,filteredLowScore:selection.belowGate,limited:crosses.length<ids.length,sourceReviewedAt:source.reviewed?.toISOString()??null};
 const result=await sql.begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(hashtext(${`digest-queue:${org}`}))`;
  const [existing]=await tx`SELECT id FROM watch_digest_runs WHERE id=${selection.runId} AND organization_id=${org}`;if(existing)return {reused:true,runId:existing.id};
  const rows=await tx`SELECT m.id,m.public_code,m.brand_id,m.evidence->'query'->>'applicationId' AS reference_id,m.evidence->'hit'->>'applicationId' AS candidate_id,watch_evidence_fingerprint(m.evidence) AS fingerprint FROM matches m WHERE m.organization_id=${org} AND m.id IN ${tx(ids)} AND m.source='DeQuiénEs'`;
  if(rows.length!==ids.length || crosses.some(c=>!rows.some(r=>r.id===c.matchId&&r.public_code===c.id&&r.brand_id===c.brandId&&r.reference_id===c.reference.applicationId&&r.candidate_id===c.candidate.applicationId)))throw new Error('Los cruces no corresponden a esta base/organización');
  const [classified]=await tx`SELECT count(*)::int AS n FROM watch_glm_decisions WHERE organization_id=${org} AND match_id IN ${tx(ids)}`;
  if(classified.n)throw new Error('Ya existen decisiones para esta muestra; no sustituirlas con otro piloto');
  await tx`INSERT INTO watch_digest_runs(id,organization_id,idempotency_key,trigger,status,candidate_ids,cursor,evaluated,available,filtered_low_score,failures,limited,payload,created_at) VALUES(${selection.runId},${org},${`pilot:${selection.runId}`},'manual','prepared',${tx.json(ids)},${ids.length},${crosses.length},${ids.length},${selection.belowGate},${ids.length-crosses.length},${crosses.length<ids.length},${tx.json(payload)},${selection.at})`;
  for(const c of crosses){const {decision,...snapshot}=c;const fingerprint=rows.find(r=>r.id===c.matchId).fingerprint;await tx`INSERT INTO watch_glm_decisions(organization_id,match_id,run_id,model,prompt_version,decision,cross_snapshot,evidence_fingerprint) VALUES(${org},${c.matchId},${selection.runId},${manifest.model},${manifest.promptVersion},${tx.json(decision)},${tx.json(snapshot)},${fingerprint}) ON CONFLICT DO NOTHING`;}
  for(const call of envelope.ledger){z.uuid().parse(call.id);await tx`INSERT INTO watch_glm_calls(id,organization_id,run_id,request_hash,reserved_usd,cost_usd,result,started_at,completed_at) VALUES(${call.id},${org},${selection.runId},${digestHash({pilotPhysicalId:call.id,originalHash:call.requestHash})},${call.reserve},${call.result?.cost??null},${tx.json({...call.result,pilotOriginalRequestHash:call.requestHash})},${call.startedAt},${call.completedAt??null})`;}
  for(const i of envelope.images)await tx`INSERT INTO watch_digest_images(organization_id,key,content) VALUES(${org},${i.key},${i.content}) ON CONFLICT DO NOTHING`;
  await tx`INSERT INTO audit_events(organization_id,action,entity_type,entity_id,after_data) VALUES(${org},'watch_digest.pilot_imported','watch_digest',${selection.runId},${tx.json({evaluated:crosses.length,selected:ids.length,positives:positives.length,chargedOrReserved:spent,model:manifest.model,promptVersion:manifest.promptVersion,noEmailSent:true})})`;
  return {reused:false,runId:selection.runId,evaluated:crosses.length,positives:positives.length,agenda:agenda.length,chargedOrReserved:spent,noEmailSent:true};
 });console.info(JSON.stringify(result));
} finally {await sql.end();}
