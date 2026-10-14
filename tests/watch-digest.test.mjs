import test from 'node:test';
import assert from 'node:assert/strict';
import {cross,mark,payload,decision} from './fixtures/watch-digest.mjs';
import {digestAgenda,eligibleDigestCandidate,selectDigestCandidates,latestDigestSlot,nextDigestSlot,digestConfigurationProblems,digestConfig} from '../lib/watch-digest.ts';
import {digestEmail} from '../lib/watch-digest-email.ts';
import {buildDigestGlmRequest,parseDigestDecisions,evaluateDigestGlm,GlmProviderError} from '../lib/watch-digest-glm.ts';
import {sendResendEmail,ResendDeliveryError} from '../lib/resend-email.ts';
import {digestMarkImage} from '../lib/watch-digest-images.ts';
import {digestReadOrganization} from '../lib/watch-digest-access.ts';
import {runAs} from '../lib/tenant-context.ts';

test('Monday 08:30 in winter/summer and missed-slot boundary',()=>{
 assert.equal(latestDigestSlot(new Date('2026-06-01T12:30:00Z')).instant,'2026-06-01T12:30:00.000Z');
 assert.equal(latestDigestSlot(new Date('2026-10-12T11:30:00Z')).instant,'2026-10-12T11:30:00.000Z');
 assert.equal(latestDigestSlot(new Date('2026-10-12T11:29:59Z')).day,'2026-10-05');
 assert.equal(nextDigestSlot(new Date('2026-10-12T11:30:00Z')),'2026-10-19T11:30:00.000Z');
});
test('14 calendar days, deduplication and no institutional or completed informational milestones',()=>{
 const event=(id,date,extra={})=>({id,date,category:'task',title:id,entityType:'case',entityId:'CA-1',context:'ALBA',...extra});
 assert.deepEqual(digestAgenda([event('start','2026-10-13'),event('last','2026-10-26'),event('outside','2026-10-27'),event('yesterday','2026-10-12'),event('nodate',null),event('institutional','2026-10-15',{institutional:true}),event('info','2026-10-15',{informational:true}),event('start','2026-10-13')],new Date('2026-10-13T12:00:00Z')).map(e=>e.id),['start','last']);
});
test('eligibility excludes ended opposition windows, registered, dismissed, own pair and official terminal evidence',()=>{
 const c=cross();assert.equal(eligibleDigestCandidate(c,'2026-10-13'),true);
 for(const status of ['Registrada','Caducada','Rechazada definitivamente']) assert.equal(eligibleDigestCandidate({...c,candidate:{...c.candidate,status}},'2026-10-13'),false,status);
 assert.equal(eligibleDigestCandidate({...c,candidate:{...c.candidate,publishedAt:'2025-01-02'}},'2026-10-13'),false);
 assert.equal(eligibleDigestCandidate({...c,candidate:{...c.candidate,reviewStatus:'Descartada'}},'2026-10-13'),false);
 assert.equal(eligibleDigestCandidate({...c,candidate:{...c.candidate,applicationId:c.reference.applicationId}},'2026-10-13'),false);
 assert.equal(eligibleDigestCandidate({...c,candidate:{...c.candidate,officialDecision:{status:'Rechazada definitivamente'}}},'2026-10-13'),false);
});
test('hard 150 across marks, 5 per mark, score gate includes exactly 25%',()=>{
 const stock=Array.from({length:30},(_,b)=>Array.from({length:12},(_,n)=>cross(100*b+n,`brand-${b}`,{score:n===0 ? .2499 : .25+n/100}))).flat();
 const {selected,available,filteredLowScore}=selectDigestCandidates(stock,150,new Date('2026-10-13T12:00:00Z'));
 assert.equal(available,330);assert.equal(filteredLowScore,30);assert.equal(selected.length,150);assert.equal(new Set(selected.map(c=>c.brandId)).size,30);
 assert.ok(selected.every(c=>c.score>=.25));
 assert.equal(Math.max(...[...new Set(selected.map(c=>c.brandId))].map(b=>selected.filter(c=>c.brandId===b).length)),5);
});
test('full coverages, images once per reference, no source score or holder and explicit missing image',()=>{
 const candidates=[cross(1),cross(2)];candidates[0].reference.classes[0].coverage_text='Cobertura completa '.repeat(200);
 const request=buildDigestGlmRequest(candidates,[{markId:candidates[0].reference.applicationId,key:'x',content:'aW1hZ2U='}]);
 const content=request.body.messages[1].content;assert.equal(content.filter(p=>p.type==='image_url').length,1);
 assert.ok(content[0].text.includes('Cobertura completa '.repeat(200)));assert.ok(!content[0].text.includes('score'));
 assert.equal(request.body.provider.allow_fallbacks,false);assert.equal(request.body.model,'z-ai/glm-5.3-flash');assert.ok(request.reserve>0);
 assert.throws(()=>buildDigestGlmRequest([cross(1),cross(2,'other')],[]));
});
test('strict identity and coherent outputs, arbitrary output order mapped to input',()=>{
 assert.deepEqual(parseDigestDecisions(JSON.stringify({decisions:[decision('b'),decision('a',false)]}),['a','b']).map(d=>d.show),[false,true]);
 assert.throws(()=>parseDigestDecisions(JSON.stringify({decisions:[decision('a'),decision('a')]}),['a','b']));
 assert.throws(()=>parseDigestDecisions(JSON.stringify({decisions:[{...decision('a'),coverage_relation:'unrelated'}]}),['a']));
 assert.throws(()=>parseDigestDecisions(JSON.stringify({decisions:[{...decision('a'),coverage_relation:'uncertain'}]}),['a']));
});
test('invalid paid output recorded, single bounded corrective retry, unknown costs remain unknown and recoverable',async()=>{
 const records=[],reserves=[];let calls=0;
 const accounting={reserve:async(n,hash)=>{reserves.push({n,hash});return String(reserves.length);},record:async(id,r)=>records.push({id,r})};
 const fetcher=async()=>{calls++;return Response.json({id:`call-${calls}`,usage:calls===1?{}:{cost:.001},choices:[{finish_reason:'stop',message:{content:calls===1?'{}':JSON.stringify({decisions:[decision('CO-1')]})}}]});};
 assert.equal((await evaluateDigestGlm([cross()],[],'fake',accounting,fetcher))[0].show,true);
 assert.equal(calls,2);assert.equal(records[0].r.cost,undefined);assert.equal(records[1].r.cost,.001);assert.notEqual(reserves[0].hash,reserves[1].hash);
 const saved={...accounting,lookup:async()=>records[1].r};
 await evaluateDigestGlm([cross()],[],'fake',saved,()=>{throw new Error('recovery must not call');});assert.equal(calls,2);
});
test('email caps 8+8, exact remainder links, empty variant, escaping and CID images',()=>{
 const data=payload();data.crosses[0].reference.name='<script>evil</script>';
 data.crosses[0].referenceImage='image-key';const email=digestEmail(data,'https://app.example',[{key:'image-key',content:'aGVsbG8='}]);
 assert.equal((email.html.match(/Ver comparación completa/g)||[]).length,8);assert.ok(email.html.includes('Hay 2 coincidencias más'));assert.ok(email.html.includes('Hay 2 gestiones más'));
 assert.ok(email.html.includes('https://app.example/app/resumen-semanal?run='));assert.ok(!email.html.includes('<script>evil'));
 assert.ok(email.html.includes('cid:image-key'));assert.equal(email.attachments[0].content_id,'image-key');
 assert.ok(!email.html.includes('GLM'));assert.ok(digestEmail(payload({crosses:[],agenda:[]}), 'https://app.example').html.includes('no se seleccionaron'));
 assert.match(digestEmail(payload({sourceReviewedAt:'2026-10-14T01:00:00Z'}),'https://app.example').html,/Última revisión de vigilancia guardada: 13 /,'timestamps use Chile’s day while calendar deadlines preserve their date');
});
test('Resend recipient is locked, same idempotency/body replay, transient uncertainty without secrets',async()=>{
 const email={from:'Buho Marc <hola@rcirculo.com>',to:['hola@rcirculo.com'],reply_to:'hola@rcirculo.com',...digestEmail(payload(),'https://app.example')};const seen=[];
 const fetcher=async(url,init)=>{seen.push(init);return Response.json({id:'email-1'});};
 await sendResendEmail(email,'fake','same-key',fetcher);await sendResendEmail(email,'fake','same-key',fetcher);
 assert.equal(seen[0].body,seen[1].body);assert.equal(seen[0].headers['Idempotency-Key'],'same-key');
 await assert.rejects(sendResendEmail({...email,to:['real@customer.com']},'fake','x',fetcher));
 await assert.rejects(sendResendEmail(email,'fake','x',async()=>{throw new Error('fake');}),e=>e instanceof ResendDeliveryError && e.uncertain && !e.message.includes('fake'));
});
test('missing stored image never requests a dossier/source search',async()=>{
 assert.equal(await digestMarkImage(mark('1','FIGURA',{type:'Mixta',image:''}),'org',()=>{throw new Error('must not fetch');}),null);
 assert.equal(await digestMarkImage(mark('1','FIGURA',{type:'Mixta',image:'https://evil.example/logo.png'}),'org',()=>{throw new Error('must not fetch');}),null);
});
test('preview access cannot cross tenants except explicit internal administrator capability',()=>{
 const org='10000000-0000-4000-8000-000000000003';const requested='10000000-0000-4000-8000-000000000004';const req=new Request(`https://app.example/api/watch/digest?organizationId=${requested}`);
 const identity={organizationId:org,organizationSlug:'customer',role:'admin',userId:'u',name:'n',organizationName:'c',mustChangePassword:false};
 assert.equal(runAs(identity,()=>digestReadOrganization(req)),null);
 assert.equal(runAs({...identity,organizationSlug:'estudio-ibieta-ip'},()=>digestReadOrganization(req)),requested);
});
test('no fallback to feasibility key and configuration closed by default',()=>{
 const prior=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='fake-feasibility';delete process.env.OPENROUTER_WATCH_API_KEY;
 assert.equal(digestConfig().glmKey,'');assert.ok(digestConfigurationProblems().includes('clave exclusiva de GLM'));
 if(prior===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=prior;
});

test('DNS failure stops immediately and records zero charges before any HTTP request',async()=>{
 const records=[];let attempts=0;
 const accounting={reserve:async()=> 'dns-call',record:async(id,result)=>records.push(result)};
 const fetcher=async()=>{attempts++;throw new TypeError('fetch failed',{cause:Object.assign(new Error('DNS failed'),{code:'ENOTFOUND'})});};
 await assert.rejects(evaluateDigestGlm([cross()],[],'fake',accounting,fetcher),GlmProviderError);
 assert.equal(attempts,1);assert.equal(records[0].cost,0);assert.equal(records[0].definitelyNotSent,true);
});
