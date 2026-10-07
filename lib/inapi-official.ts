import { z } from "zod";
import { normalizeInapi, reprojectInapiRecord, type InapiAct } from "./inapi-provider";
import { sourceRecordSchema, type SourceRecord } from "./source-contract";

export const INAPI_OFFICIAL_URL = "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx";
export const INAPI_REQUEST_INTERVAL_MS = 3000;
export const INAPI_REQUEST_TIMEOUT_MS = 20000;
export type OfficialRequestGate = <T>(request: () => Promise<T>) => Promise<T>;

// Used by tests only. Production uses the persisted PostgreSQL gate shared by
// every worker/replica. Spacing follows completion, including failed requests.
export function createSerialRequestGate(now = Date.now, sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))): OfficialRequestGate {
  let tail: Promise<unknown> = Promise.resolve();
  let lastFinished: number | undefined;
  return <T>(request: () => Promise<T>) => {
    const result = tail.then(async () => {
      if (lastFinished !== undefined) await sleep(Math.max(0, INAPI_REQUEST_INTERVAL_MS - (now() - lastFinished)));
      try { return await request(); } finally { lastFinished = now(); }
    });
    tail = result.catch(() => undefined);
    return result;
  };
}

export function officialDay(value: unknown): string | null {
  if (value === "" || value == null) return null;
  if (typeof value !== "string") throw new Error("INAPI devolvió una fecha inválida");
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const day = match ? `${match[3]}-${match[2]}-${match[1]}` : value;
  const parsed = new Date(`${day}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) throw new Error("INAPI devolvió una fecha inválida");
  return day;
}
const identifier = z.union([z.string(), z.number()]).transform(String);
const detailSchema = z.object({ NumeroSolicitud: identifier, NumeroRegistro: identifier.nullish(), Estado: identifier.nullish(), EstadoDescripcion: z.string(),
  FechaPresentacion: z.string().nullish(), FechaPublicacion: z.string().nullish(), FechaRegistro: z.string().nullish(), FechaVencimiento: z.string().nullish(),
  Instancias: z.array(z.object({ Numero: identifier, Fecha: z.string(), FechaVencimiento: z.string().nullish(), EstadoCodigo: identifier.nullish(), EstadoDescripcion: z.string(), Observacion: z.string().nullish() }).passthrough()).nullable(),
}).passthrough();
function hidden(html: string, id: string): string {
  const input = html.match(new RegExp(`<input\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i"))?.[0];
  const value = input?.match(/\bvalue=["']([^"']*)["']/i)?.[1];
  if (!value) throw new Error("Cambió el contexto del buscador INAPI; se requiere revisar la integración");
  return value.replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&amp;", "&");
}
function unwrap(text: string): Record<string, unknown> {
  const wrapper = JSON.parse(text);
  const payload = typeof wrapper.d === "string" ? JSON.parse(wrapper.d) : wrapper.d;
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.ErrorMessage) throw new Error("El buscador INAPI no entregó una respuesta utilizable; no se reintentará automáticamente");
  return payload;
}

/** A dossier lookup is up to three HTTP requests, each through the global gate.
 * No redirects, retries, CAPTCHA solving, browser cookies or API keys. */
