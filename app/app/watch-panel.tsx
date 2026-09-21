"use client";
import { useCallback, useEffect, useState } from "react";
import type { SimilarityHit } from "@/lib/similarity-contract";
import { WATCH_PAGE_SIZE } from "@/lib/similarity-contract";
import { SimilarityCard, SimilarityImage } from "./similarity-results";
import { sourceReviewDate } from "@/lib/source-schedule";
import "./similarity.css";

type Target = { id: string; name: string; applicationId: string; image: string; ownStatus: string; paused: boolean; status: string; error?: string; reviewedAt: string | null; nextReviewAt: string | null; warnings: string[]; results: SimilarityHit[] };
type Snapshot = { configured: boolean; automaticEnabled: boolean; targets: Target[] };
export function WatchPanel({ onOpen, onRefresh }: { onOpen: (id: string) => void; onRefresh: () => Promise<void> }) {
  const [data, setData] = useState<Snapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const load = useCallback(async () => { const response = await fetch("/api/watch", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "No se pudo cargar la vigilancia."); setData(payload); }, []);
  useEffect(() => { let mounted = true; const refresh = () => { if (mounted) void load().catch(e => { if (mounted) setError(e.message); }); }; refresh(); const timer = setInterval(refresh, 10000); window.addEventListener("buho-source-reviewed", refresh); return () => { mounted = false; clearInterval(timer); window.removeEventListener("buho-source-reviewed", refresh); }; }, [load]);
  async function action(input: Record<string, unknown>) {
    setBusy(String(input.id ?? "all")); setError("");
    try { const response = await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "No se pudo guardar el cambio."); setData(payload); if (input.action === "follow") await onRefresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la acción."); }
    finally { setBusy(""); }
  }
  return <section className="similarity-panel"><header><div><h2>Búsqueda de coincidencias</h2><p>Marcas registradas y solicitudes propias. Resultados de todos los estados, ordenados por semejanza.</p></div><button type="button" disabled={!!busy || !data?.configured} onClick={() => void action({ action: "review" })}>Preparar revisiones pendientes</button></header>
    {error && <p role="alert" className="similarity-error">{error} <button type="button" onClick={() => void load().then(() => setError("")).catch(e => setError(e.message))}>Reintentar</button></p>}
    {!data && !error && <p role="status">Cargando vigilancia…</p>}
    {data && !data.configured && <p>La conexión de búsqueda real no está configurada en este ambiente.</p>}
    {data?.configured && !data.automaticEnabled && <p>Las revisiones automáticas están desactivadas en este ambiente.</p>}
    {data?.configured && !data.targets.length && <p>Las marcas propias importadas aparecerán aquí al preparar la primera revisión.</p>}
    {data?.targets.map(target => <WatchTarget key={target.id} target={target} busy={busy} action={action} onOpen={onOpen} />)}
  </section>;
}
function WatchTarget({ target, busy, action, onOpen }: { target: Target; busy: string; action: (input: Record<string, unknown>) => Promise<void>; onOpen: (id: string) => void }) {
  const [visible, setVisible] = useState(WATCH_PAGE_SIZE);
  const running = ["queued", "running", "retry"].includes(target.status);
  const state = target.paused ? "Vigilancia pausada" : target.status === "running" ? "Revisando similitudes…" : target.status === "queued" ? "Revisión en espera" : target.status === "retry" ? "Revisión incompleta · reintento pendiente" : target.status === "failed" ? "No se completó la revisión" : target.reviewedAt ? "Revisión completada" : "Primera revisión pendiente";
  return <article className="watch-target"><header><SimilarityImage src={target.image} name={target.name} /><div><h3>{target.name}</h3><p>Solicitud {target.applicationId} · {target.ownStatus}</p><strong role={running ? "status" : undefined}>{state}</strong>{target.reviewedAt && <small>Última revisión completa: {sourceReviewDate(target.reviewedAt, new Date())}</small>}{target.nextReviewAt && <small>Próxima revisión: {sourceReviewDate(target.nextReviewAt, new Date())}</small>}</div><div className="watch-buttons"><button disabled={!!busy || running || target.paused} onClick={() => void action({ action: "review", id: target.id })}>Revisar ahora</button><button disabled={!!busy} onClick={() => void action({ action: "pause", id: target.id, paused: !target.paused })}>{target.paused ? "Reanudar" : "Pausar"}</button></div></header>
    {target.error && <p role="alert">{target.error} Los resultados anteriores se conservan.</p>}
    {target.reviewedAt && <details className="watch-results"><summary>{target.results.length ? `Se encontraron coincidencias · ${target.results.length} solicitudes disponibles` : "No se encontraron coincidencias en esta búsqueda"}</summary>
      <p>Se solicitaron hasta 30 similitudes del stock. Las revisiones posteriores agregan novedades de ingreso y publicación. Esta selección no representa todas las marcas de INAPI.</p>
      {target.results.slice(0, visible).map((hit, i) => <SimilarityCard key={hit.applicationId} hit={hit} position={i + 1} queryName={target.name} queryImage={target.image}>{["En seguimiento", "Convertida en caso"].includes(hit.reviewStatus ?? "") ? <button onClick={() => onOpen(hit.matchId!)}>Abrir ficha · {hit.reviewStatus}</button> : <><button onClick={() => onOpen(hit.matchId!)}>Ver ficha</button><button disabled={!!busy} onClick={() => void action({ action: "follow", id: hit.matchId })}>{busy === hit.matchId ? "Guardando…" : "Pasar a seguimiento"}</button></>}</SimilarityCard>)}
      {visible < target.results.length && <button className="similarity-more" onClick={() => setVisible(n => n + WATCH_PAGE_SIZE)}>Buscar más · mostrar {Math.min(WATCH_PAGE_SIZE, target.results.length - visible)} más</button>}
      {!!target.results.length && <small>Mostrando {Math.min(visible, target.results.length)} de {target.results.length} solicitudes obtenidas.</small>}
      {!!target.warnings.length && <details><summary>Alcance de esta búsqueda</summary><p>La fuente trabaja con un conjunto limitado de candidatos; pueden existir otras solicitudes similares fuera de los resultados obtenidos.</p><ul>{[...new Set(target.warnings)].map(w => <li key={w}>{w}</li>)}</ul></details>}
    </details>}
  </article>;
}
