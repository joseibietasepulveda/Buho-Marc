import { getSql } from "./index";
import { DEMO_ORG_ID, DEMO_USER_ID } from "./demo";
import { ensureSourceSeed, updatedApplication } from "./source";
import { chileClock, compareRecords, describeChanges, type SourceRecord, type Lookup } from "../lib/source-contract";
import { fetchSource } from "../lib/source-provider";
import type { RegistrationApplication } from "../lib/registration-data";
import { isRealSource } from "../lib/inapi-provider";
import { realBrandConfig, importRealRecord } from "./inapi-portfolio";

export async function syncSource(trigger: "manual" | "scheduled", provider = fetchSource, now = new Date()) {
  const clock = chileClock(now);
  if (trigger === "scheduled" && !clock.due) return { skipped: true, reason: "La revisión está programada a las 12:30 de Chile" };
  await ensureSourceSeed();
  const sql = getSql();
  const claim = await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(741028)`;
    await tx`UPDATE source_sync_runs SET status = 'failed', completed_at = now(), error = 'Proceso interrumpido; se liberó la revisión para reintentar' WHERE organization_id = ${DEMO_ORG_ID} AND status = 'running' AND started_at < now() - interval '5 minutes'`;
    const active = await tx`SELECT id FROM source_sync_runs WHERE organization_id = ${DEMO_ORG_ID} AND status = 'running'`;
    if (active.length) return { skip: "Ya hay una revisión en curso" };
    if (trigger === "scheduled") {
      const today = await tx`SELECT status, started_at FROM source_sync_runs WHERE organization_id = ${DEMO_ORG_ID} AND trigger = 'scheduled' AND scheduled_day = ${clock.day} ORDER BY started_at DESC`;
      if (today.some(r => r.status === "success")) return { skip: "La revisión automática de hoy ya finalizó" };
      if (today.length >= 3) return { skip: "La revisión falló tres veces; revise la fuente y use Revisar para reintentar" };
      if (today[0] && now.getTime() - new Date(today[0].started_at).getTime() < 300000) return { skip: "Próximo reintento en cinco minutos" };
    }
    const targets = await tx`SELECT s.* FROM source_snapshots s LEFT JOIN brands b ON s.entity_type = 'brand' AND b.id = s.entity_id LEFT JOIN registration_applications a ON s.entity_type = 'application' AND a.id = s.entity_id WHERE s.organization_id = ${DEMO_ORG_ID} AND ((s.entity_type = 'brand' AND b.archived_at IS NULL AND b.status <> 'Pausada') OR (s.entity_type = 'application' AND a.id IS NOT NULL))`;
    const selectedTargets = targets.filter(t => (!isRealSource() || t.data.provider === "inapi") && !(t.entity_type === "application" && t.data.status === "registered" && targets.some(b => b.entity_type === "brand" && b.data.applicationNumber === t.data.applicationNumber)));
    const records = selectedTargets.map(t => t.data as SourceRecord);
    const input: Lookup = { applicationIds: [...new Set(records.map(r => r.applicationNumber))], registrationIds: [...new Set(records.flatMap(r => r.registrationNumber ? [r.registrationNumber] : []))] };
    const [run] = await tx`INSERT INTO source_sync_runs (organization_id, trigger, scheduled_day, status, requested, request) VALUES (${DEMO_ORG_ID}, ${trigger}, ${trigger === "scheduled" ? clock.day : null}, 'running', ${input.applicationIds.length}, ${tx.json(input)}) RETURNING id`;
    return { runId: run.id as string, input, targets: selectedTargets };
  });
  if (!("runId" in claim) || !claim.runId) return { skipped: true, reason: claim.skip };
  const { runId, input, targets } = claim;
  try {
    const response = await provider(input!);
    // The transaction commits portfolio, snapshots, notification and successful run together.
    return await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(741028)`;
      const [run] = await tx`SELECT status FROM source_sync_runs WHERE id = ${runId} FOR UPDATE`;
      if (run?.status !== "running") throw new Error("La revisión perdió su turno; vuelva a intentar");
      let changed = 0, notices = 0;
      const detail = [];
      for (const target of targets!) {
        const before = target.data as SourceRecord;
        const after = response.records.find(r => r.applicationNumber === before.applicationNumber);
        if (!after) throw new Error(`Respuesta incompleta para la solicitud ${before.applicationNumber}`);
        const changes = compareRecords(before, after);
        if (after.provider === "inapi") await tx`UPDATE source_records SET data = ${tx.json(after)}, registration_number = ${after.registrationNumber}, updated_at = now(), version = version + ${changes.length ? 1 : 0} WHERE id = ${target.source_id}`;
        if (target.entity_type === "brand") await tx`UPDATE brands SET last_reviewed_at = now() WHERE id = ${target.entity_id}`;
        if (!changes.length) continue;
        changed++;
        const message = describeChanges(before, after, changes);
        const reportable = changes.some(c => !c.ancillary);
        detail.push({ name: after.name, publicCode: target.public_code, title: reportable ? message.title : `Antecedentes complementarios de ${after.name}`, notified: reportable, changes });
        if (target.entity_type === "brand") {
          const [brand] = await tx`SELECT monitoring_config FROM brands WHERE id = ${target.entity_id} AND organization_id = ${DEMO_ORG_ID} FOR UPDATE`;
          if (!brand) throw new Error("La cartera cambió durante la revisión");
          const config = { ...brand.monitoring_config, type: after.type, rut: after.ownerRut, applicationNumber: after.applicationNumber, filingDate: after.filingDate, publicationDate: after.publicationDate, expirationDate: after.expirationDate, ownerCountry: after.ownerCountry, representativeName: after.representativeName, representativeCountry: after.representativeCountry, logo: after.logo, inapiUrl: after.officialUrl, legalStatus: after.status, registrationState: ["registered", "expired", "cancelled"].includes(after.status) ? "Registrada" : after.status.startsWith("rejected") || after.status.startsWith("abandoned") ? "Rechazada" : "En trámite" };
          const enrichedConfig = after.provider === "inapi" ? { ...brand.monitoring_config, ...realBrandConfig(after) } : { ...config, sourceHistory: [...(brand.monitoring_config.sourceHistory ?? []), { date: new Date().toISOString().slice(0, 10), title: reportable ? message.title : "Se completaron antecedentes del expediente" }] };
          await tx`UPDATE brands SET name = ${after.name}, word_mark = ${after.name}, owner_name = ${after.owner}, registration_number = ${after.registrationNumber}, registration_date = ${after.registrationDate}, monitoring_config = ${tx.json(enrichedConfig)}, last_reviewed_at = now(), updated_at = now() WHERE id = ${target.entity_id}`;
          await tx`DELETE FROM brand_classes WHERE brand_id = ${target.entity_id}`;
          for (const n of after.classes) await tx`INSERT INTO brand_classes (brand_id, nice_class) VALUES (${target.entity_id}, ${n})`;
        } else {
          const [a] = await tx`SELECT data FROM registration_applications WHERE id = ${target.entity_id} AND organization_id = ${DEMO_ORG_ID} FOR UPDATE`;
          if (!a) throw new Error("La solicitud dejó de estar en seguimiento");
          const updated = updatedApplication(a.data as RegistrationApplication, after, reportable ? message.title : "Se completaron antecedentes del expediente");
          await tx`UPDATE registration_applications SET data = ${tx.json(updated)}, updated_at = now() WHERE id = ${target.entity_id}`;
          if (after.provider === "inapi" && after.status === "registered" && after.registrationNumber) await importRealRecord(tx, after, "brand");
        }
        await tx`UPDATE source_snapshots SET data = ${tx.json(after)}, updated_at = now() WHERE id = ${target.id}`;
        if (reportable) {
          const code = `NS-${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
          const [notice] = await tx`INSERT INTO notifications (organization_id, public_code, user_id, entity_type, entity_id, type, title, brand_name, urgency, change_detail) VALUES (${DEMO_ORG_ID}, ${code}, ${DEMO_USER_ID}, ${target.entity_type}, ${target.entity_id}, 'source_change', ${message.title}, ${after.name}, ${message.urgency}, ${tx.json({ runId, changes, source: after.provider ?? "simulated", summary: message.body })}) RETURNING id`;
          await tx`INSERT INTO email_drafts (organization_id, notification_id, subject, body, generated_by) VALUES (${DEMO_ORG_ID}, ${notice.id}, ${message.title}, ${`Estimado/a cliente:\n\n${message.body}\n\nSaludos cordiales,`}, ${DEMO_USER_ID})`;
          notices++;
        }
      }
      await tx`UPDATE source_sync_runs SET status = 'success', completed_at = now(), received = ${response.records.length}, changed = ${changed}, notifications = ${notices}, detail = ${tx.json(detail)} WHERE id = ${runId}`;
      return { skipped: false, runId, requested: input!.applicationIds.length, received: response.records.length, changed, notifications: notices };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar la fuente";
    await sql`UPDATE source_sync_runs SET status = 'failed', completed_at = now(), error = ${message.slice(0, 2000)} WHERE id = ${runId} AND status = 'running'`;
    throw new Error(message);
  }
}
