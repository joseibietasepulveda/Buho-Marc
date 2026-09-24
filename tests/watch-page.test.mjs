import test from 'node:test';
import assert from 'node:assert/strict';
import {watchPage} from '../lib/watch-page.ts';
const targets=Array.from({length:12},(_,i)=>({id:`BM-${i}`,name:`Marca ${String(i).padStart(2,'0')}`,applicationId:String(i),image:'',ownStatus:'Registrada',paused:false,status:'success',reviewedAt:'2026-09-24T15:30:00Z',nextReviewAt:null,warnings:[],savedResults:[],results:Array.from({length:12},(_,j)=>({applicationId:`${i}-${j}`,name:`Hallazgo ${i}-${j}`,holders:[{name:'Titular'}],classes:[{nice_class:35}],score:.9-j*.01,status:'En Trámite',publishedAt:j===11?'2026-09-24':null,reviewStatus:'Detectada',image:'',history:[],channels:{}}))}));
const snapshot={configured:true,automaticEnabled:false,settings:{high:.65,medium:.3},targets};
test('pagination sends 10 groups and five hits while retaining full counts; more reaches remaining results',()=>{
 const page=watchPage(snapshot,new URLSearchParams());
 assert.equal(page.count,144);assert.equal(page.groups[0].totalGroups,12);assert.equal(page.groups[0].rows.length,10);
 assert.ok(page.groups[0].rows.every(row=>row.hits.length===5&&row.total===12&&row.target.results.length===0));
 const more=watchPage(snapshot,new URLSearchParams({'groups':'20','limit:Alta:BM-0':'10'}));
 assert.equal(more.groups[0].rows.length,12);assert.equal(more.groups[0].rows[0].hits.length,10);
});
test('search and publication filters apply before pagination, including initially hidden hits and groups',()=>{
 const search=watchPage(snapshot,new URLSearchParams({q:'Hallazgo 11-11'}));
 assert.equal(search.count,1);assert.equal(search.groups[0].rows[0].hits[0].applicationId,'11-11');
 const publication=watchPage(snapshot,new URLSearchParams({publication:'official',from:'2026-09-24',to:'2026-09-24'}));
 assert.equal(publication.count,12);assert.ok(publication.groups[0].rows.every(row=>row.total===1));
});
test('followed results outside the current stock stay accessible without duplicating saved copies',()=>{
 const followed={...targets[0].results[0],applicationId:'followed',reviewStatus:'En seguimiento'};
 const data={...snapshot,targets:[{...targets[0],savedResults:[followed]}]};
 const page=watchPage(data,new URLSearchParams());
 assert.equal(page.followedCount,1);assert.equal(page.followed[0].hits[0].applicationId,'followed');
 assert.equal(watchPage(data,new URLSearchParams({followState:'Convertida en caso'})).followed.length,0);
});
