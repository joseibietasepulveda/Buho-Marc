export const runtime = "nodejs";
// Bound simultaneous source requests and share requests for the same mark.
const pending = new Map<string, Promise<{ body: ArrayBuffer; type: string } | null>>();
let active = 0;
const waiting: (() => void)[] = [];
async function loadLogo(id: string) {
  if (active >= 4) await new Promise<void>(resolve => waiting.push(resolve));
  else active++;
  try {
    const r = await fetch(`https://buscadormarcas.inapi.cl/etiqueta/?s=${id}`, { signal: AbortSignal.timeout(15000), redirect: "error", next: { revalidate: 86400 } });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !/^image\/(png|jpeg|gif|webp)(;|$)/i.test(type)) return null;
    return { body: await r.arrayBuffer(), type };
  } finally { const next = waiting.shift(); if (next) next(); else active--; }
}
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) return new Response(null, { status: 400 });
  try {
    let request = pending.get(id);
    if (!request) { request = loadLogo(id).finally(() => pending.delete(id)); pending.set(id, request); }
    const logo = await request;
    if (!logo) return new Response(null, { status: 503, headers: { "cache-control": "no-store", "retry-after": "2" } });
    return new Response(logo.body, { headers: { "content-type": logo.type, "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
  } catch { return new Response(null, { status: 503, headers: { "cache-control": "no-store", "retry-after": "2" } }); }
}
