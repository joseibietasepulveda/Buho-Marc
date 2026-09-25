"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WATCH_PAGE_SIZE } from "@/lib/similarity-contract";
import { DEFAULT_PUBLICATION_FILTER, type PublicationFilter, type WatchTarget, type WatchHit } from "@/lib/watch-list";
import { DEFAULT_WATCH_SETTINGS, canWatchPublication, watchSettingsSchema, type WatchSettings } from "@/lib/watch-policy";
import { SimilarityCard, SimilarityImage, OppositionWindow } from "./similarity-results";
import { SimilarityRange } from "./similarity-range";
import { displayWorkDate } from "@/lib/work-priorities";
import "./similarity.css";
import type { WatchPage } from "@/lib/watch-page";
import { snapshotReader, pollWhileVisible } from "@/lib/snapshot-client";

type Snapshot = WatchPage;
type Props = { onOpen: (id: string) => void; onRefresh: () => Promise<void>; onCases: () => void; initialQuery?: string };
export function WatchPanel({ onOpen, onRefresh, onCases, initialQuery = "" }: Props) {
  const [data, setData] = useState<Snapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const [query, setQuery] = useState(initialQuery), [tab, setTab] = useState<'discover' | 'follow'>('discover');
  const [settings, setSettings] = useState<WatchSettings>(DEFAULT_WATCH_SETTINGS), [notice, setNotice] = useState("");
  const [levels,setLevels] = useState(["Alta","Media"]); const [followState,setFollowState] = useState("all");
  const acting = useRef(false);
  const [publication, setPublication] = useState<PublicationFilter>(DEFAULT_PUBLICATION_FILTER);
  function publicationDate(field: "from" | "to", value: string) { setPublication(current => ({ ...current, [field]: value, source: value ? "official" : current.source })); }
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [groupLimit, setGroupLimit] = useState(10), [limits, setLimits] = useState<Record<string, number>>({});
  const reader = useRef(snapshotReader<Snapshot>()), requestVersion = useRef(0);
  const url = useMemo(() => {
    const params = new URLSearchParams({q: query, publication: publication.source, from: publication.from, to: publication.to, groups: String(groupLimit), followState});
    if (settingsLoaded) { params.set("high", String(settings.high)); params.set("medium", String(settings.medium)); }
    for (const [key, value] of Object.entries(limits)) params.set(`limit:${key}`, String(value));
    return `/api/watch?${params}`;
  }, [query, publication, groupLimit, followState, settings, settingsLoaded, limits]);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    const payload = await reader.current(url);
    if (version === requestVersion.current) {
      setError("");
      if (payload) { setData(payload); if (!settingsLoaded) { setSettings(payload.settings); setSettingsLoaded(true); } }
    }
  }, [url, settingsLoaded]);
  useEffect(() => {
    let mounted = true;
    const versionRef = requestVersion;
    const stop = pollWhileVisible(async () => { try { await load(); } catch (e) { if (mounted) setError(e instanceof Error ? e.message : "No se pudo actualizar la vigilancia."); } }, 30000);
    return () => { mounted = false; versionRef.current++; stop(); };
  }, [load]);
  const more = (band: string, id: string, loaded: number) => setLimits(current => ({...current, [`${band}:${id}`]: loaded + WATCH_PAGE_SIZE}));
  async function action(input: Record<string, unknown>) {
    if (acting.current) return; acting.current = true;
    setBusy(String(input.id ?? "all")); setError(""); setNotice(""); requestVersion.current++;
    try {
      const response = await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar el cambio.");
      await load();
      if (input.action === "follow") { setNotice(input.publicationOnly ? (data?.automaticEnabled ? "En seguimiento. Te avisaremos en Notificaciones cuando la fuente informe su publicación." : "En seguimiento. Comprobaremos su publicación cuando solicites una revisión.") : "Coincidencia añadida a En seguimiento."); void onRefresh().catch(() => setError("El cambio se guardó. No se pudo actualizar el resumen; vuelve a intentarlo.")); }
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
      void load().catch(()=>setError("El cambio se guardó; no pudimos actualizar la lista. Reintentaremos automáticamente.")); void onRefresh().catch(() => setError("El cambio se guardó. No se pudo actualizar el resumen; vuelve a intentarlo.")); setNotice(status === "Convertida en caso" ? "Caso creado y vinculado a esta coincidencia." : "Revisión guardada.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la revisión."); }
    finally { acting.current = false; setBusy(""); }
  }
  const valid = watchSettingsSchema.safeParse(settings).success;
  const groups = data?.groups ?? [], followed = data?.followed ?? [];
  const count = data?.count ?? 0, followedCount = data?.followedCount ?? 0;
  const reviewed = data?.reviewed ?? 0, pending = data?.pending ?? 0;
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
      <p className="watch-help">{data.automaticEnabled ? "Revisión automática diaria · 12:30, hora de Chile" : "Revisión a pedido · abrir esta pantalla no inicia una búsqueda"} · Última actualización de resultados: {data.reviewedAt ? new Date(data.reviewedAt).toLocaleString("es-CL", {timeZone:"America/Santiago"}) : "Sin revisiones completas"}</p>
      <p className="watch-progress">{reviewed} de {data.total} marcas consultadas{pending ? ` · ${pending} revisiones en curso o en espera` : ''}. Hasta 50 resultados por consulta de stock.</p>
      {tab === 'discover' ? groups.filter(group=>levels.includes(group.level)).map(group => <section key={group.level} className={`watch-band watch-band-${group.level.toLowerCase()}`}><header><h2>{group.level} similitud</h2><span>{group.level === 'Alta' ? `${Math.round(settings.high*100)}%–100%` : `${Math.round(settings.medium*100)}%–menos de ${Math.round(settings.high*100)}%`}</span></header>{group.rows.length ? group.rows.map(row => <FindingGroup key={`${row.target.id}:${JSON.stringify(settings)} :${query}:${JSON.stringify(publication)}`} {...row} {...groupProps} onMore={() => more(group.level, row.target.id, row.hits.length)} />) : <p className="watch-empty">No hay hallazgos en este rango con los filtros actuales.</p>}{group.totalGroups > group.rows.length && <button type="button" onClick={() => setGroupLimit(n => n + 10)}>Ver más marcas · {group.totalGroups - group.rows.length} restantes</button>}</section>) : <><FollowedTable rows={followed} {...groupProps}/>{followed.filter(row=>row.total>row.hits.length).map(row=><button type="button" key={row.target.id} onClick={()=>more("follow",row.target.id,row.hits.length)}>Más seguimientos de {row.target.name} · {row.total-row.hits.length} restantes</button>)}{data.followedTotalGroups>followed.length && <button type="button" onClick={()=>setGroupLimit(n=>n+10)}>Ver más marcas en seguimiento</button>}</>}
      {tab === 'discover' && !levels.length && <p className="watch-empty">Selecciona Alta o Media similitud para ver los hallazgos.</p>}
    </>}
  </section>;
}
function FindingGroup({target,hits,total,onMore,busy,following,action,review,onOpen,onCases}:{target:WatchTarget;hits:WatchHit[];total:number;onMore:()=>void;busy:string;following?:boolean;action:(input:Record<string,unknown>)=>Promise<void>;review:(id:string,status:string)=>Promise<void>;onOpen:(id:string)=>void;onCases:()=>void}) {
  return <section className="watch-family"><header><SimilarityImage src={target.image} name={target.name}/><div><h3>{target.name}</h3><p>Tu marca · Solicitud {target.applicationId} · {target.ownStatus}</p></div><span>{total} {total === 1 ? 'coincidencia' : 'coincidencias'}</span></header><div className="watch-children">{hits.map(hit => <SimilarityCard key={hit.applicationId} hit={hit} onDetails={() => onOpen(hit.matchId!)}>
    {hit.watchPublication && <span className="watch-publication">{hit.publishedAt ? 'Publicación informada' : 'Esperando publicación en el Diario Oficial'}</span>}
    <button type="button" onClick={() => onOpen(hit.matchId!)}>Comparar marcas y ver historial</button>
    {!following && <button type="button" disabled={!!busy} onClick={() => void action({action:'follow',id:hit.matchId})}>Pasar a seguimiento</button>}
    {canWatchPublication(hit) && !hit.watchPublication && hit.reviewStatus !== 'Convertida en caso' && <button type="button" disabled={!!busy} onClick={() => void action({action:'follow',id:hit.matchId,publicationOnly:true})}>Avísame si se publica en el Diario Oficial</button>}
    {hit.reviewStatus === 'Convertida en caso' ? <button type="button" onClick={onCases}>Ver casos</button> : <button type="button" className="buho-primary" disabled={!!busy} onClick={() => void review(hit.matchId!,'Convertida en caso')}>{busy === hit.matchId ? "Guardando…" : "Convertir en caso"}</button>}
    {hit.reviewStatus !== 'Convertida en caso' && <button type="button" disabled={!!busy} onClick={() => void review(hit.matchId!,'Descartada')}>Descartar</button>}
  </SimilarityCard>)}{hits.length < total && <button className="similarity-more" type="button" onClick={onMore}>Buscar más · {Math.min(WATCH_PAGE_SIZE,total-hits.length)} más</button>}</div></section>;
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
