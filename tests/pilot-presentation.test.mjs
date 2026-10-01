import assert from 'node:assert/strict';
import test from 'node:test';
import { workspacePolicy } from '../lib/workspace-policy.ts';
import { missingBrandFields, comparePortfolioBrands } from '../lib/brand-filters.ts';
import { featuredWatchRank } from '../lib/featured-watch.ts';
import { watchPage } from '../lib/watch-page.ts';

test('FA presentation capabilities use a stable tenant slug', () => {
  assert.deepEqual(workspacePolicy('fa-abogados'), { sourceAdmin:false, about:false, changePassword:false });
  assert.deepEqual(workspacePolicy('estudio-ibieta-ip'), { sourceAdmin:true, about:true, changePassword:true });
  assert.equal(workspacePolicy().changePassword, true);
});
test('complete portfolio rows go first without treating word marks or pending registrations as missing', () => {
  const complete={name:'Marca',owner:'Titular',rut:'76123456-7',applicationNumber:'123456',type:'Mixta',classes:'35',legalStatus:'registered',registrationState:'Registrada',registration:'7890',logo:'/logo.png',matches:1,status:'En monitoreo'};
  const incomplete={...complete,rut:'No informado',matches:99};
  assert.equal(missingBrandFields(complete),0);
  assert.equal(missingBrandFields(incomplete),1);
  assert.ok(comparePortfolioBrands(complete,incomplete)<0);
  assert.equal(missingBrandFields({...complete,type:'Denominativa',logo:undefined,legalStatus:'pending',registration:'Pendiente',registrationState:'En trámite'}),0);
});
test('featured exact pairs retain scores, obey text/date filters and leave normal classifications intact', () => {
  const makeHit=(id,rank,score,status)=>({applicationId:id,name:`Marca ${id}`,score,status,image:'',holders:[],classes:[],history:[],channels:{},publishedAt:'2026-09-21',reviewStatus:'Detectada',discoveryKind:'baseline',featuredRank:rank});
  const target={id:'test',name:'Club Del Mal Amor',applicationId:'1659715',image:'',ownStatus:'Registrada',paused:false,status:'success',reviewedAt:null,nextReviewAt:null,warnings:[],results:[makeHit('1689486',featuredWatchRank('1659715','1689486'),.78,'En Trámite'),makeHit('1683639',featuredWatchRank('1659715','1683639'),.88,'En Trámite'),makeHit('1658314',10,.357,'Registrada')]};
  const snapshot={configured:true,automaticEnabled:false,settings:{high:.65,medium:.45},targets:[target]};
  const page=watchPage(snapshot,new URLSearchParams());
  assert.deepEqual(page.featured[0].hits.map(h=>h.applicationId),['1683639','1689486','1658314']);
  assert.equal(page.featured[0].hits[2].score,.357);
  assert.equal(page.count+page.baselineCount,0,'no duplicate normal rows');
  assert.equal(watchPage(snapshot,new URLSearchParams('q=unmatched')).featured.length,0);
  assert.equal(watchPage(snapshot,new URLSearchParams('from=2026-10-01')).featured.length,0);
  assert.equal(featuredWatchRank('1659715','unrelated'),undefined);
  target.results[0].reviewStatus='Descartada';
  assert.equal(watchPage(snapshot,new URLSearchParams()).featured[0].hits.length,2);
  const publicExample={...target,id:'example',presentationExample:true,reviewedAt:'2026-09-29T17:16:57.699Z'};
  const withExample=watchPage({...snapshot,targets:[target,publicExample]},new URLSearchParams());
  assert.equal(withExample.total,1,'public examples are not counted as owned portfolio targets');
  assert.equal(withExample.reviewTargets.length,1);
  assert.equal(withExample.reviewedAt,null,'cached examples do not change the actual portfolio review date');
});
