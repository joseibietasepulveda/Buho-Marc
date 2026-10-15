import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { createFeasibilityReport } from '../lib/feasibility-report.ts';
import { createFeasibilityDocx } from '../lib/feasibility-docx.ts';
import { feasibilityStatus, filterFeasibility } from '../lib/feasibility-policy.ts';
import { hiddenDiscoveryState, terminalState, canWatchPublication } from '../lib/watch-policy.ts';
import { matchesPublication, discoveryGroups, followedGroups } from '../lib/watch-list.ts';
import { applyVerifiedDecision } from '../lib/verified-decisions.ts';
import { reportRecommendation } from '../lib/feasibility-recommendation.ts';
import JSZip from 'jszip';
const hit=(extra={})=>({ applicationId:'123',name:'Marca',status:'En Trámite',statusCode:'P',registrationId:null,type:'Mixta',image:'',holders:[],classes:[],filedAt:null,publishedAt:null,registeredAt:null,score:.75,channels:{name:{rank:1}},history:[],...extra });
test('watch feature flags hide registered and final states while allowing each visibility flag to change',()=>{
 for(const state of ['Caducada','Vencida','Denegada','Rechazada definitivamente']) assert.equal(hiddenDiscoveryState(state),true,state);
 assert.equal(hiddenDiscoveryState('Registrada'),true);
 assert.equal(hiddenDiscoveryState('Registrada',{showRegistered:true,showLapsed:false,showExpired:false}),false);
 assert.equal(hiddenDiscoveryState('Concedida · pendiente de registro',{showRegistered:false,showLapsed:false,showExpired:false}),true);
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
  assert.ok(doc.getPageCount() >= 1 && doc.getPageCount() <= 20);assert.ok(bytes.length>1000);
 }
});
test('recommendation responds to high and low similarity, active state and overlapping class',()=>{
 assert.equal(reportRecommendation({results:[]}).title,'Revisar las coincidencias antes de presentar');
 assert.match(reportRecommendation({results:[]}).explanation,/completar la revisión/);
 const high={results:[hit({score:.74,classes:[{nice_class:30}]}),hit({applicationId:'124',score:.81,classes:[{nice_class:30}],status:'Registrada'})]};
 assert.equal(reportRecommendation(high,undefined,'',[30]).suggested,'adjust');
 assert.match(reportRecommendation(high,undefined,'',[30]).explanation,/74%|81%/);
 assert.equal(reportRecommendation({results:[hit({score:.74})]}).suggested,'review');
 assert.equal(reportRecommendation({results:[hit({score:.44})]}).suggested,'proceed');
 assert.equal(reportRecommendation({results:[hit({score:.74,status:'Caducada'})]}).suggested,'proceed');
 assert.equal(reportRecommendation(high,undefined,'',[25]).suggested,'proceed');
 assert.equal(reportRecommendation({results:[hit({score:.8,status:'*VER INSTANCIA'})]}).suggested,'review');
 assert.equal(reportRecommendation({results:[hit()]},'proceed','  Motivo del abogado.  ').explanation,'Motivo del abogado.');
 assert.equal(reportRecommendation({results:[hit()]},'proceed').title,'Proseguir con la solicitud');
});
test('editable Word report uses the same recommendation and embeds supplied images',async()=>{
 const {readFile}=await import('node:fs/promises');
 const tiny=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64'));
 const result={query:hit(),results:[hit({score:.87,applicationId:'123',status:'Registrada',classes:[{nice_class:30}]}),hit({score:.83,applicationId:'124',status:'Registrada',classes:[{nice_class:30}]})],groups:[],warnings:[],candidateCount:2,elapsedSeconds:1,fetchedAt:'2026-09-22T12:00:00Z'};
 const blob=await createFeasibilityDocx({proposal:{name:'Marca propuesta',coverage:[{nice_class:30,text:'Confites'}],grouped:false},result,status:'all',studioLogo:await readFile('public/reports/studio-logo.png'),image:tiny,resultImages:{'123':tiny,'124':tiny}});
 assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 assert.ok(blob.size>1000);
 assert.equal(new Uint8Array(await blob.arrayBuffer())[0],0x50);
});
test('report supports logo, optional full appendix and multipage author explanations',async()=>{
 const result={query:hit(),results:[hit({classes:[{nice_class:30,coverage_text:'Caramelos '.repeat(500)}]})],groups:[],warnings:[],candidateCount:1,elapsedSeconds:1,fetchedAt:'2026-09-22T12:00:00Z'};
 const {readFile}=await import('node:fs/promises');
 const bytes=await createFeasibilityReport({proposal:{name:'Marca',coverage:[],grouped:false},result,status:'all',studioLogo:await readFile('public/reports/studio-logo.png'),audience:'study',includeAppendix:true,explanation:'Texto de prueba. '.repeat(160)});
 assert.ok((await PDFDocument.load(bytes)).getPageCount()>3);
});
test('Word retains the supplied conclusion, full coverages and optional study details',async()=>{
 const fullCoverage='Productos y servicios de cobertura extensa. '.repeat(50)+'Fin de la cobertura original.';
 const result={query:hit(),results:[hit({classes:[{nice_class:30,coverage_text:fullCoverage},{nice_class:35,coverage_text:'Servicios relacionados de otra clase.'}]})],groups:[],warnings:[],candidateCount:1,elapsedSeconds:1,fetchedAt:'2026-10-02T12:00:00Z'};
 const conclusion={title:'Revisión del abogado',recommendation:'review',source:'openrouter',paragraphs:['Esta conclusión preparada debe aparecer igual en los dos formatos.','Segundo párrafo de la conclusión guardada.'],evidenceApplicationIds:['123']};
 const blob=await createFeasibilityDocx({proposal:{name:'Marca propuesta',coverage:[],grouped:true},result,status:'all',audience:'study',conclusion,studioProfile:{studioName:'Estudio personalizado',lawyerName:'Abogada personalizada',address:'Dirección personalizada',email:'',phone:'',website:'',logo:''}});
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());const xml=await zip.file('word/document.xml').async('string');
 const allXml=(await Promise.all(Object.keys(zip.files).filter(name=>/^word\/.*\.xml$/.test(name)).map(name=>zip.file(name).async('string')))).join(' ');
 for(const value of [conclusion.title,...conclusion.paragraphs,'Estudio personalizado','Abogada personalizada','Dirección personalizada',fullCoverage,'Servicios relacionados de otra clase.','IV.    Conclusión.'])assert.ok(allXml.includes(value),value);
 assert.match(xml,/30, 35/);assert.ok(xml.includes('Clases de Niza: '));
 assert.match(xml,/w:keepNext/);assert.match(xml,/w:ascii="Times New Roman"/);
 assert.equal(Object.keys(zip.files).some(name=>name.startsWith('word/media/')),false,'no logo or placeholder should be inserted when the profile has no logo');
 const pdf=await createFeasibilityReport({proposal:{name:'Marca propuesta',coverage:[],grouped:true},result,status:'all',audience:'study',conclusion});
 assert.ok((await PDFDocument.load(pdf)).getPageCount()>=2);
});
test('new table groups one mark, embeds its logo and includes only selected relevant evidence',async()=>{
 const tiny=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64'));
 const records=['1','2','3'].map(applicationId=>hit({applicationId,name:'CIOCCOLATA',holders:[{name:'Titular de prueba'}],classes:[{nice_class:4,coverage_text:'Velas'}]}));
 const result={query:hit(),results:[...records,hit({applicationId:'4',name:'Marca no incluida',holders:[{name:'Otro titular'}],classes:[{nice_class:4}]})],groups:[],warnings:['Datos incompletos'],candidateCount:100,elapsedSeconds:1,fetchedAt:'2026-10-11T12:00:00Z'};
 const proposal={name:'cioccolati',niceClass:4,coverage:[{nice_class:4,text:'Velas'}],grouped:true};
 const conclusion={title:'Se recomienda presentar con riesgo moderado de oposición',recommendation:'review',decision:'moderate',source:'author',paragraphs:['El antecedente “CIOCCOLATA”,todos sus expedientes incluidos, requiere comparar las coberturas de esta clase.'],evidenceApplicationIds:['1','2','3']};
 const analysis={proposal,result,selectedIds:['1','2','3'],conclusion};
 const input={proposal,result,status:'all',layout:'table',analyses:[analysis],selectedIds:analysis.selectedIds,resultImages:{'2':tiny},includeAppendix:true};
 const zip=await JSZip.loadAsync(await(await createFeasibilityDocx(input)).arrayBuffer()),xml=await zip.file('word/document.xml').async('string');
 assert.equal((xml.match(/<w:tc>/g)||[]).length,4);assert.match(xml,/1 coincidencia detectada/);assert.match(xml,/w:jc w:val="center"/);assert.match(xml,/w:vAlign w:val="center"/);assert.match(xml,/Parte Figurativa/);assert.equal(xml.includes('>Logo<'),false);assert.match(xml,/w:ascii="Times New Roman"/);assert.match(xml,/w:jc w:val="both"/);
 assert.match(xml,/CIOCCOLATA.*, todos/);assert.equal(xml.includes('Marca no incluida'),false);assert.equal(xml.includes('Anexo de resultados'),false);
 assert.equal(xml.includes('antecedentes recuperados'),false);assert.equal(xml.includes('Nota: el análisis'),false);assert.equal(xml.includes('Los datos incompletos'),false);
 assert.equal(Object.keys(zip.files).filter(name=>name.startsWith('word/media/')&&!zip.files[name].dir).length,1);
 const emptyZip=await JSZip.loadAsync(await(await createFeasibilityDocx({...input,analyses:[{...analysis,selectedIds:[]}]})).arrayBuffer()),empty=await emptyZip.file('word/document.xml').async('string');
 assert.match(empty,/0 coincidencias detectadas/);assert.equal(empty.includes('<w:tbl>'),false);
 assert.ok((await PDFDocument.load(await createFeasibilityReport(input))).getPageCount()>=1);
});

