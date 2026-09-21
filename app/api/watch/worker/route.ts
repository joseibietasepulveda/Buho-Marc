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
  return NextResponse.json({ ...await processWatchJob(), enqueueErrors });
}
