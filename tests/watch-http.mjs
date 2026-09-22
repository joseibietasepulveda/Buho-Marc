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
  for(const id of [100,...Array.from({length:50},(_,i)=>200+i)])fixture.documents[id]={application_id:id,registration_id:null,name:`Marca QA ${id}`,status:{code:'ET',description:'En Trámite'},dates,trademark:{sign_type:'Mixta'},holders:[{name:'Titular QA',country:'CL'}],representatives:[],classes:[{nice_class:35,coverage_text:'Publicidad'}],events:[],annotations:[],source:{}};
  const mark=id=>({application_id:id,registration_id:null,name:`Marca QA ${id}`,sign_type:'Mixta',dates,holders:[{name:'Titular QA'}],classes:[{nice_class:35,coverage_text:'Publicidad'}]});
  fixture.searches[100]={query:mark(100),results:Array.from({length:50},(_,i)=>({...mark(200+i),score:1-i/100,channels:{name:{rank:i+1}}})),candidate_count:50,elapsed_seconds:.1,warnings:[]};
 }
 const identity={organizationId:org.id,userId:user.id,name:'QA',organizationName:'QA',role:'admin',mustChangePassword:false};
 for(const id of Object.keys(fixture.searches))await runAs(identity,()=>sql.begin(tx=>importRealRecord(tx,normalizeInapi(fixture.documents[id]),'application')));
 const fixturePath=path.join(directory,'fixture.json');await writeFile(fixturePath,JSON.stringify(fixture));
 const env={...process.env,DATABASE_URL:databaseUrl,SOURCE_PROVIDER:'inapi',INAPI_API_KEY:'isolated',WATCH_FIXTURE_FILE:fixturePath,MONITORING_CRON_SECRET:'isolated-watch-cron',MONITORING_SCHEDULER_ENABLED:'true',APP_PUBLIC_ORIGIN:base,NODE_ENV:'production',PORT:String(appPort)};
 delete env.RAILWAY_ENVIRONMENT_ID;delete env.RAILWAY_PUBLIC_DOMAIN;delete env.NODE_OPTIONS;
 server=spawn(process.execPath,['--import','./tests/watch-fixture-hook.mjs','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(appPort)],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>output=(output+d).slice(-16000));server.stderr.on('data',d=>output=(output+d).slice(-16000));
 async function http(route,{cookie,body,authorization,origin=base,method}={}){const r=await fetch(base+route,{method:method ?? (body?'POST':'GET'),headers:{origin,...(cookie?{cookie}:{}),...(authorization?{authorization}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,headers:r.headers,body:await r.json()};}
 for(let i=0;i<80;i++){try{if((await http('/api/health')).status===200)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 assert.equal((await http('/api/watch')).status,401);
 const login=await http('/api/auth/login',{body:{username:'qa_vigilancia',password:'vigilancia-local-1'}});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await http('/api/watch',{cookie,body:{action:'review'},origin:'https://untrusted.test'})).status,403);
 assert.equal((await http('/api/watch/worker',{body:{}})).status,403);
 for(const id of Object.keys(fixture.searches)){void id;const work=await http('/api/watch/worker',{body:{},authorization:'Bearer isolated-watch-cron'});assert.equal(work.status,200);assert.equal(work.body.completed,true,JSON.stringify(work.body));}
 const snapshot=await http('/api/watch',{cookie});assert.equal(snapshot.body.targets[0].results.length,50);const match=snapshot.body.targets[0].results[0].matchId;
 assert.equal((await http(`/api/watch/${match}`)).status,401);
 const detail=await http(`/api/watch/${match}`,{cookie});assert.equal(detail.status,200);assert.ok(detail.body.evidence.hit);
 assert.equal((await http('/api/watch/nonexistent',{cookie})).status,404);
 const beforeFollow=await http('/api/demo',{cookie});if(process.env.WATCH_REPLAY_REAL!=='true')assert.equal(beforeFollow.body.data.watchSummary.detected,50*Object.keys(fixture.searches).length);
 assert.equal(beforeFollow.body.data.watchSummary.preview.length,3);
 assert.ok(beforeFollow.body.data.watchSummary.updatedAt);
 for(const preview of beforeFollow.body.data.watchSummary.preview)assert.equal((await http(`/api/watch/${preview.id}`,{cookie})).status,200);
 if(process.env.WATCH_REPLAY_REAL!=='true'){
  await http('/api/watch',{cookie,body:{action:'settings',settings:{high:1,medium:.99}}});
  const limited=await http('/api/demo',{cookie});assert.equal(limited.body.data.watchSummary.detected,2);assert.equal(limited.body.data.watchSummary.preview.length,2);
 }
 assert.equal((await http('/api/watch',{cookie,body:{action:'settings',settings:{high:.85,medium:.35}}})).status,200);
 assert.equal((await http('/api/watch',{cookie,body:{action:'settings',settings:{high:.2,medium:.6}}})).status,400);
 if(process.env.WATCH_QA_KEEP!=='true'){
  assert.equal((await http('/api/watch',{cookie,body:{action:'follow',id:match}})).status,200);
  const demo=await http('/api/demo',{cookie});assert.ok(demo.body.data.matches.some(m=>m.id===match&&m.evidence));assert.equal(demo.body.data.brands.length,Object.keys(fixture.searches).length);
  await sql`INSERT INTO cases (organization_id,public_code,title,stage,priority,status,client_name) VALUES (${org.id},'OP-123456789012345','Oposición con código no correlativo','En seguimiento','Media','active','Cliente QA')`;
  for(let i=0;i<2;i++){const converted=await http('/api/demo',{cookie,body:{action:'reviewMatch',id:match,status:'Convertida en caso',compact:true}});assert.equal(converted.status,200);assert.equal(converted.body.saved,true);assert.match(converted.body.caseId,/^BM-/);assert.equal(converted.body.data,undefined);}
  assert.equal((await sql`SELECT count(*)::int AS n FROM cases WHERE source_match_id IS NOT NULL`)[0].n,1);
 }
 assert.equal((await fetch(base+'/api/similarity/image?url='+encodeURIComponent('https://untrusted.test/logo.png'),{headers:{cookie}})).status,400);
 assert.equal((await fetch(base+'/api/similarity/image?url='+encodeURIComponent('https://marcas.dequienes.cl:444/logo.png'),{headers:{cookie}})).status,400);
 const feasibility=await http('/api/similarity',{cookie,body:{name:'Marca de prueba',limit:50,coverage:[],grouped:false}});assert.equal(feasibility.status,200,JSON.stringify(feasibility.body));assert.equal(feasibility.body.results.length,50);
 assert.equal((await http('/api/similarity',{cookie,body:{name:'',coverage:[]}})).status,400);
 async function upload(file){const form=new FormData();form.set('query',JSON.stringify({name:'Imagen propuesta',limit:50}));form.set('image',file);return fetch(base+'/api/similarity',{method:'POST',headers:{origin:base,cookie},body:form});}
 assert.equal((await upload(new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'}))).status,415);
 assert.equal((await upload(new File(['not a PNG'],'bad.png',{type:'image/png'}))).status,422);
 const imageResponse=await upload(new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64')],'pixel.png',{type:'image/png'}));assert.equal(imageResponse.status,200,await imageResponse.text());
 console.log(`PASS: HTTP authentication, CSRF, worker authorization, queued review, 50 results, saved evidence, follow, case idempotency and real proposal route. ${base}/app`);
 if(process.env.WATCH_QA_KEEP!=='true'){
  // Existing cached results and their dashboard counters obey the same display flags.
  const cached=await sql`SELECT id,evidence,application_number FROM matches WHERE organization_id=${org.id} AND review_status IN ('Detectada','Pendiente de clasificación') ORDER BY id LIMIT 4`;
  const countBefore=(await http('/api/demo',{cookie})).body.data.watchSummary.detected;
  for(const [i,row] of cached.entries()) {
    const state=['Registrada','Caducado','Vencida','*VER INSTANCIA'][i];
    const app=i===3?'1367215':row.application_number;
    await sql`UPDATE matches SET application_number=${app},evidence=${sql.json({...row.evidence,hit:{...row.evidence.hit,status:state,applicationId:app}})} WHERE id=${row.id}`;
  }
  assert.equal((await http('/api/demo',{cookie})).body.data.watchSummary.detected,countBefore-cached.length+1);
  for(const row of cached) await sql`UPDATE matches SET application_number=${row.application_number},evidence=${sql.json(row.evidence)} WHERE id=${row.id}`;
  const clientData={name:'Cliente de prueba',rut:'',contact:'',phone:'',email:''};
  const brandId=beforeFollow.body.data.brands[0].id;
  assert.equal((await http('/api/clients',{body:{data:clientData}})).status,401);
  assert.equal((await http('/api/clients',{cookie,body:{data:clientData},origin:'https://untrusted.test'})).status,403);
  assert.equal((await http('/api/clients',{cookie,body:{data:{...clientData,email:'invalid'}}})).status,400);
  const created=await Promise.all([1,2].map(n=>http('/api/clients',{cookie,body:{data:{...clientData,name:`Cliente ${n}`}}})));
  assert.ok(created.every(r=>r.status===201));assert.notEqual(created[0].body.client.id,created[1].body.client.id);
  assert.equal(created[0].body.client.mock,false);
  const clientId=created[0].body.client.id;
  assert.equal((await http('/api/clients',{cookie,method:'PUT',body:{brandId,clientId}})).status,200);
  assert.equal((await http('/api/clients',{cookie,method:'PUT',body:{brandId,clientId}})).status,200);
  assert.equal((await http('/api/clients',{cookie,method:'PUT',body:{brandId,clientId:created[1].body.client.id}})).status,409);
  assert.equal((await http('/api/demo',{cookie})).body.data.brands.find(b=>b.id===brandId).clientId,clientId);
  const edited=await http('/api/clients',{cookie,method:'PATCH',body:{id:clientId,version:1,field:'name',value:'Cliente renombrado'}});assert.equal(edited.status,200);
  const [otherOrg]=await sql`INSERT INTO organizations(name,slug) VALUES ('Otro estudio QA','other-client-qa') RETURNING id`;
  const otherIdentity={...identity,organizationId:otherOrg.id};
  await runAs(otherIdentity,()=>sql.begin(tx=>importRealRecord(tx,normalizeInapi({...Object.values(fixture.documents)[0],application_id:999,name:'Otra cartera'}),'brand')));
  const [otherBrand]=await sql`SELECT public_code FROM brands WHERE organization_id=${otherOrg.id}`;
  assert.equal((await http('/api/clients',{cookie,method:'PUT',body:{brandId:otherBrand.public_code,clientId}})).status,404);
  const previousClients=(await http('/api/clients',{cookie})).body.clients.length;
  assert.equal((await http('/api/clients',{cookie,body:{data:clientData,brandId:otherBrand.public_code}})).status,404);
  assert.equal((await http('/api/clients',{cookie})).body.clients.length,previousClients);
  const audit=(await http('/api/demo',{cookie})).body.data.audit;
  assert.ok(audit.some(a=>a.action==='Cliente asociado a la marca'&&a.detail.includes('Cliente 1')));
  assert.ok(audit.every(a=>!a.action.includes('watch.settings_changed')));
  console.log('PASS: client creation, concurrent numbering, edit, assignment persistence, conflicts, tenant isolation, atomic failure and readable audit.');
 }
 if(process.env.WATCH_QA_KEEP==='true'){
   const [brand]=await sql`SELECT id FROM brands WHERE organization_id=${org.id} LIMIT 1`;
   const [legacyNotice]=await sql`INSERT INTO notifications(organization_id,public_code,entity_type,entity_id,type,title,brand_name,urgency,change_detail) VALUES (${org.id},'QA-LEGACY','brand',${brand.id},'source-change','Se actualizó Marca QA 100: image_url, registration_id','Marca QA 100','Media',${sql.json({source:'inapi',summary:'Se actualizó Marca QA 100: image_url, registration_id',changes:[{field:'inapi.image_url',label:'image_url',before:null,after:'https://example.com/marca.png',ancillary:false},{field:'inapi.registration_id',label:'registration_id',before:null,after:123456,ancillary:false}]})}) RETURNING id`;
   await sql`INSERT INTO email_drafts(organization_id,notification_id,subject,body) VALUES (${org.id},${legacyNotice.id},'Actualización de antecedentes','Información de prueba para la revisión visual.')`;
   for(let i=0;i<5;i++){
    const [item]=await sql`INSERT INTO cases(organization_id,public_code,title,brand_id,client_name,stage,priority,created_by) VALUES (${org.id},${'QA-'+i},${'Revisión visual '+(i+1)},${brand.id},'Cliente QA',${i===0?'Esperando confirmación de cliente':i===4?'Concluido':'En seguimiento'},'Media',${user.id}) RETURNING id`;
    if(i<4)await sql`INSERT INTO case_tasks(organization_id,case_id,title,status,priority,assignee_id) VALUES (${org.id},${item.id},'Revisar antecedentes','pending',${i===0?'Alta':'Media'},${user.id})`;
   }
   console.log('QA_BROWSER_READY');await stopped;
 }
}catch(e){console.error(output);throw e;}finally{server?.kill('SIGTERM');if(sql)await sql.end();await pg.stop();}
