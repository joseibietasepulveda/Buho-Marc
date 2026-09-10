import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { DEMO_ORG_ID, DEMO_USER_ID } from "@/db/demo";
import { ensureSourceSeed, updatedApplication } from "@/db/source";
import { reprojectInapiRecord } from "@/lib/inapi-provider";
import { sameOrigin, sourceError } from "@/lib/source-api";
import { currentActMatches, evidenceDateValid, evidenceKindAllowed } from "@/lib/registration-evidence";
import { registrationEvidenceRequest } from "@/lib/registration-evidence-validation";
import type { LegalEvidence, RegistrationApplication } from "@/lib/registration-data";
import type { SourceRecord } from "@/lib/source-contract";

class EvidenceError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  try {
    const input = registrationEvidenceRequest.parse(await request.json());
    await ensureSourceSeed();
    await getSql().begin(async tx => {
      // The same server-resolved demo identity as the rest of this workspace;
      // never accept an actor or organization supplied by the browser.
      const [member] = await tx`SELECT user_id FROM organization_members WHERE organization_id = ${DEMO_ORG_ID} AND user_id = ${DEMO_USER_ID}`;
      if (!member) throw new EvidenceError("No perteneces a este equipo", 403);
      const [row] = await tx`SELECT a.id, a.data, r.data AS source_data FROM registration_applications a LEFT JOIN source_snapshots s ON s.entity_id = a.id AND s.entity_type = 'application' AND s.organization_id = a.organization_id LEFT JOIN source_records r ON r.id = s.source_id WHERE a.organization_id = ${DEMO_ORG_ID} AND a.public_code = ${input.applicationId} FOR UPDATE OF a`;
      if (!row) throw new EvidenceError("Solicitud no encontrada", 404);
      const stored = row.data as RegistrationApplication;
      const record = row.source_data as SourceRecord | undefined;
      const application = stored.provider === "inapi" && record?.provider === "inapi" ? updatedApplication(stored, reprojectInapiRecord(record), stored.recentEvent) : stored;
      const before = stored.legalEvidence ?? [];
      const now = new Date().toISOString();
      let after: LegalEvidence[];
      if (input.action === "revoke") {
        if (!before.some(item => item.id === input.evidenceId && !item.revokedAt)) throw new EvidenceError("Este antecedente no existe o ya fue retirado", 404);
        after = before.map(item => item.id === input.evidenceId ? { ...item, revokedAt: now } : item);
      } else {
        if (!currentActMatches(application, input)) throw new EvidenceError("La actuación cambió. Actualiza la solicitud y revisa nuevamente el antecedente", 409);
        if (!evidenceKindAllowed(application, input)) throw new EvidenceError("Este tipo de antecedente o medio de notificación no corresponde a la etapa actual", 400);
        if (!evidenceDateValid(application, input.date)) throw new EvidenceError("La fecha no puede ser futura ni anterior a la actuación que acredita", 400);
        if (input.kind === "notification" && application.procedure?.notificationProof?.verifiedBy === "public-document") throw new EvidenceError("La notificación ya está acreditada en un documento público verificado. No se reemplaza con una fecha manual", 409);
        after = before.map(item => !item.revokedAt && item.kind === input.kind && currentActMatches(application, item) ? { ...item, revokedAt: now } : item);
        after.push({ id: randomUUID(), kind: input.kind, method: input.method, date: input.date, reference: input.reference, sourceUrl: input.sourceUrl || undefined, actId: input.actId, actDate: input.actDate, actDescription: input.actDescription, recordedAt: now, recordedBy: DEMO_USER_ID });
      }
      // Only local evidence changes; raw source snapshots and events stay intact.
      await tx`UPDATE registration_applications SET data = ${tx.json({ ...stored, legalEvidence: after })}, updated_at = now() WHERE id = ${row.id} AND organization_id = ${DEMO_ORG_ID}`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, before_data, after_data) VALUES (${DEMO_ORG_ID}, ${DEMO_USER_ID}, ${`registration.evidence.${input.action}`}, 'application', ${row.id}, ${tx.json({ legalEvidence: before })}, ${tx.json({ legalEvidence: after })})`;
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof EvidenceError) return NextResponse.json({ message: error.message }, { status: error.status });
    return sourceError(error);
  }
}
