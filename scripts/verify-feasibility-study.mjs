// Local UI QA with explicit fixtures. No source search or real model request.
import assert from 'node:assert/strict';
import { NICE_CLASSES } from '../lib/nice-classes.ts';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const {chromium}=await import(process.env.BUHO_PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.BUHO_QA_ORIGIN || 'http://127.0.0.1:3127';
if(new URL(base).hostname!=='127.0.0.1')throw Error('La QA requiere una instancia local.');
const output='work/study-qa';await mkdir(output,{recursive:true});
const {token}=JSON.parse(await readFile(`${output}/session.json`,'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.BUHO_BROWSER_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await context.addCookies([{name:'buho_session',value:token,url:base}]);
const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];let modelCalls=0,searchCalls=0,providerFails=false;const generatedClasses=[];
page.on('pageerror',error=>errors.push(error.message));
const hit=number=>({applicationId:String(10000+number),registrationId:null,name:`Marca de prueba ${number}`,type:'Denominativa',image:'',holders:[{name:'Titular de prueba'}],classes:[{nice_class:number,coverage_text:number===30?'Confites y caramelos':'Servicios de restaurante'}],filedAt:'2026-01-01',publishedAt:null,registeredAt:null,status:'En Trámite',statusCode:'P',score:.8,channels:{name:{rank:1}},history:[]});
await page.route('**/api/release-welcome',route=>route.fulfill({json:{version:'qa-local',futureAccepted:true}}));
await page.route('**/api/similarity',async route=>{
  searchCalls++;
  const multipart=route.request().postData();assert.match(multipart,/"niceClass":(?:30|43)/);
  const number=multipart.includes('"niceClass":43')?43:30;
  await route.fulfill({json:{sourceType:'fixture',query:hit(number),results:[hit(number),{...hit(number),applicationId:String(20000+number)},{...hit(number),applicationId:String(30000+number)}],groups:[],warnings:[],candidateCount:1,elapsedSeconds:1,fetchedAt:'2026-10-09T12:00:00Z',searchScope:{retrieved:1,limit:100,niceClass:number,minSimilarity:0}}});
});
await page.route('**/api/feasibility/conclusions',async route=>{
  modelCalls++;const {proposal,selectedIds}=route.request().postDataJSON();const number=proposal.niceClass;generatedClasses.push(number);const empty=selectedIds.length===0;
  await route.fulfill({json:{conclusion:{title:providerFails?'Respaldo automático':empty?'Se recomienda presentar la solicitud':'Se recomienda presentar con riesgo moderado de oposición',decision:empty?'proceed':'moderate',recommendation:empty?'proceed':'review',source:providerFails?'deterministic':'openrouter',...(providerFails?{reason:'invalid_response',generationAttempts:2}:{}),paragraphs:[`En la clase ${number}, los antecedentes muestran cercanía entre las denominaciones y sus coberturas. Conviene evaluar la solicitud ${10000+number} antes de presentar.`, 'La recomendación depende de confirmar las coberturas; el resultado del examen corresponde a INAPI.'],evidenceApplicationIds:empty?[]:[String(10000+number)]}}});
});
await writeFile(`${output}/local-fixture.json`,JSON.stringify({sourceType:'fixture',query:{...hit(30),name:'Marca de prueba'},results:[hit(30),hit(43)],groups:[],warnings:[],candidateCount:2,elapsedSeconds:0,fetchedAt:'2026-10-09T12:00:00Z'},null,2));
async function chooseClass(number){await page.getByRole('combobox',{name:'Clase Niza',exact:true}).fill(String(number));await page.getByRole('option',{name:new RegExp('^'+number+' ·')}).click();}
try {
  await page.goto(base+'/app',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/Revisor de factibilidad/}).click();
  await page.getByRole('button',{name:'Multinforme',exact:true}).click();
  const emptyProgress=await page.locator('.feasibility-study-progress').evaluate(el=>{const parent=el.getBoundingClientRect(),text=el.querySelector('strong').getBoundingClientRect();return {top:text.top-parent.top,bottom:parent.bottom-text.bottom};});assert.ok(Math.abs(emptyProgress.top-emptyProgress.bottom)<2);
  await page.getByLabel('Nombre de la marca').fill('Marca de prueba');
  await chooseClass(30);
  await page.screenshot({path:`${output}/01-busqueda.png`,fullPage:true});
  await page.getByRole('button',{name:'Buscar antecedentes',exact:true}).click();
  await page.getByText('Marca de prueba · 1 antecedente',{exact:true}).waitFor();
  await page.getByText('1 antecedente seleccionado',{exact:true}).waitFor();
  await page.getByLabel('Incluir Marca de prueba 30 en el informe',{exact:true}).uncheck();await page.getByText('0 antecedentes seleccionados',{exact:true}).waitFor();
  await page.getByLabel('Incluir Marca de prueba 30 en el informe',{exact:true}).check();await page.getByText('1 antecedente seleccionado',{exact:true}).waitFor();
  await page.locator('.feasibility-selection-bar').getByRole('button',{name:'Siguiente',exact:true}).click();
  await page.getByRole('button',{name:'Generar conclusión con IA - Buho Marc',exact:true}).click();
  await page.getByLabel('Conclusión del abogado · Clase 30 (opcional)',{exact:true}).filter({hasText:/.*/}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.feasibility-report-card textarea').value.includes('En la clase 30'));
  assert.equal(modelCalls,1);assert.deepEqual(generatedClasses,[30]);
  assert.equal(await page.getByRole('button',{name:'Agregar otro análisis por clase de Niza',exact:true}).count(),2);
  await page.getByRole('button',{name:'Agregar otro análisis por clase de Niza',exact:true}).last().click();
  assert.equal(await page.getByLabel('Nombre de la marca').inputValue(),'Marca de prueba');
  await chooseClass(43);
  await page.getByRole('button',{name:'Buscar antecedentes',exact:true}).click();
  await page.locator('.feasibility-selection-bar').getByRole('button',{name:'Siguiente',exact:true}).click();
  providerFails=true;
  await page.getByRole('button',{name:'Generar conclusión con IA - Buho Marc',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'después de dos intentos'}).waitFor();
  assert.match(await page.getByLabel('Editar conclusión de clase 30',{exact:true}).inputValue(),/En la clase 30/);
  assert.ok(await page.getByRole('button',{name:'Descargar PDF',exact:true}).isDisabled());
  await page.getByRole('alert').filter({hasText:'después de dos intentos'}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/02-fallo-segunda-clase.png`,fullPage:true});
  providerFails=false;
  await page.getByRole('button',{name:'Generar conclusión con IA - Buho Marc',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.feasibility-report-card textarea').value.includes('En la clase 43'));
  assert.deepEqual(generatedClasses,[30,43,43]);
  assert.equal(await page.getByText(/OpenRouter/).count(),0);
  assert.equal(await page.getByLabel('Agregar un anexo con todos los resultados de la búsqueda').count(),0);
  const edited='La conclusión de clase 43 se edita directamente, conservando el análisis y las coberturas de esta clase.';
  await page.getByLabel('Editar conclusión de clase 43',{exact:true}).fill(edited);
  assert.equal(await page.getByLabel('Conclusión del abogado · Clase 43 (opcional)',{exact:true}).inputValue(),edited);
  assert.equal(modelCalls,3);assert.equal(searchCalls,2);
  await page.getByRole('button',{name:'Clase 30 · Con conclusión',exact:true}).click();
  assert.equal(await page.locator('#proposal-class').count(),0);
  await page.getByRole('navigation',{name:'Pasos de factibilidad'}).getByRole('button',{name:/Buscar/}).click();
  assert.equal(await page.locator('#proposal-class').inputValue(),NICE_CLASSES.find(item=>item.number===30).number+' · '+NICE_CLASSES.find(item=>item.number===30).meaning);
  await page.getByRole('navigation',{name:'Pasos de factibilidad'}).getByRole('button',{name:/Preparar informe/}).click();
  await page.getByRole('button',{name:'Clase 43 · Con conclusión',exact:true}).click();
  assert.equal(modelCalls,3,'Navegar entre clases conserva las conclusiones');

  await page.screenshot({path:`${output}/02-multinforme.png`,fullPage:true});
  assert.equal(await page.getByRole('button',{name:'Informe para cliente',exact:true}).getAttribute('aria-pressed'),'true');
  for(const audience of ['cliente','estudio']) {
    await page.getByRole('button',{name:`Informe para ${audience}`,exact:true}).click();
    assert.equal(await page.getByRole('button',{name:`Informe para ${audience}`,exact:true}).getAttribute('aria-pressed'),'true');
    for(const layout of ['Fichas con imágenes','Tabla comparativa']) {
      await page.getByLabel(layout,{exact:true}).check();
      for(const format of ['PDF','Word editable']) {
        await page.getByLabel(format,{exact:true}).check();
        const download=page.waitForEvent('download');await page.getByRole('button',{name:format==='PDF'?'Descargar PDF':'Descargar Word',exact:true}).click();
        const file=await download;await file.saveAs(`${output}/${audience}-${layout==='Tabla comparativa'?'tabla':'fichas'}.${format==='PDF'?'pdf':'docx'}`);
      }
    }
  }
  assert.equal(modelCalls,3,'Cambiar destinatario, presentación y descargar no vuelve a analizar');
  // A failed model response must remain visible and block export.
  await page.getByRole('button',{name:'Nuevo estudio',exact:true}).click();await page.getByRole('button',{name:'Informe',exact:true}).click();await page.getByLabel('Nombre de la marca').fill('Prueba de fallo');await chooseClass(30);
  await page.getByRole('button',{name:'Buscar antecedentes',exact:true}).click();await page.locator('.feasibility-selection-bar').getByRole('button',{name:'Siguiente',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Agregar otro análisis por clase de Niza',exact:true}).count(),0);providerFails=true;await page.getByRole('button',{name:'Generar conclusión con IA - Buho Marc',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'no cumplió las validaciones del informe'}).waitFor();assert.ok(await page.getByRole('button',{name:'Descargar Word',exact:true}).isDisabled());
  await page.screenshot({path:`${output}/03-fallo-openrouter.png`,fullPage:true});
  providerFails=false;await page.getByRole('button',{name:'Nuevo estudio',exact:true}).click();await page.getByLabel('Nombre de la marca').fill('Sin antecedentes relevantes');await chooseClass(30);
  await page.getByRole('button',{name:'Buscar antecedentes',exact:true}).click();await page.getByRole('button',{name:'Limpiar selección',exact:true}).click();await page.locator('.feasibility-selection-bar').getByRole('button',{name:'Siguiente',exact:true}).click();
  await page.getByRole('button',{name:'Generar conclusión con IA - Buho Marc',exact:true}).click();await page.waitForFunction(()=>{const button=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Descargar Word');return button&&!button.disabled;});
  assert.equal(await page.getByRole('article').getByText('Se recomienda presentar la solicitud',{exact:true}).count(),1);
  assert.deepEqual(errors,[]);await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${output}/04-movil.png`,fullPage:true});
  await writeFile(`${output}/browser-qa.json`,JSON.stringify({searchCalls,modelCalls,errors,formats:['PDF','Word'],layouts:['table','cards'],audiences:['client','study'],result:'passed'},null,2));
  console.log('QA de multinforme aprobada: dos clases, ocho descargas y dos destinatarios, reutilización y fallo visible.');
} finally {await browser.close();}
