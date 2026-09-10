import { z } from "zod";
import { sourceRecordSchema, type SourceRecord, type Lookup } from "./source-contract";
import type { RegistrationApplication, RegistrationStatusId } from "./registration-data";

const party = z.object({ name: z.string(), rut: z.string().nullable().optional(), dv: z.string().nullable().optional(), country: z.string().nullable().optional() }).passthrough();
const event = z.object({ event_id: z.string().nullable().optional(), event_date: z.string().nullable(), due_date: z.string().nullable().optional(), status_code: z.string().nullable(), status_description: z.string().nullable(), observation: z.string().nullable().optional() }).passthrough();
const documentSchema = z.object({
  application_id: z.number().int().positive(), registration_number: z.number().int().nullable(), name: z.string().nullable(),
  status: z.object({ code: z.string().nullable(), description: z.string().nullable() }).passthrough(),
  dates: z.object({ filed_at: z.string().nullable(), published_at: z.string().nullable(), registered_at: z.string().nullable(), expires_at: z.string().nullable(), last_changed_at: z.string().nullable() }).passthrough(),
  trademark: z.object({ sign_type: z.string().nullable() }).passthrough(),
  holders: z.array(party), representatives: z.array(party),
  classes: z.array(z.object({ nice_class: z.number().int().min(1).max(45) }).passthrough()),
  events: z.array(event), annotations: z.array(event), source: z.record(z.string(), z.unknown()),
}).passthrough();
export type InapiDocument = z.infer<typeof documentSchema>;
export const isRealSource = () => process.env.SOURCE_PROVIDER === "inapi";
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
  if (/acredita.*(pago|derechos finales)|pago.*acreditad|derechos finales.*pagados/.test(s) && !/falta|pendiente|no (?:se )?acredit|sin acredit|(?:requiere|requerimiento|solicita|solicitud|orden|debe).*acredit/.test(s)) return "payment-verification";
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
  if (/recibe.*prueba|periodo probatorio|termino probatorio/.test(s)) return "evidence-period";
  if (isResponseRecorded(s) && /contestacion.*oposicion|contesta.*oposicion/.test(s)) return "opposition-answered";
  if (/traslado.*oposicion|oposicion.*demanda|demanda.*oposicion/.test(s)) return "opposition-answer";
  if (/fin.*plazo.*oposicion|cierre.*(ventana|plazo).*oposicion/.test(s)) return "substantive-exam";
  if (/(requerimiento|solicitud|pago).*publicacion/.test(s) && !/falta|pendiente|orden de|rechaz|deneg|no (?:se )?(?:ha )?(?:pag|requer)|sin pago/.test(s)) return "publication-pending";
  if (/publicacion de marca|publicada.*diario|publicacion.*gaceta/.test(s)) return "opposition-window";
  if (/aceptacion a tramite/.test(s)) return "accepted-publication";
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
  const pending = new Map<RegistrationStatusId, { statusId: RegistrationStatusId; notifiedAt?: string; officialDeadline?: string; sourceActDate?: string; evidenceExtensionDays?: number }>();
  const extensions = new Set<string>();
  for (const act of orderedInapiActs(events)) {
    const description = plain(act.status_description ?? "");
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
    let next = stageForAct(act.status_description ?? "");
    // A bare finality certificate inherits the decision it makes final.
    if (isFinalAct(description) && !next) {
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
    if (status === "substantive-objection" || status === "opposition-answer" || status === "evidence-period") pending.set(status, { statusId: status, sourceActDate: actDay, notifiedAt: isNotificationRecorded(description) ? actDay : undefined, officialDeadline: day(act.due_date) ?? undefined });
    if (observationResponse(description) && /fondo/.test(description)) pending.delete("substantive-objection");
    if (status === "opposition-answered" || status === "evidence-period") pending.delete("opposition-answer");
    if (status === "decision-pending") { pending.delete("opposition-answer"); pending.delete("evidence-period"); }
    if (["finality-pending", "partial-appeal", "accepted-payment", "partial-payment", "registered", "rejected-appeal", "rejected-final", "not-filed", "abandoned-inapi", "abandoned-payment", "cancelled"].includes(status)) pending.clear();
  }
  procedure.sourceActDate = day(sourceAct?.event_date) ?? undefined;
  procedure.sourceActId = sourceAct?.event_id ?? undefined;
  procedure.sourceActCode = typeof sourceAct?.status_code === "string" ? sourceAct.status_code : undefined;
  procedure.sourceActDescription = sourceAct?.status_description ?? undefined;
  const concurrent = [...pending.values()].filter(item => item.statusId !== status);
  if (concurrent.length) procedure.concurrent = concurrent;
  return { status, sourceAct, procedure };
}

// Retrieval timestamps and sequence positions are transport metadata, not legal
// changes. Canonical order also prevents false alerts after a provider reorder.
export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["updated_at", "json_fetched_at", "seq", "application_id"].includes(key)).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, canonical(v)]));
  return value;
}

