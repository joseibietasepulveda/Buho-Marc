import type { RegistrationApplication, RegistrationStatusId } from "./registration-data";
import { structuredActStage } from "./inapi-legal-facts";

// Pure procedural projection shared by browser and server; no transport or telemetry.
const day = (v: string | null | undefined) => {
  const value = v?.slice(0, 10);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};
const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const isFinalAct = (s: string) => /\b(firme|ejecutoria|ejecutoriada)\b/.test(s) && !/\b(?:no|sin|pendiente|solicita|solicitud|requiere|requerimiento)\b.{0,90}\b(?:firme|firmeza|ejecutoria|ejecutoriada)|(?:ejecutoria|firmeza|ejecutoriada).*(?:pendiente|por confirmar|solicitad)/.test(s);
const isNotificationRecorded = (s: string) => /^(?:(?:constancia|certificacion|certificado) de )?notificacion\b|\bnotificad[ao]s?\b/.test(s) && !/\b(?:no|sin|pendiente|solicita|solicitud|requiere|requerimiento)\b.{0,90}notifica|notifica.{0,90}(?:fallid|frustrad|pendiente|por realizar|no practicad|solicitad|anulad|revocad)/.test(s);
const isResponseRecorded = (s: string) => !/incumplimiento|no (?:se )?(?:present|contesta|cumpl)|sin (?:contestacion|cumplimiento)|pendiente/.test(s);
const observationResponse = (s: string) => isResponseRecorded(s) && /\bcumplimiento.*(forma|fondo)|contesta.*observacion.*(forma|fondo)/.test(s);
export type InapiAct = { event_id?: string | null; event_date?: string | null; due_date?: string | null; status_description?: string | null; observation?: string | null; [key: string]: unknown };

