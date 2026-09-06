"use client";

import {
  ArrowRight,
  ArrowSquareOut,
  Bell,
  CalendarBlank,
  CheckCircle,
  ClockCountdown,
  Funnel,
  Gavel,
  Hourglass,
  MagnifyingGlass,
  NewspaperClipping,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { ClientNameLink } from "./client-provider";
import { activityContent, activityDate, latestActivityFirst } from "@/lib/registration-activity";

import { STATUS_BY_ID, STATUS_DEFINITIONS, type RegistrationApplication, type RegistrationPhase, type RegistrationStatusId } from "@/lib/registration-data";
export { STATUS_BY_ID };
export type { RegistrationApplication };
type Attention = "normal" | "soon" | "overdue" | "terminal" | "none" | "pending";

const CHILEAN_HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01", "2026-05-21", "2026-06-21", "2026-06-29", "2026-07-16", "2026-08-15", "2026-09-18", "2026-09-19", "2026-10-12", "2026-10-31", "2026-11-01", "2026-12-08", "2026-12-25",
]);

function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6 && !CHILEAN_HOLIDAYS_2026.has(isoDate(date));
}

function addBusinessDays(source: string, amount: number) {
  const date = localDate(source);
  let added = 0;
  while (added < amount) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date)) added += 1;
  }
  return date;
}

function businessDaysRemaining(deadline: Date, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const end = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 12);
  if (start.getTime() === end.getTime()) return 0;
  const direction = start < end ? 1 : -1;
  const cursor = new Date(start);
  let count = 0;
  while ((direction === 1 && cursor < end) || (direction === -1 && cursor > end)) {
    cursor.setDate(cursor.getDate() + direction);
    if (isBusinessDay(cursor)) count += direction;
  }
  return count;
}

function formatDate(value?: string | Date) {
  if (!value) return "—";
  const date = typeof value === "string" ? localDate(value) : value;
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function deadlineInfo(application: RegistrationApplication) {
  const status = STATUS_BY_ID[application.statusId];
  if (status.terminal) return { attention: "terminal" as Attention };
  if (application.provider === "inapi") {
    if (!application.officialDeadline) return { attention: status.deadlineDays ? "pending" as Attention : "none" as Attention };
    const deadline = localDate(application.officialDeadline), remaining = businessDaysRemaining(deadline);
    return { deadline, remaining, attention: remaining < 0 ? "overdue" as Attention : remaining <= 5 ? "soon" as Attention : "normal" as Attention };
  }
  if (!status.deadlineDays) return { attention: "none" as Attention };
  if (!application.deadlineSource) return { attention: "pending" as Attention };
  const deadline = addBusinessDays(application.deadlineSource, status.deadlineDays);
  const remaining = businessDaysRemaining(deadline);
  return { deadline, remaining, attention: remaining < 0 ? "overdue" as Attention : remaining <= 5 ? "soon" as Attention : "normal" as Attention };
}

function attentionCopy(attention: Attention, remaining?: number) {
  if (attention === "overdue") return `Vencido hace ${Math.abs(remaining ?? 0)} días hábiles`;
  if (attention === "soon") return remaining === 0 ? "Vence hoy" : `Quedan ${remaining} días hábiles`;
  if (attention === "normal") return `Quedan ${remaining} días hábiles`;
  if (attention === "pending") return "Fecha de vencimiento pendiente de confirmar";
  return "Sin plazo legal fijo";
}

function AttentionIcon({ attention }: { attention: Attention }) {
  if (attention === "overdue") return <WarningCircle aria-hidden size={18} weight="fill" />;
  if (attention === "soon") return <Bell aria-hidden size={18} weight="fill" />;
  if (attention === "normal") return <ClockCountdown aria-hidden size={18} weight="bold" />;
  if (attention === "terminal") return <CheckCircle aria-hidden size={18} weight="fill" />;
  return <Hourglass aria-hidden size={18} weight="bold" />;
}

export function useRegistrationApplications() {
  const [applications, setApplications] = useState<RegistrationApplication[]>([]);
  const [loadState, setLoadState] = useState({ loading: true, error: "" });
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const r = await fetch("/api/registrations", { cache: "no-store" });
        if (!r.ok) throw new Error("No se pudieron actualizar las solicitudes.");
        const p = await r.json();
        if (!Array.isArray(p.applications)) throw new Error("Respuesta de solicitudes incompleta.");
        if (active) { setApplications(p.applications); setLoadState({ loading: false, error: "" }); }
      } catch {
        if (active) setLoadState({ loading: false, error: "No se pudieron actualizar las solicitudes. Se conservan los últimos datos disponibles; reintentaremos automáticamente." });
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    window.addEventListener("buho-source-reviewed", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("buho-source-reviewed", refresh); };
  }, []);
  return [applications, setApplications, loadState] as const;
}

