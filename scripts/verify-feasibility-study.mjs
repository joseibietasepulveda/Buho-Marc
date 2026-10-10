// Local UI QA with explicit fixtures. No source search or real model request.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const {chromium}=await import(process.env.BUHO_PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.BUHO_QA_ORIGIN || 'http://127.0.0.1:3127';
if(new URL(base).hostname!=='127.0.0.1')throw Error('La QA requiere una instancia local.');
const output='work/study-qa';await mkdir(output,{recursive:true});
const {token}=JSON.parse(await readFile(`${output}/session.json`,'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.BUHO_BROWSER_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await context.addCookies([{name:'buho_session',value:token,url:base}]);
const page=await context.newPage();const errors=[];let modelCalls=0,searchCalls=0,providerFails=false;
page.on('pageerror',error=>errors.push(error.message));
const hit=number=>({applicationId:String(10000+number),registrationId:null,name:`Marca de prueba ${number}`,type:'Denominativa',image:'',holders:[{name:'Titular de prueba'}],classes:[{nice_class:number,coverage_text:number===30?'Confites y caramelos':'Servicios de restaurante'}],filedAt:'2026-01-01',publishedAt:null,registeredAt:null,status:'En Trámite',statusCode:'P',score:.8,channels:{name:{rank:1}},history:[]});
await page.route('**/api/release-welcome',route=>route.fulfill({json:{version:'qa-local',futureAccepted:true}}));
await page.route('**/api/similarity',async route=>{
  searchCalls++;
  const multipart=route.request().postData();assert.match(multipart,/"niceClass":(?:30|43)/);
  const number=multipart.includes('"niceClass":43')?43:30;
  await route.fulfill({json:{sourceType:'fixture',query:hit(number),results:[hit(number)],groups:[],warnings:[],candidateCount:1,elapsedSeconds:1,fetchedAt:'2026-10-09T12:00:00Z',searchScope:{retrieved:1,limit:100,niceClass:number,minSimilarity:0}}});
});
await page.route('**/api/feasibility/conclusions',async route=>{
  modelCalls++;const {proposal}=route.request().postDataJSON();const number=proposal.niceClass;
  await route.fulfill({json:{conclusion:{title:providerFails?'Respaldo automático':'Se recomienda presentar con riesgo moderado de oposición',decision:'moderate',recommendation:'review',source:providerFails?'deterministic':'openrouter',paragraphs:[`En la clase ${number}, los antecedentes muestran cercanía entre las denominaciones y sus coberturas. Conviene evaluar la solicitud ${10000+number} antes de presentar.`, 'La recomendación depende de confirmar las coberturas; el resultado del examen corresponde a INAPI.'],evidenceApplicationIds:[String(10000+number)]}}});
});
await writeFile(`${output}/local-fixture.json`,JSON.stringify({sourceType:'fixture',query:{...hit(30),name:'Marca de prueba'},results:[hit(30),hit(43)],groups:[],warnings:[],candidateCount:2,elapsedSeconds:0,fetchedAt:'2026-10-09T12:00:00Z'},null,2));
try {
  await page.goto(base+'/app');await page.getByRole('button',{name:/Revisor de factibilidad/}).click();
  await page.getByRole('button',{name:'Multinforme',exact:true}).click();
  await page.getByLabel('Nombre de la marca').fill('Marca de prueba');
  await page.locator('#proposal-class').selectOption('30');
  await page.screenshot({path:`${output}/01-busqueda.png`,fullPage:true});
  await page.getByRole('button',{name:'Buscar antecedentes',exact:true}).click();
  await page.getByRole('button',{name:'Preparar informe',exact:false}).last().click();
  await page.getByRole('button',{name:'Agregar otro análisis por clase de Niza',exact:true}).click();
  assert.equal(await page.getByLabel('Nombre de la marca').inputValue(),'Marca de prueba');
  await page.locator('#proposal-class').selectOption('43');
  await page.getByRole('button',{name:'Buscar antecedentes',exact:true}).click();
  await page.getByRole('button',{name:'Preparar informe',exact:false}).last().click();
  await page.getByRole('button',{name:'Generar conclusiones con OpenRouter',exact:true}).click();
  await page.getByText('Conclusión redactada con OpenRouter para revisión').first().waitFor();
  assert.equal(modelCalls,2);assert.equal(searchCalls,2);
  await page.getByRole('button',{name:'Clase 30 · Con conclusión',exact:true}).click();
  assert.equal(await page.locator('#proposal-class').count(),0);
  await page.getByRole('navigation',{name:'Pasos de factibilidad'}).getByRole('button',{name:/Buscar/}).click();
  assert.equal(await page.locator('#proposal-class').inputValue(),'30');
  await page.getByRole('navigation',{name:'Pasos de factibilidad'}).getByRole('button',{name:/Preparar informe/}).click();
  await page.getByRole('button',{name:'Clase 43 · Con conclusión',exact:true}).click();
  assert.equal(modelCalls,2,'Navegar entre clases conserva las conclusiones');
  await page.getByLabel('Revisé los antecedentes y la conclusión del informe.').check();
  await page.screenshot({path:`${output}/02-multinforme.png`,fullPage:true});
  for(const layout of ['Fichas con imágenes','Tabla comparativa']) {
    await page.getByLabel(layout,{exact:true}).check();await page.getByLabel('Revisé los antecedentes y la conclusión del informe.').check();
    for(const format of ['PDF','Word editable']) {
      await page.getByLabel(format,{exact:true}).check();
      const download=page.waitForEvent('download');await page.getByRole('button',{name:format==='PDF'?'Descargar PDF':'Descargar Word',exact:true}).click();
      const file=await download;await file.saveAs(`${output}/${layout==='Tabla comparativa'?'tabla':'fichas'}.${format==='PDF'?'pdf':'docx'}`);
    }
  }
  assert.equal(modelCalls,2,'Cambiar presentación y descargar no vuelve a analizar');
  // A failed model response must remain visible and block export.
  await page.getByRole('button',{name:'Nuevo estudio',exact:true}).click();await page.getByRole('button',{name:'Informe',exact:true}).click();await page.getByLabel('Nombre de la marca').fill('Prueba de fallo');await page.locator('#proposal-class').selectOption('30');
  await page.getByRole('button',{name:'Buscar antecedentes',exact:true}).click();await page.getByRole('button',{name:'Preparar informe',exact:false}).last().click();
  assert.equal(await page.getByRole('button',{name:'Agregar otro análisis por clase de Niza',exact:true}).count(),0);providerFails=true;await page.getByRole('button',{name:'Generar conclusiones con OpenRouter',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'OpenRouter no pudo concluir'}).waitFor();assert.ok(await page.getByRole('button',{name:'Descargar Word',exact:true}).isDisabled());
  await page.screenshot({path:`${output}/03-fallo-openrouter.png`,fullPage:true});
  assert.deepEqual(errors,[]);await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${output}/04-movil.png`,fullPage:true});
  await writeFile(`${output}/browser-qa.json`,JSON.stringify({searchCalls,modelCalls,errors,formats:['PDF','Word'],layouts:['table','cards'],result:'passed'},null,2));
  console.log('QA de multinforme aprobada: dos clases, cuatro descargas, reutilización y fallo visible.');
} finally {await browser.close();}
