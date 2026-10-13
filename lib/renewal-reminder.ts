import { addCalendarMonths } from "./registration-procedure";
import { chileToday, parseWorkDate, displayWorkDate } from "./work-priorities";

type Registration = { provider?: string; status: string; name: string; applicationNumber: string; registrationNumber?: string | null; registrationDate?: string | null; expirationDate?: string | null };
export function registrationExpiry(record: Registration, today = chileToday()) {
  if (record.provider !== "inapi" || !record.registrationNumber || !["registered", "expired"].includes(record.status)) return;
  const registered = parseWorkDate(record.registrationDate ?? undefined);
  if (registered && registered > today) return;
  // A source expiry may describe a renewed registration. Never replace it with
  // ten years from the original filing, payment or first registration date.
  if (record.expirationDate) {
    const date = parseWorkDate(record.expirationDate);
    return date && (!registered || date >= registered) ? { date, origin: "source" as const } : undefined;
  }
  const date = registered ? addCalendarMonths(registered, 120) : undefined;
  return date ? { date, origin: "calculated" as const } : undefined;
}
export function renewalReminder(record: Registration, today = chileToday()) {
  const expiry = registrationExpiry(record, today);
  const year = addCalendarMonths(today, 12);
  if (record.status !== "registered" || !expiry || !year || expiry.date < today || expiry.date >= year) return;
  const opens = addCalendarMonths(expiry.date, -6)!;
  const title = `Registro próximo a vencer: ${record.name}`.slice(0, 220);
  const summary = `${record.name} · Solicitud ${record.applicationNumber} · Registro ${record.registrationNumber}.\n\nVencimiento: ${displayWorkDate(expiry.date)} (${expiry.origin === "source" ? "fecha informada por la fuente" : "calculado: diez años desde la fecha de registro"}). Queda menos de un año de vigencia.\n\n${opens <= today ? "La ventana de renovación ya está abierta." : `La ventana de renovación se abre el ${displayWorkDate(opens)}.`} Revisar la renovación del registro. Este es un recordatorio interno; no acredita caducidad ni renovación y no sustituye una notificación legal.`;
  return { ...expiry, title, summary, opens };
}
