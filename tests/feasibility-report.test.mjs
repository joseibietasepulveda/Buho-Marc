import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { createFeasibilityReport } from '../lib/feasibility-report.ts';
import { feasibilityStatus, filterFeasibility } from '../lib/feasibility-policy.ts';
import { hiddenDiscoveryState, terminalState, canWatchPublication } from '../lib/watch-policy.ts';
import { matchesPublication, discoveryGroups, followedGroups } from '../lib/watch-list.ts';
import { applyVerifiedDecision } from '../lib/verified-decisions.ts';
import { reportRecommendation } from '../lib/feasibility-recommendation.ts';
const hit=(extra={})=>({ applicationId:'123',name:'Marca',status:'En Trámite',statusCode:'P',registrationId:null,type:'Mixta',image:'',holders:[],classes:[],filedAt:null,publishedAt:null,registeredAt:null,score:.75,channels:{name:{rank:1}},history:[],...extra });
test('watch feature flags hide final/registered states while allowing each visibility flag to change',()=>{
 for(const state of ['Registrada','Caducada','Vencida','Denegada','Rechazada definitivamente']) assert.equal(hiddenDiscoveryState(state),true,state);
 assert.equal(hiddenDiscoveryState('Registrada',{showRegistered:true,showLapsed:false,showExpired:false}),false);
 assert.equal(hiddenDiscoveryState('Caducada',{showRegistered:false,showLapsed:true,showExpired:false}),false);
 assert.equal(hiddenDiscoveryState('Vencida',{showRegistered:false,showLapsed:false,showExpired:true}),false);
 assert.equal(hiddenDiscoveryState('Recurso contra denegación'),false);
 assert.equal(terminalState('Recurso contra denegación'),false);
 assert.equal(canWatchPublication(hit({status:'Rechazada definitivamente'})),false);
});
test('publication filters are inclusive, distinguish unknown dates, and a date implies official publication',()=>{
 assert.equal(matchesPublication(hit(),{source:'inapi',from:'',to:''}),true);
 assert.equal(matchesPublication(hit(),{source:'official',from:'',to:''}),false);
 assert.equal(matchesPublication(hit({publishedAt:'2026-09-21'}),{source:'inapi',from:'2026-09-21',to:'2026-09-21'}),true);
 assert.equal(matchesPublication(hit({publishedAt:'2026-09-20'}),{source:'official',from:'2026-09-21',to:''}),false);
 assert.equal(matchesPublication(hit({publishedAt:'2026-09-22'}),{source:'official',from:'2026-09-22',to:'2026-09-21'}),false);
 const t={id:'1',name:'Propia',applicationId:'1',results:[hit({publishedAt:'2026-09-20'}),hit({applicationId:'124',reviewStatus:'En seguimiento'})]};
 assert.equal(discoveryGroups([t],'',{high:.6,medium:.3},{source:'inapi',from:'',to:''})[0].rows.length,0);
 assert.equal(followedGroups([t],'',{source:'official',from:'',to:''}).length,0);
});
test('LOLA correction is id-specific, nonmutating, idempotent, traceable and terminal',()=>{
 const original=hit({applicationId:'1367215',status:'*VER INSTANCIA'});
 const corrected=applyVerifiedDecision(original);
 assert.equal(original.status,'*VER INSTANCIA');
 assert.equal(corrected.status,'Rechazada definitivamente');
 assert.equal(corrected.officialDecision.firmAt,'2024-03-13');
 assert.equal(corrected.officialDecision.sourceStatus,'*VER INSTANCIA');
 assert.equal(applyVerifiedDecision(corrected).history.length,2);
 assert.equal(applyVerifiedDecision(hit({status:'*VER INSTANCIA'})).status,'*VER INSTANCIA');
 assert.equal(feasibilityStatus(corrected),'other');
});
test('ambiguous source code P is not confirmation that a request is pending',()=>{
 assert.equal(feasibilityStatus(hit({status:'*VER INSTANCIA'})),'other');
 assert.equal(feasibilityStatus(hit({status:'Registrada',statusCode:'R'})),'registered');
 assert.equal(feasibilityStatus(hit({status:'Estado no disponible'})),'other');
 assert.equal(feasibilityStatus(hit()),'pending');
 assert.equal(filterFeasibility([hit(),hit({status:'Caducada'})],'pending').length,1);
});
test('PDF generation supports empty filters, long text, Unicode, PNG image and all 50 results',async()=>{
 const proposal={name:'Marca de prueba',coverage:[{nice_class:30,text:'Caramelos'}],grouped:false};
 const result={query:hit(),results:Array.from({length:50},(_,i)=>hit({applicationId:String(i+1),name:'Ñandú Ácido 漢字 '+i,classes:[{nice_class:30,coverage_text:'Cobertura larga '.repeat(i===0?500:1)}]})),groups:[],warnings:['Revisión preliminar'],candidateCount:500,elapsedSeconds:1,fetchedAt:'2026-09-22T12:00:00Z'};
 for(const status of ['all','registered']){
  const bytes=await createFeasibilityReport({proposal,result,status,image:new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64')),imageType:'png'});
  const doc=await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(),2);assert.ok(bytes.length>1000);
 }
});
test('recommendations never infer clearance from an empty search and allow an explicit author choice',()=>{
 assert.equal(reportRecommendation({results:[]}).title,'Revisar las coincidencias antes de presentar');
 assert.match(reportRecommendation({results:[]}).explanation,/completar la revisión/);
 assert.equal(reportRecommendation({results:[hit()]}).title,reportRecommendation({results:[]}).title);
 assert.equal(reportRecommendation({results:[hit()]},'proceed','  Motivo del abogado.  ').explanation,'Motivo del abogado.');
 assert.equal(reportRecommendation({results:[hit()]},'proceed').title,'Proseguir con la solicitud');
});
test('report supports logo, optional full appendix and multipage author explanations',async()=>{
 const result={query:hit(),results:[hit({classes:[{nice_class:30,coverage_text:'Caramelos '.repeat(500)}]})],groups:[],warnings:[],candidateCount:1,elapsedSeconds:1,fetchedAt:'2026-09-22T12:00:00Z'};
 const {readFile}=await import('node:fs/promises');
 const bytes=await createFeasibilityReport({proposal:{name:'Marca',coverage:[],grouped:false},result,status:'all',studioLogo:await readFile('public/reports/studio-logo.png'),includeAppendix:true,explanation:'Texto de prueba. '.repeat(160)});
 assert.ok((await PDFDocument.load(bytes)).getPageCount()>3);
});
