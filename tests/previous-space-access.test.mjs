import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { hashPassword, verifyPassword } from '../lib/password.ts';
import { DEMO_ACTOR, DEMO_ORGANIZATION } from '../lib/tenant-context.ts';

test('previous-space access preserves portfolio, assignments, Daniel and changed credentials', async () => {
  const listener = createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const directory = await mkdtemp(path.join(tmpdir(), 'buho-access-test-'));
  const db = new EmbeddedPostgres({ databaseDir: path.join(directory, 'postgres'), user: 'postgres', password: 'isolated-test', port, persistent: false, initdbFlags: ['--locale=C', '--encoding=UTF8'], postgresFlags: ['-h', '127.0.0.1'], onLog() {}, onError() {} });
  let sql;
  try {
    await db.initialise(); await db.start(); await db.createDatabase('access_test');
    const databaseUrl = `postgresql://postgres:isolated-test@127.0.0.1:${port}/access_test`;
    sql = postgres(databaseUrl, { max: 2, prepare: false, onnotice() {} });
    await migrate(drizzle(sql), { migrationsFolder: 'drizzle' });
    await sql`INSERT INTO organizations (id, name, slug) VALUES (${DEMO_ORGANIZATION}, 'Existing workspace', 'estudio-ibieta-ip')`;
    await sql`INSERT INTO users (id, name, initials) VALUES (${DEMO_ACTOR}, 'Existing administrator', 'EA')`;
    await sql`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${DEMO_ORGANIZATION}, ${DEMO_ACTOR}, 'admin')`;
    await sql`INSERT INTO brands (organization_id, public_code, name, word_mark, owner_name, created_by) VALUES (${DEMO_ORGANIZATION}, 'PRESERVE-1', 'Existing brand', 'EXISTING BRAND', 'Existing holder', ${DEMO_ACTOR})`;
    const [danielOrg] = await sql`INSERT INTO organizations (name, slug) VALUES ('Daniel Morales', 'daniel-morales') RETURNING id`;
    const danielHash = await hashPassword('untouched-test-password');
    const [daniel] = await sql`INSERT INTO users (name, initials, username, password_hash) VALUES ('Daniel Morales', 'DM', 'daniel_morales', ${danielHash}) RETURNING id`;
    await sql`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${danielOrg.id}, ${daniel.id}, 'admin')`;
    const before = await sql`SELECT * FROM brands`;
    async function provision() {
      const env = { ...process.env, DATABASE_URL: databaseUrl, BUHO_INITIAL_PASSWORD: 'Temporary-access-test' };
      delete env.DANIEL_INITIAL_PASSWORD;
      const child = spawn(process.execPath, ['--import', './tests/ts-loader.mjs', 'scripts/provision-pilot.ts'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', d => { output += d; }); child.stderr.on('data', d => { output += d; });
      const [code] = await once(child, 'close');
      return { code, output };
    }
    assert.equal((await provision()).code, 0);
    const [owner] = await sql`SELECT * FROM users WHERE id = ${DEMO_ACTOR}`;
    assert.equal(owner.username, 'buho_marc');
    assert.equal(owner.name, 'Existing administrator');
    assert.equal(owner.must_change_password, true);
    assert.equal(await verifyPassword('Temporary-access-test', owner.password_hash), true);
    assert.deepEqual(await sql`SELECT * FROM brands`, before);
    assert.equal((await sql`SELECT password_hash FROM users WHERE id = ${daniel.id}`)[0].password_hash, danielHash);
    const changedHash = await hashPassword('new-user-selected-password');
    await sql`UPDATE users SET password_hash = ${changedHash}, must_change_password = false WHERE id = ${DEMO_ACTOR}`;
    assert.equal((await provision()).code, 0);
    assert.equal((await sql`SELECT password_hash FROM users WHERE id = ${DEMO_ACTOR}`)[0].password_hash, changedHash);
    assert.equal((await sql`SELECT count(*)::int AS n FROM audit_events WHERE action = 'account.access_enabled'`)[0].n, 1);
    await sql`INSERT INTO organization_members (organization_id, user_id) VALUES (${danielOrg.id}, ${DEMO_ACTOR})`;
    assert.notEqual((await provision()).code, 0, 'reject multiple organizations');
    await sql`DELETE FROM organization_members WHERE user_id = ${DEMO_ACTOR} AND organization_id = ${danielOrg.id}`;
    await sql`UPDATE users SET username = NULL, password_hash = NULL WHERE id = ${DEMO_ACTOR}`;
    await sql`INSERT INTO users (name, initials, username) VALUES ('Conflicting user', 'CU', 'Buho_Marc')`;
    assert.notEqual((await provision()).code, 0, 'reject occupied username');
    assert.equal((await sql`SELECT username FROM users WHERE id = ${DEMO_ACTOR}`)[0].username, null);
    assert.deepEqual(await sql`SELECT * FROM brands`, before);
  } finally {
    if (sql) await sql.end();
    await db.stop();
  }
});
