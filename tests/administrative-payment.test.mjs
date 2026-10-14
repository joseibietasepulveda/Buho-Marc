import test from 'node:test';
import assert from 'node:assert/strict';
import { administrativeAcceptanceDate, hasContestedProceeding } from '../lib/registration-proceedings.ts';
import { registrationDeadlines, registrationProgress, addProcedureDays } from '../lib/registration-procedure.ts';
import { registrationAgenda } from '../lib/agenda.ts';
import { recoveryNeeds } from '../lib/inapi-recovery.ts';
import { act, fixture, application as projectedApplication } from './fixtures/inapi-recovery.mjs';

const today = '2026-10-14';
const application = (patch = {}) => ({
  id: 'TEST-PAYMENT', applicationNumber: '9000001', name: 'Marca ficticia',
  type: 'Denominativa', provider: 'inapi', filedAt: '2026-01-05',
  statusId: 'finality-pending', history: [], recentEvent: '', niceClasses: '35',
  holder: 'Titular ficticio', holderRut: '', client: '',
  procedure: { sourceActId: 'ACCEPTANCE', sourceActCode: '029', sourceActDate: '2026-10-02', sourceActDescription: 'Resolución de aceptación a registro ficticia' },
  ...patch,
});

test('administrative acceptance activates 60 business days and agenda without fabricating source facts', () => {
  const a = application();
  const before = structuredClone(a);
  const [deadline] = registrationDeadlines(a, today);
  assert.equal(deadline.key, 'accepted-payment');
  assert.equal(deadline.sourceDate, '2026-10-02');
  assert.equal(deadline.dueDate, '2026-12-30');
  assert.equal(deadline.days, 60);
  assert.equal(deadline.paymentBasis, 'administrative-acceptance');
  assert.equal(deadline.notificationDateAssumed, true);
  assert.equal(deadline.origin, 'calculated');
  assert.match(deadline.explanation, /aceptación administrativa/);
  assert.match(registrationProgress(a, today), /pagar derechos finales/);
  const agenda = registrationAgenda([a], [], today);
  assert.equal(agenda[0].date, '2026-12-30');
  assert.equal(agenda[0].category, 'inapi');
  assert.deepEqual(a, before);
  assert.equal(a.procedure.finalAt, undefined);
  assert.equal(a.procedure.notifiedAt, undefined);
  assert.equal(a.procedure.notificationProof, undefined);
});

test('the seven observed acceptance dates cross holidays and year-end using the reviewed calendar', () => {
  for (const [sourceActDate, expected] of [['2026-10-02', '2026-12-30'], ['2026-10-08', '2027-01-06'], ['2026-09-23', '2026-12-18'], ['2026-10-06', '2027-01-04']]) {
    const a = application(); a.procedure.sourceActDate = sourceActDate;
    assert.equal(registrationDeadlines(a, today)[0].dueDate, expected);
  }
});

test('known opposition keeps finality counting and missing finality cannot acquire an acceptance assumption', () => {
  const a = application({ history: [{ date: '2026-06-01', status: 'Oposición - Presentación de demanda' }] });
  assert.equal(administrativeAcceptanceDate(a), undefined);
  assert.equal(registrationDeadlines(a, today)[0].dueDate, undefined);
  a.procedure.finalAt = '2026-10-08';
  const [deadline] = registrationDeadlines(a, today);
  assert.equal(deadline.paymentBasis, 'executoria');
  assert.equal(deadline.sourceDate, '2026-10-08');
  assert.equal(deadline.dueDate, '2027-01-06');
  assert.equal(deadline.notificationDateAssumed, undefined);
  // A bare contested judgment cannot be classified administrative merely
  // because earlier opposition filings are absent from a partial history.
  const judgment = application({ procedure: { sourceActCode: '484', sourceActDate: '2026-10-02', sourceActDescription: 'Fallo de aceptación a registro' } });
  assert.equal(administrativeAcceptanceDate(judgment), undefined);
  assert.equal(registrationDeadlines(judgment, today)[0].dueDate, undefined);
});

test('substantive boilerplate about an expired opposition window does not create a filed opposition', () => {
  const a = application({ history: [{ date: '2026-09-01', code: '136', status: 'Resolución de observaciones de fondo', detail: 'Encontrándose vencido el plazo para deducir oposiciones, se procede a realizar el examen de fondo. ' + 'Se analizan las prohibiciones de registro. '.repeat(5) + 'La solicitud presentada incluye un nombre personal que requiere autorización.' }] });
  assert.equal(hasContestedProceeding(a), false);
  assert.equal(registrationDeadlines(a, today)[0].dueDate, '2026-12-30');
  const opposed = application({ history: [{ date: '2026-09-01', status: 'Resolución', detail: 'Se acoge la demanda de oposición presentada por el oponente.' }] });
  assert.equal(hasContestedProceeding(opposed), true);
  assert.equal(registrationDeadlines(opposed, today)[0].dueDate, undefined);
});

