import test from 'node:test';
import assert from 'node:assert/strict';
import { inapiProcedure, stageForAct, reprojectInapiRecord } from '../lib/inapi-provider.ts';
import { createSerialRequestGate, fetchOfficialInapi, mergeOfficialEvidence, retainOfficialEvidence, officialDay } from '../lib/inapi-official.ts';
import { recoveryNeeds, recoveryKey } from '../lib/inapi-recovery.ts';
import { compareRecords } from '../lib/source-contract.ts';
import { registrationDeadlines } from '../lib/registration-procedure.ts';
import { applyRegistrationEvidence } from '../lib/registration-evidence.ts';

import { act, fixture, application, officialFetcher } from './fixtures/inapi-recovery.mjs';

test('audit families distinguish petition, operative decision, written response and procedural object', () => {
  const examples = [
    ['Oposición - Contestación del traslado de demanda', 'opposition-answered'],
    ['Oposición - Solicita se abra término probatorio', undefined],
    ['Resolución de apertura a prueba de oposiciones de marca', 'evidence-period'],
    ['Resolución de por no contestado el traslado de oposiciones con recepción de causa a prueba', 'evidence-period'],
    ['Resolución de por contestado el traslado de oposiciones con recepción de causa a prueba', 'evidence-period'],
    ['Solicitud de desistimiento de solicitud', undefined], ['Resolución de desistimiento de solicitud', 'withdrawn'],
    ['Resolución de desistimiento parcial de solicitud', undefined], ['Resolución de desistimiento de oposición', undefined],
    ['Oposición - Alega abandono', undefined], ['Devolución a examen de fondo por abandono contencioso', 'substantive-exam'],
    ['Traslado incidente contencioso oposición', undefined], ['Resolución de rechazo de pago marca nueva', undefined],
    ['Carta exigiendo acreditación de pago', undefined], ['Resolución que tiene por no presentado escrito', undefined],
    ['Anotación - Resolución de rechazo', undefined], ['Pago - Pago final', 'payment-verification'],
    ['Constatación de pago completo', 'payment-verification'], ['Presentación de demanda de nulidad', undefined],
    ['Nulidad - Solicita declaración de nulidad acogida', undefined], ['Observación de forma de incidente', undefined],
    ['Acéptase a tramitación', 'accepted-publication'], ['Oposición - Presentación de demanda', 'opposition-filed'],
    ['Fin de plazo', undefined], ['Fin de plazo contestación de oposición', undefined],
  ];
  for (const [description, expected] of examples) assert.equal(stageForAct(description), expected, description);
});

test('mixed opposition/fondo remains concurrent after either response; incident/nullity cannot create an opposition deadline', () => {
  const events = [act('Traslado de oposición y observaciones de fondo')];
  assert.equal(inapiProcedure(events).procedure.concurrent[0].statusId, 'opposition-answer');
  events.push(act('Cumplimiento de observaciones de fondo', '2', '2026-07-02'));
  assert.equal(inapiProcedure(events).procedure.concurrent[0].statusId, 'opposition-answer');
  events.push(act('Traslado de incidente', '3', '2026-07-03'), act('Presentación de demanda de nulidad', '4', '2026-07-04'));
  const deadlines = registrationDeadlines(application(fixture(events)), '2026-10-07');
  assert.equal(deadlines.find(item => item.key === 'nullity-review').days, undefined);
  assert.equal(deadlines.find(item => item.key === 'incident-review').fatal, false);
});

test('global serial gate spaces concurrent attempts from completion, even after a failure', async () => {
  let time = 0; const starts = [];
  const gate = createSerialRequestGate(() => time, async delay => { time += delay; });
  const results = await Promise.allSettled([gate(async () => { starts.push(time); time += 100; throw new Error('outage'); }), gate(async () => { starts.push(time); time += 50; return 1; }), gate(async () => starts.push(time))]);
  assert.equal(results[0].status, 'rejected'); assert.deepEqual(starts, [0, 3100, 6150]);
});

