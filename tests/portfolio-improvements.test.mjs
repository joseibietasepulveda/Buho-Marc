import { registrationDeadlines, procedureContext } from '../lib/registration-procedure.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { relatedClassOptions, searchClasses } from '../lib/nice-related.ts';
import { normalizedRut, representativeForPortfolio, recordParties } from '../lib/portfolio-parties.ts';
import { applyManualPayment, paymentActKey, paymentKind } from '../lib/registration-payment.ts';
import { renewalReminder } from '../lib/renewal-reminder.ts';
import { selectDigestCandidates } from '../lib/watch-digest.ts';
import { discoveryGroups } from '../lib/watch-list.ts';
import { watchPage } from '../lib/watch-page.ts';
import { belongsToClient } from '../lib/client-directory.ts';
import { discoverRepresentativePage } from '../lib/portfolio-discovery.ts';

test('official linked classes are conditional, selectable and do not restrict an empty search',()=>{
 assert.deepEqual(searchClasses({coverage:[],includeRelatedClasses:true,relatedClasses:[8]}),[]);
 assert.ok(relatedClassOptions([7]).some(c=>c.number===8));assert.ok(!relatedClassOptions([7]).some(c=>c.number===9));
 assert.deepEqual(searchClasses({coverage:[{nice_class:7}],includeRelatedClasses:true,relatedClasses:[8,8,9]}),[7,8]);
 assert.deepEqual(searchClasses({coverage:[{nice_class:7}],includeRelatedClasses:false,relatedClasses:[8]}),[7]);
 assert.ok(relatedClassOptions([8]).some(c=>c.number===7));
});
test('representative mode counts distinct own marks, excludes holders and third parties and refuses ties',()=>{
 const record=(applicationNumber,rut)=>({applicationNumber,owner:'Titular',ownerRut:'11.111.111-1',inapi:{representatives:[{name:'Estudio',rut,dv:'K'}]}});
 const records=[{record:record('1','12345678')},{record:record('1','12345678')},{record:record('2','12345678')},{record:record('3','87654321')},...Array.from({length:8},(_,i)=>({record:record(String(i+4),'87654321'),portfolioRole:'third-party'}))];
 assert.deepEqual(representativeForPortfolio(records),{reason:'selected',rut:'12345678-K',count:2});
 assert.equal(representativeForPortfolio([records[0],records[3]]).reason,'tied');
 assert.equal(representativeForPortfolio([{record:{applicationNumber:'1',ownerRut:'11111111-1'}}]).reason,'missing');
 assert.equal(normalizedRut('12.345.678-k'),'12345678-K');
 assert.equal(recordParties({owner:'No informado'},'holders').length,0);
});
test('manual payment applies to its exact act, survives stale source, is revocable and reconciles later',()=>{
 const a={applicationNumber:'120',history:[],filedAt:'2026-01-01',statusId:'accepted-payment',officialDeadline:'2026-11-01',procedure:{sourceActDate:'2026-10-01',sourceActId:'10',sourceActDescription:'Aceptación a registro'}};
 const payment={id:'pay',kind:'final',actKey:paymentActKey(a),recordedAt:'2026-10-15T12:00:00Z',recordedBy:'test'};
 const paid=applyManualPayment({...a,manualPayments:[payment]});assert.equal(paid.statusId,'payment-verification');assert.equal(paid.manualPayment.state,'pending');assert.equal(paid.procedure.paymentAccreditedAt,undefined);
 assert.deepEqual(applyManualPayment(paid),paid);assert.ok(registrationDeadlines(paid).every(d=>!d.label.includes('acreditado')));assert.match(procedureContext(paid),/confirmación de INAPI sigue pendiente/);assert.equal(a.statusId,'accepted-payment');
 assert.equal(applyManualPayment({...a,manualPayments:[{...payment,revokedAt:'2026-10-16'}]}).statusId,'accepted-payment');
 const changed=applyManualPayment({...a,procedure:{...a.procedure,sourceActId:'11'},manualPayments:[payment]});assert.equal(changed.statusId,'accepted-payment');assert.equal(changed.manualPayment,undefined);
 const confirmed=applyManualPayment({...a,statusId:'registered',manualPayments:[payment]});assert.equal(confirmed.manualPayment.state,'confirmed');assert.equal(confirmed.statusId,'registered');
 assert.equal(paymentKind({...a,statusId:'form-observation'}),undefined);
 assert.equal(applyManualPayment({...a,statusId:'accepted-publication',manualPayments:[{...payment,kind:'publication'}]}).statusId,'publication-pending');
});
test('four renewal milestones use calendar boundaries and catch up with only the most urgent one',()=>{
 const record={provider:'inapi',status:'registered',name:'Ejemplo',applicationNumber:'1',registrationNumber:'2',registrationDate:'2017-10-31',expirationDate:'2027-10-31'};
 for(const [today,expected] of [['2026-10-30',undefined],['2026-10-31','1y'],['2027-04-30','6m'],['2027-09-30','1m'],['2027-10-24','7d'],['2027-10-31','7d'],['2027-11-01',undefined]])assert.equal(renewalReminder(record,today)?.milestone,expected,today);
});
test('50 best first crosses select only their two best matches, including score below 25%',()=>{
 const make=(b,n)=>({id:`${b}:${n}`,matchId:`${b}:${n}`,brandId:String(b),score:1-b/100-n/10000,reference:{applicationId:`own${b}`,status:'Registrada'},candidate:{applicationId:`other${b}:${n}`,status:'En Trámite',history:[]}});
 const stock=Array.from({length:70},(_,b)=>Array.from({length:6},(_,n)=>make(b,n))).flat().reverse();
 const result=selectDigestCandidates(stock,10000,new Date('2026-10-15T12:00:00Z'));assert.equal(result.selected.length,100);assert.equal(new Set(result.selected.map(c=>c.brandId)).size,50);
 assert.deepEqual(result.selected.slice(0,4).map(c=>c.id),['0:0','0:1','1:0','1:1']);assert.ok(!result.selected.some(c=>Number(c.brandId)>=50));
 assert.equal(selectDigestCandidates([{...make(0,0),score:.1}],100,new Date()).selected.length,1);
});
test('AI positive overrides threshold and commercial heuristic; negative hides; pagination never mixes lower priorities first',()=>{
 const hit=(id,score,aiDecision)=>({applicationId:id,score,aiDecision,name:id,holders:[],classes:[],status:'En Trámite',commercialRelevance:'unrelated'});
 const target={id:'a',name:'Own',applicationId:'own',paused:false,results:[hit('recommended',.1,{show:true,reason:'Relacionada'}),hit('negative',.99,{show:false,reason:'Distinta'}),{...hit('pending',.8),commercialRelevance:'related'}],savedResults:[],warnings:[]};
 const groups=discoveryGroups([target],'',{high:1,medium:.5});assert.deepEqual(groups.map(g=>g.rows.flatMap(r=>r.hits.map(h=>h.applicationId))),[['recommended'],['pending']]);
 const page=watchPage({targets:[target],settings:{high:1,medium:.5},configured:true,automaticEnabled:false},new URLSearchParams({groups:'1'}));assert.equal(page.count,2);assert.equal(page.groups[0].rows.length,1);assert.equal(page.groups[1].rows.length,0);
});
test('all coholders see a brand and third-party marks never enter the client portfolio',()=>{
 const brand={id:'1',name:'Marca',provider:'inapi',clientId:'CL-01',clientIds:['CL-02','CL-03']};
 assert.ok(['CL-01','CL-02','CL-03'].every(id=>belongsToClient(brand,id)));assert.equal(belongsToClient({...brand,portfolioRole:'third-party'},'CL-02'),false);
});
test('daily discovery requests one lean page with representative role and exact normalized match',async()=>{
 process.env.INAPI_API_KEY='fixture-only';let count=0;
 const result=await discoverRepresentativePage('12345678-K',100,async(url,options)=>{count++;assert.deepEqual(JSON.parse(options.body),{rut:'12345678-K',role:'representative',limit:100,offset:100});return Response.json({total_count:102,results:[{application_id:1,matched_parties:[{role:'representative',rut:'12.345.678',dv:'K'}]},{application_id:2,matched_parties:[{role:'holder',rut:'12345678',dv:'K'}]}]});});
 assert.equal(count,1);assert.deepEqual(result.ids,['1']);assert.equal(result.complete,true);
});
