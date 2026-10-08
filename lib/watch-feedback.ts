import { z } from 'zod';
export const watchFeedbackInput=z.object({matchId:z.string().min(1).max(30),vote:z.enum(['up','down']),rationale:z.string().trim().max(2000).optional()}).strict();
export type WatchFeedbackValue={vote:'up'|'down';rationale:string;delivery:'pending'|'sent'|'waiting_search'};
export function feedbackRequest(row:{search_id:string;actor_user_id:string;organization_id:string;offered_application_id:string;vote:string;rationale:string}){
  return {search_id:row.search_id,judge:{kind:'human',id:`${row.organization_id}/${row.actor_user_id}`},judgments:[{application_id:Number(row.offered_application_id),grade:row.vote==='up'?2:0,...(row.rationale?{rationale:row.rationale}:{})}]};
}
const acknowledgement=z.object({search_id:z.uuid(),accepted:z.array(z.object({application_id:z.number().int(),grade:z.number().int().min(0).max(4)}))});
export async function sendWatchFeedback(row:Parameters<typeof feedbackRequest>[0],fetcher:typeof fetch=fetch){
  const body=feedbackRequest(row);
  const response=await fetcher('https://dequienes.cl/inapi/trademarks/search/feedback',{method:'POST',headers:{'x-api-key':process.env.INAPI_API_KEY!,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Feedback pendiente: HTTP ${response.status}`);
  const value=acknowledgement.parse(await response.json());
  if(value.search_id!==body.search_id||!value.accepted.some(item=>item.application_id===body.judgments[0].application_id&&item.grade===body.judgments[0].grade))throw new Error('El proveedor no confirmó la valoración enviada.');
}
