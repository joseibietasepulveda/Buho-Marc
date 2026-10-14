import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { after } from 'next/server';
import postgres from 'postgres';
import { currentIdentity } from './tenant-context';
import { analyticsCaptureEnabled,sanitizedAnalyticsProperties } from './analytics-capture';

type Context={organizationId?:string|null;userId?:string|null;automated?:boolean};
type ApiRow={id:string;organization_id:string|null;user_id:string|null;provider:string;operation:string;model:string|null;source_ref:string|null;started_at:string;duration_ms:number|null;status_code:number|null;outcome:string;properties:Record<string,unknown>};
type EventRow={id:string;organization_id:string;user_id:string|null;module:string;event_name:string;session_id:string|null;occurred_at:string;properties:Record<string,unknown>};
type State={apis:ApiRow[];events:EventRow[];flushing:Promise<void>|null;scheduled:boolean;dropped:number;failed:number;sql:ReturnType<typeof postgres>|null};
const globalState=globalThis as typeof globalThis & {buhoAnalyticsTelemetry?:State};
const state=globalState.buhoAnalyticsTelemetry??= {apis:[],events:[],flushing:null,scheduled:false,dropped:0,failed:0,sql:null};
const context=new AsyncLocalStorage<Context>();
export const runAnalyticsContext=<T>(value:Context,action:()=>T):T=>context.run(value,action);
export function analyticsContext(override:Context={}){
 const identity=currentIdentity(),stored=context.getStore();
 const organizationId=override.organizationId??stored?.organizationId??identity?.organizationId??null;
 const automated=override.automated??stored?.automated??false;
 const userId=Object.hasOwn(override,'userId') ? override.userId??null : Object.hasOwn(stored??{},'userId') ? stored!.userId??null : automated ? null : identity?.userId??null;
 return {organizationId,userId,automated};
}
function enqueue(kind:'apis'|'events',row:ApiRow|EventRow){
 if(!analyticsCaptureEnabled()||!process.env.DATABASE_URL)return;
 if(state.apis.length+state.events.length>=500){state.dropped++;return;}
 if(kind==='apis')state.apis.push(row as ApiRow);else state.events.push(row as EventRow);
 if(state.scheduled)return;state.scheduled=true;
 const flush=async()=>{state.scheduled=false;await flushAnalyticsTelemetry();};
 try{after(flush);}catch{setTimeout(()=>void flush(),250).unref();}
}
export async function flushAnalyticsTelemetry(){
 if(state.flushing)return state.flushing;
 state.flushing=(async()=>{
  const apis=state.apis.splice(0,100),events=state.events.splice(0,100);if(!apis.length&&!events.length)return;
  try {
   state.sql??=postgres(process.env.DATABASE_URL!,{max:1,idle_timeout:10,connect_timeout:2,prepare:false,onnotice(){},connection:{statement_timeout:1000,application_name:'buho-telemetry'}});
   if(apis.length)await state.sql`INSERT INTO analytics_api_calls ${state.sql(apis.map(r=>({...r,properties:state.sql!.json(JSON.parse(JSON.stringify(r.properties)))})))} ON CONFLICT(id) DO NOTHING`;
   if(events.length)await state.sql`INSERT INTO analytics_events ${state.sql(events.map(r=>({...r,properties:state.sql!.json(JSON.parse(JSON.stringify(r.properties)))})))} ON CONFLICT(id) DO NOTHING`;
  }catch{state.failed+=apis.length+events.length;/* Business audit and metered ledgers remain the durable source of truth. */}
 })().finally(()=>{state.flushing=null;if(state.apis.length||state.events.length)setTimeout(()=>void flushAnalyticsTelemetry(),250).unref();});
 return state.flushing;
}
export function telemetryHealth(){return {queued:state.apis.length+state.events.length,dropped:state.dropped,failed:state.failed};}
export async function closeAnalyticsTelemetry(){await flushAnalyticsTelemetry();if(state.sql){await state.sql.end();state.sql=null;}}
export function captureAnalyticsEvent(event:{id?:string;module:string;eventName:string;sessionId?:string|null;occurredAt?:string;properties?:Record<string,unknown>},override:Context={}){
 const ctx=analyticsContext(override);if(!ctx.organizationId)return;
 enqueue('events',{id:event.id??randomUUID(),organization_id:ctx.organizationId,user_id:ctx.userId,module:event.module,event_name:event.eventName,session_id:event.sessionId??null,occurred_at:event.occurredAt??new Date().toISOString(),properties:sanitizedAnalyticsProperties({...event.properties,automated:ctx.automated})});
}
/** Measures the existing physical request only: no response clone, payload inspection or awaited database operation. */
export async function analyticsFetch(details:{provider:string;operation:string;model?:string;sourceRef?:string;properties?:Record<string,unknown>;context?:Context},url:string,init:RequestInit,fetcher:typeof fetch=fetch){
 if(!analyticsCaptureEnabled())return fetcher(url,init);
 const ctx=analyticsContext(details.context),started=new Date(),clock=performance.now();
 const row:ApiRow={id:randomUUID(),organization_id:ctx.organizationId,user_id:ctx.userId,provider:details.provider,operation:details.operation,model:details.model??null,source_ref:details.sourceRef??null,started_at:started.toISOString(),duration_ms:null,status_code:null,outcome:'unknown',properties:sanitizedAnalyticsProperties({...details.properties,automated:ctx.automated,http_request:true})};
 try{const response=await fetcher(url,init);row.status_code=response.status;row.outcome=response.ok?'success':'error';return response;}
 catch(error){row.outcome='unknown';throw error;}
 finally{row.duration_ms=Math.max(0,Math.round(performance.now()-clock));enqueue('apis',row);}
}
export function analyticsFetcher(details:Parameters<typeof analyticsFetch>[0],fetcher:typeof fetch=fetch):typeof fetch{
 return (input,init)=>analyticsFetch(details,typeof input==='string'?input:input instanceof URL?input.href:input.url,init??{},fetcher);
}
