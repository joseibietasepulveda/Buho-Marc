import {analyticsFetcher} from "./analytics-telemetry";
import { portfolioImage, dequienesImage } from "./trademark-image";
import { z } from "zod";
import { chileToday } from "./work-priorities";
import { sourceRecordSchema, type SourceRecord, type Lookup } from "./source-contract";
import { inapiProcedure, orderedInapiActs, stageForAct } from "./inapi-procedure";
export { inapiProcedure, orderedInapiActs, stageForAct } from "./inapi-procedure";
export type { InapiAct } from "./inapi-procedure";

export class InapiHttpError extends Error {
  upstreamStatus: number;
  constructor(message: string, upstreamStatus: number) { super(message); this.upstreamStatus = upstreamStatus; }
}

const party = z.object({ name: z.string(), rut: z.string().nullable().optional(), dv: z.string().nullable().optional(), country: z.string().nullable().optional() }).passthrough();
const event = z.object({ event_id: z.string().nullable().optional(), event_date: z.string().nullable(), due_date: z.string().nullable().optional(), status_code: z.string().nullable(), status_description: z.string().nullable(), observation: z.string().nullable().optional() }).passthrough();
const documentSchema = z.object({
  image_url: z.string().nullable().optional(), application_id: z.number().int().positive(), registration_number: z.number().int().nullable().optional(), registration_id: z.number().int().nullable().optional(), name: z.string().nullable(),
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
// Retrieval timestamps and sequence positions are transport metadata, not legal
// changes. Canonical order also prevents false alerts after a provider reorder.
export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["updated_at", "json_fetched_at", "seq", "application_id"].includes(key)).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, canonical(v)]));
  return value;
}

export function normalizeInapi(input: unknown): SourceRecord { return normalizeDocument(input, false); }
// Search evidence must retain incomplete historical facts without promoting them
// to validated portfolio state. Basic field/date validation remains mandatory.
const evidenceRecordSchema = z.object(sourceRecordSchema.shape);
function normalizeDocument(input: unknown, evidenceOnly: boolean): SourceRecord {
  const parsed = documentSchema.parse(input);
  const d = { ...parsed, registration_number: parsed.registration_id ?? parsed.registration_number ?? null };
  const projection = inapiProcedure(d.events);
  let status = projection.status;
  let statusDate = day(projection.sourceAct?.event_date);
  // The general description is often "En Trámite" even after a grant.
  const registeredAt = day(d.dates.registered_at);
  const laterProceeding = !["inapi-waiting", "registered"].includes(status) && (!statusDate || !registeredAt || statusDate >= registeredAt);
  if (d.registration_number && registeredAt && !laterProceeding && !["expired", "cancelled"].includes(status)) { status = "registered"; statusDate = registeredAt; }
  if (/(cancelad|vencid|caducad)/i.test(d.status.description ?? "")) status = /cancelad/i.test(d.status.description!) ? "cancelled" : "expired";
  if (/^desistida$/i.test(d.status.description?.trim() ?? "")) status = "withdrawn";
  // A denied application whose original rejection was upheld on appeal and
  // made final on the same day has a known outcome, not an unknown new deadline.
  if (status === "decision-review" && /^denegada$/i.test(d.status.description?.trim() ?? "")) {
    const acts = orderedInapiActs(d.events);
    const closing = projection.sourceAct;
    const upheld = /^resoluci[oó]n de cumplir fallo tpi que convalida/i.test(closing?.status_description?.trim() ?? "");
    const closingDate = day(closing?.event_date);
    const lastAppeal = acts.findLastIndex(act => day(act.event_date) && closingDate && day(act.event_date)! <= closingDate && stageForAct(act.status_description ?? "") === "appeal-pending");
    const priorDecision = acts.slice(0, lastAppeal).findLast(act => ["rejected-appeal", "finality-pending", "partial-appeal"].includes(stageForAct(act.status_description ?? "") ?? ""));
    const finality = acts.some(act => day(act.event_date) === closingDate && /^decisi[oó]n qued[oó] firme(?:\s|$)/i.test(act.status_description ?? ""));
    if (upheld && closingDate && closingDate <= chileToday() && finality && lastAppeal >= 0 && stageForAct(priorDecision?.status_description ?? "") === "rejected-appeal") status = "rejected-final";
  }
  if (status === "registered" && !d.registration_number) status = "decision-review";
  // The actual publication act can provide the date when its summary field is absent.
  const publicationDate = day(d.dates.published_at) ?? day(orderedInapiActs(d.events).findLast(e => stageForAct(e.status_description ?? "") === "opposition-window")?.event_date);
  if (publicationDate && ["inapi-waiting", "form-observation", "accepted-publication", "publication-pending"].includes(status) && (!statusDate || publicationDate >= statusDate)) { status = "opposition-window"; statusDate = publicationDate; }
  const country = (v?: string | null) => v ? new Intl.DisplayNames(["es"], { type: "region" }).of(v.toUpperCase()) ?? v : "No informado";
  const extra = { ...d } as Record<string, unknown>;
  for (const key of ["application_id", "registration_number", "name", "source", "dates"]) delete extra[key];
  const extraDates = Object.fromEntries(Object.entries(d.dates).filter(([k]) => !["filed_at", "published_at", "registered_at", "expires_at", "last_changed_at"].includes(k)));
  if (Object.keys(extraDates).length) extra.dates = extraDates;
  // Saved evidence is canonicalized; use that same ordering in projections so
  // importing and rereading identical parties cannot manufacture a change.
  const holders = canonical(d.holders) as typeof d.holders;
  const representatives = canonical(d.representatives) as typeof d.representatives;
  const parties = (p: typeof d.holders) => (p.map(h => h.name).join("; ") || "No informado").slice(0,180);
  const rut = holders[0]?.rut ? `${holders[0].rut}${holders[0].dv ? `-${holders[0].dv}` : ""}` : "";
  return (evidenceOnly ? evidenceRecordSchema : sourceRecordSchema).parse({
    retrieval: {
      origin: "dequienes",
      sourceReadAt: z.string().datetime().safeParse(d.source.read_at).success ? d.source.read_at : undefined,
      historyCheckedAt: z.string().datetime().safeParse(d.source.history_checked_at).success ? d.source.history_checked_at : undefined,
      historyComplete: typeof d.source.history_complete === "boolean" ? d.source.history_complete : undefined,
    },
    provider: "inapi", inapi: canonical(extra), applicationNumber: String(d.application_id), registrationNumber: d.registration_number ? String(d.registration_number) : null,
    name: (d.name?.trim() || "Marca figurativa sin denominación").slice(0,180), status,
    type: ["Denominativa", "Figurativa", "Mixta"].includes(d.trademark.sign_type ?? "") ? d.trademark.sign_type : "Otra",
    filingDate: day(d.dates.filed_at), publicationDate, expirationDate: day(d.dates.expires_at), registrationDate: registeredAt, statusDate,
    owner: parties(holders), ownerRut: rut, ownerCountry: country(holders[0]?.country), representativeName: parties(representatives), representativeCountry: country(representatives[0]?.country),
    classes: d.classes.map(c => c.nice_class), logo: (dequienesImage(d.image_url) || ["Mixta", "Figurativa"].includes(d.trademark.sign_type ?? "")) ? portfolioImage(String(d.application_id), d.image_url) : "",
    officialUrl: `https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx`,
  });
}

