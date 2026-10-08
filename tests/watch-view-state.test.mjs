import test from 'node:test';
import assert from 'node:assert/strict';
import { watchPage } from '../lib/watch-page.ts';
import { updateWatchPage, retainConvertedFindings } from '../lib/watch-view-state.ts';

const hit = { matchId: 'match-1', applicationId: '200', name: 'Marca detectada', holders: [], classes: [{ nice_class: 35 }], score: .95, status: 'En Trámite', reviewStatus: 'Detectada', discoveryKind: 'filing', commercialRelevance: 'related', publishedAt: null, image: '', history: [], channels: {} };
const target = { id: 'own-1', name: 'Marca propia', applicationId: '100', image: '', ownStatus: 'Registrada', paused: false, status: 'success', reviewedAt: null, nextReviewAt: null, warnings: [], results: [hit], savedResults: [] };
const snapshot = { configured: true, automaticEnabled: false, settings: { high: .85, medium: .55 }, targets: [target] };
const initial = () => watchPage(snapshot, new URLSearchParams());

test('confirmed follow updates duplicate cards and counters once, while preserving source data', () => {
  const page = initial();
  const followed = updateWatchPage(page, hit.matchId, { reviewStatus: 'En seguimiento', watchPublication: true });
  assert.equal(followed.groups[0].rows[0].hits[0].watchPublication, true);
  assert.equal(followed.followed[0].hits[0].reviewStatus, 'En seguimiento');
  assert.equal(followed.count, 0);
  assert.equal(followed.followedCount, 1);
  const repeated = updateWatchPage(followed, hit.matchId, { reviewStatus: 'En seguimiento' });
  assert.equal(repeated.followedCount, 1);
  assert.equal(repeated.followed[0].hits.length, 1);
  assert.equal(page.groups[0].rows[0].hits[0].reviewStatus, 'Detectada');
});
test('converted case stays accessible in its original card after a poll, without duplicate follow rows', () => {
  const converted = updateWatchPage(initial(), hit.matchId, { reviewStatus: 'Convertida en caso' });
  const updated = watchPage({ ...snapshot, targets: [{ ...target, results: [{ ...hit, reviewStatus: 'Convertida en caso' }] }] }, new URLSearchParams());
  assert.equal(updated.groups[0].rows.length, 0);
  const retained = retainConvertedFindings(updated, converted);
  assert.equal(retained.groups[0].rows[0].hits[0].reviewStatus, 'Convertida en caso');
  assert.equal(retained.count, 0);
  assert.equal(retained.followedCount, 1);
  assert.equal(retainConvertedFindings(retained, converted).groups[0].rows[0].hits.length, 1);
});
test('discard removes follow row and does not change unrelated counters or another match', () => {
  const followed = updateWatchPage(initial(), hit.matchId, { reviewStatus: 'En seguimiento' });
  const discarded = updateWatchPage(followed, hit.matchId, { reviewStatus: 'Descartada' });
  assert.equal(discarded.followedCount, 0);
  assert.equal(discarded.followed.length, 0);
  assert.equal(discarded.groups[0].rows.length, 0);
  assert.equal(updateWatchPage(discarded, 'unknown', { reviewStatus: 'En seguimiento' }), discarded);
});
test('a server-confirmed removal does not resurrect a converted card or a deleted case', () => {
  const converted = updateWatchPage(initial(), hit.matchId, { reviewStatus: 'Convertida en caso' });
  const removed = watchPage({ ...snapshot, targets: [{ ...target, results: [{ ...hit, reviewStatus: 'Descartada' }] }] }, new URLSearchParams());
  const retained = retainConvertedFindings(removed, converted);
  assert.equal(retained.groups[0].rows.length, 0);
  assert.equal(retained.followedCount, 0);
});
