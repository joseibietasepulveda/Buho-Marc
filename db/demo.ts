import { getSql } from "./index";

export const DEMO_ORG_ID = "10000000-0000-4000-8000-000000000001";
export const DEMO_PLAN_ID = "10000000-0000-4000-8000-000000000010";
export const DEMO_USER_ID = "10000000-0000-4000-8000-000000000101";
const DEMO_SUBSCRIPTION_ID = "10000000-0000-4000-8000-000000000011";

const ids = {
  users: [DEMO_USER_ID, "10000000-0000-4000-8000-000000000102", "10000000-0000-4000-8000-000000000103", "10000000-0000-4000-8000-000000000104"],
  brands: ["10000000-0000-4000-8000-000000000201", "10000000-0000-4000-8000-000000000202", "10000000-0000-4000-8000-000000000203", "10000000-0000-4000-8000-000000000204", "10000000-0000-4000-8000-000000000205"],
  matches: ["10000000-0000-4000-8000-000000000401", "10000000-0000-4000-8000-000000000402", "10000000-0000-4000-8000-000000000403", "10000000-0000-4000-8000-000000000404", "10000000-0000-4000-8000-000000000405", "10000000-0000-4000-8000-000000000406", "10000000-0000-4000-8000-000000000407", "10000000-0000-4000-8000-000000000408", "10000000-0000-4000-8000-000000000409", "10000000-0000-4000-8000-000000000410"],
  cases: ["10000000-0000-4000-8000-000000000501", "10000000-0000-4000-8000-000000000502", "10000000-0000-4000-8000-000000000503", "10000000-0000-4000-8000-000000000504"],
  notices: ["10000000-0000-4000-8000-000000000601", "10000000-0000-4000-8000-000000000602", "10000000-0000-4000-8000-000000000603"],
  drafts: ["10000000-0000-4000-8000-000000000701", "10000000-0000-4000-8000-000000000702", "10000000-0000-4000-8000-000000000703"],
};

const seedUsers = [
  [ids.users[0], "jose.ignacio@ibieta.cl", "José Ignacio Ibieta", "JI", "2026-03-04T12:00:00Z"],
  [ids.users[1], "matias@estudio.cl", "Matías Soto", "MS", "2026-04-18T12:00:00Z"],
  [ids.users[2], "camila@estudio.cl", "Camila León", "CL", "2026-06-02T12:00:00Z"],
  [ids.users[3], "victor@ibieta.cl", "Victor Tirreau", "VT", "2026-08-22T12:00:00Z"],
] as const;

const seedBrands = [
  [ids.brands[0], "BM-018", "NOVA FOODS", "Grupo Nova SpA", "1428891", "Chile", "Activa", "2026-08-19T09:42:00-04:00", [29, 30, 35]],
  [ids.brands[1], "BM-017", "TERRA SUR", "Terra Sur Limitada", "1413208", "Chile", "Activa", "2026-08-19T08:16:00-04:00", [33, 35]],
  [ids.brands[2], "BM-016", "CASA NUBE", "Inmobiliaria Casa Nube", "1399480", "Chile", "Activa", "2026-08-18T18:32:00-04:00", [36, 37]],
  [ids.brands[3], "BM-015", "PULSO", "Pulso Salud SpA", "1377012", "Chile", "Procesando", "2026-08-19T09:30:00-04:00", [5, 10, 44]],
  [ids.brands[4], "BM-014", "LINARIA", "Laboratorios Linaria", "1351164", "Chile", "Pausada", "2026-08-12T16:10:00-04:00", [3, 5]],
] as const;

type SupplementalBrand = { id: string; code: string; name: string; owner: string; registration: string; status: "Activa" | "Procesando"; niceClasses: number[]; rut: string; visual: string };
const supplementalSeedBrands: SupplementalBrand[] = ["ALTURA", "BRISA PACÍFICO", "CÍRCULO", "DORADA", "ENLACE", "FARO SUR", "GRANO VIVO", "HORIZONTE", "ÍNDIGO", "JARDÍN NORTE", "KORA", "LUMEN", "MÁREA", "NEXO", "ORIGEN"].map((name, index) => ({
  id: `10000000-0000-4000-8000-${String(300 + index).padStart(12, "0")}`,
  code: `BM-${100 + index}`,
  name,
  owner: `${name} Chile SpA`,
  registration: String(1502300 + index),
  status: index % 4 === 0 ? "Procesando" : "Activa",
  niceClasses: index % 2 ? [9, 35, 42] : [29, 30, 32],
  rut: `77.${String(300000 + index * 921).padStart(6, "0")}-${index % 10}`,
  visual: name.slice(0, 6),
}));

