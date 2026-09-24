import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotReader, pollWhileVisible } from '../lib/snapshot-client.ts';

test('conditional reads retain data, use validators only for the same URL, and reject failures', async()=>{
 const original=globalThis.fetch; const calls=[];
 try {
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return calls.length===1?Response.json({value:1},{headers:{ETag:'"first"'}}):calls.length===2?new Response(null,{status:304}):Response.json({message:'failed'},{status:500});};
  const read=snapshotReader();
  assert.deepEqual(await read('/api/watch?q=a'),{value:1});
  assert.equal(await read('/api/watch?q=a'),null);
  assert.equal(calls[1].options.headers['If-None-Match'],'"first"');
  await assert.rejects(read('/api/watch?q=b'),/failed/);
  assert.equal(calls[2].options.headers['If-None-Match'],undefined);
 }finally{globalThis.fetch=original;}
});

test('hidden tabs send no polls, returning refreshes, requests do not overlap, cleanup stops work',async()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 const win=new EventTarget(),doc=new EventTarget(); let tick;win.setInterval=fn=>(tick=fn,1);win.clearInterval=()=>{};doc.visibilityState='hidden';
 globalThis.window=win;globalThis.document=doc;
 try{
  let calls=0,release;const refresh=async()=>{calls++;await new Promise(r=>release=r);};
  const stop=pollWhileVisible(refresh,30000);tick();assert.equal(calls,0);
  doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,1);
  tick();tick();assert.equal(calls,1); // no overlapping downloads
  doc.visibilityState='hidden';release();await new Promise(r=>setImmediate(r));assert.equal(calls,1);
  doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,2);
  stop();release();await new Promise(r=>setImmediate(r));tick();win.dispatchEvent(new Event('focus'));assert.equal(calls,2);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
