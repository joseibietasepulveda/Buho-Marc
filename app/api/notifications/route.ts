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
async function updateNotifications(request: Request, reviewOnly = false) {
  try {
    const input = reviewOnly
      ? z.object({ scope: z.literal("priority") }).strict().parse(await request.json())
      : inputSchema.parse(await request.json());
    // Older clients also used DELETE to clear the priority indicator.
    // Preserve their notices as well, even before they refresh to the new UI.
    const reviewing = "scope" in input && input.scope === "priority";
    const ids = await getSql().begin(async tx => {
      // Lock the existing selection. Notices generated afterwards remain in the inbox.
      const rows = "id" in input
        ? await tx`SELECT id, public_code, title, urgency, change_detail, managed_at FROM notifications WHERE organization_id = ${organizationId()} AND public_code = ${input.id} AND dismissed_at IS NULL FOR UPDATE`
        : await tx`SELECT id, public_code, title, urgency, change_detail, managed_at FROM notifications WHERE organization_id = ${organizationId()} AND dismissed_at IS NULL AND COALESCE(change_detail->>'invalidated', 'false') <> 'true' AND created_at <= now() FOR UPDATE`;
      const chosen = rows.filter(row => "id" in input || input.scope === "all" || !row.managed_at && isPriorityNotice({ title: row.title, urgency: row.urgency, changeDetail: row.change_detail as { changes: FieldChange[] } | undefined }));
      if (!chosen.length) return [];
      const internalIds = chosen.map(row => row.id);
      if (reviewing) await tx`UPDATE notifications SET read_at = COALESCE(read_at, now()), managed_at = now(), updated_at = now() WHERE organization_id = ${organizationId()} AND id IN ${tx(internalIds)}`;
      else await tx`UPDATE notifications SET dismissed_at = now(), updated_at = now() WHERE organization_id = ${organizationId()} AND id IN ${tx(internalIds)}`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, ${reviewing ? "notifications.reviewed" : "notifications.dismissed"}, 'notification', ${chosen[0].id}, ${tx.json({ ids: chosen.map(row => row.public_code), scope: "id" in input ? "individual" : input.scope })})`;
      return chosen.map(row => row.public_code);
    });
    return NextResponse.json({ ids, action: reviewing ? "reviewed" : "dismissed" });
  } catch (error) { return sourceError(error); }
}
export const PATCH = withSession(request => updateNotifications(request, true));
export const DELETE = withSession(request => updateNotifications(request));
