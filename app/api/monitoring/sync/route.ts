import { NextResponse } from "next/server";
import { syncSource } from "@/db/source-sync";
import { hasToken, sourceError } from "@/lib/source-api";
import { withSession } from "@/lib/auth";
import { getSql } from "@/db";
import { runAs } from "@/lib/tenant-context";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const scheduled = new URL(request.url).searchParams.get("trigger") === "scheduled";
    if (!scheduled) return withSession(async () => NextResponse.json(await syncSource("manual")))(request);
    if (!hasToken(request, process.env.MONITORING_CRON_SECRET)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 403 });
    const organizations = await getSql()`SELECT DISTINCT ON (o.id) o.id, o.name, u.id AS user_id, u.name AS user_name, m.role FROM organizations o JOIN organization_members m ON m.organization_id = o.id JOIN users u ON u.id = m.user_id WHERE o.status = 'active' AND EXISTS (SELECT 1 FROM source_snapshots s WHERE s.organization_id = o.id) ORDER BY o.id, (m.role = 'admin') DESC, m.created_at`;
    const results = [];
    for (const org of organizations) {
      try { results.push(await runAs({ organizationId: org.id, organizationName: org.name, userId: org.user_id, name: org.user_name, role: org.role, mustChangePassword: false }, () => syncSource("scheduled"))); }
      catch { results.push({ failed: true }); }
    }
    return NextResponse.json({ results }, { status: results.some(r => "failed" in r) ? 502 : 200 });
  } catch (error) { return sourceError(error); }
}
