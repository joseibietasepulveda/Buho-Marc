import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { INITIAL_APPLICATIONS } from '../lib/registration-data.ts';
import { PROCESS_DEMO_DATE, PROCESS_SCENARIOS } from '../lib/registration-scenarios.ts';
import { registrationDeadlines } from '../lib/registration-procedure.ts';
import { DEMO_V05_MIN_DATE, DEMO_V05_CASE_DATES, DEMO_V05_EXTRA_CASES, upgradeDemoApplicationV05 } from '../lib/demo-v05-data.ts';
import { migrateDemoV05, DEMO_V05_MIGRATION } from '../db/demo-v05.ts';

test('v0.5 active simulated deadlines start on September 30, with coherent completed histories', () => {
  for (const application of [...PROCESS_SCENARIOS, ...INITIAL_APPLICATIONS.map(upgradeDemoApplicationV05)]) {
    let previous = application.filedAt;
    for (const event of application.history) {
      assert.ok(event.date >= previous, `${application.id}: chronological history`);
      assert.ok(event.date <= PROCESS_DEMO_DATE, `${application.id}: no accomplished future event`);
      previous = event.date;
    }
    for (const deadline of registrationDeadlines(application, PROCESS_DEMO_DATE)) {
      if (deadline.dueDate) assert.ok(deadline.dueDate >= DEMO_V05_MIN_DATE, `${application.id}: ${deadline.key} ${deadline.dueDate}`);
    }
  }
  assert.equal(DEMO_V05_EXTRA_CASES.length, 5);
  assert.equal(new Set(DEMO_V05_EXTRA_CASES.map(item => item.match)).size, 5);
  for (const date of Object.values(DEMO_V05_CASE_DATES)) assert.ok(date >= DEMO_V05_MIN_DATE);
});

test('fixture updates are idempotent, preserve later user dates, and reject real providers/unknown records', () => {
  for (const fixture of INITIAL_APPLICATIONS) {
    const once = upgradeDemoApplicationV05(fixture);
    assert.deepEqual(upgradeDemoApplicationV05(once), once);
    const real = { ...fixture, provider: 'inapi' };
    assert.strictEqual(upgradeDemoApplicationV05(real), real);
  }
  const known = INITIAL_APPLICATIONS.find(item => item.id === 'IM-013');
  assert.equal(upgradeDemoApplicationV05({ ...known, deadlineSource: '2026-10-01' }).deadlineSource, '2026-10-01');
  const unknown = { ...known, id: 'USER-013' };
  assert.strictEqual(upgradeDemoApplicationV05(unknown), unknown);
});

test('PostgreSQL migration is atomic, durable/idempotent and isolates real/finished/unrelated rows', { skip: !process.env.DEMO_V05_TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.DEMO_V05_TEST_DATABASE_URL);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Only use the isolated local database');
  const sql = postgres(url.toString(), { prepare: false });
  const rollback = new Error('ROLLBACK_SUCCESSFUL_TEST');
  try {
    await assert.rejects(sql.begin(async tx => {
      const org = randomUUID(), user = randomUUID(), mockBrand = randomUUID(), realBrand = randomUUID();
      const mockCase = randomUUID(), realCase = randomUUID(), finishedCase = randomUUID();
      const mockApp = randomUUID(), realApp = randomUUID();
      const pending = randomUUID(), completed = randomUUID(), realTask = randomUUID();
      await tx`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'Disposable v0.5 test', ${'test-' + org})`;
      await tx`INSERT INTO users (id, email, name, initials) VALUES (${user}, ${user + '@example.test'}, 'Test', 'T')`;
      await tx`INSERT INTO brands (id, organization_id, public_code, name, word_mark, owner_name, monitoring_config) VALUES (${mockBrand}, ${org}, 'MOCK', 'Mock', 'Mock', 'Mock', ${tx.json({ provider: 'mock' })}), (${realBrand}, ${org}, 'REAL', 'Real', 'Real', 'Real', ${tx.json({ provider: 'inapi' })})`;
      for (const [id, brand, code, status, stage] of [[mockCase, mockBrand, 'MOCK-C', 'active', 'En seguimiento'], [realCase, realBrand, 'REAL-C', 'active', 'En seguimiento'], [finishedCase, mockBrand, 'DONE-C', 'closed', 'Concluido']]) {
        await tx`INSERT INTO cases (id, organization_id, public_code, brand_id, client_name, title, status, stage, next_deadline) VALUES (${id}, ${org}, ${code}, ${brand}, 'Test', ${code}, ${status}, ${stage}, '2026-08-01')`;
      }
      for (const [id, caseId, status] of [[pending, mockCase, 'pending'], [completed, mockCase, 'completed'], [realTask, realCase, 'pending']]) await tx`INSERT INTO case_tasks (id, organization_id, case_id, title, status, due_at) VALUES (${id}, ${org}, ${caseId}, 'Preserve task', ${status}, '2026-08-02T12:00:00Z')`;
      const legacy = { ...INITIAL_APPLICATIONS.find(item => item.id === 'IM-013'), deadlineSource: '2026-07-17', procedure: undefined };
      const real = { ...legacy, id: 'IM-014', provider: 'inapi' };
      await tx`INSERT INTO registration_applications (id, organization_id, public_code, data) VALUES (${mockApp}, ${org}, 'IM-013', ${tx.json(legacy)}), (${realApp}, ${org}, 'IM-014', ${tx.json(real)})`;
      assert.equal((await migrateDemoV05(tx, org, user)).alreadyApplied, false);
      assert.equal((await migrateDemoV05(tx, org, user)).alreadyApplied, true);
      const cases = await tx`SELECT id, next_deadline::text AS due FROM cases WHERE organization_id = ${org}`;
      assert.equal(cases.find(row => row.id === mockCase).due, DEMO_V05_MIN_DATE);
      assert.equal(cases.find(row => row.id === realCase).due, '2026-08-01');
      assert.equal(cases.find(row => row.id === finishedCase).due, '2026-08-01');
      const tasks = await tx`SELECT id, due_at::date::text AS due FROM case_tasks WHERE organization_id = ${org}`;
      assert.equal(tasks.find(row => row.id === pending).due, DEMO_V05_MIN_DATE);
      assert.equal(tasks.find(row => row.id === completed).due, '2026-08-02');
      assert.equal(tasks.find(row => row.id === realTask).due, '2026-08-02');
      const apps = await tx`SELECT id, data FROM registration_applications WHERE organization_id = ${org}`;
      assert.equal(apps.find(row => row.id === mockApp).data.deadlineSource, '2026-08-24');
      assert.deepEqual(apps.find(row => row.id === realApp).data, JSON.parse(JSON.stringify(real)));
      const audit = await tx`SELECT before_data, after_data FROM audit_events WHERE organization_id = ${org} AND action = ${DEMO_V05_MIGRATION}`;
      assert.equal(audit.length, 1);
      assert.ok(audit[0].before_data.tasks.length);
      assert.equal(audit[0].after_data.minimumDemoDate, DEMO_V05_MIN_DATE);
      throw rollback;
    }), error => error === rollback);
  } finally { await sql.end(); }
});
