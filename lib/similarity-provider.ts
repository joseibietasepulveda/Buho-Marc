import { z } from "zod";
import { applyVerifiedDecision } from './verified-decisions';
import { feasibilityStatus } from './feasibility-policy';
import { fetchInapiEvidence, InapiHttpError } from "./inapi-provider";
import { sourceRecordSchema, type SourceRecord } from "./source-contract";
import { safeImage, type SimilarityMark, type SimilarityHit, type SimilarityResult } from "./similarity-contract";

const markSchema = z.object({ application_id: z.number().int().positive().nullable().optional(), registration_id: z.number().int().nullable().optional(), name: z.string().nullable(), sign_type: z.string().nullable().optional(), image_url: z.string().nullable().optional(), dates: z.object({ filed_at: z.string().nullable(), published_at: z.string().nullable(), registered_at: z.string().nullable() }).passthrough(), holders: z.array(z.object({ name: z.string(), rut: z.string().nullable().optional(), dv: z.string().nullable().optional() })), classes: z.array(z.object({ nice_class: z.number().int().min(1).max(45), coverage_text: z.string().nullable().optional() })) }).passthrough();
const responseSchema = z.object({ query: markSchema, results: z.array(markSchema.extend({ application_id: z.number().int().positive(), score: z.number().finite(), channels: z.record(z.string(), z.object({ rank: z.number().optional(), score: z.number().optional(), cosine: z.number().optional(), contribution: z.number().optional() })) })).max(100), groups: z.array(z.object({ representative_id: z.number(), member_ids: z.array(z.number()), holder_names: z.array(z.string()).optional() })).default([]), warnings: z.array(z.string()).default([]), candidate_count: z.number().nonnegative(), elapsed_seconds: z.number().nonnegative() }).passthrough();
export class SimilarityError extends Error { status: number; retryable: boolean; upstreamStatus?: number; constructor(message: string, status = 502, retryable = false, upstreamStatus?: number) { super(message); this.status = status; this.retryable = retryable; this.upstreamStatus = upstreamStatus; } }
export function similarityConfigured() { return process.env.SOURCE_PROVIDER === "inapi" && Boolean(process.env.INAPI_API_KEY); }
function date(value?: string | null) { const day = value?.slice(0, 10); return day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) ? day : null; }
function mark(raw: z.infer<typeof markSchema>, record?: SourceRecord): SimilarityMark {
  const status = record?.inapi?.status as { code?: string; description?: string } | undefined;
  return { applicationId: String(raw.application_id ?? ""), registrationId: raw.registration_id ? String(raw.registration_id) : record?.registrationNumber ?? null, name: raw.name || "Marca figurativa sin denominación", type: raw.sign_type ?? record?.type ?? "Otra", image: safeImage(raw.image_url) || safeImage(record?.logo), holders: raw.holders, classes: raw.classes, filedAt: date(record?.filingDate ?? raw.dates.filed_at), publishedAt: date(record?.publicationDate ?? raw.dates.published_at), registeredAt: date(record?.registrationDate ?? raw.dates.registered_at), status: status?.description || "Estado no disponible", statusCode: status?.code ?? null };
}
export function withRecord(hit: SimilarityHit, record: SourceRecord): SimilarityHit {
  const status = record.inapi?.status as { code?: string; description?: string } | undefined;
  const events = (record.inapi?.events ?? []) as { event_date?: string; status_description?: string; observation?: string }[];
  const validation = sourceRecordSchema.safeParse(record);
  const dataWarnings = validation.success ? [] : [...new Set(validation.error.issues.map(issue => issue.message))];
  return applyVerifiedDecision({ ...hit, officialDecision: undefined, sourceStatus: status?.description || "Estado no disponible", dataWarnings, status: status?.description || "Estado no disponible", statusCode: status?.code ?? null, publishedAt: record.publicationDate, filedAt: record.filingDate, registeredAt: record.registrationDate, registrationId: record.registrationNumber, history: events.map(e => ({ date: date(e.event_date) ?? "", title: e.status_description || "Actuación", detail: e.observation ?? undefined })) });
}
export async function searchSimilar(input: Record<string, unknown>, image?: File, fetcher: typeof fetch = fetch): Promise<SimilarityResult> {
  if (!similarityConfigured()) throw new SimilarityError("La búsqueda real aún no está configurada en este ambiente.", 503);
  const { states, minSimilarity, ...remoteInput } = input;
  let body: BodyInit = JSON.stringify(remoteInput);
  const headers: Record<string, string> = { "x-api-key": process.env.INAPI_API_KEY! };
  if (image) {
    const form = new FormData();
    form.set("options", JSON.stringify(remoteInput));
    form.set("image", image); body = form;
  } else headers["content-type"] = "application/json";
  let response: Response;
  try { response = await fetcher("https://dequienes.cl/inapi/trademarks/search", { method: "POST", headers, body, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(90000) }); }
  catch { throw new SimilarityError("La búsqueda no respondió a tiempo. Puedes volver a intentarlo; se conservan los resultados anteriores.", 504, true); }
  if (!response.ok) {
    const messages: Record<number, string> = { 401: "Revisa la configuración de acceso a la fuente.", 403: "La fuente no autorizó esta consulta.", 404: "No se encontró la solicitud consultada.", 413: "La imagen supera el límite permitido.", 415: "Usa una imagen JPEG, PNG o WebP.", 422: "La fuente no pudo procesar estos datos de búsqueda.", 429: "La fuente está recibiendo demasiadas consultas. Reintentaremos más tarde.", 503: "El buscador está ocupado. Vuelve a intentarlo en unos minutos." };
    throw new SimilarityError(messages[response.status] ?? "La fuente no pudo completar la búsqueda.", [404, 413, 415, 422, 429, 503].includes(response.status) ? response.status : 502, response.status === 429 || response.status >= 500, response.status);
  }
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new SimilarityError("La fuente devolvió una respuesta de búsqueda incompleta.");
  const data = parsed.data;
  const allIds = data.results.map(hit => String(hit.application_id));
  if (new Set(allIds).size !== allIds.length || allIds.length > Number(input.limit ?? 30)) throw new SimilarityError("La fuente devolvió resultados duplicados o fuera del límite solicitado.");
  const candidates = data.results.filter(hit => hit.application_id !== input.application_id && hit.score >= Number(minSimilarity ?? 0));
  const ids = candidates.map(hit => String(hit.application_id));
  let records: SourceRecord[] = [];
  try { if (ids.length) records = (await fetchInapiEvidence({ applicationIds: ids, registrationIds: [] }, fetcher)).records; }
  catch (error) { throw new SimilarityError("Se recibieron similitudes, pero no se pudieron completar sus estados e historiales. Se conservó la revisión anterior.", 502, true, error instanceof InapiHttpError ? error.upstreamStatus : undefined); }
  const byId = new Map(records.map(record => [record.applicationNumber, record]));
  const results = candidates.map(hit => withRecord({ ...mark(hit, byId.get(String(hit.application_id))), score: hit.score, channels: hit.channels, history: [] }, byId.get(String(hit.application_id))!)).filter(hit => !Array.isArray(states) || states.includes(feasibilityStatus(hit)));
  const resultIds = new Set(results.map(hit=>Number(hit.applicationId)));
  const groups = data.groups.flatMap(group => { const member_ids = group.member_ids.filter(id=>resultIds.has(id)); return member_ids.length ? [{...group,member_ids,representative_id:member_ids.includes(group.representative_id)?group.representative_id:member_ids[0]}] : []; });
  return { query: mark(data.query), results, groups, searchScope: { retrieved:data.results.length, limit:Number(input.limit ?? 30), states:Array.isArray(states) ? states as string[] : undefined, minSimilarity:Number(minSimilarity ?? 0) }, warnings: [...data.warnings, ...(results.some(hit => hit.dataWarnings?.length) ? ["Hay antecedentes incompletos o inconsistentes en algunas solicitudes. Revisa las advertencias de cada resultado."] : [])], candidateCount: data.candidate_count, elapsedSeconds: data.elapsed_seconds, fetchedAt: new Date().toISOString() };
}