const seedMatches = [
  [ids.matches[0], "CO-2481", ids.brands[0], "Diario Oficial", "1570234", "2026-08-19", "NOVA FUDS", "Alimentos del Pacífico Ltda.", "1570234", "Alta", 94, "Pendiente", "2026-08-27", ids.users[0]],
  [ids.matches[1], "CO-2479", ids.brands[1], "Diario Oficial", "1570189", "2026-08-19", "TERRA DEL SUR", "Viñas del Valle SpA", "1570189", "Alta", 87, "Pendiente", "2026-08-29", ids.users[1]],
  [ids.matches[2], "CO-2472", ids.brands[2], "INAPI", "1569912", "2026-08-18", "CASANUBE", "Desarrollos Urbanos S.A.", "1569912", "Media", 73, "En observación", null, ids.users[0]],
  [ids.matches[3], "CO-2468", ids.brands[0], "INAPI", "1569781", "2026-08-18", "NOVO FOOD LAB", "Novo Lab Chile", "1569781", "Media", 66, "Pendiente", null, ids.users[2]],
  [ids.matches[4], "CO-2451", ids.brands[4], "Diario Oficial", "1569114", "2026-08-15", "LINAR", "Cosmética Natural Chile", "1569114", "Baja", 48, "Descartada", null, ids.users[2]],
  [ids.matches[5], "CO-2485", ids.brands[0], "Diario Oficial", "1570284", "2026-08-20", "NOVA NUTRA", "Nutra Chile SpA", "1570284", "Alta", 91, "Pendiente", "2026-08-31", ids.users[0]],
  [ids.matches[6], "CO-2483", ids.brands[1], "INAPI", "1570256", "2026-08-20", "TIERRA SUR", "Tierra Sur Comercial SpA", "1570256", "Media", 79, "Pendiente", null, ids.users[1]],
  [ids.matches[7], "CO-2476", ids.brands[2], "Diario Oficial", "1570117", "2026-08-19", "CASA NUBIA", "Nubia Desarrollos Ltda.", "1570117", "Media", 70, "Pendiente", null, ids.users[2]],
  [ids.matches[8], "CO-2463", ids.brands[3], "INAPI", "1569564", "2026-08-18", "PULSO VITAL", "Vital Salud S.A.", "1569564", "Baja", 55, "Pendiente", null, ids.users[0]],
  [ids.matches[9], "CO-2458", "10000000-0000-4000-8000-000000000300", "Diario Oficial", "1569372", "2026-08-17", "ALTURIA", "Alturia Outdoor SpA", "1569372", "Baja", 43, "Pendiente", null, ids.users[1]],
] as const;

const seedCases = [
  [ids.cases[0], "BM-1042", ids.matches[0], ids.brands[0], "Grupo Nova SpA", "Oposición Nova Fuds", "Preparación", "Alta", "2026-08-20", ids.users[0]],
  [ids.cases[1], "BM-1038", ids.matches[1], ids.brands[1], "Terra Sur Limitada", "Revisión Terra del Sur", "Evaluación", "Alta", "2026-08-22", ids.users[1]],
  [ids.cases[2], "BM-1036", ids.matches[2], ids.brands[2], "Inmobiliaria Casa Nube", "Oposición CasaNube", "Presentado", "Media", "2026-09-02", ids.users[2]],
  [ids.cases[3], "BM-1027", null, ids.brands[3], "Pulso Salud SpA", "Seguimiento resolución Pulso", "Seguimiento", "Baja", "2026-09-11", ids.users[0]],
] as const;

