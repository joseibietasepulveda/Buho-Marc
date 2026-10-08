// Integration checks for the throwaway local pilot fixture only.
import assert from 'node:assert/strict';
import postgres from 'postgres';
import XLSX from 'xlsx';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.env.UX_TEST_BASE,dbUrl=process.env.DATABASE_URL,fixturePath=process.env.UX_FIXTURE_FILE;
if(!base||!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)||!dbUrl||new URL(dbUrl).hostname!=='127.0.0.1'||!fixturePath?.includes('buho-pilot-test-'))throw Error('Only isolated pilot fixtures may run these checks.');
const sql=postgres(dbUrl,{max:1});
async function login(username,password){const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({username,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
const alice=await login('pilot_alice','pilot-confirmed-password'),bob=await login('pilot_bob','pilot-temporary');
async function call(path,body,cookie=alice,method=body?'POST':'GET'){const r=await fetch(base+path,{method,headers:{cookie,origin:base,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
const [org]=await sql`SELECT id FROM organizations WHERE slug='pilot_alice'`;
const [match]=await sql`SELECT m.*,b.monitoring_config FROM matches m JOIN brands b ON b.id=m.brand_id WHERE m.organization_id=${org.id} AND m.public_code='AUD-0'`;
assert.ok(match);
const originalFixture=await readFile(fixturePath,'utf8'),fixture=JSON.parse(originalFixture),originalEvidence=match.evidence;
let auditFixtureIds=[];
async function waitFeedback(predicate){
 for(let attempt=0;attempt<100;attempt++){
  const [row]=await sql`SELECT * FROM watch_feedback WHERE match_id=${match.id}`;
  if(row&&predicate(row))return row;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('Feedback delivery did not settle');
}
try{
 const sourceId='123e4567-e89b-12d3-a456-426614174000';
 await sql`UPDATE matches SET evidence=${sql.json({...match.evidence,hit:{...match.evidence.hit,searchId:sourceId}})} WHERE id=${match.id}`;
 fixture.feedbackDelayMs=2500;await writeFile(fixturePath,JSON.stringify(fixture));
 const started=Date.now();
 const up=await call('/api/watch/feedback',{matchId:match.public_code,vote:'up',rationale:'La cobertura merece revisión.'});assert.equal(up.status,200,JSON.stringify(up.data));assert.equal(up.data.feedback.delivery,'pending');
 assert.ok(Date.now()-started<2000,'local persistence must not await the 2.5-second upstream response');
 const [saved]=await sql`SELECT * FROM watch_feedback WHERE match_id=${match.id}`;
 assert.equal(saved.own_application_id,match.monitoring_config.applicationNumber);assert.equal(saved.offered_application_id,match.application_number);assert.equal(Number(saved.score),match.evidence.hit.score);
 await waitFeedback(row=>row.delivery==='sent');
 fixture.feedbackDelayMs=0;await writeFile(fixturePath,JSON.stringify(fixture));
 const remote=JSON.parse((await readFile(fixturePath+'.feedback.jsonl','utf8')).trim().split('\n').at(-1));assert.equal(remote.judge.id,`${org.id}/${saved.actor_user_id}`);assert.deepEqual(remote.judgments,[{application_id:Number(match.application_number),grade:2,rationale:'La cobertura merece revisión.'}]);
 assert.notEqual((await call('/api/watch/feedback',{matchId:match.public_code,vote:'down'},bob)).status,200);
 assert.equal((await call('/api/watch/feedback',{matchId:match.public_code,vote:'up',score:1})).status,400);
 fixture.feedbackFail=true;await writeFile(fixturePath,JSON.stringify(fixture));
 const pending=await call('/api/watch/feedback',{matchId:match.public_code,vote:'down'});assert.equal(pending.data.feedback.delivery,'pending');assert.equal(pending.data.feedback.rationale,'La cobertura merece revisión.');
 await waitFeedback(row=>row.attempts>0&&!row.lease_token);
 fixture.feedbackFail=false;await writeFile(fixturePath,JSON.stringify(fixture));
 const retry=await call('/api/watch/feedback',{matchId:match.public_code,vote:'down'});assert.equal(retry.data.feedback.delivery,'pending');
 await waitFeedback(row=>row.delivery==='sent');
 // An edit while an older version is being delivered must remain queued.
 fixture.feedbackDelayMs=1000;await writeFile(fixturePath,JSON.stringify(fixture));
 await call('/api/watch/feedback',{matchId:match.public_code,vote:'up'});
 await waitFeedback(row=>Boolean(row.lease_token));
 const latest=await call('/api/watch/feedback',{matchId:match.public_code,vote:'down',rationale:'Comentario más reciente.'});
 assert.equal(latest.data.feedback.rationale,'Comentario más reciente.');
 const queued=await waitFeedback(row=>!row.lease_token);
 assert.equal(queued.delivery,'pending');assert.equal(queued.vote,'down');assert.equal(queued.rationale,'Comentario más reciente.');
 const worker=await fetch(base+'/api/watch/worker',{method:'POST',headers:{authorization:'Bearer isolated-cron'}});assert.equal(worker.status,200);
 await waitFeedback(row=>row.delivery==='sent');
 const lastRemote=JSON.parse((await readFile(fixturePath+'.feedback.jsonl','utf8')).trim().split('\n').at(-1));
 assert.equal(lastRemote.judgments[0].rationale,'Comentario más reciente.');assert.equal(lastRemote.judgments[0].grade,0);
 const watch=await call('/api/watch');assert.equal(watch.status,200);assert.ok(JSON.stringify(watch.data).includes('Comentario más reciente.'));
 console.log('PASS feedback: server-owned pair/score/actor, matching remote ACK, outage retained, retry, persistence and tenant isolation');
 auditFixtureIds=(await sql`INSERT INTO audit_events(organization_id,actor_user_id,entity_type,entity_id,action,occurred_at) SELECT ${org.id},${saved.actor_user_id},'match',${match.id},'match.managed',now()-i*interval '1 minute' FROM generate_series(1,30) i RETURNING id`).map(row=>row.id);
 const audit=await call('/api/audit');assert.equal(audit.status,200,JSON.stringify(audit.data));assert.ok(audit.data.total>=25);assert.equal(audit.data.entries.length,25);
 const next=await call('/api/audit?page=2');assert.equal(next.status,200);assert.ok(!next.data.entries.some(row=>audit.data.entries.some(first=>first.id===row.id)));
 const feedback=await call('/api/audit?action=watch.feedback');assert.ok(feedback.data.entries.every(row=>row.actionKey==='watch.feedback'));assert.ok(feedback.data.entries.some(row=>row.reference?.id===match.public_code));
 const other=await call('/api/audit',undefined,bob);assert.ok(!other.data.entries.some(row=>feedback.data.entries.some(first=>first.id===row.id)));
 const filtered=await call('/api/audit?q=Mistral');assert.ok(filtered.data.entries.every(row=>row.detail.toLowerCase().includes('mistral')));
 assert.equal((await call('/api/audit?from=2026-10-05&to=2026-10-04')).status,400);assert.equal((await call('/api/audit?actor=broken')).status,400);
 console.log('PASS audit: complete pagination, search, source reference, action/date validation and tenant isolation');
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Mis solicitudes'],['1234567'],[2345678],['1234567']]),'Cartera FA');
 const form=new FormData();form.set('file',new File([XLSX.write(wb,{bookType:'xls',type:'buffer'})],'cartera-antigua.xls'));
 const upload=await fetch(base+'/api/portfolio/import',{method:'POST',headers:{cookie:alice,origin:base},body:form});assert.equal(upload.status,200);const parsed=await upload.json();assert.deepEqual(parsed.ids,['1234567','2345678']);assert.equal(parsed.duplicates,1);assert.equal(parsed.invalid.length,0);
 console.log('PASS legacy XLS: arbitrary sheet/header, numeric strings, duplicate elimination through the real upload endpoint');
}finally{if(auditFixtureIds.length)await sql`DELETE FROM audit_events WHERE id IN ${sql(auditFixtureIds)}`;await writeFile(fixturePath,originalFixture);await sql`UPDATE matches SET evidence=${sql.json(originalEvidence)} WHERE id=${match.id}`;await sql.end();}
