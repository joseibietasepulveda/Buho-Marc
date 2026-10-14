import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createServer} from 'node:net';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import {drizzle} from 'drizzle-orm/postgres-js';
import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {getSql} from '../db/index.ts';
import {createSession} from '../lib/auth.ts';
import {analyticsFetch,captureAnalyticsEvent,flushAnalyticsTelemetry,closeAnalyticsTelemetry,runAnalyticsContext,telemetryHealth} from '../lib/analytics-telemetry.ts';

registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')){const target=new URL(`../${specifier.slice(2)}`,import.meta.url);return next(existsSync(path.join(target.pathname,'index.ts'))?`${target}/index.ts`:`${target}.ts`,context);}return next(specifier,context);}});

test('analytics capture: authenticated tenant event batches, native async transport and verified private Resend lifecycle',{timeout:120000},async()=>{
 const previous={};for(const name of ['DATABASE_URL','SOURCE_PROVIDER','ADMIN_ANALYTICS_CAPTURE_ENABLED','RESEND_WEBHOOK_SECRET','APP_PUBLIC_ORIGIN'])previous[name]=process.env[name];
 const port=await new Promise(resolve=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
 const directory=await mkdtemp(path.join(os.tmpdir(),'buho-analytics-capture-test-'));
 const pg=new EmbeddedPostgres({databaseDir:path.join(directory,'pg'),user:'postgres',password:'isolated-capture',port,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog(){},onError(){}});
 let sql,migration;
 try{
  await pg.initialise();await pg.start();await pg.createDatabase('capture_test');
  Object.assign(process.env,{DATABASE_URL:`postgresql://postgres:isolated-capture@127.0.0.1:${port}/capture_test`,SOURCE_PROVIDER:'inapi',ADMIN_ANALYTICS_CAPTURE_ENABLED:'true',APP_PUBLIC_ORIGIN:'https://app.example'});
  migration=postgres(process.env.DATABASE_URL,{max:1,onnotice(){}});await migrate(drizzle(migration),{migrationsFolder:'drizzle'});await migration.end();migration=null;sql=getSql();
  const [organization]=await sql`INSERT INTO organizations(name,slug)VALUES('Capture fixture A','capture-fixture-a')RETURNING id`;
  const [other]=await sql`INSERT INTO organizations(name,slug)VALUES('Capture fixture B','capture-fixture-b')RETURNING id`;
  const [user]=await sql`INSERT INTO users(name,email,initials,must_change_password)VALUES('Private user A','capture-a@example.invalid','CA',false)RETURNING id`;
  const [foreign]=await sql`INSERT INTO users(name,email,initials,must_change_password)VALUES('Private user B','capture-b@example.invalid','CB',false)RETURNING id`;
  await sql`INSERT INTO organization_members(organization_id,user_id,role)VALUES(${organization.id},${user.id},'member'),(${other.id},${foreign.id},'member')`;
  const session=await createSession(user.id,organization.id),foreignSession=await createSession(foreign.id,other.id);
  const [run]=await sql`INSERT INTO watch_digest_runs(organization_id,idempotency_key,trigger,requested_by,status,resend_id)VALUES(${organization.id},'capture-fixture','manual',${user.id},'sent','resend-capture-fixture')RETURNING id`;
  const [foreignRun]=await sql`INSERT INTO watch_digest_runs(organization_id,idempotency_key,trigger,requested_by,status)VALUES(${other.id},'foreign-fixture','manual',${foreign.id},'prepared')RETURNING id`;
  const ingest=await import('../app/api/analytics/events/route.ts'),webhook=await import('../app/api/resend/webhook/route.ts'),digest=await import('../app/api/watch/digest/route.ts');
  const id=randomUUID(),sessionId=randomUUID();
  const makeEvent=(overrides={})=>({id,module:'matches',eventName:'comparison_opened',sessionId,occurredAt:new Date().toISOString(),properties:{surface:'button',action:'activate'},...overrides});
  const request=(body,cookie=session,origin='https://app.example',extraHeaders={})=>new Request('https://app.example/api/analytics/events',{method:'POST',headers:{...(cookie?{cookie:`buho_session=${cookie}`} : {}),origin,'content-type':'application/json',...extraHeaders},body:typeof body==='string'?body:JSON.stringify(body)});
  assert.equal((await ingest.POST(request({events:[makeEvent()]},null))).status,401);
  assert.equal((await ingest.POST(request({events:[makeEvent()]},'invalid-session'))).status,401);
  assert.equal((await ingest.POST(request({events:[makeEvent()]},session,'https://evil.example'))).status,403);
  assert.equal((await ingest.POST(request({events:[makeEvent({organizationId:other.id})]}))).status,400,'the client cannot choose another organization');
  for(const property of ['body','search','email','ip','url','headers','token'])assert.equal((await ingest.POST(request({events:[makeEvent({properties:{[property]:'Private data'}})]}))).status,400,property);
  assert.equal((await ingest.POST(request({events:[makeEvent()]},session,'https://app.example',{'content-length':'32769'}))).status,413);
  assert.equal((await ingest.POST(request({events:Array.from({length:51},()=>makeEvent())}))).status,400);
  assert.equal((await ingest.POST(request('{bad json'))).status,400);
  const response=await ingest.POST(request({events:[makeEvent(),makeEvent()]}));assert.equal(response.status,202);assert.equal((await response.json()).accepted,2);
  await flushAnalyticsTelemetry();
  const events=await sql`SELECT id,organization_id,user_id,module,event_name,session_id,properties FROM analytics_events WHERE id=${id}`;
  assert.equal(events.length,1,'batch ID deduplication survives retransmission');assert.equal(events[0].organization_id,organization.id);assert.equal(events[0].user_id,user.id);assert.equal(events[0].session_id,sessionId);assert.deepEqual(events[0].properties,{surface:'button',action:'activate',source:'client',automated:false});
  const foreignId=randomUUID();assert.equal((await ingest.POST(request({events:[makeEvent({id:foreignId})]},foreignSession))).status,202);await flushAnalyticsTelemetry();assert.equal((await sql`SELECT organization_id FROM analytics_events WHERE id=${foreignId}`)[0].organization_id,other.id);
  const oldId=randomUUID(),old=await ingest.POST(request({events:[makeEvent({id:oldId,occurredAt:new Date(Date.now()-25*3600000).toISOString()})]}));assert.equal((await old.json()).accepted,0);await flushAnalyticsTelemetry();assert.equal((await sql`SELECT count(*)::int AS n FROM analytics_events WHERE id=${oldId}`)[0].n,0);
  assert.equal((await digest.GET(new Request(`https://app.example/api/watch/digest?run=${run.id}`,{headers:{cookie:`buho_session=${session}`}}))).status,404,'a run without a prepared payload is not a viewed digest');
  await flushAnalyticsTelemetry();assert.equal((await sql`SELECT count(*)::int AS n FROM analytics_events WHERE event_name='digest_viewed'`)[0].n,0);
  await sql`UPDATE watch_digest_runs SET payload='{}' WHERE id IN (${run.id},${foreignRun.id})`;
  assert.equal((await digest.GET(new Request(`https://app.example/api/watch/digest?run=${run.id}`,{headers:{cookie:`buho_session=${session}`}}))).status,200);
  await flushAnalyticsTelemetry();const views=await sql`SELECT organization_id,user_id,module,properties FROM analytics_events WHERE event_name='digest_viewed' AND properties->>'source'='server'`;
  assert.equal(views.length,1);assert.equal(views[0].organization_id,organization.id);assert.equal(views[0].user_id,user.id);assert.equal(views[0].module,'summary');assert.deepEqual(views[0].properties,{source:'server',digest_run_id:run.id,automated:false});
  assert.equal((await digest.GET(new Request(`https://app.example/api/watch/digest?run=${foreignRun.id}&organizationId=${other.id}`,{headers:{cookie:`buho_session=${session}`}}))).status,404,'a real foreign payload cannot bypass tenant isolation');
  await flushAnalyticsTelemetry();assert.equal((await sql`SELECT count(*)::int AS n FROM analytics_events WHERE event_name='digest_viewed' AND properties->>'source'='server'`)[0].n,1);assert.equal((await sql`SELECT count(*)::int AS n FROM analytics_events WHERE event_name='digest_viewed' AND organization_id=${other.id}`)[0].n,0);
  const spoofId=randomUUID(),spoof=await ingest.POST(request({events:[makeEvent({id:spoofId,module:'summary',eventName:'digest_viewed',properties:{digest_run_id:foreignRun.id}})]}));
  if(spoof.status===202){await flushAnalyticsTelemetry();const [clientView]=await sql`SELECT organization_id,properties FROM analytics_events WHERE id=${spoofId}`;assert.equal(clientView.organization_id,organization.id);assert.equal(clientView.properties.source,'client','an untrusted client ID must never become a confirmed server view');}
  else assert.equal(spoof.status,400,'server-only digest views may be rejected by the client event catalog');
  assert.equal((await sql`SELECT count(*)::int AS n FROM analytics_events WHERE event_name='digest_viewed' AND properties->>'source'='server'`)[0].n,1);
  process.env.ADMIN_ANALYTICS_CAPTURE_ENABLED='false';const disabled=await ingest.POST(request({events:[makeEvent({id:randomUUID()})]}));assert.deepEqual(await disabled.json(),{accepted:0,enabled:false});process.env.ADMIN_ANALYTICS_CAPTURE_ENABLED='true';

  let physicalCalls=0;const success=new Response('Private response',{status:200});
  success.clone=()=>{throw new Error('body cloning is forbidden');};success.json=()=>{throw new Error('body inspection is forbidden');};
  const init={method:'POST',body:JSON.stringify({query:'Private search',email:'private@example.invalid'}),headers:{authorization:'Private credential'}};
  const result=await runAnalyticsContext({organizationId:organization.id,userId:user.id},()=>analyticsFetch({provider:'fixture',operation:'physical_search',properties:{source:'server',body:'Private body',search:'Private search'}},'https://fixture.invalid/private?token=private',init,async(url,actual)=>{physicalCalls++;assert.equal(actual,init);assert.equal(url,'https://fixture.invalid/private?token=private');return success;}));
  assert.equal(result,success);
  const failure=new Error('Private failure content');await assert.rejects(runAnalyticsContext({organizationId:other.id,automated:true,userId:null},()=>analyticsFetch({provider:'fixture',operation:'scheduled'},'https://fixture.invalid',{},async()=>{physicalCalls++;throw failure;})),error=>error===failure);
  captureAnalyticsEvent({module:'auth',eventName:'login_succeeded',properties:{source:'server',email:'Private email'}},{organizationId:organization.id,userId:user.id});
  await flushAnalyticsTelemetry();assert.equal(physicalCalls,2,'telemetry adds no retries or external requests');
  const calls=await sql`SELECT organization_id,user_id,operation,status_code,outcome,properties FROM analytics_api_calls ORDER BY operation`;
  assert.equal(calls.length,2);assert.equal(calls[0].organization_id,organization.id);assert.equal(calls[0].status_code,200);assert.equal(calls[0].outcome,'success');assert.equal(calls[1].organization_id,other.id);assert.equal(calls[1].user_id,null);assert.equal(calls[1].outcome,'unknown');assert.equal(calls[1].properties.automated,true);
  assert.equal(JSON.stringify(calls).includes('Private'),false);assert.equal(telemetryHealth().failed,0);

  const secret=`whsec_${Buffer.alloc(32,23).toString('base64')}`;process.env.RESEND_WEBHOOK_SECRET=secret;
  const signedRequest=(value,eventKey=randomUUID(),options={})=>{
   const raw=typeof value==='string'?value:JSON.stringify(value),timestamp=String(Math.floor(Date.now()/1000)+(options.ageSeconds??0));
   const signature=createHmac('sha256',Buffer.from((options.secret??secret).slice(6),'base64')).update(`${eventKey}.${timestamp}.${raw}`).digest('base64');
   return new Request('https://app.example/api/resend/webhook',{method:'POST',headers:{'svix-id':eventKey,'svix-timestamp':timestamp,'svix-signature':`v1,${signature}`,'content-type':'application/json'},body:options.tamper?`${raw} `:raw});
  };
  const lifecycle=(type='email.delivered',emailId='resend-capture-fixture')=>({type,created_at:new Date().toISOString(),data:{email_id:emailId,created_at:'2026-10-01T12:00:00Z',from:'private@example.invalid',to:['private-client@example.invalid'],subject:'Private trademark subject',click:{ipAddress:'192.0.2.1',userAgent:'Private UA',link:'https://private.invalid/client?token=private'},html:'Private content'}});
  const delivered=lifecycle(),eventKey=randomUUID();assert.equal((await webhook.POST(signedRequest(delivered,eventKey))).status,200);assert.equal((await webhook.POST(signedRequest(delivered,eventKey))).status,200);
  assert.equal((await sql`SELECT count(*)::int AS n FROM analytics_email_events WHERE event_key=${eventKey}`)[0].n,1);
  for(const type of ['email.bounced','email.failed','email.opened','email.clicked','email.complained'])assert.equal((await webhook.POST(signedRequest(lifecycle(type)))).status,200);
  const stored=await sql`SELECT event_type,organization_id,run_id,occurred_at,properties FROM analytics_email_events ORDER BY event_type`;
  assert.equal(stored.length,6);assert.deepEqual(stored.map(row=>row.event_type),['bounced','clicked','complained','delivered','failed','opened']);
  for(const row of stored){assert.equal(row.organization_id,organization.id);assert.equal(row.run_id,run.id);assert.deepEqual(row.properties,{source:'resend'});assert.ok(new Date(row.occurred_at).getTime()>Date.parse('2026-10-01T12:00:00Z'),'event timestamp must not use email creation date');}
  for(const forbidden of ['private@example.invalid','Private','192.0.2.1','private.invalid','userAgent','ipAddress','subject'])assert.equal(JSON.stringify(stored).includes(forbidden),false,forbidden);
  assert.equal((await webhook.POST(signedRequest(lifecycle(),randomUUID(),{secret:`whsec_${Buffer.alloc(32,24).toString('base64')}`}))).status,401);
  assert.equal((await webhook.POST(signedRequest(lifecycle(),randomUUID(),{tamper:true}))).status,401);
  assert.equal((await webhook.POST(signedRequest(lifecycle(),randomUUID(),{ageSeconds:-301}))).status,401);
  assert.equal((await webhook.POST(signedRequest(lifecycle(),randomUUID(),{ageSeconds:301}))).status,401);
  assert.equal((await webhook.POST(signedRequest('{bad json'))).status,400);
  assert.equal((await webhook.POST(signedRequest({type:'email.delivered',created_at:new Date().toISOString(),data:{id:'wrong-field'}}))).status,400);
  assert.deepEqual(await (await webhook.POST(signedRequest(lifecycle('email.sent')))).json(),{accepted:true,ignored:true});
  assert.deepEqual(await (await webhook.POST(signedRequest(lifecycle('email.delivered','unknown-provider-id')))).json(),{accepted:true,ignored:true});
  assert.equal((await sql`SELECT count(*)::int AS n FROM analytics_email_events`)[0].n,6,'invalid signatures, unknown email IDs and API acceptance add no delivered rows');
  delete process.env.RESEND_WEBHOOK_SECRET;assert.equal((await webhook.POST(signedRequest(lifecycle()))).status,503);
 }finally{
  await closeAnalyticsTelemetry();if(migration)await migration.end();if(sql)await sql.end();await pg.stop();await rm(directory,{recursive:true,force:true});
  for(const [name,value] of Object.entries(previous))if(value===undefined)delete process.env[name];else process.env[name]=value;
 }
});