const seedNotices = [
  [ids.notices[0], "NO-114", ids.matches[0], "Coincidencia de alta similitud", "NOVA FOODS", "Alta", null, "2026-08-19T09:42:00-04:00", "Alerta de marca: posible similitud con NOVA FOODS", "Hola,\n\nDetectamos la publicación de la solicitud NOVA FUDS, que presenta una similitud alta con la marca NOVA FOODS. La publicación corresponde a la solicitud N° 1570234 y su plazo preliminar de revisión vence el 27 de agosto de 2026.\n\nSugerimos revisar los antecedentes para definir si corresponde presentar una oposición. Puedes ver la referencia oficial en la ficha adjunta.\n\nQuedo atento a tus comentarios.\n\nSaludos,"],
  [ids.notices[1], "NO-112", ids.matches[1], "Plazo legal próximo", "TERRA SUR", "Alta", null, "2026-08-18T16:20:00-04:00", "Próximo plazo: TERRA SUR", "Hola,\n\nTe informamos que el plazo asociado a la revisión de TERRA DEL SUR se encuentra próximo. Recomendamos confirmar la estrategia antes del 22 de agosto.\n\nSaludos,"],
] as const;

export async function ensureDemoSeed() {
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`INSERT INTO plans (id, code, name, brand_limit) VALUES (${DEMO_PLAN_ID}, 'study', 'Estudio', 25) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO organizations (id, name, slug) VALUES (${DEMO_ORG_ID}, 'Estudio Ibieta IP', 'estudio-ibieta-ip') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, updated_at = now()`;
    for (const user of seedUsers) {
      await tx`INSERT INTO users (id, email, name, initials, created_at, updated_at) VALUES (${user[0]}, ${user[1]}, ${user[2]}, ${user[3]}, ${user[4]}, ${user[4]}) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, initials = EXCLUDED.initials, updated_at = now()`;
      await tx`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${DEMO_ORG_ID}, ${user[0]}, ${user[0] === DEMO_USER_ID ? "admin" : "member"}) ON CONFLICT DO NOTHING`;
    }
    await tx`INSERT INTO subscriptions (id, organization_id, plan_id, status, period_start, period_end) VALUES (${DEMO_SUBSCRIPTION_ID}, ${DEMO_ORG_ID}, ${DEMO_PLAN_ID}, 'active', '2026-08-01', '2026-08-31') ON CONFLICT (id) DO NOTHING`;
    for (const brand of seedBrands) {
      await tx`INSERT INTO brands (id, organization_id, public_code, name, word_mark, owner_name, registration_number, jurisdiction, status, created_by, last_reviewed_at, created_at, updated_at) VALUES (${brand[0]}, ${DEMO_ORG_ID}, ${brand[1]}, ${brand[2]}, ${brand[2]}, ${brand[3]}, ${brand[4]}, ${brand[5]}, ${brand[6]}, ${DEMO_USER_ID}, ${brand[7]}, ${brand[7]}, ${brand[7]}) ON CONFLICT (id) DO NOTHING`;
      for (const niceClass of brand[8]) await tx`INSERT INTO brand_classes (brand_id, nice_class) VALUES (${brand[0]}, ${niceClass}) ON CONFLICT DO NOTHING`;
    }
    const [brandCount] = await tx`SELECT count(*)::int AS count FROM brands WHERE organization_id = ${DEMO_ORG_ID} AND archived_at IS NULL`;
    for (const brand of supplementalSeedBrands.slice(0, Math.max(0, 20 - Number(brandCount.count)))) {
      await tx`INSERT INTO brands (id, organization_id, public_code, name, word_mark, owner_name, registration_number, jurisdiction, status, monitoring_config, created_by) VALUES (${brand.id}, ${DEMO_ORG_ID}, ${brand.code}, ${brand.name}, ${brand.name}, ${brand.owner}, ${brand.registration}, 'Chile', ${brand.status}, ${tx.json({ rut: brand.rut, inapiUrl: 'https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx', visual: brand.visual })}, ${DEMO_USER_ID}) ON CONFLICT (id) DO NOTHING`;
      for (const niceClass of brand.niceClasses) await tx`INSERT INTO brand_classes (brand_id, nice_class) VALUES (${brand.id}, ${niceClass}) ON CONFLICT DO NOTHING`;
    }
    for (const match of seedMatches) {
      await tx`INSERT INTO matches (id, organization_id, public_code, brand_id, source, source_record_id, published_at, found_name, applicant, application_number, level, total_score, explanation, review_status, legal_deadline, owner_id, created_at, updated_at) VALUES (${match[0]}, ${DEMO_ORG_ID}, ${match[1]}, ${match[2]}, ${match[3]}, ${match[4]}, ${match[5]}, ${match[6]}, ${match[7]}, ${match[8]}, ${match[9]}, ${match[10]}, ${`Coincidencia de demostración con puntaje ${match[10]}. El motor real no está conectado.`}, ${match[11]}, ${match[12]}, ${match[13]}, ${`${match[5]}T14:00:00Z`}, ${`${match[5]}T14:00:00Z`}) ON CONFLICT (id) DO NOTHING`;
      for (const [type, factor] of [["denominativa", 1], ["fonetica", 0.93], ["clase", 0.86]] as const) await tx`INSERT INTO match_scores (match_id, score_type, score, engine_version, evidence) VALUES (${match[0]}, ${type}, ${Math.round(match[10] * factor)}, 'demo-only', ${tx.json({ demo: true })}) ON CONFLICT DO NOTHING`;
    }
    for (const item of seedCases) await tx`INSERT INTO cases (id, organization_id, public_code, source_match_id, brand_id, client_name, title, stage, priority, next_deadline, owner_id, created_by) VALUES (${item[0]}, ${DEMO_ORG_ID}, ${item[1]}, ${item[2]}, ${item[3]}, ${item[4]}, ${item[5]}, ${item[6]}, ${item[7]}, ${item[8]}, ${item[9]}, ${DEMO_USER_ID}) ON CONFLICT (id) DO NOTHING`;
    for (let index = 0; index < 3; index += 1) await tx`UPDATE matches SET case_id = ${ids.cases[index]} WHERE id = ${ids.matches[index]} AND case_id IS NULL`;
    await tx`DELETE FROM notifications WHERE organization_id = ${DEMO_ORG_ID} AND public_code = 'NO-108'`;
    for (const notice of seedNotices) {
      await tx`INSERT INTO notifications (id, organization_id, public_code, user_id, entity_type, entity_id, type, title, brand_name, urgency, managed_at, created_at, updated_at) VALUES (${notice[0]}, ${DEMO_ORG_ID}, ${notice[1]}, ${DEMO_USER_ID}, 'match', ${notice[2]}, 'client_email_draft', ${notice[3]}, ${notice[4]}, ${notice[5]}, ${notice[6]}, ${notice[7]}, ${notice[7]}) ON CONFLICT (id) DO NOTHING`;
      const draftId = ids.drafts[seedNotices.indexOf(notice)];
      await tx`INSERT INTO email_drafts (id, organization_id, notification_id, subject, body, generated_by, generated_at) VALUES (${draftId}, ${DEMO_ORG_ID}, ${notice[0]}, ${notice[8]}, ${notice[9]}, ${DEMO_USER_ID}, ${notice[7]}) ON CONFLICT (id) DO NOTHING`;
    }
  });
}

