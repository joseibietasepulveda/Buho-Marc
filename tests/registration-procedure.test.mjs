import test from 'node:test';
import assert from 'node:assert/strict';
import { addProcedureDays, deadlineInfo, deadlineLabel, registrationDeadlines } from '../lib/registration-procedure.ts';
import { PROCESS_DEMO_DATE, PROCESS_SCENARIOS } from '../lib/registration-scenarios.ts';

const today = '2026-09-07';
const application = (overrides = {}) => ({
  id: 'TEST-PROCEDURE', name: 'EJEMPLO DE PRUEBA', applicationNumber: 'DEMO-TEST',
  type: 'Denominativa', filedAt: '2026-01-05', statusId: 'accepted-publication',
  recentEvent: 'Actuación de prueba', niceClasses: '35', holderRut: 'No aplica',
  holder: 'Titular ficticio', client: 'Ejemplo', history: [], provider: 'inapi',
  ...overrides,
});

test('opposition requires effective publication even if other dates and a due date are present', () => {
  for (const publishedAt of [undefined, '', '2026-02-30']) {
    const result = deadlineInfo(application({
      statusId: 'opposition-window', publishedAt, deadlineSource: '2026-08-20',
      officialDeadline: '2026-10-01', procedure: { publicationRequestedAt: '2026-08-20', notifiedAt: '2026-08-17' },
    }), today);
    assert.equal(result.attention, 'pending');
    assert.equal(result.dueDate, undefined);
  }
  const published = deadlineInfo(application({
    statusId: 'opposition-window', publishedAt: '2026-08-17',
    procedure: { publicationRequestedAt: '2026-08-10', notifiedAt: '2026-08-03' },
  }), today);
  assert.equal(published.sourceDate, '2026-08-17');
  assert.equal(published.dueDate, '2026-09-29');
  assert.equal(published.days, 30);
});

test('the pre-publication deadline is for requesting publication and ends when that action is recorded', () => {
  const pending = application({ procedure: { notifiedAt: '2026-09-01' } });
  const deadline = deadlineInfo(pending, today);
  assert.equal(deadline.days, 20);
  assert.equal(deadline.dueDate, '2026-09-30');
  assert.match(deadline.label, /Requerir.*publicación/);
  for (const statusId of ['accepted-publication', 'publication-pending']) {
    const requested = deadlineInfo(application({ statusId, officialDeadline: '2026-09-30', procedure: {
      notifiedAt: '2026-09-01', publicationRequestedAt: '2026-09-03',
    } }), today);
    assert.equal(requested.attention, 'none');
    assert.equal(requested.dueDate, undefined);
  }
});

test('final payment is calculated only from executoria, not acceptance or generic activity dates', () => {
  for (const statusId of ['accepted-payment', 'partial-payment']) {
    for (const provider of [undefined, 'inapi']) {
      const unconfirmed = deadlineInfo(application({
        statusId, provider, deadlineSource: '2026-08-03',
        procedure: { notifiedAt: '2026-08-03', sourceActDate: '2026-07-31' },
      }), today);
      assert.equal(unconfirmed.attention, 'pending');
      assert.equal(unconfirmed.dueDate, undefined);
      const confirmed = deadlineInfo(application({ statusId, provider, procedure: {
        notifiedAt: '2026-08-03', sourceActDate: '2026-07-31', finalAt: '2026-08-24',
      } }), today);
      assert.equal(confirmed.sourceDate, '2026-08-24');
      assert.equal(confirmed.days, 60);
      assert.equal(confirmed.dueDate, '2026-11-18');
    }
  }
  for (const statusId of ['finality-pending', 'payment-verification', 'appeal-pending']) {
    const result = deadlineInfo(application({ statusId, procedure: { notifiedAt: '2026-08-03' } }), today);
    assert.equal(result.attention, 'none');
    assert.equal(result.dueDate, undefined);
  }
});

test('a filed response ends that response countdown while retaining the unresolved procedural status', () => {
  for (const statusId of ['form-observation', 'substantive-objection', 'opposition-answer']) {
    const source = application({ statusId, procedure: { notifiedAt: '2026-06-01', responseFiledAt: '2026-06-15' } });
    const before = structuredClone(source);
    const result = deadlineInfo(source, today);
    assert.equal(result.attention, 'none');
    assert.equal(result.dueDate, undefined);
    assert.match(result.label, /Respuesta presentada/);
    assert.deepEqual(source, before, 'classification must not turn a filing into a substantive resolution');
  }
  const payment = deadlineInfo(application({
    statusId: 'accepted-payment', procedure: { finalAt: '2026-04-06', paymentAccreditedAt: '2026-05-04' },
  }), today);
  assert.equal(payment.attention, 'none');
  assert.equal(payment.dueDate, undefined);
});

