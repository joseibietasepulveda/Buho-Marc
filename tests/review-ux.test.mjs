import test from 'node:test';
import assert from 'node:assert/strict';
import { applyVerifiedDecision } from '../lib/verified-decisions.ts';
import { hiddenDiscoveryState } from '../lib/watch-policy.ts';
import { discoveryGroups, followedGroups } from '../lib/watch-list.ts';
import { oppositionWindow } from '../lib/opposition-window.ts';
import { selectReportHits } from '../lib/report-selection.ts';
import { searchSimilar } from '../lib/similarity-provider.ts';
const hit=(id='1',extra={})=>({applicationId:id,name:'Marca '+id,status:'En Trámite',statusCode:'P',registrationId:null,type:'Mixta',image:'',holders:[],classes:[],filedAt:null,publishedAt:null,registeredAt:null,score:.75,channels:{},history:[],...extra});
test('terminal wording and recorded abandonment cannot be mislabeled as pending, including compact snapshots',()=>{
  for(const status of ['Abandonado','Solicitud sin estado','*VER INSTANCIA','Anulada','Vencida','Caducado','Desistida']) assert.equal(hiddenDiscoveryState(applyVerifiedDecision(hit('1',{status})).status),true,status);
  const normalized=applyVerifiedDecision(hit('1',{history:[{date:'2026-08-10',title:'Resolución de abandono',detail:''}]}));
  assert.equal(normalized.status,'Abandonada');
  assert.equal(applyVerifiedDecision({...normalized,history:[]}).status,'Abandonada');
  assert.equal(normalized.sourceStatus,'En Trámite');
  assert.equal(applyVerifiedDecision(hit('2',{registrationId:'999',registeredAt:'2026-08-10'})).status,'Registrada');
  assert.equal(applyVerifiedDecision(hit('2',{registrationId:'999',registeredAt:'2026-08-10',status:'Vencida'})).status,'Vencida');
});
test('brands and hits rank by the strongest evidence, while followed terminal marks remain available',()=>{
  const a={id:'a',name:'A',results:[hit('1',{score:.7}),hit('2',{score:.9})]};
  const b={id:'b',name:'B',results:[hit('3',{score:.95})]};
  const group=discoveryGroups([a,b],'',{high:.65,medium:.45})[0];
  assert.deepEqual(group.rows.map(row=>row.target.id),['b','a']);
  assert.deepEqual(group.rows[1].hits.map(hit=>hit.applicationId),['2','1']);
  assert.equal(followedGroups([{...a,results:[hit('1',{status:'Rechazada definitivamente',reviewStatus:'En seguimiento'})]}],'').length,1);
});
test('opposition countdown is local, bounded by the calendar and never presented for ended records',()=>{
  assert.match(oppositionWindow(hit(), '2026-09-22').label,/sin publicación/);
  assert.match(oppositionWindow(hit('1',{publishedAt:'2026-09-21'}),'2026-09-22').label,/Quedan 29 días hábiles/);
  assert.match(oppositionWindow(hit('1',{publishedAt:'2026-01-01'}),'2026-09-22').label,/finalizado/);
  assert.match(oppositionWindow(hit('1',{publishedAt:'2020-01-01'}),'2026-09-22').label,/confirmar/);
  assert.equal(oppositionWindow(hit('1',{status:'Registrada'})).tone,'ended');
});
test('report chooses exactly selected marks across pages or the five highest scores without mutating results',()=>{
  const hits=Array.from({length:12},(_,i)=>hit(String(i),{score:i/12}));
  assert.deepEqual(selectReportHits(hits).map(h=>h.applicationId),['11','10','9','8','7']);
  assert.deepEqual(selectReportHits(hits,['0','7']).map(h=>h.applicationId),['7','0']);
  assert.equal(hits[0].applicationId,'0');
});
test('pre-search minimum avoids unnecessary details; state filter applies on normalized evidence without unsupported upstream parameters',async()=>{
  process.env.SOURCE_PROVIDER='inapi';process.env.INAPI_API_KEY='fixture-only';
  const dates={filed_at:'2026-01-01',published_at:null,registered_at:null,expires_at:null,last_changed_at:null};
  const mark=id=>({application_id:id,name:'Marca '+id,dates,holders:[],classes:[]});
  const calls=[];
  const fetcher=async(url,options)=>{
    calls.push(JSON.parse(options.body));
    if(url.endsWith('/search')) return Response.json({query:mark(1),results:[{...mark(2),score:.8,channels:{}},{...mark(3),score:.4,channels:{}}],candidate_count:2,elapsed_seconds:1});
    return Response.json({documents:[{...mark(2),registration_id:null,status:{code:'P',description:'Abandonado'},trademark:{sign_type:'Mixta'},events:[],annotations:[],representatives:[],source:{}}],application_ids_not_found:[]});
  };
  const result=await searchSimilar({name:'Marca',limit:100,minSimilarity:.5,states:['pending','registered']},undefined,fetcher);
  assert.equal(result.results.length,0);
  assert.deepEqual(calls[1].application_ids,[2]);
  assert.equal('states' in calls[0],false);assert.equal('minSimilarity' in calls[0],false);
  assert.equal(result.searchScope.retrieved,2);
});