test('official adapter carries its own context, validates identifiers and never invents notification dates', async () => {
  const mock = officialFetcher(); const base = fixture(); let time = 0;
  const official = await fetchOfficialInapi(base, createSerialRequestGate(() => time, async delay => { time += delay; }), mock.fetcher);
  assert.equal(mock.calls(), 3); assert.equal(official.retrieval.origin, 'official-inapi');
  assert.equal(official.retrieval.historyComplete, undefined);
  const merged = mergeOfficialEvidence(base, official, official.retrieval.officialCheckedAt);
  assert.equal(application(merged).procedure.notifiedAt, undefined);
  assert.equal(recoveryNeeds(merged, '2026-10-07').length, 1);
  assert.equal(base.officialEvidence, undefined);
  assert.deepEqual(merged.officialEvidence.providerRecord, JSON.parse(JSON.stringify(base)));
  const transportOnly = { ...merged, retrieval: { ...merged.retrieval, lastSuccessfulQueryAt: '2026-10-07T23:00:00Z' }, officialEvidence: { ...merged.officialEvidence, checkedAt: '2026-10-07T23:00:00Z' } };
  assert.deepEqual(compareRecords(merged, transportOnly), []);
  assert.deepEqual(compareRecords(merged, retainOfficialEvidence(fixture(), merged)), []);
});

test('official outages and mismatched dossiers stop without retry or modifying saved data', async () => {
  for (const options of [{ failAt: 2 }, { wrongId: true }]) {
    const mock = officialFetcher(options); const base = fixture(); const before = JSON.stringify(base);
    await assert.rejects(fetchOfficialInapi(base, request => request(), mock.fetcher));
    assert.equal(mock.calls(), options.failAt ?? 3); assert.equal(JSON.stringify(base), before);
  }
  assert.equal(officialDay('29/02/2024'), '2024-02-29');
  assert.throws(() => officialDay('29/02/2025'));
});

test('missing need identity survives transport metadata and old history reorder; a new act has a new key', () => {
  const base = fixture(); const original = recoveryNeeds(base, '2026-10-07');
  assert.equal(recoveryKey(original), recoveryKey(recoveryNeeds({ ...base, retrieval: { lastSuccessfulQueryAt: '2026-10-07T12:00:00Z' } }, '2026-10-07')));
  assert.notEqual(recoveryKey(original), recoveryKey(recoveryNeeds(fixture([act('Resolución de observaciones de fondo', '2', '2026-08-01')]), '2026-10-07')));
  assert.deepEqual(recoveryNeeds(fixture([act('Oposición - Solicita se abra término probatorio')]), '2026-10-07'), []);
});

test('missing publication after a recognized published stage is recovered once per dossier, not before publication', () => {
  const published = { ...fixture([act('Oposición - Presentación de demanda')]), publicationDate: null };
  assert.deepEqual(recoveryNeeds(published, '2026-10-07'), ['publication:999001']);
  const later = { ...fixture([act('Resolución de observaciones de fondo', 'later')]), publicationDate: null };
  assert.ok(recoveryNeeds(later, '2026-10-07').includes('publication:999001'));
  const initial = { ...fixture([act('Solicitud presentada')]), status: 'inapi-waiting', publicationDate: null };
  assert.deepEqual(recoveryNeeds(initial, '2026-10-07'), []);
});

test('future provider contract requires the right act, object, recipient, method, date and evidence', () => {
  const fact = { version: 1, act_id: '1', kind: 'notification', date: '2026-07-03', object: 'substantive-examination', recipient_role: 'applicant', method: 'inapi-inbox', reference: 'Constancia ficticia', document_url: 'https://example.org/proof' };
  const base = fixture([act('Resolución de observaciones de fondo', '1', '2026-07-01', { legal_facts: [fact] })]);
  assert.equal(application(base).procedure.notifiedAt, fact.date);
  assert.equal(application(base).procedure.notificationProof.verifiedBy, 'source');
  assert.deepEqual(recoveryNeeds(base, '2026-10-07'), []);
  for (const patch of [{ act_id: '2' }, { object: 'opposition' }, { recipient_role: 'opponent' }, { date: '2026-06-01' }, { date: '2030-01-01' }, { document_url: '' }, { method: 'daily-state' }]) {
    const bad = fixture([act('Resolución de observaciones de fondo', '1', '2026-07-01', { legal_facts: [{ ...fact, ...patch }] })]);
    assert.equal(application(bad).procedure.notifiedAt, undefined, JSON.stringify(patch));
  }
  const typedPetition = fixture([act('Resolución de apertura a prueba', '1', '2026-07-01', { classification: { version: 1, type: 'petition', object: 'opposition', outcome: 'opens-evidence' } })]);
  assert.notEqual(typedPetition.status, 'evidence-period');
});

