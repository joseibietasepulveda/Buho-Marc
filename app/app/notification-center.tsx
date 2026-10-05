"use client";
import "./notification-center.css";
import { Bell, Check, CaretRight, MagnifyingGlass, Trash, X } from "@phosphor-icons/react";
import { dismissDialogBackdrop } from "./dialog-dismiss";
import { legalText, legalFieldLabel } from "@/lib/legal-language";
import { noticePresentation } from "@/lib/work-priorities";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isPriorityNotice, isTitleIssued } from "@/lib/notification-policy";
import { displayValue, statusLabel, type FieldChange } from "@/lib/source-contract";
import type { RegistrationApplication } from "@/lib/registration-data";
import { buildNotificationTimeline, conciseNoticeTitle, priorityNoticeSummary, type TimelineBrand } from "@/lib/notification-timeline";
import { notificationPage } from "@/lib/notification-page";

type Notice = { deadline?: string; id: string; title: string; brand: string; urgency: string; status: string; date: string; body: string; matchId?: string; kind?: string; changeDetail?: { applicationNumber?: string; caseId?: string; changes: FieldChange[]; source?: string; summary: string } };
const emptyApplications: RegistrationApplication[] = [];
const emptyBrands: TimelineBrand[] = [];
const countFormat = new Intl.NumberFormat("es-CL");

