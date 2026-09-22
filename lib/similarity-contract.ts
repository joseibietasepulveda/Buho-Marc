import { z } from "zod";

export const WATCH_LIMIT = 50;
export const WATCH_PAGE_SIZE = 5;
export const coverageSchema = z.array(z.object({ nice_class: z.number().int().min(1).max(45), text: z.string().max(6000) })).max(45);
export const proposalSchema = z.object({ name: z.string().trim().max(500).default(""), coverage: coverageSchema.default([]), grouped: z.boolean().default(false), limit: z.number().int().min(1).max(50).default(30) }).strict();
export const channelNames: Record<string, string> = { name: "Nombre", phonetic: "Fonética", distinctive_tokens: "Palabras distintivas", visual_base: "Imagen", visual_residual: "Elementos visuales", coverage: "Cobertura" };
export type SimilarityMark = {
  applicationId: string; registrationId: string | null; name: string; type: string; image: string;
  holders: { name: string; rut?: string | null; dv?: string | null }[];
  classes: { nice_class: number; coverage_text?: string | null }[];
  filedAt: string | null; publishedAt: string | null; registeredAt: string | null;
  status: string; statusCode: string | null;
};
export type SimilarityHit = SimilarityMark & { score: number; watchPublication?: boolean; dataWarnings?: string[]; officialDecision?: { status: string; firmAt: string; verifiedAt: string; sourceStatus: string; sources: { date: string; title: string; page: number; url: string }[] }; channels: Record<string, { rank?: number; score?: number; cosine?: number; contribution?: number }>; history: { date: string; title: string; detail?: string }[]; matchId?: string; reviewStatus?: string; detectedAt?: string };
export type SimilarityResult = { query: SimilarityMark; results: SimilarityHit[]; groups: { representative_id: number; member_ids: number[]; holder_names?: string[] }[]; warnings: string[]; candidateCount: number; elapsedSeconds: number; fetchedAt: string };
export function safeImage(value?: string | null) {
  if (!value) return "";
  if (/^\/api\/inapi\/logo\/\d+$/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "marcas.dequienes.cl" ? url.href : ""; } catch { return ""; }
}
export function similarityExplanation(hit: Pick<SimilarityHit, "channels">) {
  const names = [...new Set(Object.keys(hit.channels).map(key => channelNames[key] ?? "Otra señal de semejanza"))];
  return names.length ? `La búsqueda recuperó esta solicitud mediante: ${names.join(", ")}. Revisa las marcas y sus coberturas para valorar su relevancia.` : "Resultado recuperado por la búsqueda de semejanzas. La fuente no detalló sus señales.";
}