// Only recognized procedural acts change the stage. A payment or clerical entry
// must not send a case back to an older stage merely because it is the latest row.
export function stageForAct(description: string): RegistrationStatusId | undefined {
  const s = plain(description);
  if (/^fin (?:de )?plazo\b/.test(s) && !/oposici/.test(s)) return;
  if (/^fin (?:de )?plazo\b/.test(s) && /contestacion|respuesta|prueba/.test(s)) return;
  // The procedural object and whether this is a petition or an operative
  // resolution take precedence over a keyword appearing inside its title.
  if (/anotacion|renovacion|cambio de (?:nombre|titular)|transferencia/.test(s)) return;
  if (/nulidad/.test(s) && (/solicita|solicitud|peticion/.test(s) || !/nulidad.*(?:acog|declara)|registro.*cancelad/.test(s))) return;
  if (/incidente/.test(s)) return;
  if (/desistim/.test(s)) {
    if (/oposici|parcial|escrito|recurso|renovacion|anotacion/.test(s)) return;
    if (/resolucion|acepta|acoge|tiene por desistida|solicitud desistida/.test(s) && !/solicita|peticion|presentacion/.test(s)) return "withdrawn";
    return;
  }
  if (/alega.*abandono|devolucion.*examen.*abandono|abandono.*contencios/.test(s)) return /devolucion.*examen/.test(s) ? "substantive-exam" : undefined;
  if (/no presentad/.test(s) && /escrito|contestacion|respuesta|documento|pago/.test(s)) return;
  if (/rechazo|rechaza/.test(s) && /pago|requerimiento.*publicacion/.test(s)) return;
  if (/prueba|probatori/.test(s) && /solicita|solicitud|peticion/.test(s)) return;
  if (/deja sin efecto|revoca.*concesion|anula.*concesion/.test(s)) return "decision-review";
  if (/abandono|abandonada/.test(s) && /solicitud|solicita|requiere|rechaza|deniega/.test(s) && !/declara.*abandon|solicitud abandonada/.test(s)) return;
  if (/prorroga|extension/.test(s) && /prueba|probatori/.test(s)) return;
  if (/resolucion.*cancelacion|registro cancelado|nulidad.*(acog|declara)/.test(s)) return "cancelled";
  if (/declara.*caducidad|registro (vencido|caducado)/.test(s)) return "expired";
  if (/no presentada|tiene por no presentad/.test(s)) return "not-filed";
  if (/abandono.*(pago|derechos)|abandonada.*(pago|derechos)/.test(s)) return "abandoned-payment";
  if (/abandono|abandonada/.test(s)) return "abandoned-inapi";
  if (/concesion de marca|otorga registro/.test(s)) return "registered";
  const specificRegistrationResult = !/oposicion|apelacion|recurso/.test(s) || /aceptacion.*registro|rechazo.*(?:marca|solicitud)/.test(s);
  if (isFinalAct(s) && specificRegistrationResult) {
    if (/rechaz/.test(s)) return "rejected-final";
    if (/parcial/.test(s)) return "partial-payment";
    if (/aceptacion|concede|concesion/.test(s)) return "accepted-payment";
  }
  if (/acredita.*(pago|derechos finales)|pago.*acreditad|derechos finales.*pagados|pago\s*-\s*pago final|constatacion.*pago completo/.test(s) && !/falta|pendiente|no (?:se )?acredit|sin acredit|(?:requiere|requerimiento|solicita|solicitud|orden|debe|exigiendo|exige).*acredit/.test(s)) return "payment-verification";
  if (/autos para fallo|citacion.*sentencia/.test(s)) return "decision-pending";
  if (/admision.*apelacion|apelacion.*admitid|(?:concede|concesion).*recurso.*apelacion/.test(s) && !/deniega|rechaza|inadmisib/.test(s)) return "appeal-pending";
  // A judgment on an appeal is not a new appeal; its operative result is needed.
  if (/fallo.*(tpi|tribunal)|sentencia.*(tpi|tribunal)|devolucion.*tpi|(fallo|sentencia|resolucion).*apelacion|apelacion.*(acogida|rechazada|resuelta)/.test(s)) return "decision-review";
  if (/interposicion.*apelacion|presentacion.*apelacion|recurso de apelacion|apelacion en tramita|recurso.*tpi/.test(s)) return "appeal-pending";
  if (/aceptacion parcial/.test(s)) return "partial-appeal";
  if (/aceptacion a registro/.test(s)) return "finality-pending";
  if (/rechazo.*oposicion|oposicion.*rechazada/.test(s)) return "substantive-exam";
  if (/rechazo definitivo/.test(s) && isFinalAct(s)) return "rejected-final";
  if (/fallo de rechazo|resolucion.*rechazo|rechazo definitivo|oposicion.*acogida/.test(s)) return "rejected-appeal";
  if (isResponseRecorded(s) && /\bcumplimiento.*fondo|contesta.*observacion.*fondo/.test(s)) return "substantive-exam";
  if (/observaciones de fondo|observacion de fondo/.test(s)) return "substantive-objection";
  if (/examen de fondo/.test(s)) return "substantive-exam";
  if (/recibe.*prueba|recepcion.*(?:causa.*)?prueba|apertura.*prueba|abre.*(?:prueba|termino probatorio)|periodo probatorio|termino probatorio/.test(s)) return "evidence-period";
  if (isResponseRecorded(s) && /contestacion.*oposicion|contesta.*oposicion|oposicion.*contestacion.*traslado.*demanda/.test(s)) return "opposition-answered";
  if (/oposicion.*(?:presentacion|interposicion)|(?:presentacion|interposicion).*oposicion|oposicion presentada/.test(s)) return "opposition-filed";
  if (/traslado.*oposicion|oposicion.*demanda|demanda.*oposicion/.test(s)) return "opposition-answer";
  if (/fin.*plazo.*oposicion|cierre.*(ventana|plazo).*oposicion/.test(s)) return "substantive-exam";
  if (/(requerimiento|solicitud|pago).*publicacion/.test(s) && !/falta|pendiente|orden de|rechaz|deneg|no (?:se )?(?:ha )?(?:pag|requer)|sin pago/.test(s)) return "publication-pending";
  if (/publicacion de marca|publicada.*diario|publicacion.*gaceta/.test(s)) return "opposition-window";
  if (/aceptacion a tramite|acepta(?:se)? (?:a )?tramitacion|aceptada a tramite/.test(s)) return "accepted-publication";
  if (isResponseRecorded(s) && /\bcumplimiento.*forma|contesta.*observacion.*forma/.test(s)) return "inapi-waiting";
  if (/observaciones de forma|observacion de forma/.test(s)) return "form-observation";
}

export function orderedInapiActs(events: InapiAct[]): InapiAct[] {
  return [...events].sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "") || String(a.event_id ?? "").localeCompare(String(b.event_id ?? ""), undefined, { numeric: true }));
}