test('a passed response deadline requires review and does not assign rejection or abandonment', () => {
  const source = application({ statusId: 'substantive-objection', procedure: { notifiedAt: '2026-06-15' } });
  const before = structuredClone(source);
  const result = deadlineInfo(source, today);
  assert.equal(result.attention, 'overdue');
  assert.equal(deadlineLabel(result, today), 'Plazo vencido · revisar actuación');
  assert.deepEqual(source, before);
});

test('evidence extensions use only the explicitly recorded allowance, bounded to 30 additional days', () => {
  const original = application({ statusId: 'evidence-period', procedure: { notifiedAt: '2026-07-06' } });
  assert.equal(deadlineInfo(original, today).days, 30);
  const extended = deadlineInfo(application({ statusId: 'evidence-period', procedure: {
    notifiedAt: '2026-07-06', evidenceExtensionDays: 20,
  } }), today);
  assert.equal(extended.days, 50);
  assert.equal(extended.dueDate, '2026-09-15');
  assert.equal(deadlineInfo(application({ statusId: 'evidence-period', procedure: {
    notifiedAt: '2026-07-06', evidenceExtensionDays: 30,
  } }), today).days, 60);
  for (const evidenceExtensionDays of [-1, 31, 15.5, Number.NaN]) {
    const invalid = deadlineInfo(application({ statusId: 'evidence-period', procedure: { notifiedAt: '2026-07-06', evidenceExtensionDays } }), today);
    assert.equal(invalid.attention, 'pending');
    assert.equal(invalid.dueDate, undefined);
  }
});

test('the covered LPI calendar excludes weekends and Chilean holidays and refuses unsupported-year estimates', () => {
  assert.equal(addProcedureDays('2026-09-17', 1), '2026-09-21');
  assert.equal(addProcedureDays('2026-10-09', 1), '2026-10-13');
  assert.equal(addProcedureDays('2026-12-24', 1), '2026-12-28');
  assert.equal(addProcedureDays('2026-12-31', 1), '2027-01-04');
  for (const [date, days] of [['2025-12-30', 1], ['2027-12-31', 1], ['2028-01-04', 20], ['2026-02-30', 1], ['2026-09-01', -1], ['2026-09-01', 1.5]]) {
    assert.equal(addProcedureDays(date, days), undefined);
  }
  const crossYear = deadlineInfo(application({ statusId: 'accepted-publication', procedure: { notifiedAt: '2027-12-15' } }), '2027-12-16');
  assert.equal(crossYear.attention, 'pending');
  assert.equal(crossYear.dueDate, undefined);
  const explicitSourceDate = deadlineInfo(application({ statusId: 'accepted-publication', officialDeadline: '2028-01-14', procedure: { notifiedAt: '2027-12-15' } }), '2027-12-16');
  assert.equal(explicitSourceDate.dueDate, '2028-01-14', 'an explicit source deadline is displayed without estimating an unsupported calendar');
  assert.equal(explicitSourceDate.remaining, undefined);
  assert.equal(explicitSourceDate.origin, 'source');
});

test('impossible, future and pre-filing trigger dates never activate a calculated countdown', () => {
  for (const [statusId, property] of [['form-observation', 'notifiedAt'], ['accepted-payment', 'finalAt'], ['opposition-window', 'publishedAt']]) {
    for (const date of ['2026-02-30', '2026-09-08', '2025-12-31']) {
      const overrides = property === 'publishedAt' ? { publishedAt: date } : { procedure: { [property]: date } };
      const result = deadlineInfo(application({ statusId, ...overrides }), today);
      assert.equal(result.attention, 'pending', `${statusId}: ${date}`);
      assert.equal(result.dueDate, undefined, `${statusId}: ${date}`);
    }
  }
  for (const officialDeadline of ['2026-02-30', '2026-08-31']) {
    const invalid = deadlineInfo(application({ officialDeadline, procedure: { notifiedAt: '2026-09-01' } }), today);
    assert.equal(invalid.attention, 'pending');
    assert.equal(invalid.dueDate, undefined);
  }
});

test('invalid completion evidence cannot silently close a pending action', () => {
  for (const [statusId, completedField, triggerField] of [
    ['accepted-publication', 'publicationRequestedAt', 'notifiedAt'],
    ['form-observation', 'responseFiledAt', 'notifiedAt'],
    ['accepted-payment', 'paymentAccreditedAt', 'finalAt'],
  ]) {
    for (const date of ['2026-09-08', '2025-12-31', '2026-02-30', '2026-08-31']) {
      const result = deadlineInfo(application({ statusId, procedure: { [triggerField]: '2026-09-01', [completedField]: date } }), today);
      assert.notEqual(result.attention, 'none', `${completedField}: ${date} cannot establish completion`);
      assert.notEqual(result.attention, 'terminal', `${completedField}: ${date} cannot establish a terminal outcome`);
    }
  }
});

