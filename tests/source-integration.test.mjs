import test from "node:test";
import assert from "node:assert/strict";
import { getSql } from "../db/index.ts";
import { ensureSourceSeed, sourceLookup, advanceSource, editSource } from "../db/source.ts";
import { syncSource } from "../db/source-sync.ts";
import { getDemoSnapshot, DEMO_ORG_ID } from "../db/demo.ts";
import { sourceRecordSchema } from "../lib/source-contract.ts";

test("PostgreSQL: source → review → portfolio + notifications, atomic failure, locks and daily schedule", { skip: !process.env.SOURCE_TEST_DATABASE_URL }, async () => {
  process.env.DATABASE_URL = process.env.SOURCE_TEST_DATABASE_URL;
  const sql = getSql();
  try {
    await ensureSourceSeed();
    const [count] = await sql`SELECT count(*)::int AS n FROM source_records`;
    assert.equal(count.n, 800);
    for (const row of await sql`SELECT data FROM source_records`) assert.equal(sourceRecordSchema.safeParse(row.data).success, true);
    const [pending] = await sql`SELECT count(*)::int AS n FROM source_snapshots s JOIN source_records r ON r.id = s.source_id WHERE s.data <> r.data`;
    assert.equal(pending.n, 6);
    const [baselineNotices] = await sql`SELECT count(*)::int AS n FROM notifications WHERE type = 'source_change'`;
    assert.equal(baselineNotices.n, 0);
    const first = await syncSource("manual", sourceLookup);
    assert.equal(first.changed, 6); assert.equal(first.notifications, 6);
    const snapshot = await getDemoSnapshot();
    assert.match(snapshot.notices.find(n => n.brand === "CERRO AZUL").title, /publicada en el Diario Oficial/);
    const [cerro] = await sql`SELECT data FROM registration_applications WHERE public_code = 'IM-014'`;
    assert.equal(cerro.data.statusId, "opposition-window");
    const [nodo] = await sql`SELECT data FROM registration_applications WHERE public_code = 'IM-007'`;
    assert.equal(nodo.data.statusId, "registered"); assert.ok(nodo.data.registrationNumber);
    const repeat = await syncSource("manual", sourceLookup);
    assert.equal(repeat.changed, 0); assert.equal(repeat.notifications, 0);
    const generated = await advanceSource(); assert.equal(generated.length, 6);
    let started; const startedPromise = new Promise(resolve => { started = resolve; });
    let resume; const gate = new Promise(resolve => { resume = resolve; });
    const concurrent = syncSource("manual", async input => { started(); await gate; return sourceLookup(input); });
    await startedPromise;
    assert.equal((await syncSource("manual", sourceLookup)).skipped, true);
    resume(); assert.equal((await concurrent).notifications, 6);
    const [row] = await sql`SELECT r.* FROM source_records r JOIN source_snapshots s ON s.source_id = r.id WHERE s.public_code = 'BM-018' LIMIT 1`;
    await assert.rejects(editSource(row.id, row.version - 1, row.data), /expediente cambió/);
    await assert.rejects(editSource(row.id, row.version, { ...row.data, publicationDate: "2026-01-01" }), /queda fija/);
    await editSource(row.id, row.version, { ...row.data, owner: "Titular editado manualmente" });
    const one = await syncSource("manual", sourceLookup); assert.equal(one.notifications, 1);
    assert.equal((await getDemoSnapshot()).brands.find(b => b.id === "BM-018").owner, "Titular editado manualmente");
    await advanceSource();
    const beforeFailure = JSON.stringify((await sql`SELECT data FROM source_snapshots ORDER BY id`).map(r => r.data));
    await assert.rejects(syncSource("manual", async () => { throw new Error("Fuente temporalmente no disponible"); }), /temporalmente/);
    assert.equal(JSON.stringify((await sql`SELECT data FROM source_snapshots ORDER BY id`).map(r => r.data)), beforeFailure);
    // A partial response discovered after earlier rows changed must roll the entire transaction back.
    await assert.rejects(syncSource("manual", async input => { const result = await sourceLookup(input); result.records.pop(); return result; }), /incompleta/);
    assert.equal(JSON.stringify((await sql`SELECT data FROM source_snapshots ORDER BY id`).map(r => r.data)), beforeFailure);
    assert.equal((await syncSource("manual", sourceLookup)).notifications, 6);
    const early = await syncSource("scheduled", sourceLookup, new Date("2026-12-01T15:29:00Z")); assert.equal(early.skipped, true);
    const scheduled = await syncSource("scheduled", sourceLookup, new Date("2026-12-01T15:30:00Z")); assert.equal(scheduled.skipped, false);
    assert.equal((await syncSource("scheduled", sourceLookup, new Date("2026-12-01T18:00:00Z"))).skipped, true);
    const runs = await sql`SELECT * FROM source_sync_runs WHERE organization_id = ${DEMO_ORG_ID}`;
    assert.equal(runs.filter(r => r.status === "failed").length, 2);
    assert.equal(runs.filter(r => r.status === "running").length, 0);
    // Silent complementary completion still updates and records the field diff.
    const [app] = await sql`SELECT r.* FROM source_records r JOIN source_snapshots s ON r.id = s.source_id WHERE s.public_code = 'IM-014'`;
    await editSource(app.id, app.version, { ...app.data, expirationDate: "2036-09-04" });
    const silent = await syncSource("manual", sourceLookup); assert.equal(silent.changed, 1); assert.equal(silent.notifications, 0);
    assert.equal((await sql`SELECT count(*)::int AS n FROM source_records`)[0].n, 800);
  } finally { await sql.end(); }
});
