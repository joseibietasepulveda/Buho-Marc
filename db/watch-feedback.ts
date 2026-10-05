import { randomUUID } from 'node:crypto';
import { getSql } from './index';
import { actorId, organizationId } from '../lib/tenant-context';
import { searchSimilar, similarityConfigured } from '../lib/similarity-provider';
import { sendWatchFeedback, type watchFeedbackInput, type WatchFeedbackValue } from '../lib/watch-feedback';
import type { z } from 'zod';
const validSearch=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?value:null;
export async function saveWatchFeedback(input:z.infer<typeof watchFeedbackInput>){
 const sql=getSql(),org=organizationId(),actor=actorId();
 const row=await sql.begin(async tx=>{
  const [match]=await tx`SELECT m.id,m.evidence,m.application_number,b.monitoring_config FROM matches m JOIN brands b ON b.id=m.brand_id AND b.organization_id=m.organization_id WHERE m.organization_id=${org} AND m.public_code=${input.matchId} AND m.source='DeQuiénEs' AND b.archived_at IS NULL FOR UPDATE OF m`;
  if(!match)throw new Error('No encontramos esta coincidencia en tu cartera.');
  const own=String(match.monitoring_config.applicationNumber??''),offered=String(match.application_number),score=Number(match.evidence?.hit?.score);
  if(!/^\d+$/.test(own)||!/^\d+$/.test(offered)||!Number.isFinite(score)||score<0||score>1)throw new Error('Esta coincidencia no tiene antecedentes suficientes para valorar.');
  const [previous]=await tx`SELECT * FROM watch_feedback WHERE organization_id=${org} AND match_id=${match.id} AND actor_user_id=${actor}`;
  const rationale=input.rationale??previous?.rationale??'',searchId=validSearch(match.evidence?.hit?.searchId)||previous?.search_id||null;
  const [saved]=await tx`INSERT INTO watch_feedback(organization_id,match_id,actor_user_id,own_application_id,offered_application_id,score,search_id,vote,rationale) VALUES(${org},${match.id},${actor},${own},${offered},${score},${searchId},${input.vote},${rationale}) ON CONFLICT(organization_id,match_id,actor_user_id) DO UPDATE SET vote=EXCLUDED.vote,rationale=EXCLUDED.rationale,score=EXCLUDED.score,search_id=EXCLUDED.search_id,delivery='pending',version=watch_feedback.version+1,attempts=0,available_at=now(),sent_at=NULL,updated_at=now() RETURNING *`;
  await tx`INSERT INTO audit_events(organization_id,actor_user_id,entity_type,entity_id,action,before_data,after_data) VALUES(${org},${actor},'match',${match.id},'watch.feedback',${previous?tx.json({vote:previous.vote,rationale:previous.rationale}):null},${tx.json({vote:input.vote,rationale,ownApplicationId:own,offeredApplicationId:offered,score})})`;
  return saved;
 });
 // The transaction is durable. External delivery must never delay the response.
 return {id:String(row.id),feedback:{vote:row.vote,rationale:row.rationale,delivery:row.delivery} as WatchFeedbackValue};
}
export async function deliverWatchFeedback(id?:string){
 if(!similarityConfigured())return {skipped:true};
 const sql=getSql(),lease=randomUUID();
 const row=await sql.begin(async tx=>{
  const [ready]=await tx`SELECT * FROM watch_feedback WHERE delivery='pending' AND available_at<=now() AND (lease_until IS NULL OR lease_until<now()) AND (${!id} OR id=${id??null}::uuid) ORDER BY available_at LIMIT 1 FOR UPDATE SKIP LOCKED`;
  if(!ready)return null;
  await tx`UPDATE watch_feedback SET lease_token=${lease},lease_until=now()+interval '3 minutes',attempts=attempts+1 WHERE id=${ready.id}`;
  return ready;
 });
 if(!row)return {skipped:true};
 try{
  let searchId=row.search_id;
  if(!searchId){
   const result=await searchSimilar({application_id:Number(row.own_application_id),limit:100,grouped:false});
   searchId=result.results.some(hit=>hit.applicationId===row.offered_application_id)?validSearch(result.searchId):null;
   if(!searchId){await sql`UPDATE watch_feedback SET delivery=CASE WHEN version=${row.version} THEN 'waiting_search' ELSE 'pending' END,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${row.id} AND lease_token=${lease}`;return {waitingSearch:true};}
  }
  await sendWatchFeedback({search_id:searchId,actor_user_id:row.actor_user_id,organization_id:row.organization_id,offered_application_id:row.offered_application_id,vote:row.vote,rationale:row.rationale});
  await sql`UPDATE watch_feedback SET search_id=CASE WHEN version=${row.version} THEN ${searchId} ELSE search_id END,delivery=CASE WHEN version=${row.version} THEN 'sent' ELSE 'pending' END,sent_at=CASE WHEN version=${row.version} THEN now() ELSE NULL END,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${row.id} AND lease_token=${lease}`;
  return {sent:true};
 }catch{
  await sql`UPDATE watch_feedback SET available_at=CASE WHEN version=${row.version} THEN now()+least(attempts*60,3600)*interval '1 second' ELSE now() END,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${row.id} AND lease_token=${lease}`;
  return {pending:true};
 }
}