test('a deadline explicitly dated before the application is invalid even when the trigger is unavailable', () => {
  const result = deadlineInfo(application({ officialDeadline: '2025-12-31' }), today);
  assert.equal(result.attention, 'pending');
  assert.equal(result.dueDate, undefined);
});

test('an elapsed weekend deadline stays overdue even when zero business days have elapsed', () => {
  const result = deadlineInfo(application({ officialDeadline: '2026-09-06', procedure: { notifiedAt: '2026-08-01' } }), today);
  assert.equal(result.remaining, 0);
  assert.equal(result.attention, 'overdue');
  assert.notEqual(deadlineLabel(result, today), 'Vence hoy');
  assert.match(deadlineLabel(result, today), /vencido/i);
});

test('concurrent opposition and substantive objections retain distinct deadlines while terminal outcomes stop them', () => {
  const open = application({ statusId: 'opposition-answer', publishedAt: '2026-06-22', procedure: {
    notifiedAt: '2026-08-24',
    concurrent: [
      { statusId: 'substantive-objection', notifiedAt: '2026-08-25' },
      { statusId: 'substantive-objection', notifiedAt: '2026-08-25' },
      { statusId: 'opposition-answer', notifiedAt: '2026-08-24' },
    ],
  } });
  const results = registrationDeadlines(open, today);
  assert.equal(results.length, 2);
  assert.deepEqual(results.map((item) => item.key), ['opposition-answer', 'substantive-objection']);
  assert.deepEqual(results.map((item) => item.sourceDate), ['2026-08-24', '2026-08-25']);
  assert.notEqual(results[0].dueDate, results[1].dueDate);
  for (const statusId of ['registered', 'rejected-final', 'not-filed', 'abandoned-payment']) {
    const closed = registrationDeadlines({ ...open, statusId }, today);
    assert.equal(closed.length, 1);
    assert.equal(closed[0].attention, 'terminal');
    assert.equal(closed[0].dueDate, undefined);
  }
});

test('the 22 procedural examples are isolated, chronologically coherent and exercise distinct legal outcomes', () => {
  assert.equal(PROCESS_DEMO_DATE, '2026-09-10');
  assert.equal(PROCESS_SCENARIOS.length, 22);
  assert.equal(new Set(PROCESS_SCENARIOS.map((item) => item.id)).size, 22);
  for (const item of PROCESS_SCENARIOS) {
    assert.match(item.id, /^DEMO-/);
    assert.match(item.applicationNumber, /^DEMO-/);
    assert.equal(item.provider, undefined);
    assert.equal(item.fileUrl, undefined);
    assert.ok(item.demoScenario);
    let preceding = item.filedAt;
    for (const event of item.history) {
      assert.ok(event.date >= preceding, `${item.id}: history must be chronological`);
      assert.ok(event.date <= PROCESS_DEMO_DATE, `${item.id}: no future act is presented as accomplished`);
      preceding = event.date;
    }
    for (const result of registrationDeadlines(item, PROCESS_DEMO_DATE)) {
      if (result.kind !== 'institutional') assert.notEqual(result.attention, 'pending', `${item.id}: the example must supply the evidence needed for its stated step`);
      if (result.dueDate) assert.ok(result.dueDate >= '2026-09-30', `${item.id}: mock deadlines must be on or after the release cutoff`);
      if (result.dueDate) assert.equal(result.origin, 'simulated');
    }
  }
  const byId = (id) => PROCESS_SCENARIOS.find((item) => item.id === id);
  assert.equal(deadlineInfo(byId('DEMO-003'), today).attention, 'none');
  assert.equal(deadlineInfo(byId('DEMO-004'), today).days, 20);
  assert.equal(deadlineInfo(byId('DEMO-005'), today).attention, 'none');
  assert.equal(deadlineInfo(byId('DEMO-007'), today).sourceDate, byId('DEMO-007').publishedAt);
  assert.equal(deadlineInfo(byId('DEMO-010'), today).days, 50);
  assert.equal(deadlineInfo(byId('DEMO-013'), PROCESS_DEMO_DATE).attention, 'normal');
  assert.equal(byId('DEMO-013').statusId, 'substantive-objection');
  assert.equal(registrationDeadlines(byId('DEMO-014'), today).length, 2);
  assert.equal(deadlineInfo(byId('DEMO-015'), today).attention, 'none');
  assert.equal(deadlineInfo(byId('DEMO-018'), today).sourceDate, byId('DEMO-018').procedure.finalAt);
  assert.equal(deadlineInfo(byId('DEMO-019'), today).attention, 'none');
  const registered = byId('DEMO-020');
  assert.equal(registered.registrationDate, '2026-08-31');
  assert.equal(registered.expirationDate, '2036-08-31');
});
