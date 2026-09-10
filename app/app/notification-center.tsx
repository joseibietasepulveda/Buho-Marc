"use client";
import { noticePresentation } from "@/lib/work-priorities";
import { useState } from "react";
import { isPriorityNotice, isTitleIssued } from "@/lib/notification-policy";
import { displayValue, statusLabel, type FieldChange } from "@/lib/source-contract";

type Notice = { deadline?: string; id: string; title: string; brand: string; urgency: string; status: string; date: string; body: string; matchId?: string; kind?: string; changeDetail?: { changes: FieldChange[]; source?: string; summary: string } };
export function NotificationCenter({ notices, onManage, onOpenMatch }: { notices: Notice[]; onManage: (id: string) => void; onOpenMatch: (id: string) => void }) {
  const [tab, setTab] = useState<"priority" | "all">("priority");
  const priorities = notices.filter(isPriorityNotice);
  const visible = tab === "priority" ? priorities : notices;
  return <section className="notification-center">
    <div className="notice-tabs" role="group" aria-label="Bandejas de notificaciones"><button type="button" aria-pressed={tab === "priority"} onClick={() => setTab("priority")}>Prioritarias <span>{priorities.length}</span></button><button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")}>Todas <span>{notices.length}</span></button></div>
    <p className="notice-intro">{tab === "priority" ? "Presentación, resoluciones, pagos, publicaciones, vencimientos y título de marca. Lo que necesitas para avanzar cada gestión." : "Historial completo de notificaciones, incluidos cambios de titular, representante y otros antecedentes."}</p>
    <div className="notice-accordion">{visible.map(notice => { const display = noticePresentation(notice, notice.deadline); return <details key={notice.id} className={notice.status === "Pendiente" ? "is-unread" : ""}>
      <summary><i className="notice-unread-dot" aria-hidden /><span><small>{notice.date} · {notice.brand}</small><strong>{display.title}</strong>{display.kind === "deadline" && <small>{display.label}</small>}<small>{notice.status === "Pendiente" ? "Pendiente de revisión" : "Gestionada"}</small></span><b>{isTitleIssued(notice.title) ? "Título disponible" : notice.changeDetail?.changes.some(change => change.field === "publicationDate") || /Diario Oficial/i.test(notice.title) ? "Diario Oficial" : notice.changeDetail ? "INAPI" : "Seguimiento"}</b><span className="notice-chevron" aria-hidden>⌄</span></summary>
      <div className="notice-details">{isTitleIssued(notice.title) && <p className="notice-title-issued">El título de marca figura emitido. Revisa el documento para completar la entrega al cliente.</p>}
        {notice.changeDetail ? <><p>{notice.changeDetail.summary.split("\n\nAntecedentes detectados:")[0]}</p><div className="notice-change-list">{notice.changeDetail.changes.map((change, index) => <details key={`${change.field}-${index}`}><summary>{change.label}<span aria-hidden>⌄</span></summary><dl><div><dt>Antes</dt><dd>{change.field === "status" ? statusLabel(String(change.before)) : displayValue(change.before)}</dd></div><div><dt>Ahora</dt><dd>{change.field === "status" ? statusLabel(String(change.after)) : displayValue(change.after)}</dd></div></dl></details>)}</div></> : <><p className="notice-body">{notice.body}</p>{display.kind === "deadline" && <p>El texto original corresponde a la fecha del aviso. Confirma el vencimiento en el expediente; las referencias como “en 5 días” no son una cuenta regresiva actualizada.</p>}</>}
        <footer>{notice.matchId && <button type="button" onClick={() => onOpenMatch(notice.matchId!)}>Ver vigilancia →</button>}<button type="button" disabled={notice.status === "Gestionada"} onClick={() => onManage(notice.id)}>{notice.status === "Gestionada" ? "Revisada" : "Marcar como revisada"}</button></footer>
      </div>
    </details>; })}</div>
    {!visible.length && <div className="notice-empty"><h3>{tab === "priority" ? "No hay novedades prioritarias" : "Todavía no hay notificaciones"}</h3><p>Los nuevos hitos aparecerán aquí cuando se detecten en tus expedientes.</p>{tab === "priority" && notices.length > 0 && <button type="button" onClick={() => setTab("all")}>Ver todas las notificaciones</button>}</div>}
  </section>;
}
