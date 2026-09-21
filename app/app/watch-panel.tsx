"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { WATCH_PAGE_SIZE } from "@/lib/similarity-contract";
import { discoveryGroups, followedGroups, type WatchTarget, type WatchHit } from "@/lib/watch-list";
import { DEFAULT_WATCH_SETTINGS, canWatchPublication, watchSettingsSchema, type WatchSettings } from "@/lib/watch-policy";
import { SimilarityCard, SimilarityImage } from "./similarity-results";
import { sourceReviewDate } from "@/lib/source-schedule";
import "./similarity.css";

type Snapshot = { configured: boolean; automaticEnabled: boolean; settings: WatchSettings; targets: WatchTarget[] };
type Props = { onOpen: (id: string) => void; onRefresh: () => Promise<void>; onCases: () => void; initialQuery?: string };
export function WatchPanel({ onOpen, onRefresh, onCases, initialQuery = "" }: Props) {
  const [data, setData] = useState<Snapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const [query, setQuery] = useState(initialQuery), [tab, setTab] = useState<'discover' | 'follow'>('discover');
  const [settings, setSettings] = useState<WatchSettings>(DEFAULT_WATCH_SETTINGS), [notice, setNotice] = useState("");
  const initialized = useRef(false), requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    const response = await fetch("/api/watch", { cache: "no-store" }); const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "No se pudo cargar la vigilancia.");
    if (version === requestVersion.current) { setData(payload); setError(""); if (!initialized.current) { setSettings(payload.settings); initialized.current = true; } }
  }, []);
  useEffect(() => {
    let mounted = true;
    const refresh = () => { if (mounted) void load().catch(e => { if (mounted) setError(e.message); }); };
    refresh(); const timer = setInterval(refresh, 10000); window.addEventListener("buho-source-reviewed", refresh);
    return () => { mounted = false; clearInterval(timer); window.removeEventListener("buho-source-reviewed", refresh); };
  }, [load]);
  async function action(input: Record<string, unknown>) {
    setBusy(String(input.id ?? "all")); setError(""); setNotice(""); requestVersion.current++;
    try {
      const response = await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar el cambio.");
      requestVersion.current++; setData(payload);
      if (input.action === "follow") { setNotice(input.publicationOnly ? "En seguimiento. Te avisaremos en Notificaciones cuando la fuente informe su publicación." : "Coincidencia añadida a En seguimiento."); await onRefresh(); }
      if (input.action === "settings") { setNotice("Límites guardados para esta cartera."); await onRefresh(); }
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la acción."); }
    finally { setBusy(""); }
  }
  async function review(id: string, status: string) {
    setBusy(id); setError(""); setNotice(""); requestVersion.current++;
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reviewMatch", id, status }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "No se pudo guardar la revisión.");
      await load(); await onRefresh(); setNotice(status === "Convertida en caso" ? "Caso creado y vinculado a esta coincidencia." : "Revisión guardada.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la revisión."); }
    finally { setBusy(""); }
  }
  const targets = data?.targets ?? [], valid = watchSettingsSchema.safeParse(settings).success;
  const groups = discoveryGroups(targets, query, valid ? settings : data?.settings ?? DEFAULT_WATCH_SETTINGS), followed = followedGroups(targets, query);
  const count = groups.reduce((n,g) => n + g.rows.reduce((m,r) => m+r.hits.length,0),0), followedCount = followed.reduce((n,r) => n+r.hits.length,0);
  const reviewed = targets.filter(t => t.reviewedAt).length;
  const pending = targets.filter(t => ["queued", "running", "retry"].includes(t.status) && !t.paused).length;
  const groupProps = {busy, action, review, onOpen, onCases};
  return <section className="watch-view">
    <div className="buho-tabs watch-tabs" aria-label="Vistas de vigilancia"><button type="button" aria-pressed={tab === 'discover'} className={tab === 'discover' ? 'is-active' : ''} onClick={() => setTab('discover')}>Por revisar <b>{count}</b></button><button type="button" aria-pressed={tab === 'follow'} className={tab === 'follow' ? 'is-active' : ''} onClick={() => setTab('follow')}>En seguimiento <b>{followedCount}</b></button></div>
    <div className="watch-toolbar"><label>Buscar marca, solicitud o titular<input type="search" aria-label="Buscar vigilancia por nombre" value={query} onChange={e => setQuery(e.target.value)} placeholder="Escribe un nombre o número de solicitud" /></label>
      {tab === 'discover' && <div className="watch-thresholds"><label>Alta similitud desde<input type="number" min="0.01" max="1" step="0.01" value={settings.high} onChange={e => setSettings(v => ({...v, high: e.target.valueAsNumber}))} /></label><label>Media similitud desde<input type="number" min="0" max="0.99" step="0.01" value={settings.medium} onChange={e => setSettings(v => ({...v, medium: e.target.valueAsNumber}))} /></label><button type="button" disabled={!!busy || !valid || JSON.stringify(settings) === JSON.stringify(data?.settings)} onClick={() => void action({action:'settings',settings})}>Guardar límites</button></div>}
    </div>
    {!valid && <p role="alert">Usa valores entre 0 y 1, con el límite medio menor que el alto.</p>}
    {tab === 'discover' && <p className="watch-help">Los límites reorganizan los resultados al instante. El índice expresa cercanía, no probabilidad de conflicto. Se ocultan Denegada, Desistida y Abandonada; las registradas van al final de cada grupo.</p>}
    {error && <p role="alert" className="similarity-error">{error}</p>}{notice && <p role="status" className="watch-feedback">{notice}</p>}
    {!data && !error && <p role="status">Cargando vigilancia…</p>}
    {data && !data.configured && <p>La conexión de búsqueda real no está configurada en este ambiente.</p>}
    {data?.configured && <>
      <p className="watch-progress">{reviewed} de {targets.length} marcas consultadas{pending ? ` · ${pending} revisiones en curso o en espera` : ''}. Hasta 50 resultados por consulta de stock.</p>
      {tab === 'discover' ? groups.map(group => <section key={group.level} className={`watch-band watch-band-${group.level.toLowerCase()}`}><header><h2>{group.level} similitud</h2><span>{group.level === 'Alta' ? `Desde ${settings.high.toFixed(2)}` : `Desde ${settings.medium.toFixed(2)} hasta menos de ${settings.high.toFixed(2)}`}</span></header>{group.rows.length ? group.rows.map(row => <FindingGroup key={`${row.target.id}:${JSON.stringify(settings)}:${query}`} {...row} {...groupProps} />) : <p className="watch-empty">No hay hallazgos en este rango con los filtros actuales.</p>}</section>) : <section className="watch-band"><header><h2>Coincidencias en seguimiento</h2><span>Tu selección se conserva al cambiar los límites.</span></header>{followed.length ? followed.map(row => <FindingGroup key={`${row.target.id}:${query}`} {...row} {...groupProps} following />) : <p className="watch-empty">Aún no hay coincidencias visibles en seguimiento. Elige una desde Por revisar.</p>}</section>}
      <details className="watch-operations"><summary>Estado de las consultas · {targets.length} marcas</summary><p>{data.automaticEnabled ? 'La cartera se revisa automáticamente cada día.' : 'Las revisiones automáticas están desactivadas en este ambiente.'}</p><button disabled={!!busy} onClick={() => void action({action:'review'})}>Preparar revisiones pendientes</button>{targets.map(t => <div key={t.id}><span><strong>{t.name}</strong><small>{t.paused ? 'Pausada' : t.status === 'running' ? 'Consultando…' : t.status === 'queued' ? 'En espera' : t.status === 'retry' ? 'Reintento pendiente' : t.status === 'failed' ? 'No se completó' : t.reviewedAt ? `Revisada ${sourceReviewDate(t.reviewedAt,new Date())}` : 'Primera revisión pendiente'}{t.error ? ` · ${t.error}` : ''}</small></span><button disabled={!!busy || t.paused || ['queued','retry','running'].includes(t.status)} onClick={() => void action({action:'review',id:t.id})}>Revisar ahora</button><button disabled={!!busy} onClick={() => void action({action:'pause',id:t.id,paused:!t.paused})}>{t.paused ? 'Reanudar' : 'Pausar'}</button></div>)}</details>
    </>}
  </section>;
}
function FindingGroup({target,hits,busy,following,action,review,onOpen,onCases}:{target:WatchTarget;hits:WatchHit[];busy:string;following?:boolean;action:(input:Record<string,unknown>)=>Promise<void>;review:(id:string,status:string)=>Promise<void>;onOpen:(id:string)=>void;onCases:()=>void}) {
  const [visible,setVisible] = useState(WATCH_PAGE_SIZE);
  return <section className="watch-family"><header><SimilarityImage src={target.image} name={target.name}/><div><h3>{target.name}</h3><p>Tu marca · Solicitud {target.applicationId} · {target.ownStatus}</p></div><span>{hits.length} {hits.length === 1 ? 'coincidencia' : 'coincidencias'}</span></header><div className="watch-children">{hits.slice(0,visible).map(hit => <SimilarityCard key={hit.applicationId} hit={hit}>
    <span className="watch-score">Índice {hit.score.toFixed(3)}</span>
    {hit.watchPublication && <span className="watch-publication">{hit.publishedAt ? 'Publicación informada' : 'Esperando publicación en el Diario Oficial'}</span>}
    <button type="button" onClick={() => onOpen(hit.matchId!)}>Comparar marcas</button>
    {!following && <button type="button" disabled={!!busy} onClick={() => void action({action:'follow',id:hit.matchId})}>Pasar a seguimiento</button>}
    {canWatchPublication(hit) && !hit.watchPublication && hit.reviewStatus !== 'Convertida en caso' && <button type="button" disabled={!!busy} onClick={() => void action({action:'follow',id:hit.matchId,publicationOnly:true})}>Avísame si se publica en el Diario Oficial</button>}
    {hit.reviewStatus === 'Convertida en caso' ? <button type="button" onClick={onCases}>Ver casos</button> : <button type="button" className="buho-primary" disabled={!!busy} onClick={() => void review(hit.matchId!,'Convertida en caso')}>Crear caso</button>}
    {hit.reviewStatus !== 'Convertida en caso' && <button type="button" disabled={!!busy} onClick={() => void review(hit.matchId!,'Descartada')}>Descartar</button>}
  </SimilarityCard>)}{visible < hits.length && <button className="similarity-more" type="button" onClick={() => setVisible(n => n + WATCH_PAGE_SIZE)}>Buscar más · {Math.min(WATCH_PAGE_SIZE,hits.length-visible)} más</button>}</div></section>;
}
