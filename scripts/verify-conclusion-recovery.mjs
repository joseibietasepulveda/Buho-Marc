// QA de persistencia sobre una instancia local explícita; proveedor completamente simulado.
import assert from 'node:assert/strict';
import {getSql} from '../db/index.ts';
import {prepareConclusion} from '../db/feasibility-conclusions.ts';
import {conclusionInputSchema} from '../lib/feasibility-conclusion.ts';
const hit=number=>({applicationId:String(90000+number),registrationId:null,name:'Antecedente ficticio',type:'Denominativa',image:'',holders:[{name:'Titular de prueba'}],classes:[{nice_class:number,coverage_text:'Cobertura ficticia'}],filedAt:null,publishedAt:null,registeredAt:null,status:'En Trámite',statusCode:'P',score:.8,channels:{},history:[]});
const input=number=>conclusionInputSchema.parse({proposal:{name:'QA recuperación '+Date.now(),niceClass:number,coverage:[{nice_class:number,text:'Cobertura ficticia'}]},result:{query:hit(number),results:[hit(number)],groups:[],warnings:[],candidateCount:1,elapsedSeconds:0,fetchedAt:'2026-10-13T12:00:00Z'},selectedIds:[String(90000+number)]});
const databaseUrl=new URL(process.env.BUHO_CONCLUSION_QA_DATABASE_URL||'');
if(databaseUrl.hostname!=='127.0.0.1'||databaseUrl.pathname!=='/buho_local')throw new Error('La verificación requiere la base local aislada buho_local en 127.0.0.1');
process.env.DATABASE_URL=databaseUrl.href;
const original=globalThis.fetch;
process.env.OPENROUTER_API_KEY='fixture-key';
let calls=0;
try {
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');calls++;
  const ctx=JSON.parse(JSON.parse(options.body).messages[1].content);
  const output={decision:'moderate',recommendation:'review',paragraphs:['Los antecedentes seleccionados requieren comparar las coberturas concretas de esta clase.'],evidenceApplicationIds:calls===2?['unknown']:ctx.selection.detailedApplicationIds};
  return Response.json({id:'isolated-'+calls,usage:{prompt_tokens:10,completion_tokens:10,cost:.0001},choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});
 };
 const firstInput=input(30),secondInput=input(29);
 const first=await prepareConclusion(firstInput),snapshot=JSON.stringify(first.conclusion);
 const second=await prepareConclusion(secondInput);
 assert.equal(calls,3);assert.equal(second.conclusion.generationAttempts,2);assert.equal(second.conclusion.source,'openrouter');
 assert.equal(JSON.stringify(first.conclusion),snapshot);
 const cachedFirst=await prepareConclusion(firstInput),cachedSecond=await prepareConclusion(secondInput);
 assert.equal(calls,3);assert.equal(cachedFirst.conclusion.generationId,first.conclusion.generationId);assert.equal(cachedSecond.conclusion.generationId,second.conclusion.generationId);
 const [row]=await getSql()`SELECT output,usage,cost,provider_id FROM feasibility_conclusions WHERE id=${second.conclusion.generationId}`;
 assert.equal(row.output.generationAttempts,2);assert.equal(row.usage.attempts[0].failureCode,'foreign_evidence');assert.equal(Number(row.cost),.0002);assert.equal(row.provider_id,'isolated-3');
 console.log('PostgreSQL local: dos clases independientes, recuperación, metadatos/costo de ambos intentos y caché aprobados; tres llamadas simuladas.');
}finally{globalThis.fetch=original;await getSql().end();}
