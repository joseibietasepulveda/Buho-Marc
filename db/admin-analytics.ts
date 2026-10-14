import { createHash, randomUUID } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import type { AdminDashboardReport, AdminDashboardResponse, AnalyticsScope, AnalyticsMetric, AnalyticsUserRow, AnalyticsProviderRow, AnalyticsApiCall, AnalyticsCostRule, AnalyticsDeadlineRow } from '../lib/admin-analytics';
import { readDigestAgenda } from './watch-digest-data';
import { analyticsLabel } from '../lib/admin-analytics';

type AnalyticsGlobal = typeof globalThis & { buhoAnalyticsReadSql?: Sql };
/** Analytics never competes for the application's ten normal connections. */
export function analyticsSql() {
 const global = globalThis as AnalyticsGlobal;
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
 return global.buhoAnalyticsReadSql ??= postgres(process.env.DATABASE_URL,{max:1,prepare:false,idle_timeout:20,connect_timeout:5,connection:{application_name:'buho-admin-analytics',statement_timeout:8000,lock_timeout:1000}});
}
const number = (value: unknown) => Number(value ?? 0);
const iso = (value: unknown) => value ? new Date(value as string | Date).toISOString() : null;
const metric = (key:string,label:string,value:number|null,unit:AnalyticsMetric['unit']='count',note?:string,availability:AnalyticsMetric['availability']='measured'):AnalyticsMetric => ({key,label,value,unit,availability,note});
const percentage = (part:number,total:number) => total ? part/total*100 : null;
export const analyticsScopeKey = (scope:AnalyticsScope) => createHash('sha256').update(JSON.stringify(scope)).digest('hex');

export function parseAnalyticsScope(input:{from?:string|null;to?:string|null;organizationId?:string|null;userId?:string|null},now=new Date()):AnalyticsScope {
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const defaultStart=new Date(`${today}T12:00:00Z`);defaultStart.setUTCDate(defaultStart.getUTCDate()-29);
 const from=input.from ?? defaultStart.toISOString().slice(0,10),to=input.to ?? today;
 for(const date of [from,to]) if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date) throw new Error('Fechas inválidas');
 const days=(Date.parse(to)-Date.parse(from))/86400000;
 if(days<0 || days>365) throw new Error('El rango debe tener entre 1 y 366 días');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if([input.organizationId,input.userId].some(id=>id&&!uuid.test(id))) throw new Error('Filtro inválido');
 return {from,to,organizationId:input.organizationId||null,userId:input.userId||null};
}
export async function analyticsDirectory() {
 const sql=analyticsSql();
 const organizations=await sql`SELECT id,name FROM organizations WHERE status='active' ORDER BY name LIMIT 500`;
 const rows=await sql`SELECT u.id,u.name,m.organization_id,o.name AS organization,m.role FROM organization_members m JOIN users u ON u.id=m.user_id JOIN organizations o ON o.id=m.organization_id WHERE o.status='active' ORDER BY o.name,u.name LIMIT 5000`;
 return {organizations:organizations.map(o=>({id:String(o.id),name:String(o.name)})),users:rows.map(u=>({id:String(u.id),name:String(u.name),organizationId:String(u.organization_id),organization:String(u.organization),role:String(u.role)}))};
}
export async function requestAnalyticsSnapshot(scope:AnalyticsScope,force=false) {
 const sql=analyticsSql(),key=analyticsScopeKey(scope);
 await sql`INSERT INTO analytics_snapshots(scope_key,filters) VALUES(${key},${sql.json(scope)}) ON CONFLICT(scope_key) DO UPDATE
 SET status=CASE WHEN analytics_snapshots.status IN ('queued','running') AND COALESCE(analytics_snapshots.lease_until,now()+interval '1 minute') > now() THEN analytics_snapshots.status ELSE 'queued' END,
 requested_at=now(),error=NULL WHERE ${force} OR analytics_snapshots.generated_at IS NULL AND analytics_snapshots.requested_at < now()-interval '1 minute' OR analytics_snapshots.generated_at < now()-interval '5 minutes'`;
 const [row]=await sql`SELECT status,report,generated_at,error FROM analytics_snapshots WHERE scope_key=${key}`;
 return row;
}
export async function readAdminDashboard(scope:AnalyticsScope,force=false):Promise<AdminDashboardResponse> {
 const directory=await analyticsDirectory();
 if(scope.organizationId&&!directory.organizations.some(o=>o.id===scope.organizationId)) throw new Error('Organización no disponible');
 if(scope.userId&&!directory.users.some(u=>u.id===scope.userId&&(!scope.organizationId||u.organizationId===scope.organizationId))) throw new Error('Usuario no disponible');
 const row=await requestAnalyticsSnapshot(scope,force);
 const [start]=await analyticsSql()`SELECT min(occurred_at) AS at FROM analytics_events`;
 return {scope,...directory,report:row.report as AdminDashboardReport|null,snapshot:{status:row.status,generatedAt:iso(row.generated_at),stale:!row.generated_at||Date.now()-new Date(row.generated_at).getTime()>300000,error:row.error?String(row.error):null},telemetrySince:iso(start.at)};
}

