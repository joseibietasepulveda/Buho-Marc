import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, csvDocument, dateRange, number, usd, percent, date, milliseconds, hours } from '../app/app/admin/dashboard/format.ts';
import { reportRows } from '../app/app/admin/dashboard/export.ts';

test('dashboard preserves unknown costs and counts rather than converting absent data to zero', () => {
  assert.equal(usd(null), 'Sin dato'); assert.equal(usd(undefined), 'Sin dato');
  assert.equal(number(null), 'Sin dato'); assert.equal(percent(null), 'Sin dato');
  assert.equal(hours(null), 'Sin dato'); assert.equal(milliseconds(null), 'Sin medición');
  assert.match(usd(0), /0,00/); assert.match(usd(.000123), /0,000123/);
  assert.equal(date('garbage'), 'Sin registro');
});
test('quick ranges count inclusive Chile calendar dates even when UTC is already the next day', () => {
  assert.deepEqual(dateRange(7, new Date('2026-10-15T01:00:00Z')), { from: '2026-10-08', to: '2026-10-14' });
  assert.deepEqual(dateRange(56, new Date('2026-10-15T01:00:00Z')), { from: '2026-08-20', to: '2026-10-14' });
});
test('CSV escapes formulas, quotations and embedded newlines without exposing unknown values as zeros', () => {
  for (const formula of ['=HYPERLINK("bad")', ' +SUM(A1)', '@evil', '\t=cmd', '\r=cmd', '-1+2']) assert.match(csvCell(formula), /^"'/);
  assert.equal(csvCell('Búho "Marc"'), '"Búho ""Marc"""');
  assert.equal(csvCell(null), '""'); assert.equal(csvCell(0), '"0"');
  assert.match(csvDocument([['Título', null], ['dato', 'línea\nsegunda']]), /^\uFEFF"Título";""\r\n"dato";"línea\nsegunda"$/);
});
test('API export identifies its bound detail appendix while retaining complete aggregate totals', () => {
  const report = {
    scope: { from: '2026-10-01', to: '2026-10-14', organizationId: null, userId: null }, generatedAt: '2026-10-14T12:00:00Z', timezone: 'America/Santiago',
    apis: { metrics: [{ key: 'physical_calls', label: 'Llamados', value: 1200, unit: 'count', availability: 'partial' }], totalCalls: 1200, detailLimit: 500, providers: [{ provider: 'openrouter', operation: 'watch_glm', model: 'z-ai/example', calls: 1200, errors: 10, unknownOutcome: 4, meanDurationMs: 100, p95DurationMs: 500, confirmedUsd: .04, estimatedUsd: 0, reservedUsd: .002 }], calls: [{ startedAt: '2026-10-14', provider: 'openrouter', operation: 'watch_glm', outcome: 'unknown', confirmedUsd: null, estimatedUsd: null, reservedUsd: .002 }] }, limitations: ['Costo histórico sin factura conciliada.'],
  };
  const rows = reportRows(report, 'apis');
  assert(rows.some(row => row[0] === 'Total del período' && row[1] === 1200));
  assert(rows.some(row => row[0] === 'Límite de detalle reciente' && row[1] === 500));
  assert(rows.some(row => row.some(value => String(value).includes('muestra reciente'))));
  assert(rows.some(row => row[0] === 'openrouter' && row[3] === 1200));
  assert(rows.some(row => row.includes(null)));
});
