import { createHash } from "node:crypto";
import type { AgendaEvent } from "./agenda";
import type { SimilarityMark, SimilarityHit } from "./similarity-contract";
import { hiddenDiscoveryState, terminalState } from "./watch-policy";
import { SOURCE_TIME_ZONE, santiagoDay } from "./source-schedule";
import { oppositionWindow } from "./opposition-window";

export const DIGEST_MANUAL_LIMIT = 150;
export const DIGEST_VISIBLE_LIMIT = 8;
export const DIGEST_CANDIDATES_PER_BRAND = 5;
export const DIGEST_MIN_SCORE = .25;
export const DIGEST_MODEL = "z-ai/glm-5.3-flash";
export const DIGEST_PROMPT_VERSION = 1;
export const DIGEST_PILOT_TO = "hola@rcirculo.com";

export type DigestCandidate = { id: string; matchId: string; brandId: string; reference: SimilarityMark; candidate: SimilarityHit; score: number; fetchedAt: string | null };
export type DigestCross = DigestCandidate & { reason: string; insufficient: boolean; referenceImage?: string; candidateImage?: string };
export type DigestImage = { key: string; content: string };
export type DigestPayload = {
  runId: string; organizationName: string; generatedAt: string; from: string; through: string;
  crosses: DigestCross[]; agenda: AgendaEvent[]; evaluated: number; available: number;
  failures: number; filteredLowScore: number; sourceReviewedAt: string | null; limited: boolean;
};

export const digestHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function shiftDigestDay(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function chileInstant(day: string, hour: number, minute: number) {
  const target = Date.parse(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
  let candidate = target;
  for (let n = 0; n < 4; n++) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: SOURCE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(candidate));
    const part = (name: string) => parts.find(p => p.type === name)!.value;
    candidate += target - Date.parse(`${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}Z`);
  }
  return new Date(candidate);
}
export function latestDigestSlot(now: Date) {
  const today = santiagoDay(now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  let monday = shiftDigestDay(today, -((weekday + 6) % 7));
  let instant = chileInstant(monday, 8, 30);
  if (instant > now) { monday = shiftDigestDay(monday, -7); instant = chileInstant(monday, 8, 30); }
  return { day: monday, instant: instant.toISOString() };
}
export function nextDigestSlot(now: Date) {
  return chileInstant(shiftDigestDay(latestDigestSlot(now).day, 7), 8, 30).toISOString();
}
export function digestAgenda(events: AgendaEvent[], now: Date) {
  const from = santiagoDay(now), through = shiftDigestDay(from, 13);
  const unique = new Map(events.filter(e => e.date && e.date >= from && e.date <= through && !e.institutional && !e.informational).map(e => [e.id, e]));
  return [...unique.values()].sort((a, b) => a.date!.localeCompare(b.date!) || Number(!!b.fatal) - Number(!!a.fatal) || a.title.localeCompare(b.title, "es"));
}
export function eligibleDigestCandidate(cross: DigestCandidate, today: string) {
  const hit = cross.candidate;
  return cross.reference.applicationId !== hit.applicationId && !terminalState(cross.reference.status) &&
    !hit.registeredAt && !hiddenDiscoveryState(hit.status) &&
    !["Descartada", "En seguimiento", "Convertida en caso"].includes(hit.reviewStatus ?? "") &&
    (!hit.officialDecision || !terminalState(hit.officialDecision.status)) && oppositionWindow(hit, today).tone !== "ended" &&
    // A source-confirmed closed opposition window is not a new opposition alert.
    (!((hit as SimilarityHit & { legalDeadline?: string }).legalDeadline) || (hit as SimilarityHit & { legalDeadline?: string }).legalDeadline! >= today);
}
export function selectDigestCandidates(crosses: DigestCandidate[], limit: number, now: Date) {
  const groups = new Map<string, DigestCandidate[]>();
  let filteredLowScore = 0;
  for (const c of crosses.filter(c => eligibleDigestCandidate(c, santiagoDay(now)))) {
    if (!Number.isFinite(c.score) || c.score < DIGEST_MIN_SCORE || c.score > 1) { filteredLowScore++; continue; }
    const group = groups.get(c.brandId) ?? [];
    if (!group.some(x => x.candidate.applicationId === c.candidate.applicationId)) group.push(c);
    groups.set(c.brandId, group);
  }
  const ordered = [...groups.values()].map(g => g.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, DIGEST_CANDIDATES_PER_BRAND))
    .sort((a, b) => b[0].score - a[0].score || a[0].brandId.localeCompare(b[0].brandId));
  // Give each mark a first candidate before spending the manual cap on its fifth.
  const roundRobin = Array.from({ length: DIGEST_CANDIDATES_PER_BRAND }, (_, rank) => ordered.flatMap(group => group[rank] ? [group[rank]] : [])).flat();
  return { filteredLowScore, available: [...groups.values()].reduce((n, group) => n + group.length, 0), selected: roundRobin.slice(0, Math.max(0, limit)) };
}

export function digestConfig() {
  const number = (name: string, fallback: number) => {
    const value = Number(process.env[name]); return Number.isFinite(value) && value > 0 ? Math.min(value, 100) : fallback;
  };
  return {
    enabled: process.env.WATCH_DIGEST_ENABLED === "true", sending: process.env.RESEND_DELIVERY_ENABLED === "true",
    resendKey: (process.env.RESEND_API_KEY ?? "").trim(), glmKey: (process.env.OPENROUTER_WATCH_API_KEY ?? "").trim(),
    from: "Buho Marc <hola@rcirculo.com>", to: DIGEST_PILOT_TO, replyTo: DIGEST_PILOT_TO,
    runBudget: number("WATCH_GLM_RUN_BUDGET_USD", 1), monthlyBudget: number("WATCH_GLM_MONTHLY_BUDGET_USD", 10),
    origin: (process.env.APP_PUBLIC_ORIGIN || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "")).replace(/\/$/, ""),
  };
}
export function digestConfigurationProblems(config = digestConfig()) {
  const missing = [];
  if (!config.sending) missing.push("habilitar envíos con Resend");
  if (!config.resendKey) missing.push("clave de Resend");
  if (!config.glmKey) missing.push("clave exclusiva de GLM");
  try { const u = new URL(config.origin); if (u.username || u.password || u.search || u.hash || u.pathname !== "/" || !(u.protocol === "https:" || u.protocol === "http:" && ["127.0.0.1", "localhost"].includes(u.hostname))) missing.push("dirección pública válida"); }
  catch { missing.push("dirección pública de la plataforma"); }
  return missing;
}
