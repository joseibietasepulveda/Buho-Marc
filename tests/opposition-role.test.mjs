import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { runAs } from "../lib/tenant-context.ts";
import { importRealRecord } from "../db/inapi-portfolio.ts";
import { reconcileReceivedOppositions, syncReceivedOpposition } from "../db/received-oppositions.ts";

test("Dev correction preserves Daniel's work, isolates tenants, and cannot reclassify filed oppositions on reimport", async () => {
  const listener = createServer().listen(0, "127.0.0.1"); await once(listener, "listening");
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  const directory = await mkdtemp(path.join(tmpdir(), "buho-role-test-"));
  const databaseUrl = `postgresql://postgres:isolated-test@127.0.0.1:${port}/roles_test`;
  const db = new EmbeddedPostgres({ databaseDir: path.join(directory, "postgres"), user: "postgres", password: "isolated-test", port, persistent: false, initdbFlags: ["--locale=C", "--encoding=UTF8"], postgresFlags: ["-h", "127.0.0.1"], onLog() {}, onError() {} });
  let sql;
  try {
    await db.initialise(); await db.start(); await db.createDatabase("roles_test");
    sql = postgres(databaseUrl, { max: 4, prepare: false, onnotice() {} });
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
    // Drizzle replaces JSON/date serializers; exercise the app with a fresh raw client.
    await sql.end();
    sql = postgres(databaseUrl, { max: 4, prepare: false, onnotice() {} });
    const identities = [];
    const records = ["1629865", "1670802", "1671640", "1638707", "1617903"].map(applicationNumber => ({ provider: "inapi", applicationNumber, registrationNumber: null, name: `Test ${applicationNumber}`, status: "opposition-answer", type: "Mixta", filingDate: "2026-01-01", publicationDate: "2026-03-01", expirationDate: null, registrationDate: null, statusDate: "2026-04-01", owner: "Titular de prueba", ownerRut: "", ownerCountry: "Chile", representativeName: "No informado", representativeCountry: "Chile", classes: [35], logo: "", officialUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx", inapi: { events: [{ event_date: "2026-04-01", status_description: "Traslado de oposición" }] } }));
    for (const name of ["daniel", "other"]) {
      const [org] = await sql`INSERT INTO organizations (name, slug) VALUES (${name}, ${name === "daniel" ? "daniel-morales" : "other"}) RETURNING id`;
      const [user] = await sql`INSERT INTO users (name, initials, username) VALUES (${name}, 'PT', ${name === "daniel" ? "daniel_morales" : "other"}) RETURNING id`;
      await sql`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${org.id}, ${user.id}, 'admin')`;
      const identity = { organizationId: org.id, userId: user.id, name, organizationName: name, role: "admin", mustChangePassword: false }; identities.push(identity);
      await runAs(identity, () => sql.begin(async tx => { for (const record of records) await importRealRecord(tx, record, "application"); }));
    }
    const ownOrg = identities[0].organizationId;
    const before = await sql`SELECT * FROM cases ORDER BY id`;
    const ownCase = before.find(c => c.organization_id === ownOrg && c.proceeding.record.applicationNumber === "1629865");
    await sql`UPDATE cases SET stage = 'Concluido', priority = 'Baja' WHERE id = ${ownCase.id}`;
    const [task] = await sql`INSERT INTO case_tasks (organization_id, case_id, title, status, priority, due_at) VALUES (${ownOrg}, ${ownCase.id}, 'Trabajo editado por usuario', 'completed', 'Baja', '2026-10-01') RETURNING *`;
    const [application] = await sql`SELECT id FROM registration_applications WHERE organization_id = ${ownOrg} AND data->>'applicationNumber' = '1629865'`;
    const [appTask] = await sql`INSERT INTO registration_tasks (organization_id, application_id, title, status, priority, due_date) VALUES (${ownOrg}, ${application.id}, 'Tarea conservada desde la solicitud', 'pending', 'Alta', '2026-10-02') RETURNING *`;
    async function correction(environment) {
      const child = spawn(process.execPath, ["--import", "./tests/ts-loader.mjs", "scripts/correct-daniel-oppositions.ts"], { env: { ...process.env, DATABASE_URL: databaseUrl, RAILWAY_ENVIRONMENT_ID: environment }, stdio: ["ignore", "pipe", "pipe"] });
      let output = ""; child.stdout.on("data", d => output += d); child.stderr.on("data", d => output += d);
      const [code] = await once(child, "close"); assert.equal(code, 0, output); return output;
    }
    await correction("production");
    assert.equal((await sql`SELECT count(*)::int AS n FROM cases WHERE proceeding->>'role' = 'opponent'`)[0].n, 0);
    const first = await correction("9e2891f0-7281-4872-a992-2c48866a782d"); assert.match(first, /corrected/);
    const after = await sql`SELECT * FROM cases ORDER BY id`;
    assert.equal(after.filter(c => c.organization_id === ownOrg && c.proceeding.role === "opponent").length, 3);
    assert.equal(after.filter(c => c.organization_id === ownOrg && c.proceeding.role === "respondent").length, 2);
    assert.deepEqual(after.filter(c => c.organization_id !== ownOrg), before.filter(c => c.organization_id !== ownOrg));
    const corrected = after.find(c => c.id === ownCase.id);
    assert.equal(corrected.stage, "Concluido"); assert.equal(corrected.priority, "Baja"); assert.equal(corrected.public_code, ownCase.public_code); assert.equal(corrected.proceeding.basisCode, undefined);
    assert.deepEqual((await sql`SELECT * FROM case_tasks WHERE id = ${task.id}`)[0], task);
    assert.equal((await sql`SELECT title FROM case_tasks WHERE id = ${appTask.id}`)[0].title, appTask.title);
    assert.equal((await sql`SELECT count(*)::int AS n FROM source_snapshots WHERE organization_id = ${ownOrg} AND entity_type = 'case'`)[0].n, 3);
    assert.equal((await sql`SELECT count(*)::int AS n FROM registration_applications WHERE organization_id = ${ownOrg} AND COALESCE(data->>'portfolioRole', 'own') <> 'third-party'`)[0].n, 2);
    const audit = await sql`SELECT * FROM audit_events WHERE action = 'opposition.role_corrected'`;
    assert.equal(audit.length, 3); assert.ok(audit.every(a => a.before_data.proceeding.role === "respondent"));
    assert.match(await correction("9e2891f0-7281-4872-a992-2c48866a782d"), /already-correct/);
    await runAs(identities[0], async () => {
      await Promise.all([sql.begin(tx => reconcileReceivedOppositions(tx)), sql.begin(tx => syncReceivedOpposition(tx, records[0]))]);
      await assert.rejects(sql.begin(tx => importRealRecord(tx, records[0], "application")), /oposición presentada/);
    });
    assert.equal((await sql`SELECT count(*)::int AS n FROM cases WHERE organization_id = ${ownOrg}`)[0].n, 5);
    assert.equal((await sql`SELECT count(*)::int AS n FROM audit_events WHERE action = 'opposition.role_corrected'`)[0].n, 3);
  } finally { if (sql) await sql.end(); await db.stop(); }
});