export async function processAnalyticsSnapshot(now=new Date()) {
 const sql=analyticsSql();
 const claimed=await sql.begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(hashtext('buho-analytics-worker'))`;
  const [active]=await tx`SELECT scope_key FROM analytics_snapshots WHERE status='running' AND lease_until>now() LIMIT 1`;
  if(active) return null;
  const [row]=await tx`SELECT scope_key,filters FROM analytics_snapshots WHERE status='queued' OR status='running' AND lease_until<now() ORDER BY requested_at LIMIT 1 FOR UPDATE SKIP LOCKED`;
  if(!row)return null;
  await tx`UPDATE analytics_snapshots SET status='running',lease_until=now()+interval '2 minutes',error=NULL WHERE scope_key=${row.scope_key}`;
  return row;
 });
 if(!claimed)return {processed:false};
 try {
  const scope=parseAnalyticsScope(claimed.filters as AnalyticsScope,now);
  const report=await buildAdminDashboard(scope,now);
  await sql`UPDATE analytics_snapshots SET report=${sql.json(JSON.parse(JSON.stringify(report)))},generated_at=${now},status='ready',lease_until=NULL,error=NULL WHERE scope_key=${claimed.scope_key}`;
  // Bounded retention applies only to cached reports, never source business records.
  await sql`DELETE FROM analytics_snapshots WHERE requested_at<now()-interval '14 days' AND status <> 'running'`;
  return {processed:true};
 } catch {
  await sql`UPDATE analytics_snapshots SET status='failed',lease_until=NULL,error='No se pudo actualizar. Reintenta; los procesos de la plataforma siguen funcionando.' WHERE scope_key=${claimed.scope_key}`;
  return {processed:true,failed:true};
 }
}

function normalizedCalls(sql:Sql,scope:AnalyticsScope) {
 const org=scope.organizationId,user=scope.userId;
 // Reservations/attempts are distinct from comparisons. Native ledgers are the
 // authoritative money record; new transport telemetry only supplements timings.
 return sql`WITH base_calls AS (
 SELECT w.id::text AS id,w.organization_id,r.requested_by AS user_id,'openrouter'::text AS provider,'watch_glm'::text AS operation,
 COALESCE(t.model,'z-ai/glm-5.3-flash') AS model,w.started_at,t.duration_ms,t.status_code,
 COALESCE(t.outcome,CASE WHEN w.result->>'error' IS NOT NULL THEN 'error' WHEN w.result->>'providerId' IS NOT NULL THEN 'success' ELSE 'unknown' END) AS outcome,
 w.cost_usd::float8 AS cost_usd,CASE WHEN w.cost_usd IS NULL THEN w.reserved_usd::float8 ELSE 0 END AS reserved_usd,
 CASE WHEN jsonb_typeof(w.result->'usage'->'prompt_tokens')='number' THEN (w.result->'usage'->>'prompt_tokens')::bigint END AS input_tokens,
 CASE WHEN jsonb_typeof(w.result->'usage'->'completion_tokens')='number' THEN (w.result->'usage'->>'completion_tokens')::bigint END AS output_tokens,'watch_glm_calls'::text AS source
 FROM watch_glm_calls w JOIN watch_digest_runs r ON r.id=w.run_id AND r.organization_id=w.organization_id
 LEFT JOIN LATERAL(SELECT a.model,a.duration_ms,a.status_code,a.outcome FROM analytics_api_calls a WHERE a.source_ref='watch:'||w.id::text ORDER BY a.started_at DESC LIMIT 1)t ON true
 WHERE (${org}::uuid IS NULL OR w.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR r.requested_by=${user}::uuid)
 AND w.started_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND w.started_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago')
 UNION ALL
 SELECT f.id::text||':'||a.ordinality,f.organization_id,f.user_id,'openrouter','feasibility',f.model,f.created_at,
 t.duration_ms,t.status_code,COALESCE(t.outcome,CASE WHEN a.item->>'failureCode' IS NOT NULL THEN 'error' WHEN a.item->>'providerId' IS NOT NULL THEN 'success' ELSE 'unknown' END),
 CASE WHEN jsonb_typeof(a.item->'cost')='number' THEN (a.item->>'cost')::float8 END,0::float8,
 CASE WHEN jsonb_typeof(a.item->'usage'->'prompt_tokens')='number' THEN (a.item->'usage'->>'prompt_tokens')::bigint END,
 CASE WHEN jsonb_typeof(a.item->'usage'->'completion_tokens')='number' THEN (a.item->'usage'->>'completion_tokens')::bigint END,'feasibility_conclusions'
 FROM feasibility_conclusions f CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(f.usage->'attempts')='array' THEN f.usage->'attempts' ELSE jsonb_build_array(jsonb_build_object('providerId',f.provider_id,'cost',f.cost,'usage',f.usage,'failureCode',f.output->>'failureCode')) END)WITH ORDINALITY a(item,ordinality)
 LEFT JOIN LATERAL(SELECT c.duration_ms,c.status_code,c.outcome FROM analytics_api_calls c WHERE c.source_ref='feasibility:'||f.id::text ORDER BY c.started_at,c.id LIMIT 1 OFFSET(a.ordinality-1))t ON true
 WHERE (f.provider_id IS NOT NULL OR jsonb_typeof(f.usage->'attempts')='array' OR COALESCE(f.output->>'generationAttempts','0')~'^[1-9][0-9]*$')
 AND (${org}::uuid IS NULL OR f.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR f.user_id=${user}::uuid)
 AND f.created_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND f.created_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago')
 UNION ALL
 SELECT c.id::text,c.organization_id,c.user_id,c.provider,c.operation,c.model,c.started_at,c.duration_ms,c.status_code,c.outcome,c.cost_usd::float8,0::float8,c.input_tokens::bigint,c.output_tokens::bigint,'analytics_api_calls'
 FROM analytics_api_calls c WHERE (${org}::uuid IS NULL OR c.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR c.user_id=${user}::uuid)
 AND c.started_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND c.started_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago')
 AND NOT EXISTS(SELECT 1 FROM watch_glm_calls w WHERE c.source_ref='watch:'||w.id::text)
 AND NOT EXISTS(SELECT 1 FROM feasibility_conclusions f WHERE c.source_ref='feasibility:'||f.id::text AND (f.provider_id IS NOT NULL OR jsonb_typeof(f.usage->'attempts')='array' OR COALESCE(f.output->>'generationAttempts','0')~'^[1-9][0-9]*$'))
 ), rated_calls AS (
 SELECT b.*,CASE WHEN b.cost_usd IS NULL AND b.reserved_usd=0 THEN rate.amount_usd::float8 END AS estimated_usd FROM base_calls b LEFT JOIN LATERAL(
 SELECT r.amount_usd FROM analytics_cost_rules r WHERE r.kind='per_call' AND r.provider=b.provider AND (r.operation IS NULL OR r.operation=b.operation)
 AND (r.organization_id IS NULL OR r.organization_id=b.organization_id) AND r.effective_from<=(b.started_at AT TIME ZONE 'America/Santiago')::date AND (r.effective_to IS NULL OR r.effective_to>=(b.started_at AT TIME ZONE 'America/Santiago')::date)
 ORDER BY (r.organization_id IS NOT NULL)DESC,(r.operation IS NOT NULL)DESC,r.effective_from DESC,r.created_at DESC,r.id LIMIT 1)rate ON true)
 `;
}

export async function buildAdminDashboard(scope:AnalyticsScope,now=new Date()):Promise<AdminDashboardReport> {
 const sql=analyticsSql(),org=scope.organizationId,user=scope.userId;
 const started=performance.now();
 const checkDeadline=()=>{if(performance.now()-started>50000)throw new Error('Analytics worker exceeded its time budget');};
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const directory=await analyticsDirectory();
 const userDirectory=directory.users.filter(u=>(!org||u.organizationId===org)&&(!user||u.id===user));
 // Only aggregate identities and scalar facts. Never read prompts, brand images,
 // client names, recipient addresses, audit before/after bodies or legal documents.
 const [telemetry]=await sql`SELECT min(occurred_at) AS since FROM analytics_events`;
 const since=iso(telemetry.since);
 const activity=sql`WITH activity AS (
 SELECT e.organization_id,e.user_id,e.module,e.event_name,e.occurred_at,e.session_id FROM analytics_events e
 WHERE e.user_id IS NOT NULL AND (${org}::uuid IS NULL OR e.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR e.user_id=${user}::uuid)
 UNION ALL SELECT a.organization_id,a.actor_user_id,a.entity_type,a.action,a.occurred_at,NULL::uuid FROM audit_events a
 WHERE a.actor_user_id IS NOT NULL AND (${org}::uuid IS NULL OR a.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR a.actor_user_id=${user}::uuid) AND (${since}::timestamptz IS NULL OR a.occurred_at<${since}::timestamptz)
 UNION ALL SELECT s.organization_id,s.user_id,'auth','legacy_login',s.created_at,NULL::uuid FROM auth_sessions s
 WHERE (${org}::uuid IS NULL OR s.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR s.user_id=${user}::uuid) AND (${since}::timestamptz IS NULL OR s.created_at<${since}::timestamptz)
 ), period AS (SELECT * FROM activity WHERE occurred_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND occurred_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago')) `;
 const aUsers=await sql`${activity} SELECT organization_id,user_id,count(*)FILTER(WHERE event_name='interaction')::int AS interactions,count(DISTINCT session_id)::int AS sessions,max(occurred_at) AS last FROM period GROUP BY organization_id,user_id`;
 const aLast=await sql`${activity} SELECT organization_id,user_id,max(occurred_at) AS last,bool_or(event_name IN ('login_succeeded','legacy_login')) AS logged_in FROM activity GROUP BY organization_id,user_id`;
 const daily=await sql`${activity} SELECT (occurred_at AT TIME ZONE 'America/Santiago')::date::text AS date,user_id,count(*)::int AS count FROM period WHERE event_name='interaction' GROUP BY 1,2 ORDER BY 1,2`;
 const weekly=await sql`${activity} SELECT date_trunc('week',occurred_at AT TIME ZONE 'America/Santiago')::date::text AS date,user_id,count(*)::int AS count FROM period WHERE event_name='interaction' GROUP BY 1,2 ORDER BY 1,2`;
 const modules=await sql`${activity} SELECT module AS key,count(*)::int AS count FROM period GROUP BY module ORDER BY count DESC`;
 const actions=await sql`${activity} SELECT event_name AS key,count(*)::int AS count FROM period GROUP BY event_name ORDER BY count DESC LIMIT 100`;
 const [active]=await sql`${activity} SELECT count(DISTINCT user_id)FILTER(WHERE occurred_at>=((${scope.to}::date-6)::timestamp AT TIME ZONE 'America/Santiago'))::int AS week,
 count(DISTINCT user_id)FILTER(WHERE occurred_at>=((${scope.to}::date-29)::timestamp AT TIME ZONE 'America/Santiago'))::int AS month FROM activity WHERE occurred_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago')`;
 checkDeadline();
 const tasks=sql`WITH tasks AS (SELECT id,organization_id,created_by,completed_by,assignee_id,status,due_at AS due,completed_at,created_at FROM case_tasks UNION ALL SELECT id,organization_id,created_by,completed_by,assignee_id,status,due_date::timestamp AT TIME ZONE 'America/Santiago',completed_at,created_at FROM registration_tasks),scoped AS (SELECT * FROM tasks WHERE (${org}::uuid IS NULL OR organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR assignee_id=${user}::uuid OR created_by=${user}::uuid OR completed_by=${user}::uuid)) `;
 const [taskTotals]=await sql`${tasks} SELECT count(*)::int AS total,count(*)FILTER(WHERE status='pending')::int AS pending,
 count(*)FILTER(WHERE status='pending' AND (due AT TIME ZONE 'America/Santiago')::date<${today}::date)::int AS overdue,
 count(*)FILTER(WHERE assignee_id IS NULL AND status='pending')::int AS unassigned,
 count(*)FILTER(WHERE created_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND created_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago'))::int AS created,
 count(*)FILTER(WHERE completed_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND completed_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago'))::int AS completed,
 count(*)FILTER(WHERE status='completed' AND completed_at IS NOT NULL AND due IS NOT NULL)::int AS dated_completed,
 count(*)FILTER(WHERE status='completed' AND completed_at IS NOT NULL AND due IS NOT NULL AND (completed_at AT TIME ZONE 'America/Santiago')::date<=(due AT TIME ZONE 'America/Santiago')::date)::int AS on_time,
 count(*)FILTER(WHERE status='completed' AND completed_at IS NULL)::int AS unknown_completed,
 count(*)FILTER(WHERE created_by IS NULL)::int AS unknown_creator,count(*)FILTER(WHERE status='completed' AND completed_by IS NULL)::int AS unknown_completer FROM scoped`;
 const taskStatus=await sql`${tasks} SELECT status AS key,count(*)::int AS count FROM scoped GROUP BY status`;
 const tUsers=await sql`${tasks} SELECT u.user_id,u.organization_id,
 count(*)FILTER(WHERE t.created_by=u.user_id AND t.created_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND t.created_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago'))::int AS created,
 count(*)FILTER(WHERE t.assignee_id=u.user_id AND t.status='pending')::int AS assigned,
 count(*)FILTER(WHERE t.completed_by=u.user_id AND t.completed_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND t.completed_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago'))::int AS completed,
 count(*)FILTER(WHERE t.assignee_id=u.user_id AND t.status='pending' AND (t.due AT TIME ZONE 'America/Santiago')::date<${today}::date)::int AS overdue,
 count(*)FILTER(WHERE t.completed_by=u.user_id AND t.status='completed' AND t.completed_at IS NOT NULL AND t.due IS NOT NULL)::int AS dated_completed,
 count(*)FILTER(WHERE t.completed_by=u.user_id AND t.status='completed' AND t.completed_at IS NOT NULL AND t.due IS NOT NULL AND (t.completed_at AT TIME ZONE 'America/Santiago')::date<=(t.due AT TIME ZONE 'America/Santiago')::date)::int AS on_time
 FROM organization_members u LEFT JOIN scoped t ON t.organization_id=u.organization_id AND (t.created_by=u.user_id OR t.assignee_id=u.user_id OR t.completed_by=u.user_id)
 WHERE (${org}::uuid IS NULL OR u.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR u.user_id=${user}::uuid) GROUP BY u.user_id,u.organization_id`;
 checkDeadline();
 const [portfolio]=await sql`SELECT count(*)::int AS total,count(*)FILTER(WHERE b.monitoring_config->>'monitoringEnabled'='true' AND b.status<>'Pausada')::int AS watching,count(*)FILTER(WHERE ba.user_id IS NULL)::int AS unassigned FROM brands b LEFT JOIN analytics_brand_assignments ba ON ba.brand_id=b.id AND ba.organization_id=b.organization_id WHERE b.archived_at IS NULL AND (${org}::uuid IS NULL OR b.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR b.created_by=${user}::uuid OR ba.user_id=${user}::uuid)`;
 const bUsers=await sql`SELECT b.organization_id,b.created_by AS user_id,count(*)::int AS created FROM brands b WHERE b.archived_at IS NULL AND (${org}::uuid IS NULL OR b.organization_id=${org}::uuid) GROUP BY b.organization_id,b.created_by`;
 const responsible=await sql`SELECT ba.organization_id,ba.user_id,count(*)::int AS count FROM analytics_brand_assignments ba JOIN brands b ON b.id=ba.brand_id AND b.organization_id=ba.organization_id AND b.archived_at IS NULL WHERE (${org}::uuid IS NULL OR ba.organization_id=${org}::uuid) GROUP BY ba.organization_id,ba.user_id`;
 const bOrgs=await sql`SELECT b.organization_id,o.name,count(*)::int AS count FROM brands b JOIN organizations o ON o.id=b.organization_id LEFT JOIN analytics_brand_assignments ba ON ba.brand_id=b.id AND ba.organization_id=b.organization_id WHERE b.archived_at IS NULL AND (${org}::uuid IS NULL OR b.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR b.created_by=${user}::uuid OR ba.user_id=${user}::uuid) GROUP BY b.organization_id,o.name`;
 const brands=await sql`SELECT b.id,b.name,b.organization_id,b.created_by,ba.user_id AS responsible,b.monitoring_config->>'monitoringEnabled'='true' AND b.status<>'Pausada' AS watching FROM brands b LEFT JOIN analytics_brand_assignments ba ON ba.brand_id=b.id AND ba.organization_id=b.organization_id WHERE b.archived_at IS NULL AND (${org}::uuid IS NULL OR b.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR b.created_by=${user}::uuid OR ba.user_id=${user}::uuid) ORDER BY b.name LIMIT 500`;
 const [alert]=await sql`WITH reviewed AS (SELECT DISTINCT ON(match_id) match_id,decision,created_at,reviewer_id FROM match_reviews WHERE (${org}::uuid IS NULL OR organization_id=${org}::uuid) ORDER BY match_id,created_at DESC),feedback AS (SELECT DISTINCT ON(match_id) match_id,vote,updated_at FROM watch_feedback WHERE (${org}::uuid IS NULL OR organization_id=${org}::uuid) ORDER BY match_id,updated_at DESC),first_review AS(SELECT match_id,min(created_at)AS at FROM match_reviews WHERE (${org}::uuid IS NULL OR organization_id=${org}::uuid)GROUP BY match_id)
 SELECT count(*)::int AS total,count(*)FILTER(WHERE d.decision->>'show'='true')::int AS selected,
 count(*)FILTER(WHERE d.decision->>'show'='false')::int AS rejected,count(*)FILTER(WHERE d.match_id IS NULL)::int AS unclassified,
 count(*)FILTER(WHERE r.match_id IS NOT NULL)::int AS reviewed,
 count(*)FILTER(WHERE r.match_id IS NULL AND f.match_id IS NULL)::int AS pending,
 count(*)FILTER(WHERE d.decision->>'show'='true' AND r.match_id IS NULL AND f.match_id IS NULL)::int AS selected_pending,
 count(*)FILTER(WHERE r.decision IN ('En seguimiento','Convertida en caso') OR r.decision IS NULL AND f.vote='up')::int AS relevant,
 count(*)FILTER(WHERE r.decision='Descartada' OR r.decision IS NULL AND f.vote='down')::int AS discarded,
 count(*)FILTER(WHERE c.id IS NOT NULL)::int AS cases,
 count(*)FILTER(WHERE d.decision->>'show'='true' AND c.id IS NOT NULL AND (r.decision IN ('En seguimiento','Convertida en caso') OR r.decision IS NULL AND f.vote='up'))::int AS selected_relevant_cases,
 count(*)FILTER(WHERE d.decision->>'show'='true' AND (r.decision IN ('En seguimiento','Convertida en caso') OR r.decision IS NULL AND f.vote='up'))::int AS confirmed_relevant,
 count(*)FILTER(WHERE d.decision->>'show'='true' AND (r.decision='Descartada' OR r.decision IS NULL AND f.vote='down'))::int AS confirmed_irrelevant,
 count(*)FILTER(WHERE d.decision->>'show'='false' AND (r.decision IN ('En seguimiento','Convertida en caso') OR r.decision IS NULL AND f.vote='up'))::int AS observed_false_negatives,
 avg(extract(epoch FROM fr.at-m.created_at)/3600)FILTER(WHERE fr.at>=m.created_at)::float8 AS response_hours,
 avg(extract(epoch FROM fr.at-d.notified_at)/3600)FILTER(WHERE d.notified_at IS NOT NULL AND fr.at>=d.notified_at)::float8 AS mail_response_hours,
 max(extract(epoch FROM ${now}::timestamptz-m.created_at)/3600)FILTER(WHERE r.match_id IS NULL AND f.match_id IS NULL)::float8 AS oldest_pending
 FROM matches m LEFT JOIN watch_glm_decisions d ON d.match_id=m.id AND d.organization_id=m.organization_id LEFT JOIN reviewed r ON r.match_id=m.id LEFT JOIN feedback f ON f.match_id=m.id LEFT JOIN first_review fr ON fr.match_id=m.id LEFT JOIN cases c ON c.source_match_id=m.id AND c.organization_id=m.organization_id
 WHERE (${org}::uuid IS NULL OR m.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR m.owner_id=${user}::uuid OR r.reviewer_id=${user}::uuid)`;
 const reviewUsers=await sql`SELECT organization_id,reviewer_id AS user_id,count(*)::int AS count FROM match_reviews WHERE created_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND created_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago') AND (${org}::uuid IS NULL OR organization_id=${org}::uuid) GROUP BY organization_id,reviewer_id`;
 const caseUsers=await sql`SELECT organization_id,created_by AS user_id,count(*)::int AS count FROM cases WHERE created_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND created_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago') AND (${org}::uuid IS NULL OR organization_id=${org}::uuid) GROUP BY organization_id,created_by`;
 checkDeadline();
 const userRows:AnalyticsUserRow[]=userDirectory.map(u=>{
  const find=(rows:postgres.RowList<postgres.Row[]>)=>rows.find(row=>row.organization_id===u.organizationId&&row.user_id===u.id);
  const a=find(aUsers),last=find(aLast),t=find(tUsers),b=find(bUsers),manager=find(responsible);
  return {...u,interactions:number(a?.interactions),sessions:number(a?.sessions),lastActivity:iso(last?.last),neverLoggedIn:last?.logged_in?false:null,brandsCreated:number(b?.created),brandsResponsible:number(manager?.count),tasksCreated:number(t?.created),tasksAssigned:number(t?.assigned),tasksCompleted:number(t?.completed),tasksOverdue:number(t?.overdue),reviews:number(find(reviewUsers)?.count),casesCreated:number(find(caseUsers)?.count),onTimePercent:percentage(number(t?.on_time),number(t?.dated_completed))};
 });
 const [deadlineTotals]=await sql`SELECT count(*)FILTER(WHERE ld.legal_date BETWEEN ${today}::date AND ${today}::date+13)::int AS upcoming,count(*)FILTER(WHERE ld.legal_date<${today}::date)::int AS overdue,
 count(*)FILTER(WHERE ld.legal_date BETWEEN ${today}::date AND ${today}::date+13 AND COALESCE(c.owner_id,m.owner_id,ba.user_id)IS NULL)::int AS unassigned,
 count(*)FILTER(WHERE ld.legal_date BETWEEN ${today}::date AND ${today}::date+13 AND NOT EXISTS(SELECT 1 FROM case_tasks t WHERE t.organization_id=ld.organization_id AND t.case_id=ld.case_id AND t.status='pending'))::int AS no_task
 FROM legal_deadlines ld LEFT JOIN cases c ON c.id=ld.case_id AND c.organization_id=ld.organization_id LEFT JOIN matches m ON m.id=ld.match_id AND m.organization_id=ld.organization_id LEFT JOIN analytics_brand_assignments ba ON ba.brand_id=ld.brand_id AND ba.organization_id=ld.organization_id
 WHERE ld.status NOT IN ('completed','cancelled','managed') AND (${org}::uuid IS NULL OR ld.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR COALESCE(c.owner_id,m.owner_id,ba.user_id)=${user}::uuid)`;
 const deadlineRows=await sql`SELECT ld.id,ld.organization_id,ld.source AS type,ld.legal_date::text AS date,ld.status,COALESCE(c.owner_id,m.owner_id,ba.user_id) IS NOT NULL AS has_responsible,EXISTS(SELECT 1 FROM case_tasks t WHERE t.organization_id=ld.organization_id AND t.case_id=ld.case_id AND t.status='pending')AS has_task
 FROM legal_deadlines ld LEFT JOIN cases c ON c.id=ld.case_id AND c.organization_id=ld.organization_id LEFT JOIN matches m ON m.id=ld.match_id AND m.organization_id=ld.organization_id LEFT JOIN analytics_brand_assignments ba ON ba.brand_id=ld.brand_id AND ba.organization_id=ld.organization_id
 WHERE ld.status NOT IN ('completed','cancelled','managed') AND ld.legal_date<=${today}::date+13 AND (${org}::uuid IS NULL OR ld.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR COALESCE(c.owner_id,m.owner_id,ba.user_id)=${user}::uuid)ORDER BY ld.legal_date LIMIT 500`;
 const projectedDeadlines:AnalyticsDeadlineRow[]=[];
 for(const organization of directory.organizations.filter(o=>!org||o.id===org)) {
  checkDeadline();
  const agenda=await readDigestAgenda(organization.id,now,sql);
  const owners=await sql`SELECT public_code,owner_id FROM cases WHERE organization_id=${organization.id} AND status='active'`;
  for(const event of agenda.filter(e=>e.category!=='task'&&e.date)) {
   const owner=event.entityType==='case'?owners.find(c=>c.public_code===event.entityId)?.owner_id:null;
   if(user&&owner!==user)continue;
   projectedDeadlines.push({id:`projected:${organization.id}:${event.id}`,organizationId:organization.id,type:event.category==='gazette'?'Plazo Diario Oficial proyectado':'Plazo INAPI proyectado',date:event.date!,status:'upcoming',hasResponsible:!!owner,hasTask:agenda.some(task=>task.category==='task'&&task.entityId===event.entityId)});
  }
 }
 const projectedNote='Agenda vigente proyectada desde expedientes y casos, con reglas existentes y sin nuevas consultas a fuentes. No se suman a legal_deadlines: podrían representar el mismo plazo.';
 checkDeadline();
 const emailBase=sql`WITH emails AS(SELECT r.id,r.organization_id,r.created_at,r.sent_at,r.status,r.requested_by,COALESCE(jsonb_array_length(r.payload->'crosses'),0)::int AS alerts,COALESCE(jsonb_array_length(r.payload->'agenda'),0)::int AS tasks,
 EXISTS(SELECT 1 FROM analytics_email_events e WHERE e.organization_id=r.organization_id AND e.run_id=r.id) AS tracked,
 EXISTS(SELECT 1 FROM analytics_email_events e WHERE e.organization_id=r.organization_id AND e.run_id=r.id AND e.event_type='delivered')AS delivered,
 EXISTS(SELECT 1 FROM analytics_email_events e WHERE e.organization_id=r.organization_id AND e.run_id=r.id AND e.event_type='bounced')AS bounced,
 (SELECT count(*)::int FROM analytics_email_events e WHERE e.organization_id=r.organization_id AND e.run_id=r.id AND e.event_type='clicked')AS clicks,
 (SELECT count(*)::int FROM analytics_events e WHERE e.organization_id=r.organization_id AND e.properties->>'digest_run_id'=r.id::text AND e.event_name='digest_viewed' AND e.properties->>'source'='server' AND e.user_id IS NOT NULL AND e.occurred_at>=r.sent_at)AS identified_views,
 (SELECT count(DISTINCT a.id)::int FROM audit_events a WHERE a.organization_id=r.organization_id AND EXISTS(SELECT 1 FROM analytics_events e WHERE e.properties->>'digest_run_id'=r.id::text AND e.organization_id=r.organization_id AND e.event_name='digest_viewed' AND e.properties->>'source'='server' AND e.user_id=a.actor_user_id AND e.occurred_at>=r.sent_at AND a.occurred_at>=e.occurred_at AND a.occurred_at<e.occurred_at+interval '7 days')) AS actions
 FROM watch_digest_runs r WHERE r.created_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND r.created_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago') AND (${org}::uuid IS NULL OR r.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR r.requested_by=${user}::uuid)) `;
 const [email]=await sql`${emailBase}SELECT count(*)::int AS runs,count(*)FILTER(WHERE sent_at IS NOT NULL)::int AS sent,count(*)FILTER(WHERE delivered)::int AS delivered,count(*)FILTER(WHERE bounced)::int AS bounced,sum(clicks)::int AS clicks,sum(identified_views)::int AS identified_views,sum(actions)::int AS actions,count(*)FILTER(WHERE tracked)::int AS tracked,count(*)FILTER(WHERE status IN ('failed','uncertain'))::int AS failures FROM emails`;
 const emailRows=await sql`${emailBase}SELECT * FROM emails ORDER BY created_at DESC LIMIT 500`;
 const emailDaily=await sql`${emailBase}SELECT(sent_at AT TIME ZONE 'America/Santiago')::date::text AS date,count(*)::int AS count FROM emails WHERE sent_at IS NOT NULL GROUP BY 1 ORDER BY 1`;
 const [drafts]=await sql`SELECT count(*)FILTER(WHERE marked_sent_at IS NOT NULL)::int AS marked_sent FROM email_drafts WHERE generated_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago')AND generated_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago')AND(${org}::uuid IS NULL OR organization_id=${org}::uuid)AND(${user}::uuid IS NULL OR generated_by=${user}::uuid)`;
 checkDeadline();
 const calls=normalizedCalls(sql,scope);
 const providerRows=await sql`${calls}SELECT provider,operation,model,count(*)::int AS calls,count(*)FILTER(WHERE outcome='error')::int AS errors,count(*)FILTER(WHERE outcome='unknown')::int AS unknown_outcome,avg(duration_ms)::float8 AS mean_duration_ms,percentile_cont(.95)WITHIN GROUP(ORDER BY duration_ms)::float8 AS p95_duration_ms,
 COALESCE(sum(cost_usd),0)::float8 AS confirmed,COALESCE(sum(estimated_usd),0)::float8 AS estimated,COALESCE(sum(reserved_usd),0)::float8 AS reserved,count(*)FILTER(WHERE cost_usd IS NULL)::int AS unknown_cost,sum(input_tokens)::float8 AS input_tokens,sum(output_tokens)::float8 AS output_tokens FROM rated_calls GROUP BY provider,operation,model ORDER BY confirmed DESC,provider,operation`;
 const callRows=await sql`${calls}SELECT * FROM rated_calls ORDER BY started_at DESC LIMIT 500`;
 const costDaily=await sql`${calls}SELECT(started_at AT TIME ZONE 'America/Santiago')::date::text AS date,count(*)::int AS count,COALESCE(sum(cost_usd),0)::float8 AS confirmed,COALESCE(sum(estimated_usd),0)::float8 AS estimated,COALESCE(sum(reserved_usd),0)::float8 AS reserved FROM rated_calls GROUP BY 1 ORDER BY 1`;
 const costOrgs=await sql`${calls}SELECT organization_id,count(*)::int AS count,COALESCE(sum(cost_usd),0)::float8+COALESCE(sum(estimated_usd),0)::float8 AS value FROM rated_calls GROUP BY organization_id`;
 const costUsers=await sql`${calls}SELECT user_id,count(*)::int AS count,COALESCE(sum(cost_usd),0)::float8+COALESCE(sum(estimated_usd),0)::float8 AS value FROM rated_calls GROUP BY user_id`;
 checkDeadline();
 const [weeklyForecast]=await sql`WITH completed AS(SELECT r.organization_id,COALESCE(c.cost,0)::float8 AS cost FROM watch_digest_runs r LEFT JOIN LATERAL(SELECT sum(w.cost_usd)::float8 AS cost,count(*)FILTER(WHERE w.cost_usd IS NULL)::int AS unconfirmed FROM watch_glm_calls w WHERE w.organization_id=r.organization_id AND w.run_id=r.id)c ON true
 WHERE ${user}::uuid IS NULL AND r.trigger='scheduled' AND r.status='sent' AND r.failures=0 AND NOT r.limited AND COALESCE(c.unconfirmed,0)=0 AND (${org}::uuid IS NULL OR r.organization_id=${org}::uuid)
 AND r.created_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago')AND r.created_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago')),averages AS(SELECT organization_id,avg(cost)::float8 AS mean,count(*)::int AS samples FROM completed GROUP BY organization_id HAVING count(*)>=2)
 SELECT sum(mean)*4 AS projected,sum(samples)::int AS samples,count(*)::int AS organizations FROM averages`;
 const nextWeeklyEstimate=weeklyForecast.projected===null?null:number(weeklyForecast.projected);
 const rulesRows=await sql`SELECT *,effective_from::text AS from_date,effective_to::text AS to_date FROM analytics_cost_rules WHERE (${org}::uuid IS NULL OR organization_id IS NULL OR organization_id=${org}::uuid) ORDER BY effective_from DESC,created_at DESC LIMIT 500`;
 const rules:AnalyticsCostRule[]=rulesRows.map(r=>({id:r.id,organizationId:r.organization_id,provider:r.provider,operation:r.operation,kind:r.kind,amountUsd:number(r.amount_usd),label:r.label,effectiveFrom:String(r.from_date),effectiveTo:r.to_date?String(r.to_date):null}));
 const providers:AnalyticsProviderRow[]=providerRows.map(p=>({provider:p.provider,operation:p.operation,model:p.model,calls:number(p.calls),errors:number(p.errors),unknownOutcome:number(p.unknown_outcome),meanDurationMs:p.mean_duration_ms===null?null:number(p.mean_duration_ms),p95DurationMs:p.p95_duration_ms===null?null:number(p.p95_duration_ms),confirmedUsd:number(p.confirmed),estimatedUsd:number(p.estimated),reservedUsd:number(p.reserved),unknownCostCalls:number(p.unknown_cost),inputTokens:p.input_tokens===null?null:number(p.input_tokens),outputTokens:p.output_tokens===null?null:number(p.output_tokens),coverage:p.provider==='openrouter'?'Ledgers históricos y telemetría física nueva; tiempos disponibles desde la instrumentación.':'Llamadas físicas observadas desde la instrumentación; sin reconstrucción de consultas históricas.'}));
 const totals=providers.reduce((t,p)=>({confirmed:t.confirmed+p.confirmedUsd,estimated:t.estimated+p.estimatedUsd,reserved:t.reserved+p.reservedUsd,calls:t.calls+p.calls,unknown:t.unknown+p.unknownCostCalls,errors:t.errors+p.errors}),{confirmed:0,estimated:0,reserved:0,calls:0,unknown:0,errors:0});
 const fixed=user?0:proratedFixedCosts(rules,scope);
 const monthFees=user?0:proratedFixedCosts(rules,{...scope,from:scope.to.slice(0,7)+'-01',to:new Date(Date.UTC(Number(scope.to.slice(0,4)),Number(scope.to.slice(5,7)),0)).toISOString().slice(0,10)});
 const budgetRule=rules.find(r=>r.kind==='budget_monthly'&&r.effectiveFrom<=scope.to&&(!r.effectiveTo||r.effectiveTo>=scope.to)&&(org?r.organizationId===org:r.organizationId===null));
 const total=totals.confirmed+totals.estimated+fixed;
 const days=(Date.parse(scope.to)-Date.parse(scope.from))/86400000+1;
 const daysInMonth=new Date(Date.UTC(Number(scope.to.slice(0,4)),Number(scope.to.slice(5,7)),0)).getUTCDate();
 const projection=totals.calls?(totals.confirmed+totals.estimated)/days*daysInMonth+monthFees:null;
 const apiCalls:AnalyticsApiCall[]=callRows.map(c=>({id:c.id,organizationId:c.organization_id,userId:c.user_id,provider:c.provider,operation:c.operation,model:c.model,startedAt:iso(c.started_at)!,durationMs:c.duration_ms===null?null:number(c.duration_ms),statusCode:c.status_code===null?null:number(c.status_code),outcome:c.outcome,confirmedUsd:c.cost_usd===null?null:number(c.cost_usd),estimatedUsd:c.estimated_usd===null?null:number(c.estimated_usd),reservedUsd:number(c.reserved_usd),inputTokens:c.input_tokens===null?null:number(c.input_tokens),outputTokens:c.output_tokens===null?null:number(c.output_tokens),source:c.source}));
 const qualityDenominator=number(alert.confirmed_relevant)+number(alert.confirmed_irrelevant);
 const [costCohort]=await sql`SELECT count(*)FILTER(WHERE d.decision->>'show'='true')::int AS selected,count(*)FILTER(WHERE d.decision->>'show'='true' AND review.decision IN ('En seguimiento','Convertida en caso'))::int AS relevant FROM watch_glm_decisions d JOIN watch_digest_runs r ON r.id=d.run_id AND r.organization_id=d.organization_id LEFT JOIN LATERAL(SELECT mr.decision FROM match_reviews mr WHERE mr.organization_id=d.organization_id AND mr.match_id=d.match_id ORDER BY mr.created_at DESC LIMIT 1)review ON true WHERE d.created_at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago')AND d.created_at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago')AND(${org}::uuid IS NULL OR d.organization_id=${org}::uuid)AND(${user}::uuid IS NULL OR r.requested_by=${user}::uuid)`;
 const selected=number(alert.selected),interactions=userRows.reduce((n,u)=>n+u.interactions,0);
 const chart=(rows:postgres.RowList<postgres.Row[]>)=>rows.map(r=>({date:String(r.date),count:number(r.count),userId:r.user_id?String(r.user_id):undefined,label:r.user_id?directory.users.find(u=>u.id===r.user_id)?.name:undefined}));
 const alertMetrics=[metric('selected','Cruces seleccionados por GLM',selected),metric('rejected','Cruces descartados por GLM',number(alert.rejected)),metric('unclassified','Cruces sin evaluar por GLM',number(alert.unclassified)),metric('reviewed','Cruces con revisión humana',number(alert.reviewed)),metric('pending','Cruces sin evaluación humana',number(alert.pending)),metric('selected_pending','Alertas GLM sin evaluación humana',number(alert.selected_pending)),metric('relevant','Confirmados relevantes por abogados',number(alert.relevant)),metric('discarded','Descartados por abogados',number(alert.discarded)),metric('cases','Cruces convertidos en casos',number(alert.cases)),metric('confirmed_precision','Alertas GLM confirmadas relevantes',percentage(number(alert.confirmed_relevant),qualityDenominator),'percent','Solo alertas con decisión humana concluyente; pendientes fuera del denominador.','partial'),metric('observed_false_negatives','Descartes GLM luego confirmados relevantes',number(alert.observed_false_negatives),'count','Solo falsos negativos observados; no equivale a recuperación completa.','partial'),metric('response_hours','Tiempo medio detección → revisión',alert.response_hours===null?null:number(alert.response_hours),'hours'),metric('mail_response_hours','Tiempo medio aviso → revisión',alert.mail_response_hours===null?null:number(alert.mail_response_hours),'hours'),metric('oldest_pending','Antigüedad del cruce pendiente más antiguo',alert.oldest_pending===null?null:number(alert.oldest_pending),'hours')];
 const costMetrics=[metric('confirmed','Costo variable confirmado',totals.confirmed,'usd','Importes de los ledgers y respuestas del proveedor; no factura conciliada.'),metric('estimated','Costo variable estimado',totals.estimated,'usd','Tarifas por llamada ingresadas por administrador; nunca se mezclan con confirmado.'),metric('reserved','Reservas con cargo pendiente de confirmar',totals.reserved,'usd','Se presentan separadas del gasto; el presupuesto conservador las retiene.'),metric('fixed','Suscripciones y costos fijos prorrateados',user?null:fixed,'usd',user?'Compartidos: no se asignan arbitrariamente al usuario.':org?'Solo fijos asignados al estudio; los globales permanecen en el alcance general.':'USD mensual × días activos / días de cada mes.'),metric('total','Costo conocido + estimado + fijo',total,'usd','Puede faltar costo de proveedores sin tarifa; no es el gasto final de una factura.','partial'),metric('unknown_calls','Llamadas sin costo confirmado',totals.unknown,'count','Incluye llamadas estimadas y reservas sin cargo confirmado.'),metric('cost_per_call','Costo variable por llamada observada',totals.calls?(totals.confirmed+totals.estimated)/totals.calls:null,'usd'),metric('cost_per_alert','Costo GLM por alerta seleccionada',number(costCohort.selected)?providers.filter(p=>p.operation==='watch_glm').reduce((n,p)=>n+p.confirmedUsd+p.estimatedUsd,0)/number(costCohort.selected):null,'usd','Gasto GLM / alertas seleccionadas durante el mismo período; reintentos incluidos.','partial'),metric('cost_per_relevant','Costo GLM por alerta relevante confirmada',number(costCohort.relevant)?providers.filter(p=>p.operation==='watch_glm').reduce((n,p)=>n+p.confirmedUsd+p.estimatedUsd,0)/number(costCohort.relevant):null,'usd','Alertas del período luego confirmadas por humanos; revisiones pendientes excluidas.','partial'),metric('projection','Proyección mensual con ritmo observado',projection,'usd',`Variable observada / ${days} días calendario × ${daysInMonth}, más fijos del mes; no predice demanda futura.`, 'partial'),metric('budget','Presupuesto mensual configurado',budgetRule?.amountUsd??null,'usd','Orientativo del dashboard; no cambia los límites de ejecución de GLM.')];
 const tasksMetrics=[metric('created','Tareas creadas en el período',number(taskTotals.created)),metric('pending','Tareas pendientes actuales',number(taskTotals.pending)),metric('assigned','Tareas pendientes con responsable',number(taskTotals.pending)-number(taskTotals.unassigned)),metric('unassigned','Tareas pendientes sin responsable',number(taskTotals.unassigned)),metric('completed','Completadas con fecha en el período',number(taskTotals.completed),'count','Las completadas antiguas sin fecha no se atribuyen al período.','partial'),metric('overdue','Tareas vencidas actuales',number(taskTotals.overdue)),metric('on_time','Completadas dentro del plazo',percentage(number(taskTotals.on_time),number(taskTotals.dated_completed)),'percent','Solo tareas completadas con fecha de cierre y vencimiento conocidos; estado actual.','partial'),metric('unknown_creator','Tareas sin autor histórico registrado',number(taskTotals.unknown_creator)),metric('unknown_completer','Completadas sin ejecutor registrado',number(taskTotals.unknown_completer)),metric('unknown_completed','Completadas sin fecha histórica',number(taskTotals.unknown_completed))];
 const report:AdminDashboardReport={scope,generatedAt:now.toISOString(),timezone:'America/Santiago',overview:{metrics:[metric('active_week','Usuarios activos últimos 7 días',number(active.week),'count','Actividad observada; historial de lectura anterior no disponible.','partial'),metric('active_month','Usuarios activos últimos 30 días',number(active.month),'count',undefined,'partial'),metric('interactions','Interacciones observadas en el período',interactions,'count','Eventos de uso nuevos; historial previo limitado a auditoría y sesiones conservadas.','partial'),metric('marks','Marcas actuales',number(portfolio.total)),metric('pending_alerts','Alertas GLM sin revisar',number(alert.selected_pending)),metric('overdue_tasks','Tareas vencidas',number(taskTotals.overdue)),metric('cost','Costo conocido y estimado del período',total,'usd',undefined,'partial')]},
 costs:{metrics:costMetrics,daily:costDaily.map(r=>({date:r.date,count:number(r.count),confirmedUsd:number(r.confirmed),estimatedUsd:number(r.estimated),reservedUsd:number(r.reserved),value:number(r.confirmed)+number(r.estimated)})),providers,organizations:costOrgs.map(r=>({key:r.organization_id??'shared',label:directory.organizations.find(o=>o.id===r.organization_id)?.name??'Compartido / sin estudio',organizationId:r.organization_id??undefined,count:number(r.count),value:number(r.value)})),byUser:costUsers.map(r=>({key:r.user_id??'system',label:directory.users.find(u=>u.id===r.user_id)?.name??'Sistema / sin usuario',userId:r.user_id??undefined,count:number(r.count),value:number(r.value)})),rules,budgetUsd:budgetRule?.amountUsd??null,projectionUsd:projection,nextMonthWeeklyEstimateUsd:null,coverage:`Período ${scope.from}–${scope.to} (${days} días calendario, zona Chile). Ledgers nativos sin doble conteo de telemetría. Los fijos globales se muestran como compartidos, no se reparten entre estudios ni usuarios. Sin factura externa sincronizada. Tasas por llamada manuales con vigencia y especificidad por estudio/operación.`},
 users:{metrics:[metric('members','Usuarios del alcance',userRows.length),metric('active_week','Activos últimos 7 días',number(active.week),'count',undefined,'partial'),metric('active_month','Activos últimos 30 días',number(active.month),'count',undefined,'partial'),metric('no_activity','Sin actividad registrada',userRows.filter(u=>!u.lastActivity).length,'count','No demuestra que nunca ingresaron: cerrar sesión elimina la sesión histórica.','partial'),metric('never_login','Invitados que nunca ingresaron',null,'count','No se puede reconstruir históricamente; se capturan nuevos inicios de sesión.','unavailable')] ,rows:userRows,weekly:chart(weekly),daily:chart(daily)},
 tasks:{metrics:tasksMetrics,byUser:userRows,statuses:taskStatus.map(r=>({key:r.key,label:r.key,count:number(r.count)}))},
 portfolio:{metrics:[metric('total','Marcas actuales',number(portfolio.total)),metric('watching','Marcas con vigilancia activa',number(portfolio.watching)),metric('unassigned','Marcas sin responsable explícito',number(portfolio.unassigned),'count','Asignación administrativa nueva; el titular de la marca y quien la incorporó son personas distintas.','partial')],byUser:userRows,byOrganization:bOrgs.map(r=>({key:r.organization_id,label:r.name,organizationId:r.organization_id,count:number(r.count)})),assignments:brands.map(b=>({brandId:b.id,brandName:b.name,organizationId:b.organization_id,createdBy:b.created_by,responsibleUserId:b.responsible,watching:b.watching===true})),totalBrands:number(portfolio.total),detailLimit:500},
 alerts:{metrics:alertMetrics,byUser:userRows,outcomes:[{key:'relevant',label:'Relevantes confirmados',count:number(alert.relevant)},{key:'discarded',label:'Descartados por abogados',count:number(alert.discarded)},{key:'pending',label:'Sin evaluar por abogados',count:number(alert.pending)}]},
  deadlines:{metrics:[metric('projected','Plazos vigentes de agenda en próximos 14 días',projectedDeadlines.length,'count',projectedNote),metric('projected_unassigned','Plazos de agenda sin responsable explícito',projectedDeadlines.filter(d=>!d.hasResponsible).length,'count','Los responsables de solicitudes propias aún no tienen asignación canónica.','partial'),metric('projected_no_task','Plazos de agenda sin tarea pendiente',projectedDeadlines.filter(d=>!d.hasTask).length),metric('upcoming','Plazos de registro manual próximos 14 días',number(deadlineTotals.upcoming),'count','Tabla legal_deadlines; puede coincidir con un plazo proyectado.'),metric('overdue','Plazos de registro manual pendientes vencidos',number(deadlineTotals.overdue)),metric('unassigned','Plazos manuales próximos sin responsable',number(deadlineTotals.unassigned)),metric('no_task','Plazos manuales próximos sin tarea pendiente de caso',number(deadlineTotals.no_task),'count','Solo legal_deadlines; no se suma al total de agenda.','partial')],rows:[...projectedDeadlines,...deadlineRows.map(r=>({id:r.id,organizationId:r.organization_id,type:r.type,date:r.date,status:r.status,hasResponsible:r.has_responsible,hasTask:r.has_task}))].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,500)},
 emails:{metrics:[
  metric('runs','Resúmenes preparados/intentados',number(email.runs)),metric('accepted','Correos aceptados por Resend',number(email.sent),'count','Aceptación API; no equivale a entrega.'),
  metric('delivered','Entregas confirmadas por webhook',number(email.tracked)?number(email.delivered):null,'count','Solo eventos firmados recibidos; histórico anterior desconocido.','partial'),
  metric('bounced','Rebotes confirmados por webhook',number(email.tracked)?number(email.bounced):null,'count',undefined,'partial'),
  metric('clicked','Clics registrados por Resend',number(email.tracked)?number(email.clicks):null,'count','Eventos firmados de Resend; no se suman con accesos al resumen ni se infieren de aperturas.','partial'),
  metric('authenticated_views','Accesos identificados al resumen tras el envío',since?number(email.identified_views):null,'count','Accesos autenticados verificados en servidor, posteriores al envío del mismo resumen. No demuestra que el acceso provenga del correo.','partial'),
  metric('actions','Gestiones auditadas tras abrir el resumen',since?number(email.actions):null,'count','Mismo usuario y estudio dentro de 7 días del acceso autenticado posterior al envío. Asociación temporal; no demuestra causalidad del correo.','partial'),
  metric('failures','Envíos fallidos o inciertos',number(email.failures)),metric('draft_marked_sent','Borradores marcados como enviados',number(drafts.marked_sent),'count','Marca manual independiente de Resend; no prueba entrega.')
 ],rows:emailRows.map(e=>({id:e.id,organizationId:e.organization_id,at:iso(e.sent_at??e.created_at)!,status:e.status,alerts:number(e.alerts),tasks:number(e.tasks),
  delivered:e.delivered===true?true:e.bounced===true?false:null,bounced:e.bounced===true?true:e.delivered===true?false:null,
  clicks:e.tracked?number(e.clicks):null,identifiedViews:since?number(e.identified_views):null,actionsAfterEmail:since?number(e.actions):null
 })),daily:chart(emailDaily)},
 apis:{metrics:[metric('physical_calls','Llamadas físicas observadas',totals.calls,'count','Cada solicitud HTTP externa cuenta; un cruce o cache hit no equivale a llamada.','partial'),metric('errors','Llamadas con error observado',totals.errors),metric('error_rate','Tasa de errores observados',percentage(totals.errors,totals.calls),'percent'),metric('unknown_cost','Llamadas sin cargo confirmado',totals.unknown)],providers,calls:apiCalls,daily:costDaily.map(r=>({date:r.date,count:number(r.count)})),totalCalls:totals.calls,detailLimit:500},
 behavior:{metrics:[metric('interactions','Interacciones observadas',interactions,'count',undefined,'partial'),metric('modules','Módulos con uso registrado',modules.length),metric('sessions','Sesiones anónimas de navegación observadas',aUsers.reduce((n,u)=>n+number(u.sessions),0),'count','UUID de sesión de navegación; no cookies ni tokens de autenticación.','partial'),metric('dwell','Tiempo efectivo de atención',null,'hours','No se infiere de pestañas abiertas; requeriría instrumentación específica.','unavailable')],modules:modules.map(r=>({key:r.key,label:r.key,count:number(r.count)})),actions:actions.map(r=>({key:r.key,label:r.key,count:number(r.count)})),funnel:[{key:'selected',label:'Seleccionados por GLM',count:selected},{key:'reviewed_selected',label:'Con decisión humana concluyente',count:qualityDenominator},{key:'relevant_selected',label:'Confirmados relevantes',count:number(alert.confirmed_relevant)},{key:'cases',label:'Convertidos en caso (todos los cruces)',count:number(alert.cases)}]},
 limitations:['La actividad anterior a la instrumentación solo conserva modificaciones auditadas y sesiones aún existentes; ausencia de eventos no significa ausencia de uso.','Las métricas de cartera, alertas, tareas pendientes y plazos reflejan el estado actual; el selector de fechas afecta eventos, completados con fecha, correos y costos.','La precisión humana incluye solo decisiones concluyentes; los casos sin evaluar no son aciertos ni errores. No se estima recuperación de toda la cartera.','Los autores y ejecutores de tareas antiguas desconocidos siguen sin atribución. Las nuevas tareas guardan autor y ejecutor reales.','Las llamadas API antiguas a INAPI/DeQuiénEs/Resend no tienen telemetría física recuperable; OpenRouter conserva ledgers de factibilidad y vigilancia.','Las reservas no son cargos confirmados. Los precios y suscripciones manuales son estimaciones, no importes de una factura sincronizada.','El detalle de llamadas, marcas y plazos está limitado a 500 filas; agregaciones consideran todo el alcance.','Las lecturas no contienen prompts, imágenes, correos de clientes, contraseñas, claves ni contenido de expedientes.']};
 report.costs.nextMonthWeeklyEstimateUsd=nextWeeklyEstimate;
 report.costs.metrics.push(metric('weekly_projection','Proyección GLM para cuatro lunes',nextWeeklyEstimate,'usd',nextWeeklyEstimate===null?'Requiere al menos dos corridas semanales completas, enviadas y con todos sus cargos confirmados por estudio.':`Promedio de ${number(weeklyForecast.samples)} corridas completas en ${number(weeklyForecast.organizations)} estudios con ≥2 muestras ×4. Excluye estudios sin evidencia suficiente, tarifas de correo y fijos; no garantiza demanda futura.`,'partial'));
 report.costs.metrics.find(m=>m.key==='cost_per_call')!.note='Costo conocido + estimado / todas las llamadas observadas; puede subestimar el costo real si faltan tarifas.';
 report.costs.metrics.find(m=>m.key==='cost_per_call')!.availability='partial';
 report.tasks.statuses=report.tasks.statuses.map(s=>({...s,label:analyticsLabel(s.key)}));
 report.behavior.modules=report.behavior.modules.map(s=>({...s,label:analyticsLabel(s.key)}));
 report.behavior.actions=report.behavior.actions.map(s=>({...s,label:analyticsLabel(s.key)}));
 report.behavior.funnel[3]={key:'cases',label:'Alertas seleccionadas y relevantes convertidas en caso',count:number(alert.selected_relevant_cases)};
 report.overview.metrics.find(m=>m.key==='interactions')!.note='Solo clics, cambios y envíos de formularios instrumentados como interaction. La auditoría histórica y las vistas de módulos se presentan separadas.';
 report.apis.metrics.push(metric('unknown_outcome','Intentos con respuesta no confirmada',providers.reduce((n,p)=>n+p.unknownOutcome,0),'count','Incluye interrupciones de red, ausencia de respuesta y reservas históricas; no se cuentan como HTTP exitoso.','partial'));

 checkDeadline();
 return report;
}

