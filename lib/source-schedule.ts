export const SOURCE_TIME_ZONE = "America/Santiago";
export type SourceRunMetadata = {
  id: string;
  trigger: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  requested: number;
  received: number;
};
export type SourceReviewStatus = {
  checkedAt: string;
  automaticEnabled: boolean;
  latest: SourceRunMetadata | null;
  lastSuccess: SourceRunMetadata | null;
  nextScheduledAt: string | null;
};

export function santiagoDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: SOURCE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(part => parts.find(value => value.type === part)!.value).join("-");
}

function shiftDay(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

// Resolve the IANA zone for the target date, not the browser's zone or a fixed
// UTC offset. Chile changes its offset during the year.
function dailyReviewInstant(day: string): Date {
  const target = Date.parse(`${day}T12:30:00Z`);
  let candidate = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: SOURCE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(candidate));
    const part = (type: string) => parts.find(value => value.type === type)!.value;
    const localAsUtc = Date.parse(`${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}Z`);
    candidate += target - localAsUtc;
  }
  return new Date(candidate);
}

export function nextSourceReview(now: Date, automaticEnabled: boolean): string | null {
  if (!automaticEnabled) return null;
  const today = santiagoDay(now);
  const slot = dailyReviewInstant(today);
  return (slot.getTime() > now.getTime() ? slot : dailyReviewInstant(shiftDay(today, 1))).toISOString();
}

export function sourceReviewDate(value: string, now: Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha no disponible";
  const day = santiagoDay(date);
  const today = santiagoDay(now);
  const relative = day === today ? "hoy" : day === shiftDay(today, -1) ? "ayer" : day === shiftDay(today, 1) ? "mañana" : "";
  const label = new Intl.DateTimeFormat("es-CL", { timeZone: SOURCE_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(date).replaceAll("-", "/");
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: SOURCE_TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value ?? "";
  return `${label}${relative ? ` (${relative})` : ""} a las ${part("hour")}:${part("minute")} ${part("dayPeriod") === "PM" ? "p. m." : "a. m."}`;
}

export function isCompletePortfolioReview(run: SourceRunMetadata): boolean {
  return ["manual", "scheduled"].includes(run.trigger) && run.status === "success" && Boolean(run.completed_at) && run.requested > 0 && run.received >= run.requested;
}
