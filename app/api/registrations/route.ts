import { conditionalSnapshot } from "@/lib/conditional-snapshot";
import { withSession } from "@/lib/auth";
import { organizationId } from "@/lib/tenant-context";
import { NextResponse } from "next/server";
import { getSql } from "@/db";

import { ensureSourceSeed, updatedApplication } from "@/db/source";
import { sourceError } from "@/lib/source-api";
import { isRealSource, reprojectInapiRecord } from "@/lib/inapi-provider";
import type { SourceRecord } from "@/lib/source-contract";
import type { RegistrationApplication } from "@/lib/registration-data";
import { applyRegistrationEvidence } from "@/lib/registration-evidence";
import { directRecoveryEnabled } from "@/lib/inapi-recovery";
import { automaticMonitoringEnabled } from "@/db/monitoring-policy";
import { nextSourceReview } from "@/lib/source-schedule";
export const dynamic = "force-dynamic";
async function handleGET() {
  try {
    await ensureSourceSeed();
    const rows = await getSql()`SELECT a.data, r.data AS source_data FROM registration_applications a LEFT JOIN source_snapshots s ON s.entity_id = a.id AND s.entity_type = 'application' AND s.organization_id = a.organization_id LEFT JOIN source_records r ON r.id = s.source_id WHERE a.organization_id = ${organizationId()} AND COALESCE(a.data->>'portfolioRole', 'own') <> 'third-party' ORDER BY a.public_code DESC`;
    const checks = await getSql()`SELECT DISTINCT ON(c.application_number) c.application_number,c.check_day::text AS day,c.status,c.completed_at FROM inapi_official_checks c WHERE c.application_number IN (SELECT a.data->>'applicationNumber' FROM registration_applications a WHERE a.organization_id=${organizationId()}) ORDER BY c.application_number,c.check_day DESC`;
    const applications = rows.map(row => {
      const application = row.data as RegistrationApplication;
      const record = row.source_data as SourceRecord | undefined;
      const projected = application.provider === "inapi" && record?.provider === "inapi" ? updatedApplication(application, reprojectInapiRecord(record), application.recentEvent) : applyRegistrationEvidence(application);
      const check = checks.find(c=>c.application_number===projected.applicationNumber);
      return {...projected,officialReview:{enabled:directRecoveryEnabled()&&record?.provider==="inapi",...(check?{day:check.day,status:check.status,checkedAt:check.completed_at?.toISOString()}: {})}};
    }).filter(a => !isRealSource() || a.provider === "inapi");
    const tasks = await getSql()`SELECT t.id, t.title, t.status, t.priority, t.due_date::text AS due_date, t.assignee_id, a.public_code FROM registration_tasks t JOIN registration_applications a ON a.id = t.application_id WHERE t.organization_id = ${organizationId()} AND a.organization_id = ${organizationId()} ORDER BY t.created_at`;
    return NextResponse.json({ reviewSchedule: {nextScheduledAt:nextSourceReview(new Date(),await automaticMonitoringEnabled())},tasks: tasks.filter(task => applications.some(a => a.id === task.public_code)).map(task => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, dueDate: task.due_date ? String(task.due_date).slice(0, 10) : null, assigneeId: task.assignee_id, applicationId: task.public_code })), provider: isRealSource() ? "inapi" : "simulated", applications });
  } catch (error) { return sourceError(error); }
}

export const GET = withSession(request => conditionalSnapshot(request, "registrations", handleGET));
