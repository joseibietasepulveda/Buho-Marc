import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationDeadlines,deadlineInfo} from '../lib/registration-procedure.ts';
import {inapiProcedure} from '../lib/inapi-provider.ts';

const application=(overrides={})=>({id:'TEST-ASSUMPTION',applicationNumber:'9000001',name:'Marca ficticia',type:'Denominativa',provider:'inapi',filedAt:'2026-01-05',statusId:'substantive-objection',history:[],recentEvent:'Resolución ficticia',niceClasses:'35',holder:'Titular ficticio',holderRut:'',client:'',procedure:{sourceActId:'ACT-1',sourceActDate:'2026-10-05',sourceActDescription:'Resolución de observaciones de fondo'},...overrides});
const today='2026-10-12';

test('recognized notification deadlines use the act date with explicit assumption provenance',()=>{
 for(const [statusId,expected] of [['form-observation','2026-11-17'],['substantive-objection','2026-11-17'],['opposition-answer','2026-11-17'],['evidence-period','2026-11-17'],['accepted-publication','2026-11-03'],['rejected-appeal','2026-10-27'],['partial-appeal','2026-10-27']]){
  const a=application({statusId});const original=structuredClone(a);const d=deadlineInfo(a,today);
  assert.equal(d.sourceDate,'2026-10-05',statusId);assert.equal(d.dueDate,expected,statusId);assert.equal(d.notificationDateAssumed,true);assert.equal(d.origin,'calculated');assert.match(d.explanation,/Notificación asumida/);assert.deepEqual(a,original);assert.equal(a.procedure.notifiedAt,undefined);
 }
});

test('an explicit notification and an explicit valid source deadline keep priority',()=>{
 const confirmed=deadlineInfo(application({procedure:{sourceActDate:'2026-10-05',notifiedAt:'2026-10-06'}}),today);
 assert.equal(confirmed.sourceDate,'2026-10-06');assert.equal(confirmed.dueDate,'2026-11-18');assert.equal(confirmed.notificationDateAssumed,undefined);
 const official=deadlineInfo(application({officialDeadline:'2026-11-09'}),today);
 assert.equal(official.dueDate,'2026-11-09');assert.equal(official.origin,'source');
 const invalidExplicit=deadlineInfo(application({procedure:{sourceActDate:'2026-10-05',notifiedAt:'2026-02-30'}}),today);
 assert.equal(invalidExplicit.attention,'pending');assert.equal(invalidExplicit.notificationDateAssumed,undefined);
});

test('each concurrent obligation uses its own act and confirmed dates remain independent',()=>{
 const a=application({procedure:{sourceActId:'FONDO',sourceActDate:'2026-10-05',concurrent:[{statusId:'opposition-answer',sourceActId:'OPOSICION',sourceActDate:'2026-09-24'},{statusId:'evidence-period',sourceActId:'PRUEBA',sourceActDate:'2026-10-01',notifiedAt:'2026-10-02'}]}});
 const d=registrationDeadlines(a,today).filter(x=>x.kind==='legal');
 assert.deepEqual(d.map(x=>x.sourceDate),['2026-10-05','2026-09-24','2026-10-02']);assert.deepEqual(d.map(x=>x.notificationDateAssumed),[true,true,undefined]);assert.deepEqual(d.map(x=>x.dueDate),['2026-11-17','2026-11-06','2026-11-16']);
});

test('publication, finality, unknown incidents and generic status timestamps do not acquire the assumption',()=>{
 for(const statusId of ['accepted-payment','partial-payment','opposition-window']){
  const d=deadlineInfo(application({statusId}),today);assert.equal(d.attention,'pending');assert.equal(d.dueDate,undefined);assert.equal(d.notificationDateAssumed,undefined);
 }
 const a=application({procedure:undefined,deadlineSource:'2026-10-05'});assert.equal(deadlineInfo(a,today).attention,'pending');
 const projection=inapiProcedure([{event_id:'PETITION',event_date:'2026-10-05',status_description:'Oposición - Solicita se abra término probatorio'}]);assert.equal(projection.status,'inapi-waiting');
 const incident=registrationDeadlines(application({procedure:{relatedProceedings:[{object:'incident',description:'Incidente ficticio',actDate:'2026-10-05'}]}}),today).find(x=>x.key==='incident-review');assert.equal(incident.dueDate,undefined);
});

test('invalid, future, pre-filing and uncovered act dates cannot generate a countdown',()=>{
 for(const sourceActDate of ['2026-02-30','2026-10-13','2025-12-31','2022-01-10',undefined]){
  const d=deadlineInfo(application({procedure:{sourceActDate}}),today);assert.equal(d.attention,'pending',String(sourceActDate));assert.equal(d.dueDate,undefined);
 }
});

test('completion closes only the current obligation and preserves elapsed deadlines for review',()=>{
 const oldResponse=deadlineInfo(application({procedure:{sourceActDate:'2026-10-05',responseFiledAt:'2026-10-01'}}),today);assert.equal(oldResponse.dueDate,'2026-11-17');
 const completed=deadlineInfo(application({procedure:{sourceActDate:'2026-10-05',responseFiledAt:'2026-10-07'}}),today);assert.equal(completed.attention,'none');assert.equal(completed.dueDate,undefined);
 const a=application({procedure:{sourceActDate:'2026-08-07'}});const d=deadlineInfo(a,today);assert.equal(d.dueDate,'2026-09-21');assert.equal(d.attention,'overdue');assert.equal(a.statusId,'substantive-objection');
});
