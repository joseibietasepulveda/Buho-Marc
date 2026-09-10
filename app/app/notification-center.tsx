"use client";
import "./notification-center.css";
import { noticePresentation } from "@/lib/work-priorities";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isPriorityNotice, isTitleIssued } from "@/lib/notification-policy";
import { displayValue, statusLabel, type FieldChange } from "@/lib/source-contract";
import type { RegistrationApplication } from "@/lib/registration-data";
import { buildNotificationTimeline, conciseNoticeTitle, priorityNoticeSummary, type TimelineBrand } from "@/lib/notification-timeline";

type Notice = { deadline?: string; id: string; title: string; brand: string; urgency: string; status: string; date: string; body: string; matchId?: string; kind?: string; changeDetail?: { changes: FieldChange[]; source?: string; summary: string } };
const emptyApplications: RegistrationApplication[] = [];
const emptyBrands: TimelineBrand[] = [];
export function NotificationCenter({ notices, applications = emptyApplications, brands = emptyBrands, onManage, onOpenMatch }: { notices: Notice[]; applications?: RegistrationApplication[]; brands?: TimelineBrand[]; onManage: (id: string) => void; onOpenMatch: (id: string) => void }) {
  const [tab, setTab] = useState<"priority" | "all">("priority");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = notices.find(notice => notice.id === selectedId);
  const priorities = notices.filter(isPriorityNotice);
  const visible = tab === "priority" ? priorities : notices;
  return <section className="notification-center">
    <div className="notice-tabs" role="group" aria-label="Bandejas de notificaciones"><button type="button" aria-pressed={tab === "priority"} onClick={() => setTab("priority")}>Prioritarias <span>{priorities.length}</span></button><button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")}>Todas <span>{notices.length}</span></button></div>
    <p className="notice-intro">{tab === "priority" ? "Presentación, resoluciones, pagos, publicaciones, vencimientos y título de marca. Lo que necesitas para avanzar cada gestión." : "Historial completo de notificaciones, incluidos cambios de titular, representante y otros antecedentes."}</p>
    {tab === "priority" ? <div className="priority-notice-list">{priorities.map(notice => {
      const display = noticePresentation(notice, notice.deadline);
      return <button type="button" key={notice.id} className={`priority-notice-row ${notice.status === "Pendiente" ? "is-unread" : ""}`} onClick={() => setSelectedId(notice.id)} aria-haspopup="dialog">
        <i className="notice-unread-dot" aria-hidden /><span className="priority-notice-copy"><small>Aviso · {notice.date} · {notice.brand}</small><strong>{display.kind === "deadline" ? conciseNoticeTitle(display.title, notice.brand) : priorityNoticeSummary(notice)}</strong><span>{display.kind === "deadline" ? `${display.label} · ` : ""}{notice.status === "Pendiente" ? "Pendiente de revisión" : "Revisada"}</span></span><span className="priority-notice-source">{noticeSource(notice)}</span><span className="priority-notice-open">Ver historia <span aria-hidden>→</span></span>
      </button>;
    })}</div> : <div className="notice-accordion">{visible.map(notice => { const display = noticePresentation(notice, notice.deadline); return <details key={notice.id} className={notice.status === "Pendiente" ? "is-unread" : ""}>
      <summary><i className="notice-unread-dot" aria-hidden /><span><small>{notice.date} · {notice.brand}</small><strong>{display.title}</strong>{display.kind === "deadline" && <small>{display.label}</small>}<small>{notice.status === "Pendiente" ? "Pendiente de revisión" : "Gestionada"}</small></span><b>{isTitleIssued(notice.title) ? "Título disponible" : notice.changeDetail?.changes.some(change => change.field === "publicationDate") || /Diario Oficial/i.test(notice.title) ? "Diario Oficial" : notice.changeDetail ? "INAPI" : "Seguimiento"}</b><span className="notice-chevron" aria-hidden>⌄</span></summary>
      <div className="notice-details">{isTitleIssued(notice.title) && <p className="notice-title-issued">El título de marca figura emitido. Revisa el documento para completar la entrega al cliente.</p>}
        {notice.changeDetail ? <><p>{notice.changeDetail.summary.split("\n\nAntecedentes detectados:")[0]}</p><div className="notice-change-list">{notice.changeDetail.changes.map((change, index) => <details key={`${change.field}-${index}`}><summary>{change.label}<span aria-hidden>⌄</span></summary><dl><div><dt>Antes</dt><dd>{change.field === "status" ? statusLabel(String(change.before)) : displayValue(change.before)}</dd></div><div><dt>Ahora</dt><dd>{change.field === "status" ? statusLabel(String(change.after)) : displayValue(change.after)}</dd></div></dl></details>)}</div></> : <><p className="notice-body">{notice.body}</p>{display.kind === "deadline" && <p>El texto original corresponde a la fecha del aviso. Confirma el vencimiento en el expediente; las referencias como “en 5 días” no son una cuenta regresiva actualizada.</p>}</>}
        <footer>{notice.matchId && <button type="button" onClick={() => onOpenMatch(notice.matchId!)}>Ver vigilancia →</button>}<button type="button" disabled={notice.status === "Gestionada"} onClick={() => onManage(notice.id)}>{notice.status === "Gestionada" ? "Revisada" : "Marcar como revisada"}</button></footer>
      </div>
    </details>; })}</div>}
    {!visible.length && <div className="notice-empty"><h3>{tab === "priority" ? "No hay novedades prioritarias" : "Todavía no hay notificaciones"}</h3><p>Los nuevos hitos aparecerán aquí cuando se detecten en tus expedientes.</p>{tab === "priority" && notices.length > 0 && <button type="button" onClick={() => setTab("all")}>Ver todas las notificaciones</button>}</div>}
    {selected && <PriorityNoticeDrawer key={selected.id} notice={selected} notices={notices} applications={applications} brands={brands} onClose={() => setSelectedId(null)} onManage={onManage} onOpenMatch={onOpenMatch} />}
  </section>;
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
    const label = detailLabels[key] ?? key;
    const text = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    // Projections and raw acts may repeat the same date/title/ID. Display each
    // value once while retaining every distinct observation or previous value.
    fields.set(`${label}:${text}`, { label, value: text });
  }
  return <dl className="priority-evidence-fields">{[...fields].map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>;
}

