import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTrademarkImage, trademarkImageResponse } from '../lib/trademark-image-server.ts';
import { dequienesImage, safeTrademarkImage, portfolioImage, trademarkImageSrc, retryTrademarkImage } from '../lib/trademark-image.ts';
import { normalizeInapi, reprojectInapiRecord } from '../lib/inapi-provider.ts';
process.env.INAPI_API_KEY='test-only';
const document=id=>({application_id:id,name:`Marca ${id}`,status:{code:'ET',description:'En Trámite'},dates:{filed_at:'2026-01-01',published_at:null,registered_at:null,expires_at:null,last_changed_at:null},trademark:{sign_type:'Mixta'},holders:[],representatives:[],classes:[{nice_class:35}],events:[],annotations:[],source:{}});
const primary='https://marcas.dequienes.cl/fixture/200.png';
const png=await readFile('public/reports/studio-logo.png');
const ok=()=>new Response(png,{headers:{'content-type':'image/png'}});

test('provider-first portfolio normalization preserves evidence and reprojects old portfolios',()=>{
 const record=normalizeInapi({...document(200),image_url:primary});
 assert.equal(record.logo,portfolioImage('200',primary)); assert.equal(record.inapi.image_url,primary);
 assert.equal(reprojectInapiRecord({...record,logo:'/api/inapi/logo/200'}).logo,record.logo);
 assert.equal(trademarkImageSrc(primary,'200'),record.logo);
 assert.equal(retryTrademarkImage(record.logo,2),record.logo+'&retry=2');
 assert.equal(trademarkImageSrc(primary),'/api/similarity/image?url='+encodeURIComponent(primary));
 for(const url of ['http://marcas.dequienes.cl/a','https://evil.test/a','https://marcas.dequienes.cl:444/a','https://user:pass@marcas.dequienes.cl/a','//evil.test/a']) assert.equal(dequienesImage(url),'');
 assert.equal(safeTrademarkImage('/api/inapi/logo/200?source='+encodeURIComponent('https://evil.test/a')),'');
 assert.equal(safeTrademarkImage('/api/inapi/logo/200/extra'),'');
});
test('primary success skips official fallback and never forwards credentials to image hosts',async()=>{
 const calls=[]; const logo=await loadTrademarkImage({scope:'unit-primary',applicationId:'200',sourceUrl:primary},async(url,options)=>{calls.push([String(url),options]);return ok();});
 assert.equal(logo.provider,'dequienes');assert.equal(calls.length,1);assert.equal(calls[0][0],primary);
 assert.equal(calls[0][1].headers,undefined);assert.equal(calls[0][1].redirect,'error');
 assert.equal(trademarkImageResponse(logo).headers.get('cache-control'),'private, max-age=3600');
});
test('missing image URL consults saved evidence before API; legacy lookup uses exact returned ID',async()=>{
 let calls=[];
 await loadTrademarkImage({scope:'unit-saved',applicationId:'200',savedSource:async()=>primary},async url=>{calls.push(String(url));return ok();});assert.deepEqual(calls,[primary]);
 calls=[];
 const logo=await loadTrademarkImage({scope:'unit-legacy',applicationId:'200'},async(url,options)=>{calls.push(String(url));if(String(url).endsWith('/batch')){assert.deepEqual(JSON.parse(options.body),{application_ids:[200]});return Response.json({documents:[{application_id:999,image_url:'https://evil.test/a'},{application_id:200,image_url:primary}]});}return ok();});
 assert.deepEqual(calls,['https://dequienes.cl/inapi/trademarks/batch',primary]);assert.equal(logo.provider,'dequienes');
});
test('HTTP, network and invalid image failures advance to official; fallback is not cached',async()=>{
 for(const failure of [()=>new Response('outage',{status:503}),()=>{throw new Error('timeout');},()=>new Response('not an image',{headers:{'content-type':'image/png'}}),()=>new Response('<html>challenge</html>',{headers:{'content-type':'text/html'}})]){
  const calls=[]; const logo=await loadTrademarkImage({scope:'unit-failure',applicationId:'200',sourceUrl:primary},async url=>{calls.push(String(url));return String(url)===primary?failure():ok();});
  assert.equal(logo.provider,'inapi');assert.deepEqual(calls,[primary,'https://buscadormarcas.inapi.cl/etiqueta/?s=200']);
  assert.equal(trademarkImageResponse(logo).headers.get('cache-control'),'private, no-store');
 }
 const unavailable=await loadTrademarkImage({scope:'unit-unavailable',applicationId:'200',sourceUrl:primary},async()=>new Response(null,{status:503}));
 assert.equal(unavailable,null);assert.equal(trademarkImageResponse(unavailable).status,503);
 assert.equal((await loadTrademarkImage({scope:'unit-unavailable',applicationId:'200',sourceUrl:primary},async()=>ok())).provider,'dequienes');
});
test('in-flight requests share one download within organization and remain isolated between organizations',async()=>{
 let count=0; const fetcher=async()=>{count++;await new Promise(resolve=>setTimeout(resolve,20));return ok();};
 const options={scope:'unit-same',applicationId:'200',sourceUrl:primary};
 await Promise.all([loadTrademarkImage(options,fetcher),loadTrademarkImage(options,fetcher),loadTrademarkImage({...options,scope:'unit-other'},fetcher)]);
 assert.equal(count,2);
});
