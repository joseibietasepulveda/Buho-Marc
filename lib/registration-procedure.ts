import { STATUS_BY_ID, type RegistrationApplication, type RegistrationStatusId } from "./registration-data";
import { chileToday, parseWorkDate } from "./work-priorities";
import { hasContestedProceeding } from "./registration-proceedings";
import { CALENDAR_VERSION, calendarCovered, nationalBusinessDay } from "./legal-calendar";
import { significantRegistrationEvent } from "./registration-milestones";

export type Attention = "normal" | "soon" | "overdue" | "terminal" | "none" | "pending";
export type ProcedureDeadline = {
  key: RegistrationStatusId | "inapi-decision-control" | "administrative-duration" | "certificate-control" | "renewal-open" | "renewal-close" | "registration-expiry";
  label: string; attention: Attention; explanation: string; trigger: string;
  days?: number; sourceDate?: string; dueDate?: string; nominalDate?: string; deadline?: Date; remaining?: number;
  origin: "source" | "calculated" | "simulated" | "unavailable";
  kind?: "legal" | "institutional" | "milestone";
  fatal?: boolean;
};
// Versioned scope: LPI/RLPI day-based deadlines only. CPC time limits require
// their own rule. No calculation is performed outside the reviewed years.
export const PROCEDURE_CALENDAR = CALENDAR_VERSION;
const utc = (day: string) => new Date(`${day}T12:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const covered = calendarCovered;
const businessDay = nationalBusinessDay;

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
  "accepted-payment": "Ejecutoria de la resolución que acepta el registro",
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
  if (s === "registered") return "Vigencia de 10 años desde el registro, renovable. La fecha de presentación, aceptación o pago no inicia la vigencia del registro.";
  if (s === "expired") return "Vencimiento del registro. Revisar la ventana de renovación y su eventual recargo; no se presume cancelación automática.";
  return STATUS_BY_ID[s].helper ?? "Etapa informada por el expediente. El cambio de estado requiere una actuación que lo sustente.";
}

function primaryDeadline(a: RegistrationApplication, today: string): ProcedureDeadline {
  const status = STATUS_BY_ID[a.statusId];
  const base: ProcedureDeadline = { key: a.statusId, label: status.deadlineLabel ?? status.label, attention: "none", explanation: procedureContext(a), trigger: triggers[a.statusId] ?? "", origin: "unavailable", kind: "legal", fatal: Boolean(status.deadlineDays) };
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
  if (!dueDate) return { ...pending, explanation: sourceDate ? "El cómputo requiere un calendario fuera del período cubierto (2026–2027). No se estima una fecha." : `${base.trigger} no informada. ${p?.sourceActDate ? "Consta la fecha de la actuación, que no se presume como notificación o ejecutoria. " : ""}El vencimiento de esta gestión no está determinado.` };
  const remaining = remainingDays(today, dueDate);
  if (a.statusId === "opposition-window" && dueDate < today) return { ...base, label: "Ventana de oposición finalizada", days, sourceDate: sourceDate ?? undefined, dueDate, deadline: new Date(`${dueDate}T12:00:00`), remaining, attention: "none", fatal: false, kind: "milestone", origin: a.provider ? official ? "source" : "calculated" : "simulated", explanation: "El período de 30 días hábiles terminó. Revisar si hubo oposiciones y las siguientes actuaciones de INAPI. No implica ausencia de oposición, aprobación ni registro concedido." };
  // Date ordering is authoritative: a past weekend must not become “Vence hoy”.
  const attention: Attention = dueDate < today ? "overdue" : dueDate === today || (remaining !== undefined && remaining <= 5) ? "soon" : "normal";
  return { ...base, days, sourceDate: sourceDate ?? undefined, dueDate, deadline: new Date(`${dueDate}T12:00:00`), remaining, attention, origin: !a.provider ? "simulated" : official ? "source" : "calculated" };
}

// Month periods run by calendar months, not by an assumed number of business
// days. Clamp to the last day when the destination month has no matching day.
export function addCalendarMonths(value: string, months: number): string | undefined {
  const day = parseWorkDate(value);
  if (!day) return;
  const date = utc(day);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, last));
  return iso(date);
}

export function nextProcedureBusinessDay(value: string | undefined): string | undefined {
  const valueDate = parseWorkDate(value);
  if (!valueDate || !covered(valueDate)) return;
  let result = valueDate;
  while (!businessDay(result)) {
    const date = utc(result); date.setUTCDate(date.getUTCDate() + 1); result = iso(date);
    if (!covered(result)) return;
  }
  return result;
}

function supplementaryDeadlines(a: RegistrationApplication, today: string): ProcedureDeadline[] {
  const result: ProcedureDeadline[] = [];
  const p = a.procedure;
  const judicial = hasContestedProceeding(a);
  const activeAdministrative = ["inapi-waiting", "form-observation", "accepted-publication", "publication-pending", "opposition-window", "substantive-exam", "substantive-objection"].includes(a.statusId) && !judicial;
  const origin = a.provider ? "calculated" as const : "simulated" as const;
  function control(key: ProcedureDeadline["key"], label: string, sourceDate: string | undefined, days: number | undefined, dueDate: string | undefined, trigger: string, explanation: string) {
    if (!sourceDate || !parseWorkDate(sourceDate) || sourceDate > today || (parseWorkDate(a.filedAt) && sourceDate < a.filedAt.slice(0, 10))) return;
    result.push({ key, label, sourceDate, days, dueDate, trigger, explanation, kind: "institutional", fatal: false, origin: dueDate ? origin : "unavailable", remaining: dueDate ? remainingDays(today, dueDate) : undefined, attention: !dueDate ? "pending" : dueDate < today ? "overdue" : dueDate === today ? "soon" : "normal" });
  }
  if (activeAdministrative) {
    if (p?.readyToResolveAt) control("inapi-decision-control", "Control de decisión de INAPI", p.readyToResolveAt, 20, addProcedureDays(p.readyToResolveAt, 20), "Certificación de estar en estado de resolver, solicitada por el interesado", "Control del artículo 24 de la Ley 19.880: 20 días hábiles desde la certificación. No se cuenta desde la publicación ni produce concesión automática. No se aplica a la tramitación contenciosa de oposición.");
    if (parseWorkDate(a.filedAt)) control("administrative-duration", "Control de duración del trámite administrativo", a.filedAt.slice(0, 10), undefined, nextProcedureBusinessDay(addCalendarMonths(a.filedAt, 6)), "Inicio del procedimiento", "Referencia general de seis meses (artículo 27 de la Ley 19.880), salvo caso fortuito o fuerza mayor; último día inhábil prorrogado al siguiente hábil. Permite revisar una demora; no es un plazo de respuesta del abogado, ni declara silencio positivo, abandono o aprobación. Cómputo automático limitado al calendario nacional validado de 2026–2027.");
  }
  if (a.statusId === "registered") {
    const certificateIssued = a.history.some(event => {
      const date = parseWorkDate(event.date);
      const title = `${event.status ?? ""} ${event.detail ?? ""}`;
      return date && p?.certificatePaymentAt && date >= p.certificatePaymentAt && date <= today && /certificado.*(?:emitid|expedid)|(?:emisi[oó]n|expedici[oó]n).*certificado/i.test(title) && !/no emitid|sin emitir|pendiente|solicitud de emisi[oó]n/i.test(title);
    });
    if (p?.certificatePaymentAt && !certificateIssued) control("certificate-control", "Control de emisión del certificado solicitado", p.certificatePaymentAt, 10, addProcedureDays(p.certificatePaymentAt, 10), "Validación del pago del certificado solicitado", "INAPI indica un máximo de 10 días hábiles desde la validación del pago. Es distinto del título gratuito de la marca; no se activa por la concesión ni por el pago de derechos finales.");
  }
  // Expiry does not remove the six-month post-expiry renewal window. Retain
  // the source status and the original expiry while deriving its closing day.
  if (a.statusId === "registered" || a.statusId === "expired") {
    const expiry = parseWorkDate(a.expirationDate);
    if (expiry) {
      const dates = [["renewal-open", "Apertura de ventana de renovación", addCalendarMonths(expiry, -6)], ["registration-expiry", "Vencimiento del registro", expiry], ["renewal-close", "Cierre de renovación posterior al vencimiento", addCalendarMonths(expiry, 6)]] as const;
      for (const [key, label, nominalDate] of dates) if (nominalDate) {
        const closing = key === "renewal-close";
        const dueDate = closing ? nextProcedureBusinessDay(nominalDate) : nominalDate;
        const remaining = dueDate ? remainingDays(today, dueDate) : undefined;
        // An unreviewed future calendar is disclosed, not invented. It does not
        // create a fatal alert for a registration whose expiry is years away.
        const attention: Attention = closing && dueDate
          ? dueDate < today ? "overdue" : dueDate === today || (remaining !== undefined && remaining <= 5) ? "soon" : "normal"
          : "none";
        result.push({ key, label, dueDate, nominalDate, sourceDate: expiry, trigger: "Vencimiento informado del registro", kind: closing ? "legal" : "milestone", fatal: closing && Boolean(dueDate), attention, remaining, origin: !dueDate ? "unavailable" : a.provider ? key === "registration-expiry" ? "source" : "calculated" : "simulated", explanation: `Renovación desde seis meses antes y hasta seis meses después del vencimiento, con recargo cuando corresponde. El cierre inhábil se prorroga al siguiente hábil; no se altera la fecha intrínseca de expiración. ${!dueDate ? `Fecha nominal: ${nominalDate}; falta validar el calendario de ese año antes de activar una alerta de vencimiento. ` : ""}No se presume renovación ni cancelación automática.` });
      }
    }
  }
  return result;
}

export function registrationProgress(a: RegistrationApplication, today = chileToday()): string {
  if (a.statusId === "opposition-window") {
    const window = primaryDeadline(a, today);
    if (window.dueDate && window.dueDate < today) return "Ventana de oposición finalizada · pendiente de actuaciones de INAPI";
  }
  if (["finality-pending", "partial-appeal"].includes(a.statusId) && parseWorkDate(a.procedure?.finalAt) && a.procedure!.finalAt! <= today) return "Ejecutoria acreditada · revisar pago de derechos finales";
  return significantRegistrationEvent(a).status;
}

export function registrationDeadlines(a: RegistrationApplication, today = chileToday()): ProcedureDeadline[] {
  // Confirmed finality enables payment counting but never rewrites the last
  // official source status. A pending appeal alone cannot establish finality.
  const confirmedPayment = ["finality-pending", "partial-appeal"].includes(a.statusId) && parseWorkDate(a.procedure?.finalAt) && a.procedure!.finalAt! <= today;
  const primary = confirmedPayment ? { ...a, statusId: a.statusId === "partial-appeal" ? "partial-payment" as const : "accepted-payment" as const, officialDeadline: undefined } : a;
  const main = primaryDeadline(primary, today);
  const extra = supplementaryDeadlines(a, today);
  if (STATUS_BY_ID[a.statusId].terminal) return [main, ...extra];
  const seen = new Set([a.statusId]);
  const parallel = (a.procedure?.concurrent ?? []).flatMap(item => {
    if (seen.has(item.statusId)) return [];
    seen.add(item.statusId);
    return [primaryDeadline({ ...a, statusId: item.statusId, officialDeadline: item.officialDeadline, deadlineSource: undefined, procedure: { notifiedAt: item.notifiedAt, sourceActDate: item.sourceActDate, evidenceExtensionDays: item.evidenceExtensionDays } }, today)];
  });
  return [main, ...parallel, ...extra];
}

export function deadlineInfo(a: RegistrationApplication, today = chileToday()) {
  const order: Record<Attention, number> = { overdue: 0, soon: 1, pending: 2, normal: 3, none: 4, terminal: 5 };
  return [...registrationDeadlines(a, today)].sort((x, y) => Number(x.kind === "institutional") - Number(y.kind === "institutional") || order[x.attention] - order[y.attention] || (x.dueDate ?? "").localeCompare(y.dueDate ?? ""))[0];
}

export function deadlineLabel(d: ProcedureDeadline, today = chileToday()) {
  if (d.kind === "institutional") return !d.dueDate ? "Control pendiente de cómputo" : d.dueDate < today ? "Referencia administrativa superada · revisar demora" : d.dueDate === today ? "Fecha de control: hoy" : "Fecha de control de INAPI";
  if (d.kind === "milestone") return d.dueDate && d.dueDate < today ? "Hito temporal cumplido · revisar expediente" : "Fecha de referencia";
  if (d.attention === "pending") return !d.sourceDate && d.trigger ? `Falta confirmar: ${d.trigger.toLowerCase()}` : "Cómputo pendiente de revisión";
  if (d.attention === "overdue") return "Plazo vencido · revisar actuación";
  if (d.dueDate === today) return "Vence hoy";
  if (d.attention === "normal" || d.attention === "soon") return d.remaining === undefined ? "Vencimiento informado" : `Quedan ${d.remaining} días hábiles`;
  return d.attention === "terminal" ? "Desenlace informado" : "En espera de la siguiente actuación";
}
