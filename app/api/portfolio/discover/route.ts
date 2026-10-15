import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { processPortfolioDiscovery } from "@/db/portfolio-discovery";
import { hasToken } from "@/lib/source-api";
import { isRealSource } from "@/lib/inapi-provider";
import { runAs } from "@/lib/tenant-context";
import { runAnalyticsContext } from "@/lib/analytics-telemetry";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(request: Request) {
  if (!hasToken(request, process.env.MONITORING_CRON_SECRET)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 403 });
  if (!isRealSource() || process.env.PORTFOLIO_DISCOVERY_ENABLED === "false") return NextResponse.json({ skipped: true });
  const organizations = await getSql()`SELECT DISTINCT ON (o.id) o.id, o.name, u.id AS user_id,u.name AS user_name,m.role FROM organizations o JOIN organization_members m ON m.organization_id=o.id JOIN users u ON u.id=m.user_id WHERE o.status='active' ORDER BY o.id,(m.role='admin') DESC,m.created_at`;
  for (const org of organizations) {
    const result = await runAs({ organizationId: org.id, organizationName: org.name, userId: org.user_id, name: org.user_name, role: org.role, mustChangePassword: false }, () => runAnalyticsContext({ organizationId: org.id, userId: null, automated: true }, () => processPortfolioDiscovery()));
    if (!('skipped' in result)) return NextResponse.json(result);
  }
  return NextResponse.json({ idle: true });
}
