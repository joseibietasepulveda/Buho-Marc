export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) return new Response(null, { status: 400 });
  try {
    const r = await fetch(`https://buscadormarcas.inapi.cl/etiqueta/?s=${id}`, { signal: AbortSignal.timeout(15000), redirect: "error", next: { revalidate: 86400 } });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !/^image\/(png|jpeg|gif|webp)(;|$)/i.test(type)) return new Response(null, { status: 404 });
    return new Response(await r.arrayBuffer(), { headers: { "content-type": type, "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
  } catch { return new Response(null, { status: 404 }); }
}
