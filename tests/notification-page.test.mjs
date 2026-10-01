import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationPage } from '../lib/notification-page.ts';

test('large notification histories stay intact and reachable without rendering all rows', () => {
  const notices=Array.from({length:32382},(_,id)=>({id,status:'Gestionada'}));
  const first=notificationPage(notices,0), last=notificationPage(notices,10000);
  assert.equal(first.items.length,50);assert.equal(first.total,32382);assert.equal(first.pages,648);
  assert.equal(first.from,1);assert.equal(first.to,50);assert.equal(last.page,647);
  assert.equal(last.items.length,32);assert.equal(last.items.at(-1).id,32381);
  assert.equal(notices.length,32382);assert.ok(notices.every(n=>n.status==='Gestionada'));
  const pages=Array.from({length:first.pages},(_,page)=>notificationPage(notices,page).items).flat();
  assert.equal(new Set(pages.map(n=>n.id)).size,notices.length);
  assert.equal(notificationPage([],4).from,0);assert.equal(notificationPage([],4).page,0);
});
