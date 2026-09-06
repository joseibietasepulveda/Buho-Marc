export type RegistrationPhase = "inapi" | "gazette";
export type RegistrationStatusId =
  | "appeal-pending"
  | "expired"
  | "cancelled"
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
  provider?: "inapi";
  officialDeadline?: string;
  sourceStatus?: string;
  expirationDate?: string;
  ownerCountry?: string;
  representativeName?: string;
  representativeCountry?: string;
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

export const STATUS_DEFINITIONS: StatusDefinition[] = [
  { id: "appeal-pending", label: "Apelación en tramitación", phase: "gazette" },
  { id: "expired", label: "Registro vencido", phase: "gazette", terminal: "neutral" },
  { id: "cancelled", label: "Registro cancelado", phase: "gazette", terminal: "negative" },
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

export const INITIAL_APPLICATIONS: RegistrationApplication[] = [
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
