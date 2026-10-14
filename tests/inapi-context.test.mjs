import test from 'node:test';
import assert from 'node:assert/strict';
import {officialContext,fetchOfficialInapi,createSerialRequestGate} from '../lib/inapi-official.ts';
import {fixture,officialFetcher} from './fixtures/inapi-recovery.mjs';

test('public context accepts populated hidden fields and observed literal initialization',()=>{
 assert.deepEqual(officialContext('<input value="hash&amp;value" id="hdnHash"><input id="hdnIDW" value="context">'),{Hash:'hash&value',IDW:'context'});
 for(const quotes of ["'",'"']) {
  const html=`<input id="hdnHash"><input id="hdnIDW" value=""><script>setHash(${quotes}opaque${quotes}, ${quotes}context${quotes});</script>`;
  assert.deepEqual(officialContext(html),{Hash:'opaque',IDW:'context'});
 }
 assert.deepEqual(officialContext('<script>setHash("opaque","context");setHash("opaque","context");</script>'),{Hash:'opaque',IDW:'context'});
});

test('unknown dynamic, missing, escaped and contradictory public contexts fail without executing JavaScript',()=>{
 for(const html of [
  '<input id="hdnHash"><input id="hdnIDW">',
  '<script>setHash(window.hash,"context");</script>',
  '<script>setHash("opaque","");</script>',
  '<script>setHash("opa\\x71ue","context");</script>',
  '<script>setHash("first","context");setHash("second","other");</script>',
  '<input id="hdnHash" value="old"><script>setHash("new","context");</script>',
  '<p>setHash("opaque","context");</p>',
 ]) assert.throws(()=>officialContext(html),/contexto del buscador/,html);
});

test('a dossier initialized by setHash keeps its own cookies and all three gated requests',async()=>{
 const mock=officialFetcher();let calls=0,gated=0;
 const fetcher=async(url,init)=>{
  const response=await mock.fetcher(url,init);calls++;
  return calls===1?new Response('<input id="hdnHash"><input id="hdnIDW"><script>setHash("opaque","context");</script>',{headers:response.headers}):response;
 };
 const serial=createSerialRequestGate(()=>0,async()=>{});
 const gate=fn=>{gated++;return serial(fn);};
 const result=await fetchOfficialInapi(fixture(),gate,fetcher);
 assert.equal(calls,3);assert.equal(gated,3);assert.equal(result.applicationNumber,'999001');
 assert.equal(result.retrieval.historyComplete,undefined);
});

test('an unreadable public context stops after the initial request',async()=>{
 let calls=0;
 await assert.rejects(fetchOfficialInapi(fixture(),fn=>fn(),async()=>{calls++;return new Response('<script>setHash(getHash(),"context");</script>');}),/contexto del buscador/);
 assert.equal(calls,1);
});
