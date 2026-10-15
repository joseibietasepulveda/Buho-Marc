import { z } from "zod";
import { analyticsFetcher } from "./analytics-telemetry";
import { normalizedRut } from "./portfolio-parties";
const responseSchema = z.object({ total_count: z.number().int().nonnegative(), results: z.array(z.object({ application_id: z.number().int().positive(), matched_parties: z.array(z.object({ role: z.string(), rut: z.union([z.string(), z.number()]).nullish(), dv: z.string().nullish() })) })).max(100) });
/** One metadata page only. Existing dossiers are never fetched again just to discover IDs. */
export async function discoverRepresentativePage(rut: string, offset: number, fetcher: typeof fetch = fetch) {
  if (!process.env.INAPI_API_KEY) throw new Error("La búsqueda diaria requiere conexión a INAPI");
  const response = await analyticsFetcher({ provider: "dequienes", operation: "by_holder" }, fetcher)("https://dequienes.cl/inapi/trademarks/by-holder", { method: "POST", headers: { "x-api-key": process.env.INAPI_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ rut, role: "representative", limit: 100, offset }), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(55000) });
  if (!response.ok) throw new Error(`La fuente no completó la búsqueda diaria (${response.status})`);
  const data = responseSchema.parse(await response.json());
  const ids = [...new Set(data.results.filter(r => r.matched_parties.some(p => p.role === "representative" && normalizedRut(p.rut, p.dv) === rut)).map(r => String(r.application_id)))];
  const next = offset + data.results.length;
  if (!data.results.length && offset < data.total_count) throw new Error("La fuente devolvió una página vacía antes de completar los resultados");
  return { ids, next, complete: next >= data.total_count, limited: next > 10000 && next < data.total_count };
}
