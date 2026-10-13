import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {once} from 'node:events';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import {drizzle} from 'drizzle-orm/postgres-js';
import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {createRenewalNotices} from '../db/renewal-notices.ts';
import {runAs,DEMO_ORGANIZATION,DEMO_ACTOR} from '../lib/tenant-context.ts';
import {PUBLIC_BRIOCHE_EXAMPLE} from '../db/pilot-public-brioche.ts';

test('saved-record reminders are isolated, idempotent and retain decisions while invalidating renewed evidence',async()=>{
 const listener=createServer().listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
 const dir=await mkdtemp(path.join(tmpdir(),'buho-renewals-'));
 const pg=new EmbeddedPostgres({databaseDir:path.join(dir,'pg'),user:'postgres',password:'isolated',port,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog(){},onError(){}});
 let sql;const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error('No external queries');};
 try {
  await pg.initialise();await pg.start();await pg.createDatabase('renewals');const url=`postgresql://postgres:isolated@127.0.0.1:${port}/renewals`;
  const migration=postgres(url,{max:1,onnotice(){}});await migrate(drizzle(migration),{migrationsFolder:'drizzle'});await migration.end();sql=postgres(url,{max:3,prepare:false,onnotice(){}});
  await sql`INSERT INTO organizations(id,name,slug) VALUES (${DEMO_ORGANIZATION},'Own','own')`;
  const [other]=await sql`INSERT INTO organizations(name,slug) VALUES ('Other','other') RETURNING id`;
  await sql`INSERT INTO users(id,name,initials) VALUES (${DEMO_ACTOR},'Admin','JI')`;
  const record={...PUBLIC_BRIOCHE_EXAMPLE.record,applicationNumber:'1200000',name:'Marca ficticia',status:'registered',registrationNumber:'1000000',registrationDate:'2016-10-28',expirationDate:'2026-10-28'};
  const [source]=await sql`INSERT INTO source_records(application_number,data) VALUES (${record.applicationNumber},${sql.json(record)}) RETURNING id`;
  for(const org of [DEMO_ORGANIZATION,other.id]){
   const [b]=await sql`INSERT INTO brands(organization_id,public_code,name,word_mark,owner_name,monitoring_config) VALUES (${org},'BM-R-1200000','Marca ficticia','Marca ficticia','Titular',${sql.json({provider:'inapi',watchOnly:false})}) RETURNING id`;
   await sql`INSERT INTO source_snapshots(organization_id,entity_id,entity_type,public_code,source_id,data) VALUES (${org},${b.id},'brand','BM-R-1200000',${source.id},${sql.json(record)})`;
  }
  const now=new Date('2026-10-12T18:00:00Z');const generate=()=>sql.begin(tx=>createRenewalNotices(tx,now));
  const results=await Promise.all([generate(),generate()]);assert.equal(results.reduce((n,r)=>n+r.created,0),1);assert.ok(results.every(r=>r.externalRequests===0));
  let rows=await sql`SELECT * FROM notifications`;assert.equal(rows.length,1);assert.equal(rows[0].organization_id,DEMO_ORGANIZATION);assert.deepEqual(rows[0].change_detail.changes,[]);assert.equal(rows[0].change_detail.source,'platform');
  assert.equal((await sql`SELECT count(*)::int n FROM email_drafts`)[0].n,1);
  await sql`UPDATE notifications SET managed_at=now(),dismissed_at=now() WHERE id=${rows[0].id}`;
  assert.equal((await generate()).created,0);assert.ok((await sql`SELECT managed_at,dismissed_at FROM notifications`)[0].managed_at);
  const identity={organizationId:other.id,organizationName:'Other',userId:DEMO_ACTOR,name:'Admin',role:'admin',mustChangePassword:false};
  assert.equal((await runAs(identity,generate)).created,1);
  await sql`UPDATE source_records SET data=${sql.json({...record,expirationDate:'2036-10-28'})} WHERE id=${source.id}`;
  assert.equal((await generate()).created,0);rows=await sql`SELECT * FROM notifications ORDER BY organization_id`;
  assert.equal(rows.find(r=>r.organization_id===DEMO_ORGANIZATION).change_detail.invalidated,true);assert.equal(rows.find(r=>r.organization_id===other.id).change_detail.invalidated,undefined);
  assert.equal((await sql`SELECT count(*)::int n FROM monitoring_jobs`)[0].n,0);assert.equal((await sql`SELECT count(*)::int n FROM source_sync_runs`)[0].n,0);
 }finally{globalThis.fetch=originalFetch;if(sql)await sql.end();await pg.stop();}
});
