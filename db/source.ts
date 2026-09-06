import type { TransactionSql } from "postgres";
import { getSql } from "./index";
import { DEMO_ORG_ID, ensureDemoSeed, getDemoSnapshot } from "./demo";
import { INITIAL_APPLICATIONS, STATUS_BY_ID, type RegistrationApplication } from "../lib/registration-data";
import { chileClock, compareRecords, describeChanges, sourceRecordSchema, type Lookup, type SourceRecord } from "../lib/source-contract";
import { isRealSource } from "../lib/inapi-provider";

export function iso(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
const base = { ownerCountry: "CHILE", representativeName: "Estudio Ibieta IP", representativeCountry: "CHILE", logo: "", officialUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx" };
function fromApplication(a: RegistrationApplication): SourceRecord {
  return sourceRecordSchema.parse({ ...base, applicationNumber: a.applicationNumber, registrationNumber: a.registrationNumber ?? null, name: a.name, status: a.statusId, type: a.type, filingDate: a.filedAt, publicationDate: a.publishedAt ?? null, expirationDate: null, registrationDate: a.registrationDate ?? null, statusDate: a.deadlineSource ?? null, owner: a.holder, ownerRut: a.holderRut, classes: (a.niceClasses.match(/\d+/g) ?? []).map(Number), logo: a.logo ?? "" });
}

export async function ensureSourceSeed() {
  await ensureDemoSeed();
  if (isRealSource()) return;
  const sql = getSql();
  const portfolio = await getDemoSnapshot();
  await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(741027)`;
    const [count] = await tx`SELECT count(*)::int AS n FROM source_records`;
    const firstSeed = count.n === 0;
    const appCodes = await tx`SELECT public_code FROM registration_applications WHERE organization_id = ${DEMO_ORG_ID}`;
    for (const a of INITIAL_APPLICATIONS.filter(a => !appCodes.some(row => row.public_code === a.id))) await tx`INSERT INTO registration_applications (organization_id, public_code, data) VALUES (${DEMO_ORG_ID}, ${a.id}, ${tx.json(a)}) ON CONFLICT DO NOTHING`;
    const brandRows = await tx`SELECT id, public_code, monitoring_config FROM brands WHERE organization_id = ${DEMO_ORG_ID} AND archived_at IS NULL`;
    const applicationRows = await tx`SELECT id, public_code, data FROM registration_applications WHERE organization_id = ${DEMO_ORG_ID}`;
    const candidates = [
      ...brandRows.map(row => {
        const b = portfolio.brands.find(b => b.id === row.public_code)!;
        const data: SourceRecord = sourceRecordSchema.parse({ ...base, applicationNumber: b.applicationNumber, registrationNumber: /^\d+$/.test(b.registration) ? b.registration : null, name: b.name, status: b.registrationState === "Rechazada" ? "rejected-final" : b.registrationState === "En trámite" ? "inapi-waiting" : "registered", type: b.type ?? "Mixta", filingDate: iso(b.filingDate), publicationDate: iso(b.publicationDate), expirationDate: iso(b.expirationDate), registrationDate: null, statusDate: null, owner: b.owner, ownerRut: b.rut, ownerCountry: b.ownerCountry, representativeName: b.representativeName, representativeCountry: b.representativeCountry, classes: (b.classes.match(/\d+/g) ?? []).map(Number), logo: row.monitoring_config?.logo ?? "" });
        return { id: row.id, code: row.public_code, kind: "brand", data };
      }),
      ...applicationRows.map(row => ({ id: row.id, code: row.public_code, kind: "application", data: fromApplication(row.data as RegistrationApplication) })),
    ];
    const existing = await tx`SELECT entity_id, entity_type FROM source_snapshots WHERE organization_id = ${DEMO_ORG_ID}`;
    for (const c of candidates) {
      if (existing.some(row => row.entity_id === c.id && row.entity_type === c.kind)) continue;
      let [record] = await tx`SELECT id, data FROM source_records WHERE application_number = ${c.data.applicationNumber} OR (${c.data.registrationNumber}::text IS NOT NULL AND registration_number = ${c.data.registrationNumber}) LIMIT 1`;
      if (!record) {
        // New portfolio entries replace an unmonitored synthetic row, preserving the 800-row universe.
        const [size] = await tx`SELECT count(*)::int AS n FROM source_records`;
        if (size.n >= 800) {
          const [spare] = await tx`SELECT id FROM source_records WHERE id NOT IN (SELECT source_id FROM source_snapshots) ORDER BY application_number DESC LIMIT 1`;
          if (!spare) throw new Error("Los 800 expedientes ya están vinculados; amplíe la fuente de prueba");
          [record] = await tx`UPDATE source_records SET application_number = ${c.data.applicationNumber}, registration_number = ${c.data.registrationNumber}, data = ${tx.json(c.data)}, version = version + 1 WHERE id = ${spare.id} RETURNING id, data`;
        } else [record] = await tx`INSERT INTO source_records (application_number, registration_number, data) VALUES (${c.data.applicationNumber}, ${c.data.registrationNumber}, ${tx.json(c.data)}) RETURNING id, data`;
      }
      // Existing portfolio is the baseline. A first import itself does not send notices.
      await tx`INSERT INTO source_snapshots (organization_id, entity_id, entity_type, public_code, source_id, data) VALUES (${DEMO_ORG_ID}, ${c.id}, ${c.kind}, ${c.code}, ${record.id}, ${tx.json(c.data)})`;
    }
    const [size] = await tx`SELECT count(*)::int AS n FROM source_records`;
    const filler = [];
    for (let i = Number(size.n); i < 800; i++) {
      const data: SourceRecord = { ...base, applicationNumber: String(8000000 + i), registrationNumber: i % 3 ? String(9000000 + i) : null, name: `${["VALLE", "BOSQUE", "AURORA", "PUERTO", "CORDILLERA", "ESTELA", "OCÉANO", "PRISMA"][i % 8]} ${String(i + 1).padStart(3, "0")}`, status: i % 3 ? "registered" : "inapi-waiting", type: i % 2 ? "Denominativa" : "Mixta", filingDate: "2025-01-10", publicationDate: i % 3 ? "2025-04-10" : null, expirationDate: i % 3 ? "2035-09-01" : null, registrationDate: i % 3 ? "2025-09-01" : null, statusDate: null, owner: `Comercial ${i + 1} SpA`, ownerRut: `77.${String(100000 + i).slice(0, 3)}.${String(100000 + i).slice(3)}-0`, classes: [i % 45 + 1] };
      filler.push({ application_number: data.applicationNumber, registration_number: data.registrationNumber, data: tx.json(data) });
    }
    if (filler.length) await tx`INSERT INTO source_records ${tx(filler, "application_number", "registration_number", "data")}`;
    if (firstSeed) await generateSix(tx);
  });
}

async function generateSix(tx: TransactionSql) {
  const rows = await tx`SELECT DISTINCT ON (r.id) r.id, r.data, r.version, s.public_code FROM source_records r JOIN source_snapshots s ON s.source_id = r.id LEFT JOIN brands b ON s.entity_type = 'brand' AND b.id = s.entity_id WHERE s.organization_id = ${DEMO_ORG_ID} AND (s.entity_type = 'application' OR (b.archived_at IS NULL AND b.status <> 'Pausada')) ORDER BY r.id`;
  const preferred = ["IM-014", "IM-012", "IM-007", "BM-018", "BM-017", "BM-016"];
  rows.sort((a, b) => (preferred.indexOf(a.public_code) < 0 ? 99 : preferred.indexOf(a.public_code)) - (preferred.indexOf(b.public_code) < 0 ? 99 : preferred.indexOf(b.public_code)));
  if (rows.length < 6) throw new Error("Se requieren al menos seis expedientes en seguimiento");
  const today = chileClock().day;
  const changes = [];
  for (const [i, row] of rows.slice(0, 6).entries()) {
    const before = row.data as SourceRecord;
    const after = { ...before };
    if (i === 0 && !before.publicationDate) { after.publicationDate = today; after.status = "opposition-window"; after.statusDate = today; }
    else if (i === 1 && before.status === "inapi-waiting") { after.status = "form-observation"; after.statusDate = today; }
    else if (i === 2 && before.status === "accepted-payment") { after.status = "registered"; after.registrationNumber = String(9500000 + Number(before.applicationNumber) % 100000); after.registrationDate = today; after.expirationDate = `${Number(today.slice(0, 4)) + 10}${today.slice(4)}`; after.statusDate = today; }
    else if (i % 3 === 0) after.owner = `${before.owner.replace(/ · actualización \d+$/, "")} · actualización ${row.version + 1}`;
    else if (i % 3 === 1) after.representativeName = `Estudio ${row.version % 2 ? "Andes" : "Pacífico"} Abogados`;
    else after.classes = before.classes.length < 45 ? [...before.classes, Array.from({ length: 45 }, (_, n) => n + 1).find(n => !before.classes.includes(n))!].sort((a, b) => a - b) : before.classes.slice(1);
    const valid = sourceRecordSchema.parse(after);
    await tx`UPDATE source_records SET data = ${tx.json(valid)}, registration_number = ${valid.registrationNumber}, version = version + 1, updated_at = now() WHERE id = ${row.id}`;
    changes.push({ name: after.name, changes: compareRecords(before, valid), title: describeChanges(before, valid).title });
  }
  return changes;
}
export async function advanceSource() {
  if (isRealSource()) throw new Error("Los expedientes reales se actualizan exclusivamente desde INAPI");
  await ensureSourceSeed();
  return getSql().begin(async tx => { await tx`SELECT pg_advisory_xact_lock(741027)`; return generateSix(tx); });
}
export async function sourceLookup(input: Lookup) {
  const sql = getSql();
  const rows = await sql`SELECT data FROM source_records WHERE application_number = ANY(${input.applicationIds}) OR registration_number = ANY(${input.registrationIds})`;
  const records = rows.map(r => r.data as SourceRecord);
  const missing = [...input.applicationIds.filter(id => !records.some(r => r.applicationNumber === id)).map(id => `solicitud:${id}`), ...input.registrationIds.filter(id => !records.some(r => r.registrationNumber === id)).map(id => `registro:${id}`)];
  return { version: 1 as const, records, missing, fetchedAt: new Date().toISOString() };
}
export async function editSource(id: string, version: number, data: SourceRecord) {
  if (isRealSource()) throw new Error("Los datos de INAPI son de solo lectura");
  return getSql().begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(741027)`;
    const [row] = await tx`SELECT * FROM source_records WHERE id = ${id} FOR UPDATE`;
    if (!row || row.version !== version) throw new Error("El expediente cambió. Actualice la tabla antes de guardar");
    if (data.applicationNumber !== row.application_number) throw new Error("El número de solicitud es el identificador estable y no puede editarse");
    if (row.data.publicationDate && data.publicationDate !== row.data.publicationDate) throw new Error("La fecha de publicación queda fija una vez informada");
    if (row.registration_number && data.registrationNumber !== row.registration_number) throw new Error("El número de registro ya asignado no puede cambiarse");
    await tx`UPDATE source_records SET data = ${tx.json(data)}, registration_number = ${data.registrationNumber}, version = version + 1, updated_at = now() WHERE id = ${id}`;
  });
}