/** Calendar-day proration prevents a 31-day month being treated as four weeks. */
export function proratedFixedCosts(rules:AnalyticsCostRule[],scope:AnalyticsScope) {
 let total=0;
 for(const r of rules.filter(r=>r.kind==='fixed_monthly'&&(!scope.organizationId||r.organizationId===scope.organizationId))) {
  const first=[scope.from,r.effectiveFrom].sort().at(-1)!,last=[scope.to,r.effectiveTo??scope.to].sort()[0];
  if(first>last)continue;
  for(let at=new Date(`${first}T12:00:00Z`);at.toISOString().slice(0,10)<=last;at.setUTCDate(at.getUTCDate()+1)) total+=r.amountUsd/new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth()+1,0)).getUTCDate();
 }
 return total;
}

export type CostRuleInput=Omit<AnalyticsCostRule,'id'>;
export async function saveAnalyticsCostRule(input:CostRuleInput,actor:string) {
 const sql=analyticsSql();
 if(input.organizationId&&!(await analyticsDirectory()).organizations.some(o=>o.id===input.organizationId))throw new Error('Organización no disponible');
 const id=randomUUID();
 await sql.begin(async tx=>{
  await tx`INSERT INTO analytics_cost_rules(id,organization_id,provider,operation,kind,amount_usd,label,effective_from,effective_to,created_by)VALUES(${id},${input.organizationId},${input.provider},${input.operation},${input.kind},${input.amountUsd},${input.label},${input.effectiveFrom},${input.effectiveTo},${actor})`;
  const [member]=await tx`SELECT m.organization_id FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=${actor} AND m.role='admin' AND o.slug='estudio-ibieta-ip'`;
  if(!member)throw new Error('Administrador interno no disponible');
  await tx`INSERT INTO audit_events(organization_id,actor_user_id,action,entity_type,entity_id,after_data)VALUES(${member.organization_id},${actor},'analytics.cost_rule_created','analytics_cost_rule',${id},${tx.json(JSON.parse(JSON.stringify(input)))})`;
 });
 await sql`UPDATE analytics_snapshots SET status='queued',requested_at=now() WHERE status NOT IN ('queued','running')`;
 return {id};
}
export async function deleteAnalyticsCostRule(id:string,actor:string) {
 const sql=analyticsSql();
 await sql.begin(async tx=>{
  const [rule]=await tx`DELETE FROM analytics_cost_rules WHERE id=${id} RETURNING id,organization_id,provider,operation,kind,amount_usd,effective_from::text AS effective_from,effective_to::text AS effective_to`;
  if(!rule)return;
  const [member]=await tx`SELECT m.organization_id FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=${actor} AND m.role='admin' AND o.slug='estudio-ibieta-ip'`;
  if(!member)throw new Error('Administrador interno no disponible');
  await tx`INSERT INTO audit_events(organization_id,actor_user_id,action,entity_type,entity_id,before_data)VALUES(${member.organization_id},${actor},'analytics.cost_rule_deleted','analytics_cost_rule',${id},${tx.json(JSON.parse(JSON.stringify(rule)))})`;
 });
 await sql`UPDATE analytics_snapshots SET status='queued',requested_at=now() WHERE status NOT IN ('queued','running')`;return {ok:true};
}
export async function assignAnalyticsBrand(org:string,brand:string,user:string|null,actor:string) {
 const sql=analyticsSql();
 return sql.begin(async tx=>{
  const [b]=await tx`SELECT id FROM brands WHERE id=${brand} AND organization_id=${org} AND archived_at IS NULL FOR UPDATE`;
  if(!b)throw new Error('Marca no disponible en el estudio');
  if(user&&!(await tx`SELECT user_id FROM organization_members WHERE organization_id=${org} AND user_id=${user}`).length)throw new Error('El responsable no pertenece al estudio');
  const [before]=await tx`SELECT user_id FROM analytics_brand_assignments WHERE organization_id=${org} AND brand_id=${brand}`;
  await tx`INSERT INTO analytics_brand_assignments(organization_id,brand_id,user_id,assigned_by)VALUES(${org},${brand},${user},${actor})ON CONFLICT(organization_id,brand_id)DO UPDATE SET user_id=EXCLUDED.user_id,assigned_by=EXCLUDED.assigned_by,assigned_at=now()`;
  await tx`INSERT INTO audit_events(organization_id,actor_user_id,action,entity_type,entity_id,before_data,after_data)VALUES(${org},${actor},'brand.responsible_assigned','brand',${brand},${tx.json({responsibleUserId:before?.user_id??null})},${tx.json({responsibleUserId:user})})`;
  await tx`UPDATE analytics_snapshots SET status='queued',requested_at=now()WHERE status NOT IN ('queued','running')`;
  return {ok:true};
 });
}