export function TrademarkRegistrationCanvas() {
  const [applications, setApplications] = useRegistrationApplications();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"all" | RegistrationPhase>("all");
  const [status, setStatus] = useState<"all" | RegistrationStatusId>("all");
  const [attention, setAttention] = useState<"all" | "soon" | "overdue" | "terminal">("all");
  const [demoState, setDemoState] = useState<"canvas" | "loading" | "empty">("canvas");

  const visible = useMemo(() => applications.filter((application) => {
    const definition = STATUS_BY_ID[application.statusId];
    const deadline = deadlineInfo(application);
    const searchable = `${application.name} ${application.applicationNumber} ${application.holder} ${application.client}`.toLowerCase();
    return searchable.includes(query.trim().toLowerCase())
      && (phase === "all" || definition.phase === phase)
      && (status === "all" || application.statusId === status)
      && (attention === "all" || deadline.attention === attention || (attention === "terminal" && Boolean(definition.terminal)));
  }), [applications, attention, phase, query, status]);

  const selected = applications.find((application) => application.id === selectedId);

  function changeStatus(application: RegistrationApplication, nextStatus: RegistrationStatusId) {
    if (application.statusId === nextStatus) return;
    const nextDefinition = STATUS_BY_ID[nextStatus];
    const today = isoDate(new Date());
    setApplications((current) => current.map((item) => item.id === application.id ? {
      ...item,
      statusId: nextStatus,
      deadlineSource: nextDefinition.deadlineDays ? today : undefined,
      publishedAt: nextDefinition.phase === "gazette" ? item.publishedAt ?? today : item.publishedAt,
      recentEvent: `Cambio de estado a ${nextDefinition.label}`,
      history: [...item.history, { date: today, status: nextDefinition.label }],
    } : item));
  }

  function resetFilters() {
    setQuery(""); setPhase("all"); setStatus("all"); setAttention("all");
  }

  return <section className="trademark-registration-view">
    <section className="trademark-toolbar" aria-label="Buscar y filtrar solicitudes">
      <label className="trademark-search"><MagnifyingGlass aria-hidden size={18} /><span>Buscar</span><input aria-label="Buscar solicitudes" onChange={(event) => setQuery(event.target.value)} placeholder="Marca, solicitud, titular o cliente" type="search" value={query} /></label>
      <label><span>Fase</span><select aria-label="Filtrar por fase" onChange={(event) => setPhase(event.target.value as "all" | RegistrationPhase)} value={phase}><option value="all">Todas</option><option value="inapi">INAPI</option><option value="gazette">Diario Oficial</option></select></label>
      <label><span>Estado</span><select aria-label="Filtrar por estado" onChange={(event) => setStatus(event.target.value as "all" | RegistrationStatusId)} value={status}><option value="all">Todos</option>{STATUS_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label><span>Atención</span><select aria-label="Filtrar por atención" onChange={(event) => setAttention(event.target.value as typeof attention)} value={attention}><option value="all">Todos los plazos</option><option value="soon">Próximo a vencer</option><option value="overdue">Vencido</option><option value="terminal">Terminal</option></select></label>
      {!applications.some(a => a.provider === "inapi") && <label className="trademark-demo-control"><span>Vista demo</span><select aria-label="Cambiar estado de demostración" onChange={(event) => setDemoState(event.target.value as typeof demoState)} value={demoState}><option value="canvas">Canvas</option><option value="loading">Cargando</option><option value="empty">Sin solicitudes</option></select></label>}
      <button className="trademark-clear-filters" onClick={resetFilters} type="button"><Funnel aria-hidden size={16} /> Limpiar</button>
    </section>

    <div className="trademark-legend" aria-label="Niveles de atención">
      <span className="deadline-normal"><ClockCountdown aria-hidden size={16} /> Normal</span>
      <span className="deadline-soon"><Bell aria-hidden size={16} /> Próximo a vencer</span>
      <span className="deadline-overdue"><WarningCircle aria-hidden size={16} /> Vencido · revisar</span>
      <small>Plazos internos de seguimiento; confirma siempre el expediente oficial.</small>
    </div>

    {demoState === "loading" ? <RegistrationLoading /> : demoState === "empty" ? <RegistrationEmpty onReset={() => setDemoState("canvas")} /> : visible.length === 0 ? <RegistrationEmpty filtered onReset={resetFilters} /> : <section className="trademark-canvas" aria-label="Canvas de inscripción de marcas">
      <PhaseColumn applications={visible.filter((application) => STATUS_BY_ID[application.statusId].phase === "inapi")} onChangeStatus={changeStatus} onSelect={setSelectedId} phase="inapi" />
      <div className="trademark-phase-transition" aria-hidden><ArrowRight size={22} weight="bold" /></div>
      <PhaseColumn applications={visible.filter((application) => STATUS_BY_ID[application.statusId].phase === "gazette")} onChangeStatus={changeStatus} onSelect={setSelectedId} phase="gazette" />
    </section>}

    {selected && <RegistrationDrawer application={selected} onChangeStatus={(next) => changeStatus(selected, next)} onClose={() => setSelectedId(null)} />}
  </section>;
}

function PhaseColumn({ applications, onChangeStatus, onSelect, phase }: { applications: RegistrationApplication[]; onChangeStatus: (application: RegistrationApplication, status: RegistrationStatusId) => void; onSelect: (id: string) => void; phase: RegistrationPhase }) {
  const isInapi = phase === "inapi";
  return <section className={`trademark-phase phase-${phase}`}>
    <header>
      <div className="trademark-phase-icon">{isInapi ? <Gavel aria-hidden size={22} weight="duotone" /> : <NewspaperClipping aria-hidden size={22} weight="duotone" />}</div>
      <div><span>{isInapi ? "MACROFASE 01" : "MACROFASE 02"}</span><h2>{isInapi ? "INAPI" : "Diario Oficial · desde la publicación"}</h2><p>{isInapi ? "Ingreso, examen inicial y aceptación para publicar." : "Comienza con la publicación y continúa con oposición, examen de fondo y resolución de INAPI."}</p></div>
      <b>{applications.length}</b>
    </header>
    {applications.length ? <div className="trademark-card-grid">{applications.map((application) => <RegistrationCard application={application} key={application.id} onChangeStatus={onChangeStatus} onSelect={onSelect} />)}</div> : <div className="trademark-phase-empty"><Hourglass aria-hidden size={22} /><span>No hay solicitudes en esta fase con los filtros actuales.</span></div>}
  </section>;
}

function RegistrationCard({ application, onChangeStatus, onSelect }: { application: RegistrationApplication; onChangeStatus: (application: RegistrationApplication, status: RegistrationStatusId) => void; onSelect: (id: string) => void }) {
  const status = STATUS_BY_ID[application.statusId];
  const deadline = deadlineInfo(application);
  return <article className={`trademark-card attention-${deadline.attention}${status.terminal ? ` terminal-${status.terminal}` : ""}`}>
    <button className="trademark-card-main" onClick={() => onSelect(application.id)} type="button">
      <div className="trademark-card-brand">
        {application.logo ? <img alt={`Logo de ${application.name}`} height="48" src={application.logo} width="48" /> : <span className="trademark-no-logo" aria-label="Logo no disponible">Logo<br />pendiente</span>}
        <div><small>{application.id}</small><h3>{application.name}</h3></div>
      </div>
      <strong className="trademark-card-status">{status.label}</strong>
      {status.phase === "gazette" && application.publishedAt && <span className="trademark-published"><CalendarBlank aria-hidden size={15} /> Publicada el {formatDate(application.publishedAt)}</span>}
      {status.deadlineDays ? <div className={`trademark-deadline deadline-${deadline.attention}`}>
        <AttentionIcon attention={deadline.attention} />
        <div><span>{status.deadlineLabel}</span><strong>{attentionCopy(deadline.attention, deadline.remaining)}</strong>{deadline.deadline && <small>Vence el {formatDate(deadline.deadline)}</small>}</div>
      </div> : <div className={`trademark-deadline deadline-${status.terminal ? "terminal" : "none"}`}><AttentionIcon attention={status.terminal ? "terminal" : "none"} /><div><strong>{status.terminal ? status.terminal === "positive" ? "Procedimiento finalizado positivamente" : "Estado terminal" : "Sin cuenta regresiva"}</strong>{status.helper && <small>{status.helper}</small>}</div></div>}
      <footer><span>Solicitud N.º {application.applicationNumber}</span><b>Abrir detalle <ArrowRight aria-hidden size={14} /></b></footer>
    </button>
    <label className="trademark-status-select"><span>Estado de la fuente</span><select disabled title="Se actualiza desde Administrador de fuente" aria-label={`Cambiar estado de ${application.name}`} onChange={(event) => onChangeStatus(application, event.target.value as RegistrationStatusId)} value={application.statusId}>{STATUS_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
  </article>;
}

function RegistrationDrawer({ application, onChangeStatus, onClose }: { application: RegistrationApplication; onChangeStatus: (status: RegistrationStatusId) => void; onClose: () => void }) {
  const status = STATUS_BY_ID[application.statusId];
  const deadline = deadlineInfo(application);
  return <div className="trademark-drawer-overlay" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }} role="presentation">
    <aside aria-label={`Detalle de ${application.name}`} aria-modal="true" className="trademark-drawer" role="dialog">
      <header><div><span>Solicitud N.º {application.applicationNumber}</span><h2>{application.name}</h2></div><button aria-label="Cerrar detalle" onClick={onClose} type="button"><X size={22} /></button></header>
      <div className="trademark-drawer-scroll">
        <section className="trademark-detail-status">
          <span>ESTADO ACTUAL</span>
          <strong>{status.label}</strong>
          <label><span>Estado de la fuente</span><select disabled title="Se actualiza desde Administrador de fuente" aria-label="Cambiar estado de la solicitud" onChange={(event) => onChangeStatus(event.target.value as RegistrationStatusId)} value={application.statusId}>{STATUS_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          {status.deadlineDays ? <div className={`trademark-deadline deadline-${deadline.attention}`}><AttentionIcon attention={deadline.attention} /><div><span>{status.deadlineLabel}</span><strong>{attentionCopy(deadline.attention, deadline.remaining)}</strong>{deadline.deadline ? <small>Vence el {formatDate(deadline.deadline)} · {status.deadlineDays} días hábiles</small> : <small>No se mostrará una estimación hasta confirmar la fecha fuente.</small>}</div></div> : <p className="trademark-fixed-note"><Hourglass aria-hidden size={17} /> {status.helper ?? (status.terminal ? "Este estado cierra el procedimiento en el seguimiento." : "Esta etapa no tiene un plazo público fijo para que INAPI resuelva.")}</p>}
        </section>

        <section className="trademark-detail-identity">
          {application.logo ? <img alt={`Logo de ${application.name}`} height="104" src={application.logo} width="104" /> : <span className="trademark-no-logo is-large">Logo no disponible</span>}
          <div><span>MARCA</span><h3>{application.name}</h3><p>{application.type} · Clases {application.niceClasses}</p></div>
        </section>

        <dl className="trademark-detail-grid">
          <div><dt>Número de solicitud</dt><dd>{application.applicationNumber}</dd></div>
          {application.provider === "inapi" && <div><dt>Estado general informado por la API</dt><dd>{application.sourceStatus}. La etapa de seguimiento considera las resoluciones del historial.</dd></div>}
          <div><dt>Tipo de marca</dt><dd>{application.type}</dd></div>
          <div><dt>Fecha de ingreso</dt><dd>{formatDate(application.filedAt)}</dd></div>
          <div><dt>Acontecimiento más reciente</dt><dd>{application.recentEvent}</dd></div>
          <div><dt>Clases o categorías Niza</dt><dd>{application.niceClasses}</dd></div>
          <div><dt>RUT del titular</dt><dd>{application.holderRut}</dd></div>
          <div><dt>Titular</dt><dd>{application.holder}</dd></div>
          <div><dt>Estudio cliente</dt><dd><ClientNameLink name={application.client} /></dd></div>
          <div><dt>Fecha de publicación</dt><dd>{application.publishedAt ? formatDate(application.publishedAt) : "Aún no publicada"}</dd></div>
          <div><dt>Fecha de vencimiento</dt><dd>{application.expirationDate ? formatDate(application.expirationDate) : "No informada"}</dd></div>
          <div><dt>País del titular</dt><dd>{application.ownerCountry ?? "No informado"}</dd></div>
          <div><dt>Representante</dt><dd>{application.representativeName ?? "No informado"}</dd></div>
          <div><dt>País del representante</dt><dd>{application.representativeCountry ?? "No informado"}</dd></div>
          <div><dt>Número de registro</dt><dd>{application.registrationNumber ?? "Aún no asignado"}</dd></div>
          {application.registrationDate && <div><dt>Fecha de concesión</dt><dd>{formatDate(application.registrationDate)}</dd></div>}
          <div><dt>Expediente</dt><dd>{application.fileUrl ? <a href={application.fileUrl} rel="noreferrer" target="_blank">Ver referencia en INAPI <ArrowSquareOut aria-hidden size={15} /></a> : "Referencia no disponible"}</dd></div>
        </dl>

        <section className="trademark-history">
          <header><span>HISTORIAL DE ACTIVIDAD</span><h3>Actividad del expediente</h3><p>Más reciente primero · {application.history.length} movimientos</p></header>
          {application.history.length ? <ol>{latestActivityFirst(application.history).map((event, index) => {
            const activity = activityContent(event);
            const date = activityDate(event.date);
            return <li key={`${event.date}-${index}`}>
              <i aria-hidden />
              <div>
                {date ? <time dateTime={date}>{formatDate(date)}</time> : <span className="trademark-activity-date">Fecha no informada</span>}
                <strong>{activity.title}</strong>
                {activity.detail && <details><summary>Ver detalle<span className="sr-only">: {activity.title}</span></summary><p>{activity.detail}</p></details>}
              </div>
            </li>;
          })}</ol> : <p className="trademark-activity-empty">No hay movimientos disponibles para esta solicitud.</p>}

        </section>
      </div>
      <footer><small>{application.provider === "inapi" ? "Actividad recibida de INAPI. Consulta el expediente para ver los antecedentes oficiales." : "Historial de demostración · datos simulados."}</small><button onClick={onClose} type="button">Cerrar</button></footer>
    </aside>
  </div>;
}

function RegistrationLoading() {
  return <section aria-label="Cargando solicitudes" aria-live="polite" className="trademark-loading"><span className="sr-only">Cargando solicitudes</span>{Array.from({ length: 6 }, (_, index) => <article key={index}><i /><b /><b /><span /></article>)}</section>;
}

function RegistrationEmpty({ filtered = false, onReset }: { filtered?: boolean; onReset: () => void }) {
  return <section className="trademark-empty"><NewspaperClipping aria-hidden size={34} weight="duotone" /><h2>{filtered ? "No encontramos solicitudes" : "Aún no hay solicitudes inscritas"}</h2><p>{filtered ? "Prueba otra marca o limpia los filtros para volver a ver el Canvas." : "Cuando ingreses una solicitud, aparecerá automáticamente en la fase y estado correspondiente."}</p><button onClick={onReset} type="button">{filtered ? "Limpiar filtros" : "Volver al Canvas"}</button></section>;
}
