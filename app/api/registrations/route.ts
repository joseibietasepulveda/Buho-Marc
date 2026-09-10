import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { DEMO_ORG_ID } from "@/db/demo";
import { ensureSourceSeed, updatedApplication } from "@/db/source";
import { sourceError } from "@/lib/source-api";
import { isRealSource, reprojectInapiRecord } from "@/lib/inapi-provider";
import type { SourceRecord } from "@/lib/source-contract";
import type { RegistrationApplication } from "@/lib/registration-data";
import { applyRegistrationEvidence } from "@/lib/registration-evidence";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await ensureSourceSeed();
    const rows = await getSql()`SELECT a.data, r.data AS source_data FROM registration_applications a LEFT JOIN source_snapshots s ON s.entity_id = a.id AND s.entity_type = 'application' AND s.organization_id = a.organization_id LEFT JOIN source_records r ON r.id = s.source_id WHERE a.organization_id = ${DEMO_ORG_ID} ORDER BY a.public_code DESC`;
    const applications = rows.map(row => {
      const application = row.data as RegistrationApplication;
      const record = row.source_data as SourceRecord | undefined;
      return application.provider === "inapi" && record?.provider === "inapi" ? updatedApplication(application, reprojectInapiRecord(record), application.recentEvent) : applyRegistrationEvidence(application);
    }).filter(a => !isRealSource() || a.provider === "inapi");
    const tasks = await getSql()`SELECT t.id, t.title, t.status, t.due_date::text AS due_date, t.assignee_id, a.public_code FROM registration_tasks t JOIN registration_applications a ON a.id = t.application_id WHERE t.organization_id = ${DEMO_ORG_ID} AND a.organization_id = ${DEMO_ORG_ID} ORDER BY t.created_at`;
    return NextResponse.json({ tasks: tasks.filter(task => applications.some(a => a.id === task.public_code)).map(task => ({ id: task.id, title: task.title, status: task.status, dueDate: task.due_date ? String(task.due_date).slice(0, 10) : null, assigneeId: task.assignee_id, applicationId: task.public_code })), provider: isRealSource() ? "inapi" : "simulated", applications });
  } catch (error) { return sourceError(error); }
}
