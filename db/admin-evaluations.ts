import type { Sql } from 'postgres';
import type { AnalyticsScope } from '../lib/admin-analytics';
import type { EvaluationCounts,EvaluationFilter,EvaluationRow,EvaluationUserCounts,EvaluationsPage } from '../lib/admin-evaluations';

/** Read the durable records, not transport retries nor the observer's clicks. */
export function evaluationHistory(sql:Sql,scope:AnalyticsScope,allDates=false,asOf:string|null=null){
 const org=scope.organizationId,user=scope.userId;
 return sql`WITH formal_history AS (
 SELECT 'formal:'||r.id::text AS id,r.organization_id,r.match_id,r.reviewer_id AS user_id,r.created_at AS at,'formal'::text AS source,r.decision,
 COALESCE(r.comment,'') AS comment,COALESCE(r.reason,'') AS reason,
 CASE WHEN r.reviewer_id IS NOT NULL THEN lag(COALESCE(r.comment,''))OVER(PARTITION BY r.organization_id,r.match_id,r.reviewer_id ORDER BY r.created_at,r.id) END AS before_comment,
 CASE WHEN r.reviewer_id IS NOT NULL THEN lag(COALESCE(r.reason,''))OVER(PARTITION BY r.organization_id,r.match_id,r.reviewer_id ORDER BY r.created_at,r.id) END AS before_reason,
 CASE WHEN r.reviewer_id IS NOT NULL THEN lag(r.decision)OVER(PARTITION BY r.organization_id,r.match_id,r.reviewer_id ORDER BY r.created_at,r.id) END AS before_vote,CASE WHEN jsonb_typeof(r.comparison_snapshot->'score')='number' THEN (r.comparison_snapshot->>'score')::float8 WHEN jsonb_typeof(r.comparison_snapshot->'hit'->'score')='number' THEN (r.comparison_snapshot->'hit'->>'score')::float8*100 END AS score,false AS snapshot
 FROM match_reviews r WHERE (${org}::uuid IS NULL OR r.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR r.reviewer_id=${user}::uuid)
 ), raw_history AS (
 SELECT * FROM formal_history
 UNION ALL
 SELECT 'feedback:'||a.id::text,a.organization_id,a.entity_id,a.actor_user_id,a.occurred_at,'feedback',a.after_data->>'vote',
 COALESCE(a.after_data->>'rationale',''),'',COALESCE(a.before_data->>'rationale',''),'',a.before_data->>'vote',
 CASE WHEN jsonb_typeof(a.after_data->'score')='number' THEN (a.after_data->>'score')::float8*100 END,false
 FROM audit_events a WHERE a.action='watch.feedback' AND a.after_data->>'vote' IN ('up','down') AND (${org}::uuid IS NULL OR a.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR a.actor_user_id=${user}::uuid)
 UNION ALL
 SELECT 'snapshot:'||f.id::text,f.organization_id,f.match_id,f.actor_user_id,f.updated_at,'feedback_snapshot',f.vote,f.rationale,'','', '',NULL::text,f.score::float8*100,true
 FROM watch_feedback f WHERE (${org}::uuid IS NULL OR f.organization_id=${org}::uuid) AND (${user}::uuid IS NULL OR f.actor_user_id=${user}::uuid)
 AND NOT EXISTS(SELECT 1 FROM audit_events a WHERE a.organization_id=f.organization_id AND a.entity_id=f.match_id AND a.actor_user_id=f.actor_user_id AND a.action='watch.feedback' AND a.after_data->>'vote' IN ('up','down'))
 ), classified AS (
 SELECT h.*,CASE WHEN decision IN ('up','En seguimiento','Convertida en caso') THEN 'positive' WHEN decision IN ('down','Descartada') THEN 'negative' ELSE 'neutral' END AS outcome,
 CASE WHEN source IN ('feedback','formal') AND decision=before_vote AND (comment<>COALESCE(before_comment,'') OR reason<>COALESCE(before_reason,'')) THEN 'comment' ELSE 'evaluation' END AS kind,
 CASE WHEN snapshot THEN false ELSE comment<>COALESCE(before_comment,'') OR reason<>COALESCE(before_reason,'') END AS comment_changed
 FROM raw_history h
 ), conclusions AS (
 SELECT id,lag(outcome)OVER(PARTITION BY organization_id,match_id,user_id ORDER BY at,id) AS previous_outcome,
 lag(decision)OVER(PARTITION BY organization_id,match_id,user_id ORDER BY at,id) AS previous_decision,
 lag(at)OVER(PARTITION BY organization_id,match_id,user_id ORDER BY at,id) AS previous_at
 FROM classified WHERE kind='evaluation' AND outcome<>'neutral' AND NOT snapshot AND user_id IS NOT NULL AND match_id IS NOT NULL
 ), history AS (
 SELECT h.*,c.previous_decision,(COALESCE(c.previous_outcome<>h.outcome AND c.previous_at<h.at,false) OR c.previous_outcome IS NULL AND h.user_id IS NOT NULL AND h.match_id IS NOT NULL AND h.source='feedback' AND h.kind='evaluation' AND h.before_vote IN ('up','down') AND h.decision<>h.before_vote) AS opinion_changed
 FROM classified h LEFT JOIN conclusions c ON c.id=h.id
 ), period AS (
 SELECT * FROM history WHERE (${allDates} OR at>=(${scope.from}::date::timestamp AT TIME ZONE 'America/Santiago') AND at<((${scope.to}::date+1)::timestamp AT TIME ZONE 'America/Santiago')) AND (${asOf}::timestamptz IS NULL OR at<=${asOf}::timestamptz)
 )`;
}
const asNumber=(value:unknown)=>Number(value??0);
function counts(row:Record<string,unknown>):EvaluationCounts{return {evaluations:asNumber(row.evaluations),uniqueCrosses:asNumber(row.unique_crosses),records:asNumber(row.records),thumbsUp:asNumber(row.thumbs_up),thumbsDown:asNumber(row.thumbs_down),formalEvaluations:asNumber(row.formal_evaluations),opinionChanges:asNumber(row.opinion_changes),commentUpdates:asNumber(row.comment_updates),commentOnly:asNumber(row.comment_only),snapshots:asNumber(row.snapshots)};}
const countColumns=(sql:Sql)=>sql`count(*)FILTER(WHERE kind='evaluation')::int AS evaluations,count(DISTINCT match_id)FILTER(WHERE kind='evaluation' AND outcome<>'neutral')::int AS unique_crosses,count(*)::int AS records,
 count(*)FILTER(WHERE kind='evaluation' AND decision='up')::int AS thumbs_up,count(*)FILTER(WHERE kind='evaluation' AND decision='down')::int AS thumbs_down,
 count(*)FILTER(WHERE source='formal' AND kind='evaluation')::int AS formal_evaluations,count(*)FILTER(WHERE opinion_changed)::int AS opinion_changes,
 count(*)FILTER(WHERE comment_changed)::int AS comment_updates,count(*)FILTER(WHERE kind='comment')::int AS comment_only,count(*)FILTER(WHERE snapshot)::int AS snapshots`;