export function updatedApplication(a: RegistrationApplication, r: SourceRecord, detail: string): RegistrationApplication {
  const statusId = r.status in STATUS_BY_ID ? r.status as RegistrationApplication["statusId"] : a.statusId;
  if (r.provider === "inapi") {
    const events = (r.inapi?.events ?? []) as { event_date?: string; status_description?: string; observation?: string; due_date?: string }[];
    const ordered = [...events].sort((a,b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
    const latest = ordered.at(-1);
    return { ...a, provider: "inapi", name: r.name, logo: r.logo || undefined, type: r.type, applicationNumber: r.applicationNumber, registrationNumber: r.registrationNumber ?? undefined, registrationDate: r.registrationDate ?? undefined, filedAt: r.filingDate ?? "", publishedAt: r.publicationDate ?? undefined, expirationDate: r.expirationDate ?? undefined, statusId, deadlineSource: undefined, officialDeadline: latest?.due_date?.slice(0,10) || undefined, sourceStatus: String((r.inapi?.status as { description?: string })?.description ?? "No informado"), holder: r.owner, holderRut: r.ownerRut, ownerCountry: r.ownerCountry, representativeName: r.representativeName, representativeCountry: r.representativeCountry, niceClasses: r.classes.join(", ") || "No informadas", fileUrl: r.officialUrl, recentEvent: latest?.status_description || detail, history: ordered.map(e => ({ date: e.event_date?.slice(0,10) ?? "", detail: [e.status_description, e.observation].filter(Boolean).join(" · ") })) };
  }
  return { ...a, expirationDate: r.expirationDate ?? undefined, ownerCountry: r.ownerCountry, representativeName: r.representativeName, representativeCountry: r.representativeCountry, name: r.name, logo: r.logo || undefined, type: r.type, applicationNumber: r.applicationNumber, registrationNumber: r.registrationNumber ?? undefined, registrationDate: r.registrationDate ?? undefined, filedAt: r.filingDate ?? a.filedAt, publishedAt: r.publicationDate ?? undefined, statusId, deadlineSource: r.statusDate ?? undefined, holder: r.owner, holderRut: r.ownerRut, niceClasses: r.classes.join(", "), fileUrl: r.officialUrl, recentEvent: detail, history: [...a.history, { date: chileClock().day, status: statusLabelForApplication(r), detail }] };
}
function statusLabelForApplication(r: SourceRecord) { return STATUS_BY_ID[r.status as RegistrationApplication["statusId"]]?.label ?? r.status; }
