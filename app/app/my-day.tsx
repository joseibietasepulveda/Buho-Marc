"use client";

import { useState } from "react";
import { displayWorkDate, workDeadline } from "@/lib/work-priorities";
import { deadlineInfo, useRegistrationApplications } from "./registrations";

type CaseItem = { id: string; title: string; owner: string; stage: string; deadline: string; brand: string; priority: string };
type MatchItem = { id: string; brand: string; found: string; status: string };
type NoticeItem = { id: string; title: string; brand: string; status: string; matchId?: string };
type WorkItem = { id: string; title: string; context: string; label: string; tone: string; rank: number; date?: string | null; open: () => void };

export function MyDay({ cases, matches, notices, onCase, onMatch, onNotice, onRegistrations }: { cases: CaseItem[]; matches: MatchItem[]; notices: NoticeItem[]; onCase: (id: string) => void; onMatch: (id: string) => void; onNotice: (id: string) => void; onRegistrations: () => void }) {
  const [applications, , loadState] = useRegistrationApplications();
  const [owner, setOwner] = useState("");
  const [showAll, setShowAll] = useState(false);
  const owners = [...new Set(cases.map(item => item.owner).filter(Boolean))].sort();
  const active = cases.filter(item => item.stage !== "Concluido" && (!owner || item.owner === owner));
  const items: WorkItem[] = active.flatMap(item => {
    const due = workDeadline(item.deadline);
    return due.rank > 2 ? [] : [{ id: `case-${item.id}`, title: item.title, context: `${item.owner || "Sin responsable"} · Prioridad ${item.priority.toLowerCase()}`, label: due.label, tone: due.tone, rank: due.rank, date: due.date, open: () => onCase(item.id) }];
  });
  // Unassigned reviews remain visible only in the team view; no ownership is inferred.
  if (!owner) {
    for (const [attention, label, rank] of [["overdue", "Solicitudes con plazo vencido", 0], ["soon", "Solicitudes próximas a vencer", 1], ["pending", "Solicitudes con fecha por confirmar", 2]] as const) {
      const count = applications.filter(item => deadlineInfo(item).attention === attention).length;
      if (count) items.push({ id: `registrations-${attention}`, title: `${count} ${label.toLowerCase()}`, context: "Inscripciones · Abrir solicitudes", label: attention === "pending" ? "Fecha por confirmar" : attention === "overdue" ? "Plazo vencido" : "Próximo a vencer", tone: attention === "pending" ? "unknown" : attention, rank, open: onRegistrations });
    }
    const pending = matches.filter(item => item.status === "Pendiente de clasificación");
    items.push(...pending.map(item => ({ id: `match-${item.id}`, title: `${item.brand} / ${item.found}`, context: "Vigilancia · Pendiente de clasificación", label: "Revisar coincidencia", tone: "review", rank: 3, open: () => onMatch(item.id) })));
    items.push(...notices.filter(item => item.status === "Pendiente" && !pending.some(match => match.id === item.matchId)).map(item => ({ id: `notice-${item.id}`, title: item.brand, context: "Notificación pendiente de revisión", label: "Revisar novedad", tone: "review", rank: 3, open: () => onNotice(item.id) })));
  }
  items.sort((a, b) => a.rank - b.rank || (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id));
  const visible = showAll ? items : items.slice(0, 6);
  return <section className="buho-my-day" aria-labelledby="my-day-heading">
    <header><div><span className="buho-overline">TRABAJO POR ATENDER</span><h2 id="my-day-heading">Mi día</h2><p>Plazos y revisiones pendientes. Abre el asunto para continuar.</p></div><label>Responsable de casos<select value={owner} onChange={event => { setOwner(event.target.value); setShowAll(false); }}><option value="">Todo el equipo</option>{owners.map(name => <option key={name}>{name}</option>)}</select></label></header>
    {owner && <p className="buho-work-note">Mostrando casos de {owner}. Las vigilancias y notificaciones sin responsable están en «Todo el equipo».</p>}
    {!owner && (loadState.loading || loadState.error) && <p className="buho-work-note" role="status">{loadState.loading ? "Cargando los plazos de inscripciones…" : loadState.error}</p>}
    {visible.length ? <ol>{visible.map(item => <li key={item.id}><button onClick={item.open} type="button"><span className={`work-status work-${item.tone}`}>{item.label}</span><span className="my-day-identity"><strong>{item.title}</strong><small>{item.context}</small></span><span className="my-day-date">{item.date ? displayWorkDate(item.date) : "Abrir asunto"} <span aria-hidden>↗</span></span></button></li>)}</ol> : <p className="buho-work-note">No hay plazos vencidos, próximos o sin fecha ni revisiones pendientes en esta vista.</p>}
    {items.length > 6 && <button className="my-day-more" type="button" onClick={() => setShowAll(value => !value)}>{showAll ? "Mostrar menos" : "Ver toda la bandeja"}</button>}
  </section>;
}
