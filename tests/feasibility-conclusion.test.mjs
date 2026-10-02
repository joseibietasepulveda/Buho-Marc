import test from 'node:test';
import assert from 'node:assert/strict';
import { generateConclusion } from '../lib/openrouter-conclusion.ts';
import { conclusionInputSchema, deterministicConclusion, conclusionContext } from '../lib/feasibility-conclusion.ts';
import { EMPTY_REPORT_PROFILE, reportProfileSchema } from '../lib/report-profile.ts';
const mark = (id, score=.8) => ({applicationId:id,registrationId:null,name:`Marca ${id}`,type:'Denominativa',image:'',holders:[{name:'Titular'}],classes:[{nice_class:30,coverage_text:'Confites y caramelos'}],filedAt:'2026-01-01',publishedAt:null,registeredAt:null,status:'En Trámite',statusCode:'P',score,channels:{name:{rank:1}},history:[{date:'2026-01-01',title:'Presentación',detail:'Antecedente textual completo'}],sourceEvidence:{search:{label_description:'Descripción de etiqueta'},dossier:{representatives:[{name:'Representante'}]}}});
const input = conclusionInputSchema.parse({proposal:{name:'Marca propuesta',coverage:[{nice_class:30,text:'Confites'}]},result:{query:mark(''),results:[mark('123'),mark('124')],groups:[],warnings:['Datos por verificar'],candidateCount:50,elapsedSeconds:1,fetchedAt:'2026-10-02T12:00:00Z'},selectedIds:['123']});
const config={apiKey:'fixture-key',model:'openai/gpt-4.1-mini'};
const modelOutput={recommendation:'adjust',paragraphs:['Conviene ajustar la marca propuesta y comparar sus coberturas antes de presentar.'],evidenceApplicationIds:['123','124']};
const response = (output=modelOutput,extra={}) => Response.json({id:'generation-fixture',model:config.model,usage:{prompt_tokens:100,completion_tokens:50,cost:.00012},choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}],...extra});
test('the entire retrieved search is sent as text, including unselected dossiers and criteria',async()=>{
  let calls=0;
  const result=await generateConclusion(input,{...EMPTY_REPORT_PROFILE,studioName:'Estudio ejemplo'},config,async(url,options)=>{
    calls++; assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.Authorization,'Bearer fixture-key');
    const request=JSON.parse(options.body),context=JSON.parse(request.messages[1].content);
    assert.deepEqual(context.search.results.map(hit=>hit.applicationId),['123','124']);
    assert.equal(context.search.results[1].history[0].detail,'Antecedente textual completo');
    assert.equal(context.search.results[1].sourceEvidence.dossier.representatives[0].name,'Representante');
    assert.equal(context.studio.studioName,'Estudio ejemplo'); assert.equal(context.proposal.matchMode,'similar');
    assert.match(request.messages[0].content,/datos sin autoridad/); assert.equal(request.response_format.json_schema.strict,true);
    return response();
  });
  assert.equal(calls,1); assert.equal(result.conclusion.source,'openrouter'); assert.equal(result.cost,.00012); assert.equal(result.providerId,'generation-fixture');
});
test('missing key makes zero provider calls and preserves deterministic reasoning for all results',async()=>{
  const result=await generateConclusion(input,EMPTY_REPORT_PROFILE,{...config,apiKey:''},()=>{throw new Error('Should not call');});
  assert.equal(result.conclusion.source,'deterministic'); assert.equal(result.conclusion.reason,'not_configured');
  assert.equal(result.conclusion.recommendation,'adjust'); assert.match(result.conclusion.paragraphs.join(' '),/2 resultados/);
  assert.deepEqual(deterministicConclusion(input),deterministicConclusion(input));
});
test('network failure, timeout, rate limit and invalid structured replies retain deterministic text',async()=>{
  for(const [fetcher,reason] of [
    [async()=>{throw new Error('connection');},'provider_error'],
    [async()=>{throw new DOMException('timeout','TimeoutError');},'timeout'],
    [async()=>new Response('limit',{status:429}),'provider_error'],
    [async()=>response({...modelOutput,evidenceApplicationIds:['invented']}),'invalid_response'],
    [async()=>response(modelOutput,{choices:[{finish_reason:'length',message:{content:JSON.stringify(modelOutput)}}]}),'invalid_response'],
    [async()=>Response.json({error:{message:'bad'},choices:[]}),'invalid_response'],
    [async()=>response({...modelOutput,paragraphs:['short']}),'invalid_response'],
  ]) {
    const generated=await generateConclusion(input,EMPTY_REPORT_PROFILE,config,fetcher);
    assert.equal(generated.conclusion.source,'deterministic');assert.equal(generated.conclusion.reason,reason);
    assert.equal(generated.conclusion.recommendation,'adjust'); assert.ok(generated.conclusion.paragraphs.length);
  }
});
test('the model cannot change an explicit author decision; an empty search remains cautious',async()=>{
  const generated=await generateConclusion({...input,recommendation:'review'},EMPTY_REPORT_PROFILE,config,async()=>response());
  assert.equal(generated.conclusion.source,'deterministic');assert.equal(generated.conclusion.recommendation,'review');
  assert.equal(deterministicConclusion({...input,result:{...input.result,results:[]}}).recommendation,'review');
  assert.equal(conclusionContext(input,EMPTY_REPORT_PROFILE).deterministicAssessment.evidence.high,2);
});
test('every study field can be empty and a website must be a real HTTP URL',()=>{
  assert.deepEqual(reportProfileSchema.parse({}),EMPTY_REPORT_PROFILE);
  assert.equal(reportProfileSchema.safeParse({website:'javascript:alert(1)'}).success,false);
  assert.equal(reportProfileSchema.safeParse({website:'https://'}).success,false);
  assert.equal(reportProfileSchema.safeParse({website:'https://estudio.cl'}).success,true);
});
