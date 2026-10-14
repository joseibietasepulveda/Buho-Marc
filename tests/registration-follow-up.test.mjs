import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,application,act} from './fixtures/inapi-recovery.mjs';
import {normalizeInapi} from '../lib/inapi-provider.ts';
import {registrationFollowUp,manualReviewAvailability,nextManualReviewDay} from '../lib/registration-follow-up.ts';
import {registrationDeadlines} from '../lib/registration-procedure.ts';
import {recoveryNeeds} from '../lib/inapi-recovery.ts';
const today='2026-10-14';

test('a denied application is terminal only when rejection, upheld appeal and same-day finality agree',()=>{
 const events=[act('Resolución de rechazo','1','2026-01-15'),act('Recurso de apelación contra una resolución administrativa','2','2026-02-05'),act('Devolución de TPI con fallo','3','2026-08-24'),act('Resolución de cumplir fallo TPI que convalida resolución administrativa impugnada','4','2026-09-08'),act('Decisión quedó firme','5','2026-09-08')];
 const base=fixture(events),raw={...base.inapi,application_id:999001,name:base.name,registration_number:null,dates:{filed_at:'2026-01-01',published_at:'2026-03-01',registered_at:null,expires_at:null,last_changed_at:null},source:{},status:{description:'Denegada',code:'316'}};
 const record=normalizeInapi(raw);
 assert.equal(record.status,'rejected-final');assert.equal(registrationFollowUp(application(record),today),undefined);
 for(const patch of [ {status:{description:'En Trámite',code:'016'}}, {events:events.filter(e=>e.event_id!=='5')}, {events:events.map(e=>e.event_id==='5'?{...e,event_date:'2026-09-07'}:e)}, {events:events.map(e=>e.event_id==='1'?{...e,status_description:'Resolución de aceptación a registro'}:e)}, {events:events.map(e=>e.event_id==='4'?{...e,status_description:'Devolución de TPI con fallo'}:e)}, {events:events.map(e=>e.event_id==='4'?{...e,status_description:'Solicitud de cumplir fallo TPI que convalida resolución administrativa impugnada'}:e)}, {events:events.map(e=>({...e,event_date:e.event_date.replace('2026','2030')}))} ]) assert.equal(normalizeInapi({...raw,...patch}).status,'decision-review');
});

test('a missing appeal outcome or finality names the specific evidence and never invents a payment date',()=>{
 const unknown=fixture([act('Fallo del Tribunal de Propiedad Industrial')]);
 assert.match(registrationFollowUp(application(unknown),today),/confirmar qué decidió/);
 assert.ok(recoveryNeeds(unknown,today).some(n=>n.endsWith(':outcome')));
 const opposed=fixture([act('Oposición - Presentación de demanda','1','2026-02-01'),act('Resolución de aceptación a registro','2','2026-10-02')]);
 assert.match(registrationFollowUp(application(opposed),today),/ejecutoria/);
 assert.equal(registrationDeadlines(application(opposed),today)[0].dueDate,undefined);
 assert.equal(recoveryNeeds(opposed,today).filter(n=>n.endsWith(':finality')).length,1);
});

test('waits and related proceedings explain their reason while payable or finished registrations need no check',()=>{
 const waiting=application(fixture([act('Examen de fondo')]));
 assert.match(registrationFollowUp(waiting,today),/examen de fondo/);
 const incident=application(fixture([act('Concesión de marca','1','2026-08-01'),act('Resolución de traslado de incidente','2','2026-09-01')]));
 assert.match(registrationFollowUp(incident,today),/destinatario/);
 const administrative=application(fixture([act('Resolución de aceptación a registro','1','2026-10-02')]));
 assert.equal(registrationFollowUp(administrative,today),undefined);
 assert.equal(manualReviewAvailability(waiting,today).canConsult,false);
});

test('the next manual check is the next Santiago calendar day, not a legal deadline or rolling 24 hours',()=>{
 const a={...application(fixture()),officialReview:{enabled:true,day:today,status:'unchanged'}};
 assert.equal(manualReviewAvailability(a,today).canConsult,false);
 assert.equal(manualReviewAvailability(a,today).nextAllowedDay,'2026-10-15');
 assert.equal(manualReviewAvailability(a,'2026-10-15').canConsult,true);
 assert.equal(nextManualReviewDay('2026-12-31'),'2027-01-01');
 assert.equal(manualReviewAvailability({...a,officialReview:{...a.officialReview,status:'failed'}},today).canConsult,false);
});
