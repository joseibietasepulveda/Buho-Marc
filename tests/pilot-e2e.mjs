// Dedicated throwaway PostgreSQL and app. No hosted credentials or real INAPI calls.
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { hashPassword } from "../lib/password.ts";
import ExcelJS from "exceljs";
import { runAs } from "../lib/tenant-context.ts";
import { correctReceivedToFiled } from "../db/opposition-role.ts";

async function freePort() { const s = createServer(); s.listen(0, "127.0.0.1"); await once(s, "listening"); const port = s.address().port; await new Promise(r => s.close(r)); return port; }
const directory = await mkdtemp(path.join(tmpdir(), "buho-pilot-test-"));
const dbPort = await freePort(), appPort = await freePort();
const base = `http://127.0.0.1:${appPort}`;
const databaseUrl = `postgresql://postgres:isolated-pilot-test@127.0.0.1:${dbPort}/pilot_test`;
const db = new EmbeddedPostgres({ databaseDir: path.join(directory, "postgres"), user: "postgres", password: "isolated-pilot-test", port: dbPort, persistent: false, initdbFlags: ["--locale=C", "--encoding=UTF8"], postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
let server, sql;
let output = "";
const fixtureFile = path.join(directory, "source.json");
function document(id, description, registration = null) {
  return { application_id: id, registration_number: registration, name: `Marca de prueba ${id}`, status: { code: "016", description: "En Trámite" }, dates: { filed_at: "2026-01-01", published_at: "2026-03-01", registered_at: registration ? "2026-05-01" : null, expires_at: registration ? "2036-05-01" : null, last_changed_at: null }, trademark: { sign_type: "Denominativa" }, holders: [{ name: "Titular de prueba", country: "CL" }], representatives: [], classes: [{ nice_class: 35 }], events: [{ event_id: "1", event_date: "2026-05-01", status_code: "001", status_description: description, observation: null, due_date: null }], annotations: [], source: {} };
}
const fixture = { documents: { 1234567: document(1234567, "Concesión de marca", 987654), 2345678: document(2345678, "Aceptación a trámite"), 3456789: document(3456789, "Rechazo definitivo firme"), 4567890: document(4567890, "Traslado de oposición"), 5678901: document(5678901, "Registro vencido", 987655) } };
const saveFixture = () => writeFile(fixtureFile, JSON.stringify(fixture));
async function http(route, { cookie, body, method, origin = base, form } = {}) {
  const response = await fetch(base + route, { method: method ?? (body || form ? "POST" : "GET"), headers: { ...(cookie ? { cookie } : {}), origin, ...(body ? { "content-type": "application/json" } : {}) }, body: form ?? (body ? JSON.stringify(body) : undefined), redirect: "manual" });
  return { response, status: response.status, body: response.headers.get("content-type")?.includes("json") ? await response.json() : await response.text() };
}
async function login(username, password) { const r = await http("/api/auth/login", { body: { username, password } }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.response.headers.get("set-cookie").split(";")[0]; }
try {
  await db.initialise(); await db.start(); await db.createDatabase("pilot_test");
  sql = postgres(databaseUrl, { max: 2, prepare: false });
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  const identities = [];
  for (const name of ["pilot_alice", "pilot_bob"]) {
    const [org] = await sql`INSERT INTO organizations (name, slug) VALUES (${name}, ${name}) RETURNING id`;
    const hash = await hashPassword("pilot-temporary");
    const [user] = await sql`INSERT INTO users (username, name, initials, password_hash, must_change_password) VALUES (${name}, ${name}, 'PT', ${hash}, ${name === "pilot_alice"}) RETURNING id`;
    await sql`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${org.id}, ${user.id}, 'admin')`;
    identities.push({ org: org.id, user: user.id });
  }
  await saveFixture();
  const env = { ...process.env, DATABASE_URL: databaseUrl, SOURCE_PROVIDER: "inapi", INAPI_API_KEY: "isolated-fixture", PILOT_FIXTURE_FILE: fixtureFile, APP_PUBLIC_ORIGIN: base, MONITORING_SCHEDULER_ENABLED: "false", MONITORING_CRON_SECRET: "isolated-cron", INAPI_IMPORT_COHORT: "false", NODE_ENV: "production", PORT: String(appPort) };
  delete env.RAILWAY_PUBLIC_DOMAIN; delete env.SOURCE_API_URL; delete env.DANIEL_INITIAL_PASSWORD;
  server = spawn(process.execPath, ["--import", "./tests/inapi-fixture-hook.mjs", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)], { env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", d => { output = (output + d).slice(-18000); }); server.stderr.on("data", d => { output = (output + d).slice(-18000); });
  for (let i = 0; i < 100; i++) { try { if ((await http("/api/health")).status === 200) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  for (const route of ["/api/demo", "/api/registrations", "/api/clients", "/api/source/admin", "/api/source/status"]) assert.equal((await http(route)).status, 401, route);
  assert.equal((await http("/app")).status, 307);
  let alice = await login("pilot_alice", "pilot-temporary");
  assert.equal((await http("/api/demo", { cookie: alice })).status, 403);
  assert.equal((await http("/api/auth/password", { cookie: alice, body: { currentPassword: "pilot-temporary", password: "pilot-confirmed-password" } })).status, 200);
  const bob = await login("pilot_bob", "pilot-temporary");
  let snapshot = (await http("/api/demo", { cookie: alice })).body.data;
  for (const key of ["brands", "matches", "cases", "notices", "audit"]) assert.equal(snapshot[key].length, 0, key);
  assert.equal((await http("/api/registrations", { cookie: alice })).body.applications.length, 0);
  assert.equal((await http("/api/clients", { cookie: alice })).body.clients.length, 0);
  console.log("PASS: login, forced password change, protected endpoints and empty isolated workspace");

  const workbook = new ExcelJS.Workbook(); workbook.addWorksheet("Cartera").addRows([["numero_solicitud", "estado"], [1234567, "en trámite"], [2345678, "registrada"], [3456789, "concluida"], [5678901, "registrada"], [1234567, "duplicado"], [9999999, ""], ["incorrecto", ""]]);
  const form = new FormData(); form.set("file", new File([await workbook.xlsx.writeBuffer()], "prueba.xlsx"));
  const parsed = await http("/api/portfolio/import", { cookie: alice, form }); assert.equal(parsed.status, 200); assert.equal(parsed.body.duplicates, 1); assert.equal(parsed.body.invalid.length, 1);
  const preview = await http("/api/portfolio/import", { cookie: alice, body: { action: "preview", ids: parsed.body.ids } });
  assert.equal(preview.status, 200, JSON.stringify(preview.body)); assert.equal(preview.body.results.filter(r => r.outcome === "ready").length, 4); assert.equal(preview.body.results.find(r => r.id === "9999999").outcome, "error");
  const ids = ["1234567", "2345678", "3456789", "5678901"];
  assert.equal((await http("/api/portfolio/import", { cookie: alice, body: { action: "import", ids } })).status, 400, "must confirm own portfolio before import");
  const imported = await http("/api/portfolio/import", { cookie: alice, body: { action: "import", ownPortfolioConfirmed: true, ids } }); assert.equal(imported.status, 200, JSON.stringify(imported.body));
  assert.ok(imported.body.results.every(r => r.outcome === "imported"));
  const repeat = await http("/api/portfolio/import", { cookie: alice, body: { action: "import", ownPortfolioConfirmed: true, ids } }); assert.ok(repeat.body.results.every(r => r.outcome === "existing"));
  snapshot = (await http("/api/demo", { cookie: alice })).body.data; assert.equal(snapshot.brands.length, 2); assert.ok(snapshot.brands.every(b => b.status === "Sin monitoreo")); assert.equal(snapshot.matches.length, 0); assert.equal(snapshot.notices.length, 0);
  assert.equal((await http("/api/registrations", { cookie: alice })).body.applications.length, 2);
  assert.equal((await http("/api/demo", { cookie: bob })).body.data.brands.length, 0);
  assert.equal((await http("/api/source/admin", { cookie: bob })).body.records.length, 0);
  assert.equal((await http("/api/demo", { cookie: alice, origin: "https://foreign.invalid", body: { action: "toggleBrandMonitoring", id: snapshot.brands[0].id, enabled: true } })).status, 403);
  assert.notEqual((await http("/api/demo", { cookie: bob, body: { action: "toggleBrandMonitoring", id: snapshot.brands[0].id, enabled: true } })).status, 200);
  console.log("PASS: XLSX parsing, source-based classification, missing IDs, duplicate-safe import and tenant isolation");

  const opposition = { applicationNumber: "4567890", opponent: "Cliente representado", basisCode: snapshot.brands[0].id, confirm: true };
  assert.notEqual((await http("/api/oppositions", { cookie: bob, body: opposition })).status, 200);
  const created = await http("/api/oppositions", { cookie: alice, body: opposition }); assert.equal(created.status, 200, JSON.stringify(created.body));
  assert.equal((await http("/api/oppositions", { cookie: alice, body: opposition })).body.existing, true);
  snapshot = (await http("/api/demo", { cookie: alice })).body.data; assert.equal(snapshot.cases.length, 1); assert.equal(snapshot.brands.length, 2); assert.equal(snapshot.matches.length, 0);
  const item = snapshot.cases[0]; assert.equal(item.proceeding.role, "opponent"); assert.equal(item.proceeding.record.applicationNumber, "4567890"); assert.equal(item.tasks.length, 1);
  const maliciousTask = { id: randomUUID(), title: "Invalid cross-tenant task", status: "pending", priority: "Media" };
  assert.notEqual((await http("/api/demo", { cookie: bob, body: { action: "saveCaseTask", id: item.id, task: maliciousTask } })).status, 200);
  fixture.documents[4567890].events.push({ event_id: "2", event_date: "2026-06-01", status_description: "Se recibe la causa a prueba", status_code: "002", due_date: null });
  fixture.documents[2345678] = document(2345678, "Concesión de marca", 987656);
  await saveFixture();
  const sync = await http("/api/monitoring/sync", { cookie: alice, method: "POST" }); assert.equal(sync.status, 200, JSON.stringify(sync.body)); assert.equal(sync.body.changed, 2);
  snapshot = (await http("/api/demo", { cookie: alice })).body.data;
  assert.equal(snapshot.brands.length, 3); assert.equal(snapshot.cases[0].proceeding.record.status, "evidence-period"); assert.equal(snapshot.cases[0].tasks.length, 2); assert.ok(snapshot.cases[0].tasks.every(t => t.dueDate === null)); assert.equal(snapshot.notices.length, 2); assert.equal(snapshot.matches.length, 0);
  assert.equal((await http("/api/monitoring/sync", { cookie: alice, method: "POST" })).body.notifications, 0);
  assert.equal((await http("/api/demo", { cookie: bob })).body.data.notices.length, 0);
  fixture.fail = true; await saveFixture();
  assert.equal((await http("/api/monitoring/sync", { cookie: alice, method: "POST" })).status, 500);
  assert.equal((await http("/api/demo", { cookie: alice })).body.data.cases[0].tasks.length, 2);
  fixture.fail = false; await saveFixture();
  fixture.documents[6789012] = document(6789012, "Oposición - Presentación C/ antecedentes");
  fixture.documents[7890123] = document(7890123, "Fin de plazo para presentar oposición");
  fixture.documents[8901234] = document(8901234, "Aceptación a trámite");
  await saveFixture();
  const receivedImport = await http("/api/portfolio/import", { cookie: alice, body: { action: "import", ownPortfolioConfirmed: true, ids: ["6789012", "7890123", "8901234"] } });
  assert.equal(receivedImport.status, 200, JSON.stringify(receivedImport.body));
  snapshot = (await http("/api/demo", { cookie: alice })).body.data;
  const received = snapshot.cases.filter(c => c.proceeding?.role === "respondent");
  assert.equal(received.length, 1); assert.equal(received[0].stage, "En seguimiento");
  assert.equal(received[0].proceeding.applicationCode, "IM-R-6789012");
  assert.equal(received[0].tasks.length, 1); assert.equal(received[0].tasks[0].dueDate, null);
  assert.equal(snapshot.notices.length, 2, "import is a baseline, not a new-event alert");
  assert.equal((await sql`SELECT count(*)::int AS n FROM source_snapshots WHERE entity_type = 'case'`)[0].n, 1, "only the filed opposition needs a separate source target");
  const repeatedSnapshots = await Promise.all(Array.from({ length: 3 }, () => http("/api/demo", { cookie: alice })));
  assert.ok(repeatedSnapshots.every(r => r.body.data.cases.filter(c => c.proceeding?.role === "respondent").length === 1));
  fixture.documents[6789012].events.push({ event_id: "2", event_date: "2026-06-01", status_description: "Traslado de oposición", status_code: "002" });
  fixture.documents[8901234].events.push({ event_id: "2", event_date: "2026-06-01", status_description: "Oposición - Presentación", status_code: "002" });
  await saveFixture();
  const receivedSync = await http("/api/monitoring/sync", { cookie: alice, method: "POST" });
  assert.equal(receivedSync.status, 200, JSON.stringify(receivedSync.body)); assert.equal(receivedSync.body.notifications, 2);
  snapshot = (await http("/api/demo", { cookie: alice })).body.data;
  assert.equal(snapshot.cases.filter(c => c.proceeding?.role === "respondent").length, 2);
  assert.equal(snapshot.cases.find(c => c.id === received[0].id).tasks.length, 2);
  assert.equal(snapshot.notices.filter(n => n.changeDetail?.caseId === received[0].id).length, 1);
  assert.equal((await http("/api/monitoring/sync", { cookie: alice, method: "POST" })).body.notifications, 0);
  assert.equal((await http("/api/demo", { cookie: bob })).body.data.cases.length, 0);
  fixture.documents[6789012].registration_number = 987657;
  fixture.documents[6789012].dates.registered_at = "2026-06-02";
  fixture.documents[6789012].events.push({ event_id: "grant", event_date: "2026-06-02", status_description: "Concesión de marca", status_code: "003" });
  await saveFixture();
  assert.equal((await http("/api/monitoring/sync", { cookie: alice, method: "POST" })).body.notifications, 1);
  fixture.documents[6789012].events.push({ event_id: "title", event_date: "2026-06-03", status_description: "Título de marca emitido", status_code: "004" });
  await saveFixture();
  assert.equal((await http("/api/monitoring/sync", { cookie: alice, method: "POST" })).body.notifications, 1, "brand takes over the single source after registration");
  snapshot = (await http("/api/demo", { cookie: alice })).body.data;
  assert.equal(snapshot.cases.find(c => c.id === received[0].id).proceeding.record.status, "registered");
  assert.equal(snapshot.cases.find(c => c.id === received[0].id).tasks.length, 4);
  assert.equal((await http("/api/demo", { cookie: alice, body: { action: "moveCase", id: received[0].id, stage: "Concluido" } })).status, 200);
  const secondReceived = snapshot.cases.find(c => c.proceeding?.record.applicationNumber === "8901234");
  assert.equal((await http("/api/demo", { cookie: alice, body: { action: "discardCase", id: secondReceived.id } })).status, 200);
  fixture.documents[6789012].events.push({ event_id: "3", event_date: "2026-07-01", status_description: "Contestación de oposición", status_code: "003" });
  fixture.documents[8901234].events.push({ event_id: "3", event_date: "2026-07-01", status_description: "Traslado de oposición", status_code: "003" });
  await saveFixture();
  assert.equal((await http("/api/monitoring/sync", { cookie: alice, method: "POST" })).status, 200);
  snapshot = (await http("/api/demo", { cookie: alice })).body.data;
  assert.equal(snapshot.cases.find(c => c.id === received[0].id).stage, "Concluido");
  assert.equal(snapshot.cases.find(c => c.id === received[0].id).tasks.length, 4);
  assert.equal(snapshot.cases.some(c => c.id === secondReceived.id), false);
  assert.equal((await sql`SELECT count(*)::int AS n FROM cases WHERE proceeding->>'role' = 'respondent'`)[0].n, 2);
  // Simulate an application imported before this feature, then concurrently open Cases.
  await sql`UPDATE source_snapshots SET data = jsonb_set(data, '{status}', '"opposition-answer"'::jsonb) WHERE organization_id = ${identities[0].org} AND public_code = 'IM-R-7890123'`;
  await Promise.all(Array.from({ length: 3 }, () => http("/api/demo", { cookie: alice })));
  assert.equal((await sql`SELECT count(*)::int AS n FROM cases WHERE proceeding->>'role' = 'respondent'`)[0].n, 3);
  console.log("PASS: received oppositions on import, daily sync and backfill; second column, shared alerts, no duplicate targets, isolation and closed/discarded preservation");
  const correctionSql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await runAs({ organizationId: identities[0].org, userId: identities[0].user, name: "pilot_alice", organizationName: "pilot_alice", role: "admin", mustChangePassword: false }, () => correctionSql.begin(tx => correctReceivedToFiled(tx, "7890123")));
  } finally { await correctionSql.end(); }
  assert.equal((await http("/api/registrations", { cookie: alice })).body.applications.some(a => a.applicationNumber === "7890123"), false);
  const rolePreview = await http("/api/portfolio/import", { cookie: alice, body: { action: "preview", ids: ["7890123"] } });
  assert.equal(rolePreview.body.results[0].outcome, "opposition");
  const roleImport = await http("/api/portfolio/import", { cookie: alice, body: { action: "import", ownPortfolioConfirmed: true, ids: ["7890123"] } });
  assert.equal(roleImport.body.results[0].outcome, "opposition");
  assert.notEqual((await http("/api/inapi/enroll", { cookie: alice, body: { applicationNumber: "7890123", confirm: true } })).status, 200);
  fixture.documents[7890123].events.push({ event_id: "filed-next", event_date: "2026-07-02", status_description: "Traslado de oposición", status_code: "005" });
  await saveFixture();
  assert.equal((await http("/api/monitoring/sync", { cookie: alice, method: "POST" })).body.notifications, 1);
  snapshot = (await http("/api/demo", { cookie: alice })).body.data;
  const correctedCase = snapshot.cases.find(c => c.proceeding?.record.applicationNumber === "7890123");
  assert.equal(correctedCase.proceeding.role, "opponent");
  assert.ok(snapshot.notices.some(n => n.changeDetail?.caseId === correctedCase.id && n.title.startsWith("Oposición presentada")));
  assert.equal((await http("/api/monitoring/sync", { cookie: alice, method: "POST" })).body.notifications, 0);
  console.log("PASS: corrected role disappears from own portfolio, survives reimport, and follows only the contrary dossier with a single notice");
  assert.equal((await http("/api/auth/logout", { cookie: alice, method: "POST" })).status, 200);
  assert.equal((await http("/api/demo", { cookie: alice })).status, 401);
  console.log("PASS: opposition role/basis validation, automatic source tracking, review tasks, grant promotion, idempotency, failure preservation and logout");
  // Browser review can use the disposable accounts; no Daniel records are touched.
  if (process.env.PILOT_KEEP_SERVER === "1") {
    console.log(`BROWSER_REVIEW_READY ${base} (pilot_alice / pilot-confirmed-password). Fixture: ${directory}`);
    await new Promise(resolve => { process.once("SIGINT", resolve); process.once("SIGTERM", resolve); });
  }
} catch (error) { console.error(output); throw error; }
finally { if (server) { server.kill("SIGTERM"); await once(server, "exit"); } if (sql) await sql.end(); await db.stop(); }
