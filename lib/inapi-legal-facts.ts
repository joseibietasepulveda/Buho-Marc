import { z } from "zod";
import type { RegistrationApplication, RegistrationStatusId } from "./registration-data";
import { evidenceDateValid, evidenceKindAllowed } from "./registration-evidence";
import { chileToday } from "./work-priorities";

const civilDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
// Proposed versioned contract: invalid facts remain raw evidence, never dates
// that activate a legal obligation. The document and target act are mandatory.
export const legalFactSchema = z.object({
  version: z.literal(1), act_id: z.string().min(1), kind: z.enum(["notification", "finality"]), date: civilDate,
  object: z.enum(["application", "opposition", "substantive-examination", "nullity", "incident"]),
  recipient_role: z.enum(["applicant", "registrant", "opponent", "respondent"]),
  method: z.enum(["daily-state", "inapi-inbox", "personal", "official-document"]),
  reference: z.string().trim().min(1).max(1000), document_url: z.string().url().refine(value => value.startsWith("https://")),
}).passthrough();
export const actClassificationSchema = z.object({
  version: z.literal(1), type: z.enum(["petition", "decision", "response", "payment", "notification"]),
  object: z.enum(["application", "opposition", "substantive-examination", "nullity", "incident", "annotation", "final-payment"]),
  outcome: z.enum(["opens-evidence", "answer-filed", "withdrawn", "not-filed", "abandoned", "accepted", "partially-accepted", "rejected", "granted", "paid", "pending"]),
}).passthrough();
export function structuredActStage(value: unknown): { recognized: boolean; stage?: RegistrationStatusId } {
  const parsed = actClassificationSchema.safeParse(value);
  if (!parsed.success) return { recognized: false };
  const { type, object, outcome } = parsed.data;
  if (type === "petition" || ["nullity", "incident", "annotation"].includes(object)) return { recognized: true };
  let stage: RegistrationStatusId | undefined;
  if (object === "opposition") {
    if (type === "decision" && outcome === "opens-evidence") stage = "evidence-period";
    if (type === "response" && outcome === "answer-filed") stage = "opposition-answered";
  }
  if (object === "substantive-examination" && type === "response" && outcome === "answer-filed") stage = "substantive-exam";
  if (object === "application" && type === "decision") stage = ({ withdrawn: "withdrawn", "not-filed": "not-filed", abandoned: "abandoned-inapi", accepted: "finality-pending", "partially-accepted": "partial-appeal", rejected: "rejected-appeal", granted: "registered" } as Partial<Record<string, RegistrationStatusId>>)[outcome];
  if (object === "final-payment" && type === "payment" && outcome === "paid") stage = "payment-verification";
  return { recognized: true, stage };
}
export function applySourceLegalFacts(application: RegistrationApplication, events: { event_id?: string | null; legal_facts?: unknown }[], today = chileToday()): RegistrationApplication {
  function decorate(target: RegistrationApplication) {
    const p = { ...target.procedure };
    const object = ["opposition-answer", "evidence-period"].includes(target.statusId) ? "opposition" : target.statusId === "substantive-objection" ? "substantive-examination" : "application";
    for (const event of events) for (const raw of Array.isArray(event.legal_facts) ? event.legal_facts : []) {
      const result = legalFactSchema.safeParse(raw);
      if (!result.success) continue;
      const fact = result.data;
      if (fact.act_id !== p.sourceActId || fact.act_id !== event.event_id || fact.object !== object || !["applicant", "registrant", "respondent"].includes(fact.recipient_role)) continue;
      if (!evidenceKindAllowed(target, fact) || !evidenceDateValid(target, fact.date, today)) continue;
      const proof = { date: fact.date, method: fact.method, reference: fact.reference, sourceUrl: fact.document_url, verifiedBy: "source" as const };
      if (fact.kind === "notification") { p.notifiedAt = fact.date; p.notificationProof = proof; }
      if (fact.kind === "finality") { p.finalAt = fact.date; p.finalityProof = proof; }
    }
    return p;
  }
  const procedure = decorate(application);
  if (procedure.concurrent) procedure.concurrent = procedure.concurrent.map(item => {
    const p = decorate({ ...application, statusId: item.statusId, procedure: item });
    return { ...item, notifiedAt: p.notifiedAt, notificationProof: p.notificationProof };
  });
  return { ...application, procedure };
}