export function NotificationCenter({ notices, applications = emptyApplications, brands = emptyBrands, onManage, onDismiss, onClear, onOpenMatch, onOpenCase }: { onDismiss: (id: string) => Promise<boolean>; onClear: (scope: "priority" | "all") => Promise<boolean>; notices: Notice[]; applications?: RegistrationApplication[]; brands?: TimelineBrand[]; onManage: (id: string) => void; onOpenMatch: (id: string) => void; onOpenCase?: (id: string) => void }) {
  const [wide,setWide]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(min-width:1050px)');const update=()=>setWide(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const [tab, setTab] = useState<"priority" | "all">("priority");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0), [query, setQuery] = useState(""), [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [feedback, setFeedback] = useState("");
  const priorities = useMemo(() => notices.filter(isPriorityNotice), [notices]);
  const pendingPriorities = priorities.filter(notice => notice.status === "Pendiente").length;
  const inbox = tab === "priority" ? priorities : notices;
  const term = query.trim().toLocaleLowerCase("es");
  const visible = inbox.filter(notice => (status === "all" || notice.status === status) && (!term || `${notice.brand} ${notice.title} ${notice.changeDetail?.applicationNumber ?? ""}`.toLocaleLowerCase("es").includes(term)));
  const paginated = notificationPage(visible, page);
  const selected = notices.find(notice => notice.id === selectedId);

  async function dismiss(id?: string) {
    if (busy) return;
    setBusy(true); setError(""); setFeedback("");
    try {
      if (!await (id ? onDismiss(id) : onClear(tab))) setError("No se pudieron actualizar los avisos. Intenta nuevamente.");
      else if (!id && tab === "priority") setFeedback("Indicador limpio. Las notificaciones siguen disponibles aquí y en Todas.");
    } catch { setError("No se pudo confirmar el cambio. Revisa tu conexión."); }
    finally { setBusy(false); }
  }

  return <section className="notification-center">
    <div className="notice-toolbar">
      <div className="notice-tabs" role="group" aria-label="Bandejas de notificaciones">
        <button type="button" aria-pressed={tab === "priority"} onClick={() => { setTab("priority"); setPage(0); setFeedback(""); }}>Prioritarias <span>{countFormat.format(priorities.length)}</span></button>
        <button type="button" aria-pressed={tab === "all"} onClick={() => { setTab("all"); setPage(0); setFeedback(""); }}>Todas <span>{countFormat.format(notices.length)}</span></button>
      </div>
      <button type="button" className="notice-clear" disabled={busy || (tab === "priority" ? !pendingPriorities : !notices.length)} onClick={() => void dismiss()}>{tab === "priority" ? <Check size={18} aria-hidden/> : <Trash size={18} aria-hidden/>}{busy ? "Actualizando…" : tab === "priority" ? "Limpiar prioritarias" : "Eliminar todas"}</button>
    </div>
    <p className="notice-intro">{tab === "priority" ? "Hitos que requieren tu atención. Al limpiar prioritarias, se quitan del indicador lateral y se conserva su historial." : "Todo el historial de tu cartera. Abre un aviso para ver sus antecedentes y la historia del expediente."}</p>
    {error && <p role="alert" className="notice-error">{error}</p>}
    {feedback && <p role="status" className="notice-feedback"><Check size={18} aria-hidden/>{feedback}</p>}
    <div className="notice-inbox-filters">
      <label className="notice-search"><MagnifyingGlass size={21} aria-hidden/><input aria-label="Buscar notificaciones" type="search" placeholder="Buscar por marca, aviso o solicitud" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }}/></label>
      <label className="notice-status-filter">Mostrar<select aria-label="Estado de las notificaciones" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="all">Todos los avisos</option><option value="Pendiente">Por revisar</option><option value="Gestionada">Revisadas</option></select></label>
    </div>
    <div className="notice-content-layout"><div className="notice-list-column">{visible.length > 0 && <NoticePagination {...paginated} onPage={setPage}/>}
    <div className="notice-inbox-list">{paginated.items.map(notice => {
      const display = noticePresentation(notice, notice.deadline);
      const unread = notice.status === "Pendiente";
      const title = display.kind === "deadline" ? conciseNoticeTitle(display.title, notice.brand) : tab === "priority" ? priorityNoticeSummary(notice) : conciseNoticeTitle(legalText(display.title), notice.brand);
      return <article className={`notice-inbox-item ${unread ? "is-unread" : ""} ${selectedId===notice.id?"is-selected":""}`} key={notice.id}>
        <button type="button" className="notice-inbox-row" onClick={() => setSelectedId(notice.id)} aria-haspopup={wide?undefined:"dialog"} aria-pressed={selectedId===notice.id}>
          <span className="notice-inbox-icon" aria-hidden><Bell size={22}/>{unread && <i/>}</span>
          <span className="notice-inbox-copy"><span className="notice-inbox-meta"><strong>{notice.brand}</strong><span>{notice.date}</span><span className="notice-inbox-source">{noticeSource(notice)}</span></span><strong className="notice-inbox-title">{title}</strong>{display.kind === "deadline" && <span className="notice-inbox-deadline">{display.label}</span>}</span>
          <span className={`notice-inbox-status ${unread ? "is-pending" : ""}`}>{unread ? "Por revisar" : "Revisada"}</span>
          <CaretRight className="notice-inbox-chevron" size={20} aria-hidden/>
        </button>
        <button type="button" className="notice-remove" aria-label={`Eliminar notificación ${notice.title}`} title="Eliminar notificación" disabled={busy} onClick={() => void dismiss(notice.id)}><X size={19} weight="bold" aria-hidden/></button>
      </article>;
    })}</div>
    {visible.length > 50 && <NoticePagination {...paginated} onPage={setPage}/>}
    {!visible.length && <div className="notice-empty"><Bell size={32} aria-hidden/><h3>{query || status !== "all" ? "No encontramos avisos con estos filtros" : tab === "priority" ? "No hay novedades prioritarias" : "Todavía no hay notificaciones"}</h3><p>{query || status !== "all" ? "Prueba con otra búsqueda o muestra todos los estados." : "Los nuevos hitos aparecerán aquí cuando se detecten en tus expedientes."}</p>{tab === "priority" && notices.length > 0 && <button type="button" onClick={() => { setTab("all"); setPage(0); setStatus("all"); setQuery(""); }}>Ver todas las notificaciones</button>}</div>}
    </div>{selected ? <PriorityNoticeDrawer inline={wide} key={selected.id} notice={selected} notices={notices} applications={applications} brands={brands} onClose={() => setSelectedId(null)} onManage={onManage} onDismiss={async () => { await dismiss(selected.id); }} busy={busy} onOpenMatch={onOpenMatch} onOpenCase={onOpenCase}/>:wide&&<aside className="notice-reader-empty"><Bell size={28} aria-hidden/><h3>Selecciona una notificación</h3><p>Aquí verás el aviso y la historia de su expediente.</p></aside>}</div>
  </section>;
}