export function normalizeInapi(input: unknown): SourceRecord {
  const d = documentSchema.parse(input);
  const projection = inapiProcedure(d.events);
  let status = projection.status;
  let statusDate = day(projection.sourceAct?.event_date);
  // The general description is often "En Trámite" even after a grant.
  const registeredAt = day(d.dates.registered_at);
  const laterProceeding = !["inapi-waiting", "registered"].includes(status) && (!statusDate || !registeredAt || statusDate >= registeredAt);
  if (d.registration_number && registeredAt && !laterProceeding && !["expired", "cancelled"].includes(status)) { status = "registered"; statusDate = registeredAt; }
  if (/(cancelad|vencid|caducad)/i.test(d.status.description ?? "")) status = /cancelad/i.test(d.status.description!) ? "cancelled" : "expired";
  if (status === "registered" && !d.registration_number) status = "decision-review";
  // The actual publication act can provide the date when its summary field is absent.
  const publicationDate = day(d.dates.published_at) ?? day(orderedInapiActs(d.events).findLast(e => stageForAct(e.status_description ?? "") === "opposition-window")?.event_date);
  if (publicationDate && ["inapi-waiting", "form-observation", "accepted-publication", "publication-pending"].includes(status) && (!statusDate || publicationDate >= statusDate)) { status = "opposition-window"; statusDate = publicationDate; }
  const country = (v?: string | null) => v ? new Intl.DisplayNames(["es"], { type: "region" }).of(v.toUpperCase()) ?? v : "No informado";
  const extra = { ...d } as Record<string, unknown>;
  for (const key of ["application_id", "registration_number", "name", "source", "dates"]) delete extra[key];
  const extraDates = Object.fromEntries(Object.entries(d.dates).filter(([k]) => !["filed_at", "published_at", "registered_at", "expires_at", "last_changed_at"].includes(k)));
  if (Object.keys(extraDates).length) extra.dates = extraDates;
  const parties = (p: typeof d.holders) => (p.map(h => h.name).join("; ") || "No informado").slice(0,180);
  const rut = d.holders[0]?.rut ? `${d.holders[0].rut}${d.holders[0].dv ? `-${d.holders[0].dv}` : ""}` : "";
  return sourceRecordSchema.parse({
    provider: "inapi", inapi: canonical(extra), applicationNumber: String(d.application_id), registrationNumber: d.registration_number ? String(d.registration_number) : null,
    name: (d.name?.trim() || "Marca figurativa sin denominación").slice(0,180), status,
    type: ["Denominativa", "Figurativa", "Mixta"].includes(d.trademark.sign_type ?? "") ? d.trademark.sign_type : "Otra",
    filingDate: day(d.dates.filed_at), publicationDate, expirationDate: day(d.dates.expires_at), registrationDate: registeredAt, statusDate,
    owner: parties(d.holders), ownerRut: rut, ownerCountry: country(d.holders[0]?.country), representativeName: parties(d.representatives), representativeCountry: country(d.representatives[0]?.country),
    classes: d.classes.map(c => c.nice_class), logo: ["Mixta", "Figurativa"].includes(d.trademark.sign_type ?? "") ? `/api/inapi/logo/${d.application_id}` : "",
    officialUrl: `https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx`,
  });
}

// Rebuild the presentation from saved source evidence after a rules update. This
// does not change the stored source or simulate a new external consultation.
export function reprojectInapiRecord(record: SourceRecord): SourceRecord {
  if (record.provider !== "inapi" || !record.inapi) return record;
  return normalizeInapi({
    ...record.inapi,
    application_id: Number(record.applicationNumber), registration_number: record.registrationNumber ? Number(record.registrationNumber) : null, name: record.name,
    dates: { ...(record.inapi.dates as Record<string, unknown> ?? {}), filed_at: record.filingDate, published_at: record.publicationDate, registered_at: record.registrationDate, expires_at: record.expirationDate, last_changed_at: null },
    source: {},
  });
}

export async function fetchInapi(input: Lookup, fetcher: typeof fetch = fetch) {
  if (!process.env.INAPI_API_KEY) throw new Error("Falta configurar la conexión con INAPI en el servidor");
  const ids = [...new Set(input.applicationIds)];
  if (!ids.length && input.registrationIds.length) throw new Error("INAPI requiere el número de solicitud asociado al registro");
  const records: SourceRecord[] = [];
  for (let i=0; i<ids.length; i+=100) {
    const batch = ids.slice(i,i+100);
    if (batch.some(id => !/^\d+$/.test(id) || Number(id) > 2147483647 || Number(id) < 1)) throw new Error("Número de solicitud inválido");
    const r = await fetcher("https://dequienes.cl/inapi/trademarks/batch", { method: "POST", headers: { "x-api-key": process.env.INAPI_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ application_ids: batch.map(Number) }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(45000) });
    if (!r.ok) {
      const reference = r.headers.get("cf-ray");
      const protection = r.headers.get("cf-mitigated") === "challenge" ? " El proveedor exige una validación de acceso desde este servidor." : "";
      throw new Error(`La consulta a INAPI respondió HTTP ${r.status}.${protection} Se conservó la última información recibida.${reference ? ` Referencia del proveedor: ${reference}.` : ""}`);
    }
    const payload = z.object({ documents: z.array(documentSchema), application_ids_not_found: z.array(z.number()) }).parse(await r.json());
    if (payload.application_ids_not_found.length) throw new Error(`INAPI no devolvió las solicitudes: ${payload.application_ids_not_found.join(", ")}. Se conservó la cartera.`);
    const found = payload.documents.map(d => String(d.application_id));
    if (new Set(found).size !== batch.length || found.length !== batch.length || found.some(id => !batch.includes(id))) throw new Error("La respuesta de INAPI está incompleta o contiene solicitudes duplicadas/no solicitadas");
    records.push(...payload.documents.map(normalizeInapi));
  }
  return { version: 1 as const, records, missing: [], fetchedAt: new Date().toISOString() };
}
