import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { proposalSchema } from '../lib/similarity-contract.ts';
import { analysisClass, classOnlyResult, upsertClassAnalysis, requireReviewedConclusion } from '../lib/feasibility-study.ts';
import { conclusionInputSchema, validateModelConclusion } from '../lib/feasibility-conclusion.ts';
import { generateConclusion } from '../lib/openrouter-conclusion.ts';
import { EMPTY_REPORT_PROFILE } from '../lib/report-profile.ts';
import { createFeasibilityReport } from '../lib/feasibility-report.ts';
import { createFeasibilityDocx } from '../lib/feasibility-docx.ts';
import { searchSimilar } from '../lib/similarity-provider.ts';
import { localFeasibilityFixture } from '../lib/feasibility-local-fixture.ts';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const fixtureHit = (id, number=30) => ({applicationId:id,registrationId:null,name:`Ejemplo ${id}`,type:'Denominativa',image:'',holders:[{name:'Titular de prueba'}],classes:[{nice_class:number,coverage_text:number===30?'Confites':'Servicios de restaurante'}],filedAt:'2026-01-01',publishedAt:null,registeredAt:null,status:'En Trámite',statusCode:'P',score:.8,channels:{name:{rank:1}},history:[]});
export const fixtureResult = number => ({query:fixtureHit('',number),results:[fixtureHit('100'+number,number)],groups:[],warnings:[],candidateCount:1,elapsedSeconds:1,fetchedAt:'2026-10-09T12:00:00Z'});
const input = number => conclusionInputSchema.parse({proposal:{name:'Marca de prueba',niceClass:number,coverage:[{nice_class:number,text:number===30?'Confites':'Servicios de restaurante'}]},result:fixtureResult(number),selectedIds:['100'+number]});
const model = {decision:'moderate',recommendation:'review',paragraphs:['Se recomienda presentar con riesgo moderado por la proximidad de las denominaciones y sus productos. Conviene revisar la solicitud 10030 antes de presentar.'],evidenceApplicationIds:['10030']};
const config={apiKey:'fixture-key',model:'configured-fixture'};
test('local fixture is opt-in, class-filtered and unavailable to production or real sources',async()=>{
  const names=['BUHO_LOCAL_FEASIBILITY_FIXTURE','NODE_ENV','SOURCE_PROVIDER','APP_PUBLIC_ORIGIN'];
  const original=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  const directory=await mkdtemp(join(tmpdir(),'buho-study-'));
  try {
    const path=join(directory,'fixture.json'),result=fixtureResult(30);result.query.name='Marca de prueba';result.results.push(fixtureHit('10043',43));
    await writeFile(path,JSON.stringify(result));
    Object.assign(process.env,{BUHO_LOCAL_FEASIBILITY_FIXTURE:path,NODE_ENV:'development',SOURCE_PROVIDER:'simulated',APP_PUBLIC_ORIGIN:'http://127.0.0.1:3127'});
    const found=await localFeasibilityFixture(input(30).proposal);
    assert.equal(found.sourceType,'fixture');assert.deepEqual(found.results.map(hit=>hit.applicationId),['10030']);assert.equal(found.fetchedAt,result.fetchedAt);
    await assert.rejects(localFeasibilityFixture({...input(30).proposal,name:'Otra marca'}),/marca/);
    process.env.NODE_ENV='production';assert.equal(await localFeasibilityFixture(input(30).proposal),null);
    process.env.NODE_ENV='development';process.env.SOURCE_PROVIDER='inapi';assert.equal(await localFeasibilityFixture(input(30).proposal),null);
    process.env.SOURCE_PROVIDER='simulated';process.env.APP_PUBLIC_ORIGIN='https://dev.example.test';assert.equal(await localFeasibilityFixture(input(30).proposal),null);
  } finally {for(const name of names){if(original[name]===undefined)delete process.env[name];else process.env[name]=original[name];}await rm(directory,{recursive:true,force:true});}
});
test('class analysis requires exactly one matching class; existing general consumers remain compatible',()=>{
  assert.ok(proposalSchema.safeParse({name:'Prueba',niceClass:30,coverage:[{nice_class:30,text:''}]}).success);
  for(const coverage of [[],[{nice_class:43,text:''}],[{nice_class:30,text:''},{nice_class:43,text:''}]])assert.equal(proposalSchema.safeParse({niceClass:30,coverage}).success,false);
  assert.ok(proposalSchema.safeParse({coverage:[{nice_class:30,text:''},{nice_class:43,text:''}]}).success);
});
test('class filtering retains multiclasse marks, removes other classes and repairs groups without losing scope',()=>{
  const result=fixtureResult(30);result.results.push({...fixtureHit('4300',43)}, {...fixtureHit('3000',43),classes:[{nice_class:30},{nice_class:43}]});
  result.groups=[{representative_id:4300,member_ids:[4300,3000]}];result.searchScope={retrieved:3,limit:100,minSimilarity:0};
  const scoped=classOnlyResult(result,30);
  assert.deepEqual(scoped.results.map(hit=>hit.applicationId),['10030','3000']);assert.equal(scoped.groups[0].representative_id,3000);assert.equal(scoped.searchScope.retrieved,3);
  assert.equal(result.results.length,3);
});
test('source adapter filters by requested class before fetching dossiers and never sends an invented remote parameter',async()=>{
  const oldProvider=process.env.SOURCE_PROVIDER,oldKey=process.env.INAPI_API_KEY;process.env.SOURCE_PROVIDER='inapi';process.env.INAPI_API_KEY='fixture-key';
  const dates={filed_at:'2026-01-01',published_at:null,registered_at:null,expires_at:null,last_changed_at:null};
  const remote=number=>({application_id:10000+number,name:'Ejemplo',registration_id:null,sign_type:'Denominativa',holders:[{name:'Titular de prueba'}],classes:[{nice_class:number,coverage_text:'Cobertura'}],dates,score:.8,channels:{name:{rank:1}}});
  try {
    const result=await searchSimilar({name:'Prueba',niceClass:30,coverage:[{nice_class:30,text:'Confites'}],limit:100},undefined,async(url,options)=>{
      const body=JSON.parse(options.body);
      if(url.endsWith('/search')){assert.equal('niceClass' in body,false);return Response.json({query:remote(30),results:[remote(30),remote(43)],groups:[{representative_id:10043,member_ids:[10030,10043]}],candidate_count:2,elapsed_seconds:1});}
      assert.deepEqual(body.application_ids,[10030]);return Response.json({documents:[{...remote(30),status:{code:'ET',description:'En Trámite'},trademark:{sign_type:'Denominativa'},representatives:[],events:[],annotations:[],source:{}}],application_ids_not_found:[]});
    });
    assert.deepEqual(result.results.map(hit=>hit.applicationId),['10030']);assert.equal(result.searchScope.niceClass,30);assert.equal(result.groups[0].representative_id,10030);
  } finally {if(oldProvider===undefined)delete process.env.SOURCE_PROVIDER;else process.env.SOURCE_PROVIDER=oldProvider;if(oldKey===undefined)delete process.env.INAPI_API_KEY;else process.env.INAPI_API_KEY=oldKey;}
});
test('study replaces an edited class and preserves the other class and its conclusion',()=>{
  const first={...input(30),conclusion:{...model,title:'Recomendación',source:'openrouter'}};
  const second={...input(43)};
  const analyses=upsertClassAnalysis([first],second);assert.equal(analyses.length,2);
  const changed=upsertClassAnalysis(analyses,{...second,selectedIds:[]});assert.deepEqual(changed[0],first);assert.equal(changed.length,2);assert.equal(analysisClass(changed[1]),43);
  assert.throws(()=>upsertClassAnalysis(analyses,{...first,result:fixtureResult(43)}),/otra clase/);
});
test('OpenRouter receives only text, all class evidence and no deterministic recommendation as its starting conclusion',async()=>{
  const analysis=input(30);analysis.result.results.push({...fixtureHit('10031'),image:'data:image/png;base64,secret',sourceEvidence:{search:{image_url:'https://example.test/image',label_description:'Texto factual'}}});
  let calls=0;
  const generated=await generateConclusion(analysis,EMPTY_REPORT_PROFILE,config,async(url,options)=>{
    calls++;const request=JSON.parse(options.body),context=JSON.parse(request.messages[1].content);
    assert.equal(typeof request.messages[1].content,'string');assert.equal(context.search.results.length,2);assert.equal('deterministicAssessment' in context,false);assert.equal('image' in context.search.results[1],false);assert.equal('image_url' in context.search.results[1].sourceEvidence.search,false);
    assert.deepEqual(context.search.query.holders,[]);assert.deepEqual(context.search.query.classes,[{nice_class:30,coverage_text:'Confites'}]);assert.equal(context.search.query.name,'Marca de prueba');
    assert.ok(request.response_format.json_schema.schema.required.includes('decision'));
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(model)}}]});
  });
  assert.equal(calls,1);assert.equal(generated.conclusion.source,'openrouter');assert.equal(generated.conclusion.decision,'moderate');
});
test('class conclusions reject percentages, foreign evidence, inconsistent decisions and ungrounded empty-search availability',()=>{
  for(const output of [{...model,paragraphs:['Existe un 80% de riesgo al presentar.']},{...model,paragraphs:['Existe un ochenta por ciento de riesgo.']},{...model,evidenceApplicationIds:['999']},{...model,decision:'proceed'},{...model,decision:undefined}])assert.throws(()=>validateModelConclusion(output,input(30)));
  assert.throws(()=>validateModelConclusion({...model,decision:'proceed',recommendation:'proceed',evidenceApplicationIds:[]},{...input(30),result:{...fixtureResult(30),results:[]}}),/vacía/);
  assert.throws(()=>requireReviewedConclusion({source:'deterministic',title:'Revisar',paragraphs:[]}),/Prepara/);
  assert.equal(conclusionInputSchema.safeParse({...input(30),result:fixtureResult(43)}).success,false);
});
test('both writers include all classes, use prepared conclusions and refuse to export a provider failure',async()=>{
  const analyses=[30,43].map(number=>({...input(number),conclusion:validateModelConclusion({...model,evidenceApplicationIds:['100'+number],paragraphs:[`La conclusión de clase ${number} conserva los antecedentes de esta búsqueda y recomienda revisar sus coberturas antes de presentar.`]},input(number))}));
  const report={...input(30),status:'all',analyses,proposal:{...input(30).proposal,coverage:analyses.flatMap(item=>item.proposal.coverage)}};
  for(const layout of ['table','cards']){
    const bytes=await createFeasibilityReport({...report,layout});assert.ok((await PDFDocument.load(bytes)).getPageCount()>=1);
    const word=await createFeasibilityDocx({...report,layout});assert.ok(word.size>1000);
  }
  await assert.rejects(createFeasibilityReport({...report,analyses:[{...analyses[0],conclusion:undefined}]}),/Prepara/);
  await assert.rejects(createFeasibilityDocx({...report,analyses:[{...analyses[0],conclusion:{...analyses[0].conclusion,source:'deterministic'}}]}),/Prepara/);
});
