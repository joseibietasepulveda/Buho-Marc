import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getSql } from '../db/index.ts';
import { runAs } from '../lib/tenant-context.ts';
import { importRealRecord } from '../db/inapi-portfolio.ts';
import { queueWatch, processWatchJob, followWatch, watchSnapshot, setWatchPaused, persistWatch } from '../db/similarity.ts';
import { SimilarityError } from '../lib/similarity-provider.ts';
const listener = createServer(); listener.listen(0,'127.0.0.1'); await once(listener,'listening'); const port=listener.address().port; await new Promise(r=>listener.close(r));
const directory = await mkdtemp(path.join(tmpdir(),'buho-watch-test-'));
const pg = new EmbeddedPostgres({ databaseDir: path.join(directory,'pg'), user:'postgres',password:'isolated-watch',port,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{} });
let sql;
try {
 await pg.initialise(); await pg.start(); await pg.createDatabase('watch_test');
 process.env.DATABASE_URL=`postgresql://postgres:isolated-watch@127.0.0.1:${port}/watch_test`; process.env.SOURCE_PROVIDER='inapi';process.env.INAPI_API_KEY='test-only';process.env.MONITORING_SCHEDULER_ENABLED='true';
 const migrationSql = postgres(process.env.DATABASE_URL, { max: 1 }); await migrate(drizzle(migrationSql),{migrationsFolder:'drizzle'}); await migrationSql.end(); sql=getSql();
 const identities=[];
 for(const name of ['A','B']) { const [org]=await sql`INSERT INTO organizations(name,slug) VALUES (${name},${name}) RETURNING id`;const [user]=await sql`INSERT INTO users(name,initials) VALUES (${name},${name}) RETURNING id`; identities.push({organizationId:org.id,userId:user.id,name,organizationName:name,role:'admin',mustChangePassword:false}); }
 const source={provider:'inapi',applicationNumber:'100',registrationNumber:null,name:'Marca propia',status:'inapi-waiting',type:'Mixta',filingDate:'2026-01-01',publicationDate:null,expirationDate:null,registrationDate:null,statusDate:null,owner:'Dueño propio',ownerRut:'',ownerCountry:'Chile',representativeName:'No informado',representativeCountry:'Chile',classes:[35],logo:'',officialUrl:'https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx',inapi:{events:[],status:{description:'En Trámite'}}};
 await runAs(identities[0],()=>sql.begin(async tx=>{
  await importRealRecord(tx,source,'application');
  await importRealRecord(tx,{...source,applicationNumber:'101',name:'Solicitud ajena'},'application');
  await tx`UPDATE registration_applications SET data = data || '{"portfolioRole":"third-party"}'::jsonb WHERE organization_id = ${identities[0].organizationId} AND data->>'applicationNumber' = '101'`;
 }));
 const query={applicationId:'100',registrationId:null,name:'Marca propia',type:'Mixta',image:'',holders:[{name:'Dueño propio'}],classes:[{nice_class:35}],filedAt:'2026-01-01',publishedAt:null,registeredAt:null,status:'En Trámite',statusCode:'ET'};
 let publication=null; const requests=[];
 const search=async input=>{requests.push(input);return {query,results:Array.from({length:30},(_,i)=>({...query,applicationId:String(200+i),name:`Tercero ${i}`,score:1-i/100,publishedAt:publication,channels:{name:{rank:i+1,score:.9}},history:[]})),groups:[],warnings:['bounded pool'],candidateCount:100,elapsedSeconds:.2,fetchedAt:new Date().toISOString()};};
 await runAs(identities[0], async()=>{
  assert.equal(await queueWatch(),1);assert.equal(await queueWatch(),0);
  assert.equal((await watchSnapshot()).targets.length,1); assert.equal((await watchSnapshot()).targets[0].applicationId,'100');
 });
 let entered, release; const gate=new Promise(r=>release=r), began=new Promise(r=>entered=r);
 const running=processWatchJob(async input=>{entered();await gate;return search(input);});await began;
 assert.equal((await processWatchJob(search)).skipped,true);release();assert.equal((await running).completed,true);
 await runAs(identities[0],async()=>{
  let snapshot=await watchSnapshot();assert.equal(snapshot.targets[0].results.length,30);const target=snapshot.targets[0];const id=target.results[0].matchId;
  await followWatch(id);await followWatch(id);
  assert.equal((await sql`SELECT count(*)::int AS n FROM match_reviews`)[0].n,1);
  await queueWatch(target.id);publication='2026-09-21';await processWatchJob(search);
  assert.equal((await sql`SELECT count(*)::int AS n FROM matches`)[0].n,30);
  assert.equal((await sql`SELECT count(*)::int AS n FROM notifications`)[0].n,31);
  snapshot=await watchSnapshot();assert.equal(snapshot.targets[0].results[0].reviewStatus,'En seguimiento');
  assert.ok(requests.some(r=>r.filed_after));assert.ok(requests.some(r=>r.published_after));assert.ok(requests.every(r=>!(r.filed_after&&r.published_after)&&r.limit===30&&!r.states));
  await queueWatch(target.id);await processWatchJob(async()=>{throw new SimilarityError('ocupado',503,true)});
  assert.equal((await watchSnapshot()).targets[0].status,'retry');assert.equal((await watchSnapshot()).targets[0].results.length,30);
  await setWatchPaused(target.id,true);assert.equal((await processWatchJob(search)).skipped,true);
  await setWatchPaused(target.id,false);await processWatchJob(search);
  assert.equal((await sql`SELECT count(*)::int AS n FROM notifications`)[0].n,31);
  // A lease lost after a worker crash cannot publish stale results.
  await queueWatch(target.id);
  const [stale] = await sql`UPDATE monitoring_jobs SET status='running', started_at=now()-interval '11 minutes', attempt_count=1, lease_token='11111111-1111-4111-8111-111111111111' WHERE status='queued' RETURNING *`;
  await sql`INSERT INTO monitoring_job_attempts(monitoring_job_id,attempt_no,status) VALUES (${stale.id},1,'running')`;
  assert.equal((await processWatchJob(search)).completed,true);
  assert.equal(await persistWatch(stale,[await search({limit:30})]),false);
  assert.equal((await sql`SELECT status FROM monitoring_job_attempts WHERE monitoring_job_id=${stale.id} AND attempt_no=1`)[0].status,'interrupted');
  // Promotion retains the same watch target, matches and review.
  await sql.begin(tx=>importRealRecord(tx,{...source,status:'registered',registrationNumber:'777',registrationDate:'2026-09-21'},'brand'));
  assert.equal((await watchSnapshot()).targets.length,1);
  // A followed hit outside the next stock is still available in its owned row.
  await queueWatch(target.id);
  await processWatchJob(async input=>{const result=await search(input);return {...result,results:result.results.map(hit=>({...hit,applicationId:String(Number(hit.applicationId)+1)}))};},async()=>({records:[{...source,applicationNumber:'200',publicationDate:publication}],missing:[],version:1,fetchedAt:new Date().toISOString()}));
  const refreshed=(await watchSnapshot()).targets[0];
  assert.equal(refreshed.results.length,30);assert.ok(!refreshed.results.some(hit=>hit.applicationId==='200'));
  assert.ok(refreshed.savedResults.some(hit=>hit.applicationId==='200'&&hit.reviewStatus==='En seguimiento'));
  await runAs(identities[1],async()=>{assert.equal((await watchSnapshot()).targets.length,0);await assert.rejects(followWatch(id),/no encontrada/);});
 });
 console.log('PASS: migrations, owned pending enrollment, 30 results, idempotency, global concurrency, publication, preserved review, separate windows, retry, pause/resume, tenant isolation and registration transition.');
}finally{if(sql)await sql.end();await pg.stop();}
