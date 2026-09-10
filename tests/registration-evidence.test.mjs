import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRegistrationEvidence, currentActMatches, evidenceDateValid, evidenceKindAllowed } from '../lib/registration-evidence.ts';
import { registrationEvidenceRequest } from '../lib/registration-evidence-validation.ts';
import { VERIFIED_DAILY_NOTICES, verifiedDailyNotice } from '../lib/inapi-daily-evidence.ts';
import { deadlineInfo, registrationDeadlines, registrationProgress, deadlineLabel, addCalendarMonths } from '../lib/registration-procedure.ts';
import { registrationAgenda, urgentAgenda } from '../lib/agenda.ts';

const today = '2026-09-10';
const app = (patch = {}) => ({ id:'TEST', applicationNumber:'123', name:'Prueba', provider:'inapi', filedAt:'2026-04-01', statusId:'substantive-objection', history:[], procedure:{ sourceActId:'event-1', sourceActDate:'2026-09-04', sourceActDescription:'Observación de fondo' }, ...patch });
const evidence = (patch = {}) => ({ id:'10000000-0000-4000-8000-000000009999', kind:'notification', method:'inapi-inbox', date:'2026-09-07', reference:'Constancia de depósito en casilla INAPI', actId:'event-1', actDate:'2026-09-04', actDescription:'Observación de fondo', recordedAt:'2026-09-10T12:00:00Z', recordedBy:'team-user', ...patch });

test('all 19 publicly verified acceptances bind to exact acts and recover dates without changing source status', () => {
  assert.equal(VERIFIED_DAILY_NOTICES.length, 19);
  for (const notice of VERIFIED_DAILY_NOTICES) {
    const input = app({ applicationNumber:notice.applicationNumber, statusId:'accepted-publication', procedure:{ sourceActId:notice.eventId, sourceActDate:notice.actDate, sourceActDescription:notice.description, sourceActCode:notice.statusCode } });
    const before = structuredClone(input);
    const decorated = applyRegistrationEvidence(input, today);
    assert.equal(decorated.procedure.notificationProof.verifiedBy, 'public-document');
    assert.equal(deadlineInfo(decorated, today).dueDate, '2026-10-05');
    assert.deepEqual(input, before);
    for (const changed of [{ sourceActId:'new' }, { sourceActDate:'2026-09-03' }, { sourceActDescription:'Another resolution' }, { sourceActCode:'010' }]) {
      assert.equal(applyRegistrationEvidence({ ...input, procedure:{ ...input.procedure, ...changed } }, today).procedure.notifiedAt, undefined);
    }
  }
  assert.equal(verifiedDailyNotice('not-verified', {}), undefined);
});

test('substance requires notification evidence; a public daily list and an act date do not activate it', () => {
  const input = app();
  assert.equal(deadlineInfo(input, today).attention, 'pending');
  assert.equal(evidenceKindAllowed(input, evidence({ method:'daily-state' })), false);
  assert.equal(applyRegistrationEvidence({ ...input, legalEvidence:[evidence({ method:'daily-state' })] }, today).procedure.notifiedAt, undefined);
  const confirmed = applyRegistrationEvidence({ ...input, legalEvidence:[evidence()] }, today);
  assert.equal(confirmed.procedure.notifiedAt, '2026-09-07');
  assert.equal(confirmed.procedure.notificationProof.verifiedBy, 'team');
  assert.equal(deadlineInfo(confirmed, today).days, 30);
  assert.ok(deadlineInfo(confirmed, today).dueDate);
});

test('a contested final judgment requires Estado Diario while non-contentious resolutions retain their channels', () => {
  for (const statusId of ['rejected-appeal', 'partial-appeal']) {
    const contested = app({ statusId, history: [{ date:'2026-08-03', status:'Presentación de demanda de oposición' }] });
    const before = structuredClone(contested);
    for (const method of ['inapi-inbox', 'personal', 'official-document']) {
      assert.equal(evidenceKindAllowed(contested, evidence({ method })), false, `${statusId}: ${method}`);
      assert.equal(applyRegistrationEvidence({ ...contested, legalEvidence:[evidence({ method })] }, today).procedure.notifiedAt, undefined);
    }
    assert.equal(evidenceKindAllowed(contested, evidence({ method:'daily-state' })), true);
    const confirmed = applyRegistrationEvidence({ ...contested, legalEvidence:[evidence({ method:'daily-state' })] }, today);
    assert.equal(confirmed.procedure.notifiedAt, '2026-09-07');
    assert.equal(deadlineInfo(confirmed, today).days, 15);
    assert.equal(confirmed.statusId, statusId);
    assert.deepEqual(contested, before);
    const nonContentious = { ...contested, history:[{ date:'2026-08-03', status:'Fin de plazo de oposición sin oposiciones presentadas' }] };
    for (const method of ['daily-state', 'inapi-inbox', 'personal']) {
      assert.equal(evidenceKindAllowed(nonContentious, evidence({ method })), true, `${statusId}: ${method}`);
    }
  }
});

