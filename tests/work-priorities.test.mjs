import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkDate, workDeadline, chileToday, noticePresentation } from '../lib/work-priorities.ts';

test('unknown dates remain unknown and impossible dates are rejected', () => {
  for (const value of ['', 'Por definir 2026', '2026-02-30', '31 abr 2026', '15 ago']) assert.equal(parseWorkDate(value), null);
  assert.equal(parseWorkDate('20 ago 2026'), '2026-08-20');
  assert.equal(parseWorkDate('4 de septiembre de 2026'), '2026-09-04');
});
test('deadline priority uses the stored date, with inclusive today and fourteen-day boundaries', () => {
  const today = '2026-09-06';
  assert.equal(workDeadline('2026-09-05', false, today).tone, 'overdue');
  assert.equal(workDeadline('2026-09-06', false, today).label, 'Vence hoy');
  assert.equal(workDeadline('2026-09-20', false, today).tone, 'soon');
  assert.equal(workDeadline('2026-09-21', false, today).tone, 'normal');
  assert.equal(workDeadline('', false, today).tone, 'unknown');
  assert.equal(workDeadline('2026-01-01', true, today).tone, 'closed');
});
test('Chilean calendar date is independent of server timezone', () => {
  assert.equal(chileToday(new Date('2026-07-10T02:00:00Z')), '2026-07-09');
  assert.equal(chileToday(new Date('2026-12-10T02:00:00Z')), '2026-12-09');
});
test('deadline notices never borrow a similarity label or infer a date from relative text', () => {
  const notice = { title: 'En 5 días vence el plazo para presentar una oposición', brand: 'TERRA SUR', urgency: 'Alta' };
  const missing = noticePresentation(notice);
  assert.equal(missing.label, 'Fecha por confirmar');
  assert.equal(missing.title, 'Seguimiento de plazo · TERRA SUR');
  assert.equal(noticePresentation(notice, '2026-08-20', '2026-09-06').label, 'Plazo vencido');
});
test('source activity and similarity notices keep distinct meanings even at the same urgency', () => {
  const base = { title: 'Coincidencia de alta similitud', brand: 'NOVA', urgency: 'Alta' };
  assert.equal(noticePresentation(base).label, 'Alta similitud');
  assert.equal(noticePresentation({ ...base, changeDetail: {} }).label, 'Novedad del expediente');
  assert.equal(noticePresentation({ ...base, title: 'Antecedentes disponibles' }).label, 'Prioridad alta');
});
