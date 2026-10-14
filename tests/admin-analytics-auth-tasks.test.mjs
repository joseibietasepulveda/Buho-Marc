import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
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
import {hashPassword,verifyPassword} from '../lib/password.ts';
import {provisionAnalyticsAdmin} from '../db/admin-account.ts';
import {analyticsSql} from '../db/admin-analytics.ts';
import {closeAnalyticsTelemetry} from '../lib/analytics-telemetry.ts';

registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')){const target=new URL(`../${specifier.slice(2)}`,import.meta.url);return next(existsSync(path.join(target.pathname,'index.ts'))?`${target}/index.ts`:`${target}.ts`,context);}return next(specifier,context);}});

test('admin analytics: Dev provisioning, protected login/password change and task creator/completer attribution',{timeout:120000},async t=>{
 const previous={};for(const name of ['DATABASE_URL','SOURCE_PROVIDER','ADMIN_ANALYTICS_CAPTURE_ENABLED','RAILWAY_ENVIRONMENT_ID','APP_PUBLIC_ORIGIN'])previous[name]=process.env[name];
 const port=await new Promise(resolve=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
 const directory=await mkdtemp(path.join(os.tmpdir(),'buho-admin-auth-tasks-'));
 const pg=new EmbeddedPostgres({databaseDir:path.join(directory,'pg'),user:'postgres',password:'isolated-auth-tasks',port,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog(){},onError(){}});
 let sql,migration;
 try{
  await pg.initialise();await pg.start();await pg.createDatabase('auth_tasks_test');
  Object.assign(process.env,{DATABASE_URL:`postgresql://postgres:isolated-auth-tasks@127.0.0.1:${port}/auth_tasks_test`,SOURCE_PROVIDER:'inapi',ADMIN_ANALYTICS_CAPTURE_ENABLED:'false',APP_PUBLIC_ORIGIN:'https://app.example'});
  migration=postgres(process.env.DATABASE_URL,{max:1,onnotice(){}});await migrate(drizzle(migration),{migrationsFolder:'drizzle'});await migration.end();migration=null;sql=getSql();
  const [internal]=await sql`INSERT INTO organizations(name,slug)VALUES('Internal fixture','estudio-ibieta-ip')RETURNING id`;
  const [foreignOrganization]=await sql`INSERT INTO organizations(name,slug)VALUES('Foreign fixture','foreign-auth-tasks')RETURNING id`;
  const regularPassword='Fixture member password 2026';
  const regularHash=await hashPassword(regularPassword);
  const [creator]=await sql`INSERT INTO users(username,name,initials,password_hash,must_change_password)VALUES('creator-fixture','Creator fixture','CF',${regularHash},false)RETURNING id`;
  const [completer]=await sql`INSERT INTO users(username,name,initials,password_hash,must_change_password)VALUES('completer-fixture','Completer fixture','CF',${regularHash},false)RETURNING id`;
  const [foreignAdmin]=await sql`INSERT INTO users(username,name,initials,password_hash,must_change_password)VALUES('foreign-admin-fixture','Foreign admin fixture','FA',${regularHash},false)RETURNING id`;
  await sql`INSERT INTO organization_members(organization_id,user_id,role)VALUES(${internal.id},${creator.id},'member'),(${internal.id},${completer.id},'member'),(${foreignOrganization.id},${foreignAdmin.id},'admin')`;
  const password='Fixture temporary admin password 2026',replacement='Fixture replacement admin password 2026';
  let admin;

  await t.test('provisioning rejects production and conflicting existing admin, and never replaces valid credentials',async()=>{
   process.env.RAILWAY_ENVIRONMENT_ID='production';await assert.rejects(provisionAnalyticsAdmin(password),/únicamente en Dev/);
   delete process.env.RAILWAY_ENVIRONMENT_ID;await assert.rejects(provisionAnalyticsAdmin(password),/únicamente en Dev/);
   assert.equal((await sql`SELECT count(*)::int AS n FROM users WHERE username='admin'`)[0].n,0);
   process.env.RAILWAY_ENVIRONMENT_ID='9e2891f0-7281-4872-a992-2c48866a782d';
   await assert.rejects(provisionAnalyticsAdmin('too-short'),/16 caracteres/);
   await sql`UPDATE users SET username='admin' WHERE id=${foreignAdmin.id}`;
   await assert.rejects(provisionAnalyticsAdmin(password),/otro espacio/);
   assert.equal((await sql`SELECT password_hash FROM users WHERE id=${foreignAdmin.id}`)[0].password_hash,regularHash);
   assert.equal((await sql`SELECT organization_id,role FROM organization_members WHERE user_id=${foreignAdmin.id}`)[0].organization_id,foreignOrganization.id);
   await sql`UPDATE users SET username='foreign-admin-fixture' WHERE id=${foreignAdmin.id}`;
   assert.deepEqual(await provisionAnalyticsAdmin(password),{created:true});
   [admin]=await sql`SELECT id,password_hash,must_change_password FROM users WHERE username='admin'`;
   assert.equal(admin.must_change_password,true);assert.equal(await verifyPassword(password,admin.password_hash),true);
   assert.deepEqual(await provisionAnalyticsAdmin(replacement),{created:false});
   const [saved]=await sql`SELECT password_hash,must_change_password FROM users WHERE id=${admin.id}`;
   assert.equal(saved.password_hash,admin.password_hash);assert.equal(saved.must_change_password,true);assert.equal(await verifyPassword(replacement,saved.password_hash),false);
   assert.equal((await sql`SELECT count(*)::int AS n FROM audit_events WHERE action='account.analytics_admin_created'`)[0].n,1);
   assert.equal(JSON.stringify(await sql`SELECT after_data FROM audit_events WHERE action='account.analytics_admin_created'`).includes(password),false);
  });

  const login=await import('../app/api/auth/login/route.ts'),changePassword=await import('../app/api/auth/password/route.ts'),dashboard=await import('../app/api/admin/dashboard/route.ts');
  const post=(url,body,session,origin='https://app.example')=>new Request(`https://app.example${url}`,{method:'POST',headers:{origin,'content-type':'application/json',...(session?{cookie:`buho_session=${session}`} : {})},body:JSON.stringify(body)});
  const dashboardRequest=session=>new Request('https://app.example/api/admin/dashboard',{headers:session?{cookie:`buho_session=${session}`} : {}});
  const cookie=response=>response.headers.get('set-cookie')?.match(/^buho_session=([^;]+)/)?.[1];

  await t.test('admin destination requires internal administrator and honors forced password changes',async()=>{
   assert.equal((await login.POST(post('/api/auth/login',{username:'admin',password,destination:'admin'},null,'https://evil.example'))).status,403);
   const before=(await sql`SELECT count(*)::int AS n FROM auth_sessions`)[0].n;
   for(const username of ['creator-fixture','foreign-admin-fixture']){
    const denied=await login.POST(post('/api/auth/login',{username,password:regularPassword,destination:'admin'}));assert.equal(denied.status,403);assert.equal(cookie(denied),undefined);
   }
   assert.equal((await sql`SELECT count(*)::int AS n FROM auth_sessions`)[0].n,before,'denied admin logins must not create sessions');
   assert.equal((await login.POST(post('/api/auth/login',{username:'admin',password:'wrong fixture password',destination:'admin'}))).status,401);
   assert.equal((await login.POST(post('/api/auth/login',{username:'admin',password,destination:'https://evil.example'}))).status,400);
   const normal=await login.POST(post('/api/auth/login',{username:'creator-fixture',password:regularPassword,destination:'workspace'}));assert.equal(normal.status,200);assert.equal((await normal.json()).redirect,'/app');
   assert.equal((await dashboard.GET(dashboardRequest(cookie(normal)))).status,403);
   const forced=await login.POST(post('/api/auth/login',{username:'admin',password,destination:'admin'}));assert.equal(forced.status,200);const forcedSession=cookie(forced);assert.ok(forcedSession);assert.equal((await forced.json()).redirect,'/cambiar-clave?next=admin');
   assert.equal((await dashboard.GET(dashboardRequest(forcedSession))).status,403,'temporary credentials cannot open the protected dashboard');
   const workspaceForced=await login.POST(post('/api/auth/login',{username:'admin',password,destination:'workspace'}));assert.equal((await workspaceForced.json()).redirect,'/cambiar-clave');
   const otherSession=cookie(workspaceForced);
   assert.equal((await changePassword.POST(post('/api/auth/password',{currentPassword:'wrong',password:replacement},forcedSession))).status,400);
   assert.equal((await changePassword.POST(post('/api/auth/password',{currentPassword:password,password:replacement},forcedSession))).status,200);
   assert.equal((await sql`SELECT must_change_password FROM users WHERE id=${admin.id}`)[0].must_change_password,false);
   assert.equal((await dashboard.GET(dashboardRequest(otherSession))).status,401,'password change revokes other sessions');
   assert.equal((await dashboard.GET(dashboardRequest(forcedSession))).status,200,'current session remains valid after required password change');
   assert.equal((await login.POST(post('/api/auth/login',{username:'admin',password,destination:'admin'}))).status,401);
   const approved=await login.POST(post('/api/auth/login',{username:'admin',password:replacement,destination:'admin'}));assert.equal(approved.status,200);assert.equal((await approved.json()).redirect,'/app/admin/dashboard');
   const foreignSession=await createSession(foreignAdmin.id,foreignOrganization.id);assert.equal((await dashboard.GET(dashboardRequest(foreignSession))).status,403);assert.equal((await dashboard.GET(dashboardRequest())).status,401);
  });

  const tasks=await import('../app/api/tasks/route.ts'),demo=await import('../app/api/demo/route.ts');
  const creatorSession=await createSession(creator.id,internal.id),completerSession=await createSession(completer.id,internal.id),foreignSession=await createSession(foreignAdmin.id,foreignOrganization.id);
  const [application]=await sql`INSERT INTO registration_applications(organization_id,public_code,data)VALUES(${internal.id},'IM-FIXTURE','{}')RETURNING id`;
  const [otherApplication]=await sql`INSERT INTO registration_applications(organization_id,public_code,data)VALUES(${foreignOrganization.id},'IM-FOREIGN','{}')RETURNING id`;
  const [legalCase]=await sql`INSERT INTO cases(organization_id,public_code,title,client_name)VALUES(${internal.id},'CA-FIXTURE','Fixture case','Fixture client')RETURNING id`;
  const [otherCase]=await sql`INSERT INTO cases(organization_id,public_code,title,client_name)VALUES(${foreignOrganization.id},'CA-FOREIGN','Foreign fixture case','Fixture client')RETURNING id`;

  await t.test('registration task attribution preserves creator, preserves completed edits and tracks reopening/new completion',async()=>{
   const id=randomUUID();const task=(status,extra={})=>({id,title:'Fixture task',status,priority:'Media',dueDate:'2026-10-20',assigneeId:completer.id,...extra});
   const save=(status,session,extra={})=>tasks.POST(post('/api/tasks',{action:'save',entityType:'application',entityId:'IM-FIXTURE',task:task(status,extra)},session));
   assert.equal((await save('pending',creatorSession)).status,200);
   let [row]=await sql`SELECT * FROM registration_tasks WHERE id=${id}`;assert.equal(row.application_id,application.id);assert.equal(row.created_by,creator.id);assert.equal(row.completed_by,null);assert.equal(row.completed_at,null);
   assert.equal((await save('completed',completerSession)).status,200);[row]=await sql`SELECT * FROM registration_tasks WHERE id=${id}`;assert.equal(row.created_by,creator.id);assert.equal(row.completed_by,completer.id);assert.ok(row.completed_at);
   const originalAt=new Date(row.completed_at).toISOString();
   assert.equal((await save('completed',creatorSession,{title:'Edited completed fixture',priority:'Alta'})).status,200);[row]=await sql`SELECT * FROM registration_tasks WHERE id=${id}`;assert.equal(row.completed_by,completer.id);assert.equal(new Date(row.completed_at).toISOString(),originalAt);assert.equal(row.created_by,creator.id);
   assert.equal((await save('pending',creatorSession)).status,200);[row]=await sql`SELECT * FROM registration_tasks WHERE id=${id}`;assert.equal(row.completed_by,null);assert.equal(row.completed_at,null);
   assert.equal((await save('completed',creatorSession)).status,200);[row]=await sql`SELECT * FROM registration_tasks WHERE id=${id}`;assert.equal(row.completed_by,creator.id);assert.ok(new Date(row.completed_at).getTime()>=Date.parse(originalAt));assert.equal(row.created_by,creator.id);
   const audit=await sql`SELECT action,actor_user_id,before_data,after_data FROM audit_events WHERE entity_id=${id} ORDER BY occurred_at`;
   assert.deepEqual(audit.map(a=>a.action),['task.created','task.completed','task.save','task.reopened','task.completed']);assert.deepEqual(audit.map(a=>a.actor_user_id),[creator.id,completer.id,creator.id,creator.id,creator.id]);assert.equal(audit[3].before_data.status,'completed');assert.equal(audit[3].after_data.status,'pending');
   assert.equal((await save('pending',creatorSession,{assigneeId:foreignAdmin.id})).status,500);assert.equal((await sql`SELECT status FROM registration_tasks WHERE id=${id}`)[0].status,'completed');
   assert.equal((await save('pending',foreignSession)).status,500);assert.equal((await sql`SELECT created_by,completed_by FROM registration_tasks WHERE id=${id}`)[0].completed_by,creator.id);
   const foreignTask=randomUUID();await sql`INSERT INTO registration_tasks(id,organization_id,application_id,title,status)VALUES(${foreignTask},${foreignOrganization.id},${otherApplication.id},'Foreign fixture','pending')`;
   assert.equal((await save('completed',creatorSession,{id:foreignTask})).status,500);assert.equal((await sql`SELECT status FROM registration_tasks WHERE id=${foreignTask}`)[0].status,'pending');
   const completedAtCreation=randomUUID();assert.equal((await save('completed',completerSession,{id:completedAtCreation})).status,200);const [direct]=await sql`SELECT created_by,completed_by,completed_at FROM registration_tasks WHERE id=${completedAtCreation}`;assert.equal(direct.created_by,completer.id);assert.equal(direct.completed_by,completer.id);assert.ok(direct.completed_at);
   const historicalUndated=randomUUID();await sql`INSERT INTO registration_tasks(id,organization_id,application_id,title,status)VALUES(${historicalUndated},${internal.id},${application.id},'Historical undated fixture','completed')`;
   assert.equal((await save('completed',creatorSession,{id:historicalUndated,title:'Edited historical undated fixture'})).status,200);const [undated]=await sql`SELECT title,created_by,completed_by,completed_at FROM registration_tasks WHERE id=${historicalUndated}`;assert.equal(undated.title,'Edited historical undated fixture');assert.equal(undated.created_by,null);assert.equal(undated.completed_by,null);assert.equal(undated.completed_at,null,'editing an undated historical completion must not fabricate its date');
   assert.equal((await tasks.POST(post('/api/tasks',{action:'save',entityType:'application',entityId:'IM-FIXTURE',task:task('pending')},null))).status,401);
   assert.equal((await tasks.POST(post('/api/tasks',{action:'save',entityType:'application',entityId:'IM-FIXTURE',task:task('pending')},creatorSession,'https://evil.example'))).status,403);
  });

  await t.test('case task attribution preserves completion evidence and rejects cross-tenant edits',async()=>{
   const id=randomUUID();const task=(status,extra={})=>({id,title:'Fixture case task',status,priority:'Media',dueDate:'2026-10-20',assigneeId:completer.id,...extra});
   const save=(status,session,extra={})=>demo.POST(post('/api/demo',{action:'saveCaseTask',id:'CA-FIXTURE',task:task(status,extra),compact:true},session));
   assert.equal((await save('pending',creatorSession)).status,200);assert.equal((await save('completed',completerSession)).status,200);
   let [row]=await sql`SELECT * FROM case_tasks WHERE id=${id}`;const originalAt=new Date(row.completed_at).toISOString();assert.equal(row.created_by,creator.id);assert.equal(row.completed_by,completer.id);assert.equal(row.case_id,legalCase.id);
   assert.equal((await save('completed',creatorSession,{title:'Edited completed case task'})).status,200);[row]=await sql`SELECT * FROM case_tasks WHERE id=${id}`;assert.equal(row.completed_by,completer.id);assert.equal(new Date(row.completed_at).toISOString(),originalAt);
   assert.equal((await save('not-applicable',creatorSession)).status,200);[row]=await sql`SELECT * FROM case_tasks WHERE id=${id}`;assert.equal(row.completed_by,null);assert.equal(row.completed_at,null);
   assert.equal((await save('completed',creatorSession)).status,200);[row]=await sql`SELECT * FROM case_tasks WHERE id=${id}`;assert.equal(row.completed_by,creator.id);assert.equal(row.created_by,creator.id);assert.ok(row.completed_at);
   assert.deepEqual((await sql`SELECT action,actor_user_id FROM audit_events WHERE entity_id=${id} ORDER BY occurred_at`).map(a=>[a.action,a.actor_user_id]),[['task.created',creator.id],['task.completed',completer.id],['task.save',creator.id],['task.reopened',creator.id],['task.completed',creator.id]]);
   assert.equal((await save('pending',creatorSession,{assigneeId:foreignAdmin.id})).status,500);assert.equal((await save('pending',foreignSession)).status,500);assert.equal((await sql`SELECT status FROM case_tasks WHERE id=${id}`)[0].status,'completed');
   const foreignTask=randomUUID();await sql`INSERT INTO case_tasks(id,organization_id,case_id,title,status)VALUES(${foreignTask},${foreignOrganization.id},${otherCase.id},'Foreign task fixture','pending')`;
   assert.equal((await save('completed',creatorSession,{id:foreignTask})).status,500);assert.equal((await sql`SELECT status FROM case_tasks WHERE id=${foreignTask}`)[0].status,'pending');
   const historical=randomUUID();await sql`INSERT INTO case_tasks(id,organization_id,case_id,title,status,completed_at)VALUES(${historical},${internal.id},${legalCase.id},'Historical actor unknown','completed','2026-10-01T12:00:00Z')`;
   assert.equal((await save('completed',creatorSession,{id:historical})).status,200);const [unknown]=await sql`SELECT created_by,completed_by,completed_at FROM case_tasks WHERE id=${historical}`;assert.equal(unknown.created_by,null);assert.equal(unknown.completed_by,null,'editing historical completion must not fabricate its actor');assert.equal(new Date(unknown.completed_at).toISOString(),'2026-10-01T12:00:00.000Z');
   const historicalUndated=randomUUID();await sql`INSERT INTO case_tasks(id,organization_id,case_id,title,status)VALUES(${historicalUndated},${internal.id},${legalCase.id},'Historical undated case fixture','completed')`;
   assert.equal((await save('completed',creatorSession,{id:historicalUndated,title:'Edited historical undated case fixture'})).status,200);const [undated]=await sql`SELECT title,created_by,completed_by,completed_at FROM case_tasks WHERE id=${historicalUndated}`;assert.equal(undated.title,'Edited historical undated case fixture');assert.equal(undated.created_by,null);assert.equal(undated.completed_by,null);assert.equal(undated.completed_at,null,'editing an undated historical case completion must not fabricate its date');
  });
 }finally{
  await closeAnalyticsTelemetry();if(migration)await migration.end();if(sql)await sql.end();await analyticsSql().end();await pg.stop();await rm(directory,{recursive:true,force:true});
  for(const [name,value] of Object.entries(previous))if(value===undefined)delete process.env[name];else process.env[name]=value;
 }
});
