/** Trusted source URLs only. Signed provider URLs are kept intact. */
export function dequienesImage(value?: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "marcas.dequienes.cl" && !url.port && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function safeTrademarkImage(value?: string | null): string {
  if (!value) return "";
  if (/^\/api\/inapi\/logo\/\d{1,9}(?:\?|$)/.test(value)) {
    const url = new URL(value, "https://buho.invalid");
    if (url.hash || [...url.searchParams.keys()].some(key => !["source", "retry"].includes(key))) return "";
    const source = url.searchParams.get("source");
    if (source && !dequienesImage(source)) return "";
    return value;
  }
  return dequienesImage(value);
}

export function trademarkImageSrc(value?: string | null, applicationId?: string): string {
  const safe = safeTrademarkImage(value);
  if (safe.startsWith("/")) return safe;
  if (applicationId && /^\d{1,9}$/.test(applicationId) && value && (safe || /^https:\/\//.test(value))) return portfolioImage(applicationId, safe);
  return safe ? `/api/similarity/image?url=${encodeURIComponent(safe)}` : "";
}

export function portfolioImage(applicationId: string, source?: unknown): string {
  const url = dequienesImage(source);
  return `/api/inapi/logo/${applicationId}${url ? `?source=${encodeURIComponent(url)}` : ""}`;
}

export function retryTrademarkImage(src: string, attempt: number): string {
  if (!attempt || !/^\/api\/(?:inapi\/logo\/\d{1,9}|similarity\/image)(?:\?|$)/.test(src)) return src;
  const url = new URL(src, "https://buho.invalid");
  url.searchParams.set("retry", String(attempt));
  return `${url.pathname}${url.search}`;
}
