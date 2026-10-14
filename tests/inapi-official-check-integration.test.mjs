import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';
import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {drizzle} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {getSql} from '../db/index.ts';
import {checkOfficialInapi,checkRegistrationOfficial} from '../db/inapi-official-check.ts';
import {inapiDailyAttempts} from '../db/inapi-recovery.ts';
import {runAs} from '../lib/tenant-context.ts';
import {fixture,application,officialFetcher} from './fixtures/inapi-recovery.mjs';

test('manual official checks enforce tenant access, one daily attempt, shared budget and unchanged-data semantics',{timeout:120000},async()=>{
 const port=await new Promise(resolve=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});});
 const dir=await mkdtemp(path.join(os.tmpdir(),'buho-official-check-'));
 const pg=new EmbeddedPostgres({databaseDir:path.join(dir,'pg'),user:'postgres',password:'isolated-check',port,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog(){},onError(){}});let sql;
 try{
  await pg.initialise();await pg.start();await pg.createDatabase('check_test');
  process.env.DATABASE_URL=`postgresql://postgres:isolated-check@127.0.0.1:${port}/check_test`;process.env.SOURCE_PROVIDER='inapi';process.env.INAPI_DIRECT_RECOVERY_ENABLED='true';
  const migration=postgres(process.env.DATABASE_URL,{max:1,onnotice(){}});await migrate(drizzle(migration),{migrationsFolder:'drizzle'});await migration.end();sql=getSql();
  const base=fixture();const [source]=await sql`INSERT INTO source_records(application_number,data) VALUES(${base.applicationNumber},${sql.json(base)}) RETURNING id`;
  const [org]=await sql`INSERT INTO organizations(name,slug) VALUES('CHECK A','check-a') RETURNING id`;
  const [other]=await sql`INSERT INTO organizations(name,slug) VALUES('CHECK B','check-b') RETURNING id`;
  const [app]=await sql`INSERT INTO registration_applications(organization_id,public_code,data) VALUES(${org.id},'TEST-1',${sql.json(application(base))}) RETURNING id`;
  await sql`INSERT INTO source_snapshots(organization_id,entity_id,entity_type,public_code,source_id,data) VALUES(${org.id},${app.id},'application','TEST-1',${source.id},${sql.json(base)})`;
  const identity=id=>({organizationId:id,organizationName:'Test',userId:'10000000-0000-4000-8000-000000000101',name:'Test',role:'admin',mustChangePassword:false});
  await assert.rejects(runAs(identity(other.id),()=>checkRegistrationOfficial('TEST-1',()=>{throw new Error('tenant failure must not fetch');})),/tu cartera/);
  const mock=officialFetcher();let ended,entered;const firstRequest=new Promise(resolve=>{entered=resolve;});
  const first=checkOfficialInapi(base,source.id,async(...args)=>{entered();const res=await mock.fetcher(...args);ended=Date.now();return res;});
  await firstRequest;
  const competing=await checkOfficialInapi(base,source.id,()=>{throw new Error('concurrent call must not fetch');});
  assert.equal(competing.status,'running');assert.equal(competing.busy,true);
  assert.equal((await first).status,'unchanged');assert.equal(mock.calls(),3);
  assert.equal((await checkOfficialInapi(base,source.id,()=>{throw new Error('daily duplicate must not fetch');})).alreadyChecked,true);
  const [saved]=await sql`SELECT data FROM source_records WHERE id=${source.id}`;
  assert.deepEqual(saved.data.inapi.events,base.inapi.events);assert.equal(saved.data.retrieval.historyComplete,undefined);assert.ok(saved.data.retrieval.officialCheckedAt);
  assert.equal((await sql`SELECT count(*)::int AS n FROM notifications`)[0].n,0);
  const connection=await sql.reserve();try{assert.equal(await inapiDailyAttempts(connection),1);}finally{connection.release();}
  assert.ok(ended);
  // A new day allows a new attempt. Failed attempts still prohibit repetition.
  await sql`UPDATE inapi_official_checks SET check_day=check_day-1 WHERE application_number=${base.applicationNumber}`;
  const fail=officialFetcher({failAt:1});assert.equal((await checkOfficialInapi(base,source.id,fail.fetcher)).status,'failed');assert.equal(fail.calls(),1);
  assert.equal((await checkOfficialInapi(base,source.id,()=>{throw new Error('failed day must not repeat');})).alreadyChecked,true);
  const [same]=await sql`SELECT data FROM source_records WHERE id=${source.id}`;assert.deepEqual(same.data,saved.data);
  await sql`UPDATE inapi_request_clock SET blocked_until=NULL WHERE id=1`;
  process.env.INAPI_DIRECT_RECOVERY_DAILY_LIMIT='0';
  const limited={...base,applicationNumber:'999002'};
  assert.equal((await checkOfficialInapi(limited,undefined,()=>{throw new Error('budget zero must not fetch');})).status,'limited');
  assert.equal((await sql`SELECT count(*)::int AS n FROM registration_tasks`)[0].n,0);
 }finally{if(sql)await sql.end();await pg.stop().catch(()=>{});await rm(dir,{recursive:true,force:true});}
});
