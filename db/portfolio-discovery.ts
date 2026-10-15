import { createHash, randomUUID } from "node:crypto";
import { getSql } from "./index";
import { organizationId, actorId } from "../lib/tenant-context";
import { santiagoDay } from "../lib/source-schedule";
import { representativeForPortfolio } from "../lib/portfolio-parties";
import { discoverRepresentativePage } from "../lib/portfolio-discovery";
export async function processPortfolioDiscovery(now = new Date(), fetcher: typeof fetch = fetch) {
  const org = organizationId(), day = santiagoDay(now), sql = getSql();
  const run = await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${org}),741036)`;
    const [existing] = await tx`SELECT * FROM portfolio_discovery_runs WHERE organization_id=${org} AND day=${day}`;
    if (existing && (['complete','limited','failed'].includes(existing.status) || existing.lease_until && new Date(existing.lease_until)>now || new Date(existing.retry_at)>now)) return null;
    if (!existing) {
      const rows = await tx`SELECT DISTINCT r.application_number, r.data FROM source_snapshots s JOIN source_records r ON r.id=s.source_id LEFT JOIN brands b ON s.entity_type='brand' AND b.id=s.entity_id AND b.organization_id=s.organization_id LEFT JOIN registration_applications a ON s.entity_type='application' AND a.id=s.entity_id AND a.organization_id=s.organization_id WHERE s.organization_id=${org} AND (b.id IS NOT NULL AND b.archived_at IS NULL AND COALESCE(b.monitoring_config->>'watchOnly','false')<>'true' AND COALESCE(b.monitoring_config->>'portfolioRole','own')='own' OR a.id IS NOT NULL AND COALESCE(a.data->>'portfolioRole','own')='own') AND r.data->>'provider'='inapi'`;
      const representative = representativeForPortfolio(rows.map(r => ({ record: r.data })));
      if (representative.reason !== 'selected') return null;
      await tx`INSERT INTO portfolio_discovery_runs(organization_id,day,representative_rut) VALUES(${org},${day},${representative.rut}) ON CONFLICT DO NOTHING`;
    }
    const [claimed] = await tx`UPDATE portfolio_discovery_runs SET status='running',lease_token=${randomUUID()},lease_until=now()+interval '2 minutes',attempts=attempts+1,updated_at=now() WHERE organization_id=${org} AND day=${day} RETURNING *`;
    return claimed;
  });
  if (!run) return { skipped: true };
  try {
    const page = await discoverRepresentativePage(run.representative_rut, run.offset_cursor, fetcher);
    return await sql.begin(async tx => {
      const [lease] = await tx`SELECT day FROM portfolio_discovery_runs WHERE organization_id=${org} AND day=${day} AND lease_token=${run.lease_token} FOR UPDATE`;
      if (!lease) return { skipped: true };
      let created = 0;
      for (const id of page.ids) {
        const [known] = await tx`SELECT id FROM source_snapshots WHERE organization_id=${org} AND data->>'applicationNumber'=${id} LIMIT 1`;
        if (known) continue;
        const key = createHash('sha256').update(`${org}:${id}`).digest('hex').slice(0,24);
        const summary = `Encontramos la solicitud ${id} asociada al representante más frecuente de Mis Marcas. Revisa su titular y estado antes de incorporarla a tu cartera. No se agregó automáticamente.`;
        const [notice] = await tx`INSERT INTO notifications(organization_id,public_code,user_id,entity_type,entity_id,type,title,brand_name,urgency,change_detail) VALUES(${org},${`ND-${key}`},${actorId()},'portfolio',${org},'portfolio_discovery',${`Nueva solicitud encontrada: ${id}`},${`Solicitud ${id}`},'Media',${tx.json({kind:'portfolio-discovery',source:'platform',applicationNumber:id,changes:[],summary})}) ON CONFLICT(organization_id,public_code) DO NOTHING RETURNING id`;
        if (notice) created++;
      }
      await tx`UPDATE portfolio_discovery_runs SET status=${page.complete?'complete':page.limited?'limited':'pending'},offset_cursor=${page.next},attempts=0,discovered=discovered+${created},lease_token=NULL,lease_until=NULL,error=NULL,updated_at=now() WHERE organization_id=${org} AND day=${day}`;
      return { created, complete: page.complete, limited: page.limited, externalRequests: 1 };
    });
  } catch {
    await sql`UPDATE portfolio_discovery_runs SET status=${run.attempts>=3?'failed':'pending'},error='No se pudo completar la página; se conserva el avance.',retry_at=now()+interval '1 hour',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE organization_id=${org} AND day=${day} AND lease_token=${run.lease_token}`;
    return { failed: true };
  }
}
