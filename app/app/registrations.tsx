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
import { deadlineInfo, registrationDeadlines, deadlineLabel, type Attention, type ProcedureDeadline } from "@/lib/registration-procedure";
import { PROCESS_DEMO_DATE, PROCESS_SCENARIOS } from "@/lib/registration-scenarios";
export { deadlineInfo } from "@/lib/registration-procedure";

import { STATUS_BY_ID, STATUS_DEFINITIONS, type RegistrationApplication, type RegistrationPhase, type RegistrationStatusId } from "@/lib/registration-data";
export { STATUS_BY_ID };
export type { RegistrationApplication };

function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}


function formatDate(value?: string | Date) {
  if (!value) return "—";
  const date = typeof value === "string" ? localDate(value) : value;
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric" }).format(date);
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

export type RegistrationSelection = { id?: string; status?: RegistrationStatusId };

export function TrademarkRegistrationCanvas({ initialSelection = {} }: { initialSelection?: RegistrationSelection }) {
  const [importedApplications, , loadState] = useRegistrationApplications();
  const [examples, setExamples] = useState(false);
  const applications = examples ? PROCESS_SCENARIOS : importedApplications;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelection.id ?? null);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"all" | RegistrationPhase>("all");
  const [status, setStatus] = useState<"all" | RegistrationStatusId>(initialSelection.status ?? "all");
  const [attention, setAttention] = useState<"all" | "soon" | "overdue" | "terminal" | "pending" | "none">("all");
  const [demoState, setDemoState] = useState<"canvas" | "loading" | "empty">("canvas");

  const visible = useMemo(() => applications.filter((application) => {
    const definition = STATUS_BY_ID[application.statusId];
    const deadlines = registrationDeadlines(application, examples ? PROCESS_DEMO_DATE : undefined);
    const searchable = `${application.name} ${application.applicationNumber} ${application.holder} ${application.client}`.toLowerCase();
    return searchable.includes(query.trim().toLowerCase())
      && (phase === "all" || definition.phase === phase)
      && (status === "all" || application.statusId === status || application.procedure?.concurrent?.some(item => item.statusId === status))
      && (attention === "all" || deadlines.some(deadline => deadline.attention === attention));
  }), [applications, attention, phase, query, status, examples]);

  const selected = applications.find((application) => application.id === selectedId);

  function resetFilters() {
    setQuery(""); setPhase("all"); setStatus("all"); setAttention("all");
  }

  return <section className="trademark-registration-view">
    <section className="procedure-view-switch" aria-label="Origen de las solicitudes"><div><h2>{examples ? "Ejemplos del procedimiento" : "Solicitudes en seguimiento"}</h2><p>{examples ? `Casos ficticios · fecha de referencia ${formatDate(PROCESS_DEMO_DATE)}. No forman parte de la cartera ni generan avisos.` : "Cada plazo corresponde a una gestión y a la actuación que lo activa."}</p></div><button type="button" onClick={() => { setExamples(value => !value); setSelectedId(null); setDemoState("canvas"); resetFilters(); }}>{examples ? "Volver a mis solicitudes" : "Explorar ejemplos del proceso"}</button></section>
    {examples && <section className="procedure-route" aria-label="Etapas del procedimiento"><span>Presentación y examen de forma</span><span>Requerimiento y publicación</span><span>Oposición y examen de fondo</span><span>Resolución y recursos</span><span>Ejecutoria, pago y registro</span><p>La oposición y la observación de fondo pueden coexistir. La prueba, la apelación y los desenlaces dependen de las actuaciones del expediente.</p></section>}
    <section className="trademark-toolbar" aria-label="Buscar y filtrar solicitudes">
      <label className="trademark-search"><MagnifyingGlass aria-hidden size={18} /><span>Buscar</span><input aria-label="Buscar solicitudes" onChange={(event) => setQuery(event.target.value)} placeholder="Marca, solicitud, titular o cliente" type="search" value={query} /></label>
      <label><span>Fase</span><select aria-label="Filtrar por fase" onChange={(event) => setPhase(event.target.value as "all" | RegistrationPhase)} value={phase}><option value="all">Todas</option><option value="inapi">Ingreso y publicación</option><option value="gazette">Oposición, fondo y resolución</option></select></label>
      <label><span>Estado</span><select aria-label="Filtrar por estado" onChange={(event) => setStatus(event.target.value as "all" | RegistrationStatusId)} value={status}><option value="all">Todos</option>{STATUS_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label><span>Atención</span><select aria-label="Filtrar por atención" onChange={(event) => setAttention(event.target.value as typeof attention)} value={attention}><option value="all">Todas las gestiones</option><option value="soon">Próximo a vencer</option><option value="overdue">Vencido</option><option value="pending">Vencimiento no determinado</option><option value="none">Esperando actuación</option><option value="terminal">Procedimiento terminado</option></select></label>
      {!applications.some(a => a.provider === "inapi") && <label className="trademark-demo-control"><span>Vista demo</span><select aria-label="Cambiar estado de demostración" onChange={(event) => setDemoState(event.target.value as typeof demoState)} value={demoState}><option value="canvas">Canvas</option><option value="loading">Cargando</option><option value="empty">Sin solicitudes</option></select></label>}
      <button className="trademark-clear-filters" onClick={resetFilters} type="button"><Funnel aria-hidden size={16} /> Limpiar</button>
    </section>

    <div className="trademark-legend" aria-label="Niveles de atención">
      <span className="deadline-normal"><ClockCountdown aria-hidden size={16} /> Normal</span>
      <span className="deadline-soon"><Bell aria-hidden size={16} /> Próximo a vencer</span>
      <span className="deadline-overdue"><WarningCircle aria-hidden size={16} /> Vencido · revisar</span>
      <small>Vencimientos de la fuente o calculados desde un antecedente identificado. El transcurso del plazo no modifica el estado del expediente.</small>
    </div>

    {!examples && loadState.error && <p role="alert">{loadState.error}</p>}
    {demoState === "loading" || (!examples && loadState.loading) ? <RegistrationLoading /> : demoState === "empty" ? <RegistrationEmpty onReset={() => setDemoState("canvas")} /> : visible.length === 0 ? <RegistrationEmpty filtered onReset={resetFilters} /> : <section className="trademark-canvas" aria-label="Canvas de inscripción de marcas">
      <PhaseColumn applications={visible.filter((application) => STATUS_BY_ID[application.statusId].phase === "inapi")} onSelect={setSelectedId} phase="inapi" />
      <div className="trademark-phase-transition" aria-hidden><ArrowRight size={22} weight="bold" /></div>
      <PhaseColumn applications={visible.filter((application) => STATUS_BY_ID[application.statusId].phase === "gazette")} onSelect={setSelectedId} phase="gazette" />
    </section>}

    {selected && <RegistrationDrawer application={selected} onClose={() => setSelectedId(null)} />}
  </section>;
}

function PhaseColumn({ applications, onSelect, phase }: { applications: RegistrationApplication[]; onSelect: (id: string) => void; phase: RegistrationPhase }) {
  const isInapi = phase === "inapi";
  return <section className={`trademark-phase phase-${phase}`}>
    <header>
      <div className="trademark-phase-icon">{isInapi ? <Gavel aria-hidden size={22} weight="duotone" /> : <NewspaperClipping aria-hidden size={22} weight="duotone" />}</div>
      <div><span>{isInapi ? "MACROFASE 01" : "MACROFASE 02"}</span><h2>{isInapi ? "Ingreso y publicación" : "Oposición, fondo y resolución"}</h2><p>{isInapi ? "Presentación y examen de forma en INAPI; requerimiento de publicación ante Diario Oficial." : "Desde la publicación: oposición y examen de fondo en INAPI, recursos ante TDPI y eventual registro."}</p></div>
      <b>{applications.length}</b>
    </header>
    {applications.length ? <div className="trademark-card-grid">{applications.map((application) => <RegistrationCard application={application} key={application.id} onSelect={onSelect} />)}</div> : <div className="trademark-phase-empty"><Hourglass aria-hidden size={22} /><span>No hay solicitudes en esta fase con los filtros actuales.</span></div>}
  </section>;
}

function RegistrationCard({ application, onSelect }: { application: RegistrationApplication; onSelect: (id: string) => void }) {
  const status = STATUS_BY_ID[application.statusId];
  const today = application.demoScenario ? PROCESS_DEMO_DATE : undefined;
  const deadline = deadlineInfo(application, today);
  return <article className={`trademark-card attention-${deadline.attention}${status.terminal ? ` terminal-${status.terminal}` : ""}`}>
    <button className="trademark-card-main" onClick={() => onSelect(application.id)} type="button">
      <div className="trademark-card-brand">
        {application.logo ? <img alt={`Logo de ${application.name}`} height="48" src={application.logo} width="48" /> : <span className="trademark-no-logo">{application.type === "Denominativa" ? "Marca denominativa" : "Imagen no informada"}</span>}
        <div><small>{application.id}</small><h3>{application.name}</h3></div>
      </div>
      <strong className="trademark-card-status">{status.label}</strong>
      {application.demoScenario && <p className="procedure-scenario">Ejemplo simulado · {application.demoScenario}</p>}
      {status.phase === "gazette" && application.publishedAt && <span className="trademark-published"><CalendarBlank aria-hidden size={15} /> Publicada el {formatDate(application.publishedAt)}</span>}
      {registrationDeadlines(application, today).map(item => <ProcedureDeadlinePanel key={item.key} deadline={item} today={today} />)}
      <footer><span>Solicitud N.º {application.applicationNumber}</span><b>Abrir detalle <ArrowRight aria-hidden size={14} /></b></footer>
    </button>
    <p className="procedure-source">{application.demoScenario ? "Escenario ficticio" : application.provider === "inapi" ? "Etapa según actuaciones de INAPI" : "Datos simulados de seguimiento"}</p>
  </article>;
}

function ProcedureDeadlinePanel({ deadline: d, today, detailed = false }: { deadline: ProcedureDeadline; today?: string; detailed?: boolean }) {
  const origin = d.origin === "source" ? "Informado por la fuente" : d.origin === "calculated" ? "Calculado desde el antecedente indicado · calendario LPI 2026" : d.origin === "simulated" ? "Plazo simulado · referencia 7 sep. 2026" : "";
  return <div className={`trademark-deadline deadline-${d.attention}`}><AttentionIcon attention={d.attention} /><div><span>{d.label}</span><strong>{deadlineLabel(d, today)}</strong>{d.dueDate && <small>Vence el {formatDate(d.dueDate)} · {origin}</small>}{(d.attention === "pending" || d.attention === "none" || detailed) && <small>{d.explanation}</small>}{detailed && d.days && <small>Regla: {d.days} días hábiles · {d.trigger}{d.sourceDate ? `: ${formatDate(d.sourceDate)}` : ": fecha no informada"}</small>}</div></div>;
}

function RegistrationDrawer({ application, onClose }: { application: RegistrationApplication; onClose: () => void }) {
  const status = STATUS_BY_ID[application.statusId];
  const today = application.demoScenario ? PROCESS_DEMO_DATE : undefined;
  return <div className="trademark-drawer-overlay" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }} role="presentation">
    <aside aria-label={`Detalle de ${application.name}`} aria-modal="true" className="trademark-drawer" role="dialog">
      <header><div><span>Solicitud N.º {application.applicationNumber}</span><h2>{application.name}</h2></div><button aria-label="Cerrar detalle" onClick={onClose} type="button"><X size={22} /></button></header>
      <div className="trademark-drawer-scroll">
        <section className="trademark-detail-status">
          <span>ESTADO ACTUAL</span>
          <strong>{status.label}</strong>
          {application.demoScenario && <p className="procedure-scenario">Ejemplo simulado · {application.demoScenario}</p>}
          {registrationDeadlines(application, today).map(item => <ProcedureDeadlinePanel key={item.key} deadline={item} today={today} detailed />)}
          {application.procedure?.sourceActDate && <p className="procedure-source">Actuación de referencia: {formatDate(application.procedure.sourceActDate)} · {application.procedure.sourceActDescription}</p>}
        </section>

        <section className="trademark-detail-identity">
          {application.logo ? <img alt={`Logo de ${application.name}`} height="104" src={application.logo} width="104" /> : <span className="trademark-no-logo is-large">{application.type === "Denominativa" ? "Marca denominativa" : "Imagen no informada"}</span>}
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
          <div><dt>Publicación efectiva</dt><dd>{application.publishedAt ? formatDate(application.publishedAt) : "No informada en los antecedentes"}</dd></div>
          {(application.registrationNumber || application.registrationDate) && <div><dt>Vencimiento del registro</dt><dd>{application.expirationDate ? formatDate(application.expirationDate) : "No informado"}</dd></div>}
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
