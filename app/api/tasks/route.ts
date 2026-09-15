import { withSession } from "@/lib/auth";
import { organizationId, actorId } from "@/lib/tenant-context";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/db";

import { ensureSourceSeed } from "@/db/source";
import { taskSchema } from "@/lib/task-validation";
import { sameOrigin, sourceError } from "@/lib/source-api";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), entityType: z.literal("application"), entityId: z.string().min(1).max(100), task: taskSchema }),
  z.object({ action: z.literal("delete"), entityType: z.enum(["case", "application"]), entityId: z.string().min(1).max(100), taskId: z.string().uuid() }),
]);
async function handlePOST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  try {
    const input = requestSchema.parse(await request.json());
    await ensureSourceSeed();
    const sql = getSql();
    await sql.begin(async tx => {
      if (input.entityType === "case") {
        const [removed] = await tx`DELETE FROM case_tasks t USING cases c WHERE t.case_id = c.id AND c.public_code = ${input.entityId} AND c.organization_id = ${organizationId()} AND t.organization_id = ${organizationId()} AND t.id = ${input.taskId} RETURNING t.id`;
        if (!removed) throw new Error("No se encontró la tarea en este caso");
      } else {
        const [application] = await tx`SELECT id FROM registration_applications WHERE organization_id = ${organizationId()} AND public_code = ${input.entityId} FOR UPDATE`;
        if (!application) throw new Error("Solicitud no encontrada");
        if (input.action === "delete") {
          const [removed] = await tx`DELETE FROM registration_tasks WHERE id = ${input.taskId} AND application_id = ${application.id} AND organization_id = ${organizationId()} RETURNING id`;
          if (!removed) throw new Error("No se encontró la tarea en esta solicitud");
        } else {
          const task = input.task;
          const [existing] = await tx`SELECT application_id, organization_id FROM registration_tasks WHERE id = ${task.id}`;
          if (existing && (existing.application_id !== application.id || existing.organization_id !== organizationId())) throw new Error("La tarea pertenece a otro expediente");
          if (task.assigneeId) {
            const [member] = await tx`SELECT user_id FROM organization_members WHERE organization_id = ${organizationId()} AND user_id = ${task.assigneeId}`;
            if (!member) throw new Error("El responsable no pertenece al equipo");
          }
          await tx`INSERT INTO registration_tasks (id, organization_id, application_id, title, status, priority, due_date, assignee_id) VALUES (${task.id}, ${organizationId()}, ${application.id}, ${task.title}, ${task.status}, ${task.priority}, ${task.dueDate ?? null}, ${task.assigneeId ?? null}) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority, due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id, updated_at = now()`;
        }
      }
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, ${`task.${input.action}`}, 'task', ${input.action === "delete" ? input.taskId : input.task.id}, ${tx.json({ entityType: input.entityType, entityId: input.entityId })})`;
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return sourceError(error); }
}

export const POST = withSession(handlePOST);