test('provider-supplied finality and concurrent notification retain their individual target acts', () => {
  const fact = { version: 1, act_id: '1', kind: 'finality', date: '2026-07-25', object: 'application', recipient_role: 'applicant', method: 'official-document', reference: 'Ejecutoria ficticia', document_url: 'https://example.org/proof' };
  const base = fixture([act('Resolución de aceptación a registro', '1', '2026-07-01', { legal_facts: [fact] })]);
  const deadline = registrationDeadlines(application(base), '2026-10-07')[0];
  assert.equal(deadline.key, 'accepted-payment'); assert.equal(deadline.sourceDate, '2026-07-25');
  assert.deepEqual(recoveryNeeds(base, '2026-10-07'), []);
  const parallelFact = { ...fact, kind: 'notification', object: 'opposition', method: 'inapi-inbox' };
  const parallel = application(fixture([act('Traslado de oposición', '1', '2026-07-01', { legal_facts: [parallelFact] }), act('Observaciones de fondo', '2', '2026-07-02')]));
  assert.equal(parallel.procedure.concurrent[0].notifiedAt, '2026-07-25');
});

test('team evidence remains bound to its act when an independent obligation becomes primary', () => {
  const source = fixture([act('Observaciones de fondo', 'fondo', '2026-07-01'), act('Traslado de oposición', 'opposition', '2026-07-02')]);
  const evidence = { id: 'proof', kind: 'notification', method: 'inapi-inbox', date: '2026-07-03', actId: 'fondo', actDate: '2026-07-01', actDescription: 'Observaciones de fondo', reference: 'Constancia ficticia', recordedAt: '2026-07-04T12:00:00Z', recordedBy: 'fixture' };
  const app = { ...application(source), legalEvidence: [evidence] };
  const decorated = applyRegistrationEvidence(app, '2026-10-07');
  assert.equal(decorated.procedure.notifiedAt, undefined);
  assert.equal(decorated.procedure.concurrent[0].notifiedAt, evidence.date);
  assert.equal(decorated.procedure.concurrent[0].notificationProof.verifiedBy, 'team');
  assert.equal(app.procedure.concurrent[0].notifiedAt, undefined);
  const mismatched = applyRegistrationEvidence({ ...app, legalEvidence: [{ ...evidence, actId: 'old-act' }] }, '2026-10-07');
  assert.equal(mismatched.procedure.concurrent[0].notifiedAt, undefined);
});

test('cached official findings preserve later provider acts and yield to an acknowledged complete new extraction', () => {
  const base = fixture(); const direct = fixture([act('Resolución de observaciones de fondo'), act('Concesión de marca', '2', '2026-08-01')]);
  direct.registrationNumber = '99999'; direct.registrationDate = '2026-08-01'; direct.inapi.status = { description: 'Caducado', code: '110' };
  const merged = mergeOfficialEvidence(base, direct, '2026-10-07T12:00:00Z');
  assert.equal(merged.status, 'expired');
  const latest = fixture([act('Observaciones de fondo', '3', '2026-10-08')]);
  assert.equal(retainOfficialEvidence(latest, merged).status, 'substantive-objection');
  const complete = { ...fixture(), retrieval: { historyComplete: true, sourceReadAt: '2026-10-08T12:00:00Z' } };
  assert.equal(retainOfficialEvidence(complete, merged).officialEvidence, undefined);
  const newerRead = { ...base, retrieval: { origin: 'dequienes', sourceReadAt: '2026-10-08T12:00:00Z', historyCheckedAt: '2026-10-08T12:00:00Z', historyComplete: false } };
  const retained = retainOfficialEvidence(newerRead, merged);
  assert.equal(retained.retrieval.sourceReadAt, newerRead.retrieval.sourceReadAt);
  assert.equal(retained.retrieval.historyCheckedAt, newerRead.retrieval.historyCheckedAt);
  assert.equal(retained.retrieval.officialCheckedAt, merged.retrieval.officialCheckedAt);
  assert.deepEqual(reprojectInapiRecord(merged).retrieval, merged.retrieval);
});
