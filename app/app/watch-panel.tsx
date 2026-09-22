"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { WATCH_PAGE_SIZE } from "@/lib/similarity-contract";
import { discoveryGroups, followedGroups, DEFAULT_PUBLICATION_FILTER, type PublicationFilter, type WatchTarget, type WatchHit } from "@/lib/watch-list";
import { DEFAULT_WATCH_SETTINGS, canWatchPublication, watchSettingsSchema, type WatchSettings } from "@/lib/watch-policy";
import { SimilarityCard, SimilarityImage, OppositionWindow } from "./similarity-results";
import { SimilarityRange } from "./similarity-range";
import { displayWorkDate } from "@/lib/work-priorities";
import "./similarity.css";

type Snapshot = { configured: boolean; automaticEnabled: boolean; settings: WatchSettings; targets: WatchTarget[] };
type Props = { onOpen: (id: string) => void; onRefresh: () => Promise<void>; onCases: () => void; initialQuery?: string };
export function WatchPanel({ onOpen, onRefresh, onCases, initialQuery = "" }: Props) {
  const [data, setData] = useState<Snapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const [query, setQuery] = useState(initialQuery), [tab, setTab] = useState<'discover' | 'follow'>('discover');
  const [settings, setSettings] = useState<WatchSettings>(DEFAULT_WATCH_SETTINGS), [notice, setNotice] = useState("");
  const [levels,setLevels] = useState(["Alta","Media"]); const [followState,setFollowState] = useState("all");
  const acting = useRef(false);
  const [publication, setPublication] = useState<PublicationFilter>(DEFAULT_PUBLICATION_FILTER);
  function publicationDate(field: "from" | "to", value: string) { setPublication(current => ({ ...current, [field]: value, source: value ? "official" : current.source })); }
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
    if (acting.current) return; acting.current = true;
    setBusy(String(input.id ?? "all")); setError(""); setNotice(""); requestVersion.current++;
    try {
      const response = await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar el cambio.");
      requestVersion.current++; setData(payload);
      if (input.action === "follow") { setNotice(input.publicationOnly ? "En seguimiento. Te avisaremos en Notificaciones cuando la fuente informe su publicación." : "Coincidencia añadida a En seguimiento."); void onRefresh().catch(() => setError("El cambio se guardó. No se pudo actualizar el resumen; vuelve a intentarlo.")); }
      if (input.action === "settings") { setNotice("Límites guardados para esta cartera."); void onRefresh().catch(() => setError("El cambio se guardó. No se pudo actualizar el resumen; vuelve a intentarlo.")); }
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la acción."); }
    finally { acting.current = false; setBusy(""); }
  }
  async function review(id: string, status: string) {
    if (acting.current) return; acting.current = true;
    setBusy(id); setError(""); setNotice(""); requestVersion.current++;
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reviewMatch", id, status, compact: true }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "No se pudo guardar la revisión.");
      setData(current=>current ? {...current,targets:current.targets.map(target=>({...target,results:target.results.map(hit=>hit.matchId === id ? {...hit,reviewStatus:status} : hit),savedResults:target.savedResults?.map(hit=>hit.matchId === id ? {...hit,reviewStatus:status} : hit)}))} : current);
      void load().catch(()=>setError("El cambio se guardó; no pudimos actualizar la lista. Reintentaremos automáticamente.")); void onRefresh().catch(() => setError("El cambio se guardó. No se pudo actualizar el resumen; vuelve a intentarlo.")); setNotice(status === "Convertida en caso" ? "Caso creado y vinculado a esta coincidencia." : "Revisión guardada.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la revisión."); }
    finally { acting.current = false; setBusy(""); }
  }
  const targets = data?.targets ?? [], valid = watchSettingsSchema.safeParse(settings).success;
  const groups = discoveryGroups(targets, query, valid ? settings : data?.settings ?? DEFAULT_WATCH_SETTINGS, publication), followed = followedGroups(targets, query, publication);
  const count = groups.reduce((n,g) => n + g.rows.reduce((m,r) => m+r.hits.length,0),0), followedCount = followed.reduce((n,r) => n+r.hits.length,0);
  const reviewed = targets.filter(t => t.reviewedAt).length;
  const pending = targets.filter(t => ["queued", "running", "retry"].includes(t.status) && !t.paused).length;
  const groupProps = {busy, action, review, onOpen, onCases};
  return <section className="watch-view">
    {!data && !error && <div className="watch-loading" role="status"><span className="loading-spinner" aria-hidden/>Cargando vigilancia…</div>}
    <div className="buho-tabs watch-tabs" aria-label="Vistas de vigilancia"><button type="button" aria-pressed={tab === 'discover'} className={tab === 'discover' ? 'is-active' : ''} onClick={() => setTab('discover')}>Por revisar <b>{count}</b></button><button type="button" aria-pressed={tab === 'follow'} className={tab === 'follow' ? 'is-active' : ''} onClick={() => setTab('follow')}>En seguimiento <b>{followedCount}</b></button></div>
    <div className="watch-toolbar"><label>Buscar marca, solicitud o titular<input type="search" aria-label="Buscar vigilancia por nombre" value={query} onChange={e => setQuery(e.target.value)} placeholder="Escribe un nombre o número de solicitud" /></label>
      {tab === 'discover' && <div className="watch-thresholds"><SimilarityRange value={settings} onChange={setSettings}/><div className="watch-level-switch" role="group" aria-label="Similitudes visibles">{["Alta","Media"].map(level=><button type="button" key={level} aria-pressed={levels.includes(level)} onClick={()=>setLevels(current=>current.includes(level) ? current.filter(l=>l!==level) : [...current,level])}>{level} similitud</button>)}<button type="button" disabled={!!busy || !valid || JSON.stringify(settings) === JSON.stringify(data?.settings)} onClick={() => void action({action:'settings',settings})}>Guardar límites</button></div></div>}
      {tab === 'follow' && <label>Estado del seguimiento<select value={followState} onChange={e=>setFollowState(e.target.value)}><option value="all">Todos</option><option>En seguimiento</option><option>Convertida en caso</option></select></label>}
    </div>
    <div className="watch-publication-filters"><label>Publicación<select value={publication.source} onChange={e => setPublication({ ...publication, source: e.target.value as PublicationFilter['source'], ...(e.target.value !== 'official' ? { from: '', to: '' } : {}) })}><option value="all">Todas</option><option value="inapi">INAPI · sin publicación informada</option><option value="official">Publicada en Diario Oficial</option></select></label><label>Publicación DO desde<input type="date" value={publication.from} max={publication.to || undefined} onInput={e => publicationDate("from", e.currentTarget.value)} onChange={e => publicationDate("from", e.currentTarget.value)}/></label><label>Publicación DO hasta<input type="date" value={publication.to} min={publication.from || undefined} onInput={e => publicationDate("to", e.currentTarget.value)} onChange={e => publicationDate("to", e.currentTarget.value)}/></label><button type="button" onClick={() => setPublication(DEFAULT_PUBLICATION_FILTER)}>Limpiar fechas y publicación</button></div>
    {publication.from && publication.to && publication.from > publication.to && <p role="alert">La fecha inicial debe ser anterior o igual a la final.</p>}
    {!valid && <p role="alert">El límite de similitud media debe ser menor que el de alta similitud.</p>}
    {tab === 'discover' && <p className="watch-help">Primero verás las marcas con mayor similitud. Se incluyen solicitudes en trámite y marcas concedidas; los expedientes terminados o sin estado confirmado no aparecen en Por revisar.</p>}
    {error && <p role="alert" className="similarity-error">{error}</p>}{notice && <p role="status" className="watch-feedback">{notice}</p>}
    {data && !data.configured && <p>La conexión de búsqueda real no está configurada en este ambiente.</p>}
    {data?.configured && <>
      <p className="watch-progress">{reviewed} de {targets.length} marcas consultadas{pending ? ` · ${pending} revisiones en curso o en espera` : ''}. Hasta 50 resultados por consulta de stock.</p>
      {tab === 'discover' ? groups.filter(group=>levels.includes(group.level)).map(group => <section key={group.level} className={`watch-band watch-band-${group.level.toLowerCase()}`}><header><h2>{group.level} similitud</h2><span>{group.level === 'Alta' ? `${Math.round(settings.high*100)}%–100%` : `${Math.round(settings.medium*100)}%–menos de ${Math.round(settings.high*100)}%`}</span></header>{group.rows.length ? group.rows.map(row => <FindingGroup key={`${row.target.id}:${JSON.stringify(settings)} :${query}:${JSON.stringify(publication)}`} {...row} {...groupProps} />) : <p className="watch-empty">No hay hallazgos en este rango con los filtros actuales.</p>}</section>) : <FollowedTable rows={followed.map(row=>({...row,hits:row.hits.filter(hit=>followState === "all" || hit.reviewStatus === followState)})).filter(row=>row.hits.length)} {...groupProps}/>}
      {tab === 'discover' && !levels.length && <p className="watch-empty">Selecciona Alta o Media similitud para ver los hallazgos.</p>}
    </>}
  </section>;
}
function FindingGroup({target,hits,busy,following,action,review,onOpen,onCases}:{target:WatchTarget;hits:WatchHit[];busy:string;following?:boolean;action:(input:Record<string,unknown>)=>Promise<void>;review:(id:string,status:string)=>Promise<void>;onOpen:(id:string)=>void;onCases:()=>void}) {
  const [visible,setVisible] = useState(WATCH_PAGE_SIZE);
  return <section className="watch-family"><header><SimilarityImage src={target.image} name={target.name}/><div><h3>{target.name}</h3><p>Tu marca · Solicitud {target.applicationId} · {target.ownStatus}</p></div><span>{hits.length} {hits.length === 1 ? 'coincidencia' : 'coincidencias'}</span></header><div className="watch-children">{hits.slice(0,visible).map(hit => <SimilarityCard key={hit.applicationId} hit={hit}>
    {hit.watchPublication && <span className="watch-publication">{hit.publishedAt ? 'Publicación informada' : 'Esperando publicación en el Diario Oficial'}</span>}
    <button type="button" onClick={() => onOpen(hit.matchId!)}>Comparar marcas y ver historial</button>
    {!following && <button type="button" disabled={!!busy} onClick={() => void action({action:'follow',id:hit.matchId})}>Pasar a seguimiento</button>}
    {canWatchPublication(hit) && !hit.watchPublication && hit.reviewStatus !== 'Convertida en caso' && <button type="button" disabled={!!busy} onClick={() => void action({action:'follow',id:hit.matchId,publicationOnly:true})}>Avísame si se publica en el Diario Oficial</button>}
    {hit.reviewStatus === 'Convertida en caso' ? <button type="button" onClick={onCases}>Ver casos</button> : <button type="button" className="buho-primary" disabled={!!busy} onClick={() => void review(hit.matchId!,'Convertida en caso')}>{busy === hit.matchId ? "Guardando…" : "Convertir en caso"}</button>}
    {hit.reviewStatus !== 'Convertida en caso' && <button type="button" disabled={!!busy} onClick={() => void review(hit.matchId!,'Descartada')}>Descartar</button>}
  </SimilarityCard>)}{visible < hits.length && <button className="similarity-more" type="button" onClick={() => setVisible(n => n + WATCH_PAGE_SIZE)}>Buscar más · {Math.min(WATCH_PAGE_SIZE,hits.length-visible)} más</button>}</div></section>;
}

