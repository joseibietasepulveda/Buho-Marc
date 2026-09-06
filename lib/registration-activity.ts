import type { RegistrationApplication } from "./registration-data";

type HistoryEvent = RegistrationApplication["history"][number];

function text(value: unknown): string {
  return typeof value === "string" && !/^(undefined|null)$/i.test(value.trim()) ? value.trim() : "";
}

export function activityDate(value: string): string {
  const day = text(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : "";
}

export function activityContent(event: HistoryEvent) {
  const detail = text(event.detail);
  const status = text(event.status);
  const heading = event.intake ? "Ingreso de solicitud a INAPI" : detail.split(" · ")[0] || status || "Movimiento sin descripción disponible";
  const title = heading.length > 160 ? `${heading.slice(0, 157).trimEnd()}…` : heading;
  return { title, detail: detail && detail !== title ? detail : "" };
}

export function latestActivityFirst(history: HistoryEvent[]) {
  // Stable ordering retains the source sequence for events on the same day.
  // Missing dates belong at the end; the source record is never mutated.
  return [...history].sort((a, b) => activityDate(b.date).localeCompare(activityDate(a.date)));
}
