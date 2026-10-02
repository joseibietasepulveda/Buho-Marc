import { NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/db";
import { withSession } from "@/lib/auth";
import { actorId, organizationId } from "@/lib/tenant-context";
import { isPriorityNotice } from "@/lib/notification-policy";
import { sourceError } from "@/lib/source-api";
import type { FieldChange } from "@/lib/source-contract";

export const runtime = "nodejs";
const inputSchema = z.union([
  z.object({ id: z.string().min(1).max(30) }).strict(),
  z.object({ scope: z.enum(["priority", "all"]) }).strict(),
]);
export const DELETE = withSession(async request => {
  try {
    const input = inputSchema.parse(await request.json());
    const ids = await getSql().begin(async tx => {
      // Lock the existing selection. Notices generated afterwards remain in the inbox.
      const rows = "id" in input
        ? await tx`SELECT id, public_code, title, urgency, change_detail FROM notifications WHERE organization_id = ${organizationId()} AND public_code = ${input.id} AND dismissed_at IS NULL FOR UPDATE`
        : await tx`SELECT id, public_code, title, urgency, change_detail FROM notifications WHERE organization_id = ${organizationId()} AND dismissed_at IS NULL AND created_at <= now() FOR UPDATE`;
      const chosen = rows.filter(row => "id" in input || input.scope === "all" || isPriorityNotice({ title: row.title, urgency: row.urgency, changeDetail: row.change_detail as { changes: FieldChange[] } | undefined }));
      if (!chosen.length) return [];
      const internalIds = chosen.map(row => row.id);
      await tx`UPDATE notifications SET dismissed_at = now(), updated_at = now() WHERE organization_id = ${organizationId()} AND id IN ${tx(internalIds)}`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, 'notifications.dismissed', 'notification', ${chosen[0].id}, ${tx.json({ ids: chosen.map(row => row.public_code), scope: "id" in input ? "individual" : input.scope })})`;
      return chosen.map(row => row.public_code);
    });
    return NextResponse.json({ ids });
  } catch (error) { return sourceError(error); }
});