test('administrative counting keeps the acceptance even if a later certificate or notifiedAt is present', () => {
  const a = application();
  a.procedure.finalAt = '2026-10-08';
  a.procedure.notifiedAt = '2026-10-05';
  assert.equal(registrationDeadlines(a, today)[0].sourceDate, '2026-10-02');
  const certificate = application({ statusId: 'accepted-payment', history: [
    { date: '2026-10-02', code: '029', status: 'Resolución de aceptación a registro' },
    { date: '2026-10-08', status: 'Decisión quedó firme' },
  ], procedure: { sourceActDate: '2026-10-08', sourceActDescription: 'Decisión quedó firme', finalAt: '2026-10-08' } });
  assert.equal(registrationDeadlines(certificate, today)[0].sourceDate, '2026-10-02');
});

test('partial administrative acceptance retains its appeal and adds a distinct payment countdown', () => {
  const a = application({ statusId: 'partial-appeal', officialDeadline: '2026-10-23', procedure: {
    sourceActId: 'PARTIAL', sourceActDate: '2026-10-02', sourceActDescription: 'Resolución de aceptación parcial a registro',
  } });
  const deadlines = registrationDeadlines(a, today);
  assert.deepEqual(deadlines.map(d => d.key), ['partial-appeal', 'partial-payment']);
  assert.equal(deadlines[0].dueDate, '2026-10-23');
  assert.equal(deadlines[1].dueDate, '2026-12-30');
  assert.equal(deadlines[1].origin, 'calculated');
});

test('valid explicit payment deadlines retain priority and invalid activation dates cannot be estimated', () => {
  assert.equal(registrationDeadlines(application({ officialDeadline: '2026-12-28' }), today)[0].dueDate, '2026-12-28');
  for (const date of [undefined, '', '2026-02-30', '2026-10-15', '2025-12-31', '2022-01-01']) {
    const a = application(); a.procedure.sourceActDate = date;
    const [deadline] = registrationDeadlines(a, today);
    assert.equal(deadline.attention, 'pending', String(date));
    assert.equal(deadline.dueDate, undefined, String(date));
  }
  const futureCalendar = application(); futureCalendar.procedure.sourceActDate = '2027-12-01';
  assert.equal(registrationDeadlines(futureCalendar, '2027-12-02')[0].dueDate, undefined);
});

test('payment completion and subsequent registered or appeal states do not reopen a payment deadline', () => {
  const paid = application(); paid.procedure.paymentAccreditedAt = '2026-10-05';
  assert.equal(registrationDeadlines(paid, today)[0].attention, 'none');
  assert.equal(registrationDeadlines(paid, today)[0].dueDate, undefined);
  assert.match(registrationProgress(paid, today), /Pago acreditado/);
  const invalidCompletion = application(); invalidCompletion.procedure.paymentAccreditedAt = '2026-10-01';
  assert.equal(registrationDeadlines(invalidCompletion, today)[0].dueDate, '2026-12-30');
  for (const statusId of ['registered', 'payment-verification', 'appeal-pending', 'rejected-final', 'abandoned-payment']) {
    const a = application({ statusId });
    assert.equal(administrativeAcceptanceDate(a), undefined);
    assert.ok(!registrationDeadlines(a, today).some(d => d.key === 'accepted-payment'));
  }
  const old = application(); old.procedure.sourceActDate = '2026-01-06';
  assert.equal(registrationDeadlines(old, today)[0].attention, 'overdue');
  assert.equal(old.statusId, 'finality-pending');
});

test('shared source projection and recovery use the convention without a new external request', () => {
  const base = fixture([act('Resolución de aceptación a registro', 'ACCEPT', '2026-10-02')]);
  const a = projectedApplication(base);
  assert.equal(a.statusId, 'finality-pending');
  assert.equal(registrationDeadlines(a, today)[0].dueDate, addProcedureDays('2026-10-02', 60));
  assert.deepEqual(recoveryNeeds(base, today), []);
  const contested = fixture([act('Oposición - Presentación de demanda', 'OPPOSITION', '2026-06-01'), act('Fallo de aceptación a registro', 'JUDGMENT', '2026-10-02')]);
  assert.ok(recoveryNeeds(contested, today).some(need => need.endsWith(':finality')));
  const opposedAdministrativeTitle = fixture([act('Oposición - Presentación de demanda', 'OPPOSITION', '2026-06-01'), act('Resolución de aceptación a registro', 'ACCEPT', '2026-10-02')]);
  assert.ok(recoveryNeeds(opposedAdministrativeTitle, today).some(need => need.endsWith(':finality')), 'source-only recovery must retain earlier opposition history');
  const missing = fixture([act('Resolución de aceptación a registro', 'MISSING', null)]);
  const needs = recoveryNeeds(missing, today);
  assert.ok(needs.some(need => need.startsWith('accepted-payment:MISSING:')));
  assert.ok(!needs.some(need => need.endsWith(':finality')));
});
