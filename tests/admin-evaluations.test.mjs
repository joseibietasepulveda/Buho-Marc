import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createServer} from 'node:net';
import {registerHooks} from 'node:module';
import path from 'node:path';
import os from 'node:os';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import {drizzle} from 'drizzle-orm/postgres-js';
import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {getSql} from '../db/index.ts';
import {analyticsSql,buildAdminDashboard} from '../db/admin-analytics.ts';
import {evaluationSummary,readEvaluations} from '../db/admin-evaluations.ts';
import {createSession} from '../lib/auth.ts';
import {seedAdminEvaluations} from './fixtures/admin-evaluations.mjs';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')){const target=new URL(`../${specifier.slice(2)}`,import.meta.url);return next(existsSync(path.join(target.pathname,'index.ts'))?`${target}/index.ts`:`${target}.ts`,context);}return next(specifier,context);}});

test('all evaluations: unique crosses, repeated decisions, cross-channel opinion changes, comments, full history, pagination and access',{timeout:120000},async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'buho-evaluations-test-'));
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 const pg=new EmbeddedPostgres({databaseDir:path.join(dir,'pg'),user:'postgres',password:'evaluations-test',port,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog(){},onError(){}});
 const previous={DATABASE_URL:process.env.DATABASE_URL,SOURCE_PROVIDER:process.env.SOURCE_PROVIDER,APP_PUBLIC_ORIGIN:process.env.APP_PUBLIC_ORIGIN};const fetcher=globalThis.fetch;let sql;
 try{
  await pg.initialise();await pg.start();await pg.createDatabase('evaluations_test');Object.assign(process.env,{DATABASE_URL:`postgresql://postgres:evaluations-test@127.0.0.1:${port}/evaluations_test`,SOURCE_PROVIDER:'inapi',APP_PUBLIC_ORIGIN:'https://app.example'});
  const migration=postgres(process.env.DATABASE_URL,{max:1,onnotice(){}});await migrate(drizzle(migration),{migrationsFolder:'drizzle'});await migration.end();sql=getSql();
  const f=await seedAdminEvaluations(sql);globalThis.fetch=()=>{throw Error('No external providers allowed');};
  const scope={from:'2026-10-01',to:'2026-10-14',organizationId:f.org.id,userId:null};
  const filters={page:1,pageSize:40,search:'',source:'all',outcome:'all',focus:'all',matchId:null,allDates:false,asOf:'2026-10-14T23:59:59Z'};
  await t.test('counts preserve people and distinguish decisions from comments',async()=>{
   const summary=await evaluationSummary(analyticsSql(),scope);
   assert.deepEqual(summary.totals,{evaluations:8,uniqueCrosses:3,records:10,thumbsUp:2,thumbsDown:2,formalEvaluations:4,opinionChanges:2,commentUpdates:5,commentOnly:2,snapshots:1});
   const ana=summary.users.find(r=>r.userId===f.ana.id),bruno=summary.users.find(r=>r.userId===f.bruno.id);
   assert.equal(ana.evaluations,5);assert.equal(ana.uniqueCrosses,2);assert.equal(ana.opinionChanges,2);assert.equal(ana.commentUpdates,4);assert.equal(bruno.evaluations,2);assert.equal(bruno.uniqueCrosses,2);
   assert.equal(summary.users.find(r=>r.userId===null).evaluations,1,'unknown author is never assigned to a current lawyer');
   assert.equal((await evaluationSummary(analyticsSql(),{...scope,userId:f.bruno.id})).totals.evaluations,2);
   const report=await buildAdminDashboard(scope,new Date('2026-10-14T12:00:00Z'));
   assert.equal(report.alerts.metrics.find(m=>m.key==='reviewed').value,4,'thumb-only states are reviews too');assert.equal(report.users.rows.find(r=>r.id===f.ana.id).reviews,5);assert.equal(report.users.rows.find(r=>r.id===f.ana.id).reviewedCrosses,2);assert.equal(report.evaluations.metrics.find(m=>m.key==='evaluations').value,8);
  });
  await t.test('history gives previous opinions/text without counting outside-period context or deliveries',async()=>{
   const page=await readEvaluations(analyticsSql(),scope,filters);assert.equal(page.total,10);
   const changed=page.rows.find(r=>r.id===f.changed);assert.equal(changed.opinionChanged,true);assert.equal(changed.previousDecision,'up');assert.equal(changed.previousComment,'Inicial');assert.equal(changed.score,91);assert.equal(changed.scoreAtEvaluation,true);
   const comment=page.rows.find(r=>r.id===f.commentOnly);assert.equal(comment.kind,'comment');assert.equal(comment.opinionChanged,false);assert.equal(comment.comment,'Preciso el motivo');assert.equal(comment.previousComment,'Los conjuntos difieren');
   const removed=page.rows.find(r=>r.id===f.removedComment);assert.equal(removed.kind,'comment');assert.equal(removed.opinionChanged,false);assert.equal(removed.comment,'');assert.equal(removed.previousComment,'Preciso el motivo');
   assert.equal(page.rows.find(r=>r.decision==='Convertida en caso').opinionChanged,false);
   assert.equal(page.rows.filter(r=>r.snapshot).length,1,'current state with audited history must not duplicate the audit events');
   assert.equal((await readEvaluations(analyticsSql(),scope,{...filters,allDates:true})).total,11);
   assert.equal((await readEvaluations(analyticsSql(),scope,{...filters,focus:'changes'})).total,2);
   assert.equal((await readEvaluations(analyticsSql(),scope,{...filters,search:'Los conjuntos difieren'})).rows.some(r=>r.id===f.commentOnly),true,'search includes previous comments');
   assert.equal((await readEvaluations(analyticsSql(),scope,{...filters,search:'%'})).total,0,'SQL wildcard must be literal');
  });
  await t.test('pagination has no 500-row cap, stable cut, and safe authenticated tenant scope',async()=>{
   for(let i=0;i<510;i++)await f.formal(f.b.id,f.ana.id,`2026-10-10T10:${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}Z`,'Descartada');
   const ids=new Set();let total=0;
   for(let page=1;page<=6;page++){const data=await readEvaluations(analyticsSql(),scope,{...filters,page,pageSize:100});total=data.total;for(const r of data.rows){assert.equal(ids.has(r.id),false);ids.add(r.id);}}
   assert.equal(total,520);assert.equal(ids.size,520);
   const cutoff=await readEvaluations(analyticsSql(),scope,{...filters,pageSize:2,asOf:'2026-10-09T23:59:59Z'});assert.equal(cutoff.total,10);assert.equal((await readEvaluations(analyticsSql(),scope,{...filters,page:2,pageSize:2,asOf:cutoff.filters.asOf})).total,10);
   const api=await import('../app/api/admin/evaluations/route.ts');const admin=await createSession(f.ana.id,f.org.id),member=await createSession(f.bruno.id,f.org.id),foreign=await createSession(f.foreign.id,f.other.id);
   const request=(query='',cookie)=>new Request('https://app.example/api/admin/evaluations?from=2026-10-01&to=2026-10-14'+query,{headers:cookie?{cookie:`buho_session=${cookie}`}:{}});
   assert.equal((await api.GET(request())).status,401);assert.equal((await api.GET(request('',member))).status,403);assert.equal((await api.GET(request('',foreign))).status,403);
   const response=await api.GET(request(`&organizationId=${f.org.id}&userId=${f.bruno.id}`,admin));assert.equal(response.status,200);const body=await response.json();assert.equal(body.total,2);assert.ok(body.rows.every(r=>r.userId===f.bruno.id&&r.organizationId===f.org.id));assert.ok(body.rows.some(r=>r.comment.includes('<script>')),'text is authorized data, never executed HTML');
   assert.equal((await api.GET(request('&pageSize=101',admin))).status,400);assert.equal((await api.GET(request('&userId=invalid',admin))).status,400);
   assert.equal((await api.GET(request('&allDates=true',admin))).status,200);
  });
  await t.test('incomplete prior history and formal comment edits remain explicit',async()=>{
   const id=await f.feedback(f.d.id,f.ana.id,'2026-10-08T10:00:00Z','down','Ahora descarto',{vote:'up',rationale:'Comentario previo sin evento'});
   const edited=await f.formal(f.b.id,f.ana.id,'2026-10-12T10:00:00Z','Descartada','Cobertura distinta');
   const rows=(await readEvaluations(analyticsSql(),scope,{...filters,source:'all',focus:'changes'})).rows;
   assert.equal(rows.find(r=>r.id===id).opinionChanged,true,'before_data proves a prior vote even when its event is missing');
   const comments=await readEvaluations(analyticsSql(),scope,{...filters,focus:'comments'});
   const record=comments.rows.find(r=>r.id===edited);assert.equal(record.kind,'comment');assert.equal(record.opinionChanged,false);
  });
 }finally{
  globalThis.fetch=fetcher;if(globalThis.buhoAnalyticsReadSql){await globalThis.buhoAnalyticsReadSql.end();delete globalThis.buhoAnalyticsReadSql;}if(sql)await sql.end();await pg.stop();await rm(dir,{recursive:true,force:true});
  for(const[k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
});
