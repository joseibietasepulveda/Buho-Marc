// Opt-in integration test against the isolated demo started by npm run dev:local.
// RUN_LOCAL_EVIDENCE_HTTP_TESTS=1 node --import ./tests/ts-loader.mjs --test tests/registration-evidence-http.test.mjs
// Never consumes DATABASE_URL, hosted credentials, SOURCE_PROVIDER or INAPI keys.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { addProcedureDays, registrationDeadlines } from "../lib/registration-procedure.ts";

const appOrigin = "http://127.0.0.1:3000";
const localDatabase = "postgresql://postgres:buho-local-only@127.0.0.1:55433/buho_local";
const organizationId = "10000000-0000-4000-8000-000000000001";
const actorId = "10000000-0000-4000-8000-000000000101";

function assertLocalTargets() {
  const app = new URL(appOrigin);
  const database = new URL(localDatabase);
  assert.equal(app.protocol, "http:");
  assert.equal(app.hostname, "127.0.0.1");
  assert.equal(app.port, "3000");
  assert.equal(database.protocol, "postgresql:");
  assert.equal(database.hostname, "127.0.0.1");
  assert.equal(database.port, "55433");
  assert.equal(database.pathname, "/buho_local");
}

test("local HTTP evidence: validation, save → persistent projection → replacement → revoke, and server-owned audit", { skip: process.env.RUN_LOCAL_EVIDENCE_HTTP_TESTS !== "1", timeout: 120000 }, async t => {
  assertLocalTargets();
  const sql = postgres(localDatabase, { max: 1, connect_timeout: 5, idle_timeout: 5, prepare: false });
  const applicationUuid = randomUUID();
  const sourceUuid = randomUUID();
  const snapshotUuid = randomUUID();
  const publicCode = `EH-${applicationUuid.replaceAll("-", "").slice(0, 24)}`;
  const applicationNumber = `99${BigInt(`0x${applicationUuid.replaceAll("-", "").slice(0, 18)}`).toString()}`;
  const application = {
    id: publicCode, name: `PRUEBA HTTP TEMPORAL ${publicCode}`, applicationNumber,
    type: "Denominativa", filedAt: "2026-08-01", publishedAt: "2026-08-10", statusId: "substantive-objection",
    recentEvent: "Observación de fondo de prueba local", niceClasses: "35", holderRut: "No aplica",
    holder: "Titular ficticio de prueba", client: "Prueba HTTP local aislada",
    procedure: { sourceActDate: "2026-09-01", sourceActId: `act-${applicationUuid}`, sourceActDescription: "Resolución de observaciones de fondo · prueba HTTP local" },
    history: [{ date: "2026-09-01", status: "Resolución de observaciones de fondo · prueba HTTP local", eventId: `act-${applicationUuid}`, detail: "Fixture temporal sin consultas a INAPI" }],
  };
  const sourceRecord = { applicationNumber, registrationNumber: null, name: application.name, status: application.statusId, type: application.type, filingDate: application.filedAt, publicationDate: application.publishedAt, expirationDate: null, registrationDate: null, statusDate: null, owner: application.holder, ownerRut: application.holderRut, classes: [35], ownerCountry: "CHILE", representativeName: "Estudio Ibieta IP", representativeCountry: "CHILE", logo: "", officialUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx" };
  const saveBody = {
    action: "save", applicationId: publicCode, kind: "notification", method: "inapi-inbox",
    date: "2026-09-04", reference: `Constancia ficticia de prueba HTTP local ${publicCode}`,
    sourceUrl: "", actId: application.procedure.sourceActId,
    actDate: application.procedure.sourceActDate, actDescription: application.procedure.sourceActDescription,
    confirmed: true,
  };
  let created = false;
  let savedEvidenceId;
  async function request(path, init = {}) {
    const response = await fetch(`${appOrigin}${path}`, { ...init, redirect: "error", signal: AbortSignal.timeout(20000) });
    assert.match(response.headers.get("content-type") ?? "", /application\/json/, `${init.method ?? "GET"} ${path} returned HTTP ${response.status} without JSON; verify the local server compilation before rerunning`);
    return { status: response.status, body: await response.json() };
  }
  const post = (body, origin = appOrigin) => request("/api/registrations/evidence", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body) });
  async function stored() {
    const [row] = await sql`SELECT data FROM registration_applications WHERE id = ${applicationUuid} AND organization_id = ${organizationId} AND public_code = ${publicCode}`;
    assert.ok(row, "Only the explicitly inserted fixture is read");
    return row.data;
  }
  async function projected() {
    const result = await request("/api/registrations");
    assert.equal(result.status, 200);
    assert.equal(result.body.provider, "simulated", "The HTTP server must remain the isolated local demo");
    const found = result.body.applications.find(item => item.id === publicCode);
    assert.ok(found, "The fixture must be included in the persisted API projection");
    return found;
  }
  try {
    // Check both endpoints' actual identities before inserting any fixture.
    const [databaseIdentity] = await sql`SELECT current_database() AS name, inet_server_addr()::text AS address, inet_server_port() AS port`;
    assert.equal(databaseIdentity.name, "buho_local");
    assert.equal(databaseIdentity.address, "127.0.0.1/32");
    assert.equal(databaseIdentity.port, 55433);
    const initial = await request("/api/registrations");
    assert.equal(initial.status, 200);
    assert.equal(initial.body.provider, "simulated");
    const scheduling = await request("/api/source/status");
    assert.equal(scheduling.status, 200);
    assert.equal(scheduling.body.automaticEnabled, false, "Scheduled source changes must be disabled during isolated fixture tests");
    const [membership] = await sql`SELECT user_id FROM organization_members WHERE organization_id = ${organizationId} AND user_id = ${actorId}`;
    assert.ok(membership, "Expected preexisting local demo membership; this test does not create or modify users");
    // ensureSourceSeed scans local applications on every request. Give this one
    // its own backing rows so it never consumes/replaces a preexisting spare.
    await sql.begin(async tx => {
      await tx`INSERT INTO registration_applications (id, organization_id, public_code, data) VALUES (${applicationUuid}, ${organizationId}, ${publicCode}, ${tx.json(application)})`;
      await tx`INSERT INTO source_records (id, application_number, data) VALUES (${sourceUuid}, ${applicationNumber}, ${tx.json(sourceRecord)})`;
      await tx`INSERT INTO source_snapshots (id, organization_id, entity_id, entity_type, public_code, source_id, data) VALUES (${snapshotUuid}, ${organizationId}, ${applicationUuid}, 'application', ${publicCode}, ${sourceUuid}, ${tx.json(sourceRecord)})`;
    });
    created = true;

    await t.test("invalid origin is rejected with 403", async () => {
      const result = await post(saveBody, "https://not-the-local-app.invalid");
      assert.equal(result.status, 403);
      assert.match(result.body.message, /Origen no permitido/);
    });
    await t.test("future date and date before the source act are rejected with 400", async () => {
      for (const date of ["2099-01-01", "2026-08-31"]) {
        const result = await post({ ...saveBody, date });
        assert.equal(result.status, 400);
        assert.match(result.body.message, /fecha.*futura|anterior/i);
      }
    });
    await t.test("stale source act is rejected with 409", async () => {
      const result = await post({ ...saveBody, actId: `stale-${applicationUuid}` });
      assert.equal(result.status, 409);
      assert.match(result.body.message, /actuación cambió/);
    });
    await t.test("a daily state cannot stand in for a substantive-objection inbox notice", async () => {
      const result = await post({ ...saveBody, method: "daily-state" });
      assert.equal(result.status, 400);
      assert.match(result.body.message, /medio de notificación/);
    });
    await t.test("the caller cannot impersonate the server-resolved actor", async () => {
      const result = await post({ ...saveBody, recordedBy: randomUUID() });
      assert.equal(result.status, 400);
      assert.equal((await stored()).legalEvidence, undefined);
      const [audit] = await sql`SELECT count(*)::int AS n FROM audit_events WHERE organization_id = ${organizationId} AND entity_id = ${applicationUuid}`;
      assert.equal(audit.n, 0, "Rejected requests must leave neither evidence nor audit mutations");
    });
    await t.test("save persists evidence and GET activates the correctly anchored deadline", async () => {
      const before = await projected();
      assert.equal(registrationDeadlines(before, "2026-09-10").find(item => item.key === "substantive-objection").attention, "pending");
      const result = await post(saveBody);
      assert.equal(result.status, 200);
      assert.equal(result.body.ok, true);
      const persisted = await stored();
      assert.equal(persisted.legalEvidence.length, 1);
      savedEvidenceId = persisted.legalEvidence[0].id;
      assert.equal(persisted.legalEvidence[0].recordedBy, actorId);
      assert.equal(persisted.legalEvidence[0].method, "inapi-inbox");
      assert.deepEqual(persisted.history, application.history);
      assert.deepEqual(persisted.procedure, application.procedure, "Saving evidence must not overwrite the original act");
      const after = await projected();
      assert.equal(after.procedure.notifiedAt, saveBody.date);
      assert.equal(after.procedure.sourceActDate, application.procedure.sourceActDate);
      assert.equal(after.procedure.notificationProof.verifiedBy, "team");
      const deadline = registrationDeadlines(after, "2026-09-10").find(item => item.key === "substantive-objection");
      assert.equal(deadline.sourceDate, "2026-09-04");
      assert.equal(deadline.dueDate, addProcedureDays("2026-09-04", 30));
      assert.equal(deadline.days, 30);
      assert.equal(after.statusId, application.statusId, "A verified date must not fabricate a procedural status change");
    });
    await t.test("correction retains prior evidence and recalculates with the replacement date", async () => {
      const result = await post({ ...saveBody, date: "2026-09-08", reference: `${saveBody.reference} · fecha corregida` });
      assert.equal(result.status, 200);
      const persisted = await stored();
      assert.equal(persisted.legalEvidence.length, 2);
      assert.ok(persisted.legalEvidence.find(item => item.id === savedEvidenceId).revokedAt);
      const active = persisted.legalEvidence.filter(item => !item.revokedAt);
      assert.equal(active.length, 1);
      savedEvidenceId = active[0].id;
      const after = await projected();
      assert.equal(after.procedure.notifiedAt, "2026-09-08");
      assert.equal(registrationDeadlines(after, "2026-09-10").find(item => item.key === "substantive-objection").dueDate, addProcedureDays("2026-09-08", 30));
    });
    await t.test("revoke persists, removes the computed deadline and retains the original act", async () => {
      assert.ok(savedEvidenceId);
      const result = await post({ action: "revoke", applicationId: publicCode, evidenceId: savedEvidenceId });
      assert.equal(result.status, 200);
      assert.ok((await stored()).legalEvidence.every(item => item.revokedAt));
      const after = await projected();
      assert.equal(after.procedure.notifiedAt, undefined);
      assert.equal(after.procedure.notificationProof, undefined);
      assert.deepEqual(after.history, application.history);
      const deadline = registrationDeadlines(after, "2026-09-10").find(item => item.key === "substantive-objection");
      assert.equal(deadline.attention, "pending");
      assert.equal(deadline.dueDate, undefined);
      const repeated = await post({ action: "revoke", applicationId: publicCode, evidenceId: savedEvidenceId });
      assert.equal(repeated.status, 404);
    });
    await t.test("audit records save, replacement and revoke under the actual server actor", async () => {
      const rows = await sql`SELECT action, actor_user_id, before_data, after_data FROM audit_events WHERE organization_id = ${organizationId} AND entity_id = ${applicationUuid} AND entity_type = 'application' ORDER BY occurred_at, id`;
      assert.deepEqual(rows.map(row => row.action), ["registration.evidence.save", "registration.evidence.save", "registration.evidence.revoke"]);
      assert.ok(rows.every(row => row.actor_user_id === actorId));
      assert.deepEqual(rows[0].before_data.legalEvidence, []);
      assert.equal(rows[0].after_data.legalEvidence[0].recordedBy, actorId);
      assert.equal(rows[2].before_data.legalEvidence.filter(item => !item.revokedAt).length, 1);
      assert.ok(rows[2].after_data.legalEvidence.every(item => item.revokedAt));
    });
  } finally {
    if (created) {
      await sql.begin(async tx => {
        // Cleanup is restricted to the UUID inserted by this exact run; never
        // delete organizations, shared fixtures or unrelated user evidence.
        const [fixture] = await tx`SELECT id FROM registration_applications WHERE id = ${applicationUuid} AND organization_id = ${organizationId} AND public_code = ${publicCode} AND data->>'name' = ${application.name} FOR UPDATE`;
        assert.ok(fixture, "Cleanup target must still be this exact temporary fixture");
        await tx`DELETE FROM audit_events WHERE organization_id = ${organizationId} AND entity_id = ${applicationUuid} AND entity_type = 'application' AND action IN ('registration.evidence.save', 'registration.evidence.revoke')`;
        const snapshots = await tx`DELETE FROM source_snapshots WHERE id = ${snapshotUuid} AND organization_id = ${organizationId} AND entity_id = ${applicationUuid} AND source_id = ${sourceUuid} RETURNING id`;
        const applications = await tx`DELETE FROM registration_applications WHERE id = ${applicationUuid} AND organization_id = ${organizationId} AND public_code = ${publicCode} RETURNING id`;
        const sources = await tx`DELETE FROM source_records WHERE id = ${sourceUuid} AND application_number = ${applicationNumber} AND data->>'name' = ${application.name} RETURNING id`;
        assert.equal(snapshots.length, 1);
        assert.equal(applications.length, 1);
        assert.equal(sources.length, 1);
      });
      const [remaining] = await sql`SELECT count(*)::int AS n FROM registration_applications WHERE id = ${applicationUuid}`;
      assert.equal(remaining.n, 0);
      t.diagnostic("Temporary HTTP fixture, its backing source rows and test-only audit records removed; no user entities changed.");
    }
    await sql.end();
  }
});
