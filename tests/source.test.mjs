import test from "node:test";
import assert from "node:assert/strict";
import { chileClock, compareRecords, describeChanges, sourceRecordSchema } from "../lib/source-contract.ts";
import { fetchSource } from "../lib/source-provider.ts";
const record = { applicationNumber: "1582491", registrationNumber: null, name: "CERRO AZUL", status: "accepted-publication", type: "Mixta", filingDate: "2026-08-05", publicationDate: null, expirationDate: null, registrationDate: null, statusDate: null, owner: "Alimentos Cerro Azul SpA", ownerRut: "77.614.290-6", ownerCountry: "CHILE", representativeName: "Estudio Ibieta IP", representativeCountry: "CHILE", classes: [29, 30, 35], logo: "", officialUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx" };
test("12:30 Santiago follows summer/winter time and does not run early", () => {
  assert.equal(chileClock(new Date("2026-07-01T16:29:00Z")).due, false);
  assert.equal(chileClock(new Date("2026-07-01T16:30:00Z")).due, true);
  assert.equal(chileClock(new Date("2026-12-01T15:29:00Z")).due, false);
  assert.equal(chileClock(new Date("2026-12-01T15:30:00Z")).due, true);
  assert.equal(chileClock(new Date("2026-07-02T01:00:00Z")).day, "2026-07-01");
});
test("publication produces one legal event and includes ancillary dates", () => {
  const after = { ...record, status: "opposition-window", publicationDate: "2026-09-04", expirationDate: "2036-09-04", statusDate: "2026-09-04" };
  const changes = compareRecords(record, after);
  const notice = describeChanges(record, after, changes);
  assert.match(notice.title, /CERRO AZUL fue publicada en el Diario Oficial/);
  assert.equal(changes.find(c => c.field === "expirationDate").ancillary, true);
  assert.equal(changes.filter(c => c.ancillary).length, 2);
  assert.equal(compareRecords(after, after).length, 0);
});
test("all changes remain auditable, but initial expiry completion alone is silent", () => {
  const changes = compareRecords(record, { ...record, expirationDate: "2036-09-04" });
  assert.equal(changes.length, 1);
  assert.equal(changes.some(c => !c.ancillary), false);
  assert.equal(compareRecords({ ...record, expirationDate: "2036-09-04" }, { ...record, expirationDate: "2037-09-04" })[0].ancillary, false);
  for (const field of ["owner", "ownerRut", "ownerCountry", "representativeName", "representativeCountry", "name", "logo", "officialUrl", "applicationNumber", "registrationNumber", "type"]) assert.equal(compareRecords(record, { ...record, [field]: "changed" })[0].ancillary, false);
});
test("class ordering is normalized; invalid states, dates and script URLs are rejected", () => {
  assert.deepEqual(sourceRecordSchema.parse({ ...record, classes: [35, 29, 30, 29] }).classes, [29, 30, 35]);
  for (const patch of [{ status: "unknown" }, { filingDate: "2026-02-30" }, { classes: [46] }, { logo: "javascript:alert(1)" }, { publicationDate: "2024-01-01" }, { status: "registered" }]) assert.equal(sourceRecordSchema.safeParse({ ...record, ...patch }).success, false);
});
test("the HTTP adapter rejects partial, duplicate, unexpected and malformed responses", async () => {
  const old = globalThis.fetch;
  const input = { applicationIds: [record.applicationNumber], registrationIds: [] };
  try {
    for (const records of [[], [record, record], [{ ...record, applicationNumber: "999" }], [{ ...record, status: "garbage" }]]) {
      globalThis.fetch = async () => Response.json({ version: 1, records, missing: [], fetchedAt: new Date().toISOString() });
      await assert.rejects(fetchSource(input));
    }
    globalThis.fetch = async () => Response.json({ version: 1, records: [record], missing: [], fetchedAt: new Date().toISOString() });
    assert.equal((await fetchSource(input)).records.length, 1);
    globalThis.fetch = async () => { throw new Error("timeout"); };
    await assert.rejects(fetchSource(input), /timeout/);
  } finally { globalThis.fetch = old; }
});
