"use client";

import { useId, useState } from "react";
import { AGENDA_CATEGORIES, type AgendaCategory, type AgendaEvent } from "@/lib/agenda";
import { chileToday, displayWorkDate, workDeadline } from "@/lib/work-priorities";
import type { TaskMember } from "@/lib/case-tasks";

const categories = Object.keys(AGENDA_CATEGORIES) as AgendaCategory[];
const dateAt = (date: string) => new Date(`${date}T12:00:00Z`);
const key = (date: Date) => date.toISOString().slice(0, 10);
const shifted = (date: string, amount: number) => { const result = dateAt(date); result.setUTCDate(result.getUTCDate() + amount); return key(result); };
const monday = (date: string) => shifted(date, -((dateAt(date).getUTCDay() + 6) % 7));

export function LegalAgenda({ events, members = [], onOpen, onAddTask, today = chileToday(), title = "Calendario y tareas" }: {
  events: AgendaEvent[]; members?: TaskMember[]; onOpen: (event: AgendaEvent) => void; onAddTask?: (date?: string) => void; today?: string; title?: string;
}) {
  const id = useId();
  const [cursor, setCursor] = useState(today);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [filters, setFilters] = useState<AgendaCategory[]>(categories);
  const [listCategory, setListCategory] = useState<AgendaCategory>("task");
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const monthStart = `${cursor.slice(0, 7)}-01`;
  const end = dateAt(monthStart); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
  const periodStart = mode === "week" ? monday(cursor) : monthStart;
  const periodEnd = mode === "week" ? shifted(periodStart, 6) : key(end);
  const gridStart = mode === "week" ? periodStart : monday(monthStart);
  const dayCount = mode === "week" ? 7 : Math.ceil((Math.round((dateAt(periodEnd).getTime() - dateAt(gridStart).getTime()) / 86400000) + 1) / 7) * 7;
  const visible = events.filter(event => filters.includes(event.category));
  const dated = visible.filter(event => event.date && event.date >= periodStart && event.date <= periodEnd);
  const list = visible.filter(event => event.category === listCategory && (dayFilter ? event.date === dayFilter : !event.date || event.date >= periodStart && event.date <= periodEnd))
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.title.localeCompare(b.title, "es"));
  const owner = (event: AgendaEvent) => members.find(member => member.id === event.assigneeId)?.name ?? event.owner ?? "Sin responsable";
  const navigate = (amount: number) => { setDayFilter(null); if (mode === "week") setCursor(shifted(cursor, amount * 7)); else { const next = dateAt(monthStart); next.setUTCMonth(next.getUTCMonth() + amount); setCursor(key(next)); } };
  const heading = mode === "month" ? new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(dateAt(cursor)) : `${displayWorkDate(periodStart)} — ${displayWorkDate(periodEnd)}`;
  return <section className={`legal-agenda agenda-${mode}`} aria-label={title}>
    <header className="agenda-header"><div><span className="buho-overline">AGENDA DEL EQUIPO</span><h2>{title}</h2><p>Tareas internas y vencimientos legales en un solo lugar.</p></div>{onAddTask && <button className="buho-primary" type="button" onClick={() => onAddTask(dayFilter ?? undefined)}>Agregar tarea +</button>}</header>
    <div className="agenda-toolbar">
      <div className="agenda-navigation"><button type="button" aria-label={mode === "month" ? "Mes anterior" : "Semana anterior"} onClick={() => navigate(-1)}>←</button><h3 aria-live="polite">{heading}</h3><button type="button" aria-label={mode === "month" ? "Mes siguiente" : "Semana siguiente"} onClick={() => navigate(1)}>→</button></div>
      <div className="agenda-period"><button type="button" onClick={() => { setCursor(today); setDayFilter(null); }}>Hoy</button><button type="button" onClick={() => { setMode("week"); setCursor(shifted(monday(today), 7)); setDayFilter(null); }}>Próxima semana</button><button type="button" aria-pressed={mode === "month"} onClick={() => { setMode("month"); setDayFilter(null); }}>Mes</button><button type="button" aria-pressed={mode === "week"} onClick={() => { setMode("week"); setDayFilter(null); }}>Semana</button></div>
    </div>
    <fieldset className="agenda-filters"><legend>Mostrar en calendario</legend>{categories.map(category => <label className={`agenda-category category-${category}`} key={category}><input type="checkbox" checked={filters.includes(category)} onChange={event => setFilters(current => event.target.checked ? [...current, category] : current.filter(value => value !== category))} /><i aria-hidden />{AGENDA_CATEGORIES[category]}</label>)}<small>El rojo señala plazos fatales o vencimientos próximos.</small></fieldset>
    <div className="agenda-scroll"><div className="agenda-weekdays" aria-hidden>{["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(day => <span key={day}>{day}</span>)}</div>
      <div className="agenda-grid">{Array.from({ length: dayCount }, (_, index) => {
        const date = shifted(gridStart, index), inPeriod = date >= periodStart && date <= periodEnd;
        const entries = visible.filter(event => event.date === date);
        return <section key={date} aria-label={displayWorkDate(date)} className={`agenda-day${inPeriod ? "" : " outside-period"}${date === today ? " is-today" : ""}${date === dayFilter ? " is-selected" : ""}`}>
          <header><button type="button" aria-pressed={date === dayFilter} aria-label={`Ver agenda del ${displayWorkDate(date)}`} onClick={() => { setDayFilter(current => current === date ? null : date); if (!inPeriod) setCursor(date); const first = entries.find(event => event.category === listCategory) ?? entries[0]; if (first) setListCategory(first.category); }}>{Number(date.slice(-2))}<span className="sr-only">{date === today ? " · Hoy" : ""}</span></button>{onAddTask && <button type="button" className="agenda-day-add" aria-label={`Agregar tarea para el ${displayWorkDate(date)}`} onClick={() => onAddTask(date)}>+</button>}</header>
          {entries.map(event => {
            const due = workDeadline(event.date ?? undefined, false, today);
            const urgent = event.fatal || due.tone === "soon" || due.tone === "overdue";
            const text = `${event.title} · ${event.context} · ${owner(event)}${event.fatal ? " · Plazo fatal" : ""}${event.detail ? ` · ${event.detail}` : ""}`;
            return <button className={`agenda-event category-${event.category}${urgent ? " is-urgent" : ""}`} key={event.id} type="button" title={text} onClick={() => onOpen(event)}><strong>{event.title}</strong><span>{event.context}</span><small>{event.fatal ? "Plazo fatal" : owner(event)}{due.tone === "overdue" ? " · Vencido" : event.date === today ? " · Hoy" : ""}</small></button>;
          })}
        </section>;
      })}</div>
    </div>
    <div className="agenda-list-head"><div><h3>{dayFilter ? `Agenda del ${displayWorkDate(dayFilter)}` : mode === "week" ? "Detalle de la semana" : "Detalle del mes"}</h3><p>{dated.length} {dated.length === 1 ? "actividad con fecha" : "actividades con fecha"}{events.some(event => !event.date && event.category === "task") ? " · Las tareas sin fecha también aparecen abajo" : ""}</p></div>{dayFilter && <button type="button" onClick={() => setDayFilter(null)}>Ver período completo</button>}</div>
    <div className="agenda-list-tabs" role="group" aria-label="Contenido de la lista">{categories.map(category => <button id={`${id}-${category}`} key={category} type="button" className={`category-${category}`} aria-pressed={listCategory === category} onClick={() => { setListCategory(category); setFilters(current => current.includes(category) ? current : [...current, category]); }}><i aria-hidden />{AGENDA_CATEGORIES[category]}</button>)}</div>
    <div className="agenda-list" aria-labelledby={`${id}-${listCategory}`}>
      {list.length ? list.map(event => <button type="button" className={`category-${event.category}`} key={event.id} onClick={() => onOpen(event)}><time dateTime={event.date ?? undefined}>{event.date ? displayWorkDate(event.date) : "Sin fecha"}</time><span><strong>{event.title}</strong><small>{event.context}</small></span><span>{owner(event)}</span><b className={event.fatal || event.date && event.date <= today ? "agenda-fatal" : ""}>{event.fatal ? "Plazo fatal" : event.category === "task" ? "Tarea" : "Plazo"} →</b></button>) : <p className="agenda-empty">No hay {AGENDA_CATEGORIES[listCategory].toLowerCase()} para este período.{listCategory === "task" && onAddTask && <button type="button" onClick={() => onAddTask(dayFilter ?? undefined)}>Agregar una tarea</button>}</p>}
    </div>
  </section>;
}
