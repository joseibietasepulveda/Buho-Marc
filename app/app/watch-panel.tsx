"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { WATCH_PAGE_SIZE } from "@/lib/similarity-contract";
import { filterWatchTargets, reviewStatus, watchHits, watchStatuses, type WatchHit, type WatchLevel, type WatchStatus, type WatchTarget } from "@/lib/watch-list";
import { SimilarityCard, SimilarityImage } from "./similarity-results";
import { sourceReviewDate } from "@/lib/source-schedule";
import "./similarity.css";

type Snapshot = { configured: boolean; automaticEnabled: boolean; targets: WatchTarget[] };
type Props = { onOpen: (id: string) => void; onRefresh: () => Promise<void>; levels: WatchLevel[]; statuses: WatchStatus[]; onLevels: (levels: WatchLevel[]) => void; onStatuses: (statuses: WatchStatus[]) => void };
export function WatchPanel({ onOpen, onRefresh, levels, statuses, onLevels, onStatuses }: Props) {
  const [data, setData] = useState<Snapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    const response = await fetch("/api/watch", { cache: "no-store" }); const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "No se pudo cargar la vigilancia.");
    if (version === requestVersion.current) { setData(payload); setError(""); }
  }, []);
  useEffect(() => {
    let mounted = true;
    const refresh = () => { if (mounted) void load().catch(e => { if (mounted) setError(e.message); }); };
    refresh(); const timer = setInterval(refresh, 10000); window.addEventListener("buho-source-reviewed", refresh);
    return () => { mounted = false; clearInterval(timer); window.removeEventListener("buho-source-reviewed", refresh); };
  }, [load]);
  async function action(input: Record<string, unknown>) {
    setBusy(String(input.id ?? "all")); setError(""); requestVersion.current++;
    try {
      const response = await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar el cambio.");
      requestVersion.current++; setData(payload); if (input.action === "follow") await onRefresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la acción."); }
    finally { setBusy(""); }
  }
  async function classify(id: string, field: "level" | "status", value: string) {
    setBusy(id); setError("");
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(field === "level" ? { action: "updateMatchLevel", id, level: value } : { action: "reviewMatch", id, status: value }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "No se pudo guardar la revisión.");
      await load(); await onRefresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la revisión."); }
    finally { setBusy(""); }
  }
  const targets = data?.targets ?? [], allHits = targets.flatMap(watchHits);
  const rows = filterWatchTargets(targets, query, levels, statuses);
  const reviewed = targets.filter(t => t.reviewedAt).length;
  const pending = targets.filter(t => ["queued", "running", "retry"].includes(t.status) && !t.paused).length;
  const toggleLevel = (level: WatchLevel) => onLevels(levels.includes(level) ? levels.filter(item => item !== level) : [...levels, level]);
  const toggleStatus = (status: WatchStatus) => onStatuses(statuses.includes(status) ? statuses.filter(item => item !== status) : [...statuses, status]);
  return <section className="buho-view-matches watch-view">
    <section className="buho-filter-row">
      <label className="buho-live-search"><span>Buscar por nombre o solicitud</span><input aria-label="Buscar vigilancia por nombre" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Marca propia, coincidencia o titular" /></label>
      <h2>Filtros</h2><div className="buho-match-filter-groups">
        <fieldset><legend>Similitud revisada</legend><div className="buho-filter-pills"><button type="button" aria-pressed={!levels.length} className={!levels.length ? "is-active is-neutral" : "is-neutral"} onClick={() => onLevels([])}>Todas</button>{(["Alta", "Media", "Baja"] as WatchLevel[]).map(level => <button type="button" key={level} aria-pressed={levels.includes(level)} className={`${levels.includes(level) ? "is-active " : ""}tone-${level.toLowerCase()}`} onClick={() => toggleLevel(level)}>{level} similitud <b>{allHits.filter(hit => hit.level === level).length}</b></button>)}</div></fieldset>
        <fieldset><legend>Revisión de coincidencias</legend><div className="buho-filter-pills"><button type="button" aria-pressed={!statuses.length} className={!statuses.length ? "is-active is-neutral" : "is-neutral"} onClick={() => onStatuses([])}>Todos</button>{watchStatuses.map(status => <button type="button" key={status} aria-pressed={statuses.includes(status)} className={statuses.includes(status) ? "is-active" : ""} onClick={() => toggleStatus(status)}>{status === "Convertida en caso" ? "Pasadas a caso" : status === "Descartada" ? "Descartadas" : status}</button>)}</div></fieldset>
      </div>
    </section>
    {error && <p role="alert" className="similarity-error">{error} <button type="button" onClick={() => void load().catch(e => setError(e.message))}>Reintentar</button></p>}
    {!data && !error && <p role="status">Cargando vigilancia…</p>}
    {data && !data.configured && <p>La conexión de búsqueda real no está configurada en este ambiente.</p>}
    {data?.configured && <section className="buho-table-panel watch-list">
      <header className="watch-list-header"><div><h2>Marcas en vigilancia</h2><p>{reviewed} de {targets.length} marcas consultadas{pending ? ` · ${pending} revisiones en curso o en espera` : ""}. Abre una fila para revisar sus coincidencias.</p>{!data.automaticEnabled && <small>Las revisiones automáticas están desactivadas en este ambiente.</small>}</div><button type="button" disabled={!!busy} onClick={() => void action({ action: "review" })}>Preparar revisiones pendientes</button></header>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to scroll the table region. */}
      <div className="watch-table-scroll" role="region" aria-label="Marcas y coincidencias de vigilancia" tabIndex={0}><table className="watch-table"><thead><tr><th scope="col">Marca propia</th><th scope="col">Estado INAPI</th><th scope="col">Revisión de similitudes</th><th scope="col">Coincidencias</th><th scope="col">Acciones</th></tr></thead><tbody>
        {rows.map(({ target, hits }) => <WatchRow key={target.id} target={target} hits={hits} busy={busy} action={action} classify={classify} onOpen={onOpen} filterKey={JSON.stringify([query, levels, statuses])} />)}
        {!rows.length && <tr><td colSpan={5}>{targets.length ? "No hay coincidencias que cumplan estos filtros." : "Las marcas propias importadas aparecerán aquí al preparar su primera revisión."}</td></tr>}
      </tbody></table></div>
    </section>}
  </section>;
}
function WatchRow({ target, hits, busy, action, classify, onOpen, filterKey }: { target: WatchTarget; hits: WatchHit[]; busy: string; action: (input: Record<string, unknown>) => Promise<void>; classify: (id: string, field: "level" | "status", value: string) => Promise<void>; onOpen: (id: string) => void; filterKey: string }) {
  const [open, setOpen] = useState(false);
  const running = ["queued", "running", "retry"].includes(target.status);
  const state = target.paused ? "Vigilancia pausada" : target.status === "running" ? "Consultando la API…" : target.status === "queued" ? "Consulta en espera" : target.status === "retry" ? "Reintento pendiente" : target.status === "failed" ? "No se completó la consulta" : target.reviewedAt ? "Revisión completada" : "Primera revisión pendiente";
  const detailsId = `watch-results-${target.id}`;
  return <Fragment><tr className={open ? "watch-row is-open" : "watch-row"}>
    <th scope="row"><button type="button" className="watch-row-toggle" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(v => !v)}><span aria-hidden>{open ? "▾" : "▸"}</span><SimilarityImage src={target.image} name={target.name} /><span><strong>{target.name}</strong><small>Solicitud {target.applicationId}</small></span></button></th>
    <td>{target.ownStatus}</td><td><strong>{state}</strong>{target.reviewedAt && <small>Última revisión: {sourceReviewDate(target.reviewedAt, new Date())}</small>}{target.error && <small className="watch-error">{target.error}</small>}</td>
    <td><button type="button" className="watch-results-toggle" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(v => !v)}>{target.reviewedAt ? hits.length ? `Se encontraron coincidencias · ${hits.length}` : "Sin coincidencias" : "Ver estado de la consulta"} <span aria-hidden>{open ? "▴" : "▾"}</span></button></td>
    <td><div className="watch-row-actions"><button type="button" disabled={!!busy || running || target.paused} onClick={() => void action({ action: "review", id: target.id })}>Revisar ahora</button><button type="button" disabled={!!busy} onClick={() => void action({ action: "pause", id: target.id, paused: !target.paused })}>{target.paused ? "Reanudar" : "Pausar"}</button></div></td>
  </tr><tr hidden={!open} id={detailsId} className="watch-expanded"><td colSpan={5}>{open && <WatchResults key={filterKey} target={target} hits={hits} busy={busy} action={action} classify={classify} onOpen={onOpen} />}</td></tr></Fragment>;
}
function WatchResults({ target, hits, busy, action, classify, onOpen }: { target: WatchTarget; hits: WatchHit[]; busy: string; action: (input: Record<string, unknown>) => Promise<void>; classify: (id: string, field: "level" | "status", value: string) => Promise<void>; onOpen: (id: string) => void }) {
  const [visible, setVisible] = useState(WATCH_PAGE_SIZE);
  return <div className="similarity-panel watch-results">
    <h3>Coincidencias de {target.name}</h3>
    {!target.reviewedAt ? <p>{target.paused ? "Reanuda la vigilancia para consultar esta marca." : target.status === "failed" ? "La consulta no terminó. Usa Revisar ahora para volver a intentarlo." : "Esta marca está preparada para su consulta individual a la API. Los resultados aparecerán aquí cuando termine."}</p> : <>
      <p>Se solicitaron hasta 30 similitudes del stock, sin filtrar estados. También se conservan las coincidencias revisadas y las novedades de ingreso y publicación.</p>
      {hits.slice(0, visible).map((hit, i) => <SimilarityCard key={hit.applicationId} hit={hit} position={i + 1} queryName={target.name} queryImage={target.image}>
        <label>Similitud revisada<select aria-label={`Cambiar similitud de ${hit.name}`} disabled={!!busy} value={hit.level ?? "Sin clasificar"} onChange={e => void classify(hit.matchId!, "level", e.target.value)}><option value="Sin clasificar" disabled>Sin clasificar</option>{["Alta", "Media", "Baja"].map(level => <option key={level}>{level}</option>)}</select></label>
        <label>Revisión<select aria-label={`Cambiar revisión de ${hit.name}`} disabled={!!busy} value={reviewStatus(hit)} onChange={e => void classify(hit.matchId!, "status", e.target.value)}>{watchStatuses.map(status => <option key={status} value={status}>{status === "Convertida en caso" ? "Pasada a caso" : status}</option>)}</select></label>
        <button type="button" onClick={() => onOpen(hit.matchId!)}>Ver ficha</button>{!["En seguimiento", "Convertida en caso"].includes(hit.reviewStatus ?? "") && <button type="button" disabled={!!busy} onClick={() => void action({ action: "follow", id: hit.matchId })}>{busy === hit.matchId ? "Guardando…" : "Pasar a seguimiento"}</button>}
      </SimilarityCard>)}
      {visible < hits.length && <button type="button" className="similarity-more" onClick={() => setVisible(n => n + WATCH_PAGE_SIZE)}>Buscar más · mostrar {Math.min(WATCH_PAGE_SIZE, hits.length - visible)} más</button>}
      <small>Mostrando {Math.min(visible, hits.length)} de {hits.length} solicitudes{filterKeyLabel(target, hits)}.</small>
    </>}
    {target.nextReviewAt && <p>Próxima revisión: {sourceReviewDate(target.nextReviewAt, new Date())}</p>}
    {!!target.warnings.length && <details><summary>Alcance de esta búsqueda</summary><p>Estos resultados no representan todas las marcas de INAPI.</p><ul>{[...new Set(target.warnings)].map(w => <li key={w}>{w}</li>)}</ul></details>}
  </div>;
}
function filterKeyLabel(target: WatchTarget, hits: WatchHit[]) { return hits.length < watchHits(target).length ? " que cumplen los filtros" : " disponibles"; }