test('revoked, stale, impossible, future and pre-act proof cannot activate a deadline', () => {
  for (const patch of [{ revokedAt:today }, { actId:'old' }, { actDate:'2026-09-03' }, { actDescription:'Old observation' }, { date:'2026-02-30' }, { date:'2026-09-11' }, { date:'2026-09-03' }]) {
    assert.equal(applyRegistrationEvidence(app({ legalEvidence:[evidence(patch)] }), today).procedure.notifiedAt, undefined, JSON.stringify(patch));
  }
  assert.equal(currentActMatches(app(), evidence()), true);
  assert.equal(evidenceDateValid(app(), '2026-09-11', today), false);
  const saved = applyRegistrationEvidence(app({ legalEvidence:[evidence()] }), today);
  const revoked = applyRegistrationEvidence({ ...saved, legalEvidence:[evidence({ revokedAt:today })] }, today);
  assert.equal(revoked.procedure.notifiedAt, undefined);
});

test('request validation rejects actor injection, unsafe links and unconfirmed claims', () => {
  const payload = { action:'save', applicationId:'TEST', kind:'notification', method:'inapi-inbox', date:'2026-09-07', reference:'Constancia de notificación', sourceUrl:'https://example.org/document', actId:'event-1', actDate:'2026-09-04', actDescription:'Observación de fondo', confirmed:true };
  assert.equal(registrationEvidenceRequest.safeParse(payload).success, true);
  for (const patch of [{ confirmed:false }, { recordedBy:'another-user' }, { date:'2026-02-30' }, { sourceUrl:'javascript:alert(1)' }, { sourceUrl:'https://user:secret@example.org' }, { reference:'ok' }]) assert.equal(registrationEvidenceRequest.safeParse({ ...payload, ...patch }).success, false);
});

test('verified executoria unlocks final payment without mutating official acceptance or assuming automatic finality', () => {
  const input = app({ statusId:'finality-pending', legalEvidence:[evidence({ kind:'finality', method:'official-document' })] });
  const confirmed = applyRegistrationEvidence(input, today);
  assert.equal(confirmed.statusId, 'finality-pending');
  assert.equal(deadlineInfo(confirmed, today).days, 60);
  assert.equal(deadlineInfo(confirmed, today).sourceDate, '2026-09-07');
  assert.match(registrationProgress(confirmed, today), /Ejecutoria acreditada/);
  assert.equal(deadlineInfo(app({ statusId:'finality-pending' }), today).dueDate, undefined);
  assert.equal(evidenceKindAllowed(app({ statusId:'appeal-pending' }), evidence({ kind:'finality', method:'official-document' })), false);
});

test('opposition closes after 30 business days but does not grant a mark or presume no opposition', () => {
  const input = app({ statusId:'opposition-window', publishedAt:'2026-08-17' });
  const before = structuredClone(input);
  assert.equal(deadlineInfo(input, today).dueDate, '2026-09-29');
  const closed = deadlineInfo(input, '2026-09-30');
  assert.equal(closed.kind, 'milestone');
  assert.equal(closed.attention, 'none');
  assert.match(registrationProgress(input, '2026-09-30'), /Ventana de oposición finalizada/);
  assert.match(closed.explanation, /No implica ausencia de oposición/);
  assert.deepEqual(input, before);
  assert.equal(urgentAgenda(registrationAgenda([input], [], '2026-09-30'), '2026-09-30').length, 0);
});

test('INAPI 20 day control needs requested certification, not publication, and stays out of fatal alerts', () => {
  const input = app({ statusId:'substantive-exam', publishedAt:'2026-05-01' });
  assert.equal(registrationDeadlines(input, today).some(item => item.key === 'inapi-decision-control'), false);
  const checked = applyRegistrationEvidence({ ...input, legalEvidence:[evidence({ kind:'ready-to-resolve', method:'official-document' })] }, today);
  const control = registrationDeadlines(checked, today).find(item => item.key === 'inapi-decision-control');
  assert.equal(control.days, 20);
  assert.equal(control.kind, 'institutional');
  assert.equal(control.fatal, false);
  assert.match(deadlineLabel(control, '2026-12-01'), /administrativa superada/);
  assert.equal(urgentAgenda(registrationAgenda([checked], [], today), '2026-12-01').length, 0);
  assert.equal(evidenceKindAllowed({ ...input, history:[{ date:today, status:'Oposición contenciosa' }] }, evidence({ kind:'ready-to-resolve', method:'official-document' })), false);
});

test('certificate control is distinct from free title and final registration payment', () => {
  const input = app({ statusId:'registered', procedure:{ sourceActId:'grant', sourceActDate:'2026-09-04', sourceActDescription:'Concesión de marca', paymentAccreditedAt:'2026-09-01' } });
  assert.equal(registrationDeadlines(input, today).some(item => item.key === 'certificate-control'), false);
  const withPayment = { ...input, procedure:{ ...input.procedure, certificatePaymentAt:'2026-09-07' } };
  assert.equal(registrationDeadlines(withPayment, today).find(item => item.key === 'certificate-control').days, 10);
  const issued = { ...withPayment, history:[{ date:'2026-09-09', status:'Emisión de certificado de titularidad' }] };
  assert.equal(registrationDeadlines(issued, today).some(item => item.key === 'certificate-control'), false);
  const previousCertificate = { ...withPayment, history:[{ date:'2026-04-01', status:'Emisión de certificado de titularidad' }] };
  assert.equal(registrationDeadlines(previousCertificate, today).some(item => item.key === 'certificate-control'), true);
});

test('calendar month windows do not silently become 180 days', () => {
  assert.equal(addCalendarMonths('2026-08-31', 6), '2027-02-28');
  assert.equal(addCalendarMonths('2026-09-30', -6), '2026-03-30');
});
