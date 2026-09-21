import { NextResponse } from "next/server";
import { hasToken } from "@/lib/source-api";
import { getSql } from "@/db";
import { runAs } from "@/lib/tenant-context";
import { processWatchJob, queueWatch } from "@/db/similarity";
import { similarityConfigured } from "@/lib/similarity-provider";
export const runtime = "nodejs";
export const maxDuration = 600;
export async function POST(request: Request) {
  if (!hasToken(request, process.env.MONITORING_CRON_SECRET)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 403 });
  if (!similarityConfigured()) return NextResponse.json({ skipped: true });
  const organizations = await getSql()`SELECT DISTINCT ON (o.id) o.id, o.name, u.id AS user_id, u.name AS user_name, m.role FROM organizations o JOIN organization_members m ON m.organization_id = o.id JOIN users u ON u.id = m.user_id WHERE o.status = 'active' ORDER BY o.id, (m.role = 'admin') DESC, m.created_at`;
  let enqueueErrors = 0;
  for (const org of organizations) {
    try { await runAs({ organizationId: org.id, organizationName: org.name, userId: org.user_id, name: org.user_name, role: org.role, mustChangePassword: false }, () => queueWatch()); }
    catch { enqueueErrors++; }
  }
  const outcome = await processWatchJob();
  const progress = await getSql()`SELECT o.slug AS organization, count(*)::int AS total,
    count(*) FILTER (WHERE s.id IS NOT NULL)::int AS reviewed,
    count(*) FILTER (WHERE s.stock_limit >= 50)::int AS stock50,
    count(*) FILTER (WHERE j.status IN ('queued','running','retry'))::int AS pending,
    count(*) FILTER (WHERE j.status = 'failed')::int AS failed
    FROM brands b JOIN organizations o ON o.id = b.organization_id
    LEFT JOIN LATERAL (SELECT id, (request->>'limit')::int AS stock_limit FROM monitoring_jobs WHERE brand_id = b.id AND status = 'success' AND result IS NOT NULL ORDER BY completed_at DESC LIMIT 1) s ON true
    LEFT JOIN LATERAL (SELECT status FROM monitoring_jobs WHERE brand_id = b.id AND request <> '{}'::jsonb ORDER BY created_at DESC LIMIT 1) j ON true
    WHERE b.archived_at IS NULL AND b.monitoring_config->>'provider' = 'inapi' AND b.monitoring_config ? 'monitoringEnabled'
    GROUP BY o.slug ORDER BY o.slug`;
  return NextResponse.json({ ...outcome, enqueueErrors, progress });
}
