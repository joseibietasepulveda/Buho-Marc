import { getSql } from './index';
import { caseAgenda, registrationAgenda } from '../lib/agenda';
import { digestAgenda, eligibleDigestCandidate, selectDigestCandidates, type DigestCandidate, type DigestImage } from '../lib/watch-digest';
import { applyVerifiedDecision } from '../lib/verified-decisions';
import { isRealSource, reprojectInapiRecord } from '../lib/inapi-provider';
import { updatedApplication } from './source';
import { applyRegistrationEvidence } from '../lib/registration-evidence';
import type { RegistrationApplication } from '../lib/registration-data';
import type { SourceRecord } from '../lib/source-contract';
import type { SimilarityHit, SimilarityMark } from '../lib/similarity-contract';
import type { CaseTask, RegistrationTask } from '../lib/case-tasks';
import { santiagoDay } from '../lib/source-schedule';

type Evidence = { query?: SimilarityMark; hit?: SimilarityHit; fetchedAt?: string };
export async function pendingDigestCandidates(org: string, limit: number, now: Date) {
  // Only routing metadata is loaded for the whole stock; full coverage/images are read per batch.
  const rows = await getSql()`SELECT m.id, m.public_code, m.brand_id, m.total_score, CASE WHEN jsonb_typeof(m.evidence->'hit'->'score')='number' THEN (m.evidence->'hit'->>'score')::float8 ELSE m.total_score/100.0 END AS score, m.review_status,
    m.evidence->'query'->>'applicationId' AS reference_id, m.evidence->'query'->>'status' AS reference_status,
    jsonb_build_object('applicationId',m.evidence->'hit'->>'applicationId','status',m.evidence->'hit'->>'status',
      'publishedAt',m.evidence->'hit'->>'publishedAt','registeredAt',m.evidence->'hit'->>'registeredAt',
      'sourceStatus',m.evidence->'hit'->'sourceStatus','sourceEvidence',m.evidence->'hit'->'sourceEvidence',
      'legalDeadline',m.legal_deadline::text,'statusCode',m.evidence->'hit'->'statusCode','officialDecision',m.evidence->'hit'->'officialDecision','history',m.evidence->'hit'->'history') AS hit
    FROM matches m JOIN brands b ON b.id=m.brand_id AND b.organization_id=m.organization_id
    WHERE m.organization_id=${org} AND m.source='DeQuiénEs' AND b.archived_at IS NULL AND b.status <> 'Pausada'
      AND b.monitoring_config->>'provider'='inapi' AND b.monitoring_config->>'monitoringEnabled'='true'
      AND m.evidence ? 'query' AND m.evidence ? 'hit'
      AND NOT EXISTS(SELECT 1 FROM watch_glm_decisions d WHERE d.organization_id=m.organization_id AND d.match_id=m.id)`;
  const metadata = rows.filter(r => r.reference_id && r.hit?.applicationId).map(r => ({
    id: r.public_code, matchId: r.id, brandId: r.brand_id, score: r.score,
    reference: { applicationId: r.reference_id, status: r.reference_status ?? '' } as SimilarityMark,
    candidate: applyVerifiedDecision({ ...r.hit, history: r.hit.history ?? [], reviewStatus: r.review_status } as SimilarityHit), fetchedAt: null,
  }));
  return selectDigestCandidates(metadata, limit, now);
}
export async function loadDigestCandidate(org: string, match: string, now: Date) {
  const [r] = await getSql()`SELECT m.*, b.monitoring_config FROM matches m JOIN brands b ON b.id=m.brand_id AND b.organization_id=m.organization_id
    WHERE m.id=${match} AND m.organization_id=${org} AND b.archived_at IS NULL AND b.status <> 'Pausada'
      AND b.monitoring_config->>'monitoringEnabled'='true' AND b.monitoring_config->>'provider'='inapi'`;
  const evidence = r?.evidence as Evidence | undefined;
  if (!evidence?.query || !evidence.hit) return null;
  const cross: DigestCandidate = { id: r.public_code, matchId: r.id, brandId: r.brand_id, score: Number.isFinite(evidence.hit.score) ? evidence.hit.score : r.total_score / 100, reference: evidence.query,
    candidate: applyVerifiedDecision({ ...evidence.hit, reviewStatus: r.review_status, legalDeadline: r.legal_deadline ? String(r.legal_deadline).slice(0,10) : null }), fetchedAt: evidence.fetchedAt ?? null };
  return eligibleDigestCandidate(cross, santiagoDay(now)) ? cross : null;
}
export async function readDigestAgenda(org: string, now: Date) {
  const sql = getSql();
  const [cases, tasks, registrations, regTasks] = await Promise.all([
    sql`SELECT c.public_code,c.title,c.description,c.stage,c.next_deadline::text,c.proceeding,COALESCE(b.name,'Sin marca') AS brand_name,COALESCE(u.name,'Sin asignar') AS owner
      FROM cases c LEFT JOIN brands b ON b.id=c.brand_id AND b.organization_id=c.organization_id LEFT JOIN users u ON u.id=c.owner_id
      WHERE c.organization_id=${org} AND c.status='active' AND (${!isRealSource()} OR b.archived_at IS NULL)`,
    sql`SELECT t.id,t.title,t.status,t.due_at,t.assignee_id,c.public_code FROM case_tasks t JOIN cases c ON c.id=t.case_id AND c.organization_id=t.organization_id WHERE t.organization_id=${org} AND c.status='active' AND t.status='pending'`,
    sql`SELECT a.data,r.data AS source_data FROM registration_applications a LEFT JOIN source_snapshots s ON s.entity_id=a.id AND s.entity_type='application' AND s.organization_id=a.organization_id LEFT JOIN source_records r ON r.id=s.source_id WHERE a.organization_id=${org} AND COALESCE(a.data->>'portfolioRole','own') <> 'third-party'`,
    sql`SELECT t.id,t.title,t.status,t.due_date::text,t.assignee_id,a.public_code FROM registration_tasks t JOIN registration_applications a ON a.id=t.application_id AND a.organization_id=t.organization_id WHERE t.organization_id=${org} AND t.status='pending'`,
  ]);
  const applications = registrations.map(r => {
    const a = r.data as RegistrationApplication, source = r.source_data as SourceRecord | undefined;
    return a.provider === 'inapi' && source?.provider === 'inapi' ? updatedApplication(a, reprojectInapiRecord(source), a.recentEvent) : applyRegistrationEvidence(a);
  }).filter(a => !isRealSource() || a.provider === 'inapi');
  const caseEvents = caseAgenda(cases.map(c => ({ id: c.public_code, title: c.title, brand: c.proceeding?.basisName ?? c.brand_name,
    stage: c.stage, deadline: c.next_deadline ?? '', deadlineDescription: String(c.description ?? '').match(/Plazo:\s*(.+)/)?.[1] ?? '', owner: c.owner,
    tasks: tasks.filter(t => t.public_code === c.public_code).map(t => ({id:t.id,title:t.title,status:t.status,dueDate:t.due_at ? new Date(t.due_at).toISOString().slice(0,10) : null,assigneeId:t.assignee_id} as CaseTask)) })));
  const registrationTasks = regTasks.map(t => ({id:t.id,title:t.title,status:t.status,dueDate:t.due_date,assigneeId:t.assignee_id,applicationId:t.public_code} as RegistrationTask));
  return digestAgenda([...caseEvents, ...registrationAgenda(applications, registrationTasks, santiagoDay(now))], now);
}
export async function storeDigestImages(org: string, images: DigestImage[]) {
  for (const i of images) await getSql()`INSERT INTO watch_digest_images(organization_id,key,content) VALUES(${org},${i.key},${i.content}) ON CONFLICT DO NOTHING`;
}
export async function readDigestImages(org: string, keys: string[]) {
  if (!keys.length) return [];
  const rows = await getSql()`SELECT key,content FROM watch_digest_images WHERE organization_id=${org} AND key IN ${getSql()(keys)}`;
  return rows.map(r => ({ key: r.key, content: r.content } as DigestImage));
}
