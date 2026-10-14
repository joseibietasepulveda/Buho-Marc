import test, {after, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac, randomUUID} from 'node:crypto';
import {clientAnalyticsBatch, sanitizedAnalyticsProperties} from '../lib/analytics-capture.ts';
import {verifyResendWebhook, resendLifecycleEvent} from '../lib/resend-webhook.ts';
import {runAs} from '../lib/tenant-context.ts';

const previousEnvironment={capture:process.env.ADMIN_ANALYTICS_CAPTURE_ENABLED,database:process.env.DATABASE_URL};
process.env.ADMIN_ANALYTICS_CAPTURE_ENABLED='true';
process.env.DATABASE_URL='postgresql://fixture:fixture@127.0.0.1:1/never-connect';
const telemetry=await import('../lib/analytics-telemetry.ts');
const state=globalThis.buhoAnalyticsTelemetry;
const org=randomUUID(),user=randomUUID();
const identity={organizationId:org,userId:user,name:'Private name',organizationName:'Private organization',role:'member',mustChangePassword:false};
const secret=`whsec_${Buffer.alloc(32,17).toString('base64')}`;
const now=Date.parse('2026-10-14T12:00:00Z');
const sign=(raw,id='msg-fixture',timestamp=String(now/1000))=>new Headers({'svix-id':id,'svix-timestamp':timestamp,'svix-signature':`v1,${createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${timestamp}.${raw}`).digest('base64')}`});
const event=()=>({id:randomUUID(),module:'matches',eventName:'comparison_opened',sessionId:randomUUID(),occurredAt:new Date().toISOString(),properties:{surface:'button',action:'activate'}});
const fakeSql=function(input){return Array.isArray(input)&&Object.hasOwn(input,'raw')?Promise.resolve([]):input;};
fakeSql.json=value=>value;
fakeSql.end=async()=>{};

beforeEach(()=>{
 state.apis.length=0;state.events.length=0;state.scheduled=true;state.flushing=null;state.sql=fakeSql;state.failed=0;state.dropped=0;
 process.env.ADMIN_ANALYTICS_CAPTURE_ENABLED='true';
});
after(async()=>{
 state.apis.length=0;state.events.length=0;await telemetry.closeAnalyticsTelemetry();
 for(const [name,value] of [['ADMIN_ANALYTICS_CAPTURE_ENABLED',previousEnvironment.capture],['DATABASE_URL',previousEnvironment.database]])if(value===undefined)delete process.env[name];else process.env[name]=value;
});

test('client event schema permits only explicit actions and rejects private payloads or client tenant identity',()=>{
 assert.equal(clientAnalyticsBatch.safeParse({events:[event()]}).success,true);
 for(const field of ['body','search','query','email','ip','url','name','coverage','headers','token']){
  const candidate=event();candidate.properties[field]='Private content';
  assert.equal(clientAnalyticsBatch.safeParse({events:[candidate]}).success,false,field);
 }
 for(const field of ['organizationId','userId','actorId']){
  assert.equal(clientAnalyticsBatch.safeParse({events:[{...event(),[field]:randomUUID()}]}).success,false,field);
 }
 assert.equal(clientAnalyticsBatch.safeParse({events:[{...event(),eventName:'poll_completed'}]}).success,false);
 assert.equal(clientAnalyticsBatch.safeParse({events:[{...event(),module:'Private search term'}]}).success,false);
 assert.equal(clientAnalyticsBatch.safeParse({events:Array.from({length:51},event)}).success,false);
});

test('server property sanitizer retains only bounded permitted scalars and UUIDs',()=>{
 const id=randomUUID();
 const safe=sanitizedAnalyticsProperties({automated:true,cached:false,attempt:2,batch_size:5,source:'server',phase:'watch_glm',entity_id:id,body:{private:'request'},search:'Private query',email:'private@example.invalid',ip:'127.0.0.1',url:'https://private.invalid',headers:{authorization:'secret'},input_tokens:NaN,source_ref:'Private identifier'});
 assert.deepEqual(safe,{automated:true,cached:false,attempt:2,batch_size:5,source:'server',phase:'watch_glm',entity_id:id});
 assert.deepEqual(sanitizedAnalyticsProperties({attempt:Infinity,batch_size:{n:1},cached:'true',source:'Private text with spaces',entity_id:'not-a-uuid',action:[]} ),{});
});

test('native Svix verifies the original UTF-8 body, any valid v1 signature and clock tolerance',()=>{
 const raw=JSON.stringify({type:'email.clicked',created_at:'2026-10-14T12:00:00Z',data:{email_id:'fixture',subject:'Privado á ñ'}});
 const valid=sign(raw);
 assert.equal(verifyResendWebhook(raw,valid,secret,now),true);
 const multiple=new Headers(valid);multiple.set('svix-signature',`v2,${Buffer.alloc(32).toString('base64')} v1,${Buffer.alloc(32).toString('base64')} ${valid.get('svix-signature')}`);
 assert.equal(verifyResendWebhook(raw,multiple,secret,now),true);
 assert.equal(verifyResendWebhook(`${raw} `,valid,secret,now),false,'reserialization or changed bytes must fail');
 assert.equal(verifyResendWebhook(raw,valid,`whsec_${Buffer.alloc(32,18).toString('base64')}`,now),false);
 assert.equal(verifyResendWebhook(raw,sign(raw,'msg-expired',String(now/1000-301)),secret,now),false);
 assert.equal(verifyResendWebhook(raw,sign(raw,'msg-future',String(now/1000+301)),secret,now),false);
 assert.equal(verifyResendWebhook(raw,new Headers(),secret,now),false);
 assert.equal(verifyResendWebhook(raw,valid,'not-a-secret',now),false);
});

test('native Svix matches the published official fixture without using real credentials',()=>{
 const raw='{"event_type":"ping","data":{"success":true}}';
 const headers=new Headers({'svix-id':'msg_loFOjxBNrRLzqYUf','svix-timestamp':'1731705121','svix-signature':'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0='});
 assert.equal(verifyResendWebhook(raw,headers,'whsec_plJ3nmyCDGBKInavdOK15jsl',1731705121000),true);
});

test('Resend lifecycle projection discards recipient, subject, IP, user agent, clicked URL and message contents',()=>{
 const input={type:'email.clicked',created_at:'2026-10-14T12:00:00Z',data:{email_id:'fixture',created_at:'2026-10-13T10:00:00Z',to:['private@example.invalid'],subject:'Private subject',click:{ipAddress:'127.0.0.1',link:'https://private.invalid/?token=private',userAgent:'Private browser'},html:'Private content'}};
 assert.deepEqual(resendLifecycleEvent(input),{type:'clicked',emailId:'fixture',occurredAt:input.created_at});
 assert.equal(resendLifecycleEvent({...input,type:'email.sent'}),null,'provider acceptance must not be labelled delivered');
 assert.throws(()=>resendLifecycleEvent({...input,data:{id:'wrong-field'}}));
});

test('analytics transport returns the same Response without reading/cloning its body or waiting for SQL',async()=>{
 let httpCalls=0,dbCalls=0,release;
 const blocked=new Promise(resolve=>{release=resolve;});
 const sql=function(input){if(Array.isArray(input)&&Object.hasOwn(input,'raw')){dbCalls++;return blocked;}return input;};sql.json=value=>value;sql.end=async()=>{};state.sql=sql;
 const response=new Response('Private response',{status:429});
 response.clone=()=>{throw new Error('must not clone body');};response.text=()=>{throw new Error('must not read body');};response.json=()=>{throw new Error('must not read JSON');};
 const request={method:'POST',body:'Private request body',headers:{authorization:'Private token'}};
 const fetched=await runAs(identity,()=>telemetry.analyticsFetch({provider:'fixture',operation:'search',properties:{source:'server',search:'Private query'}},'https://private.invalid/search?email=private@example.invalid',request,async(url,init)=>{httpCalls++;assert.equal(init,request);assert.equal(url,'https://private.invalid/search?email=private@example.invalid');return response;}));
 assert.equal(fetched,response);assert.equal(httpCalls,1);assert.equal(dbCalls,0);
 assert.equal(state.apis[0].organization_id,org);assert.equal(state.apis[0].user_id,user);assert.equal(state.apis[0].status_code,429);assert.equal(state.apis[0].outcome,'error');
 assert.equal(JSON.stringify(state.apis).includes('Private'),false);
 const flushing=telemetry.flushAnalyticsTelemetry();assert.equal(dbCalls,1,'SQL begins only in the independent flush');
 let finished=false;flushing.then(()=>{finished=true;});await Promise.resolve();assert.equal(finished,false);
 release([]);await flushing;
});

test('native request failures are forwarded unchanged once and automation never impersonates an active user',async()=>{
 const failure=new TypeError('fixture network failure');let attempts=0;
 await assert.rejects(runAs(identity,()=>telemetry.runAnalyticsContext({organizationId:org,automated:true,userId:null},()=>telemetry.analyticsFetch({provider:'fixture',operation:'scheduled'},'https://fixture.invalid',{},async()=>{attempts++;throw failure;}))),error=>error===failure);
 assert.equal(attempts,1);assert.equal(state.apis[0].outcome,'unknown');assert.equal(state.apis[0].status_code,null);assert.equal(state.apis[0].user_id,null);assert.equal(state.apis[0].properties.automated,true);
 process.env.ADMIN_ANALYTICS_CAPTURE_ENABLED='false';
 const response=new Response(null,{status:204});assert.equal(await telemetry.analyticsFetch({provider:'fixture',operation:'disabled'},'https://fixture.invalid',{},async()=>response),response);assert.equal(state.apis.length,1);
});

test('capture queue bounds discarded telemetry without blocking business operations',()=>{
 for(let i=0;i<505;i++)telemetry.captureAnalyticsEvent({module:'matches',eventName:'interaction',properties:{email:'private@example.invalid'}},{organizationId:org,userId:user});
 assert.equal(state.events.length,500);assert.equal(telemetry.telemetryHealth().dropped,5);assert.equal(JSON.stringify(state.events).includes('private@example.invalid'),false);
});

test('synthetic in-process benchmark reports median/p95 overhead without external requests',async t=>{
 const response=new Response(null,{status:204});let calls=0;const fetcher=async()=>{calls++;return response;};
 const measure=async enabled=>{
  process.env.ADMIN_ANALYTICS_CAPTURE_ENABLED=String(enabled);const samples=[];
  for(let i=0;i<1100;i++){
   const start=performance.now();await telemetry.analyticsFetch({provider:'fixture',operation:'benchmark'},'https://fixture.invalid',{},fetcher);
   const elapsed=performance.now()-start;if(i>=100)samples.push(elapsed);state.apis.length=0;
  }
  samples.sort((a,b)=>a-b);return {median:samples[499],p95:samples[949]};
 };
 const off=await measure(false),on=await measure(true);assert.equal(calls,2200);assert.equal(state.failed,0);
 assert.ok(Number.isFinite(on.p95));
 t.diagnostic(`Synthetic local telemetry wrapper (1000 samples; mocked HTTP; no DB in request): disabled median ${off.median.toFixed(4)} ms / p95 ${off.p95.toFixed(4)} ms; enabled median ${on.median.toFixed(4)} ms / p95 ${on.p95.toFixed(4)} ms. These are not customer latency measurements.`);
});
