import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getSql } from '../db/index.ts';
import { enqueueInapiRecovery, processInapiRecovery, officialRequestGate } from '../db/inapi-recovery.ts';
import { act, fixture, application, officialFetcher } from './fixtures/inapi-recovery.mjs';

test('persistent recovery: global pacing, shared deduplication, single attempt, provider completion and safe projections', { timeout: 120000 }, async () => {
  const port = await new Promise(resolve => { const server = createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'buho-inapi-recovery-'));
  const pg = new EmbeddedPostgres({ databaseDir: path.join(directory, 'pg'), user: 'postgres', password: 'isolated-recovery', port, persistent: false, initdbFlags: ['--locale=C', '--encoding=UTF8'], postgresFlags: ['-h', '127.0.0.1'], onLog() {}, onError() {} });
  let sql;
  try {
    await pg.initialise(); await pg.start(); await pg.createDatabase('recovery_test');
    process.env.DATABASE_URL = `postgresql://postgres:isolated-recovery@127.0.0.1:${port}/recovery_test`;
    process.env.SOURCE_PROVIDER = 'inapi'; delete process.env.INAPI_DIRECT_RECOVERY_ENABLED;
    const migration = postgres(process.env.DATABASE_URL, { max: 1, onnotice() {} });
    await migrate(drizzle(migration), { migrationsFolder: 'drizzle' }); await migration.end();
    sql = getSql();
    const base = fixture();
    const [source] = await sql`INSERT INTO source_records (application_number, data) VALUES (${base.applicationNumber}, ${sql.json(base)}) RETURNING id`;
    for (const name of ['A', 'B']) {
      const [org] = await sql`INSERT INTO organizations (name, slug) VALUES (${name}, ${name.toLowerCase()}) RETURNING id`;
      const [app] = await sql`INSERT INTO registration_applications (organization_id, public_code, data) VALUES (${org.id}, 'TEST-1', ${sql.json(application(base))}) RETURNING id`;
      await sql`INSERT INTO source_snapshots (organization_id, entity_id, entity_type, public_code, source_id, data) VALUES (${org.id}, ${app.id}, 'application', 'TEST-1', ${source.id}, ${sql.json(base)})`;
    }
    await sql.begin(tx => enqueueInapiRecovery(tx, source.id, base));
    await sql.begin(tx => enqueueInapiRecovery(tx, source.id, base));
    assert.equal((await sql`SELECT count(*)::int AS count FROM inapi_recovery_jobs`)[0].count, 1);
    process.env.INAPI_DIRECT_RECOVERY_DAILY_LIMIT = '0';
    assert.equal((await processInapiRecovery(() => { throw new Error('zero budget must not fetch'); })).reason, 'daily-limit');
    delete process.env.INAPI_DIRECT_RECOVERY_DAILY_LIMIT;
    const starts = []; const mock = officialFetcher();
    const results = await Promise.all([processInapiRecovery(async (...args) => { starts.push(Date.now()); return mock.fetcher(...args); }), processInapiRecovery(() => { throw new Error('second worker must not fetch'); })]);
    assert.equal(results.filter(result => result.completed).length, 1);
    assert.equal(results.filter(result => result.skipped).length, 1);
    assert.equal(mock.calls(), 3);
    for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= 3000, JSON.stringify(starts));
    assert.equal((await sql`SELECT status FROM inapi_recovery_jobs`)[0].status, 'unresolved');
    await sql.begin(tx => enqueueInapiRecovery(tx, source.id, base));
    assert.equal((await processInapiRecovery(() => { throw new Error('same need must not repeat'); })).reason, 'empty');
    for (const row of await sql`SELECT data FROM registration_applications`) assert.equal(row.data.procedure.notifiedAt, undefined);

    // A separate process/connection observes the persisted global timestamp.
    const [clock] = await sql`SELECT last_finished_at FROM inapi_request_clock WHERE id = 1`;
    const childStarted = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', './tests/ts-loader.mjs', '--input-type=module', '-e', "import { officialRequestGate } from './db/inapi-recovery.ts'; import { getSql } from './db/index.ts'; await officialRequestGate(async () => console.log(Date.now())); await getSql().end();"], { env: process.env });
      let stdout = '', stderr = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('exit', code => code === 0 ? resolve(Number(stdout.trim())) : reject(new Error(stderr)));
    });
    assert.ok(childStarted - new Date(clock.last_finished_at).getTime() >= 3000);
    const beforeFailure = Date.now();
    await assert.rejects(officialRequestGate(async () => {
      // Another connection sees the reservation already committed while the
      // HTTP exchange is in progress; a process crash cannot roll it back.
      const [reservation] = await sql`SELECT blocked_until FROM inapi_request_clock WHERE id = 1`;
      assert.ok(new Date(reservation.blocked_until).getTime() - Date.now() >= 22000);
      throw new Error('fixture outage');
    }), /fixture outage/);
    assert.ok(new Date((await sql`SELECT last_finished_at FROM inapi_request_clock WHERE id = 1`)[0].last_finished_at).getTime() >= beforeFailure);

    // Completing one obligation does not repeat another obligation from the
    // same earlier recovery. A genuinely new act creates a new attempt.
    const mixed = fixture([act('Traslado de oposición y observaciones de fondo', 'mixed')]);
    await sql.begin(tx => enqueueInapiRecovery(tx, source.id, mixed));
    const remaining = fixture([act('Traslado de oposición y observaciones de fondo', 'mixed'), act('Cumplimiento de observaciones de fondo', 'answer', '2026-07-02')]);
    await sql.begin(tx => enqueueInapiRecovery(tx, source.id, remaining));
    assert.equal((await sql`SELECT count(*)::int AS count FROM inapi_recovery_jobs`)[0].count, 2);
    await sql`UPDATE source_records SET data = ${sql.json(remaining)} WHERE id = ${source.id}`;
    const failure = await processInapiRecovery(async () => new Response('outage', { status: 503 }));
    assert.equal(failure.failed, true);
    assert.equal((await processInapiRecovery(() => { throw new Error('cooldown'); })).reason, 'cooldown');
    assert.equal((await sql`SELECT count(*)::int AS count FROM inapi_recovery_jobs WHERE status = 'failed'`)[0].count, 1);
    await sql`UPDATE inapi_request_clock SET blocked_until = NULL WHERE id = 1`;

    const newAct = fixture([act('Observaciones de fondo', 'new', '2026-08-01')]);
    await sql`UPDATE source_records SET data = ${sql.json(newAct)} WHERE id = ${source.id}`;
    await sql.begin(tx => enqueueInapiRecovery(tx, source.id, newAct));
    const proof = { version: 1, act_id: 'new', kind: 'notification', date: '2026-08-03', object: 'substantive-examination', recipient_role: 'applicant', method: 'inapi-inbox', reference: 'Ficticio', document_url: 'https://example.org/proof' };
    const complete = fixture([act('Observaciones de fondo', 'new', '2026-08-01', { legal_facts: [proof] })]);
    await sql`UPDATE source_records SET data = ${sql.json(complete)} WHERE id = ${source.id}`;
    assert.equal((await processInapiRecovery(() => { throw new Error('provider completed date; must not fetch'); })).cancelled, true);
    assert.equal((await sql`SELECT count(*)::int AS count FROM inapi_recovery_jobs WHERE status = 'running'`)[0].count, 0);

    // Concurrent imports with overlapping subsets reserve each fact once.
    const publicationOnly = { ...fixture([act('Oposición - Presentación de demanda')]), applicationNumber: '999002', publicationDate: null };
    const publicationAndNotice = { ...fixture([act('Observaciones de fondo', 'overlap')]), applicationNumber: '999002', publicationDate: null };
    const [other] = await sql`INSERT INTO source_records (application_number, data) VALUES ('999002', ${sql.json(publicationAndNotice)}) RETURNING id`;
    await Promise.all([sql.begin(tx => enqueueInapiRecovery(tx, other.id, publicationOnly)), sql.begin(tx => enqueueInapiRecovery(tx, other.id, publicationAndNotice))]);
    const overlapping = (await sql`SELECT needs FROM inapi_recovery_jobs WHERE application_number = '999002'`).flatMap(row => row.needs);
    assert.equal(overlapping.filter(need => need === 'publication:999002').length, 1);
    assert.equal(new Set(overlapping).size, overlapping.length);
  } finally {
    if (sql) await sql.end();
    await pg.stop(); await rm(directory, { recursive: true, force: true });
  }
});
