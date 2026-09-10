import type { LegalEvidence, RegistrationApplication } from "./registration-data";
import { verifiedDailyNotice } from "./inapi-daily-evidence";
import { chileToday, parseWorkDate } from "./work-priorities";
import { hasContestedProceeding } from "./registration-proceedings";

export function evidenceDateValid(application: RegistrationApplication, value: string, today = chileToday()) {
  const date = parseWorkDate(value);
  const act = parseWorkDate(application.procedure?.sourceActDate);
  const filed = parseWorkDate(application.filedAt);
  return Boolean(date && act && date >= act && date <= today && (!filed || date >= filed));
}

export function currentActMatches(application: RegistrationApplication, evidence: Pick<LegalEvidence, "actId" | "actDate" | "actDescription">) {
  const p = application.procedure;
  return Boolean(p?.sourceActDate && p.sourceActDescription &&
    (p.sourceActId ?? "") === evidence.actId && p.sourceActDate === evidence.actDate && p.sourceActDescription === evidence.actDescription);
}

export function evidenceKindAllowed(application: RegistrationApplication, evidence: Pick<LegalEvidence, "kind" | "method">) {
  const status = application.statusId;
  if (evidence.kind === "notification") {
    if (!["accepted-publication", "form-observation", "substantive-objection", "opposition-answer", "evidence-period", "rejected-appeal", "partial-appeal"].includes(status)) return false;
    // Substance and opposition require their special notification. A daily list
    // is not a substitute for an unobserved inbox deposit.
    if (["substantive-objection", "opposition-answer"].includes(status)) return evidence.method === "inapi-inbox" || evidence.method === "personal";
    if (["accepted-publication", "form-observation", "evidence-period"].includes(status)) return evidence.method === "daily-state";
    // Directrices de oposición 2026, §48: the final judgment in a contested
    // proceeding is notified exclusively through Estado Diario.
    if (hasContestedProceeding(application)) return evidence.method === "daily-state";
    return evidence.method === "daily-state" || evidence.method === "inapi-inbox" || evidence.method === "personal";
  }
  if (evidence.kind === "finality") return ["finality-pending", "accepted-payment", "partial-payment", "partial-appeal"].includes(status) && evidence.method === "official-document";
  if (evidence.kind === "certificate-payment") return status === "registered" && evidence.method === "official-document";
  return ["inapi-waiting", "substantive-exam"].includes(status) && !hasContestedProceeding(application) && evidence.method === "official-document";
}

/** Decorates the application without overwriting the original INAPI payload. */
export function applyRegistrationEvidence(application: RegistrationApplication, today = chileToday()): RegistrationApplication {
  const procedure = { ...application.procedure };
  if (procedure.notificationProof?.verifiedBy === "team") { delete procedure.notifiedAt; delete procedure.notificationProof; }
  if (procedure.finalityProof?.verifiedBy === "team") { delete procedure.finalAt; delete procedure.finalityProof; }
  if (procedure.readyToResolveProof?.verifiedBy === "team") { delete procedure.readyToResolveAt; delete procedure.readyToResolveProof; }
  if (procedure.certificatePaymentProof?.verifiedBy === "team") { delete procedure.certificatePaymentAt; delete procedure.certificatePaymentProof; }
  if (application.provider === "inapi" && application.statusId === "accepted-publication") {
    const verified = verifiedDailyNotice(application.applicationNumber, {
      event_id: procedure.sourceActId, event_date: procedure.sourceActDate,
      status_code: procedure.sourceActCode, status_description: procedure.sourceActDescription,
    });
    if (verified && evidenceDateValid(application, verified.notifiedAt, today)) {
      procedure.notifiedAt = verified.notifiedAt;
      procedure.notificationProof = { date: verified.notifiedAt, method: "Estado Diario", reference: `Estado Diario 04/09/2026 · sección ${verified.section} · página ${verified.page}`, sourceUrl: verified.sourceUrl, verifiedBy: "public-document" };
    }
  }
  for (const evidence of application.legalEvidence ?? []) {
    if (evidence.revokedAt || !currentActMatches(application, evidence) || !evidenceKindAllowed(application, evidence) || !evidenceDateValid(application, evidence.date, today)) continue;
    // Publicly checked notification evidence cannot be silently replaced by a
    // team-entered date. Corrections require rechecking the original document.
    if (evidence.kind === "notification" && procedure.notificationProof?.verifiedBy === "public-document") continue;
    const proof = { date: evidence.date, method: evidence.method, reference: evidence.reference, sourceUrl: evidence.sourceUrl, verifiedBy: "team" as const };
    if (evidence.kind === "notification") { procedure.notifiedAt = evidence.date; procedure.notificationProof = proof; }
    if (evidence.kind === "finality") { procedure.finalAt = evidence.date; procedure.finalityProof = proof; }
    if (evidence.kind === "ready-to-resolve") { procedure.readyToResolveAt = evidence.date; procedure.readyToResolveProof = proof; }
    if (evidence.kind === "certificate-payment") { procedure.certificatePaymentAt = evidence.date; procedure.certificatePaymentProof = proof; }
  }
  return { ...application, procedure };
}
