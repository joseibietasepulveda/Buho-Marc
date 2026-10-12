import type { Sql } from "postgres";
import { DEMO_ORGANIZATION, runAs } from "../lib/tenant-context";
import { normalizeInapi } from "../lib/inapi-provider";
import { withRecord } from "../lib/similarity-provider";
import { similarityExplanation, type SimilarityHit } from "../lib/similarity-contract";
import { sourceRecordSchema } from "../lib/source-contract";
import { importRealRecord } from "./inapi-portfolio";

/** Reuses public source facts; never copies reviews, clients or feedback across tenants. */
export async function prepareElquiWatch(sql: Sql, slug: string, apply = false) {
  if (!["estudio-ibieta-ip", "barros-errazuriz"].includes(slug)) throw new Error("Organización fuera del alcance autorizado");
  return sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(741032)`;
    const [org] = await tx`SELECT o.id, o.name, m.user_id FROM organizations o JOIN organization_members m ON m.organization_id=o.id WHERE o.slug=${slug} AND o.status='active' AND m.role='admin' ORDER BY m.user_id LIMIT 1`;
    if (!org) return { slug, applied: false, missingWorkspace: true };
    const action = "watch.elqui_direction_2026_10_12";
    if ((await tx`SELECT id FROM audit_events WHERE organization_id=${org.id} AND action=${action} LIMIT 1`).length) return { slug, applied: false, alreadyApplied: true };
    const [original] = await tx`SELECT m.id, m.evidence FROM matches m JOIN brands b ON b.id=m.brand_id WHERE m.organization_id=${DEMO_ORGANIZATION} AND m.source='DeQuiénEs' AND b.monitoring_config->>'applicationNumber'='1670929' AND m.application_number='1572142' LIMIT 1`;
    const [foundSource] = await tx`SELECT data FROM source_records WHERE application_number='1670929'`;
    if (!original || !foundSource) throw new Error("Faltan antecedentes guardados del cruce ELQUI");
    const oldHit = original.evidence.hit as SimilarityHit;
    if (oldHit.applicationId !== "1572142" || original.evidence.query?.applicationId !== "1670929" || !oldHit.sourceEvidence?.dossier || !Number.isFinite(oldHit.score)) throw new Error("La evidencia no corresponde al cruce esperado");
    const found = sourceRecordSchema.parse(foundSource.data);
    const [ownSource] = await tx`SELECT data FROM source_records WHERE application_number='1572142'`;
    const own = ownSource ? sourceRecordSchema.parse(ownSource.data) : normalizeInapi({
      ...oldHit.sourceEvidence.dossier, application_id: 1572142, registration_id: oldHit.registrationId ? Number(oldHit.registrationId) : null, name: oldHit.name,
      dates: { filed_at: oldHit.filedAt, published_at: oldHit.publishedAt, registered_at: oldHit.registeredAt, expires_at: null, last_changed_at: null },
      source: { read_at: original.evidence.fetchedAt },
    });
    if (own.applicationNumber !== "1572142" || !own.registrationNumber || found.applicationNumber !== "1670929") throw new Error("Identidad o registro de los expedientes no verificados");
    const hit = withRecord({ ...original.evidence.query, score: oldHit.score, channels: oldHit.channels, history: [] }, found);
    const query = Object.fromEntries(Object.entries(oldHit).filter(([key]) => !["score", "channels", "history", "feedback", "searchId"].includes(key)));
    const evidence = { query, hit, fetchedAt: original.evidence.fetchedAt, discoveryKind: "baseline", watchPublication: false,
      presentationReversedFrom: { ownApplication: "1670929", foundApplication: "1572142", fetchedAt: original.evidence.fetchedAt, score: oldHit.score } };
    if (!apply) return { slug, applied: false, own: own.applicationNumber, found: hit.applicationId, score: hit.score };
    return runAs({ organizationId: org.id, organizationSlug: slug, userId: org.user_id, name: "Administrador", organizationName: org.name, role: "admin", mustChangePassword: false }, async () => {
      await importRealRecord(tx, own, "brand");
      const [brand] = await tx`UPDATE brands SET monitoring_config=(monitoring_config - 'presentationExample') || '{"monitoringEnabled":true,"watchOnly":false}'::jsonb WHERE organization_id=${org.id} AND public_code='BM-R-1572142' AND archived_at IS NULL RETURNING id`;
      if (!brand) throw new Error("Tv elqui.cl está archivada; no se reactivó automáticamente");
      // ELQUI stays in the existing portfolio; its earlier evidence/reviews remain intact.
      await tx`UPDATE brands SET status='Pausada', monitoring_config=monitoring_config || '{"monitoringEnabled":false}'::jsonb, updated_at=now() WHERE organization_id=${org.id} AND monitoring_config->>'applicationNumber'='1670929' AND archived_at IS NULL`;
      await tx`UPDATE monitoring_jobs SET status='cancelled',completed_at=now() WHERE organization_id=${org.id} AND brand_id IN (SELECT id FROM brands WHERE organization_id=${org.id} AND monitoring_config->>'applicationNumber'='1670929') AND status IN ('queued','retry')`;
      const [match] = await tx`INSERT INTO matches (organization_id,public_code,brand_id,source,source_record_id,published_at,found_name,applicant,application_number,level,total_score,explanation,review_status,evidence,official_url) VALUES (${org.id},'CO-ELQUI-1670929',${brand.id},'DeQuiénEs','1670929',${hit.publishedAt},${hit.name},${found.owner},'1670929','Sin clasificar',${Math.round(hit.score*100)},${similarityExplanation(hit)},'Detectada',${tx.json(JSON.parse(JSON.stringify(evidence)))},${found.officialUrl}) ON CONFLICT (organization_id,brand_id,source,source_record_id) DO NOTHING RETURNING id`;
      await tx`INSERT INTO audit_events (organization_id,actor_user_id,action,entity_type,entity_id,after_data) VALUES (${org.id},${org.user_id},${action},'brand',${brand.id},${tx.json({ ownApplication: "1572142", foundApplication: "1670929", score: hit.score, reusedPublicEvidence: true, matchCreated: Boolean(match) })})`;
      return { slug, applied: true, matchCreated: Boolean(match), own: "1572142", found: "1670929", score: hit.score };
    });
  });
}
