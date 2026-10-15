import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import {drizzle} from 'drizzle-orm/postgres-js';
import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {getSql} from '../db/index.ts';
import {enqueueDigest,processDigestJob,digestAccounting,DigestBudgetError,digestRun,enqueueScheduledDigests,retryDigestEmail} from '../db/watch-digest.ts';
import {readDigestAgenda} from '../db/watch-digest-data.ts';
import {createSession} from '../lib/auth.ts';
import {mark,decision} from './fixtures/watch-digest.mjs';
import {digestHash,DIGEST_MODEL,DIGEST_PROMPT_VERSION} from '../lib/watch-digest.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')) {const target=new URL(`../${specifier.slice(2)}`,import.meta.url);return next(existsSync(path.join(target.pathname,'index.ts')) ? `${target}/index.ts` : `${target}.ts`,context);}return next(specifier,context);}});

test('durable digest: new-only, cap, state filtering, leases, cost guard, outbox replay and authenticated tenant isolation',{timeout:120000},async()=>{
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 const directory=await mkdtemp(path.join(os.tmpdir(),'buho-digest-test-'));
 const pg=new EmbeddedPostgres({databaseDir:path.join(directory,'pg'),user:'postgres',password:'isolated-digest',port,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog(){},onError(){}});let sql;
 try {
  await pg.initialise();await pg.start();await pg.createDatabase('digest_test');
  process.env.DATABASE_URL=`postgresql://postgres:isolated-digest@127.0.0.1:${port}/digest_test`;
  Object.assign(process.env,{SOURCE_PROVIDER:'inapi',OPENROUTER_WATCH_API_KEY:'fake-watch',RESEND_API_KEY:'fake-resend',RESEND_DELIVERY_ENABLED:'true',WATCH_DIGEST_ENABLED:'false',APP_PUBLIC_ORIGIN:'https://app.example',WATCH_GLM_RUN_BUDGET_USD:'1',WATCH_GLM_MONTHLY_BUDGET_USD:'10'});
  const migration=postgres(process.env.DATABASE_URL,{max:1,onnotice(){}});await migrate(drizzle(migration),{migrationsFolder:'drizzle'});await migration.end();sql=getSql();
  const [org]=await sql`INSERT INTO organizations(name,slug) VALUES('Digest test','digest-test') RETURNING id`;
  const [other]=await sql`INSERT INTO organizations(name,slug) VALUES('Other test','digest-other') RETURNING id`;
  const [internal]=await sql`INSERT INTO organizations(name,slug) VALUES('Internal test','estudio-ibieta-ip') RETURNING id`;
  const [user]=await sql`INSERT INTO users(name,email,initials,must_change_password) VALUES('Test user','digest-test@example.invalid','TU',false) RETURNING id`;
  for(const o of [org,other,internal]) await sql`INSERT INTO organization_members(organization_id,user_id,role) VALUES(${o.id},${user.id},'admin')`;
  let sequence=0;
  async function brand(o,id) {const [b]=await sql`INSERT INTO brands(organization_id,public_code,name,word_mark,owner_name,monitoring_config) VALUES(${o.id},${`MA-${id}`},'ALBA','ALBA','Test',${sql.json({provider:'inapi',monitoringEnabled:true})}) RETURNING id`;return b.id;}
  async function add(b,status='En trámite',o=org) {
   sequence++;const hit={...mark(String(9100000+sequence),`ALBA ${sequence}`,{status}),score:.95,channels:[],history:[]};
   const [m]=await sql`INSERT INTO matches(organization_id,brand_id,public_code,source,source_record_id,application_number,found_name,applicant,level,total_score,explanation,evidence)
     VALUES(${o.id},${b},${`CO-${sequence}`},'DeQuiénEs',${hit.applicationId},${hit.applicationId},${hit.name},'Test','Alta',95,'Test',${sql.json({query:mark(),hit,fetchedAt:'2026-10-12T11:00:00Z'})}) RETURNING id`;
   return m.id;
  }
  const b=await brand(org,1);const good=await add(b);const bad=await add(b);await add(b,'Registrada');await add(b,'Caducada');
  const [legalCase]=await sql`INSERT INTO cases(organization_id,public_code,title,description,brand_id,next_deadline,stage,client_name) VALUES(${org.id},'CA-TEST','Test case','Plazo: Contestar observación',${b},'2026-10-20','Preparación','Cliente de prueba') RETURNING id`;
  await sql`INSERT INTO case_tasks(organization_id,case_id,title,due_at,status) VALUES(${org.id},${legalCase.id},'Tarea pendiente','2026-10-15T12:00:00Z','pending'),(${org.id},${legalCase.id},'Tarea completada','2026-10-15T12:00:00Z','completed')`;
  const now=new Date('2026-10-13T12:00:00Z');
  assert.deepEqual((await readDigestAgenda(org.id,now)).map(e=>e.title),['Tarea pendiente','Contestar observación']);
  const initial=await enqueueDigest(org.id,'manual','manual:test',user.id,now);assert.equal((await enqueueDigest(org.id,'manual','manual:test',user.id,now)).id,initial.id);
  let modelCalls=0,sendCalls=0;const bodies=[];
  let loseResponse=true;
  const fetcher=async(url,init)=>{
   if(url==='https://openrouter.ai/api/v1/chat/completions') {modelCalls++;const content=JSON.parse(init.body).messages[1].content;const ids=content.filter(p=>p.type==='text'&&p.text.startsWith('CANDIDATA')).map(p=>p.text.slice(10,p.text.indexOf(':')));return Response.json({id:`glm-${modelCalls}`,usage:{cost:.0005},choices:[{finish_reason:'stop',message:{content:JSON.stringify({decisions:ids.map(id=>decision(id,id==='CO-1'))})}}]});}
   assert.equal(url,'https://api.resend.com/emails');sendCalls++;bodies.push({body:init.body,key:init.headers['Idempotency-Key']});if(loseResponse){loseResponse=false;throw new Error('response lost after acceptance');}return Response.json({id:'resend-test'});
  };
  const options={now,fetcher,imageLoader:async()=>null};
  await processDigestJob(options);assert.equal(modelCalls,1);assert.equal((await sql`SELECT count(*)::int AS n FROM watch_glm_decisions WHERE run_id=${initial.id}`)[0].n,2);
  await processDigestJob(options);assert.equal(sendCalls,1);assert.equal((await sql`SELECT status FROM watch_digest_runs WHERE id=${initial.id}`)[0].status,'retry');
  await sql`UPDATE watch_digest_runs SET available_at=now()-interval '1 second' WHERE id=${initial.id}`;
  await processDigestJob(options);assert.equal(sendCalls,2);assert.equal(modelCalls,1);assert.equal(bodies[0].key,bodies[1].key);assert.equal(Buffer.from(bodies[0].body).equals(Buffer.from(bodies[1].body)),true,'frozen outbox body must be byte-identical after a database reload');
  const first=await digestRun(org.id,initial.id);assert.equal(first.status,'sent');assert.equal(first.payload.crosses.length,1);assert.equal(first.payload.agenda.length,2);assert.equal(first.payload.crosses[0].matchId,good);
  assert.equal(await digestRun(other.id,initial.id),null);
  // Source refresh of the same saved pair must not change its canonical decision.
  await sql`UPDATE matches SET total_score=99,updated_at=now() WHERE id=${good}`;
  const empty=await enqueueDigest(org.id,'manual','manual:second',user.id,now);await processDigestJob(options);assert.equal(modelCalls,1);
  assert.equal((await digestRun(org.id,empty.id)).payload.crosses.length,0);assert.equal(sendCalls,3);
  // Unknown costs reserve the upper bound, and competing workers cannot overspend the global cap.
  const accounting=digestAccounting(org.id,empty.id,now);process.env.WATCH_GLM_MONTHLY_BUDGET_USD='.1';
  const reserves=await Promise.allSettled([accounting.reserve(.06,'budget-a'),accounting.reserve(.06,'budget-b')]);
  assert.equal(reserves.filter(r=>r.status==='fulfilled').length,1);assert.ok(reserves.some(r=>r.status==='rejected'&&r.reason instanceof DigestBudgetError));process.env.WATCH_GLM_MONTHLY_BUDGET_USD='10';
  // All untouched marks share the hard manual cap, even when stored stock exceeds it.
  for(let i=2;i<=32;i++){const id=await brand(org,i);for(let n=0;n<12;n++)await add(id);}
  const capped=await enqueueDigest(org.id,'manual','manual:cap',user.id,now);
  const [cap]=await sql`SELECT jsonb_array_length(candidate_ids)::int AS n,available FROM watch_digest_runs WHERE id=${capped.id}`;assert.equal(cap.n,62);assert.equal(cap.available,372);
  // Before making an HTTP request the outbox is marked uncertain; stale claims cannot duplicate after 24 h.
  await sql`UPDATE watch_digest_runs SET status='sending',email=${sql.json(JSON.parse(bodies[0].body))},first_send_at=now()-interval '25 hours',delivery_uncertain=true WHERE id=${capped.id}`;
  await processDigestJob({fetcher:()=>{throw new Error('stale uncertain mail must not fetch');},imageLoader:async()=>null});
  assert.equal((await sql`SELECT status FROM watch_digest_runs WHERE id=${capped.id}`)[0].status,'uncertain');
  await assert.rejects(retryDigestEmail(org.id,capped.id),/confirma en Resend/);
  // Budget stop preserves undecided matches and emails an explicitly incomplete summary.
  process.env.WATCH_GLM_RUN_BUDGET_USD='.000001';const stopped=await enqueueDigest(org.id,'manual','manual:stop',user.id,now);await processDigestJob(options);await processDigestJob(options);
  const stoppedRun=await digestRun(org.id,stopped.id);assert.equal(stoppedRun.payload.limited,true);assert.equal(stoppedRun.payload.evaluated,0);assert.equal(modelCalls,1);process.env.WATCH_GLM_RUN_BUDGET_USD='1';
  // Local time schedule creates one durable slot per tenant, including restarts.
  process.env.WATCH_DIGEST_ENABLED='true';await enqueueScheduledDigests(now);await enqueueScheduledDigests(now);
  assert.equal((await sql`SELECT count(*)::int AS n FROM watch_digest_runs WHERE organization_id=${org.id} AND idempotency_key='weekly:2026-10-12'`)[0].n,1);process.env.WATCH_DIGEST_ENABLED='false';
  let networkAttempts=0;
  await processDigestJob({now,imageLoader:async()=>null,fetcher:async()=>{networkAttempts++;throw new TypeError('fetch failed',{cause:Object.assign(new Error('DNS failed'),{code:'ENOTFOUND'})});}});
  assert.equal(networkAttempts,1);
  const [outage]=await sql`SELECT r.status,r.cursor,c.cost_usd FROM watch_digest_runs r JOIN watch_glm_calls c ON c.run_id=r.id WHERE r.idempotency_key='weekly:2026-10-12' ORDER BY c.started_at DESC LIMIT 1`;
  assert.equal(outage.status,'failed');assert.equal(outage.cursor,0);assert.equal(Number(outage.cost_usd),0);
  const adminRoute=await import('../app/api/watch/digest/admin/route.ts'),clientRoute=await import('../app/api/watch/digest/route.ts'),workerRoute=await import('../app/api/watch/digest/worker/route.ts');
  const session=await createSession(user.id,org.id),internalSession=await createSession(user.id,internal.id);
  const headers={cookie:`buho_session=${session}`,origin:'https://app.example','content-type':'application/json'};
  assert.equal((await adminRoute.GET(new Request('https://app.example/api/watch/digest/admin',{headers}))).status,403);
  assert.equal((await clientRoute.GET(new Request(`https://app.example/api/watch/digest?run=${initial.id}`,{headers}))).status,200);
  const otherSession=await createSession(user.id,other.id);
  assert.equal((await clientRoute.GET(new Request(`https://app.example/api/watch/digest?run=${initial.id}&organizationId=${org.id}`,{headers:{cookie:`buho_session=${otherSession}`}}))).status,404);
  assert.equal((await clientRoute.GET(new Request(`https://app.example/api/watch/digest?run=${initial.id}&organizationId=${org.id}`,{headers:{cookie:`buho_session=${internalSession}`}}))).status,200);
  assert.equal((await adminRoute.POST(new Request('https://app.example/api/watch/digest/admin',{method:'POST',headers:{cookie:`buho_session=${internalSession}`,origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({action:'run',organizationId:org.id,requestId:crypto.randomUUID()})}))).status,403);
  assert.equal((await workerRoute.POST(new Request('https://app.example/api/watch/digest/worker',{method:'POST'}))).status,403);
  assert.equal((await sql`SELECT notified_at FROM watch_glm_decisions WHERE match_id=${bad}`)[0].notified_at,null);
  // Importing an authorized local pilot preserves decisions, costs and unsent positives,
  // without making a provider call. A later digest recovers them without paying again.
  const pilotBrand=await brand(other,101),pilotMatch=await add(pilotBrand,'En trámite',other);
  const [pilotEvidence]=await sql`SELECT public_code,evidence FROM matches WHERE id=${pilotMatch}`;
  const candidate={id:pilotEvidence.public_code,matchId:pilotMatch,brandId:pilotBrand,reference:pilotEvidence.evidence.query,candidate:pilotEvidence.evidence.hit,score:.95,fetchedAt:null};
  const pilotSelection={runId:crypto.randomUUID(),organizationId:other.id,at:now.toISOString(),belowGate:0,groups:[{id:pilotBrand,candidates:[candidate]}]};
  const envelope={selection:pilotSelection,manifest:{model:DIGEST_MODEL,promptVersion:DIGEST_PROMPT_VERSION,budget:.10,selectionHash:digestHash(pilotSelection),crosses:1},
   results:[{brandId:pilotBrand,crosses:[{...candidate,decision:decision(candidate.id),reason:decision(candidate.id).reason,insufficient:false}]}],
   ledger:[{id:crypto.randomUUID(),requestHash:'fixture-call',reserve:.01,result:{cost:.0004},startedAt:now.toISOString(),completedAt:now.toISOString()}],images:[]};
  async function importPilot(environment='9e2891f0-7281-4872-a992-2c48866a782d') {
   const child=spawn(process.execPath,['--import','./tests/ts-loader.mjs','scripts/import-watch-digest-pilot.mjs','--apply'],{env:{...process.env,RAILWAY_ENVIRONMENT_ID:environment},stdio:['pipe','pipe','pipe']});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(envelope));
   const code=await new Promise(resolve=>child.on('close',resolve));return {code,data:output ? JSON.parse(output) : null};
  }
  assert.equal((await importPilot('production')).code,1);
  const imported=await importPilot();assert.equal(imported.code,0);assert.equal(imported.data.noEmailSent,true);assert.equal(imported.data.evaluated,1);
  assert.equal((await importPilot()).data.reused,true);
  assert.equal((await digestRun(other.id,pilotSelection.runId)).status,'prepared');
  assert.equal((await sql`SELECT count(*)::int AS n FROM watch_glm_calls WHERE run_id=${pilotSelection.runId}`)[0].n,1);
  const recovered=await enqueueDigest(other.id,'manual','manual:recover-pilot',user.id,now);
  await processDigestJob(options);assert.equal(modelCalls,1);assert.equal((await digestRun(other.id,recovered.id)).payload.crosses.length,1);
 } finally {if(sql)await sql.end();await pg.stop().catch(()=>{});await rm(directory,{recursive:true,force:true});}
});
