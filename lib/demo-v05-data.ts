import type { RegistrationApplication } from "./registration-data";

/** Fixed release fixtures, never a rolling clock or a rule for real legal dates. */
export const DEMO_V05_MIN_DATE = "2026-09-30";
export const DEMO_V05_CASE_DATES: Record<string, string> = {
  "BM-1042": "2026-09-30", "BM-1038": "2026-10-01", "BM-1036": "2026-10-02", "BM-1027": "2026-10-05",
  "BM-1050": "2026-10-06", "BM-1051": "2026-10-07", "BM-1052": "2026-10-08", "BM-1053": "2026-10-09", "BM-1054": "2026-10-13",
};
export const DEMO_V05_MATCH_DATES: Record<string, string> = { "CO-2481": "2026-09-30", "CO-2479": "2026-10-01", "CO-2485": "2026-10-06" };
export const DEMO_V05_EXTRA_CASES = [
  { id: "10000000-0000-4000-8000-000000000550", code: "BM-1050", match: "CO-2485", title: "Oposición Nova Nutra", stage: "Esperando confirmación de cliente", priority: "Alta", deadlineDescription: "Confirmar instrucciones y preparar oposición", task: "Confirmar instrucciones con el cliente" },
  { id: "10000000-0000-4000-8000-000000000551", code: "BM-1051", match: "CO-2483", title: "Revisión Tierra Sur", stage: "En seguimiento", priority: "Media", deadlineDescription: "Completar análisis de semejanza y cobertura", task: "Analizar cobertura y antecedentes de Tierra Sur" },
  { id: "10000000-0000-4000-8000-000000000552", code: "BM-1052", match: "CO-2476", title: "Oposición Casa Nubia", stage: "En seguimiento", priority: "Media", deadlineDescription: "Revisar el borrador de oposición con el equipo", task: "Preparar escrito de oposición" },
  { id: "10000000-0000-4000-8000-000000000553", code: "BM-1053", match: "CO-2468", title: "Revisión Novo Food Lab", stage: "Esperando confirmación de cliente", priority: "Media", deadlineDescription: "Obtener respuesta del cliente sobre la estrategia", task: "Enviar comparación y solicitar instrucciones" },
  { id: "10000000-0000-4000-8000-000000000554", code: "BM-1054", match: "CO-2463", title: "Seguimiento Pulso Vital", stage: "En seguimiento", priority: "Baja", deadlineDescription: "Revisar los nuevos antecedentes de la solicitud", task: "Recopilar antecedentes probatorios" },
] as const;

const applicationDates: Record<string, Record<string, string>> = {
  "IM-014": { "2026-08-20": "2026-09-01" },
  "IM-013": { "2026-07-17": "2026-08-24" },
  "IM-010": { "2026-03-18": "2026-04-01", "2026-07-16": "2026-08-24" },
  "IM-009": { "2026-02-09": "2026-04-01", "2026-07-10": "2026-08-24" },
  "IM-008": { "2026-01-29": "2026-04-01", "2026-08-10": "2026-08-24" },
  "IM-006": { "2026-08-12": "2026-09-08" },
  "IM-005": { "2025-10-28": "2026-04-01", "2026-01-15": "2026-05-04", "2026-03-02": "2026-06-19" },
};

/** Change only the exact obsolete dates in the known simulated release fixtures. */
export function upgradeDemoApplicationV05<T extends RegistrationApplication>(application: T): T {
  if (application.provider || !/^IM-00[3-9]$|^IM-01[0-4]$/.test(application.id)) return application;
  const dates = applicationDates[application.id] ?? {};
  const changeDate = (value?: string) => value && (dates[value] ?? value);
  const next = {
    ...application,
    filedAt: changeDate(application.filedAt)!,
    deadlineSource: changeDate(application.deadlineSource),
    publishedAt: changeDate(application.publishedAt),
    history: application.history.map(event => ({ ...event, date: changeDate(event.date)! })),
  };
  // These two seed scenarios intentionally supply simulated finality; never infer it for real records.
  if (["IM-007", "IM-004"].includes(application.id) && ["accepted-payment", "partial-payment"].includes(application.statusId) && !application.procedure?.finalAt) {
    next.procedure = { ...application.procedure, finalAt: "2026-09-08", sourceActDate: "2026-09-08", sourceActDescription: "Constancia de ejecutoria del 8 de septiembre de 2026 · ejemplo simulado v0.5" };
    next.recentEvent = "Aceptación ejecutoriada; pago y acreditación de derechos finales pendientes · ejemplo";
    if (!next.history.some(event => event.status === "Aceptación ejecutoriada · ejemplo")) next.history = [...next.history, { date: "2026-09-08", status: "Aceptación ejecutoriada · ejemplo", detail: "Constancia ficticia incorporada para demostrar el plazo de pago final." }];
  }
  if (application.procedure && Object.keys(dates).length) {
    next.procedure = { ...application.procedure, notifiedAt: changeDate(application.procedure.notifiedAt), sourceActDate: changeDate(application.procedure.sourceActDate) };
  }
  return next;
}

/** Browser fallback: preserve later/user-edited dates and non-demo entities. */
export function upgradeDemoCaseDateV05(code: string, date?: string): string | undefined {
  return DEMO_V05_CASE_DATES[code] && date && date < DEMO_V05_MIN_DATE ? DEMO_V05_CASE_DATES[code] : date;
}

export function upgradeDemoSourceDateV05(code: string, date: string | null | undefined) {
  return date ? applicationDates[code]?.[date] ?? date : date;
}
