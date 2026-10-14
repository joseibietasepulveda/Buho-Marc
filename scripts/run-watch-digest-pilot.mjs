// Paid pilot only after explicit user authorization. Never part of QA/startup.
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';import {homedir} from 'node:os';import {parseEnv} from 'node:util';import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {pilotCurlFetcher} from './watch-digest-pilot-curl.mjs';
import {evaluateDigestGlm,GlmProviderError} from '../lib/watch-digest-glm.ts';
import {eligibleDigestCandidate,digestHash,DIGEST_MIN_SCORE,DIGEST_PROMPT_VERSION,DIGEST_MODEL} from '../lib/watch-digest.ts';
import {applyVerifiedDecision} from '../lib/verified-decisions.ts';
import {digestMarkImage} from '../lib/watch-digest-images.ts';
const arg=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
if(!process.argv.includes('--authorized'))throw new Error('El piloto pagado necesita autorización explícita; no usar para QA');
const dir=path.resolve(arg('--directory','outputs/watch-digest-pilot-2026-10-13'));
const keyPath=arg('--key-file');
const key=process.env.OPENROUTER_WATCH_API_KEY || (keyPath ? parseEnv(await readFile(keyPath,'utf8')).OPENROUTER_API_KEY?.trim() : '');
if(!key)throw new Error('Falta clave exclusiva para el experimento');
const selection=JSON.parse(await readFile(path.join(dir,'selection.private.json'),'utf8'));
const rows=JSON.parse(await readFile(path.join(dir,'crosses.private.json'),'utf8'));const byId=new Map(rows.map(r=>[r.id,r]));
const groups=selection.groups.map(g=>({id:g.id,candidates:g.candidates.map(c=>{
 const row=byId.get(c.matchId);if(!row)throw new Error('Falta evidencia guardada');
 const candidate=applyVerifiedDecision({...row.evidence.hit,reviewStatus:row.review_status,legalDeadline:row.legal_deadline});
 const cross={id:row.public_code,matchId:row.id,brandId:row.brand_id,reference:row.evidence.query,candidate,score:candidate.score,fetchedAt:row.evidence.fetchedAt};
 if(!eligibleDigestCandidate(cross,'2026-10-13')||!(cross.score>=DIGEST_MIN_SCORE&&cross.score<=1))throw new Error('El estado o puntaje cambió: no sustituir por En trámite');return cross;
})}));
if(groups.length>30||groups.some(g=>g.candidates.length>5)||groups.reduce((n,g)=>n+g.candidates.length,0)>150)throw new Error('El piloto excede límites aprobados');
const ledgerFile=path.join(dir,'ledger.private.json');let ledger=[];try{ledger=JSON.parse(await readFile(ledgerFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const manifest={model:DIGEST_MODEL,promptVersion:DIGEST_PROMPT_VERSION,sourceHash:digestHash(groups),selectionHash:digestHash(selection),budget:.10,groups:groups.length,crosses:groups.reduce((n,g)=>n+g.candidates.length,0)};
const manifestFile=path.join(dir,'manifest.json');try{const existing=JSON.parse(await readFile(manifestFile,'utf8'));if(digestHash(existing)!==digestHash(manifest))throw new Error('No cambiar muestra/prompt al reanudar piloto');}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(manifestFile,JSON.stringify(manifest,null,2),{mode:0o600});}
const spent=()=>ledger.reduce((n,c)=>n+(c.result?.cost??c.reserve),0);
const writeLedger=()=>writeFile(ledgerFile,JSON.stringify(ledger,null,2),{mode:0o600});
const accounting={lookup:async hash=>{const r=ledger.findLast(c=>c.requestHash===hash);if((r?.result?.definitelyNotSent||r?.result?.reconciledNoCharge)&&process.argv.includes('--resume-outage'))return null;return r ? r.result??{error:'Intento interrumpido; cargo sin confirmar'} : null;},reserve:async(amount,hash)=>{
 if(spent()+amount>.10)throw new Error('BUDGET: se alcanzó el máximo aprobado de US$0,10');
 const id=randomUUID();ledger.push({id,requestHash:hash,reserve:amount,startedAt:new Date().toISOString()});await writeLedger();return id;
},record:async(id,result)=>{const row=ledger.findLast(r=>r.id===id);row.result=result;row.completedAt=new Date().toISOString();await writeLedger();}};
const apiFetch=process.argv.includes('--curl')?pilotCurlFetcher(dir):fetch;
const keyCheck=async()=>{const r=await apiFetch('https://openrouter.ai/api/v1/key',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(20000)});const raw=await r.json();if(!r.ok)throw new Error(`OpenRouter auth HTTP ${r.status}`);return {usage:raw.data.usage,remaining:raw.data.limit_remaining};};
if(ledger.some(c=>c.result?.cost===undefined))throw new Error('Hay cargos pendientes de confirmar. Conciliar OpenRouter antes de reanudar; no repetir llamadas inciertas.');
const starting=await keyCheck();if(!(starting.remaining>.10))throw new Error('Saldo menor que presupuesto aprobado');
const startFile=path.join(dir,'key-start.json');try{await stat(startFile);}catch{await writeFile(startFile,JSON.stringify({at:new Date().toISOString(),...starting},null,2),{mode:0o600});}
const originalStarting=JSON.parse(await readFile(startFile,'utf8'));
const imageDir=path.join(dir,'images');await mkdir(imageDir,{recursive:true});const imageMemo=new Map();
async function image(mark) {
 if(imageMemo.has(mark.applicationId))return imageMemo.get(mark.applicationId);
 const savedFile=path.join(imageDir,mark.applicationId+'.json');let result=null;
 try { result=JSON.parse(await readFile(savedFile,'utf8')); }
 catch(e){if(e.code!=='ENOENT')throw e;
  let source=mark.image||'';if(source.startsWith('/'))source=new URL(source,'https://buho-marc-web-dev.up.railway.app').searchParams.get('source')||'';
  const hash=createHash('sha256').update(source).digest('hex');
  for(const ext of ['jpg','png','webp','jpeg'])try{
   const bytes=await readFile(path.join(homedir(),'.cache/monitoreador-logos/review-images',hash+'.'+ext));
   const content=(await sharp(bytes,{limitInputPixels:20000000}).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:85}).toBuffer()).toString('base64');
   result={key:digestHash(content),content};break;
  }catch{/* Try the stored source URL only; no dossier/search fallback. */}
  if(!result)try{result=await digestMarkImage(mark,selection.organizationId);}catch{result=null;}
  await writeFile(savedFile,JSON.stringify(result),{mode:0o600});
 }
 imageMemo.set(mark.applicationId,result);return result;
}
const outputFile=path.join(dir,'results.private.json');let results=[];try{results=JSON.parse(await readFile(outputFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const group of groups){
 const previous=results.find(r=>r.brandId===group.id);
 if(previous?.crosses || previous && !process.argv.includes('--resume-outage'))continue;
 if(previous)results=results.filter(r=>r.brandId!==group.id);
 const marks=[...new Map([group.candidates[0].reference,...group.candidates.map(c=>c.candidate)].map(m=>[m.applicationId,m])).values()];
 const loaded=await Promise.all(marks.map(async mark=>{const i=await image(mark);return i?{...i,markId:mark.applicationId}:null;}));const images=loaded.filter(Boolean);
 try {
  const decisions=await evaluateDigestGlm(group.candidates,images,key,accounting,apiFetch);
  const crosses=group.candidates.map((c,n)=>({...c,decision:decisions[n],reason:decisions[n].reason,insufficient:decisions[n].insufficient,referenceImage:images.find(i=>i.markId===c.reference.applicationId)?.key,candidateImage:images.find(i=>i.markId===c.candidate.applicationId)?.key}));
  results.push({brandId:group.id,crosses,images:images.map(i=>({key:i.key,markId:i.markId})),at:new Date().toISOString()});
 }catch(e){if(e.message.includes('BUDGET')){console.info(JSON.stringify({budgetStop:true,chargedOrReserved:spent()}));break;}results.push({brandId:group.id,error:e.message,at:new Date().toISOString()});if(e instanceof GlmProviderError){await writeFile(outputFile,JSON.stringify(results,null,2),{mode:0o600});console.info(JSON.stringify({providerUnavailable:true,chargedOrReserved:spent()}));break;}}
 await writeFile(outputFile,JSON.stringify(results,null,2),{mode:0o600});console.info(JSON.stringify({completed:results.length,brands:groups.length,evaluated:results.reduce((n,r)=>n+(r.crosses?.length||0),0),shown:results.flatMap(r=>r.crosses||[]).filter(c=>c.decision.show).length,chargedOrReserved:spent(),calls:ledger.length}));
}
let ending=null;try{ending=await keyCheck();}catch{/* Preserve the completed pilot when the network is unavailable. */}
if(ending)await writeFile(path.join(dir,'key-end.json'),JSON.stringify({at:new Date().toISOString(),...ending},null,2),{mode:0o600});
const summary={...manifest,completed:results.filter(r=>r.crosses).length,evaluated:results.reduce((n,r)=>n+(r.crosses?.length||0),0),shown:results.flatMap(r=>r.crosses||[]).filter(c=>c.decision.show).length,failedGroups:results.filter(r=>r.error).length,calls:ledger.length,knownCost:ledger.reduce((n,r)=>n+(r.result?.cost??0),0),unconfirmedReserve:ledger.reduce((n,r)=>n+(r.result?.cost===undefined?r.reserve:0),0),keyUsageDelta:ending ? ending.usage-originalStarting.usage : null,noEmailSent:true};
await writeFile(path.join(dir,'summary.json'),JSON.stringify(summary,null,2),{mode:0o600});console.info(JSON.stringify(summary));
