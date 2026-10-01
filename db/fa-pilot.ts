import type { Sql } from "postgres";
import { hashPassword } from "../lib/password";
import { DEMO_ACTOR, DEMO_ORGANIZATION } from "../lib/tenant-context";
import { FEATURED_WATCH_PAIRS } from "../lib/featured-watch";
import { PUBLIC_BRIOCHE_EXAMPLE } from "./pilot-public-brioche";
import { realBrandConfig } from "./inapi-portfolio";
import { similarityExplanation } from "../lib/similarity-contract";

export async function provisionFaWorkspace(sql: Sql, password: string) {
  if (password.length < 12) throw new Error("La clave inicial debe tener al menos 12 caracteres");
  const hash = await hashPassword(password);
  return sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(741031)`;
    const organizations = await tx`SELECT id FROM organizations WHERE slug = 'fa-abogados'`;
    const users = await tx`SELECT id, username, password_hash FROM users WHERE lower(username) = 'fa_abogados'`;
    if (organizations.length || users.length) {
      if (organizations.length !== 1 || users.length !== 1 || users[0].username !== 'fa_abogados' || !users[0].password_hash) throw new Error("El espacio o usuario FA ya existe con una configuración distinta; no se reemplazó.");
      const memberships = await tx`SELECT organization_id, role FROM organization_members WHERE user_id = ${users[0].id}`;
      if (memberships.length !== 1 || memberships[0].organization_id !== organizations[0].id || memberships[0].role !== 'admin') throw new Error("El usuario FA tiene una vinculación distinta; no se reemplazó.");
      return { created: false, organizationId: organizations[0].id, userId: users[0].id };
    }
    const [org] = await tx`INSERT INTO organizations (name, slug) VALUES ('FA Abogados', 'fa-abogados') RETURNING id`;
    const [user] = await tx`INSERT INTO users (name, initials, username, password_hash, must_change_password) VALUES ('FA Abogados', 'FA', 'fa_abogados', ${hash}, false) RETURNING id`;
    await tx`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${org.id}, ${user.id}, 'admin')`;
    await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${org.id}, ${user.id}, 'account.created', 'user', ${user.id}, ${tx.json({ username: 'fa_abogados' })})`;
    return { created: true, organizationId: org.id, userId: user.id };
  });
}

/** One-off acknowledgment, not an ongoing rule that hides new notifications. */
export async function prepareIbietaPresentation(sql: Sql) {
  return sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(741031)`;
    const [owner] = await tx`SELECT u.id FROM organizations o JOIN organization_members m ON m.organization_id = o.id JOIN users u ON u.id = m.user_id WHERE o.id = ${DEMO_ORGANIZATION} AND o.slug = 'estudio-ibieta-ip' AND u.id = ${DEMO_ACTOR} AND m.role = 'admin'`;
    if (!owner) throw new Error("No se pudo confirmar el espacio de prueba; sus notificaciones no se modificaron.");
    const [done] = await tx`SELECT id FROM audit_events WHERE organization_id = ${DEMO_ORGANIZATION} AND action = 'pilot.presentation_prepared_2026_10_01' LIMIT 1`;
    if (done) return { applied: false, reviewed: 0 };
    const [updated] = await tx`WITH reviewed AS (UPDATE notifications SET managed_at = now(), updated_at = now() WHERE organization_id = ${DEMO_ORGANIZATION} AND managed_at IS NULL RETURNING id) SELECT count(*)::int AS n FROM reviewed`;
    await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${DEMO_ORGANIZATION}, ${DEMO_ACTOR}, 'pilot.presentation_prepared_2026_10_01', 'organization', ${DEMO_ORGANIZATION}, ${tx.json({ reviewedNotifications: updated.n })})`;
    return { applied: true, reviewed: updated.n };
  });
}