function NoticePagination({ page, pages, total, from, to, onPage }: { page: number; pages: number; total: number; from: number; to: number; onPage: (page: number) => void }) {
  return <div className="notice-pagination" role="group" aria-label="Paginación de notificaciones"><span>{countFormat.format(from)}–{countFormat.format(to)} de {countFormat.format(total)} {total===1?"aviso":"avisos"}</span>{pages > 1 && <div><button type="button" aria-label="Página anterior de notificaciones" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</button><span>{page + 1} / {countFormat.format(pages)}</span><button type="button" aria-label="Página siguiente de notificaciones" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Siguiente</button></div>}</div>;
}

function noticeSource(notice: Notice) {
  const title = priorityNoticeSummary(notice);
  if (isTitleIssued(title)) return "Título disponible";
  if (/Diario Oficial/i.test(title) || notice.changeDetail?.changes.some(change => change.field === "publicationDate")) return "Diario Oficial";
  return notice.changeDetail?.source === "inapi" ? "INAPI" : notice.changeDetail?.source === "simulated" ? "Demostración" : "Seguimiento";
}

const detailLabels: Record<string, string> = { event_id: "ID de la actuación", eventId: "ID de la actuación", status_code: "Código INAPI", code: "Código INAPI", status_description: "Descripción completa", status: "Descripción completa", title: "Descripción completa", event_date: "Fecha de actuación", date: "Fecha de actuación", observation: "Observaciones", detail: "Observaciones", due_date: "Vencimiento informado por la fuente", intake: "Ingreso de solicitud" };
function EvidenceDetails({ entries }: { entries: Record<string, unknown>[] }) {
  const fields = new Map<string, { label: string; value: string }>();
  for (const entry of entries) for (const [key, value] of Object.entries(entry)) {
    if (value === undefined || value === null || value === "") continue;
    const label = detailLabels[key] ?? legalFieldLabel(key);
    const text = typeof value === "object" ? displayValue(value) : String(value);
    // Projections and raw acts may repeat the same date/title/ID. Display each
    // value once while retaining every distinct observation or previous value.
    fields.set(`${label}:${text}`, { label, value: text });
  }
  return <dl className="priority-evidence-fields">{[...fields].map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>;
}

function timelineDate(date: string) {
  return date ? new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00Z`)) : "Fecha no informada";
}

function PriorityNoticeDrawer({ inline=false, notice, notices, applications, brands, onClose, onManage, onDismiss, busy, onOpenMatch, onOpenCase }: { inline?:boolean; onDismiss: () => Promise<void>; busy: boolean; notice: Notice; notices: Notice[]; applications: RegistrationApplication[]; brands: TimelineBrand[]; onClose: () => void; onManage: (id: string) => void; onOpenMatch: (id: string) => void; onOpenCase?: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const timeline = useMemo(() => buildNotificationTimeline(notice, notices, applications, brands), [notice, notices, applications, brands]);
  const display = noticePresentation(notice, notice.deadline);
  const changes = notice.changeDetail?.changes ?? [];
  const title = display.kind === "deadline" ? conciseNoticeTitle(display.title, notice.brand) : isPriorityNotice(notice) ? priorityNoticeSummary(notice) : conciseNoticeTitle(legalText(display.title), notice.brand);
  useEffect(() => {
    if(inline)return;
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previousOverflow; if (opener?.isConnected) opener.focus(); };
  }, [inline]);
  // Native dialog provides keyboard dismissal through Escape; clicks dismiss only its backdrop.
  const content=<>
    <header><div><span>NOTIFICACIÓN · {noticeSource(notice)}</span><h2 id={titleId}>{notice.brand}</h2></div><button type="button" aria-label="Cerrar notificación" onClick={onClose}><X size={22} aria-hidden/></button></header>
    <div className="priority-notice-scroll">
      <section className="priority-notice-highlight"><small>Aviso detectado: {notice.date}</small><h3>{title}</h3><p>{notice.status === "Pendiente" ? "Pendiente de revisión" : "Notificación revisada"}</p>{display.kind === "deadline" && <p>{display.label}. Confirma el vencimiento y su antecedente en el expediente.</p>}{isTitleIssued(title) && <p>Revisa el título emitido para completar la entrega al cliente.</p>}{notice.changeDetail ? <p>{legalText(notice.changeDetail.summary.split("\n\nAntecedentes detectados:")[0])}</p> : <p>{legalText(notice.body)}</p>}</section>
      <section className="priority-notice-history"><header><h3>{timeline.kind === "acts" ? "Historia del expediente" : "Historia del seguimiento"}</h3><span>{timeline.entries.length} {timeline.kind === "acts" ? timeline.entries.length === 1 ? "hito disponible" : "hitos disponibles" : timeline.entries.length === 1 ? "aviso disponible" : "avisos disponibles"}</span></header>
        <p>{timeline.official ? "Fechas de las actuaciones informadas por INAPI. No equivalen por sí solas a su fecha de notificación legal." : timeline.kind === "acts" ? timeline.simulated ? "Antecedentes de demostración disponibles en la plataforma; no constituyen actuaciones oficiales." : "Historia disponible en la plataforma. Confirma la procedencia y las notificaciones en el expediente." : "Avisos de la plataforma relacionados con este seguimiento. No constituyen un historial oficial de INAPI."} {timeline.kind === "acts" && "Los hitos de este aviso se señalan en morado."}</p>
        {timeline.ambiguous && <p className="priority-history-warning">Hay expedientes con el mismo nombre. Para evitar mezclar sus historias, aquí solo se muestran los antecedentes identificados en este aviso.</p>}
        <ol className="priority-timeline">{timeline.entries.map(entry => <li key={entry.key} className={entry.current ? "is-current" : ""}><span className="priority-timeline-dot" aria-hidden /><div><small>{entry.kind === "act" ? "Actuación" : "Aviso"} · {timelineDate(entry.date)}</small><h4>{entry.title}</h4>{entry.current && <span className="priority-timeline-tag">Incluido en este aviso</span>}{entry.previous && <p className="priority-history-warning">Antecedente anterior al cambio. No se presenta como una actuación vigente.</p>}<details><summary>Ver detalle y referencias <span aria-hidden>⌄</span></summary><EvidenceDetails entries={entry.details} /></details></div></li>)}</ol>
      </section>
      {changes.length > 0 && <section className="priority-other-changes"><h3>Otros antecedentes del aviso</h3>{changes.map((change, index) => <details key={`${change.field}-${index}`}><summary>{legalText(change.label)}<span aria-hidden>⌄</span></summary><EvidenceDetails entries={[{ Antes: change.field === "status" ? statusLabel(String(change.before)) : change.before, Ahora: change.field === "status" ? statusLabel(String(change.after)) : change.after }]} /></details>)}</section>}
      <details className="priority-notice-reference"><summary>Referencia de la notificación <span aria-hidden>⌄</span></summary><EvidenceDetails entries={[{ "ID del aviso": notice.id, "Título del aviso": legalText(notice.title), "Fecha de detección": notice.date, ...(notice.matchId ? { "Vigilancia relacionada": notice.matchId } : {}) }]} /></details>
    </div>
    <footer><button type="button" className="is-danger" disabled={busy} onClick={() => void onDismiss()}>Eliminar notificación</button>{notice.changeDetail?.caseId && onOpenCase && <button type="button" onClick={() => { onClose(); onOpenCase(notice.changeDetail!.caseId!); }}>Ver caso de oposición →</button>}{notice.matchId && <button type="button" onClick={() => { onClose(); onOpenMatch(notice.matchId!); }}>Ver vigilancia →</button>}<button type="button" className="priority-review-action" disabled={notice.status === "Gestionada"} onClick={() => onManage(notice.id)}>{notice.status === "Gestionada" ? "Revisada" : "Marcar como revisada"}</button></footer>
  </>;
  if(inline)return <aside className="priority-notice-reader" aria-labelledby={titleId}>{content}</aside>;
  // Escape and the close button provide keyboard equivalents to backdrop dismissal.
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
  return createPortal(<dialog ref={dialog} onClick={event=>dismissDialogBackdrop(event,onClose)} className="priority-notice-drawer" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}}>{content}</dialog>,document.body);
}
