// Isolated PostgreSQL, credentials and API replay. Never mutates a hosted environment.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { hashPassword } from '../lib/password.ts';
import { getSql } from '../db/index.ts';
import { runAs } from '../lib/tenant-context.ts';
import { importRealRecord } from '../db/inapi-portfolio.ts';
import { normalizeInapi } from '../lib/inapi-provider.ts';
async function port(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const dbPort=await port(), appPort=Number(process.env.WATCH_QA_PORT || await port()), base=`http://127.0.0.1:${appPort}`;
const directory=await mkdtemp(path.join(tmpdir(),'buho-watch-http-'));
const databaseUrl=`postgresql://postgres:isolated-watch-http@127.0.0.1:${dbPort}/watch_http`;
const pg=new EmbeddedPostgres({databaseDir:path.join(directory,'pg'),user:'postgres',password:'isolated-watch-http',port:dbPort,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
let sql,server,output='';
let stop;const stopped=new Promise(r=>stop=r);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
try{
 await pg.initialise();await pg.start();await pg.createDatabase('watch_http');
 const migration=postgres(databaseUrl,{max:1});await migrate(drizzle(migration),{migrationsFolder:'drizzle'});await migration.end();
 process.env.DATABASE_URL=databaseUrl;process.env.SOURCE_PROVIDER='inapi';process.env.INAPI_API_KEY='isolated';
 sql=getSql();const [org]=await sql`INSERT INTO organizations(name,slug) VALUES ('QA vigilancia aislada','watch-qa') RETURNING id`;
 const [user]=await sql`INSERT INTO users(name,initials,username,password_hash) VALUES ('QA Vigilancia','QA','qa_vigilancia',${await hashPassword('vigilancia-local-1')}) RETURNING id`;
 await sql`INSERT INTO organization_members(organization_id,user_id,role) VALUES (${org.id},${user.id},'admin')`;
 // Use the saved real sample if present for visual review; otherwise reproducible synthetic contract fixtures.
 let fixture={documents:{},searches:{}};
 if(process.env.WATCH_REPLAY_REAL==='true'){
  const raw=JSON.parse(await readFile('output/vigilancia-prueba-daniel/raw-results.json','utf8'));const baseline=JSON.parse(await readFile('output/vigilancia-prueba-daniel/baseline.json','utf8')).data.documents;
  for(const d of baseline)fixture.documents[d.application_id]=d;
  for(const r of raw.runs){fixture.searches[r.id]=r.search.data;for(const d of r.details.data.documents)fixture.documents[d.application_id]=d;}
 }else{
  const dates={filed_at:'2026-01-01',published_at:null,registered_at:null,expires_at:null,last_changed_at:null};
  for(const id of [100,...Array.from({length:30},(_,i)=>200+i)])fixture.documents[id]={application_id:id,registration_id:null,name:`Marca QA ${id}`,status:{code:'ET',description:'En Trámite'},dates,trademark:{sign_type:'Mixta'},holders:[{name:'Titular QA',country:'CL'}],representatives:[],classes:[{nice_class:35,coverage_text:'Publicidad'}],events:[],annotations:[],source:{}};
  const mark=id=>({application_id:id,registration_id:null,name:`Marca QA ${id}`,sign_type:'Mixta',dates,holders:[{name:'Titular QA'}],classes:[{nice_class:35,coverage_text:'Publicidad'}]});
  fixture.searches[100]={query:mark(100),results:Array.from({length:30},(_,i)=>({...mark(200+i),score:1-i/100,channels:{name:{rank:i+1}}})),candidate_count:50,elapsed_seconds:.1,warnings:[]};
 }
 const identity={organizationId:org.id,userId:user.id,name:'QA',organizationName:'QA',role:'admin',mustChangePassword:false};
 for(const id of Object.keys(fixture.searches))await runAs(identity,()=>sql.begin(tx=>importRealRecord(tx,normalizeInapi(fixture.documents[id]),'application')));
 const fixturePath=path.join(directory,'fixture.json');await writeFile(fixturePath,JSON.stringify(fixture));
 const env={...process.env,DATABASE_URL:databaseUrl,SOURCE_PROVIDER:'inapi',INAPI_API_KEY:'isolated',WATCH_FIXTURE_FILE:fixturePath,MONITORING_CRON_SECRET:'isolated-watch-cron',MONITORING_SCHEDULER_ENABLED:'true',APP_PUBLIC_ORIGIN:base,NODE_ENV:'production',PORT:String(appPort)};
 delete env.RAILWAY_ENVIRONMENT_ID;delete env.RAILWAY_PUBLIC_DOMAIN;delete env.NODE_OPTIONS;
 server=spawn(process.execPath,['--import','./tests/watch-fixture-hook.mjs','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(appPort)],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>output=(output+d).slice(-16000));server.stderr.on('data',d=>output=(output+d).slice(-16000));
 async function http(route,{cookie,body,authorization,origin=base}={}){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{origin,...(cookie?{cookie}:{}),...(authorization?{authorization}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,headers:r.headers,body:await r.json()};}
 for(let i=0;i<80;i++){try{if((await http('/api/health')).status===200)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 assert.equal((await http('/api/watch')).status,401);
 const login=await http('/api/auth/login',{body:{username:'qa_vigilancia',password:'vigilancia-local-1'}});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await http('/api/watch',{cookie,body:{action:'review'},origin:'https://untrusted.test'})).status,403);
 assert.equal((await http('/api/watch/worker',{body:{}})).status,403);
 for(const id of Object.keys(fixture.searches)){void id;const work=await http('/api/watch/worker',{body:{},authorization:'Bearer isolated-watch-cron'});assert.equal(work.status,200);assert.equal(work.body.completed,true,JSON.stringify(work.body));}
 const snapshot=await http('/api/watch',{cookie});assert.equal(snapshot.body.targets[0].results.length,30);const match=snapshot.body.targets[0].results[0].matchId;
 assert.equal((await http(`/api/watch/${match}`)).status,401);
 const detail=await http(`/api/watch/${match}`,{cookie});assert.equal(detail.status,200);assert.ok(detail.body.evidence.hit);
 assert.equal((await http('/api/watch/nonexistent',{cookie})).status,404);
 const beforeFollow=await http('/api/demo',{cookie});assert.equal(beforeFollow.body.data.watchSummary.detected,30*Object.keys(fixture.searches).length);
 if(process.env.WATCH_QA_KEEP!=='true'){
  assert.equal((await http('/api/watch',{cookie,body:{action:'follow',id:match}})).status,200);
  const demo=await http('/api/demo',{cookie});assert.ok(demo.body.data.matches.some(m=>m.id===match&&m.evidence));assert.equal(demo.body.data.brands.length,0);
  for(let i=0;i<2;i++)assert.equal((await http('/api/demo',{cookie,body:{action:'reviewMatch',id:match,status:'Convertida en caso'}})).status,200);
  assert.equal((await sql`SELECT count(*)::int AS n FROM cases WHERE source_match_id IS NOT NULL`)[0].n,1);
 }
 const feasibility=await http('/api/similarity',{cookie,body:{name:'Marca de prueba',limit:30,coverage:[],grouped:false}});assert.equal(feasibility.status,200,JSON.stringify(feasibility.body));assert.equal(feasibility.body.results.length,30);
 assert.equal((await http('/api/similarity',{cookie,body:{name:'',coverage:[]}})).status,400);
 async function upload(file){const form=new FormData();form.set('query',JSON.stringify({name:'Imagen propuesta',limit:30}));form.set('image',file);return fetch(base+'/api/similarity',{method:'POST',headers:{origin:base,cookie},body:form});}
 assert.equal((await upload(new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'}))).status,415);
 assert.equal((await upload(new File(['not a PNG'],'bad.png',{type:'image/png'}))).status,422);
 const imageResponse=await upload(new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64')],'pixel.png',{type:'image/png'}));assert.equal(imageResponse.status,200,await imageResponse.text());
 console.log(`PASS: HTTP authentication, CSRF, worker authorization, queued review, 30 results, saved evidence, follow, case idempotency and real proposal route. ${base}/app`);
 if(process.env.WATCH_QA_KEEP==='true'){console.log('QA_BROWSER_READY');await stopped;}
}catch(e){console.error(output);throw e;}finally{server?.kill('SIGTERM');if(sql)await sql.end();await pg.stop();}