test('client and study exports share uppercase identity but expose different technical details',async()=>{
 const record=hit({applicationId:'1310823',registrationId:'1297232',name:'Pasteles holz',holders:[{name:'Titular de ejemplo'}],classes:[{nice_class:30,coverage_text:'Cobertura completa del antecedente.'}]});
 const result={query:record,results:[record],groups:[],warnings:[],candidateCount:1,elapsedSeconds:1,fetchedAt:'2026-10-12T12:00:00Z'};
 const proposal={name:'pasteles',niceClass:30,coverage:[{nice_class:30,text:'Cobertura propuesta de prueba.'}],grouped:true};
 const conclusion={title:'No se recomienda presentar la solicitud',recommendation:'adjust',decision:'avoid',source:'author',paragraphs:['La marca “pasteles” guarda cercanía denominativa con “Pasteles holz” (solicitud 1310823, registro 1297232). Conviene revisar alternativas antes de presentar.'],evidenceApplicationIds:['1310823']};
 const input={result,proposal,status:'all',analyses:[{result,proposal,selectedIds:['1310823'],conclusion}],client:'Cliente de ejemplo'};
 for(const audience of ['client','study'])for(const layout of ['cards','table']){
  const zip=await JSZip.loadAsync(await(await createFeasibilityDocx({...input,audience,layout})).arrayBuffer());
  const xml=await zip.file('word/document.xml').async('string');
  assert.ok(xml.indexOf('INFORME DE FACTIBILIDAD')<xml.indexOf('Marca en estudio: PASTELES'));
  assert.ok(xml.indexOf('Marca en estudio: PASTELES')<xml.indexOf('Clase de Niza: 30'));
  assert.ok(xml.indexOf('Clase de Niza: 30')<xml.indexOf('Para: Cliente de ejemplo'));
  assert.ok(!xml.includes('pasteles')&&!xml.includes('Pasteles holz'));
  assert.ok(xml.includes('PASTELES HOLZ'));
  for(const value of ['1310823','1297232','Cobertura propuesta de prueba.'])assert.equal(xml.includes(value),audience==='study',`${audience}: ${value}`);
  assert.equal(xml.includes('Cobertura completa del antecedente.'),audience==='study'&&layout==='cards');
  assert.ok(!xml.includes('Factor de similitud')&&!xml.includes('%'));
  const {PDFName}=await import('pdf-lib');
  const pdf=await PDFDocument.load(await createFeasibilityReport({...input,audience,layout}));
  assert.equal(Boolean(pdf.catalog.get(PDFName.of('Names'))),audience==='study','only study PDF carries technical evidence');
 }
 const defaultZip=await JSZip.loadAsync(await(await createFeasibilityDocx(input)).arrayBuffer());
 assert.equal((await defaultZip.file('word/document.xml').async('string')).includes('1310823'),false,'client is the default');
 const multi={...input,proposal:{...proposal,coverage:[...proposal.coverage,{nice_class:43,text:'Servicios'}]}};
 const multiZip=await JSZip.loadAsync(await(await createFeasibilityDocx(multi)).arrayBuffer());
 assert.ok((await multiZip.file('word/document.xml').async('string')).includes('Clases de Niza: 30, 43'));
});
