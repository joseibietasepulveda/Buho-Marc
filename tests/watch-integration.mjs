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
import { queueWatch, processWatchJob, followWatch, saveWatchSettings, watchSnapshot, setWatchPaused, persistWatch } from '../db/similarity.ts';
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
 const search=async input=>{requests.push(input);return {query,results:Array.from({length:50},(_,i)=>({...query,applicationId:String(200+i),name:`Tercero ${i}`,score:1-i/100,publishedAt:publication,channels:{name:{rank:i+1,score:.9}},history:[]})),groups:[],warnings:['bounded pool'],candidateCount:100,elapsedSeconds:.2,fetchedAt:new Date().toISOString()};};
 await runAs(identities[0], async()=>{
  assert.equal(await queueWatch(),1);assert.equal(await queueWatch(),0);
  assert.equal((await watchSnapshot()).targets.length,1); assert.equal((await watchSnapshot()).targets[0].applicationId,'100');
 });
 let entered, release; const gate=new Promise(r=>release=r), began=new Promise(r=>entered=r);
 const running=processWatchJob(async input=>{entered();await gate;return search(input);});await began;
 assert.equal((await processWatchJob(search)).skipped,true);release();assert.equal((await running).completed,true);
 await runAs(identities[0],async()=>{
  let snapshot=await watchSnapshot();assert.equal(snapshot.targets[0].results.length,50);const target=snapshot.targets[0];const id=target.results[0].matchId;
  await followWatch(id,true);await followWatch(id,true);
  assert.equal((await watchSnapshot()).targets[0].results[0].watchPublication,true);
  await saveWatchSettings({high:.8,medium:.4});assert.deepEqual((await watchSnapshot()).settings,{high:.8,medium:.4});
  await runAs(identities[1],async()=>assert.deepEqual((await watchSnapshot()).settings,{high:.6,medium:.3}));
  await assert.rejects(saveWatchSettings({high:.2,medium:.4}));
  assert.equal((await sql`SELECT count(*)::int AS n FROM match_reviews`)[0].n,1);
  await queueWatch(target.id);publication='2026-09-21';await processWatchJob(search);
  assert.equal((await sql`SELECT count(*)::int AS n FROM matches`)[0].n,50);
  assert.equal((await sql`SELECT count(*)::int AS n FROM notifications`)[0].n,51);
  snapshot=await watchSnapshot();assert.equal(snapshot.targets[0].results[0].reviewStatus,'En seguimiento');
  assert.equal(snapshot.targets[0].results[0].watchPublication,true);
  await assert.rejects(followWatch(id,true),/ya tiene una publicación/);
  assert.ok(requests.some(r=>r.filed_after));assert.ok(requests.some(r=>r.published_after));assert.ok(requests.every(r=>!(r.filed_after&&r.published_after)&&r.limit===50&&!r.states));
  await queueWatch(target.id);await processWatchJob(async()=>{throw new SimilarityError('ocupado',503,true)});
  assert.equal((await watchSnapshot()).targets[0].status,'retry');assert.equal((await watchSnapshot()).targets[0].results.length,50);
  await setWatchPaused(target.id,true);assert.equal((await processWatchJob(search)).skipped,true);
  await setWatchPaused(target.id,false);await processWatchJob(search);
  assert.equal((await sql`SELECT count(*)::int AS n FROM notifications`)[0].n,51);
  // A lease lost after a worker crash cannot publish stale results.
  await queueWatch(target.id);
  const [stale] = await sql`UPDATE monitoring_jobs SET status='running', started_at=now()-interval '4 minutes', request=request || '{"since":null}'::jsonb, attempt_count=1, lease_token='11111111-1111-4111-8111-111111111111' WHERE status='queued' RETURNING *`;
  await sql`INSERT INTO monitoring_job_attempts(monitoring_job_id,attempt_no,status) VALUES (${stale.id},1,'running')`;
  assert.equal((await processWatchJob(search)).completed,true);
  assert.equal(await persistWatch(stale,[await search({limit:50})]),false);
  assert.equal((await sql`SELECT status FROM monitoring_job_attempts WHERE monitoring_job_id=${stale.id} AND attempt_no=1`)[0].status,'interrupted');
  // Promotion retains the same watch target, matches and review.
  await sql.begin(tx=>importRealRecord(tx,{...source,status:'registered',registrationNumber:'777',registrationDate:'2026-09-21'},'brand'));
  assert.equal((await watchSnapshot()).targets.length,1);
  // A followed hit outside the next stock is still available in its owned row.
  await queueWatch(target.id);
  await processWatchJob(async input=>{const result=await search(input);return {...result,results:result.results.map(hit=>({...hit,applicationId:String(Number(hit.applicationId)+1)}))};},async()=>({records:[{...source,applicationNumber:'200',publicationDate:publication}],missing:[],version:1,fetchedAt:new Date().toISOString()}));
  const refreshed=(await watchSnapshot()).targets[0];
  assert.equal(refreshed.results.length,50);assert.ok(!refreshed.results.some(hit=>hit.applicationId==='200'));
  assert.ok(refreshed.savedResults.some(hit=>hit.applicationId==='200'&&hit.reviewStatus==='En seguimiento'));
  await runAs(identities[1],async()=>{assert.equal((await watchSnapshot()).targets.length,0);await assert.rejects(followWatch(id),/no encontrada/);});
 });
 // A second portfolio gets a turn before another ready job of the first one.
 await runAs(identities[1],async()=>{await sql.begin(tx=>importRealRecord(tx,{...source,applicationNumber:'102'},'application'));await queueWatch();});
 await runAs(identities[0],async()=>{await queueWatch((await watchSnapshot()).targets[0].id);});
 assert.equal((await processWatchJob(search)).applicationId,102);
 assert.equal((await processWatchJob(search)).applicationId,100);
 await runAs(identities[0], async()=>{
  await sql`UPDATE monitoring_jobs SET request = jsonb_set(request,'{limit}','30'::jsonb) WHERE brand_id IN (SELECT id FROM brands WHERE organization_id=${identities[0].organizationId}) AND status='success'`;
  // Existing daily idempotency key already exists in this synthetic scenario: simulate the prior release key.
  await sql`UPDATE monitoring_jobs SET idempotency_key = 'old:' || idempotency_key WHERE organization_id=${identities[0].organizationId}`;
  assert.equal(await queueWatch(),1);assert.equal(await queueWatch(),0);
  const [tracked]=await sql`UPDATE matches SET evidence = jsonb_set(evidence,'{hit,publishedAt}','null'::jsonb) WHERE organization_id=${identities[0].organizationId} AND source_record_id='201' RETURNING public_code,id`;
  await followWatch(tracked.public_code);publication='2026-09-22';
  let upgradeRequest;await processWatchJob(async request=>{upgradeRequest=request;return search(request);});
  assert.equal(upgradeRequest.limit,50);assert.equal(upgradeRequest.filed_after,undefined);
  assert.equal((await sql`SELECT count(*)::int AS n FROM notifications WHERE entity_id=${tracked.id} AND type='similarity_publication' AND title LIKE '%Tercero%'`)[0].n,2);
  assert.equal((await watchSnapshot()).targets[0].results.find(hit=>hit.applicationId==='201').reviewStatus,'En seguimiento');
});
 console.log('PASS: fair scheduling between portfolios and three-minute initial lease recovery.');
 console.log('PASS: migrations, owned pending enrollment, 50 results, idempotency, global concurrency, publication, preserved review, separate windows, retry, pause/resume, tenant isolation and registration transition.');
}finally{if(sql)await sql.end();await pg.stop();}
