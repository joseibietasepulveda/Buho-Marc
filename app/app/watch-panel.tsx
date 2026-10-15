"use client";
import { WatchFeedback } from "./watch-feedback";
import { discoveryLabels } from "@/lib/watch-discovery";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WATCH_PAGE_SIZE } from "@/lib/similarity-contract";
import { DEFAULT_PUBLICATION_FILTER, type PublicationFilter, type WatchTarget, type WatchHit } from "@/lib/watch-list";
import { DEFAULT_WATCH_SETTINGS, canWatchPublication, watchSettingsSchema, type WatchSettings } from "@/lib/watch-policy";
import { SimilarityImage, OppositionWindow } from "./similarity-results";
import { displayWorkDate } from "@/lib/work-priorities";
import "./similarity.css";
import type { WatchPage } from "@/lib/watch-page";
import type { CaseTask } from "@/lib/case-tasks";
import { updateWatchPage, retainConvertedFindings } from "@/lib/watch-view-state";
import { snapshotReader, pollWhileVisible } from "@/lib/snapshot-client";

type Snapshot = WatchPage;
export type WatchLinkedCase = { id: string; title: string; brand: string; client: string; stage: "Esperando confirmación de cliente" | "En seguimiento" | "Concluido"; priority: "Alta" | "Media" | "Baja"; deadline: string; deadlineDescription: string; owner: string; sourceMatch?: string; tasks?: CaseTask[] };
type OpenCase = (matchId: string, linkedCase?: WatchLinkedCase) => void;
type Props = { active: boolean; onOpen: (id: string) => void; onRefresh: () => Promise<void>; onCases: OpenCase; initialQuery?: string };
export function WatchPanel({ active, onOpen, onRefresh, onCases, initialQuery = "" }: Props) {
  const [data, setData] = useState<Snapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const [query, setQuery] = useState(initialQuery), [tab, setTab] = useState<'discover' | 'follow'>('discover');
  const [settings, setSettings] = useState<WatchSettings>(DEFAULT_WATCH_SETTINGS), [notice, setNotice] = useState("");
  const [followState,setFollowState] = useState("all");
  const acting = useRef(false);
  const [busyAction, setBusyAction] = useState("");
  const linkedCases = useRef(new Map<string, WatchLinkedCase>());
  const lastLoadedUrl = useRef("");
  const [requestedQuery, setRequestedQuery] = useState(initialQuery);
  if (requestedQuery !== initialQuery) { setRequestedQuery(initialQuery); if (initialQuery) setQuery(initialQuery); }
  const [publication, setPublication] = useState<PublicationFilter>(DEFAULT_PUBLICATION_FILTER);
  function publicationDate(field: "from" | "to", value: string) { setPublication(current => ({ ...current, [field]: value, source: value ? "official" : current.source })); }
  const [relevance, setRelevance] = useState<"related" | "all">("related");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [groupLimit, setGroupLimit] = useState(30), [limits, setLimits] = useState<Record<string, number>>({});
  const reader = useRef(snapshotReader<Snapshot>()), requestVersion = useRef(0);
  const url = useMemo(() => {
    const params = new URLSearchParams({q: query, publication: publication.source, from: publication.from, to: publication.to, groups: String(groupLimit), followState, scope: "new", relevance});
    if (settingsLoaded) { params.set("high", String(settings.high)); params.set("medium", String(settings.medium)); }
    for (const [key, value] of Object.entries(limits)) params.set(`limit:${key}`, String(value));
    return `/api/watch?${params}`;
  }, [query, publication, groupLimit, followState, settings, settingsLoaded, limits, relevance]);
  const load = useCallback(async () => {
    if (acting.current) return;
    const version = ++requestVersion.current;
    const payload = await reader.current(url);
    if (version === requestVersion.current) {
      setError("");
      if (!payload) lastLoadedUrl.current = url;
      if (payload) { const sameQuery = lastLoadedUrl.current === url; setData(current => sameQuery && current ? retainConvertedFindings(payload, current) : payload); lastLoadedUrl.current = url; if (!settingsLoaded) { setSettings(payload.settings); setSettingsLoaded(true); } }
    }
  }, [url, settingsLoaded]);
  useEffect(() => {
    if (!active) return;
    let mounted = true;
    const stop = pollWhileVisible(async () => { try { await load(); } catch (e) { if (mounted) setError(e instanceof Error ? e.message : "No se pudo actualizar la vigilancia."); } }, 30000, "buho-watch-poll", lastLoadedUrl.current !== url);
    return () => { mounted = false; stop(); };
  }, [active, load, url]);
  useEffect(() => {
    const invalidate = () => {
      lastLoadedUrl.current = ""; requestVersion.current++; linkedCases.current.clear();
      if (active) void load().catch(() => setError("No se pudo actualizar la vigilancia."));
    };
    window.addEventListener("buho-source-reviewed", invalidate);
    window.addEventListener("buho-watch-invalidated", invalidate);
    return () => { window.removeEventListener("buho-source-reviewed", invalidate); window.removeEventListener("buho-watch-invalidated", invalidate); };
  }, [active, load]);
  const more = (band: string, id: string, loaded: number) => setLimits(current => ({...current, [`${band}:${id}`]: loaded + WATCH_PAGE_SIZE}));
  async function action(input: Record<string, unknown>) {
    if (acting.current) return; acting.current = true;
    setBusy(String(input.id ?? "all")); setBusyAction(input.publicationOnly ? "publication" : String(input.action)); setError(""); setNotice(""); requestVersion.current++;
    try {
      const response = await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar el cambio.");
      if (input.action === "follow") setData(current => current ? updateWatchPage(current, String(input.id), { reviewStatus: "En seguimiento", ...(input.publicationOnly ? { watchPublication: true } : {}) }) : current);
      if (input.action === "follow") { setNotice(input.publicationOnly ? (data?.automaticEnabled ? "En seguimiento. Te avisaremos en Notificaciones cuando la fuente informe su publicación." : "En seguimiento. Comprobaremos su publicación cuando solicites una revisión.") : "Coincidencia añadida a En seguimiento."); void onRefresh().catch(() => setError("El cambio se guardó. No se pudo actualizar el resumen; vuelve a intentarlo.")); }
      if (input.action === "ai-review") setNotice("Revisión en curso. Se analizarán hasta 50 marcas y dos cruces por marca; los ya evaluados se reutilizan.");
      if (input.action === "settings") { setNotice("Límites guardados para esta cartera."); void onRefresh().catch(() => setError("El cambio se guardó. No se pudo actualizar el resumen; vuelve a intentarlo.")); }
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la acción."); }
    finally { acting.current = false; setBusy(""); setBusyAction(""); if(input.action === "settings" || input.action === "ai-review") void load().catch(() => setError("No se pudo actualizar la lista.")); }
  }
  async function review(id: string, status: string) {
    if (acting.current) return; acting.current = true;
    setBusy(id); setBusyAction(status); setError(""); setNotice(""); requestVersion.current++;
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reviewMatch", id, status, compact: true }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "No se pudo guardar la revisión.");
      if (payload.case) linkedCases.current.set(id, payload.case);
      setData(current => current ? updateWatchPage(current, id, { reviewStatus: status }) : current);
      void onRefresh().catch(() => setError("El cambio se guardó. No se pudo actualizar el resumen; vuelve a intentarlo.")); setNotice(status === "Convertida en caso" ? "Caso creado y vinculado a esta coincidencia." : "Revisión guardada.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la revisión."); }
    finally { acting.current = false; setBusy(""); setBusyAction(""); }
  }
  const valid = watchSettingsSchema.safeParse(settings).success;
  const groups = data?.groups ?? [], followed = data?.followed ?? [];
  const count = data?.count ?? 0, followedCount = data?.followedCount ?? 0;
  const reviewed = data?.reviewed ?? 0, pending = data?.pending ?? 0;
  const groupProps = {busy, busyAction, action, review, onOpen, onCases: (id: string) => onCases(id, linkedCases.current.get(id))};
  return <section className="watch-view">
    {!data && !error && <div className="watch-loading" role="status"><span className="loading-spinner" aria-hidden/>Cargando vigilancia…</div>}
    <div className="buho-tabs watch-tabs" aria-label="Vistas de vigilancia"><button type="button" aria-pressed={tab === 'discover'} className={tab === 'discover' ? 'is-active' : ''} onClick={() => setTab('discover')}>Novedades por revisar <b>{count}</b></button><button type="button" aria-pressed={tab === 'follow'} className={tab === 'follow' ? 'is-active' : ''} onClick={() => setTab('follow')}>En seguimiento <b>{followedCount}</b></button></div>
    <div className="watch-toolbar"><label>Buscar marca, solicitud o titular<input type="search" aria-label="Buscar vigilancia por nombre" value={query} onChange={e => setQuery(e.target.value)} placeholder="Escribe un nombre o número de solicitud" /></label>
    {tab !== 'follow' && <label className="watch-relevance">Productos y servicios<select value={relevance} onChange={e => setRelevance(e.target.value as 'related' | 'all')}><option value="related">Relacionados o por confirmar</option><option value="all">Todos los resultados</option></select></label>}
      <details className="watch-publication-disclosure"><summary>Filtros de publicación</summary><div className="watch-publication-filters"><label>Publicación<select value={publication.source} onChange={e => setPublication({ ...publication, source: e.target.value as PublicationFilter['source'], ...(e.target.value !== 'official' ? { from: '', to: '' } : {}) })}><option value="all">Todas</option><option value="inapi">INAPI · sin publicación informada</option><option value="official">Publicada en Diario Oficial</option></select></label><label>Publicación DO desde<input type="date" value={publication.from} max={publication.to || undefined} onInput={e => publicationDate("from", e.currentTarget.value)} onChange={e => publicationDate("from", e.currentTarget.value)}/></label><label>Publicación DO hasta<input type="date" value={publication.to} min={publication.from || undefined} onInput={e => publicationDate("to", e.currentTarget.value)} onChange={e => publicationDate("to", e.currentTarget.value)}/></label><button type="button" onClick={() => setPublication(DEFAULT_PUBLICATION_FILTER)}>Limpiar fechas y publicación</button></div></details>
      {tab !== 'follow' && <details className="watch-thresholds"><summary>Configurar umbrales</summary>
        <div className="watch-threshold-content"><div className="watch-publication-threshold"><div><strong>Filtro de publicación</strong><output htmlFor="watch-publication-threshold">{Math.round(settings.medium * 100)}%</output></div><p>Mostrar los cruces que alcancen este umbral cuando aún no tengan una evaluación de IA.</p><input id="watch-publication-threshold" aria-label="Umbral para mostrar coincidencias" type="range" min={0} max={100} step={5} value={Math.round(settings.medium * 100)} style={{ background: `linear-gradient(to right, #a8cfb9 0%, #a8cfb9 ${settings.medium * 100}%, #ce7773 ${settings.medium * 100}%, #ce7773 100%)` }} onChange={e => setSettings({ high: 1, medium: Number(e.target.value) / 100 })} /><div className="watch-threshold-legend"><span><i className="is-hide"/>No mostrar</span><span><i className="is-show"/>Mostrar</span></div><button type="button" className="buho-secondary" disabled={!!busy || !valid || settings.medium === data?.settings.medium} onClick={() => void action({action:'settings',settings})}>Guardar umbral</button></div>
        <section className="watch-ai-settings"><div><span className="buho-overline">REVISIÓN CON IA</span><strong>Primero, los cruces recomendados</strong><p>Hasta 50 marcas · 2 coincidencias por marca · 100 cruces por revisión. Las decisiones se conservan mientras no cambien los antecedentes.</p></div><button type="button" className="buho-primary" disabled={!!busy || !data?.ai?.configured || !!data?.ai?.run && ['queued','running','retry'].includes(data.ai.run.status)} onClick={() => void action({action:'ai-review'})}>{busyAction === 'ai-review' ? 'Iniciando…' : data?.ai?.run && ['queued','running','retry'].includes(data.ai.run.status) ? 'Revisión en curso…' : 'Ordenar con IA'}</button><small>{!data?.ai?.configured ? 'La conexión de IA está pendiente de configuración.' : data.ai.run ? `${data.ai.run.evaluated} cruces evaluados de ${data.ai.run.selected}${data.ai.run.failures ? ` · ${data.ai.run.failures} pendientes de reintento` : ''}${data.ai.run.limited ? ' · Se conserva el resto para una próxima revisión' : ''}` : 'Aún no se ha solicitado una revisión.'} {data?.ai?.automatic ? 'Revisión automática diaria activada.' : ''}</small>{data?.ai?.run?.error && <p role="status">{data.ai.run.error}</p>}</section></div>
      </details>}
      {tab === 'follow' && <label>Estado del seguimiento<select value={followState} onChange={e=>setFollowState(e.target.value)}><option value="all">Todos</option><option>En seguimiento</option><option>Convertida en caso</option></select></label>}
    </div>
    {publication.from && publication.to && publication.from > publication.to && <p role="alert">La fecha inicial debe ser anterior o igual a la final.</p>}
    {!valid && <p role="alert">El umbral debe estar entre 0% y 100%.</p>}

    {error && <p role="alert" className="similarity-error">{error}</p>}{notice && <p role="status" className="watch-feedback">{notice}</p>}
    {data && !data.configured && <p>La conexión de búsqueda real no está configurada en este ambiente.</p>}
    {data?.configured && <>
      <details className="watch-context"><summary>Cómo funciona esta vigilancia</summary><p className="watch-help">Al iniciar la vigilancia se revisan también las solicitudes anteriores. Después se incorporan nuevas solicitudes, publicaciones y cambios de estado. Los pendientes se conservan hasta que los revises. Solo recibirás notificaciones de las marcas que pases a seguimiento. Se priorizan productos y servicios relacionados; los antecedentes incompletos quedan por confirmar.</p><p className="watch-help">{data.automaticEnabled?'Revisión automática diaria · 12:30, hora de Chile':'Revisión a pedido · abrir esta pantalla no inicia una búsqueda'} · Última consulta: {data.reviewedAt?new Date(data.reviewedAt).toLocaleString('es-CL',{timeZone:'America/Santiago'}):'Sin revisiones completas'}</p></details>
      <p className="watch-progress">{reviewed} de {data.total} {data.total===1?"marca consultada":"marcas consultadas"}{pending ? ` · ${pending} revisiones en curso o en espera` : ''}. Hasta 50 resultados por consulta de stock.</p>
      {tab !== 'follow' ? <div className="watch-cross-list">{groups.map(group => group.rows.length > 0 && <section key={group.level} className={`watch-cross-section ${group.level === 'Recomendados' ? 'is-recommended' : ''}`}><header><h2>{group.level === 'Recomendados' ? 'Recomendados por la IA' : 'Otras coincidencias detectadas'}</h2><span>{group.totalGroups} cruces</span></header>{group.rows.flatMap(row => row.hits.map(hit => <CrossRow key={hit.matchId || `${row.target.id}:${hit.applicationId}`} target={row.target} hit={hit} {...groupProps} />))}</section>)}{!count && <div className="watch-empty"><strong>No hay coincidencias para mostrar</strong><p>Puedes ajustar el umbral o los filtros. Los resultados que ya revisaste se conservan en seguimiento.</p></div>}{groups.reduce((n,g) => n + g.totalGroups,0) > groups.reduce((n,g) => n + g.rows.length,0) && <button className="similarity-more" type="button" onClick={() => setGroupLimit(n => n + 30)}>Mostrar más cruces</button>}</div> : <><FollowedTable rows={followed} {...groupProps}/>{followed.filter(row=>row.total>row.hits.length).map(row=><button type="button" key={row.target.id} onClick={()=>more("follow",row.target.id,row.hits.length)}>Más seguimientos de {row.target.name} · {row.total-row.hits.length} restantes</button>)}{data.followedTotalGroups>followed.length && <button type="button" onClick={()=>setGroupLimit(n=>n+10)}>Ver más marcas en seguimiento</button>}</>}

    </>}
  </section>;
}
function CrossRow({target,hit,busy,busyAction,action,review,onOpen,onCases}:{target:WatchTarget;hit:WatchHit;busy:string;busyAction:string;action:(input:Record<string,unknown>)=>Promise<void>;review:(id:string,status:string)=>Promise<void>;onOpen:(id:string)=>void;onCases:(id:string)=>void}) {
  return <article className={`watch-cross-row ${hit.aiDecision?.show ? 'is-recommended' : ''}`} aria-label={`${target.name} y ${hit.name}`}>
    <div className="watch-cross-brand"><SimilarityImage src={target.image} applicationId={target.applicationId} name={target.name}/><div><small>Marca en seguimiento</small><strong>{target.name}</strong><span>Solicitud {target.applicationId}</span><span className="watch-class-label">Niza {target.classes?.join(', ') || 'no informada'}</span></div></div>
    <span className="watch-cross-connector" aria-hidden>↔</span>
    <div className="watch-cross-brand"><SimilarityImage src={hit.image} applicationId={hit.applicationId} name={hit.name}/><div><small>Coincidencia detectada</small><button className="watch-cross-name" type="button" onClick={() => onOpen(hit.matchId!)}>{hit.name}</button><span>Solicitud {hit.applicationId}</span><span className="watch-class-label">Niza {hit.classes.map(c => c.nice_class).join(', ') || 'no informada'}</span><span>{hit.holders.map(h => h.name).join('; ') || 'Titular no informado'}</span></div></div>
    <div className="watch-cross-context">{hit.aiDecision?.show && <span className="watch-recommended-badge">✦ Recomendado</span>}<strong>{hit.status}</strong><small>{discoveryLabels[hit.discoveryKind ?? 'baseline']}</small>{hit.aiDecision && <details><summary>Motivo de la recomendación</summary><p>{hit.aiDecision.reason}</p>{hit.aiDecision.insufficient && <small>Antecedentes incompletos · requiere revisión.</small>}</details>}{!hit.aiDecision && hit.commercialRelevance !== 'related' && <small>{hit.commercialRelevance === 'unrelated' ? 'Sin relación comercial identificada' : 'Coberturas por confirmar'}</small>}<OppositionWindow hit={hit}/>{hit.matchId && <WatchFeedback key={`${hit.matchId}:${hit.feedback?.vote||''}:${hit.feedback?.delivery||''}`} matchId={hit.matchId} initial={hit.feedback}/>}</div>
    <div className="watch-cross-actions"><button type="button" onClick={() => onOpen(hit.matchId!)}>Comparar y ver historial</button>{hit.reviewStatus === 'Convertida en caso' ? <button type="button" className="watch-action-confirmed" onClick={() => onCases(hit.matchId!)}>Ir al caso →</button> : <><button type="button" className="buho-primary" disabled={!!busy} onClick={() => void review(hit.matchId!,'Convertida en caso')}>{busy === hit.matchId && busyAction === 'Convertida en caso' ? 'Creando caso…' : 'Convertir en caso'}</button><div><button type="button" disabled={!!busy || hit.reviewStatus === 'En seguimiento'} onClick={() => void action({action:'follow',id:hit.matchId})}>{hit.reviewStatus === 'En seguimiento' ? 'En seguimiento ✓' : 'Seguir'}</button><button type="button" disabled={!!busy} onClick={() => void review(hit.matchId!,'Descartada')}>Descartar</button></div>{(canWatchPublication(hit) || hit.watchPublication) && <button type="button" className="watch-publication-action" disabled={!!busy || hit.watchPublication} onClick={() => void action({action:'follow',id:hit.matchId,publicationOnly:true})}>{hit.watchPublication ? 'Aviso de publicación activado ✓' : 'Avísame si se publica'}</button>}</>}</div>
  </article>;
}

