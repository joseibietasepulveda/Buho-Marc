// Per mounted consumer; no shared cache or browser storage containing another
// session's portfolio. 304 retains the caller's last successful data.
export function snapshotReader<T>() {
  let url = "", etag = "", requestVersion = 0;
  return async (nextUrl: string, signal?: AbortSignal): Promise<T | null> => {
    const version = ++requestVersion;
    if (url !== nextUrl) { url = nextUrl; etag = ""; }
    const response = await fetch(nextUrl, { cache: "no-store", signal, headers: etag ? { "If-None-Match": etag } : {} });
    if (response.status === 401) { etag = ""; window.location.assign("/ingresar"); throw new Error("Inicia sesión para continuar."); }
    if (response.status === 304) return null;
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "No se pudo actualizar la información.");
    if (version === requestVersion && url === nextUrl) etag = response.headers.get("ETag") || "";
    return payload;
  };
}

export function pollWhileVisible(refresh: () => Promise<void>, interval: number, event = "buho-source-reviewed", initial = true) {
  let stopped = false, running = false, again = false;
  const run = async () => {
    if (stopped || document.visibilityState === "hidden") return;
    if (running) { again = true; return; }
    running = true;
    try { await refresh(); } finally {
      running = false;
      if (again && !stopped) { again = false; void run(); }
    }
  };
  const listener = () => { void run(); };
  const timer = window.setInterval(listener, interval);
  document.addEventListener("visibilitychange", listener);
  window.addEventListener("focus", listener);
  window.addEventListener(event, listener);
  if (initial) listener();
  return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", listener); window.removeEventListener("focus", listener); window.removeEventListener(event, listener); };
}
