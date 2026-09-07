import { STATUS_BY_ID, type RegistrationApplication, type RegistrationStatusId } from "./registration-data";
import { chileToday, parseWorkDate } from "./work-priorities";

export type Attention = "normal" | "soon" | "overdue" | "terminal" | "none" | "pending";
export type ProcedureDeadline = {
  key: RegistrationStatusId; label: string; attention: Attention; explanation: string; trigger: string;
  days?: number; sourceDate?: string; dueDate?: string; deadline?: Date; remaining?: number;
  origin: "source" | "calculated" | "simulated" | "unavailable";
};
// Versioned scope: LPI/RLPI day-based deadlines only. CPC time limits require
// their own rule. No calculation is performed outside the covered year.
export const PROCEDURE_CALENDAR = "CL-LPI-2026";
const holidays = new Set(["01-01", "04-03", "04-04", "05-01", "05-21", "06-21", "06-29", "07-16", "08-15", "09-18", "09-19", "10-12", "10-31", "11-01", "12-08", "12-25"]);
const utc = (day: string) => new Date(`${day}T12:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const covered = (day: string) => day.startsWith("2026-");
const businessDay = (day: string) => ![0, 6].includes(utc(day).getUTCDay()) && !holidays.has(day.slice(5));

export function addProcedureDays(value: string, days: number): string | undefined {
  const start = parseWorkDate(value);
  if (!start || !covered(start) || !Number.isInteger(days) || days < 0 || days > 120) return;
  const date = utc(start);
  let added = 0;
  while (added < days) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (!covered(iso(date))) return;
    if (businessDay(iso(date))) added++;
  }
  return iso(date);
}

function remainingDays(today: string, due: string) {
  if (!covered(today) || !covered(due)) return undefined;
  const direction = today <= due ? 1 : -1;
  const date = utc(today);
  let count = 0;
  while (iso(date) !== due) {
    date.setUTCDate(date.getUTCDate() + direction);
    if (businessDay(iso(date))) count += direction;
  }
  return count;
}

const triggers: Partial<Record<RegistrationStatusId, string>> = {
  "form-observation": "Notificación de la observación de forma",
  "accepted-publication": "Notificación de la aceptación a trámite",
  "opposition-window": "Publicación efectiva en el Diario Oficial",
  "opposition-answer": "Notificación del traslado de oposición",
  "evidence-period": "Notificación de la resolución que recibe la causa a prueba",
  "substantive-objection": "Notificación de la observación de fondo",
  "accepted-payment": "Ejecutoria de la resolución que autoriza la inscripción",
  "partial-payment": "Ejecutoria de la aceptación parcial",
  "rejected-appeal": "Notificación de la resolución apelable",
  "partial-appeal": "Notificación de la aceptación parcial apelable",
};

export function procedureContext(application: RegistrationApplication): string {
  const { statusId: s, procedure: p } = application;
  if (s === "accepted-publication") return p?.publicationRequestedAt
    ? "Publicación requerida. Se espera su publicación efectiva; la ventana de oposición aún no comienza."
    : "Corresponde requerir y pagar la publicación. Los 20 días hábiles son para esa gestión; la oposición comienza con la publicación efectiva.";
  if (s === "opposition-window") return "La ventana de oposición se cuenta desde la publicación. Su cierre no concede el registro ni prueba que no se haya presentado oposición.";
  if (s === "form-observation") return "La presentación de una respuesta no acredita que la observación haya quedado subsanada. Se espera el pronunciamiento de INAPI.";
  if (s === "opposition-answer") return "Contestación con patrocinio de abogado. La falta de contestación no produce allanamiento ni rechazo automático.";
  if (s === "opposition-answered") return "Contestación presentada. La causa sólo se recibe a prueba si existen hechos sustanciales, pertinentes y controvertidos.";
  if (s === "evidence-period") return "La prórroga de hasta 30 días adicionales requiere resolución que la conceda; no se aplica automáticamente.";
  if (s === "substantive-objection") return "La observación puede coexistir con una oposición. El vencimiento sin respuesta no sustituye la resolución de INAPI.";
  if (s === "substantive-exam") return "INAPI revisa las prohibiciones de registro y la cobertura solicitada. Esta etapa no tiene una cuenta regresiva de resolución.";
  if (s === "partial-appeal") return "Revisar la cobertura aceptada y rechazada. La aceptación parcial puede recurrirse; el pago final requiere ejecutoria.";
  if (s === "rejected-appeal") return "La resolución puede ser apelable. Vencer el plazo no permite presumir por sí solo que quedó firme.";
  if (s === "appeal-pending") return "Recurso ante el Tribunal de Propiedad Industrial. El fallo del tribunal no acredita por sí solo ejecutoria; deben verificarse los recursos posteriores.";
  if (s === "accepted-payment" || s === "partial-payment") return "Pagar y acreditar los derechos finales dentro de 60 días hábiles desde la ejecutoria. El pago no equivale todavía a registro concedido.";
  if (s === "registered") return "Vigencia de 10 años desde la inscripción, renovable. La fecha de presentación, aceptación o pago no inicia la vigencia del registro.";
  if (s === "expired") return "Vencimiento del registro. Revisar la ventana de renovación y su eventual recargo; no se presume cancelación automática.";
  return STATUS_BY_ID[s].helper ?? "Etapa informada por el expediente. El cambio de estado requiere una actuación que lo sustente.";
}

function primaryDeadline(a: RegistrationApplication, today: string): ProcedureDeadline {
  const status = STATUS_BY_ID[a.statusId];
  const base: ProcedureDeadline = { key: a.statusId, label: status.deadlineLabel ?? status.label, attention: "none", explanation: procedureContext(a), trigger: triggers[a.statusId] ?? "", origin: "unavailable" };
  if (status.terminal) return { ...base, attention: "terminal" };
  if (!status.deadlineDays) return base;
  const p = a.procedure;
  const completed = (value?: string, trigger?: string) => {
    const date = parseWorkDate(value), filed = parseWorkDate(a.filedAt), activated = parseWorkDate(trigger);
    return Boolean(date && date <= today && (!filed || date >= filed) && (!activated || date >= activated));
  };
  if (a.statusId === "accepted-publication" && completed(p?.publicationRequestedAt, p?.notifiedAt)) return { ...base, label: "Esperando publicación efectiva" };
  if (["form-observation", "substantive-objection", "opposition-answer"].includes(a.statusId) && completed(p?.responseFiledAt, p?.notifiedAt)) return { ...base, label: "Respuesta presentada · pendiente de pronunciamiento" };
  if (["accepted-payment", "partial-payment"].includes(a.statusId) && completed(p?.paymentAccreditedAt, p?.finalAt)) return { ...base, label: "Pago acreditado · esperando registro" };
  const payment = ["accepted-payment", "partial-payment"].includes(a.statusId);
  const sourceDate = parseWorkDate(a.statusId === "opposition-window" ? a.publishedAt : payment ? p?.finalAt : p?.notifiedAt) ?? (!a.provider && !payment && a.statusId !== "opposition-window" ? parseWorkDate(a.deadlineSource) : null);
  let days = status.deadlineDays;
  if (a.statusId === "evidence-period" && p?.evidenceExtensionDays !== undefined) {
    if (!Number.isInteger(p.evidenceExtensionDays) || p.evidenceExtensionDays < 0 || p.evidenceExtensionDays > 30) return { ...base, attention: "pending", explanation: "La prórroga probatoria informada no es válida. Revisar la resolución que la concede." };
    days += p.evidenceExtensionDays;
  }
  const pending = { ...base, days, attention: "pending" as const, sourceDate: sourceDate ?? undefined };
  // Publication is an indispensable fact even when an unrelated due_date exists.
  if (a.statusId === "opposition-window" && !sourceDate) return { ...pending, explanation: "Publicación efectiva no informada. No se activa una ventana de oposición con el requerimiento o pago de publicación." };
  if (sourceDate && (sourceDate > today || (parseWorkDate(a.filedAt) && sourceDate < a.filedAt.slice(0, 10)))) return { ...pending, explanation: "La fecha que activa esta gestión es futura o anterior a la solicitud. Revisar el antecedente antes de activar el plazo." };
  const official = parseWorkDate(a.officialDeadline);
  if (a.officialDeadline && (!official || (sourceDate && official < sourceDate) || (parseWorkDate(a.filedAt) && official < a.filedAt.slice(0, 10)))) return { ...pending, explanation: "El vencimiento informado es inválido o anterior a la solicitud o al hecho que lo activa." };
  const dueDate = official ?? (sourceDate ? addProcedureDays(sourceDate, days) : undefined);
  if (!dueDate) return { ...pending, explanation: sourceDate ? "El cómputo requiere un calendario fuera del período cubierto (2026). No se estima una fecha." : `${base.trigger} no informada. ${p?.sourceActDate ? "Consta la fecha de la actuación, que no se presume como notificación o ejecutoria. " : ""}El vencimiento de esta gestión no está determinado.` };
  const remaining = remainingDays(today, dueDate);
  // Date ordering is authoritative: a past weekend must not become “Vence hoy”.
  const attention: Attention = dueDate < today ? "overdue" : dueDate === today || (remaining !== undefined && remaining <= 5) ? "soon" : "normal";
  return { ...base, days, sourceDate: sourceDate ?? undefined, dueDate, deadline: new Date(`${dueDate}T12:00:00`), remaining, attention, origin: !a.provider ? "simulated" : official ? "source" : "calculated" };
}

export function registrationDeadlines(a: RegistrationApplication, today = chileToday()): ProcedureDeadline[] {
  const main = primaryDeadline(a, today);
  if (STATUS_BY_ID[a.statusId].terminal) return [main];
  const seen = new Set([a.statusId]);
  const parallel = (a.procedure?.concurrent ?? []).flatMap(item => {
    if (seen.has(item.statusId)) return [];
    seen.add(item.statusId);
    return [primaryDeadline({ ...a, statusId: item.statusId, officialDeadline: item.officialDeadline, deadlineSource: undefined, procedure: { notifiedAt: item.notifiedAt, sourceActDate: item.sourceActDate } }, today)];
  });
  return [main, ...parallel];
}

export function deadlineInfo(a: RegistrationApplication, today = chileToday()) {
  const order: Record<Attention, number> = { overdue: 0, soon: 1, pending: 2, normal: 3, none: 4, terminal: 5 };
  return [...registrationDeadlines(a, today)].sort((x, y) => order[x.attention] - order[y.attention] || (x.dueDate ?? "").localeCompare(y.dueDate ?? ""))[0];
}

export function deadlineLabel(d: ProcedureDeadline, today = chileToday()) {
  if (d.attention === "pending") return "Vencimiento no determinado";
  if (d.attention === "overdue") return "Plazo vencido · revisar actuación";
  if (d.dueDate === today) return "Vence hoy";
  if (d.attention === "normal" || d.attention === "soon") return d.remaining === undefined ? "Vencimiento informado" : `Quedan ${d.remaining} días hábiles`;
  return d.attention === "terminal" ? "Desenlace informado" : "En espera de la siguiente actuación";
}
