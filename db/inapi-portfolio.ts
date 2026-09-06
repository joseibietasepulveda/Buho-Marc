import type { TransactionSql } from "postgres";
import type { SourceRecord } from "../lib/source-contract";
import { updatedApplication } from "./source";
import type { RegistrationApplication } from "../lib/registration-data";
import { DEMO_ORG_ID, DEMO_USER_ID } from "./demo";

export function realBrandConfig(record: SourceRecord) {
  const events = (record.inapi?.events ?? []) as { event_date?: string; status_description?: string }[];
  return { provider: "inapi", type: record.type, rut: record.ownerRut, applicationNumber: record.applicationNumber, filingDate: record.filingDate ?? "", publicationDate: record.publicationDate ?? "", expirationDate: record.expirationDate ?? "", registrationDate: record.registrationDate ?? "", ownerCountry: record.ownerCountry, representativeName: record.representativeName, representativeCountry: record.representativeCountry, logo: record.logo, inapiUrl: record.officialUrl, legalStatus: record.status, sourceStatus: (record.inapi?.status as { description?: string })?.description, registrationState: ["registered", "expired", "cancelled"].includes(record.status) ? "Registrada" : "En trámite", sourceHistory: events.filter(e => e.event_date && e.status_description).map(e => ({ date: e.event_date!.slice(0,10), title: e.status_description! })).sort((a,b) => a.date.localeCompare(b.date)) };
}

export async function importRealRecord(tx: TransactionSql, record: SourceRecord, kind: "brand" | "application") {
  const code = `${kind === "brand" ? "BM" : "IM"}-R-${record.applicationNumber}`;
  const [source] = await tx`INSERT INTO source_records (application_number, registration_number, data) VALUES (${record.applicationNumber}, ${record.registrationNumber}, ${tx.json(record)}) ON CONFLICT (application_number) DO UPDATE SET data = EXCLUDED.data, registration_number = EXCLUDED.registration_number, updated_at = now() RETURNING id`;
  let entityId: string;
  if (kind === "brand") {
    const [brand] = await tx`INSERT INTO brands (organization_id, public_code, name, word_mark, owner_name, registration_number, registration_date, jurisdiction, status, monitoring_config, created_by, last_reviewed_at) VALUES (${DEMO_ORG_ID}, ${code}, ${record.name}, ${record.name}, ${record.owner}, ${record.registrationNumber}, ${record.registrationDate}, 'Chile', 'Activa', ${tx.json(realBrandConfig(record))}, ${DEMO_USER_ID}, now()) ON CONFLICT (organization_id, public_code) DO UPDATE SET name = EXCLUDED.name, word_mark = EXCLUDED.word_mark, owner_name = EXCLUDED.owner_name, registration_number = EXCLUDED.registration_number, registration_date = EXCLUDED.registration_date, monitoring_config = EXCLUDED.monitoring_config, updated_at = now() RETURNING id`;
    entityId = brand.id;
    await tx`DELETE FROM brand_classes WHERE brand_id = ${entityId}`;
    for (const n of record.classes) await tx`INSERT INTO brand_classes (brand_id, nice_class) VALUES (${entityId}, ${n})`;
  } else {
    const initial: RegistrationApplication = { id: code, name: record.name, applicationNumber: record.applicationNumber, type: record.type, filedAt: record.filingDate ?? "", statusId: record.status, recentEvent: "Información inicial recibida de INAPI", niceClasses: record.classes.join(", "), holder: record.owner, holderRut: record.ownerRut, client: "Sin cliente asignado", history: [] };
    const data = updatedApplication(initial, record, initial.recentEvent);
    const [application] = await tx`INSERT INTO registration_applications (organization_id, public_code, data) VALUES (${DEMO_ORG_ID}, ${code}, ${tx.json(data)}) ON CONFLICT (organization_id, public_code) DO UPDATE SET data = EXCLUDED.data, updated_at = now() RETURNING id`;
    entityId = application.id;
  }
  await tx`INSERT INTO source_snapshots (organization_id, entity_id, entity_type, public_code, source_id, data) VALUES (${DEMO_ORG_ID}, ${entityId}, ${kind}, ${code}, ${source.id}, ${tx.json(record)}) ON CONFLICT (organization_id, entity_type, entity_id) DO UPDATE SET source_id = EXCLUDED.source_id, data = EXCLUDED.data, updated_at = now()`;
}
