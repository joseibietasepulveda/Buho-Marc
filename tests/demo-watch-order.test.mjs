import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_ORDER_EXPIRES_AT, DEMO_WATCH_ORDER, demoWatchOrderActive } from '../lib/demo-watch-order.ts';
import { watchPage } from '../lib/watch-page.ts';

const org = '10000000-0000-4000-8000-000000000001';
const env = '9e2891f0-7281-4872-a992-2c48866a782d';
const hit = (id, score = .75) => ({applicationId:id,name:id,holders:[],classes:[],score,status:'En Trámite',publishedAt:null,reviewStatus:'Detectada',image:'',history:[],channels:{}});
const target = (id, hits) => ({id:`BM-${id}`,name:id,applicationId:id,image:'',ownStatus:'Registrada',paused:false,status:'success',reviewedAt:null,nextReviewAt:null,warnings:[],results:hits,savedResults:[]});
const snapshot = {configured:true,automaticEnabled:false,settings:{high:.65,medium:.4},targets:[target('other',[hit('best-score',1)]),...DEMO_WATCH_ORDER.toReversed().map(([id,hits])=>target(id,[hit('other-'+id,.99),...hits.toReversed().map(id=>hit(id))]))]};

test('temporary ordering expires exactly at 23:00 Chile and applies only to Buho in Dev',()=>{
 const expiry=Date.parse(DEMO_ORDER_EXPIRES_AT);
 assert.equal(new Date(expiry).toISOString(),'2026-09-25T02:00:00.000Z');
 assert.equal(demoWatchOrderActive(org,env,expiry-1),true);
 assert.equal(demoWatchOrderActive(org,env,expiry),false);
 assert.equal(demoWatchOrderActive(org,env,expiry+1),false);
 assert.equal(demoWatchOrderActive('daniel',env,expiry-1),false);
 assert.equal(demoWatchOrderActive(org,'production',expiry-1),false);
});
test('all 19 selected brands and 36 comparisons lead in document order, before pagination; scores and saved data are unchanged',()=>{
 const before=JSON.stringify(snapshot);
 const page=watchPage(snapshot,new URLSearchParams({groups:'10'}),true);
 const rows=page.groups[0].rows;
 assert.deepEqual(rows.map(r=>r.target.applicationId),DEMO_WATCH_ORDER.map(([id])=>id));
 rows.forEach((row,i)=>assert.deepEqual(row.hits.map(h=>h.applicationId),DEMO_WATCH_ORDER[i][1]));
 assert.equal(rows.reduce((n,r)=>n+r.hits.length,0),36);
 assert.ok(rows.every(r=>r.hits.every(h=>h.score===.75)));
 assert.equal(page.count,56);
 assert.equal(JSON.stringify(snapshot),before);
 const more=watchPage(snapshot,new URLSearchParams({groups:'30','limit:Alta:BM-1660689':'10'}),true);
 assert.equal(more.groups[0].rows.length,20);
 assert.equal(more.groups[0].rows[0].hits.at(-1).applicationId,'other-1660689');
 const normal=watchPage(snapshot,new URLSearchParams(),false);
 assert.equal(normal.groups[0].rows[0].target.applicationId,'other');
 assert.equal(normal.groups[0].rows.length,10);
});
test('curation never bypasses search, state or publication filters, and never restores discarded comparisons',()=>{
 const changed=structuredClone(snapshot);
 const sella=changed.targets.find(t=>t.applicationId==='1660689');
 sella.results.find(h=>h.applicationId==='872236').reviewStatus='Descartada';
 sella.results.find(h=>h.applicationId==='914119').status='Abandonada';
 const page=watchPage(changed,new URLSearchParams({q:'1660689'}),true);
 assert.equal(page.groups[0].rows.length,1);
 assert.deepEqual(page.groups[0].rows[0].hits.map(h=>h.applicationId),['1093757','1345467']);
 assert.equal(watchPage(changed,new URLSearchParams({publication:'official'}),true).count,0);
});
