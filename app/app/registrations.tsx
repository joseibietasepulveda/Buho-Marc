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

type RegistrationPhase = "inapi" | "gazette";
type Attention = "normal" | "soon" | "overdue" | "terminal" | "none" | "pending";
type RegistrationStatusId =
  | "inapi-waiting"
  | "form-observation"
  | "accepted-publication"
  | "abandoned-inapi"
  | "opposition-window"
  | "opposition-answer"
  | "opposition-answered"
  | "evidence-period"
  | "substantive-exam"
  | "substantive-objection"
  | "accepted-payment"
  | "partial-payment"
  | "registered"
  | "rejected-appeal"
  | "partial-appeal"
  | "rejected-final"
  | "abandoned-gazette";

type StatusDefinition = {
  id: RegistrationStatusId;
  label: string;
  phase: RegistrationPhase;
  deadlineDays?: number;
  deadlineLabel?: string;
  helper?: string;
  terminal?: "positive" | "negative" | "neutral";
};

type HistoryEvent = { date: string; status?: string; detail?: string; intake?: boolean };

export type RegistrationApplication = {
  id: string;
  name: string;
  logo?: string;
  applicationNumber: string;
  registrationNumber?: string;
  registrationDate?: string;
  type: string;
  filedAt: string;
  statusId: RegistrationStatusId;
  deadlineSource?: string;
  publishedAt?: string;
  recentEvent: string;
  niceClasses: string;
  holderRut: string;
  holder: string;
  client: string;
  fileUrl?: string;
  history: HistoryEvent[];
};

const STATUS_DEFINITIONS: StatusDefinition[] = [
  { id: "inapi-waiting", label: "Esperando examen INAPI", phase: "inapi" },
  { id: "form-observation", label: "Observación de forma", phase: "inapi", deadlineDays: 30, deadlineLabel: "Responder observación de forma" },
  { id: "accepted-publication", label: "Aceptado a trámite — esperando pago y publicación", phase: "inapi", deadlineDays: 20, deadlineLabel: "Requerir y pagar publicación en Diario Oficial" },
  { id: "abandoned-inapi", label: "Solicitud abandonada", phase: "inapi", terminal: "neutral" },
  { id: "opposition-window", label: "En ventana de oposición", phase: "gazette", deadlineDays: 30, deadlineLabel: "Cierre de ventana de oposición", helper: "Sin oposición, continúa a examen de fondo INAPI." },
  { id: "opposition-answer", label: "Juicio de oposición — esperando contestación del solicitante", phase: "gazette", deadlineDays: 30, deadlineLabel: "Presentar contestación del solicitante" },
  { id: "opposition-answered", label: "Juicio de oposición — contestación presentada", phase: "gazette" },
  { id: "evidence-period", label: "Juicio de oposición — período probatorio", phase: "gazette", deadlineDays: 30, deadlineLabel: "Término del período probatorio", helper: "Puede prorrogarse hasta por 30 días adicionales." },
  { id: "substantive-exam", label: "Examen de fondo INAPI", phase: "gazette", helper: "INAPI no publica un plazo fijo para resolver esta etapa." },
  { id: "substantive-objection", label: "Examen de fondo INAPI — observación u objeción de fondo", phase: "gazette", deadlineDays: 30, deadlineLabel: "Responder observación u objeción de fondo" },
  { id: "accepted-payment", label: "Resolución: aceptación a registro — esperando pago", phase: "gazette", deadlineDays: 60, deadlineLabel: "Pagar derechos finales" },
  { id: "partial-payment", label: "Resolución: aceptación parcial a registro — esperando pago", phase: "gazette", deadlineDays: 60, deadlineLabel: "Pagar derechos finales de la aceptación parcial" },
  { id: "registered", label: "Registro concedido", phase: "gazette", terminal: "positive" },
  { id: "rejected-appeal", label: "Resolución: rechazo de marca — ventana de apelación", phase: "gazette", deadlineDays: 15, deadlineLabel: "Presentar apelación" },
  { id: "partial-appeal", label: "Resolución: aceptación parcial de marca — ventana de apelación", phase: "gazette", deadlineDays: 15, deadlineLabel: "Presentar apelación de la aceptación parcial" },
  { id: "rejected-final", label: "Resolución: rechazo de marca — fin del procedimiento", phase: "gazette", terminal: "negative" },
  { id: "abandoned-gazette", label: "Solicitud abandonada", phase: "gazette", terminal: "neutral" },
];

export const STATUS_BY_ID = Object.fromEntries(STATUS_DEFINITIONS.map((status) => [status.id, status])) as Record<RegistrationStatusId, StatusDefinition>;

