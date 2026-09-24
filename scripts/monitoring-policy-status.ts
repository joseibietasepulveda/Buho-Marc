import { getSql } from "../db/index";
const sql = getSql();
try {
  const portfolios = await sql`SELECT o.slug AS portfolio, o.automatic_monitoring AS automatic,
    (SELECT count(*)::int FROM brands b WHERE b.organization_id=o.id AND b.archived_at IS NULL AND b.monitoring_config->>'monitoringEnabled'='true') AS watch_targets
    FROM organizations o WHERE o.status='active' ORDER BY o.slug`;
  console.info("[monitoreo] Programación por cartera:", JSON.stringify(portfolios));
} finally { await sql.end(); }
