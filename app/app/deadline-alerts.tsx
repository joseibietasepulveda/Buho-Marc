"use client";
import { useState } from "react";
import { urgentAgenda, type AgendaEvent } from "@/lib/agenda";
import { displayWorkDate, chileToday } from "@/lib/work-priorities";
import { ReviewDialog } from "./review-dialog";

export function DeadlineAlerts({ events, onOpen, loading, error }: { events: AgendaEvent[]; onOpen: (event: AgendaEvent) => void; loading?: boolean; error?: string }) {
  const [open, setOpen] = useState(false);
  const urgent = urgentAgenda(events);
  const overdue = urgent.filter(event => event.date! < chileToday()).length;
  return <div className="global-deadlines"><button type="button" className={urgent.length ? "has-deadlines" : ""} onClick={() => setOpen(true)}><span aria-hidden>◷</span><strong>{loading ? "Consultando plazos…" : error ? "Revisar actualización de plazos" : urgent.length ? `${urgent.length} tareas y plazos requieren atención` : "Sin vencimientos próximos"}</strong><span>{overdue ? `${overdue} vencidos · ` : ""}Ver agenda →</span></button>
    {open && <ReviewDialog title="Plazos y tareas que requieren atención" onClose={() => setOpen(false)} className="deadline-alert-dialog"><div className="deadline-alert-body"><p>Vencidos, de hoy y de los próximos 14 días. Las tareas completadas y los casos concluidos quedan fuera de esta vista.</p>{error && <p role="alert">{error}</p>}{urgent.length ? urgent.map(event => <button type="button" key={event.id} onClick={() => { setOpen(false); onOpen(event); }}><time dateTime={event.date!}>{displayWorkDate(event.date!)}</time><span><strong>{event.title}</strong><small>{event.context}</small></span><b>{event.date! < chileToday() ? "Vencido · revisar" : event.date === chileToday() ? "Vence hoy" : "Próximo"}</b></button>) : <p>{loading ? "Consultando los expedientes…" : "No hay vencimientos próximos con fecha disponible."}</p>}<small>Los plazos sin fecha confirmada siguen identificados en cada expediente.</small></div></ReviewDialog>}
  </div>;
}
