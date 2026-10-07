// Dedicated throwaway PostgreSQL and app. No hosted credentials or real INAPI calls.
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
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
import { provisionReportProfiles, REPORT_PROFILE_DEV_ENVIRONMENT } from "../db/report-profile-provision.ts";

async function freePort() { const s = createServer(); s.listen(0, "127.0.0.1"); await once(s, "listening"); const port = s.address().port; await new Promise(r => s.close(r)); return port; }
const directory = await mkdtemp(path.join(tmpdir(), "buho-pilot-test-"));
const dbPort = await freePort(), appPort = process.env.PILOT_APP_PORT ? Number(process.env.PILOT_APP_PORT) : await freePort();
assert.ok(Number.isInteger(appPort) && appPort >= 1024 && appPort <= 65535, "PILOT_APP_PORT debe ser un puerto local válido");
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
  const env = { ...process.env, OPENROUTER_API_KEY:"isolated-fixture", DATABASE_URL: databaseUrl, SOURCE_PROVIDER: "inapi", INAPI_API_KEY: "isolated-fixture", PILOT_FIXTURE_FILE: fixtureFile, APP_PUBLIC_ORIGIN: base, MONITORING_SCHEDULER_ENABLED: "false", MONITORING_CRON_SECRET: "isolated-cron", INAPI_IMPORT_COHORT: "false", NODE_ENV: "production", PORT: String(appPort) };
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

  for(const slug of ['zamora-ip','fa-abogados','daniel-morales'])await sql`INSERT INTO organizations (name,slug) VALUES (${slug},${slug})`;
  await sql`INSERT INTO organizations (name,slug) VALUES ('Juan Pablo Zamora','estudio-zamora-piloto')`;
  await assert.rejects(provisionReportProfiles(sql,'production'),/únicamente en Dev/);
  assert.equal((await provisionReportProfiles(sql,REPORT_PROFILE_DEV_ENVIRONMENT)).length,4);
  assert.equal((await sql`SELECT report_profile FROM organizations WHERE slug='estudio-zamora-piloto'`)[0].report_profile.studioName,'Zamora IP');
  const profiles=await sql`SELECT slug,report_profile,report_profile_version FROM organizations WHERE slug IN ('zamora-ip','fa-abogados','daniel-morales')`;
  assert.equal(profiles.find(row=>row.slug==='zamora-ip').report_profile.lawyerName,'Juan Pablo Zamora Iturra');
  assert.match(profiles.find(row=>row.slug==='fa-abogados').report_profile.logo,/^data:image\/png;base64/);
  assert.equal(profiles.find(row=>row.slug==='daniel-morales').report_profile.lawyerName,'Daniel Morales Sorondo');
  assert.match(profiles.find(row=>row.slug==='daniel-morales').report_profile.address,/Torre Coraceros/);
  await sql`UPDATE organizations SET report_profile='{}'::jsonb,report_profile_version=2 WHERE slug='fa-abogados'`;
  assert.deepEqual(await provisionReportProfiles(sql,REPORT_PROFILE_DEV_ENVIRONMENT),[]);
  assert.deepEqual((await sql`SELECT report_profile FROM organizations WHERE slug='fa-abogados'`)[0].report_profile,{});
  console.log('PASS: study defaults are scoped to Dev and never replace saved edits or an intentionally cleared profile');

  const study={studioName:"Estudio de prueba",address:"Dirección de prueba 123",lawyerName:"Abogada de prueba",email:"prueba@estudio.cl",phone:"+56 9 1234 5678",website:"https://estudio.cl",logo:""};
  assert.equal((await http("/api/report-profile")).status,401);
  assert.equal((await http("/api/report-profile",{cookie:alice})).body.version,0);
  const logo="data:image/png;base64,"+(await readFile("public/reports/studio-logo.png")).toString("base64");
  const savedStudy=await http("/api/report-profile",{cookie:alice,method:"PUT",body:{profile:{...study,logo},version:0}});
  assert.equal(savedStudy.status,200,JSON.stringify(savedStudy.body)); assert.equal(savedStudy.body.version,1); assert.match(savedStudy.body.profile.logo,/^data:image\/png/);
  assert.equal((await http("/api/report-profile",{cookie:alice})).body.profile.studioName,study.studioName);
  assert.equal((await http("/api/report-profile",{cookie:bob})).body.profile.studioName,"");
  assert.equal((await http("/api/report-profile",{cookie:alice,method:"PUT",body:{profile:study,version:0}})).status,409);
  assert.equal((await http("/api/report-profile",{cookie:alice,origin:"https://foreign.invalid",method:"PUT",body:{profile:study,version:1}})).status,403);
  assert.equal((await http("/api/report-profile",{cookie:alice,method:"PUT",body:{profile:{...study,logo:"data:image/png;base64,YWJj"},version:1}})).status,422);
  const conclusionMark=id=>({applicationId:id,registrationId:null,name:"Marca "+id,type:"Denominativa",image:"",holders:[{name:"Titular"}],classes:[{nice_class:30,coverage_text:"Confites"}],filedAt:null,publishedAt:null,registeredAt:null,status:"Registrada",statusCode:"R",score:.8,channels:{name:{rank:1}},history:[{date:"2026-01-01",title:"Actuación de prueba"}]});
  const conclusionInput={proposal:{name:"Propuesta de prueba",coverage:[{nice_class:30,text:"Confites"}]},result:{query:conclusionMark(""),results:[conclusionMark("111"),conclusionMark("222")],groups:[],warnings:[],candidateCount:2,elapsedSeconds:1,fetchedAt:"2026-10-02T12:00:00Z"},selectedIds:["111"]};
  const simultaneous=await Promise.all([1,2].map(()=>http("/api/feasibility/conclusions",{cookie:alice,body:conclusionInput})));
  assert.ok(simultaneous.every(result=>[200,202].includes(result.status)),JSON.stringify(simultaneous));
  const prepared=await http("/api/feasibility/conclusions",{cookie:alice,body:conclusionInput}); assert.equal(prepared.status,200,JSON.stringify(prepared.body));
  assert.equal(prepared.body.conclusion.source,"openrouter");
  const generationId=prepared.body.conclusion.generationId;
  assert.equal((await http("/api/feasibility/conclusions/"+generationId,{cookie:alice})).body.conclusion.generationId,generationId);
  assert.equal((await http("/api/feasibility/conclusions/"+generationId,{cookie:bob})).status,404);
  assert.equal((await http("/api/feasibility/conclusions",{cookie:alice,body:conclusionInput})).body.conclusion.generationId,generationId);
  const records=await sql`SELECT * FROM feasibility_conclusions WHERE organization_id=${identities[0].org}`;
  assert.equal(records.length,1); assert.equal(Number(records[0].cost),.000136); assert.equal(records[0].usage.completion_tokens,60); assert.equal(records[0].input.search.results.length,2);
  assert.equal((await readFile(fixtureFile+".llm.jsonl","utf8")).trim().split("\n").length,1,"identical downloads should make one provider call");
  fixture.llmFail=true; await saveFixture();
  const failed=await http("/api/feasibility/conclusions",{cookie:alice,body:{...conclusionInput,client:"Otra consulta"}});
  assert.equal(failed.status,200); assert.equal(failed.body.conclusion.source,"deterministic"); assert.equal(failed.body.conclusion.recommendation,"adjust"); assert.ok(failed.body.conclusion.paragraphs.length);
  fixture.llmFail=false; await saveFixture();
  console.log("PASS: optional study profile, normalized logo, conflict protection, tenant isolation, persistent deduplicated conclusions, usage and deterministic fallback");

  const workbook = new ExcelJS.Workbook(); workbook.addWorksheet("Cartera").addRows([["numero_solicitud", "estado"], [1234567, "en trámite"], [2345678, "registrada"], [3456789, "concluida"], [5678901, "registrada"], [1234567, "duplicado"], [9999999, ""], ["incorrecto", ""]]);
  const form = new FormData(); form.set("file", new File([await workbook.xlsx.writeBuffer()], "prueba.xlsx"));
  const parsed = await http("/api/portfolio/import", { cookie: alice, form }); assert.equal(parsed.status, 200); assert.equal(parsed.body.duplicates, 1); assert.equal(parsed.body.invalid.length, 1);
  const preview = await http("/api/portfolio/import", { cookie: alice, body: { action: "preview", ids: parsed.body.ids } });
  assert.equal(preview.status, 200, JSON.stringify(preview.body)); assert.equal(preview.body.results.filter(r => r.outcome === "ready").length, 4); assert.equal(preview.body.results.find(r => r.id === "9999999").outcome, "error");
  assert.equal((await http("/api/inapi/logo/1234567")).status, 401);
  const successfulLogo = await http("/api/inapi/logo/1234567", { cookie: alice });
  assert.equal(successfulLogo.status, 200);
  assert.equal(successfulLogo.response.headers.get("cache-control"), "private, max-age=3600");
  assert.equal(successfulLogo.response.headers.get("content-type"), "image/png");
  assert.equal((await http("/api/inapi/logo/not-a-number", { cookie: alice })).status, 400);
  fixture.logoFailures = { "2345678": "always" }; await saveFixture();
  const unavailableLogo = await http("/api/inapi/logo/2345678", { cookie: alice });
  assert.equal(unavailableLogo.status, 503);
  assert.equal(unavailableLogo.response.headers.get("cache-control"), "no-store");
  delete fixture.logoFailures; await saveFixture();
  assert.equal((await http("/api/inapi/logo/2345678?retry=1", { cookie: alice })).status, 200);
  console.log("PASS: private logo cache, session protection and recovery after source outage");
  const ids = ["1234567", "2345678", "3456789", "5678901"];
  const imported = await http("/api/portfolio/import", { cookie: alice, body: { action: "import", ids } }); assert.equal(imported.status, 200, JSON.stringify(imported.body));
  assert.ok(imported.body.results.every(r => r.outcome === "imported"));
  const repeat = await http("/api/portfolio/import", { cookie: alice, body: { action: "import", ownPortfolioConfirmed: true, ids } }); assert.ok(repeat.body.results.every(r => r.outcome === "existing"));
  snapshot = (await http("/api/demo", { cookie: alice })).body.data; assert.equal(snapshot.brands.length, 2); assert.ok(snapshot.brands.every(b => b.status === "En monitoreo")); assert.equal(snapshot.matches.length, 0); assert.equal(snapshot.notices.length, 0);
  assert.equal((await http("/api/registrations", { cookie: alice })).body.applications.length, 2);
  assert.ok(snapshot.brands.every(b => !b.clientId), "unassigned import does not invent a client");
  assert.ok((await http("/api/registrations", { cookie: alice })).body.applications.every(a => !a.clientId));
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
  async function addNotice(org, code, title, brand = "QUILLAY URBANO") {
    const [notice] = await sql`INSERT INTO notifications (organization_id, public_code, entity_type, entity_id, type, title, brand_name, urgency) VALUES (${org}, ${code}, 'application', ${randomUUID()}, 'source_change', ${title}, ${brand}, 'Alta') RETURNING id`;
    await sql`INSERT INTO email_drafts (organization_id, notification_id, subject, body) VALUES (${org}, ${notice.id}, ${title}, 'Antecedente de prueba. Consulta el expediente para revisar los datos completos.')`;
    return notice.id;
  }
  const priorityId = await addNotice(identities[0].org, 'UX-PRIORITY', 'Publicación en Diario Oficial');
  const adminId = await addNotice(identities[0].org, 'UX-ADMIN', 'Cambio de representante');
  const otherId = await addNotice(identities[1].org, 'UX-OTHER', 'Concesión de marca');
  const beforeClear = (await http('/api/demo', { cookie: alice })).body.data.notices;
  assert.equal((await http('/api/notifications', { cookie: alice, method: 'PATCH', body: { scope: 'all' } })).status, 400);
  assert.equal((await http('/api/notifications', { cookie: alice, origin: 'https://foreign.invalid', method: 'PATCH', body: { scope: 'priority' } })).status, 403);
  const clearedPriority = await http('/api/notifications', { cookie: alice, method: 'PATCH', body: { scope: 'priority' } });
  assert.equal(clearedPriority.status, 200); assert.equal(clearedPriority.body.action, 'reviewed');
  assert.ok(clearedPriority.body.ids.includes('UX-PRIORITY')); assert.ok(!clearedPriority.body.ids.includes('UX-ADMIN'));
  const afterClear = (await http('/api/demo', { cookie: alice })).body.data.notices;
  assert.equal(afterClear.length, beforeClear.length, 'priority clearing must preserve every notice in the inbox');
  assert.equal(afterClear.find(n => n.id === 'UX-PRIORITY').status, 'Gestionada');
  assert.equal(afterClear.find(n => n.id === 'UX-ADMIN').status, 'Pendiente');
  const stored = (await sql`SELECT read_at, managed_at, dismissed_at FROM notifications WHERE id=${priorityId}`)[0];
  assert.ok(stored.read_at && stored.managed_at); assert.equal(stored.dismissed_at, null);
  assert.equal((await sql`SELECT managed_at FROM notifications WHERE id=${otherId}`)[0].managed_at, null);
  assert.equal((await sql`SELECT managed_at FROM notifications WHERE id=${adminId}`)[0].managed_at, null);
  assert.deepEqual((await http('/api/notifications', { cookie: alice, method: 'PATCH', body: { scope: 'priority' } })).body.ids, []);
  const futureId = await addNotice(identities[0].org, 'UX-FUTURE', 'Título de marca emitido');
  assert.equal((await http('/api/demo', { cookie: alice })).body.data.notices.find(n => n.id === 'UX-FUTURE').status, 'Pendiente');
  const legacyClear = await http('/api/notifications', { cookie: alice, method: 'DELETE', body: { scope: 'priority' } });
  assert.equal(legacyClear.body.action, 'reviewed');
  assert.equal((await sql`SELECT dismissed_at FROM notifications WHERE id=${futureId}`)[0].dismissed_at, null);
  const rejectedDelete = await http('/api/notifications', { cookie: bob, method: 'DELETE', body: { id: 'UX-ADMIN' } });
  assert.deepEqual(rejectedDelete.body.ids, []);
  await http('/api/notifications', { cookie: alice, method: 'DELETE', body: { id: 'UX-ADMIN' } });
  assert.ok(!(await http('/api/demo', { cookie: alice })).body.data.notices.some(n => n.id === 'UX-ADMIN'));
  assert.ok((await sql`SELECT dismissed_at FROM notifications WHERE id=${adminId}`)[0].dismissed_at);
  const clearAudit = await sql`SELECT action FROM audit_events WHERE organization_id=${identities[0].org} AND action='notifications.reviewed'`;
  assert.ok(clearAudit.length >= 2);
  console.log('PASS: priority clearing retains history and evidence, clears only pending priorities, is idempotent and tenant-scoped; future notices remain pending; legacy clients cannot discard priorities');
  assert.equal((await http("/api/auth/logout", { cookie: alice, method: "POST" })).status, 200);
  assert.equal((await http("/api/demo", { cookie: alice })).status, 401);
  console.log("PASS: opposition role/basis validation, automatic source tracking, review tasks, grant promotion, idempotency, failure preservation and logout");
  // Browser review can use the disposable accounts; no Daniel records are touched.
  if (process.env.PILOT_KEEP_SERVER === "1") {
    for (let i = 0; i < 56; i++) {
      const titles = ['Solicitud similar detectada: KALIBRA FTGL', 'Cambio de representante', 'Aceptación a trámite', 'Publicación en Diario Oficial', 'Título de marca emitido', 'Solicitud similar detectada: ZENER'];
      await addNotice(identities[0].org, `UX-BROWSER-${i}`, titles[i % titles.length], ['QUILLAY URBANO', 'VENTISCA', 'PULSO', 'TIERRA SUR'][i % 4]);
    }
    console.log(`BROWSER_REVIEW_READY ${base} (pilot_alice / pilot-confirmed-password). Fixture: ${directory}`);
    await new Promise(resolve => { process.once("SIGINT", resolve); process.once("SIGTERM", resolve); });
  }
} catch (error) { console.error(output); throw error; }
finally { if (server) { server.kill("SIGTERM"); await once(server, "exit"); } if (sql) await sql.end(); await db.stop(); }