function FollowedTable({rows,busy,busyAction,review,onOpen,onCases}:{rows:{target:WatchTarget;hits:WatchHit[]}[];busy:string;busyAction:string;review:(id:string,status:string)=>Promise<void>;onOpen:(id:string)=>void;onCases:(id:string)=>void}) {
  // Keyboard focus lets users scroll the overflow table without a pointer.
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
  return <section className="watch-band"><header><h2>Marcas en seguimiento</h2><span>Expedientes que elegiste seguir, incluso si su estado cambia.</span></header>{!rows.length ? <p className="watch-empty">No hay coincidencias en seguimiento con estos filtros.</p> : <div role="region" className="watch-table-scroll" tabIndex={0} aria-label="Tabla de marcas en seguimiento"><table className="watch-follow-table"><thead><tr><th>Tu marca</th><th>Marca seguida</th><th>Estado</th><th>Publicación y oposición</th><th>Acciones</th></tr></thead><tbody>{rows.flatMap(({target,hits})=>hits.map(hit=><tr key={hit.matchId}>
    <td><div className="watch-follow-brand"><SimilarityImage src={target.image} applicationId={target.applicationId} name={target.name}/><div><strong>{target.name}</strong><small>Solicitud {target.applicationId}</small><small>Clases {target.classes?.join(", ") || "no informadas"}</small></div></div></td>
    <td><div className="watch-follow-brand"><SimilarityImage src={hit.image} applicationId={hit.applicationId} name={hit.name}/><div><strong>{hit.name}</strong><small>Solicitud {hit.applicationId}</small><small>Clases {hit.classes.map(c=>c.nice_class).join(", ") || "no informadas"}</small><small>{hit.holders.map(h=>h.name).join("; ")}</small></div></div></td>
    <td><strong>{hit.reviewStatus}</strong><small>{hit.status}</small></td>
    <td>{hit.publishedAt && <small>Publicada el {displayWorkDate(hit.publishedAt)}</small>}<OppositionWindow hit={hit}/></td>
    <td><div className="watch-follow-actions"><button type="button" onClick={()=>onOpen(hit.matchId!)}>Comparar y ver historial</button>{hit.reviewStatus === "Convertida en caso" ? <button type="button" className="watch-action-confirmed" onClick={() => onCases(hit.matchId!)}>Ir al caso →</button> : <><button type="button" disabled={!!busy} onClick={()=>void review(hit.matchId!,"Convertida en caso")}>{busy === hit.matchId && busyAction === "Convertida en caso" ? "Creando caso…" : "Convertir en caso"}</button><button type="button" disabled={!!busy} onClick={()=>void review(hit.matchId!,"Descartada")}>Dejar de seguir</button></>}</div></td>
  </tr>))}</tbody></table></div>}</section>;
}
