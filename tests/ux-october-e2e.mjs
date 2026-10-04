// Requires the throwaway pilot-e2e server; never runs against a hosted environment.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';
const base=process.env.UX_TEST_BASE;
if(!base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error('Use only the isolated local pilot server');
async function login(username,password){const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({username,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
const alice=await login('pilot_alice','pilot-confirmed-password'),bob=await login('pilot_bob','pilot-temporary');
async function call(path,body,cookie=alice,method=body?'POST':'GET'){const r=await fetch(base+path,{method,headers:{cookie,origin:base,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():new Uint8Array(await r.arrayBuffer())};}
const created=await call('/api/clients',{data:{name:'Cartera Cordillera',rut:'76.123.456-7',email:'',contact:'Contacto de prueba',phone:''}});assert.equal(created.status,201);const clientId=created.data.client.id;
const bobCreated=await call('/api/clients',{data:{name:'Cliente de otro espacio',rut:'',email:'',contact:'',phone:''}},bob);assert.equal(bobCreated.status,201);
let snapshot=(await call('/api/demo')).data.data;
let item=snapshot.cases.find(c=>c.stage!=='Concluido');assert.ok(item);
const priority=await call('/api/demo',{action:'updateCasePriority',id:item.id,priority:'Alta'});assert.equal(priority.status,200,JSON.stringify(priority.data));assert.equal((await call('/api/demo')).data.data.cases.find(c=>c.id===item.id).priority,'Alta');
assert.notEqual((await call('/api/demo',{action:'updateCasePriority',id:item.id,priority:'Baja'},bob)).status,200);
console.log('PASS: case priority persists and is tenant-scoped');
const createdTask=await call('/api/demo',{action:'saveCaseTask',id:item.id,task:{id:randomUUID(),title:'Tarea para comprobar eliminación',status:'pending',priority:'Media',dueDate:'2026-10-05'}});assert.equal(createdTask.status,200,JSON.stringify(createdTask.data));
const task=createdTask.data.data.cases.find(c=>c.id===item.id).tasks.find(t=>t.title==='Tarea para comprobar eliminación');assert.ok(task);
const deletion=await call('/api/tasks',{action:'delete',entityType:'case',entityId:item.id,taskId:task.id});assert.equal(deletion.status,200);assert.ok(!(await call('/api/demo')).data.data.cases.find(c=>c.id===item.id).tasks.some(t=>t.id===task.id));
console.log('PASS: task deletion survives reload');
if(process.env.UX_FIXTURE_FILE){
 const file=process.env.UX_FIXTURE_FILE,fixture=JSON.parse(await readFile(file,'utf8'));
 for(const [id,name,registration] of [[9123451,'VENTISCA CORDILLERA',1987651],[9123452,'RAULÍ CORDILLERA',1987652],[9123453,'QUILLAY CORDILLERA',null]]){
  const doc=structuredClone(fixture.documents[registration?1234567:3456789]);doc.application_id=id;doc.name=name;doc.registration_number=registration;
  doc.representatives=[{name:'Estudio Cordillera',rut:'77123456',dv:'K',country:'CL'}];fixture.documents[id]=doc;
 }
 await writeFile(file,JSON.stringify(fixture));
 const discovery=await call('/api/inapi/search',{partyName:'Cordillera',role:'representative',limit:2});assert.equal(discovery.status,200,JSON.stringify(discovery.data));assert.equal(discovery.data.total,3);assert.equal(discovery.data.nextOffset,2);assert.equal(discovery.data.candidates.length,2);assert.match(discovery.data.candidates[0].explanation,/Representante: Estudio Cordillera/);
 const next=await call('/api/inapi/search',{partyName:'Cordillera',role:'representative',limit:2,offset:2});assert.equal(next.status,200);assert.equal(next.data.candidates.length,1);assert.equal(next.data.hasMore,false);
 const filtered=await call('/api/inapi/search',{partyName:'Cordillera',role:'representative',name:'rauli',matchMode:'word'});assert.equal(filtered.status,200);assert.deepEqual(filtered.data.candidates.map(c=>c.applicationNumber),['9123452']);
 const fresh=await call('/api/portfolio/import',{action:'import',ids:['9123451','9123453'],ownPortfolioConfirmed:true,assignments:{9123451:{clientId,clientRole:'representative'},9123453:{clientId,clientRole:'holder'}}});assert.equal(fresh.status,200,JSON.stringify(fresh.data));assert.ok(fresh.data.results.every(r=>r.outcome==='imported'));
 assert.equal((await call('/api/demo')).data.data.brands.find(b=>b.applicationNumber==='9123451').clientId,clientId);
 const applications=(await call('/api/registrations')).data.applications;assert.equal(applications.find(a=>a.applicationNumber==='9123453').clientId,clientId);
 assert.equal((await call('/api/clients/report?clientId='+clientId)).data.count,2);
 const duplicate=await call('/api/portfolio/import',{action:'import',ids:['9123451'],ownPortfolioConfirmed:true,assignments:{9123451:{clientId:'unassigned',clientRole:'holder'}}});assert.equal(duplicate.data.results[0].outcome,'existing');assert.equal((await call('/api/demo')).data.data.brands.find(b=>b.applicationNumber==='9123451').clientId,clientId);
 console.log('PASS: representative discovery, pagination, text criteria, confirmed client/role for new brands and applications, duplicate preservation');
}
const imported=await call('/api/portfolio/import',{action:'import',ids:['1234567','2345678'],ownPortfolioConfirmed:true,assignments:{1234567:{clientId,clientRole:'representative'},2345678:{clientId,clientRole:'holder'}}});assert.equal(imported.status,200,JSON.stringify(imported.data));
snapshot=(await call('/api/demo')).data.data;const brand=snapshot.brands.find(b=>b.applicationNumber==='1234567');assert.ok(brand); // Assignment of a pre-existing record is intentionally unchanged.
const assignment=await call('/api/clients',{brandId:brand.id,clientId},alice,'PUT');assert.equal(assignment.status,200,JSON.stringify(assignment.data));
const metadata=await call('/api/clients/report?clientId='+clientId);assert.equal(metadata.status,200,JSON.stringify(metadata.data));assert.ok(metadata.data.count>=1);assert.ok(metadata.data.fields.some(f=>f.key.startsWith('source.')));
const columns=['applicationNumber','name','status'];
for(const format of ['xlsx','docx','pdf']){
 const report=await call('/api/clients/report',{clientId,fields:columns,format});assert.equal(report.status,200,JSON.stringify(report.data));
 if(format==='xlsx'){const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(report.data));assert.equal(wb.worksheets[0].columnCount,3);assert.equal(wb.worksheets[0].getRow(2).getCell(1).value,'1234567');}
 else if(format==='pdf')assert.ok((await PDFDocument.load(report.data)).getPageCount());else assert.equal(Buffer.from(report.data).subarray(0,2).toString(),'PK');
}
const otherMetadata=await call('/api/clients/report?clientId='+clientId,undefined,bob);assert.equal(otherMetadata.status,200);assert.equal(otherMetadata.data.count,0);
assert.equal((await call('/api/clients/report',{clientId,fields:['private-field'],format:'xlsx'})).status,422);
console.log('PASS: client report columns, Excel/Word/PDF and tenant isolation');
snapshot=(await call('/api/demo')).data.data;
const notice=snapshot.notices[0];assert.ok(notice);
const wrong=await call('/api/notifications',{id:notice.id},bob,'DELETE');assert.equal(wrong.status,200);assert.deepEqual(wrong.data.ids,[]);
assert.ok((await call('/api/demo')).data.data.notices.some(n=>n.id===notice.id));
const removed=await call('/api/notifications',{id:notice.id},alice,'DELETE');assert.equal(removed.status,200);assert.ok(removed.data.ids.includes(notice.id));assert.ok(!(await call('/api/demo')).data.data.notices.some(n=>n.id===notice.id));
const beforeClear=(await call('/api/demo')).data.data.notices;
const cleared=await call('/api/notifications',{scope:'priority'},alice,'PATCH');assert.equal(cleared.status,200);assert.equal(cleared.data.action,'reviewed');
const afterClear=(await call('/api/demo')).data.data.notices;assert.equal(afterClear.length,beforeClear.length);assert.ok(afterClear.filter(n=>cleared.data.ids.includes(n.id)).every(n=>n.status==='Gestionada'));
const all=await call('/api/notifications',{scope:'all'},alice,'DELETE');assert.equal(all.status,200);assert.equal((await call('/api/demo')).data.data.notices.length,0);
console.log('PASS: priority clearing preserves history; individual and all-notice dismissal persist, with tenant isolation');
