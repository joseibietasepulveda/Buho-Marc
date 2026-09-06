import { z } from "zod";
import { sourceRecordSchema, type SourceRecord, type Lookup } from "./source-contract";
import type { RegistrationStatusId } from "./registration-data";

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
const day = (v: string | null | undefined) => v ? v.slice(0, 10) : null;
const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Only recognized procedural acts change the stage. A payment or clerical entry
// must not send a case back to an older stage merely because it is the latest row.
export function stageForAct(description: string): RegistrationStatusId | undefined {
  const s = plain(description);
  if (/cancelacion|nulidad.*(acog|declara)/.test(s)) return "cancelled";
  if (/caducid|registro vencido/.test(s)) return "expired";
  if (/concesion de marca|otorga registro/.test(s)) return "registered";
  if (/apelacion|recurso.*tpi|devolucion de tpi/.test(s)) return "appeal-pending";
  if (/abandono|abandonada/.test(s)) return "abandoned-inapi";
  if (/fallo de rechazo|resolucion.*rechazo|rechazo definitivo/.test(s)) return "rejected-appeal";
  if (/aceptacion parcial/.test(s)) return "partial-payment";
  if (/aceptacion a registro/.test(s)) return "accepted-payment";
  if (/observaciones de fondo|observacion de fondo/.test(s)) return "substantive-objection";
  if (/cumplimiento.*fondo|examen de fondo/.test(s)) return "substantive-exam";
  if (/recibe.*prueba|periodo probatorio|termino probatorio/.test(s)) return "evidence-period";
  if (/contestacion.*oposicion|contesta.*oposicion/.test(s)) return "opposition-answered";
  if (/traslado.*oposicion|oposicion.*demanda|demanda.*oposicion/.test(s)) return "opposition-answer";
  if (/fin de plazo/.test(s)) return "substantive-exam";
  if (/publicacion de marca|publicada.*diario|publicacion.*gaceta/.test(s)) return "opposition-window";
  if (/aceptacion a tramite/.test(s)) return "accepted-publication";
  if (/observaciones de forma|observacion de forma/.test(s)) return "form-observation";
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
  const events = [...d.events].sort((a,b) => (a.event_date ?? "").localeCompare(b.event_date ?? "") || Number(a.seq ?? 0) - Number(b.seq ?? 0));
  let status: RegistrationStatusId = "inapi-waiting", statusDate: string | null = null;
  for (const e of events) {
    const stage = stageForAct(e.status_description ?? "");
    if (stage) { status = stage; statusDate = day(e.event_date); }
  }
  // The general description is often "En Trámite" even after a grant.
  if (d.registration_number && d.dates.registered_at && !["expired", "cancelled"].includes(status)) status = "registered";
  if (/(cancelad|vencid|caducad)/i.test(d.status.description ?? "")) status = /cancelad/i.test(d.status.description!) ? "cancelled" : "expired";
  if (status === "registered" && !d.registration_number) status = "accepted-payment";
  if (status === "opposition-window" && !d.dates.published_at) status = "inapi-waiting";
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
    filingDate: day(d.dates.filed_at), publicationDate: day(d.dates.published_at), expirationDate: day(d.dates.expires_at), registrationDate: day(d.dates.registered_at), statusDate,
    owner: parties(d.holders), ownerRut: rut, ownerCountry: country(d.holders[0]?.country), representativeName: parties(d.representatives), representativeCountry: country(d.representatives[0]?.country),
    classes: d.classes.map(c => c.nice_class), logo: ["Mixta", "Figurativa"].includes(d.trademark.sign_type ?? "") ? `/api/inapi/logo/${d.application_id}` : "",
    officialUrl: `https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx`,
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
