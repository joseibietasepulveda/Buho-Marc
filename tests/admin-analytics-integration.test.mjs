import test from 'node:test';
import assert from 'node:assert/strict';
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
import {analyticsSql,buildAdminDashboard,readAdminDashboard,processAnalyticsSnapshot,assignAnalyticsBrand,saveAnalyticsCostRule,deleteAnalyticsCostRule} from '../db/admin-analytics.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')){const target=new URL(`../${specifier.slice(2)}`,import.meta.url);return next(existsSync(path.join(target.pathname,'index.ts'))?`${target}/index.ts`:`${target}.ts`,context);}return next(specifier,context);}});

test('admin analytics: snapshots, tenant isolation, native charge dedupe, physical attempts, unknown provenance, assignments and auth',{timeout:120000},async()=>{
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 const directory=await mkdtemp(path.join(os.tmpdir(),'buho-analytics-test-'));
 const pg=new EmbeddedPostgres({databaseDir:path.join(directory,'pg'),user:'postgres',password:'isolated-analytics',port,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog(){},onError(){}});
 let sql;
 try {
  await pg.initialise();await pg.start();await pg.createDatabase('analytics_test');process.env.DATABASE_URL=`postgresql://postgres:isolated-analytics@127.0.0.1:${port}/analytics_test`;process.env.SOURCE_PROVIDER='inapi';
  const migration=postgres(process.env.DATABASE_URL,{max:1,onnotice(){}});await migrate(drizzle(migration),{migrationsFolder:'drizzle'});await migration.end();sql=getSql();
  const [internal]=await sql`INSERT INTO organizations(name,slug)VALUES('Analytics internal','estudio-ibieta-ip')RETURNING id`;
  const [other]=await sql`INSERT INTO organizations(name,slug)VALUES('Other tenant','other-analytics')RETURNING id`;
  const [admin]=await sql`INSERT INTO users(name,email,initials)VALUES('Dashboard admin','dashboard-admin@example.invalid','DA')RETURNING id`;
  const [foreign]=await sql`INSERT INTO users(name,email,initials)VALUES('Other user','dashboard-other@example.invalid','OU')RETURNING id`;
  await sql`INSERT INTO organization_members(organization_id,user_id,role)VALUES(${internal.id},${admin.id},'admin'),(${other.id},${foreign.id},'admin')`;
  const [brand]=await sql`INSERT INTO brands(organization_id,public_code,name,word_mark,owner_name,created_by,monitoring_config)VALUES(${internal.id},'MA-A','ALBA','ALBA','Private holder',${admin.id},${sql.json({monitoringEnabled:true})})RETURNING id`;
  const [match]=await sql`INSERT INTO matches(organization_id,brand_id,public_code,source,source_record_id,application_number,found_name,applicant,level,total_score,explanation,created_at)VALUES(${internal.id},${brand.id},'CO-A','DeQuiénEs','123','123','ALBA','Private applicant','Alta',95,'Private explanation','2026-10-01T10:00:00Z')RETURNING id`;
  const [run]=await sql`INSERT INTO watch_digest_runs(organization_id,idempotency_key,trigger,requested_by,status,created_at)VALUES(${internal.id},'test','manual',${admin.id},'prepared','2026-10-01T10:00:00Z')RETURNING id`;
  const [watch]=await sql`INSERT INTO watch_glm_calls(organization_id,run_id,request_hash,reserved_usd,cost_usd,result,started_at)VALUES(${internal.id},${run.id},'a',.01,.004,${sql.json({providerId:'generation-a',usage:{prompt_tokens:100,completion_tokens:50}})},'2026-10-01T10:00:00Z')RETURNING id`;
  await sql`INSERT INTO watch_glm_decisions(organization_id,run_id,match_id,model,prompt_version,decision,cross_snapshot,created_at)VALUES(${internal.id},${run.id},${match.id},'glm',1,${sql.json({show:true})},${sql.json({private:'must not leak'})},'2026-10-01T11:00:00Z')`;
  await sql`INSERT INTO match_reviews(organization_id,match_id,reviewer_id,decision,comparison_snapshot,created_at)VALUES(${internal.id},${match.id},${admin.id},'En seguimiento','{}','2026-10-02T10:00:00Z')`;
  const conclusionId=crypto.randomUUID();
  await sql`INSERT INTO feasibility_conclusions(id,organization_id,user_id,context_hash,input,output,model,cost,usage,provider_id,created_at)VALUES(${conclusionId},${internal.id},${admin.id},'fixture','{}',${sql.json({generationAttempts:2})},'fixture-llm',.003,${sql.json({attempts:[{providerId:'generation-b',cost:.001,usage:{prompt_tokens:40,completion_tokens:10}},{providerId:'generation-c',cost:.002,usage:{prompt_tokens:60,completion_tokens:20}}]})},'generation-c','2026-10-01T10:00:00Z')`;
  const now=new Date('2026-10-14T12:00:00Z');
  await sql`INSERT INTO analytics_api_calls(organization_id,user_id,provider,operation,source_ref,outcome,cost_usd,duration_ms,started_at)VALUES(${internal.id},${admin.id},'openrouter','watch_glm',${`watch:${watch.id}`},'success',.004,200,'2026-10-01T10:00:00Z'),(${internal.id},${admin.id},'openrouter','feasibility',${`feasibility:${conclusionId}`},'success',.003,300,'2026-10-01T10:00:00Z'),(${internal.id},${admin.id},'dequienes','search',NULL,'error',NULL,120,'2026-10-01T10:00:00Z'),(${other.id},${foreign.id},'other','search',NULL,'success',999,120,'2026-10-01T10:00:00Z')`;
  await sql`INSERT INTO analytics_cost_rules(provider,kind,amount_usd,label,effective_from)VALUES('dequienes','per_call',.05,'Manual','2026-10-01'),('railway','fixed_monthly',31,'Global','2026-10-01')`;
  const [legalCase]=await sql`INSERT INTO cases(organization_id,public_code,title,client_name,next_deadline,description,owner_id)VALUES(${internal.id},'CA-A','Private case','Private client','2026-10-20','Plazo: Contestar observación',${admin.id})RETURNING id`;
  await sql`INSERT INTO case_tasks(organization_id,case_id,title,status,due_at,created_by,completed_by,completed_at,assignee_id,created_at)VALUES(${internal.id},${legalCase.id},'Private task','completed','2026-10-05T12:00:00Z',${admin.id},${admin.id},'2026-10-04T12:00:00Z',${admin.id},'2026-10-01T12:00:00Z'),(${internal.id},${legalCase.id},'Historical unknown','completed','2026-10-05T12:00:00Z',NULL,NULL,NULL,NULL,'2026-10-01T12:00:00Z')`;
  await sql`INSERT INTO analytics_events(organization_id,user_id,module,event_name,session_id,occurred_at)VALUES(${internal.id},${admin.id},'watch','interaction',${crypto.randomUUID()},'2026-10-01T03:00:00Z'),(${internal.id},${admin.id},'watch','interaction',${crypto.randomUUID()},'2026-10-01T02:00:00Z')`;
  const scope={from:'2026-10-01',to:'2026-10-14',organizationId:internal.id,userId:null};
  const first=await readAdminDashboard(scope);assert.equal(first.report,null);assert.equal(first.snapshot.status,'queued');
  const buildStarted=performance.now();await buildAdminDashboard(scope,now);console.info(`Analytics full snapshot fixture: ${Math.round(performance.now()-buildStarted)} ms`);
  assert.equal((await processAnalyticsSnapshot(now)).failed,undefined);
  const report=(await readAdminDashboard(scope)).report;assert.ok(report);
  const get=(section,key)=>section.metrics.find(m=>m.key===key)?.value;
  assert.equal(report.apis.totalCalls,4);assert.equal(get(report.costs,'confirmed'),.007);assert.equal(get(report.costs,'estimated'),.05);assert.equal(get(report.costs,'fixed'),0,'a study must not inherit the full global subscription');
  assert.equal(report.apis.providers.find(p=>p.operation==='feasibility').calls,2,'two physical attempts, one cached conclusion');
  assert.equal(get(report.users,'never_login'),null);assert.equal(get(report.tasks,'unknown_completed'),1);assert.equal(report.users.rows[0].tasksCreated,1);assert.equal(report.users.rows[0].tasksCompleted,1);assert.equal(report.users.rows[0].onTimePercent,100);
  assert.equal(report.users.daily.filter(p=>p.date==='2026-10-01').reduce((n,p)=>n+p.count,0),1,'Chile calendar excludes UTC02:00 on the prior day');
  assert.equal(get(report.deadlines,'projected'),1,'real case agenda is included even without legal_deadlines rows');
  assert.equal(get(report.emails,'delivered'),null);
  assert.equal(JSON.stringify(report).includes('Private holder'),false);assert.equal(JSON.stringify(report).includes('Private client'),false);assert.equal(JSON.stringify(report).includes('must not leak'),false);
  await assert.rejects(assignAnalyticsBrand(internal.id,brand.id,foreign.id,admin.id),/no pertenece/);
  await assignAnalyticsBrand(internal.id,brand.id,admin.id,admin.id);const updated=await buildAdminDashboard(scope,now);assert.equal(updated.users.rows[0].brandsResponsible,1);
  const global=await buildAdminDashboard({...scope,organizationId:null},now);assert.ok(Math.abs(get(global.costs,'fixed')-14)<1e-8);assert.ok(get(global.costs,'confirmed')>999);
  // Changes to manual estimates are attributable; they never change native metered charges.
  const saved=await saveAnalyticsCostRule({organizationId:internal.id,provider:'resend',operation:null,kind:'per_call',amountUsd:.01,label:'Manual email',effectiveFrom:'2026-01-01',effectiveTo:'2028-12-31'},admin.id);
  await deleteAnalyticsCostRule(saved.id,admin.id);assert.equal((await sql`SELECT count(*)::int AS n FROM audit_events WHERE entity_id=${saved.id} AND actor_user_id=${admin.id}`)[0].n,2);
  // A weekly forecast requires two complete weeks with every GLM cost confirmed.
  for(let i=0;i<2;i++){
   const [week]=await sql`INSERT INTO watch_digest_runs(organization_id,idempotency_key,trigger,status,created_at,sent_at)VALUES(${internal.id},${`week-${i}`},'scheduled','sent','2026-10-05T10:00:00Z','2026-10-05T10:01:00Z')RETURNING id`;
   await sql`INSERT INTO watch_glm_calls(organization_id,run_id,request_hash,reserved_usd,cost_usd,started_at)VALUES(${internal.id},${week.id},${`week-cost-${i}`},.01,.002,'2026-10-05T10:00:00Z')`;
  }
  const forecast=await buildAdminDashboard(scope,now);assert.equal(forecast.costs.nextMonthWeeklyEstimateUsd,.008);
  assert.equal((await buildAdminDashboard({...scope,userId:admin.id},now)).costs.nextMonthWeeklyEstimateUsd,null);
  // Identified summary reads must be verified by the server, after send, scoped to the same tenant.
  await sql`UPDATE watch_digest_runs SET status='sent',sent_at='2026-10-03T10:00:00Z' WHERE id=${run.id}`;
  for(const event of [{org:internal.id,user:admin.id,source:'server',at:'2026-10-04T10:00:00Z'},{org:internal.id,user:admin.id,source:'client',at:'2026-10-04T10:00:00Z'},{org:other.id,user:foreign.id,source:'server',at:'2026-10-04T10:00:00Z'},{org:internal.id,user:admin.id,source:'server',at:'2026-10-02T10:00:00Z'}])await sql`INSERT INTO analytics_events(organization_id,user_id,module,event_name,occurred_at,properties)VALUES(${event.org},${event.user},'summary','digest_viewed',${event.at},${sql.json({source:event.source,digest_run_id:run.id})})`;
  await sql`INSERT INTO audit_events(organization_id,actor_user_id,action,entity_type,entity_id,occurred_at)VALUES(${internal.id},${admin.id},'task.completed','task',${crypto.randomUUID()},'2026-10-05T10:00:00Z')`;
  const emailed=await buildAdminDashboard(scope,now),mail=emailed.emails.rows.find(e=>e.id===run.id);
  assert.equal(mail.identifiedViews,1);assert.equal(mail.actionsAfterEmail,1);assert.equal(mail.clicks,null,'a server summary read is not a Resend click');
  assert.equal(mail.delivered,null,'a summary read never proves inbox delivery');
  const session=await createSession(admin.id,internal.id),otherSession=await createSession(foreign.id,other.id);
  const route=await import('../app/api/admin/dashboard/route.ts'),worker=await import('../app/api/admin/dashboard/worker/route.ts');
  assert.equal((await route.GET(new Request('https://app.example/api/admin/dashboard'))).status,401);
  assert.equal((await route.GET(new Request('https://app.example/api/admin/dashboard',{headers:{cookie:`buho_session=${otherSession}`}}))).status,403);
  assert.equal((await route.GET(new Request('https://app.example/api/admin/dashboard?from=2026-10-01&to=2026-10-14',{headers:{cookie:`buho_session=${session}`}}))).status,200);
  assert.equal((await route.POST(new Request('https://app.example/api/admin/dashboard',{method:'POST',headers:{cookie:`buho_session=${session}`,origin:'https://evil.example'},body:JSON.stringify({action:'delete_cost_rule',id:crypto.randomUUID()})}))).status,403);
  assert.equal((await worker.POST(new Request('https://app.example/api/admin/dashboard/worker',{method:'POST'}))).status,403);
  await assert.rejects(sql`INSERT INTO analytics_email_events(event_key,organization_id,run_id,event_type)VALUES('mismatch',${other.id},${run.id},'delivered')`,/foreign key/);
 }finally{if(sql)await sql.end();await analyticsSql().end();await pg.stop();await rm(directory,{recursive:true,force:true});}
});
