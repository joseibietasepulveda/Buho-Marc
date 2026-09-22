import test from 'node:test';
import assert from 'node:assert/strict';
import {filterWatchTargets, watchHits} from '../lib/watch-list.ts';
const hit=(id, extra={})=>({applicationId:id,name:'Café Similar',holders:[{name:'Titular de tercero'}],reviewStatus:'Detectada',status:'Denegada',...extra});
const target={id:'BM-1',name:'Café Propio',applicationId:'100',results:[hit('200')],savedResults:[hit('200',{reviewStatus:'En seguimiento'}),hit('201',{reviewStatus:'En seguimiento',level:'Alta'})]};
test('a followed application remains discoverable outside the stock without duplicating those still in it',()=>{
 assert.deepEqual(watchHits(target).map(h=>h.applicationId),['200','201']);
 assert.deepEqual(filterWatchTargets([target],'',[],['En seguimiento'])[0].hits.map(h=>h.applicationId),['201']);
});
test('search combines own name, third-party holder and manual review; INAPI states are never excluded',()=>{
 assert.equal(filterWatchTargets([target],'CAFE PROPIO',[],[])[0].hits.length,2);
 assert.equal(filterWatchTargets([target],'titular de tercero',['Alta'],[])[0].hits[0].applicationId,'201');
 assert.equal(filterWatchTargets([target],'',[],['Pendiente de clasificación'])[0].hits[0].status,'Denegada');
 assert.equal(filterWatchTargets([target],'ajeno',[],[]).length,0);
});
test('pending and empty reviewed brands stay visible without falsely matching a review filter',()=>{
 const pending={...target,results:[],savedResults:[]};
 assert.equal(filterWatchTargets([pending],'',[],[]).length,1);
 assert.equal(filterWatchTargets([pending],'',[],['En seguimiento']).length,0);
});

test('discovery applies exact state exclusions and exclusive score bands including granted marks', async()=>{
 const {discoveryGroups,followedGroups}=await import('../lib/watch-list.ts');
 const hits=[hit('1',{score:.9,status:'Registrada'}),hit('2',{score:.7,status:'En Trámite'}),hit('3',{score:.5,status:'Publicada'}),hit('4',{score:1,status:'Denegada'}),hit('5',{score:1,status:'Desistida'}),hit('6',{score:1,status:'Abandonada'}),hit('7',{score:.6,status:'Recurso contra denegación'}),hit('8',{score:.2,status:'En Trámite',reviewStatus:'En seguimiento'})];
 const t={...target,results:hits,savedResults:[]};
 const groups=discoveryGroups([t],'',{high:.6,medium:.3});
 assert.deepEqual(groups[0].rows[0].hits.map(h=>h.applicationId),['1','2','7']);
 assert.deepEqual(groups[1].rows[0].hits.map(h=>h.applicationId),['3']);
 assert.equal(groups[0].rows[0].target.id,groups[1].rows[0].target.id);
 assert.deepEqual(followedGroups([t],'')[0].hits.map(h=>h.applicationId),['8']);
 assert.equal(discoveryGroups([t],'',{high:.8,medium:.6})[1].rows[0].hits.length,2);
});
