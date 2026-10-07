import { createHash } from "node:crypto";
import type { SourceRecord } from "./source-contract";
import { inapiProcedure, type InapiAct } from "./inapi-provider";
import { applySourceLegalFacts } from "./inapi-legal-facts";
import { applyRegistrationEvidence } from "./registration-evidence";
import { registrationDeadlines } from "./registration-procedure";
import type { RegistrationApplication } from "./registration-data";

export function recoveryNeeds(record: SourceRecord, today?: string, application?: RegistrationApplication) {
  if (record.provider !== "inapi") return [];
  const events = (record.inapi?.events ?? []) as InapiAct[];
  const projected = inapiProcedure(events);
  const app = application ?? applyRegistrationEvidence(applySourceLegalFacts({
    id: "source", applicationNumber: record.applicationNumber, name: record.name, type: record.type, provider: "inapi",
    filedAt: record.filingDate ?? "", publishedAt: record.publicationDate ?? undefined, statusId: record.status,
    recentEvent: "", niceClasses: "", holderRut: record.ownerRut, holder: record.owner, client: "", history: [],
    procedure: projected.procedure, officialDeadline: projected.status === record.status ? projected.sourceAct?.due_date || undefined : undefined,
  }, events, today), today);
  const needs = registrationDeadlines(app, today).filter(item => item.kind === "legal" && item.attention === "pending" && !item.sourceDate && !item.dueDate && !["nullity-review", "incident-review"].includes(item.key)).map(item => {
    const obligation = item.key === app.statusId ? app.procedure : app.procedure?.concurrent?.find(other => other.statusId === item.key);
    return `${item.key}:${obligation?.sourceActId ?? ""}:${obligation?.sourceActDate ?? ""}:notification`;
  });
  // A later, recognized stage can establish that publication occurred without
  // carrying its date. Recover that fact once per dossier, not once per stage.
  if (!record.publicationDate && ["opposition-window", "opposition-filed", "opposition-answer", "opposition-answered", "evidence-period", "substantive-exam", "substantive-objection", "decision-pending", "finality-pending", "partial-appeal", "accepted-payment", "partial-payment", "payment-verification", "registered"].includes(record.status)) needs.push(`publication:${record.applicationNumber}`);
  if (["finality-pending", "partial-appeal"].includes(app.statusId) && !app.procedure?.finalAt) needs.push(`${app.statusId}:${app.procedure?.sourceActId ?? ""}:${app.procedure?.sourceActDate ?? ""}:finality`);
  return [...new Set(needs)].sort();
}
export function recoveryKey(needs: string[]) { return createHash("sha256").update(JSON.stringify([...needs].sort())).digest("hex"); }
export function directRecoveryEnabled() { return process.env.SOURCE_PROVIDER === "inapi" && process.env.INAPI_DIRECT_RECOVERY_ENABLED !== "false"; }
export function recoveryDailyLimit() {
  const value = Number(process.env.INAPI_DIRECT_RECOVERY_DAILY_LIMIT ?? 200);
  return Number.isInteger(value) && value >= 0 ? Math.min(value, 200) : 200;
}