export function inapiProcedure(events: InapiAct[]) {
  let status: RegistrationStatusId = "inapi-waiting";
  let sourceAct: InapiAct | undefined;
  const procedure: NonNullable<RegistrationApplication["procedure"]> = {};
  const pending = new Map<RegistrationStatusId, NonNullable<NonNullable<RegistrationApplication["procedure"]>["concurrent"]>[number]>();
  const related = new Map<string, { object: "nullity" | "incident"; description: string; actId?: string; actDate?: string }>();
  const extensions = new Set<string>();
  for (const act of orderedInapiActs(events)) {
    const description = plain(act.status_description ?? "");
    if (/nulidad|incidente/.test(description)) {
      const object = /nulidad/.test(description) ? "nullity" as const : "incident" as const;
      related.set(object, { object, description: act.status_description ?? "", actId: act.event_id ?? undefined, actDate: day(act.event_date) ?? undefined });
    }
    if (/prorroga|extension/.test(description) && /prueba|probatori/.test(description)) {
      const days = Number(description.match(/\b(\d{1,2})\s*dias\b/)?.[1]);
      const identity = `${act.event_id ?? ""}:${act.event_date ?? ""}:${description}`;
      const granted = /concede|otorga|prorroga por/.test(description) && !/no concede|rechaza|deniega|solicita|solicitud|pendiente/.test(description);
      if (granted && Number.isInteger(days) && days > 0 && days <= 30 && !extensions.has(identity) && pending.has("evidence-period")) {
        const period = pending.get("evidence-period")!;
        const total = (period.evidenceExtensionDays ?? 0) + days;
        if (total <= 30) {
          period.evidenceExtensionDays = total;
          if (status === "evidence-period") procedure.evidenceExtensionDays = total;
          extensions.add(identity);
        }
      }
      continue;
    }
    const classification = structuredActStage(act.classification);
    let next = classification.recognized ? classification.stage : stageForAct(act.status_description ?? "");
    // A bare finality certificate inherits the decision it makes final.
    if (isFinalAct(description) && !next && !classification.recognized) {
      if (status === "partial-appeal") next = "partial-payment";
      else if (status === "finality-pending") next = "accepted-payment";
      else if (status === "rejected-appeal") next = "rejected-final";
    }
    if (next === "abandoned-inapi" && ["accepted-payment", "partial-payment", "payment-verification"].includes(status)) next = "abandoned-payment";
    if (!next) continue;
    const actDay = day(act.event_date) ?? undefined;
    // A fresh act creates a fresh obligation even if its stage is unchanged.
    // Never reuse a former observation's notification for a new observation.
    procedure.notifiedAt = undefined;
    status = next;
    sourceAct = act;
    if (status === "evidence-period") { procedure.evidenceExtensionDays = undefined; extensions.clear(); }
    if (["form-observation", "substantive-objection", "opposition-answer"].includes(status)) procedure.responseFiledAt = undefined;
    if (["appeal-pending", "decision-review", "finality-pending", "partial-appeal", "rejected-appeal"].includes(status)) { procedure.finalAt = undefined; procedure.paymentAccreditedAt = undefined; }
    if (status === "accepted-publication") procedure.publicationRequestedAt = undefined;
    if (isNotificationRecorded(description)) procedure.notifiedAt = actDay;
    if (isFinalAct(description)) procedure.finalAt = actDay;
    if (status === "publication-pending") procedure.publicationRequestedAt = actDay;
    if (status === "opposition-answered" || observationResponse(description)) procedure.responseFiledAt = actDay;
    if (status === "payment-verification") procedure.paymentAccreditedAt = actDay;
    if (status === "substantive-objection" || status === "opposition-answer" || status === "evidence-period") pending.set(status, { statusId: status, sourceActDate: actDay, sourceActId: act.event_id ?? undefined, sourceActDescription: act.status_description ?? undefined, notifiedAt: isNotificationRecorded(description) ? actDay : undefined, officialDeadline: day(act.due_date) ?? undefined });
    if (status === "substantive-objection" && /traslado.*oposici|oposici.*traslado/.test(description)) pending.set("opposition-answer", { statusId: "opposition-answer", sourceActDate: actDay, sourceActId: act.event_id ?? undefined, sourceActDescription: act.status_description ?? undefined, notifiedAt: isNotificationRecorded(description) ? actDay : undefined });
    if (observationResponse(description) && /fondo/.test(description)) pending.delete("substantive-objection");
    if (status === "opposition-answered" || status === "evidence-period") pending.delete("opposition-answer");
    if (status === "decision-pending") { pending.delete("opposition-answer"); pending.delete("evidence-period"); }
    if (["finality-pending", "partial-appeal", "accepted-payment", "partial-payment", "registered", "rejected-appeal", "rejected-final", "not-filed", "withdrawn", "abandoned-inapi", "abandoned-payment", "cancelled"].includes(status)) pending.clear();
  }
  procedure.sourceActDate = day(sourceAct?.event_date) ?? undefined;
  procedure.sourceActId = sourceAct?.event_id ?? undefined;
  procedure.sourceActCode = typeof sourceAct?.status_code === "string" ? sourceAct.status_code : undefined;
  procedure.sourceActDescription = sourceAct?.status_description ?? undefined;
  const concurrent = [...pending.values()].filter(item => item.statusId !== status);
  if (concurrent.length) procedure.concurrent = concurrent;
  if (related.size) procedure.relatedProceedings = [...related.values()];
  return { status, sourceAct, procedure };
}

