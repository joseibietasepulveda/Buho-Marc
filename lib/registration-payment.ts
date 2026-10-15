import { hasContestedProceeding } from "./registration-proceedings";
import type { RegistrationApplication } from "./registration-data";
export function paymentActKey(app: RegistrationApplication) {
  const p = app.procedure;
  return p?.sourceActDate && p.sourceActDescription ? JSON.stringify([app.applicationNumber, p.sourceActId ?? "", p.sourceActDate, p.sourceActDescription]) : "";
}
export function paymentKind(app: RegistrationApplication) {
  const status = app.officialStatusId ?? app.statusId;
  if (status === "accepted-publication") return "publication" as const;
  if (status === "finality-pending" && hasContestedProceeding(app) && !app.procedure?.finalAt) return;
  if (["accepted-payment", "partial-payment", "finality-pending"].includes(status)) return "final" as const;
}
/** Team declarations are local evidence. Never mutate source events or assert official accreditation. */
export function applyManualPayment(app: RegistrationApplication): RegistrationApplication {
  const status = app.officialStatusId ?? app.statusId;
  const base = { ...app, statusId: status, officialStatusId: status, manualPayment: undefined };
  const payments = [...(app.manualPayments ?? [])].reverse().filter(p => !p.revokedAt);
  const kind = paymentKind(base);
  const payment = payments.find(p => p.kind === kind && p.actKey === paymentActKey(base));
  if (payment) return { ...base, statusId: payment.kind === "publication" ? "publication-pending" : "payment-verification", officialDeadline: undefined, manualPayment: { id: payment.id, kind: payment.kind, recordedAt: payment.recordedAt, state: "pending" } };
  const confirmed = payments.find(p => p.kind === "publication" ? Boolean(base.publishedAt) || status === "publication-pending" : ["payment-verification", "registered"].includes(status));
  return confirmed ? { ...base, manualPayment: { id: confirmed.id, kind: confirmed.kind, recordedAt: confirmed.recordedAt, state: "confirmed" } } : base;
}