function FollowedTable({rows,busy,review,onOpen,onCases}:{rows:{target:WatchTarget;hits:WatchHit[]}[];busy:string;review:(id:string,status:string)=>Promise<void>;onOpen:(id:string)=>void;onCases:()=>void}) {
  // Keyboard focus lets users scroll the overflow table without a pointer.
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
  return <section className="watch-band"><header><h2>Marcas en seguimiento</h2><span>Expedientes que elegiste seguir, incluso si su estado cambia.</span></header>{!rows.length ? <p className="watch-empty">No hay coincidencias en seguimiento con estos filtros.</p> : <div role="region" className="watch-table-scroll" tabIndex={0} aria-label="Tabla de marcas en seguimiento"><table className="watch-follow-table"><thead><tr><th>Tu marca</th><th>Marca seguida</th><th>Estado</th><th>Publicación y oposición</th><th>Acciones</th></tr></thead><tbody>{rows.flatMap(({target,hits})=>hits.map(hit=><tr key={hit.matchId}>
    <td><div className="watch-follow-brand"><SimilarityImage src={target.image} name={target.name}/><div><strong>{target.name}</strong><small>Solicitud {target.applicationId}</small><small>Clases {target.classes?.join(", ") || "no informadas"}</small></div></div></td>
    <td><div className="watch-follow-brand"><SimilarityImage src={hit.image} name={hit.name}/><div><strong>{hit.name}</strong><small>Solicitud {hit.applicationId}</small><small>Clases {hit.classes.map(c=>c.nice_class).join(", ") || "no informadas"}</small><small>{hit.holders.map(h=>h.name).join("; ")}</small></div></div></td>
    <td><strong>{hit.reviewStatus}</strong><small>{hit.status}</small></td>
    <td>{hit.publishedAt && <small>Publicada el {displayWorkDate(hit.publishedAt)}</small>}<OppositionWindow hit={hit}/></td>
    <td><div className="watch-follow-actions"><button type="button" onClick={()=>onOpen(hit.matchId!)}>Comparar y ver historial</button>{hit.reviewStatus === "Convertida en caso" ? <button type="button" onClick={onCases}>Ver caso</button> : <><button type="button" disabled={!!busy} onClick={()=>void review(hit.matchId!,"Convertida en caso")}>{busy === hit.matchId ? "Guardando…" : "Convertir en caso"}</button><button type="button" disabled={!!busy} onClick={()=>void review(hit.matchId!,"Descartada")}>Dejar de seguir</button></>}</div></td>
  </tr>))}</tbody></table></div>}</section>;
}
