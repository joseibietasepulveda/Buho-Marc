// Use the isolated pilot-e2e server; never a hosted account.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base=process.env.CANDIDATE_QA_BASE;
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(base??''));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1440,height:1080}});
const login=await context.request.post(base+'/api/auth/login',{headers:{origin:base},data:{username:'pilot_alice',password:'pilot-confirmed-password'}});assert.equal(login.status(),200);
const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const dir='output/bienvenida-main-2026-10-08';await mkdir(dir,{recursive:true});
try {
 await page.goto(base+'/app');
 const dialog=page.getByRole('dialog');await dialog.getByRole('heading',{name:'¡Buenas noticias!'}).waitFor();
 assert.equal(await dialog.getByRole('checkbox').count(),8);
 const accept=dialog.getByRole('button',{name:'Aceptar',exact:true});assert.equal(await accept.isDisabled(),true);
 await page.screenshot({path:dir+'/bienvenida-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:dir+'/bienvenida-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await accept.evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),true,'mobile accept button stays in the viewport');
 await page.setViewportSize({width:1440,height:1080});
 for(const box of await dialog.getByRole('checkbox').all())await box.check();
 let fail=true;await page.route('**/api/release-welcome',async route=>{if(fail&&route.request().method()==='POST'){fail=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Fallo de prueba; puedes reintentar.'})});}else await route.continue();});
 await accept.click();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.locator('input:checked').count(),8);
 await accept.click();await dialog.getByRole('heading',{name:'Y esto es lo que puedes esperar en la nueva versión'}).waitFor();
 assert.equal(await dialog.getByRole('checkbox').count(),3);
 await page.screenshot({path:dir+'/proximamente-desktop.png',fullPage:true});
 await page.reload();await dialog.getByRole('heading',{name:'Y esto es lo que puedes esperar en la nueva versión'}).waitFor();
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Conoce las novedades'}).click();await dialog.waitFor();
 for(const box of await dialog.getByRole('checkbox').all())await box.check();
 await dialog.getByRole('button',{name:'Aceptar y entrar'}).click();await dialog.waitFor({state:'hidden'});
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/release-welcome')),page.reload()]);
 assert.equal(await dialog.isVisible(),false);assert.deepEqual(errors,[]);
 console.log('PASS: two-stage welcome, desktop/mobile, required checkboxes, failed-save recovery, resume after reload, Escape/postpone and persistent completion; no page errors');
}finally{await browser.close();}