function timelineDate(date: string) {
  return date ? new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00Z`)) : "Fecha no informada";
}

function PriorityNoticeDrawer({ notice, notices, applications, brands, onClose, onManage, onOpenMatch }: { notice: Notice; notices: Notice[]; applications: RegistrationApplication[]; brands: TimelineBrand[]; onClose: () => void; onManage: (id: string) => void; onOpenMatch: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const timeline = useMemo(() => buildNotificationTimeline(notice, notices, applications, brands), [notice, notices, applications, brands]);
  const display = noticePresentation(notice, notice.deadline);
  const changes = notice.changeDetail?.changes.filter(change => !["inapi.events", "inapi.annotations"].includes(change.field)) ?? [];
  const title = display.kind === "deadline" ? conciseNoticeTitle(display.title, notice.brand) : priorityNoticeSummary(notice);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previousOverflow; if (opener?.isConnected) opener.focus(); };
  }, []);
  return createPortal(<dialog ref={dialog} className="priority-notice-drawer" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><div><span>NOTIFICACIÓN · {noticeSource(notice)}</span><h2 id={titleId}>{notice.brand}</h2></div><button type="button" aria-label="Cerrar notificación" onClick={onClose}>×</button></header>
    <div className="priority-notice-scroll">
      <section className="priority-notice-highlight"><small>Aviso detectado: {notice.date}</small><h3>{title}</h3><p>{notice.status === "Pendiente" ? "Pendiente de revisión" : "Notificación revisada"}</p>{display.kind === "deadline" && <p>{display.label}. Confirma el vencimiento y su antecedente en el expediente.</p>}{isTitleIssued(title) && <p>Revisa el título emitido para completar la entrega al cliente.</p>}{!notice.changeDetail && <p>{notice.body}</p>}</section>
      <section className="priority-notice-history"><header><h3>{timeline.kind === "acts" ? "Historia del expediente" : "Historia del seguimiento"}</h3><span>{timeline.entries.length} {timeline.kind === "acts" ? timeline.entries.length === 1 ? "hito disponible" : "hitos disponibles" : timeline.entries.length === 1 ? "aviso disponible" : "avisos disponibles"}</span></header>
        <p>{timeline.official ? "Fechas de las actuaciones informadas por INAPI. No equivalen por sí solas a su fecha de notificación legal." : timeline.kind === "acts" ? timeline.simulated ? "Antecedentes de demostración disponibles en la plataforma; no constituyen actuaciones oficiales." : "Historia disponible en la plataforma. Confirma la procedencia y las notificaciones en el expediente." : "Avisos de la plataforma relacionados con este seguimiento. No constituyen un historial oficial de INAPI."} {timeline.kind === "acts" && "Los hitos de este aviso se señalan en morado."}</p>
        {timeline.ambiguous && <p className="priority-history-warning">Hay expedientes con el mismo nombre. Para evitar mezclar sus historias, aquí solo se muestran los antecedentes identificados en este aviso.</p>}
        <ol className="priority-timeline">{timeline.entries.map(entry => <li key={entry.key} className={entry.current ? "is-current" : ""}><span className="priority-timeline-dot" aria-hidden /><div><small>{entry.kind === "act" ? "Actuación" : "Aviso"} · {timelineDate(entry.date)}</small><h4>{entry.title}</h4>{entry.current && <span className="priority-timeline-tag">Incluido en este aviso</span>}{entry.previous && <p className="priority-history-warning">Antecedente anterior al cambio. No se presenta como una actuación vigente.</p>}<details><summary>Ver detalle y referencias <span aria-hidden>⌄</span></summary><EvidenceDetails entries={entry.details} /></details></div></li>)}</ol>
      </section>
      {changes.length > 0 && <section className="priority-other-changes"><h3>Otros antecedentes del aviso</h3>{changes.map((change, index) => <details key={`${change.field}-${index}`}><summary>{change.label}<span aria-hidden>⌄</span></summary><EvidenceDetails entries={[{ Antes: change.field === "status" ? statusLabel(String(change.before)) : change.before, Ahora: change.field === "status" ? statusLabel(String(change.after)) : change.after }]} /></details>)}</section>}
      <details className="priority-notice-reference"><summary>Referencia de la notificación <span aria-hidden>⌄</span></summary><EvidenceDetails entries={[{ "ID del aviso": notice.id, "Título original": notice.title, "Fecha de detección": notice.date, ...(notice.matchId ? { "Vigilancia relacionada": notice.matchId } : {}) }]} /></details>
    </div>
    <footer>{notice.matchId && <button type="button" onClick={() => { onClose(); onOpenMatch(notice.matchId!); }}>Ver vigilancia →</button>}<button type="button" className="priority-review-action" disabled={notice.status === "Gestionada"} onClick={() => onManage(notice.id)}>{notice.status === "Gestionada" ? "Revisada" : "Marcar como revisada"}</button></footer>
  </dialog>, document.body);
}
