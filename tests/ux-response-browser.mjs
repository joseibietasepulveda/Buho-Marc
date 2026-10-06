// Run against WATCH_QA_KEEP=true fixtures; deliberately delays and rejects local requests.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.UX_QA_BASE || 'http://127.0.0.1:3411';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Use only the isolated watch-http fixture server.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.request.post(base+'/api/auth/login',{headers:{origin:base},data:{username:'qa_vigilancia',password:'vigilancia-local-1'}});
const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
let hold;let captured;let entered;let watched=0;page.on('request',r=>{if(r.method()==='GET'&&new URL(r.url()).pathname==='/api/watch')watched++;});
let rule=null;let stalePath=null,releaseStale,staleEntered,staleDone;
const staleComplete=new Promise(resolve=>staleDone=resolve);
await page.route('**/api/**',async route=>{const r=route.request(),path=new URL(r.url()).pathname;const body=r.method()==='POST'?r.postDataJSON():null;if(stalePath===path&&r.method()==='GET'){stalePath=null;const headers={...r.headers()};delete headers['if-none-match'];const snapshot=await route.fetch({headers});staleEntered();await new Promise(resolve=>releaseStale=resolve);await route.fulfill({response:snapshot});staleDone();return;}if(rule&&rule(path,r.method(),body)){rule=null;entered?.();await new Promise(resolve=>hold=resolve);if(captured==='fail'){await route.fulfill({status:500,json:{message:'Error de QA simulado'}});return;}}
const response=await route.fetch();if(r.method()==='POST'&&(path==='/api/demo'||path==='/api/tasks')){const json=await response.json();console.log('WRITE',path,response.status(),Object.keys(json));captured=json;}await route.fulfill({response});});
async function gate(match,fail=false){captured=fail?'fail':null;rule=match;return new Promise(resolve=>entered=resolve);}
async function nav(name){await page.getByRole('button',{name}).click();}
try{
await page.goto(base+'/app');await page.getByRole('heading',{name:'Resumen de vigilancia',exact:true}).waitFor();
assert.equal(await page.locator('.dashboard-attention-table th').count(),2);assert.equal(await page.locator('.dashboard-attention-table .similarity-image').first().evaluate(e=>Math.round(e.getBoundingClientRect().height)),48);
await nav(/^03\s*Vigilancia$/);await page.locator('.watch-view .watch-band').first().waitFor();
const searched=page.waitForResponse(r=>r.request().method()==='GET'&&r.url().includes('/api/watch?')&&r.url().includes('q=Marca+QA'));await page.getByRole('searchbox',{name:'Buscar vigilancia por nombre'}).fill('Marca QA');await searched;
await page.waitForTimeout(100);const before=watched;
await nav(/^02\s*Mis marcas$/);await page.getByRole('columnheader',{name:'Nombre titular',exact:true}).waitFor();await nav(/^03\s*Vigilancia$/);
assert.equal(await page.getByRole('searchbox',{name:'Buscar vigilancia por nombre'}).inputValue(),'Marca QA');await page.waitForTimeout(100);assert.equal(watched,before);console.log('PASS cached navigation',watched);
let arrival=gate((p,m,b)=>p==='/api/watch'&&m==='POST'&&b.action==='follow'&&!b.publicationOnly);
await page.getByRole('button',{name:'Pasar a seguimiento',exact:true}).first().click();await arrival;await page.getByRole('button',{name:'Pasando a seguimiento…',exact:true}).waitFor();hold();
await page.getByRole('button',{name:'En seguimiento ✓',exact:true}).first().waitFor();console.log('PASS follow state');
arrival=gate((p,m,b)=>p==='/api/watch'&&m==='POST'&&b.publicationOnly);
await page.getByRole('button',{name:'Avísame si se publica en el Diario Oficial',exact:true}).first().click();await arrival;await page.getByRole('button',{name:'Activando aviso…',exact:true}).waitFor();hold();
await page.getByRole('button',{name:'Aviso de publicación activado ✓',exact:true}).first().waitFor();console.log('PASS publication state');
arrival=gate((p,m,b)=>p==='/api/demo'&&m==='POST'&&b.action==='reviewMatch');
await page.getByRole('button',{name:'Convertir en caso',exact:true}).first().click();await arrival;await page.getByRole('button',{name:'Creando caso…',exact:true}).waitFor();hold();
const linked=page.getByRole('button',{name:'Ir al caso →',exact:true}).first();await linked.waitFor();assert.equal(await linked.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(229, 241, 236)');assert.ok(captured.case?.id);const caseTitle=captured.case.title;
await linked.click();await page.getByRole('heading',{name:caseTitle,exact:true}).last().waitFor();assert.equal(new URL(page.url()).hash,'#cases');console.log('PASS exact case drawer',caseTitle);
await page.getByRole('button',{name:`Cerrar ${caseTitle}`,exact:true}).click();

await nav(/^05\s*Tareas$/);await page.locator('.task-list-main').first().waitFor();
await page.screenshot({path:'output/ux-response-2026-10-06/tasks-desktop.png',fullPage:true});
// Optimistic delete before acknowledgement, followed by rollback on failure.
const rows=page.locator('.tasks-list > article');let count=await rows.count();
arrival=gate((p,m,b)=>p==='/api/tasks'&&m==='POST'&&b.action==='delete');
await page.locator('.task-remove').first().click();await arrival;
await page.waitForFunction(n=>document.querySelectorAll('.tasks-list > article').length===n,count-1);hold();await page.waitForTimeout(100);assert.equal(await rows.count(),count-1);console.log('PASS immediate task delete');
count=await rows.count();arrival=gate((p,m,b)=>p==='/api/tasks'&&m==='POST'&&b.action==='delete',true);
await page.locator('.task-remove').first().click();await arrival;await page.waitForFunction(n=>document.querySelectorAll('.tasks-list > article').length===n,count-1);hold();
await page.waitForFunction(n=>document.querySelectorAll('.tasks-list > article').length===n,count);await page.getByRole('alert').first().waitFor();console.log('PASS failed delete restores task');
// A pre-write portfolio read must not overwrite the confirmed edit later.
stalePath='/api/demo';const staleReady=new Promise(resolve=>staleEntered=resolve);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await staleReady;
// Save a case task without waiting for the portfolio endpoint.
await page.locator('.task-list-main').first().click();let dialog=page.getByRole('dialog',{name:'Editar tarea',exact:true});
await dialog.getByLabel('¿Qué hay que hacer?').fill('QA edición rápida de caso');
arrival=gate((p,m,b)=>p==='/api/demo'&&m==='POST'&&b.action==='saveCaseTask');
await dialog.getByRole('button',{name:'Guardar tarea',exact:true}).click();await arrival;
await page.locator('.task-list-main').filter({hasText:'QA edición rápida de caso'}).waitFor();await dialog.getByRole('button',{name:'Guardando…'}).waitFor();hold();await dialog.waitFor({state:'hidden'});assert.equal(captured.saved,true);assert.equal(captured.data,undefined);console.log('PASS compact task save');releaseStale();await staleComplete;await page.waitForTimeout(100);assert.equal(await page.locator('.task-list-main').filter({hasText:'QA edición rápida de caso'}).count(),1);console.log('PASS stale read cannot undo saved task');
await page.locator('.task-list-main').filter({hasText:'QA edición rápida de caso'}).click();dialog=page.getByRole('dialog',{name:'Editar tarea',exact:true});await dialog.getByLabel('¿Qué hay que hacer?').fill('QA borrador conservado');arrival=gate((p,m,b)=>p==='/api/demo'&&m==='POST'&&b.action==='saveCaseTask',true);await dialog.getByRole('button',{name:'Guardar tarea',exact:true}).click();await arrival;hold();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByLabel('¿Qué hay que hacer?').inputValue(),'QA borrador conservado');await page.locator('.task-list-main').filter({hasText:'QA edición rápida de caso'}).waitFor();await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();console.log('PASS failed edit preserves draft and restores task');
// Add a task to a registration using the same optimistic provider.
await page.getByRole('button',{name:'Nueva tarea',exact:true}).click();dialog=page.getByRole('dialog',{name:'Nueva tarea',exact:true});
const applicationOption=await dialog.locator('select option[value^="application:"]').first().getAttribute('value');assert.ok(applicationOption);
await dialog.getByRole('combobox',{name:'Vincular tarea a'}).selectOption(applicationOption);await dialog.getByLabel('¿Qué hay que hacer?').fill('QA tarea solicitud');
arrival=gate((p,m,b)=>p==='/api/tasks'&&m==='POST'&&b.action==='save');await dialog.getByRole('button',{name:'Guardar tarea',exact:true}).click();await arrival;
await page.locator('.task-list-main').filter({hasText:'QA tarea solicitud'}).waitFor();hold();await dialog.waitFor({state:'hidden'});console.log('PASS registration optimistic save');
const applicationRow=rows.filter({hasText:'QA tarea solicitud'});arrival=gate((p,m,b)=>p==='/api/tasks'&&m==='POST'&&b.action==='delete',true);
await applicationRow.locator('.task-remove').click();await arrival;await applicationRow.waitFor({state:'hidden'});hold();await applicationRow.waitFor();console.log('PASS registration delete rollback');
// Footer follows the light dialog style; brand selector filters and handles keys.
await nav(/^04\s*Casos$/);await page.getByRole('button',{name:'Agregar oposición o nulidad',exact:true}).click();dialog=page.getByRole('dialog',{name:'Agregar oposición o nulidad',exact:true});
const bg=await dialog.locator('footer').evaluate(e=>getComputedStyle(e).backgroundColor);assert.equal(bg,'rgb(255, 253, 250)');
let combo=dialog.getByRole('combobox',{name:'Marca o solicitud de fundamento',exact:true});await combo.fill('Marca QA 100');await dialog.locator('.brand-combobox-options').getByRole('option').first().waitFor();await combo.press('ArrowDown');await combo.press('Enter');assert.ok((await combo.inputValue()).includes('Marca QA 100'));
await page.screenshot({path:'output/ux-response-2026-10-06/opposition-desktop.png',fullPage:true});await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();console.log('PASS light footer and searchable basis');
await page.getByRole('button',{name:'Nuevo caso',exact:true}).click();dialog=page.getByRole('dialog',{name:'Crear caso',exact:true});combo=dialog.getByRole('combobox',{name:'Marca relacionada',exact:true});await combo.fill('Marca QA 100');await combo.press('Enter');
await dialog.getByLabel('Título del caso').fill('QA caso desde selector');await dialog.getByLabel('Cliente',{exact:true}).fill('Cliente QA');await dialog.getByLabel('Fecha del próximo plazo').fill('2026-10-15');
await page.screenshot({path:'output/ux-response-2026-10-06/case-search-desktop.png',fullPage:true});
arrival=gate((p,m,b)=>p==='/api/demo'&&m==='POST'&&b.action==='createCase');await dialog.getByRole('button',{name:/^Crear caso/}).click();await arrival;hold();await dialog.waitFor({state:'hidden'});console.log('PASS manual case selected brand');
// Small spinner communicates the real search request, even on a slow source.
await nav(/^02\s*Mis marcas$/);await page.getByRole('button',{name:'Agregar marcas',exact:true}).click();dialog=page.getByRole('dialog',{name:'Agregar marcas al seguimiento',exact:true});await dialog.getByLabel('Nombre de la marca',{exact:true}).fill('QA');
arrival=gate((p,m)=>p==='/api/inapi/search'&&m==='POST');await dialog.getByRole('button',{name:'Buscar en INAPI',exact:true}).click();await arrival;await dialog.getByRole('button',{name:'Consultando…',exact:true}).waitFor();assert.equal(await dialog.locator('.loading-spinner').count(),1);hold();await dialog.getByRole('button',{name:'Cerrar',exact:true}).waitFor({state:'visible'});await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();console.log('PASS search spinner');
await nav(/^06\s*Resumen de registros$/);await page.getByRole('heading',{name:'Resumen de registros',exact:true}).waitFor();assert.equal(await page.getByText('Requiere completar antecedentes',{exact:true}).count(),0);assert.equal(await page.getByText('Antecedentes por completar',{exact:true}).count(),0);assert.equal(await page.locator('.registration-summary-metrics button').count(),3);await page.screenshot({path:'output/ux-response-2026-10-06/registrations-desktop.png',fullPage:true});
await nav(/^08\s*Solicitudes de registro$/);await page.locator('.trademark-card').first().waitFor();await page.locator('.trademark-card').first().click();assert.equal(await page.getByText('Respaldo de los plazos',{exact:true}).count(),0);await page.getByRole('dialog').last().getByRole('button',{name:/^Cerrar /}).first().click();console.log('PASS simplified registration views');
// Cached hidden views invalidate after a case is discarded in another section.
await nav(/^04\s*Casos$/);await page.getByRole('button',{name:new RegExp(caseTitle)}).first().click();dialog=page.getByRole('dialog',{name:caseTitle,exact:true});await dialog.getByRole('button',{name:'Descartar caso',exact:true}).click();await dialog.getByRole('button',{name:'Sí, descartar caso',exact:true}).click();await dialog.waitFor({state:'hidden'});
const invalidated=page.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).pathname==='/api/watch');await nav(/^03\s*Vigilancia$/);await invalidated;await page.waitForTimeout(100);assert.equal(await page.getByRole('button',{name:'Ir al caso →',exact:true}).count(),0);console.log('PASS hidden cache invalidates after case discard');
const visibleCards=page.locator('.watch-view .similarity-card');const cardCount=await visibleCards.count();arrival=gate((p,m,b)=>p==='/api/demo'&&m==='POST'&&b.action==='reviewMatch'&&b.status==='Descartada');await page.getByRole('button',{name:'Descartar',exact:true}).first().click();await arrival;hold();await page.waitForFunction(n=>document.querySelectorAll('.watch-view .similarity-card').length===n,cardCount-1);console.log('PASS confirmed discard removes card');
await nav(/^01\s*Resumen Vigilancia$/);await page.screenshot({path:'output/ux-response-2026-10-06/dashboard-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/ux-response-2026-10-06/dashboard-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
await page.setViewportSize({width:820,height:1100});await page.screenshot({path:'output/ux-response-2026-10-06/dashboard-tablet.png',fullPage:true});console.log('PASS mobile and tablet access');
assert.equal(errors.length,0,JSON.stringify(errors));
}finally{hold?.();releaseStale?.();await browser.close();}
