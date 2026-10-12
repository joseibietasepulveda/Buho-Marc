import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { prepareElquiWatch } from '../db/elqui-watch.ts';
import { DEMO_ACTOR, DEMO_ORGANIZATION } from '../lib/tenant-context.ts';
import { PUBLIC_BRIOCHE_EXAMPLE } from '../db/pilot-public-brioche.ts';
import { featuredWatchRank } from '../lib/featured-watch.ts';
import { watchPage } from '../lib/watch-page.ts';

test('Elqui provisioning is isolated, reversible in review, and idempotent without source searches', async () => {
  const listener=createServer().listen(0,'127.0.0.1'); await once(listener,'listening'); const port=listener.address().port; await new Promise(r=>listener.close(r));
  const directory=await mkdtemp(path.join(tmpdir(),'buho-elqui-'));
  const pg=new EmbeddedPostgres({databaseDir:path.join(directory,'pg'),user:'postgres',password:'isolated',port,persistent:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog(){},onError(){}});
  let sql;
  const originalFetch=globalThis.fetch; globalThis.fetch=()=>{throw new Error('No external queries allowed');};
  try {
    await pg.initialise(); await pg.start(); await pg.createDatabase('elqui');
    const url=`postgresql://postgres:isolated@127.0.0.1:${port}/elqui`;
    const migration=postgres(url,{max:1,onnotice(){}});
    await migrate(drizzle(migration),{migrationsFolder:'drizzle'}); await migration.end();
    sql=postgres(url,{max:1,prepare:false,onnotice(){}});
    await sql`INSERT INTO organizations(id,name,slug) VALUES (${DEMO_ORGANIZATION},'Ibieta','estudio-ibieta-ip')`;
    await sql`INSERT INTO users(id,name,initials) VALUES (${DEMO_ACTOR},'Admin','JI')`;
    const [be]=await sql`INSERT INTO organizations(name,slug) VALUES ('B&E','barros-errazuriz') RETURNING id`;
    const [other]=await sql`INSERT INTO organizations(name,slug) VALUES ('Other','other') RETURNING id`;
    for(const org of [DEMO_ORGANIZATION,be.id,other.id]) await sql`INSERT INTO organization_members(organization_id,user_id,role) VALUES (${org},${DEMO_ACTOR},'admin')`;
    const found={...PUBLIC_BRIOCHE_EXAMPLE.record,applicationNumber:'1670929',name:'ELQUI.CL',registrationNumber:null,registrationDate:null,status:'substantive-objection',type:'Denominativa',logo:''};
    await sql`INSERT INTO source_records(application_number,data) VALUES ('1670929',${sql.json(found)})`;
    const [brand]=await sql`INSERT INTO brands(organization_id,public_code,name,word_mark,owner_name,status,monitoring_config) VALUES (${DEMO_ORGANIZATION},'BM-R-1670929','ELQUI.CL','ELQUI.CL','Titular','Activa',${sql.json({provider:'inapi',applicationNumber:'1670929',monitoringEnabled:true,watchOnly:true})}) RETURNING id`;
    const query={applicationId:'1670929',registrationId:null,name:'ELQUI.CL',type:'Denominativa',image:'',holders:[],classes:[{nice_class:38}],filedAt:found.filingDate,publishedAt:found.publicationDate,registeredAt:null,status:'En Trámite',statusCode:'T'};
    const hit={...query,applicationId:'1572142',registrationId:'1234567',name:'Tv elqui.cl',type:'Mixta',filedAt:'2024-01-01',publishedAt:'2024-02-02',registeredAt:'2024-07-01',status:'Registrada',score:.6841,channels:{name:{score:.5}},history:[],sourceEvidence:{search:{},dossier:{status:{code:'R',description:'Registrada'},trademark:{sign_type:'Mixta'},classes:[{nice_class:38}],holders:[{name:'Titular de prueba'}],representatives:[],events:[],annotations:[]}}};
    const evidence={query,hit,fetchedAt:'2026-10-05T23:40:00.000Z',watchPublication:false};
    const [original]=await sql`INSERT INTO matches(organization_id,public_code,brand_id,source,source_record_id,found_name,applicant,application_number,level,total_score,explanation,review_status,evidence) VALUES (${DEMO_ORGANIZATION},'ORIGINAL',${brand.id},'DeQuiénEs','1572142','Tv elqui.cl','Titular','1572142','Sin clasificar',68,'Original','Detectada',${sql.json(evidence)}) RETURNING id`;
    await assert.rejects(prepareElquiWatch(sql,'other',true),/fuera del alcance/);
    const before=await sql`SELECT count(*)::int AS n FROM brands`;
    assert.equal((await prepareElquiWatch(sql,'estudio-ibieta-ip')).applied,false);
    assert.deepEqual(await sql`SELECT count(*)::int AS n FROM brands`,before);
    for(const slug of ['estudio-ibieta-ip','barros-errazuriz']) {
      const result=await prepareElquiWatch(sql,slug,true); assert.equal(result.applied,true); assert.equal(result.score,.6841);
      assert.equal((await prepareElquiWatch(sql,slug,true)).alreadyApplied,true);
    }
    const rows=await sql`SELECT b.monitoring_config,m.evidence,m.id,m.review_status FROM brands b JOIN matches m ON m.brand_id=b.id WHERE b.public_code='BM-R-1572142'`;
    assert.equal(rows.length,2);
    for(const row of rows) {
      assert.equal(row.monitoring_config.watchOnly,false); assert.equal(row.monitoring_config.monitoringEnabled,true); assert.equal(row.monitoring_config.presentationExample,undefined);
      assert.equal(row.evidence.query.applicationId,'1572142'); assert.equal(row.evidence.hit.applicationId,'1670929'); assert.equal(row.evidence.hit.name,'ELQUI.CL'); assert.equal(row.evidence.hit.score,.6841); assert.equal(row.evidence.watchPublication,false);
      assert.equal(row.evidence.presentationReversedFrom.ownApplication,'1670929');
    }
    assert.equal((await sql`SELECT status FROM brands WHERE id=${brand.id}`)[0].status,'Pausada');
    assert.deepEqual((await sql`SELECT evidence FROM matches WHERE id=${original.id}`)[0].evidence,evidence);
    assert.equal((await sql`SELECT count(*)::int AS n FROM brands WHERE organization_id=${other.id}`)[0].n,0);
    assert.equal((await sql`SELECT count(*)::int AS n FROM notifications`)[0].n,0);
    assert.equal((await sql`SELECT count(*)::int AS n FROM monitoring_jobs`)[0].n,0);
    await sql`UPDATE matches SET review_status='Descartada' WHERE id=${rows[0].id}`;
    await prepareElquiWatch(sql,'estudio-ibieta-ip',true);
    assert.equal((await sql`SELECT review_status FROM matches WHERE id=${rows[0].id}`)[0].review_status,'Descartada');
    const makeTarget=(id,other,score)=>({id,name:id,applicationId:id,image:'',ownStatus:'Registrada',paused:false,status:'pending',reviewedAt:null,nextReviewAt:null,warnings:[],results:[],savedResults:[{...query,applicationId:other,score,channels:{},history:[],reviewStatus:'Detectada',featuredRank:featuredWatchRank(id,other)}]});
    const page=watchPage({configured:true,automaticEnabled:false,settings:{high:.7,medium:.55},targets:[makeTarget('1659715','1683639',.9),makeTarget('1552147','1672680',.65),makeTarget('1572142','1670929',.6841)]},new URLSearchParams());
    assert.deepEqual(page.featured.map(r=>r.target.applicationId),['1572142','1552147','1659715']);
  } finally { globalThis.fetch=originalFetch; if(sql)await sql.end(); await pg.stop(); }
});