// Rebuild the presentation from saved source evidence after a rules update. This
// does not change the stored source or simulate a new external consultation.
export function reprojectInapiRecord(record: SourceRecord): SourceRecord {
  if (record.provider !== "inapi" || !record.inapi) return record;
  const projection = normalizeInapi({
    ...record.inapi,
    application_id: Number(record.applicationNumber), registration_number: record.registrationNumber ? Number(record.registrationNumber) : null, name: record.name,
    dates: { ...(record.inapi.dates as Record<string, unknown> ?? {}), filed_at: record.filingDate, published_at: record.publicationDate, registered_at: record.registrationDate, expires_at: record.expirationDate, last_changed_at: null },
    source: {},
  });
  return { ...projection, retrieval: record.retrieval, officialEvidence: record.officialEvidence };
}

export async function fetchInapi(input: Lookup, fetcher: typeof fetch = fetch) { return fetchRecords(input, fetcher, false); }
export async function fetchInapiEvidence(input: Lookup, fetcher: typeof fetch = fetch) { return fetchRecords(input, fetcher, true); }
async function fetchRecords(input: Lookup, fetcher: typeof fetch, evidenceOnly: boolean) {
  if (!process.env.INAPI_API_KEY) throw new Error("Falta configurar la conexión con INAPI en el servidor");
  const ids = [...new Set(input.applicationIds)];
  if (!ids.length && input.registrationIds.length) throw new Error("INAPI requiere el número de solicitud asociado al registro");
  const records: SourceRecord[] = [];
  for (let i=0; i<ids.length; i+=100) {
    const batch = ids.slice(i,i+100);
    if (batch.some(id => !/^\d+$/.test(id) || Number(id) > 2147483647 || Number(id) < 1)) throw new Error("Número de solicitud inválido");
    const r = await analyticsFetcher({provider:'dequienes',operation:'dossiers',properties:{batch_size:batch.length}},fetcher)("https://dequienes.cl/inapi/trademarks/batch", { method: "POST", headers: { "x-api-key": process.env.INAPI_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ application_ids: batch.map(Number) }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(45000) });
    if (!r.ok) {
      const reference = r.headers.get("cf-ray");
      const protection = r.headers.get("cf-mitigated") === "challenge" ? " El proveedor exige una validación de acceso desde este servidor." : "";
      throw new InapiHttpError(`La consulta a INAPI respondió HTTP ${r.status}.${protection} Se conservó la última información recibida.${reference ? ` Referencia del proveedor: ${reference}.` : ""}`, r.status);
    }
    const payload = z.object({ documents: z.array(documentSchema), application_ids_not_found: z.array(z.number()) }).parse(await r.json());
    if (payload.application_ids_not_found.length) throw new Error(`INAPI no devolvió las solicitudes: ${payload.application_ids_not_found.join(", ")}. Se conservó la cartera.`);
    const found = payload.documents.map(d => String(d.application_id));
    if (new Set(found).size !== batch.length || found.length !== batch.length || found.some(id => !batch.includes(id))) throw new Error("La respuesta de INAPI está incompleta o contiene solicitudes duplicadas/no solicitadas");
    records.push(...payload.documents.map(document => {
      const record = normalizeDocument(document, evidenceOnly);
      return { ...record, retrieval: { ...record.retrieval, lastSuccessfulQueryAt: new Date().toISOString() } };
    }));
  }
  return { version: 1 as const, records, missing: [], fetchedAt: new Date().toISOString() };
}
