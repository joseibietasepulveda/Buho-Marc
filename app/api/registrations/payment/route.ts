import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { updatedApplication } from "@/db/source";
import { withSession } from "@/lib/auth";
import { actorId, organizationId } from "@/lib/tenant-context";
import { sameOrigin, sourceError } from "@/lib/source-api";
import { paymentActKey, paymentKind } from "@/lib/registration-payment";
import type { RegistrationApplication } from "@/lib/registration-data";
import { reprojectInapiRecord } from "@/lib/inapi-provider";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("paid"), applicationId: z.string().max(80), actKey: z.string().min(1).max(4000) }).strict(),
  z.object({ action: z.literal("revoke"), applicationId: z.string().max(80), paymentId: z.string().uuid() }).strict(),
]);
export const POST = withSession(async request => {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    const result = await getSql().begin(async tx => {
      const [row] = await tx`SELECT a.id, a.data, r.data AS source_data FROM registration_applications a LEFT JOIN source_snapshots s ON s.organization_id = a.organization_id AND s.entity_id = a.id AND s.entity_type = 'application' LEFT JOIN source_records r ON r.id = s.source_id WHERE a.organization_id = ${organizationId()} AND a.public_code = ${input.applicationId} FOR UPDATE OF a`;
      if (!row || row.data.portfolioRole === "third-party") return { status: 404, message: "Solicitud propia no encontrada" };
      const stored = row.data as RegistrationApplication;
      const current = row.source_data ? updatedApplication(stored, reprojectInapiRecord(row.source_data), stored.recentEvent) : stored;
      const before = stored.manualPayments ?? [];
      const now = new Date().toISOString();
      let after = before;
      if (input.action === "paid") {
        const kind = paymentKind(current);
        if (!kind || paymentActKey(current) !== input.actKey) return { status: 409, message: "La obligación cambió. Actualiza la solicitud antes de informar el pago." };
        if (before.some(p => !p.revokedAt && p.kind === kind && p.actKey === input.actKey)) return { status: 200 };
        after = [...before, { id: randomUUID(), kind, actKey: input.actKey, recordedAt: now, recordedBy: actorId() }];
      } else {
        if (!before.some(p => p.id === input.paymentId && !p.revokedAt)) return { status: 409, message: "El aviso de pago ya fue retirado." };
        after = before.map(p => p.id === input.paymentId ? { ...p, revokedAt: now, revokedBy: actorId() } : p);
      }
      await tx`UPDATE registration_applications SET data = data || ${tx.json({ manualPayments: after })}, updated_at = now() WHERE organization_id = ${organizationId()} AND id = ${row.id}`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, before_data, after_data) VALUES (${organizationId()}, ${actorId()}, ${`registration.payment.${input.action}`}, 'application', ${row.id}, ${tx.json({ manualPayments: before })}, ${tx.json({ manualPayments: after })})`;
      return { status: 200 };
    });
    return NextResponse.json(result.status === 200 ? { ok: true } : { message: result.message }, { status: result.status });
  } catch (error) { return sourceError(error); }
});
