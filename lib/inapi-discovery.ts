import { z } from "zod";
import { fetchInapi, fetchInapiEvidence, isRealSource } from "./inapi-provider";
import { searchSimilar, SimilarityError } from "./similarity-provider";
import { statusLabel, type SourceRecord } from "./source-contract";
import { safeImage } from "./similarity-contract";
import { textMatches } from "./text-search";

export const discoverySchema = z.object({
  name: z.string().trim().max(500).default(""), applicationNumber: z.string().trim().regex(/^\d{1,9}$|^$/).default(""),
  partyName: z.string().trim().max(500).default(""), rut: z.string().trim().max(30).default(""),
  role: z.enum(["holder", "representative", "any"]).default("any"),
  matchMode: z.enum(["contains", "similar", "word", "starts", "ends", "exact"]).default("similar"),
  niceClass: z.number().int().min(1).max(45).optional(), status: z.string().max(80).default(""),
  limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(10000).default(0),
}).strict().refine(value => Boolean(value.name || value.applicationNumber || value.partyName || value.rut), "Escribe una marca, solicitud, nombre o RUT.");
export type DiscoveryInput = z.input<typeof discoverySchema>;
export type MatchedParty = { role: "holder" | "representative"; name: string; rut?: string | null; dv?: string | null; score?: number };
export type DiscoveryCandidate = {
  applicationNumber: string; registration: string; name: string; owner: string; rut: string;
  representativeName: string; classes: string; type: SourceRecord["type"]; registrationState: string;
  logo?: string; matchedParties: MatchedParty[]; explanation: string; tracked?: boolean;
};
export type DiscoveryResult = { candidates: DiscoveryCandidate[]; total: number; hasMore: boolean; nextOffset: number | null; scope: string; filtered: boolean };
const partySchema = z.object({ role: z.enum(["holder", "representative"]), name: z.string(), rut: z.string().nullable().optional(), dv: z.string().nullable().optional(), score: z.number().optional() }).passthrough();
const holderResponse = z.object({ total_count: z.number().int().nonnegative(), results: z.array(z.object({ application_id: z.number().int().positive(), matched_parties: z.array(partySchema) }).passthrough()).max(100) }).passthrough();
export function discoveryCandidate(record: SourceRecord, parties: MatchedParty[] = []): DiscoveryCandidate {
  return { applicationNumber: record.applicationNumber, registration: record.registrationNumber ?? "", name: record.name,
    owner: record.owner, rut: record.ownerRut, representativeName: record.representativeName, classes: record.classes.join(", "),
    type: record.type, registrationState: statusLabel(record.status), logo: safeImage(record.logo), matchedParties: parties,
    explanation: parties.length ? parties.map(p => `${p.role === "holder" ? "Titular" : "Representante"}: ${p.name}${p.rut ? ` · RUT ${p.rut}${p.dv ? `-${p.dv}` : ""}` : ""}`).join("; ") : `Solicitud ${record.applicationNumber} identificada en INAPI`,
  };
}
export async function discoverInapi(raw: DiscoveryInput, fetcher: typeof fetch = fetch): Promise<DiscoveryResult> {
  const input = discoverySchema.parse(raw);
  if (!isRealSource() || !process.env.INAPI_API_KEY) throw new SimilarityError("La búsqueda de INAPI no está configurada en este ambiente.", 503);
  let candidates: DiscoveryCandidate[], total = 0, nextOffset: number | null = null;
  let scope = "Consulta exacta por número de solicitud";
  if (input.applicationNumber && !input.rut && !input.partyName) {
    const records = (await fetchInapi({ applicationIds: [input.applicationNumber], registrationIds: [] }, fetcher)).records;
    candidates = records.map(record => discoveryCandidate(record)); total = candidates.length;
  } else if (input.rut || input.partyName) {
    let response: Response;
    try { response = await fetcher("https://dequienes.cl/inapi/trademarks/by-holder", { method: "POST", headers: { "x-api-key": process.env.INAPI_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ ...(input.rut ? { rut: input.rut } : {}), ...(input.partyName ? { name: input.partyName } : {}), role: input.role, limit: input.limit, offset: input.offset }), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(60000) }); }
    catch { throw new SimilarityError("La fuente no respondió. Puedes reintentar conservando tus criterios.", 504); }
    if (!response.ok) throw new SimilarityError(response.status === 429 ? "La fuente está ocupada. Intenta en unos minutos." : "No se pudo consultar al titular o representante en INAPI.", response.status === 422 ? 422 : 502);
    const parsed = holderResponse.safeParse(await response.json());
    if (!parsed.success) throw new SimilarityError("La fuente devolvió candidatos incompletos.");
    const data = parsed.data;
    const ids = [...new Set(data.results.map(hit => String(hit.application_id)))];
    const records = ids.length ? (await fetchInapiEvidence({ applicationIds: ids, registrationIds: [] }, fetcher)).records : [];
    const recordsById = new Map(records.map(record => [record.applicationNumber, record]));
    if (ids.some(id => !recordsById.has(id))) throw new SimilarityError("No se pudieron completar todos los expedientes. Intenta nuevamente.");
    candidates = ids.map(id => discoveryCandidate(recordsById.get(id)!, data.results.find(hit => String(hit.application_id) === id)!.matched_parties));
    total = data.total_count;
    const next = input.offset + data.results.length;
    nextOffset = data.results.length && next < total && next <= 10000 ? next : null;
    scope = input.rut ? "RUT exacto · expedientes del titular o representante elegido" : "Nombre aproximado · revisa la persona y su rol antes de incorporar";
    if (next > 10000 && next < total) scope += " · La fuente limita el recorrido a un desplazamiento de 10.000; hay resultados adicionales";
  } else {
    const result = await searchSimilar({ name: input.name, coverage: input.niceClass ? [{ nice_class: input.niceClass, text: "" }] : [], limit: 100, grouped: false, states: ["registered", "pending", "other"], minSimilarity: 0 }, undefined, fetcher);
    candidates = result.results.map(hit => ({ applicationNumber: hit.applicationId, registration: hit.registrationId ?? "", name: hit.name, owner: hit.holders.map(p => p.name).join("; "), rut: hit.holders.map(p => p.rut ? `${p.rut}${p.dv ? `-${p.dv}` : ""}` : "").filter(Boolean).join("; "), representativeName: "", classes: hit.classes.map(c => c.nice_class).join(", "), type: ["Mixta", "Figurativa", "Denominativa"].includes(hit.type) ? hit.type as SourceRecord["type"] : "Otra", registrationState: hit.status, logo: hit.image, matchedParties: [], explanation: `Semejanza por nombre: ${Math.round(hit.score * 100)}%` }));
    total = candidates.length; scope = "Hasta 100 candidatos por semejanza; los criterios textuales se aplican sobre este lote";
  }
  const filtered = Boolean(input.niceClass || input.status || input.applicationNumber && (input.partyName || input.rut) || input.name && (input.partyName || input.rut || input.applicationNumber || input.matchMode !== "similar"));
  candidates = candidates.filter(c => (!input.applicationNumber || c.applicationNumber === input.applicationNumber) && (!input.name || input.matchMode === "similar" && !input.rut && !input.partyName && !input.applicationNumber || textMatches(c.name, input.name, input.matchMode)) && (!input.niceClass || (c.classes.match(/\d+/g) ?? []).map(Number).includes(input.niceClass)) && (!input.status || textMatches(c.registrationState, input.status)));
  return { candidates, total, nextOffset, hasMore: nextOffset !== null, scope, filtered };
}