const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const displayPersonName = (name: string) => name === "Rosario Vial" ? "José Ignacio Ibieta" : name;
function shortDate(value: string | Date | null, includeYear = false) {
  if (!value) return "Por definir";
  const date = new Date(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return `${String(date.getUTCDate()).padStart(2, "0")} ${monthNames[date.getUTCMonth()]}${includeYear ? ` ${date.getUTCFullYear()}` : ""}`;
}

export async function getDemoSnapshot() {
  const sql = getSql();
  const brandRows = await sql`SELECT b.id, b.public_code, b.name, b.owner_name, b.registration_number, b.jurisdiction, b.status, b.updated_at, b.monitoring_config, COALESCE(string_agg(DISTINCT lpad(bc.nice_class::text, 2, '0'), ', ' ORDER BY lpad(bc.nice_class::text, 2, '0')), '') AS classes, count(DISTINCT m.id)::int AS matches_count, count(DISTINCT c.id)::int AS cases_count FROM brands b LEFT JOIN brand_classes bc ON bc.brand_id = b.id LEFT JOIN matches m ON m.brand_id = b.id LEFT JOIN cases c ON c.brand_id = b.id WHERE b.organization_id = ${DEMO_ORG_ID} AND b.archived_at IS NULL GROUP BY b.id ORDER BY b.public_code DESC`;
  const matchRows = await sql`SELECT m.public_code, b.public_code AS brand_code, b.name AS brand_name, b.registration_number AS brand_registration, b.monitoring_config, m.source_record_id, m.found_name, m.applicant, m.application_number, m.total_score, m.level, m.review_status, m.published_at, m.legal_deadline, m.source, m.official_url, COALESCE(u.name, 'Sin asignar') AS owner_name FROM matches m JOIN brands b ON b.id = m.brand_id LEFT JOIN users u ON u.id = m.owner_id WHERE m.organization_id = ${DEMO_ORG_ID} ORDER BY m.total_score DESC`;
  const caseRows = await sql`SELECT c.public_code, c.title, COALESCE(b.name, 'Sin marca') AS brand_name, c.client_name, c.stage, c.priority, c.next_deadline, COALESCE(u.name, 'Sin asignar') AS owner_name, m.public_code AS source_match FROM cases c LEFT JOIN brands b ON b.id = c.brand_id LEFT JOIN users u ON u.id = c.owner_id LEFT JOIN matches m ON m.id = c.source_match_id WHERE c.organization_id = ${DEMO_ORG_ID} AND c.status = 'active' ORDER BY c.created_at DESC`;
  const userRows = await sql`SELECT u.id, u.name, u.email, u.initials, om.created_at FROM organization_members om JOIN users u ON u.id = om.user_id WHERE om.organization_id = ${DEMO_ORG_ID} ORDER BY om.created_at`;
  const noticeRows = await sql`SELECT n.public_code, n.title, n.brand_name, n.urgency, n.managed_at, n.created_at, d.subject, d.body FROM notifications n JOIN email_drafts d ON d.notification_id = n.id WHERE n.organization_id = ${DEMO_ORG_ID} ORDER BY n.created_at DESC`;

  return {
    brands: brandRows.map((row) => {
      const config = (row.monitoring_config ?? {}) as { rut?: string; inapiUrl?: string; visual?: string };
      return { id: row.public_code, name: row.name, owner: row.owner_name, registration: row.registration_number ?? "Pendiente", classes: row.classes, country: row.jurisdiction, status: row.status === "Pausada" ? "Sin monitoreo" : "En monitoreo", matches: Number(row.matches_count), cases: Number(row.cases_count), updated: shortDate(row.updated_at, true), rut: config.rut ?? `77.100.${String(row.public_code).replace(/\D/g, "").padStart(3, "0")}-1`, inapiUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx", visual: config.visual ?? row.name.slice(0, 6) };
    }),
    matches: matchRows.map((row) => {
      const config = (row.monitoring_config ?? {}) as { rut?: string };
      const applicationDigits = String(row.application_number).replace(/\D/g, "").slice(-6).padStart(6, "0");
      return { id: row.public_code, brandId: row.brand_code, brand: row.brand_name, found: row.found_name, applicant: row.applicant, application: row.application_number, score: Number(row.total_score), level: row.level, status: row.review_status, date: shortDate(row.published_at, true), deadline: row.legal_deadline ? shortDate(row.legal_deadline, true) : undefined, source: row.source, owner: displayPersonName(row.owner_name), rut: config.rut ?? `77.100.${String(row.brand_code).replace(/\D/g, "").padStart(3, "0")}-1`, applicantRut: `77.${applicationDigits}-${Number(applicationDigits) % 10}`, officialUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx", brandRegistration: row.brand_registration ?? undefined, officialRegistration: row.source_record_id ? `DO-${row.source_record_id}` : undefined };
    }),
    cases: caseRows.map((row) => ({ id: row.public_code, title: row.title, brand: row.brand_name, client: row.client_name, stage: row.stage, priority: row.priority, deadline: shortDate(row.next_deadline), owner: displayPersonName(row.owner_name), sourceMatch: row.source_match ?? undefined })),
    users: userRows.map((row) => ({ id: row.id, name: displayPersonName(row.name), email: row.name === "Rosario Vial" ? "jose.ignacio@ibieta.cl" : row.email, createdAt: shortDate(row.created_at, true), initials: row.name === "Rosario Vial" ? "JI" : row.initials })),
    notices: noticeRows.map((row) => ({ id: row.public_code, title: row.title, brand: row.brand_name, urgency: row.urgency, status: row.managed_at ? "Gestionada" : "Pendiente", date: shortDate(row.created_at, true), subject: row.subject, body: row.body })),
  };
}

export async function resetDemoData() {
  const sql = getSql();
  await sql`DELETE FROM organizations WHERE id = ${DEMO_ORG_ID}`;
  await ensureDemoSeed();
}
