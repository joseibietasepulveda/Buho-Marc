import test from 'node:test';
import assert from 'node:assert/strict';
import { commercialRelevance, discoveryKind } from '../lib/watch-discovery.ts';
import { discoveryLevel, DEFAULT_WATCH_SETTINGS } from '../lib/watch-policy.ts';
const c = (nice_class, coverage_text) => ({ nice_class, coverage_text });
test('commercial triage retains related classes, cross-class coverage and incomplete evidence', () => {
  assert.equal(commercialRelevance([c(30, 'Café y pan')], [c(43, 'Servicios de cafetería')]), 'related');
  assert.equal(commercialRelevance([c(9, 'Software')], [c(42, 'Desarrollo de software')]), 'related');
  assert.equal(commercialRelevance([c(35, 'Venta de calzado')], [c(25, 'Calzado')]), 'unknown');
  assert.equal(commercialRelevance([c(9, 'Aplicaciones para reservas hoteleras')], [c(43, 'Reservas hoteleras')]), 'related');
  assert.equal(commercialRelevance([], [c(25, 'Prendas')]), 'unknown');
  assert.equal(commercialRelevance([c(25)], [c(36)]), 'unknown');
  assert.equal(commercialRelevance([c(25, 'Calzado deportivo')], [c(36, 'Seguros financieros')]), 'unrelated');
});
test('discovery uses official dates, retains pending events and recognizes later changes', () => {
  const hit = { status: 'En Trámite', filedAt: '2020-01-01', publishedAt: null };
  assert.equal(discoveryKind(hit, '2026-09-28'), 'baseline');
  assert.equal(discoveryKind({ ...hit, filedAt: '2026-09-28' }, '2026-09-28'), 'filing');
  assert.equal(discoveryKind({ ...hit, publishedAt: '2026-09-28' }, '2026-09-28', { hit, discoveryKind: 'baseline' }), 'publication');
  assert.equal(discoveryKind({ ...hit, status: 'Registrada' }, '2026-09-28', { hit, discoveryKind: 'baseline' }), 'status-change');
  assert.equal(discoveryKind(hit, '2026-09-28', { hit, discoveryKind: 'publication' }), 'publication');
});
test('default score boundaries are high 70–100 and medium 55–less than 70', () => {
  assert.deepEqual(DEFAULT_WATCH_SETTINGS, { high: .7, medium: .55 });
  assert.equal(discoveryLevel({ score: .7 }, DEFAULT_WATCH_SETTINGS), 'Alta');
  assert.equal(discoveryLevel({ score: .6999 }, DEFAULT_WATCH_SETTINGS), 'Media');
  assert.equal(discoveryLevel({ score: .55 }, DEFAULT_WATCH_SETTINGS), 'Media');
  assert.equal(discoveryLevel({ score: .5499 }, DEFAULT_WATCH_SETTINGS), null);
});
