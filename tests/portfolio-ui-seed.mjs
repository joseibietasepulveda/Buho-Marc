// Fictitious fixtures only; run against the isolated local database described in docs.
import {writeFile} from 'node:fs/promises';
import {getSql} from '../db/index.ts';
import {createSession} from '../lib/auth.ts';
const url=new URL(process.env.DATABASE_URL);if(url.hostname!=='127.0.0.1'||url.port!==(process.env.BUHO_LOCAL_DB_PORT||'55447')||url.pathname!=='/buho_local')throw Error('Only isolated UI database');
const sql=getSql();
const [org]=await sql`INSERT INTO organizations(name,slug) VALUES('Estudio de prueba visual','ui-improvements') ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`;
const [user]=await sql`INSERT INTO users(name,email,initials,must_change_password) VALUES('Abogada de prueba','visual@example.invalid','VP',false) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id`;
await sql`INSERT INTO organization_members(organization_id,user_id,role) VALUES(${org.id},${user.id},'admin') ON CONFLICT DO NOTHING`;
const names=['AURORA','MONTE AZUL','NUBE','TIERRA SUR'];
const mark=(id,name,n)=>({applicationId:id,registrationId:null,name,type:'Mixta',image:`/logos/logo-0${n}.png`,holders:[{name:'Sociedad de ejemplo SpA'}],classes:[{nice_class:30,coverage_text:'Chocolate, café y confitería'}],filedAt:'2026-10-01',publishedAt:null,registeredAt:null,status:'En Trámite',statusCode:'ET'});
for(let i=0;i<4;i++){
 const config={provider:'inapi',monitoringEnabled:true,portfolioRole:i===3?'third-party':'own',applicationNumber:String(7700000+i),type:'Mixta',sourceStatus:'Registrada',legalStatus:'registered',registrationState:'Registrada',logo:`/logos/logo-0${i}.png`};
 const [brand]=await sql`INSERT INTO brands(organization_id,public_code,name,word_mark,owner_name,registration_number,monitoring_config,created_by) VALUES(${org.id},${`BM-UI-${i}`},${names[i]},${names[i]},'Sociedad de ejemplo SpA',${String(8000000+i)},${sql.json(config)},${user.id}) ON CONFLICT(organization_id,public_code) DO UPDATE SET monitoring_config=EXCLUDED.monitoring_config RETURNING id`;
 await sql`INSERT INTO brand_classes(brand_id,nice_class) VALUES(${brand.id},30) ON CONFLICT DO NOTHING`;
 if(i<3)for(let n=0;n<2;n++){
  const query=mark(config.applicationNumber,names[i],i),hit={...mark(String(7800000+i*10+n),[`${names[i]} CHOCOLATES`,`${names[i]} DEL SUR`][n],i+1),score:.92-i*.08-n*.15,channels:{name:{score:.9}},history:[]};
  const [match]=await sql`INSERT INTO matches(organization_id,brand_id,public_code,source,source_record_id,application_number,found_name,applicant,level,total_score,explanation,evidence,review_status) VALUES(${org.id},${brand.id},${`CO-UI-${i}-${n}`},'DeQuiénEs',${hit.applicationId},${hit.applicationId},${hit.name},'Sociedad de ejemplo SpA','Alta',${Math.round(hit.score*100)},'Signos con elementos denominativos coincidentes',${sql.json({query,hit,discoveryKind:'filing'})},'Detectada') ON CONFLICT(organization_id,public_code) DO UPDATE SET evidence=EXCLUDED.evidence RETURNING id`;
  if(n===0){const [run]=await sql`INSERT INTO watch_digest_runs(organization_id,idempotency_key,trigger,delivery_mode,status) VALUES(${org.id},${`visual:${i}`},'manual','review','prepared') ON CONFLICT(organization_id,idempotency_key) DO UPDATE SET status='prepared' RETURNING id`;
  await sql`INSERT INTO watch_glm_decisions(organization_id,match_id,run_id,model,prompt_version,decision,cross_snapshot,evidence_fingerprint) SELECT ${org.id},id,${run.id},'fixture',2,${sql.json({show:true,reason:'Comparten el elemento distintivo principal y productos de confitería. Revisar el alcance de las coberturas antes de decidir.',insufficient:false})},${sql.json({reference:query,candidate:hit})},watch_evidence_fingerprint(evidence) FROM matches WHERE id=${match.id} ON CONFLICT(organization_id,match_id) DO NOTHING`;}
 }
}
const app={id:'IM-UI-PAY',name:'NUBE CHOCOLATES',applicationNumber:'7700999',type:'Denominativa',filedAt:'2026-06-01',statusId:'accepted-payment',recentEvent:'Aceptación a registro',niceClasses:'30',holderRut:'12345678-K',holder:'Sociedad de ejemplo SpA',client:'Sociedad de ejemplo SpA',history:[],procedure:{sourceActId:'fixture-pay',sourceActDate:'2026-10-01',sourceActDescription:'Resolución de aceptación a registro'}};
await sql`INSERT INTO registration_applications(organization_id,public_code,data) VALUES(${org.id},${app.id},${sql.json(app)}) ON CONFLICT(organization_id,public_code) DO NOTHING`;
await writeFile(process.env.BUHO_UI_SESSION_FILE||'.buho-local/ui-session.json',JSON.stringify({token:await createSession(user.id,org.id)}));
console.log('Isolated UI fixtures prepared');await sql.end();
