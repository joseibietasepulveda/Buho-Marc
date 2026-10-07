import sharp from "sharp";
import { dequienesImage } from "./trademark-image";

type Logo = { body: Uint8Array; provider: "dequienes" | "inapi" };
type Options = { applicationId?: string; sourceUrl?: string; scope: string; savedSource?: () => Promise<string> };
const pending = new Map<string, Promise<Logo | null>>();
let active = 0;
const waiting: (() => void)[] = [];

async function boundedBody(response: Response, limit: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty image response");
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new Error("Source body too large"); }
    chunks.push(value);
  }
  if (!size) throw new Error("Empty source body");
  return Buffer.concat(chunks);
}

async function image(url: string, fetcher: typeof fetch) {
  try {
    const response = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (!response.ok || !/^image\/(png|jpeg|gif|webp)(;|$)/i.test(response.headers.get("content-type") ?? "")) return null;
    const bytes = await boundedBody(response, 8 * 1024 * 1024);
    // Decode before accepting a source: an HTML/error document labelled as an
    // image must advance to the next source, not become a broken browser image.
    return new Uint8Array(await sharp(bytes, { limitInputPixels: 20000000 }).resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true }).png().toBuffer());
  } catch { return null; }
}

async function providerSource(id: string, fetcher: typeof fetch) {
  if (!process.env.INAPI_API_KEY) return "";
  try {
    const response = await fetcher("https://dequienes.cl/inapi/trademarks/batch", { method: "POST", headers: { "x-api-key": process.env.INAPI_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ application_ids: [Number(id)] }), redirect: "error", signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!response.ok) return "";
    const payload = JSON.parse((await boundedBody(response, 2 * 1024 * 1024)).toString("utf8")) as { documents?: { application_id: number; image_url?: string }[] };
    return dequienesImage(payload.documents?.find(doc => String(doc.application_id) === id)?.image_url);
  } catch { return ""; }
}

export function loadTrademarkImage(options: Options, fetcher: typeof fetch = fetch): Promise<Logo | null> {
  const id = options.applicationId && /^\d{1,9}$/.test(options.applicationId) ? options.applicationId : undefined;
  const source = dequienesImage(options.sourceUrl);
  // Saved evidence and in-flight requests are isolated by organization.
  const key = JSON.stringify([options.scope, id, source]);
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    if (active >= 4) await new Promise<void>(resolve => waiting.push(resolve)); else active++;
    try {
      let primary = source;
      if (!primary && options.savedSource) {
        try { primary = dequienesImage(await options.savedSource()); } catch { /* Source API remains available if saved evidence cannot be read. */ }
      }
      if (!primary && id) primary = await providerSource(id, fetcher);
      if (primary) {
        const body = await image(primary, fetcher);
        if (body) return { body, provider: "dequienes" as const };
      }
      if (id) {
        const body = await image(`https://buscadormarcas.inapi.cl/etiqueta/?s=${id}`, fetcher);
        if (body) return { body, provider: "inapi" as const };
      }
      return null;
    } finally { const next = waiting.shift(); if (next) next(); else active--; }
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export function trademarkImageResponse(logo: Logo | null): Response {
  if (!logo) return new Response(null, { status: 503, headers: { "cache-control": "no-store", "retry-after": "2" } });
  return new Response(new Uint8Array(logo.body), { headers: {
    "content-type": "image/png", "cache-control": logo.provider === "dequienes" ? "private, max-age=3600" : "private, no-store",
    "vary": "Cookie", "x-content-type-options": "nosniff",
  } });
}