export async function evaluationSummary(sql:Sql,scope:AnalyticsScope){
 const history=evaluationHistory(sql,scope);
 const [row]=await sql`${history} SELECT ${countColumns(sql)} FROM period`;
 const users=await sql`${history} SELECT organization_id,user_id,${countColumns(sql)} FROM period GROUP BY organization_id,user_id`;
 return {totals:counts(row),users:users.map(r=>({...counts(r),organizationId:String(r.organization_id),userId:r.user_id?String(r.user_id):null})) as EvaluationUserCounts[]};
}

export async function readEvaluations(sql:Sql,scope:AnalyticsScope,filters:EvaluationFilter):Promise<EvaluationsPage>{
 const asOf=filters.asOf??new Date().toISOString(),history=evaluationHistory(sql,scope,filters.allDates,asOf),pattern=`%${filters.search.replace(/[\\%_]/g,'\\$&')}%`;
 const [result]=await sql`${history}, filtered AS (
 SELECT p.*,o.name AS organization,u.name AS username,m.public_code AS match_code,b.name AS reference,m.found_name AS candidate,
 COALESCE(b.monitoring_config->>'applicationNumber',a.after_data->>'ownApplicationId') AS own_application,COALESCE(m.application_number,a.after_data->>'offeredApplicationId') AS candidate_application,
 COALESCE(p.score,m.total_score::float8) AS algorithm_score,(p.score IS NOT NULL AND NOT p.snapshot) AS score_at_evaluation
 FROM period p JOIN organizations o ON o.id=p.organization_id LEFT JOIN users u ON u.id=p.user_id
 LEFT JOIN audit_events a ON a.id=CASE WHEN p.source='feedback' THEN substring(p.id from 10)::uuid END
 LEFT JOIN matches m ON m.id=p.match_id AND m.organization_id=p.organization_id LEFT JOIN brands b ON b.id=m.brand_id AND b.organization_id=m.organization_id
 WHERE (${filters.source}='all' OR (${filters.source}='formal' AND p.source='formal') OR (${filters.source}='feedback' AND p.source<>'formal'))
 AND (${filters.outcome}='all' OR p.outcome=${filters.outcome}) AND (${filters.focus}='all' OR (${filters.focus}='changes' AND p.opinion_changed) OR (${filters.focus}='comments' AND (p.comment<>'' OR p.reason<>'' OR COALESCE(p.before_comment,'')<>'' OR COALESCE(p.before_reason,'')<>'')))
 AND (${filters.matchId}::uuid IS NULL OR p.match_id=${filters.matchId}::uuid)
 AND (${filters.search}='' OR b.name ILIKE ${pattern} OR m.found_name ILIKE ${pattern} OR m.application_number ILIKE ${pattern} OR b.monitoring_config->>'applicationNumber' ILIKE ${pattern} OR p.comment ILIKE ${pattern} OR p.reason ILIKE ${pattern} OR p.before_comment ILIKE ${pattern} OR p.before_reason ILIKE ${pattern})
 ) SELECT (SELECT count(*)::int FROM filtered) AS total,COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.at DESC,r.id DESC) FROM (SELECT * FROM filtered ORDER BY at DESC,id DESC LIMIT ${filters.pageSize} OFFSET ${(filters.page-1)*filters.pageSize})r),'[]'::jsonb) AS rows`;
 const rows=(result.rows as Record<string,unknown>[]).map(r=>({id:String(r.id),organizationId:String(r.organization_id),organization:String(r.organization),userId:r.user_id?String(r.user_id):null,user:r.username?String(r.username):null,
 matchId:r.match_id?String(r.match_id):null,matchCode:r.match_code?String(r.match_code):null,reference:r.reference?String(r.reference):null,candidate:r.candidate?String(r.candidate):null,ownApplication:r.own_application?String(r.own_application):null,candidateApplication:r.candidate_application?String(r.candidate_application):null,
 at:new Date(String(r.at)).toISOString(),source:r.source,kind:r.kind,decision:String(r.decision),outcome:r.outcome,previousDecision:r.previous_decision?String(r.previous_decision):r.before_vote?String(r.before_vote):null,
 opinionChanged:r.opinion_changed===true,commentChanged:r.comment_changed===true,comment:String(r.comment??''),previousComment:String(r.before_comment??''),reason:String(r.reason??'').trim(),previousReason:String(r.before_reason??'').trim(),score:r.algorithm_score===null?null:Number(r.algorithm_score),scoreAtEvaluation:r.score_at_evaluation===true,snapshot:r.snapshot===true})) as EvaluationRow[];
 const total=Number(result.total);
 return {scope,filters:{...filters,asOf},rows,total,page:filters.page,pageSize:filters.pageSize,pages:Math.ceil(total/filters.pageSize),coverage:'Historial de decisiones y bitácora de 👍/👎. Editar solo un comentario no suma otra evaluación. Un estado sin bitácora se señala como parcial y su fecha corresponde a la actualización guardada. Los cambios comparan la evaluación concluyente anterior del mismo abogado, incluso fuera del período. Los nombres de las marcas son los actualmente guardados.'};
}