export async function fetchOfficialInapi(base: SourceRecord, gate: OfficialRequestGate, fetcher: typeof fetch = fetch): Promise<SourceRecord> {
  const application = base.applicationNumber;
  if (!/^[1-9]\d{0,8}$/.test(application)) throw new Error("Número de solicitud inválido para el buscador INAPI");
  const cookies = new Map<string, string>();
  const request = (path = "", body?: Record<string, unknown>) => gate(async () => {
    const response = await fetcher(INAPI_OFFICIAL_URL + path, {
      method: body ? "POST" : "GET", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(INAPI_REQUEST_TIMEOUT_MS),
      headers: { Referer: INAPI_OFFICIAL_URL, ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}), ...(cookies.size ? { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0]; const separator = pair.indexOf("=");
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Buscador INAPI HTTP ${response.status}; se conservan los antecedentes guardados`); }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Respuesta vacía de INAPI");
    const chunks: Uint8Array[] = []; let bytes = 0;
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2_000_000) { await reader.cancel(); throw new Error("Respuesta de INAPI demasiado extensa"); }
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks).toString("utf8");
  });
  const html = await request();
  const IDW = hidden(html, "hdnIDW");
  const search = unwrap(await request("/FindMarcas", {
    LastNumSol: 0, Hash: hidden(html, "hdnHash"), IDW, responseCaptcha: "este texto no se validará",
    ...Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`param${i + 1}`, i === 0 ? application : i === 16 ? "1" : ""])),
  }));
  const rows = z.array(z.object({ cell: z.array(z.union([z.string(), z.number(), z.null()])).min(10) })).parse(search.Marcas);
  const matches = rows.filter(row => String(row.cell[0]) === application && String(row.cell[8]) === application);
  if (matches.length !== 1 || typeof search.Hash !== "string" || !search.Hash || matches[0].cell.slice(6, 10).some(value => value == null || value === "")) throw new Error("INAPI no identificó un expediente único para la solicitud");
  const cell = matches[0].cell;
  const result = unwrap(await request("/FindMarcaByNumeroSolicitud", { numeroSolicitud: String(cell[8]), numeroSerie: String(cell[9]), FileSeq: String(cell[6]), FileType: String(cell[7]), Hash: search.Hash, IDW }));
  const d = detailSchema.parse(result.Marca);
  if (d.NumeroSolicitud !== application) throw new Error("INAPI devolvió una solicitud diferente");
  const checkedAt = new Date().toISOString();
  const direct = normalizeInapi({
    ...base.inapi, application_id: Number(application), name: base.name,
    registration_number: Number(d.NumeroRegistro) || null, registration_id: Number(d.NumeroRegistro) || null,
    status: { code: d.Estado ?? null, description: d.EstadoDescripcion },
    dates: { filed_at: officialDay(d.FechaPresentacion), published_at: officialDay(d.FechaPublicacion), registered_at: officialDay(d.FechaRegistro), expires_at: officialDay(d.FechaVencimiento), last_changed_at: null },
    events: (d.Instancias ?? []).map(act => ({ event_id: act.Numero, event_date: officialDay(act.Fecha), due_date: officialDay(act.FechaVencimiento), status_code: act.EstadoCodigo ?? null, status_description: act.EstadoDescripcion, observation: act.Observacion ?? null })),
    // The endpoint's annotation shape is not yet verified. Keep provider evidence.
    annotations: base.inapi?.annotations ?? [], source: {},
  });
  return { ...direct, retrieval: { origin: "official-inapi", lastSuccessfulQueryAt: checkedAt, officialCheckedAt: checkedAt, sourceReadAt: checkedAt, historyCheckedAt: checkedAt } };
}

const eventKey = (event: InapiAct) => event.event_id ? `id:${event.event_id}` : `act:${event.event_date}:${event.status_description}`;
/** Complement saved evidence; never discard provider legal facts or later acts.
 * Equal-day conflicting states remain unresolved unless the act ID is matched. */
export function mergeOfficialEvidence(base: SourceRecord, official: SourceRecord, checkedAt: string): SourceRecord {
  if (base.applicationNumber !== official.applicationNumber) throw new Error("No se pueden combinar solicitudes diferentes");
  const previous = (base.inapi?.events ?? []) as InapiAct[];
  const current = (official.inapi?.events ?? []) as InapiAct[];
  const events = new Map(previous.map(event => [eventKey(event), event]));
  for (const event of current) {
    const old = events.get(eventKey(event));
    events.set(eventKey(event), old ? { ...event, ...old, event_date: old.event_date || event.event_date, due_date: old.due_date || event.due_date || null, observation: old.observation || event.observation || null } : event);
  }
  const latest = (acts: InapiAct[]) => acts.reduce((date, act) => act.event_date && act.event_date > date ? act.event_date : date, "");
  const officialIsCurrent = latest(current) > latest(previous) || latest(current) === latest(previous) && current.length > 0 && previous.filter(event => event.event_date === latest(previous)).every(event => current.some(other => eventKey(other) === eventKey(event)));
  const combined = reprojectInapiRecord({ ...base,
    registrationNumber: base.registrationNumber || official.registrationNumber,
    filingDate: base.filingDate || official.filingDate, publicationDate: base.publicationDate || official.publicationDate,
    registrationDate: base.registrationDate || official.registrationDate, expirationDate: base.expirationDate || official.expirationDate,
    inapi: { ...base.inapi, events: events.size ? [...events.values()] as never : [], ...(officialIsCurrent ? { status: official.inapi?.status ?? null } : {}) },
  });
  return sourceRecordSchema.parse({ ...combined,
    officialEvidence: { checkedAt, record: JSON.parse(JSON.stringify(official)), providerRecord: base.officialEvidence?.providerRecord ?? JSON.parse(JSON.stringify({ ...base, officialEvidence: undefined })) },
    retrieval: { ...base.retrieval, lastSuccessfulQueryAt: base.retrieval?.lastSuccessfulQueryAt && base.retrieval.lastSuccessfulQueryAt > checkedAt ? base.retrieval.lastSuccessfulQueryAt : checkedAt, officialCheckedAt: checkedAt, ...(officialIsCurrent ? {
      origin: base.retrieval?.sourceReadAt && base.retrieval.sourceReadAt > checkedAt ? base.retrieval.origin : "official-inapi",
      sourceReadAt: base.retrieval?.sourceReadAt && base.retrieval.sourceReadAt > checkedAt ? base.retrieval.sourceReadAt : checkedAt,
      historyCheckedAt: base.retrieval?.historyCheckedAt && base.retrieval.historyCheckedAt > checkedAt ? base.retrieval.historyCheckedAt : checkedAt,
      historyComplete: undefined,
    } : {}) },
  });
}
export function retainOfficialEvidence(incoming: SourceRecord, saved: SourceRecord): SourceRecord {
  const evidence = saved.officialEvidence;
  if (!evidence) return incoming;
  if (incoming.retrieval?.historyComplete === true && incoming.retrieval.sourceReadAt && incoming.retrieval.sourceReadAt >= evidence.checkedAt) return incoming;
  const parsed = sourceRecordSchema.safeParse(evidence.record);
  return parsed.success ? mergeOfficialEvidence(incoming, parsed.data, evidence.checkedAt) : incoming;
}