export async function featuredPilotAvailability(sql: Sql) {
  const rows = await sql`SELECT b.monitoring_config->>'applicationNumber' AS own, m.evidence->'hit'->>'applicationId' AS other, m.review_status FROM matches m JOIN brands b ON b.id = m.brand_id WHERE m.organization_id = ${DEMO_ORGANIZATION} AND m.source = 'DeQuiénEs' AND b.archived_at IS NULL`;
  return FEATURED_WATCH_PAIRS.map(([own, other]) => ({ own, other, status: rows.find(row => row.own === own && row.other === other)?.review_status ?? "missing" }));
}

/** Public comparison chosen by the user, not an imported client or portfolio. */
export async function provisionPublicBriocheExample(sql: Sql) {
  const { record, query, hit, fetchedAt } = PUBLIC_BRIOCHE_EXAMPLE;
  return sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(741031)`;
    const [owner] = await tx`SELECT u.id FROM organizations o JOIN organization_members m ON m.organization_id = o.id JOIN users u ON u.id = m.user_id WHERE o.id = ${DEMO_ORGANIZATION} AND o.slug = 'estudio-ibieta-ip' AND u.id = ${DEMO_ACTOR} AND m.role = 'admin'`;
    if (!owner) throw new Error("No se confirmó el espacio de prueba; no se incorporó el ejemplo público.");
    const config = { ...realBrandConfig(record), presentationExample: true, watchOnly: true, monitoringEnabled: false };
    await tx`INSERT INTO brands (organization_id, public_code, name, word_mark, owner_name, registration_number, status, monitoring_config, created_by) VALUES (${DEMO_ORGANIZATION}, 'EX-BRIOCHE-1638707', ${record.name}, ${record.name}, ${record.owner}, ${record.registrationNumber}, 'Activa', ${tx.json(config)}, ${DEMO_ACTOR}) ON CONFLICT (organization_id, public_code) DO NOTHING`;
    const [brand] = await tx`SELECT id, monitoring_config, archived_at FROM brands WHERE organization_id = ${DEMO_ORGANIZATION} AND public_code = 'EX-BRIOCHE-1638707'`;
    if (!brand.monitoring_config.presentationExample) throw new Error("El código del ejemplo está ocupado; no se reemplazaron datos.");
    if (brand.archived_at) return { created: false };
    for (const n of record.classes) await tx`INSERT INTO brand_classes (brand_id, nice_class) VALUES (${brand.id}, ${n}) ON CONFLICT DO NOTHING`;
    const evidence = { query, hit, fetchedAt, discoveryKind: 'baseline', presentationExample: true };
    const [match] = await tx`INSERT INTO matches (organization_id, public_code, brand_id, source, source_record_id, published_at, found_name, applicant, application_number, level, total_score, explanation, review_status, evidence) VALUES (${DEMO_ORGANIZATION}, 'CO-EX-BRIOCHE-997604', ${brand.id}, 'DeQuiénEs', ${hit.applicationId}, ${hit.publishedAt}, ${hit.name}, ${hit.holders.map(h => h.name).join('; ')}, ${hit.applicationId}, 'Sin clasificar', 0, ${similarityExplanation(hit)}, 'Detectada', ${tx.json(evidence)}) ON CONFLICT (organization_id, brand_id, source, source_record_id) DO NOTHING RETURNING id, public_code`;
    if (!match) return { created: false };
    const result = { responses: [{ query, results: [hit], warnings: [], fetchedAt }], resultIds: [match.public_code] };
    await tx`INSERT INTO monitoring_jobs (organization_id, brand_id, status, idempotency_key, requested_by, request, result, completed_at) VALUES (${DEMO_ORGANIZATION}, ${brand.id}, 'success', 'pilot-public-brioche-2026-10-01', ${DEMO_ACTOR}, ${tx.json({ presentationExample: true })}, ${tx.json(result)}, ${fetchedAt}) ON CONFLICT (organization_id, idempotency_key) DO NOTHING`;
    await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${DEMO_ORGANIZATION}, ${DEMO_ACTOR}, 'pilot.example_added', 'match', ${match.id}, ${tx.json({ applicationNumber: hit.applicationId, publicExample: true, sourceConsultedAt: fetchedAt })})`;
    return { created: true };
  });
}
