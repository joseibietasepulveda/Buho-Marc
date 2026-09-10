import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCalendarMonths,
  nextProcedureBusinessDay,
  registrationDeadlines,
} from '../lib/registration-procedure.ts';
import { registrationAgenda, urgentAgenda } from '../lib/agenda.ts';

const application = expirationDate => ({
  id: 'TEST-RENEWAL', name: 'MARCA DE PRUEBA', applicationNumber: 'TEST-RENEWAL',
  type: 'Denominativa', filedAt: '2015-01-05', statusId: 'registered',
  recentEvent: 'Registro concedido', niceClasses: '35', holderRut: 'No aplica',
  holder: 'Titular ficticio', client: 'Ejemplo', history: [], provider: 'inapi',
  expirationDate,
});

const deadline = (source, key, today = '2026-09-10') =>
  registrationDeadlines(source, today).find(item => item.key === key);

// LPI art. 24: six calendar months before/after expiry. Directrices Plazos
// 2026, p. 4 §§3–4: LBPA art. 25 supplies the month-period and last-day rules.
// The procedural closing day moves; the intrinsic registry expiry does not.
test('renewal closing dates move past holidays and weekends without changing source expiry', () => {
  const cases = [
    ['2026-03-18', '2026-09-18', '2026-09-21'],
    ['2026-06-25', '2026-12-25', '2026-12-28'],
    ['2026-07-01', '2027-01-01', '2027-01-04'],
    ['2026-09-26', '2027-03-26', '2027-03-29'],
    ['2027-03-17', '2027-09-17', '2027-09-20'],
    ['2027-06-30', '2027-12-30', '2027-12-30'],
  ];
  for (const [expiry, nominal, actual] of cases) {
    const source = application(expiry);
    const before = structuredClone(source);
    const close = deadline(source, 'renewal-close');
    const end = deadline(source, 'registration-expiry');
    assert.equal(close.nominalDate, nominal, expiry);
    assert.equal(close.dueDate, actual, expiry);
    assert.equal(close.sourceDate, expiry, expiry);
    assert.equal(close.fatal, true, expiry);
    assert.equal(end.nominalDate, expiry, expiry);
    assert.equal(end.dueDate, expiry, expiry);
    assert.equal(end.origin, 'source', expiry);
    assert.deepEqual(source, before, 'calendar derivation must not mutate the official registration');
  }
});

test('a month-end closing date is clamped before the non-business-day adjustment', () => {
  const source = application('2026-08-31');
  assert.equal(addCalendarMonths(source.expirationDate, 6), '2027-02-28');
  const close = deadline(source, 'renewal-close');
  assert.equal(close.nominalDate, '2027-02-28');
  assert.equal(close.dueDate, '2027-03-01');
  assert.equal(deadline(source, 'registration-expiry').dueDate, '2026-08-31');
});

test('opening the renewal window and the intrinsic expiry are not shifted merely because they are non-business days', () => {
  const source = application('2026-08-15');
  assert.equal(deadline(source, 'renewal-open').dueDate, '2026-02-15');
  assert.equal(deadline(source, 'registration-expiry').dueDate, '2026-08-15');
  assert.equal(deadline(source, 'renewal-close').dueDate, '2027-02-15');
  assert.equal(deadline(source, 'registration-expiry').fatal, false);
  assert.equal(deadline(source, 'renewal-open').fatal, false);
});

test('the 2027 boundary is supported but an unreviewed 2028 closing date is not invented', () => {
  assert.equal(nextProcedureBusinessDay('2027-01-01'), '2027-01-04');
  assert.equal(nextProcedureBusinessDay('2027-12-31'), '2027-12-31');
  assert.equal(nextProcedureBusinessDay('2028-01-01'), undefined);
  const source = application('2027-07-01');
  const close = deadline(source, 'renewal-close');
  assert.equal(close.nominalDate, '2028-01-01');
  assert.equal(close.dueDate, undefined);
  assert.equal(close.fatal, false);
  assert.equal(close.attention, 'none');
  assert.equal(close.origin, 'unavailable');
  assert.match(close.explanation, /falta validar el calendario/);
  assert.equal(deadline(source, 'registration-expiry').dueDate, '2027-07-01');
  assert.equal(registrationAgenda([source], [], '2027-06-30').some(item => item.id.endsWith(':renewal-close')), false);
});

test('the adjusted closure remains an actionable global alert while informational renewal milestones do not', () => {
  const source = application('2026-07-01');
  const before = structuredClone(source);
  const events = registrationAgenda([source], [], '2026-12-31');
  const close = events.find(item => item.id.endsWith(':renewal-close'));
  assert.equal(deadline(source, 'renewal-close', '2026-12-31').kind, 'legal');
  assert.equal(deadline(source, 'renewal-close', '2026-12-01').attention, 'normal');
  assert.equal(deadline(source, 'renewal-close', '2026-12-31').attention, 'soon');
  assert.equal(deadline(source, 'renewal-close', '2027-01-04').attention, 'soon');
  assert.equal(deadline(source, 'renewal-close', '2027-01-05').attention, 'overdue');
  assert.equal(close.date, '2027-01-04');
  assert.equal(close.informational, false);
  assert.equal(close.fatal, true);
  assert.deepEqual(urgentAgenda(events, '2026-12-31').map(item => item.id), [close.id]);
  assert.deepEqual(urgentAgenda(events, '2027-01-05').map(item => item.id), [close.id]);
  assert.deepEqual(source, before, 'passing the closure must not automatically cancel the registration');
});

test('a source status of expired retains the post-expiry renewal window without changing that status', () => {
  const source = { ...application('2026-07-01'), statusId: 'expired' };
  const before = structuredClone(source);
  const close = deadline(source, 'renewal-close', '2026-12-31');
  assert.equal(close.nominalDate, '2027-01-01');
  assert.equal(close.dueDate, '2027-01-04');
  assert.equal(close.kind, 'legal');
  assert.equal(close.attention, 'soon');
  assert.equal(deadline(source, 'registration-expiry').dueDate, '2026-07-01');
  assert.equal(deadline(source, 'renewal-close', '2027-01-05').attention, 'overdue');
  assert.deepEqual(source, before);
});

test('missing or impossible expiry cannot produce a renewal calculation', () => {
  for (const value of [undefined, '', '2026-02-30', '2027-02-29']) {
    const results = registrationDeadlines(application(value), '2026-09-10');
    assert.equal(results.some(item => ['renewal-open', 'registration-expiry', 'renewal-close'].includes(item.key)), false, String(value));
  }
});
