import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationEvidenceFields } from '../lib/notification-evidence.ts';
import { notificationSourceHistory, buildNotificationTimeline } from '../lib/notification-timeline.ts';

test('title/date only produces no additional panel and does not alter saved evidence', () => {
  const raw = {date:'2023-09-05', title:'Modificación solicitud - Rectificación representante'};
  const before = JSON.stringify(raw);
  assert.deepEqual(notificationEvidenceFields([raw], raw), []);
  assert.equal(JSON.stringify(raw), before);
});
test('aliases deduplicate while distinct observations, IDs and due dates remain', () => {
  const shown = {title:'Resolución de concesión', date:'2026-10-02'};
  const fields = notificationEvidenceFields([
    {event_date:'2026-10-02',status_description:shown.title,observation:'Se cumple lo observado.',event_id:'A-12',due_date:'2026-11-16'},
    {date:'2 oct 2026',title:shown.title,detail:'Se cumple lo observado.',eventId:'A-12',status_code:'REG'}
  ], shown);
  assert.deepEqual(fields.map(f=>f.label), ['Observaciones','ID de la actuación','Vencimiento informado por la fuente','Código INAPI']);
  assert.equal(fields.filter(f=>f.value==='A-12').length,1);
});
test('original description retains resolution reference or text truncated in the heading', () => {
  const fields=notificationEvidenceFields([{status_description:'Resolución de concesión 2026/123456'}],{title:'Resolución de concesión',date:'2026-10-02'});
  assert.deepEqual(fields,[{label:'Descripción de la fuente',value:'Resolución de concesión 2026/123456'}]);
});
test('corrections retain previous titles/dates and their provenance', () => {
  const fields=notificationEvidenceFields([{date:'2026-09-30',title:'Actuación anterior','Versión del antecedente':'Anterior al cambio detectado'}],{date:'2026-10-02',title:'Actuación corregida'});
  assert.deepEqual(fields.map(f=>f.value),['2026-09-30','Actuación anterior','Anterior al cambio detectado']);
});
test('empty fields are omitted without losing valid zero, false or nested evidence', () => {
  const fields=notificationEvidenceFields([{a:null,b:' ',c:'null',d:[],e:{},'Conteo':0,'Acreditado':false,'Documento':{referencia:'R-1'}}]);
  assert.deepEqual(fields.map(f=>f.label),['Conteo','Acreditado','Documento']);
  assert.deepEqual(fields.slice(0,2).map(f=>f.value),['0','false']);
});
test('saved own-brand evidence keeps observations/references and unions raw notices by ID', () => {
  const raw={event_id:'SOURCE-ACT',event_date:'2026-10-02',status_description:'Resolución',observation:'Observación conservada',due_date:'2026-11-16',status_code:'C-1'};
  const record={inapi:{events:[raw,{event_date:'invalid',status_description:'Ignorar fecha inválida'}]}};
  const history=notificationSourceHistory(record);
  assert.equal(history.length,1);
  assert.equal(history[0].observation,raw.observation);
  const notice={id:'N1',title:'Resolución',brand:'Prueba',date:'2026-10-02',body:'',changeDetail:{source:'inapi',applicationNumber:'123',summary:'',changes:[{field:'inapi.events',before:[],after:[raw]}]}};
  const timeline=buildNotificationTimeline(notice,[notice],[],[{name:'Prueba',applicationNumber:'123',provider:'inapi',sourceHistory:history}]);
  assert.equal(timeline.entries.length,1);
  const fields=notificationEvidenceFields(timeline.entries[0].details,timeline.entries[0]);
  assert.equal(fields.filter(f=>f.label==='Observaciones').length,1);
  assert.ok(fields.some(f=>f.value==='2026-11-16'));
});
