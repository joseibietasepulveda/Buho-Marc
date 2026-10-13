// Run with WATCH_QA_KEEP=true against the disposable watch-http fixture only.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { chileToday } from '../lib/work-priorities.ts';
const base = process.env.AGENDA_QA_BASE || 'http://127.0.0.1:3437';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Only disposable local fixtures');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const http = async (path, data) => {
  const response = data ? await context.request.post(base + path, { headers: { origin: base, ...(cookie ? { cookie } : {}) }, data }) : await context.request.get(base + path, { headers: cookie ? { cookie } : {} });
  assert.equal(response.status(), 200, `${path}: ${await response.text()}`);
  return response.json();
};
const shift = n => { const d = new Date(chileToday() + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const created = [];
let cookie = "";
const page = await context.newPage(); page.setDefaultTimeout(15000);
const errors = []; page.on('pageerror', error => errors.push(error.message));
try {
  const login = await context.request.post(base + '/api/auth/login', { headers: { origin: base }, data: { username: 'qa_vigilancia', password: 'vigilancia-local-1' } });
  assert.equal(login.status(), 200);
  cookie = login.headers()['set-cookie'].split(';')[0];
  await context.addCookies([{ name: 'buho_session', value: cookie.slice(cookie.indexOf('=') + 1), url: base, secure: false, httpOnly: true, sameSite: 'Lax' }]);
  const snapshot = (await http('/api/demo')).data;
  assert.equal(snapshot.organizationName, 'QA vigilancia aislada', 'Never operate on other local portfolios');
  const caseItem = snapshot.cases.find(item => item.id === 'QA-0');
  assert.ok(caseItem);
  await http('/api/inapi/enroll', { applicationNumber: '202', confirm: true }); // the server replays a synthetic source
  const applications = (await http('/api/registrations')).applications;
  const first = applications.find(item => item.applicationNumber === '100');
  const second = applications.find(item => item.applicationNumber === '202');
  assert.ok(first && second);
  async function add(kind, entityId, title, dueDate, status = 'pending') {
    const task = { id: randomUUID(), title, dueDate, status, priority: 'Alta', assigneeId: snapshot.users[0].id };
    await http(kind === 'case' ? '/api/demo' : '/api/tasks', kind === 'case' ? { action: 'saveCaseTask', id: entityId, task, compact: true } : { action: 'save', entityType: 'application', entityId, task });
    created.push({ kind, entityId, task }); return task;
  }
  const a = await add('application', first.id, 'QA contactar al cliente', shift(1));
  const b = await add('application', second.id, 'QA pagar publicación', shift(2));
  const c = await add('case', caseItem.id, 'QA preparar escrito', shift(3));
  await add('application', first.id, 'QA gestión sin fecha', null);
  await add('application', first.id, 'QA tarea completada', shift(1), 'completed');
  await add('application', first.id, 'QA tarea no aplica', shift(1), 'not-applicable');
  await add('case', 'QA-4', 'QA caso concluido', shift(1));
  await add('application', second.id, 'QA próxima fuera del resumen', shift(20));
  let failRemoval = false; const writes = [];
  await page.route('**/api/tasks', async route => {
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON(); writes.push(input);
      if (failRemoval && input.action === 'delete') { failRemoval = false; await route.fulfill({ status: 500, json: { message: 'Fallo local simulado' } }); return; }
    }
    await route.continue();
  });
  await page.goto(base + '/app');
  const later = page.getByRole('button', { name: 'Lo veo después' }); await later.waitFor(); await later.click(); await page.locator('dialog.release-welcome').waitFor({ state: 'hidden' });
  const panel = page.locator('.dashboard-next-agenda');
  await panel.getByText(a.title, { exact: true }).waitFor();
  assert.deepEqual(await panel.locator('.dashboard-agenda-row strong').allTextContents(), [a.title, b.title, c.title]);
  assert.equal(await page.locator('.buho-metrics button').last().locator('strong').innerText(), '3');
  assert.match(await panel.innerText(), /Marca QA 100/);
  assert.match(await panel.innerText(), /Marca QA 202/);
  await mkdir('outputs/agenda-qa', { recursive: true });
  await page.screenshot({ path: 'outputs/agenda-qa/resumen-desktop.png', fullPage: true });
  await panel.getByRole('button', { name: 'Ver calendario →', exact: true }).click();
  const calendar = page.getByRole('dialog', { name: 'Agenda de casos y solicitudes', exact: true });
  await calendar.waitFor();
  assert.ok(await calendar.getByText(a.title, { exact: true }).count());
  assert.ok(await calendar.getByText(b.title, { exact: true }).count());
  assert.ok(await calendar.getByText(c.title, { exact: true }).count());
  assert.ok(await calendar.getByText('QA gestión sin fecha', { exact: true }).count());
  await page.screenshot({ path: 'outputs/agenda-qa/calendario-desktop.png', fullPage: true });
  await page.keyboard.press('Escape'); await calendar.waitFor({ state: 'hidden' });
  await panel.locator('.dashboard-agenda-row button').filter({ hasText: a.title }).click();
  await page.getByRole('heading', { name: first.name, exact: true }).last().waitFor();
  assert.equal(new URL(page.url()).hash, '#registrations');
  await page.getByRole('button', { name: 'Cerrar detalle', exact: true }).click();
  await page.getByRole('button', { name: /^01\s*Resumen Vigilancia$/ }).click();
  await panel.locator('.dashboard-agenda-row button').filter({ hasText: c.title }).click();
  await page.getByRole('heading', { name: caseItem.title, exact: true }).last().waitFor();
  await page.getByRole('button', { name: `Cerrar ${caseItem.title}`, exact: true }).click();
  failRemoval = true;
  await panel.getByRole('button', { name: `Eliminar tarea ${a.title}`, exact: true }).click();
  await panel.getByRole('alert').filter({ hasText: 'No pudimos eliminar' }).waitFor();
  await panel.getByText(a.title, { exact: true }).waitFor();
  assert.ok((await http('/api/registrations')).tasks.some(task => task.id === a.id), 'Rejected deletion preserves the stored task');
  const removedApplication = page.waitForResponse(response => response.url().endsWith('/api/tasks') && response.request().method() === 'POST' && response.request().postDataJSON().taskId === a.id);
  await panel.getByRole('button', { name: `Eliminar tarea ${a.title}`, exact: true }).click();
  await panel.getByText(a.title, { exact: true }).waitFor({ state: 'hidden' });
  assert.equal((await removedApplication).status(), 200);
  assert.deepEqual(writes.at(-1), { action: 'delete', entityType: 'application', entityId: first.id, taskId: a.id });
  assert.ok(!(await http('/api/registrations')).tasks.some(task => task.id === a.id));
  const removedCase = page.waitForResponse(response => response.url().endsWith('/api/tasks') && response.request().method() === 'POST' && response.request().postDataJSON().taskId === c.id);
  await panel.getByRole('button', { name: `Eliminar tarea ${c.title}`, exact: true }).click();
  await panel.getByText(c.title, { exact: true }).waitFor({ state: 'hidden' });
  assert.equal((await removedCase).status(), 200);
  assert.ok(!(await http('/api/demo')).data.cases.find(item => item.id === caseItem.id).tasks.some(task => task.id === c.id));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'outputs/agenda-qa/resumen-mobile.png', fullPage: true });
  await panel.getByRole('button', { name: 'Ver calendario →', exact: true }).click();
  await calendar.waitFor();
  assert.ok(await calendar.getByText(b.title, { exact: true }).count());
  assert.ok(await calendar.evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
  await page.screenshot({ path: 'outputs/agenda-qa/calendario-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  for (const { kind, entityId, task } of created) await context.request.post(base + '/api/tasks', { headers: { origin: base, cookie }, data: { action: 'delete', entityType: kind, entityId, taskId: task.id } });
  let releaseLoad;
  await page.route('**/api/registrations', async route => {
    await new Promise(resolve => { releaseLoad = resolve; });
    await route.fulfill({ status: 500, json: { message: 'Lectura local fallida' } });
  });
  await page.reload();
  await panel.getByRole('status').filter({ hasText: 'Cargando tareas' }).waitFor();
  assert.equal(await panel.getByText('No hay gestiones con fecha registrada.', { exact: true }).count(), 0);
  releaseLoad();
  await panel.getByRole('alert').filter({ hasText: 'No se pudieron actualizar' }).waitFor();
  assert.equal(await panel.getByText('No hay gestiones con fecha registrada.', { exact: true }).count(), 0);
  await page.unroute('**/api/registrations');
  await page.reload();
  await panel.getByText('No hay gestiones con fecha registrada.', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: agenda mixta, máximo tres, orden/contador, completadas/no aplica/sin fecha/concluido, calendario conjunto, apertura de solicitud/caso, eliminación persistente de ambas entidades, rollback, carga/error/vacío y móvil.');
} finally {
  for (const { kind, entityId, task } of created) await context.request.post(base + '/api/tasks', { headers: { origin: base, cookie }, data: { action: 'delete', entityType: kind, entityId, taskId: task.id } });
  await browser.close();
}
