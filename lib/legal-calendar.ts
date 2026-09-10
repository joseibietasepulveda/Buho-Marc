/** National Chilean LPI/LBPA calendar, reviewed 2026-09-10; sources and limits in docs/CALENDARIO_LEGAL_CHILE_2026_2027.md. */
export const CALENDAR_VERSION = "CL-LPI-LBPA-NATIONAL-2026-2027-v1";

// Explicit verified dates: never reuse month/day values for an unreviewed year.
const nationalHolidays = new Set([
  "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01", "2026-05-21", "2026-06-21", "2026-06-29", "2026-07-16",
  "2026-08-15", "2026-09-18", "2026-09-19", "2026-10-12", "2026-10-31", "2026-11-01", "2026-12-08", "2026-12-25",
  "2027-01-01", "2027-03-26", "2027-03-27", "2027-05-01", "2027-05-21", "2027-06-21", "2027-06-28", "2027-07-16",
  "2027-08-15", "2027-09-17", "2027-09-18", "2027-09-19", "2027-10-11", "2027-10-31", "2027-11-01", "2027-12-08", "2027-12-25",
]);

/** Accept an existing civil ISO date in the reviewed interval, not a timestamp or a normalized impossible date. */
export function calendarCovered(day: string): boolean {
  if (!/^(2026|2027)-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

/** LPI art. 11 / LBPA art. 25: excludes Saturday, Sunday and national holidays. Not a CPC calendar. */
export function nationalBusinessDay(day: string): boolean {
  if (!calendarCovered(day)) return false;
  return ![0, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay()) && !nationalHolidays.has(day);
}
