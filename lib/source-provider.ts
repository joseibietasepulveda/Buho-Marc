import { sourceResponseSchema, type Lookup } from "./source-contract";
import { fetchInapi, isRealSource } from "./inapi-provider";

// This is the only transport adapter to replace when a real INAPI provider is available.
export async function fetchSource(input: Lookup) {
  if (isRealSource()) return fetchInapi(input);
  const url = process.env.SOURCE_API_URL || `http://127.0.0.1:${process.env.PORT || 3000}/api/source/lookup`;
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(process.env.SOURCE_API_TOKEN ? { authorization: `Bearer ${process.env.SOURCE_API_TOKEN}` } : {}) }, body: JSON.stringify(input), cache: "no-store", signal: AbortSignal.timeout(20000), redirect: "error" });
  if (!response.ok) throw new Error(`La fuente respondió HTTP ${response.status}`);
  const result = sourceResponseSchema.parse(await response.json());
  if (result.missing.length) throw new Error(`Respuesta incompleta: ${result.missing.join(", ")}`);
  const apps = new Set(result.records.map(r => r.applicationNumber));
  const regs = new Set(result.records.map(r => r.registrationNumber).filter(Boolean));
  if (apps.size !== result.records.length || regs.size !== result.records.filter(r => r.registrationNumber).length) throw new Error("La fuente devolvió identificadores duplicados");
  if (input.applicationIds.some(id => !apps.has(id)) || input.registrationIds.some(id => !regs.has(id))) throw new Error("La fuente no devolvió todos los expedientes solicitados");
  if (result.records.some(r => !input.applicationIds.includes(r.applicationNumber) && !(r.registrationNumber && input.registrationIds.includes(r.registrationNumber)))) throw new Error("La fuente devolvió expedientes no solicitados");
  return result;
}
