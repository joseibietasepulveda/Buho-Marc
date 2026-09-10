import type { FieldChange } from "./source-contract";
import type { RegistrationApplication } from "./registration-data";

export type TimelineNotice = {
  id: string; title: string; brand: string; date: string; body: string;
  matchId?: string;
  changeDetail?: { changes: FieldChange[]; source?: string; summary: string };
};
export type TimelineBrand = {
  id?: string; name: string; applicationNumber?: string; provider?: string;
  sourceHistory?: { date: string; title: string; detail?: string; eventId?: string; code?: string }[];
};
export type NotificationTimelineEntry = {
  key: string;
  date: string;
  title: string;
  kind: "act" | "notice";
  current: boolean;
  previous: boolean;
  details: Record<string, unknown>[];
};
type RawEntry = Record<string, unknown>;
const string = (value: unknown) => typeof value === "string" && !/^(null|undefined)$/i.test(value.trim()) ? value.trim() : "";
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
function dateOnly(value: unknown): string {
  const text = string(value);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const localized = fold(text).match(/^(\d{1,2})\s+(?:de\s+)?([a-z]+)\.?\s+(?:de\s+)?(\d{4})$/);
  const month = localized ? months.indexOf(localized[2].slice(0, 3)) + 1 : 0;
  const day = localized && month ? `${localized[3]}-${String(month).padStart(2, "0")}-${localized[1].padStart(2, "0")}` : text.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : "";
}
const objects = (value: unknown): RawEntry[] => Array.isArray(value) ? value.filter((entry): entry is RawEntry => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)) : [];
const rawTitle = (entry: RawEntry) => string(entry.status_description) || string(entry.status) || string(entry.title) || (entry.intake ? "Ingreso de solicitud a INAPI" : string(entry.detail).split(" · ")[0]) || "Actuación sin descripción disponible";
const rawDate = (entry: RawEntry) => dateOnly(entry.event_date ?? entry.date);
const eventId = (entry: RawEntry) => string(entry.event_id ?? entry.eventId);
const signature = (entry: RawEntry) => `${rawDate(entry)}|${fold(rawTitle(entry))}`;

export function conciseNoticeTitle(value: string, brand = ""): string {
  let title = value.trim();
  const prefix = `Nueva actuación en ${brand}:`;
  if (brand && fold(title).startsWith(fold(prefix))) title = title.slice(prefix.length).trim();
  title = title.split(/\n|\s·\s/)[0].replace(/\b(?:C\/)?\d{4}\/\d{3,}\b/g, "").replace(/\s{2,}/g, " ").trim();
  return title.length > 150 ? `${title.slice(0, 147).trimEnd()}…` : title || "Novedad del expediente";
}

export function priorityNoticeSummary(notice: TimelineNotice): string {
  const changes = notice.changeDetail?.changes ?? [];
  const acts = changes.filter(change => ["inapi.events", "inapi.annotations"].includes(change.field)).flatMap(change => objects(change.after));
  const latest = [...acts].reverse().sort((a, b) => rawDate(b).localeCompare(rawDate(a)))[0];
  return conciseNoticeTitle(latest ? rawTitle(latest) : notice.title, notice.brand);
}

export function buildNotificationTimeline(notice: TimelineNotice, notices: TimelineNotice[], applications: RegistrationApplication[] = [], brands: TimelineBrand[] = []) {
  const matchedApplications = applications.filter(application => fold(application.name) === fold(notice.brand));
  const matchedBrands = brands.filter(brand => fold(brand.name) === fold(notice.brand));
  const applicationIds = new Set([...matchedApplications, ...matchedBrands].map(item => item.applicationNumber).filter(Boolean));
  // A notification currently has a brand name, not a stable application link.
  // Avoid borrowing another file's history when two applications share a name.
  const ambiguous = applicationIds.size > 1 || matchedApplications.length > 1 || matchedBrands.length > 1;
  const related = notices.filter(item => notice.matchId ? item.matchId === notice.matchId : !item.matchId && fold(item.brand) === fold(notice.brand) && (!ambiguous || item.id === notice.id));
  const entries: NotificationTimelineEntry[] = [];
  const add = (raw: RawEntry, current: boolean, previous = false) => {
    const id = eventId(raw);
    const existing = entries.find(item => item.kind === "act" && item.details.some(detail => id && eventId(detail) ? eventId(detail) === id : signature(detail) === signature(raw)));
    if (existing) {
      if (!existing.details.some(detail => JSON.stringify(detail) === JSON.stringify(raw))) existing.details.push(raw);
      existing.current ||= current;
      if (!previous) { existing.previous = false; existing.title = conciseNoticeTitle(rawTitle(raw)); existing.date = rawDate(raw); }
      return;
    }
    entries.push({ key: `act-${entries.length}`, date: rawDate(raw), title: conciseNoticeTitle(rawTitle(raw)), kind: "act", current, previous, details: [raw] });
  };
  // A uniquely identified application also gives context to an internal
  // reminder. Match notices concern a competing application, so they must not
  // borrow the watched brand's own dossier by name.
  if (!notice.matchId && !ambiguous) {
    for (const application of matchedApplications) for (const entry of application.history) add({ ...entry }, false);
    for (const brand of matchedBrands) for (const entry of brand.sourceHistory ?? []) add({ ...entry }, false);
  }
  if (notice.changeDetail) {
    // Before and after are deltas, not always the complete dossier. Combine
    // available histories and preserve changed/removed versions explicitly.
    // Notices arrive newest first. Apply their deltas oldest first so an older
    // version cannot overwrite a later correction of the same identified act.
    const chronological = [...related].sort((a, b) => dateOnly(a.date).localeCompare(dateOnly(b.date)));
    for (const item of chronological) for (const change of item.changeDetail?.changes ?? []) {
      if (!["inapi.events", "inapi.annotations"].includes(change.field)) continue;
      for (const entry of objects(change.before)) add({ ...entry, "Versión del antecedente": "Anterior al cambio detectado" }, false, true);
      for (const entry of objects(change.after)) add(entry, item.id === notice.id);
    }
  }
  if (!entries.length || !notice.changeDetail) {
    // Internal reminders remain visible alongside their dossier's acts, with a
    // distinct notice date. Do not duplicate source changes already represented
    // by the act history or relabel a reminder as an official INAPI movement.
    const platformNotices = entries.length ? related.filter(item => !item.changeDetail) : related;
    for (const item of platformNotices.length ? platformNotices : [notice]) entries.push({ key: `notice-${item.id}`, date: dateOnly(item.date), title: priorityNoticeSummary(item), kind: "notice", current: item.id === notice.id, previous: false, details: [{ "Fecha del aviso": item.date, "Notificación": item.title, "Descripción": item.body, "Referencia del aviso": item.id }] });
  }
  entries.sort((a, b) => !a.date ? b.date ? 1 : 0 : !b.date ? -1 : a.date.localeCompare(b.date));
  const sourceIsInapi = notice.changeDetail?.source === "inapi" || !notice.matchId && !ambiguous && [...matchedApplications, ...matchedBrands].some(item => item.provider === "inapi");
  return { entries, ambiguous, official: Boolean(sourceIsInapi && entries.some(entry => entry.kind === "act")), simulated: notice.changeDetail?.source === "simulated" || !sourceIsInapi && matchedApplications.length > 0, kind: entries.some(entry => entry.kind === "act") ? "acts" as const : "notices" as const };
}