const INITIAL_APPLICATIONS: RegistrationApplication[] = [
  {
    id: "IM-014", name: "CERRO AZUL", logo: "/logos/logo-00.png", applicationNumber: "1582491", type: "Mixta", filedAt: "2026-08-05", statusId: "accepted-publication", deadlineSource: "2026-08-20", recentEvent: "Solicitud aceptada a trámite", niceClasses: "29, 30 y 35", holderRut: "77.614.290-6", holder: "Alimentos Cerro Azul SpA", client: "Cerro Azul", fileUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx", history: [
      { date: "2026-08-05", intake: true },
      { date: "2026-08-20", status: "Aceptado a trámite — esperando pago y publicación", detail: "Debe requerirse y pagarse la publicación." },
    ],
  },
  {
    id: "IM-013", name: "ALBA JURÍDICA", applicationNumber: "1582407", type: "Denominativa", filedAt: "2026-06-28", statusId: "form-observation", deadlineSource: "2026-07-17", recentEvent: "INAPI formuló observación de forma", niceClasses: "35 y 45", holderRut: "76.521.842-1", holder: "Alba Servicios Legales Ltda.", client: "Alba Jurídica", fileUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx", history: [
      { date: "2026-06-28", intake: true },
      { date: "2026-07-17", status: "Observación de forma", detail: "Respuesta pendiente." },
    ],
  },
  {
    id: "IM-012", name: "IMAGO LAB", logo: "/logos/logo-01.png", applicationNumber: "1582316", type: "Mixta", filedAt: "2026-08-12", statusId: "inapi-waiting", recentEvent: "Solicitud ingresada y en revisión inicial", niceClasses: "9, 35 y 42", holderRut: "77.881.452-7", holder: "Imago Tecnología SpA", client: "Imago Tecnología", history: [{ date: "2026-08-12", intake: true }],
  },
  {
    id: "IM-011", name: "BOTÁNICA NORTE", applicationNumber: "1579840", type: "Denominativa", filedAt: "2026-04-22", statusId: "abandoned-inapi", recentEvent: "Solicitud declarada abandonada", niceClasses: "3 y 5", holderRut: "77.634.518-2", holder: "Botánica Norte SpA", client: "Botánica Norte", history: [
      { date: "2026-04-22", intake: true },
      { date: "2026-06-18", status: "Observación de forma" },
      { date: "2026-08-08", status: "Solicitud abandonada", detail: "Procedimiento terminado." },
    ],
  },
  {
    id: "IM-010", name: "VÉRTICE SALUD", logo: "/logos/logo-06.png", applicationNumber: "1579652", type: "Figurativa", filedAt: "2026-03-18", statusId: "opposition-window", deadlineSource: "2026-07-16", publishedAt: "2026-07-16", recentEvent: "Solicitud publicada en Diario Oficial", niceClasses: "5, 10 y 44", holderRut: "76.870.241-9", holder: "Vértice Salud SpA", client: "Vértice Salud", history: [
      { date: "2026-03-18", intake: true },
      { date: "2026-05-02", status: "Aceptado a trámite — esperando pago y publicación" },
      { date: "2026-07-16", status: "En ventana de oposición", detail: "Publicada en Diario Oficial." },
    ],
  },
  {
    id: "IM-009", name: "COSTA VERDE", logo: "/logos/logo-08.png", applicationNumber: "1579018", type: "Mixta", filedAt: "2026-02-09", statusId: "substantive-objection", deadlineSource: "2026-07-10", publishedAt: "2026-04-06", recentEvent: "Objeción de fondo notificada", niceClasses: "29, 30 y 32", holderRut: "77.482.508-3", holder: "Alimentos Costa Verde SpA", client: "Costa Verde", fileUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx", history: [
      { date: "2026-02-09", intake: true },
      { date: "2026-04-06", status: "En ventana de oposición" },
      { date: "2026-05-21", status: "Examen de fondo INAPI" },
      { date: "2026-07-10", status: "Examen de fondo INAPI — observación u objeción de fondo", detail: "Respuesta aún no registrada." },
    ],
  },
  {
    id: "IM-008", name: "ALMA TEXTIL", logo: "/logos/logo-04.png", applicationNumber: "1578840", type: "Mixta", filedAt: "2026-01-29", statusId: "evidence-period", deadlineSource: "2026-08-10", publishedAt: "2026-04-01", recentEvent: "Se abrió el período probatorio", niceClasses: "18, 25 y 35", holderRut: "77.320.982-4", holder: "Alma Textil SpA", client: "Alma Textil", history: [
      { date: "2026-01-29", intake: true },
      { date: "2026-04-01", status: "En ventana de oposición" },
      { date: "2026-05-14", status: "Juicio de oposición — esperando contestación del solicitante" },
      { date: "2026-06-22", status: "Juicio de oposición — contestación presentada", detail: "Contestación presentada." },
      { date: "2026-08-10", status: "Juicio de oposición — período probatorio" },
    ],
  },
  {
    id: "IM-007", name: "NODO DIGITAL", applicationNumber: "1578124", type: "Denominativa", filedAt: "2025-12-18", statusId: "accepted-payment", deadlineSource: "2026-08-04", publishedAt: "2026-03-03", recentEvent: "Resolución de aceptación dictada", niceClasses: "35, 38 y 42", holderRut: "76.819.714-6", holder: "Nodo Digital Ltda.", client: "Nodo Digital", history: [
      { date: "2025-12-18", intake: true },
      { date: "2026-03-03", status: "En ventana de oposición" },
      { date: "2026-04-16", status: "Examen de fondo INAPI" },
      { date: "2026-08-04", status: "Resolución: aceptación a registro — esperando pago", detail: "Pago de derechos finales pendiente." },
    ],
  },
  {
    id: "IM-006", name: "CUMBRE OUTDOOR", logo: "/logos/logo-09.png", applicationNumber: "1577804", type: "Mixta", filedAt: "2025-11-24", statusId: "partial-appeal", deadlineSource: "2026-08-12", publishedAt: "2026-02-02", recentEvent: "Resolución de aceptación parcial notificada", niceClasses: "9, 18 y 25", holderRut: "77.390.000-0", holder: "Cumbre Outdoor SpA", client: "Cumbre Outdoor", history: [
      { date: "2025-11-24", intake: true },
      { date: "2026-02-02", status: "En ventana de oposición" },
      { date: "2026-03-17", status: "Examen de fondo INAPI" },
      { date: "2026-08-12", status: "Resolución: aceptación parcial de marca — ventana de apelación" },
    ],
  },
  {
    id: "IM-005", name: "HABITAR UNO", logo: "/logos/logo-05.png", applicationNumber: "1577029", type: "Mixta", filedAt: "2025-10-28", statusId: "substantive-exam", publishedAt: "2026-01-15", recentEvent: "Finalizó la ventana de oposición sin oposiciones", niceClasses: "36 y 37", holderRut: "77.291.898-4", holder: "Inmobiliaria Habitar Uno", client: "Habitar Uno", history: [
      { date: "2025-10-28", intake: true },
      { date: "2026-01-15", status: "En ventana de oposición" },
      { date: "2026-03-02", status: "Examen de fondo INAPI", detail: "Sin plazo público fijo de resolución." },
    ],
  },
  {
    id: "IM-004", name: "OLA NORTE", applicationNumber: "1576401", type: "Denominativa", filedAt: "2025-09-18", statusId: "partial-payment", publishedAt: "2025-12-11", recentEvent: "Aceptación parcial; fecha de notificación por confirmar", niceClasses: "32 y 35", holderRut: "77.502.190-1", holder: "Bebidas Ola Norte SpA", client: "Ola Norte", history: [
      { date: "2025-09-18", intake: true },
      { date: "2025-12-11", status: "En ventana de oposición" },
      { date: "2026-02-05", status: "Examen de fondo INAPI" },
      { date: "2026-08-25", status: "Resolución: aceptación parcial a registro — esperando pago", detail: "Fecha de vencimiento pendiente de confirmar." },
    ],
  },
  {
    id: "IM-003", name: "SABOR RAÍZ", logo: "/logos/logo-02.png", applicationNumber: "1575128", registrationNumber: "1439920", registrationDate: "2026-08-19", type: "Mixta", filedAt: "2025-07-30", statusId: "registered", publishedAt: "2025-10-27", recentEvent: "Registro concedido por INAPI", niceClasses: "29, 30 y 43", holderRut: "76.722.492-8", holder: "Sabor Raíz SpA", client: "Sabor Raíz", fileUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx", history: [
      { date: "2025-07-30", intake: true },
      { date: "2025-10-27", status: "En ventana de oposición" },
      { date: "2025-12-12", status: "Examen de fondo INAPI" },
      { date: "2026-06-10", status: "Resolución: aceptación a registro — esperando pago" },
      { date: "2026-08-19", status: "Registro concedido", detail: "Registro N.º 1439920." },
    ],
  },
];

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
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("buho-registration-mock-v2");
        if (stored) setApplications(JSON.parse(stored) as RegistrationApplication[]);
      } catch { /* keep bundled mock data */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem("buho-registration-mock-v2", JSON.stringify(applications)); }, [applications, ready]);
  return [applications, setApplications] as const;
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
      <label className="trademark-demo-control"><span>Vista demo</span><select aria-label="Cambiar estado de demostración" onChange={(event) => setDemoState(event.target.value as typeof demoState)} value={demoState}><option value="canvas">Canvas</option><option value="loading">Cargando</option><option value="empty">Sin solicitudes</option></select></label>
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
    <label className="trademark-status-select"><span>Estado mock</span><select aria-label={`Cambiar estado de ${application.name}`} onChange={(event) => onChangeStatus(application, event.target.value as RegistrationStatusId)} value={application.statusId}>{STATUS_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
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
          <label><span>Estado mock</span><select aria-label="Cambiar estado de la solicitud" onChange={(event) => onChangeStatus(event.target.value as RegistrationStatusId)} value={application.statusId}>{STATUS_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          {status.deadlineDays ? <div className={`trademark-deadline deadline-${deadline.attention}`}><AttentionIcon attention={deadline.attention} /><div><span>{status.deadlineLabel}</span><strong>{attentionCopy(deadline.attention, deadline.remaining)}</strong>{deadline.deadline ? <small>Vence el {formatDate(deadline.deadline)} · {status.deadlineDays} días hábiles</small> : <small>No se mostrará una estimación hasta confirmar la fecha fuente.</small>}</div></div> : <p className="trademark-fixed-note"><Hourglass aria-hidden size={17} /> {status.helper ?? (status.terminal ? "Este estado cierra el procedimiento en el seguimiento." : "Esta etapa no tiene un plazo público fijo para que INAPI resuelva.")}</p>}
        </section>

        <section className="trademark-detail-identity">
          {application.logo ? <img alt={`Logo de ${application.name}`} height="104" src={application.logo} width="104" /> : <span className="trademark-no-logo is-large">Logo no disponible</span>}
          <div><span>MARCA</span><h3>{application.name}</h3><p>{application.type} · Clases {application.niceClasses}</p></div>
        </section>

        <dl className="trademark-detail-grid">
          <div><dt>Número de solicitud</dt><dd>{application.applicationNumber}</dd></div>
          <div><dt>Tipo de marca</dt><dd>{application.type}</dd></div>
          <div><dt>Fecha de ingreso</dt><dd>{formatDate(application.filedAt)}</dd></div>
          <div><dt>Acontecimiento más reciente</dt><dd>{application.recentEvent}</dd></div>
          <div><dt>Clases o categorías Niza</dt><dd>{application.niceClasses}</dd></div>
          <div><dt>RUT del titular</dt><dd>{application.holderRut}</dd></div>
          <div><dt>Titular</dt><dd>{application.holder}</dd></div>
          <div><dt>Cliente</dt><dd>{application.client}</dd></div>
          <div><dt>Fecha de publicación</dt><dd>{application.publishedAt ? formatDate(application.publishedAt) : "Aún no publicada"}</dd></div>
          <div><dt>Número de registro</dt><dd>{application.registrationNumber ?? "Aún no asignado"}</dd></div>
          {application.registrationDate && <div><dt>Fecha de concesión</dt><dd>{formatDate(application.registrationDate)}</dd></div>}
          <div><dt>Expediente</dt><dd>{application.fileUrl ? <a href={application.fileUrl} rel="noreferrer" target="_blank">Ver referencia en INAPI <ArrowSquareOut aria-hidden size={15} /></a> : "Referencia no disponible"}</dd></div>
        </dl>

        <section className="trademark-history">
          <header><span>HISTORIAL DE ESTADOS</span><h3>Cambios registrados</h3></header>
          <ol>{application.history.map((event, index) => <li key={`${event.date}-${index}`}>
            <i aria-hidden />
            <div>
              <strong>{formatDate(event.date)} — {event.intake ? "Ingreso de solicitud a INAPI" : `Cambio de estado a: ${event.status}`}</strong>
              {event.detail && <small>{event.detail}</small>}
              {index < application.history.length - 1 && <span aria-hidden className="trademark-history-arrow">↓</span>}
            </div>
          </li>)}</ol>
        </section>
      </div>
      <footer><small>Datos mock · los estados vendrán de cambios registrados en la API.</small><button onClick={onClose} type="button">Cerrar</button></footer>
    </aside>
  </div>;
}

function RegistrationLoading() {
  return <section aria-label="Cargando solicitudes" aria-live="polite" className="trademark-loading"><span className="sr-only">Cargando solicitudes</span>{Array.from({ length: 6 }, (_, index) => <article key={index}><i /><b /><b /><span /></article>)}</section>;
}

function RegistrationEmpty({ filtered = false, onReset }: { filtered?: boolean; onReset: () => void }) {
  return <section className="trademark-empty"><NewspaperClipping aria-hidden size={34} weight="duotone" /><h2>{filtered ? "No encontramos solicitudes" : "Aún no hay solicitudes inscritas"}</h2><p>{filtered ? "Prueba otra marca o limpia los filtros para volver a ver el Canvas." : "Cuando ingreses una solicitud, aparecerá automáticamente en la fase y estado correspondiente."}</p><button onClick={onReset} type="button">{filtered ? "Limpiar filtros" : "Volver al Canvas"}</button></section>;
}
