const months: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };

export function parseWorkDate(value?: string): string | null {
  if (!value) return null;
  let day: number, month: number, year: number;
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  const spanish = value.trim().toLowerCase().replaceAll(" de ", " ").match(/^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})$/);
  if (iso) { year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]); }
  else if (spanish) { year = Number(spanish[3]); month = months[spanish[2].slice(0, 3)]; day = Number(spanish[1]); }
  else return null;
  if (!month || year < 1900 || year > 9999) return null;
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${key}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : null;
}

export function chileToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}

export function workDeadline(value?: string, closed = false, today = chileToday()) {
  const date = parseWorkDate(value);
  const days = date ? Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000) : null;
  if (closed) return { date, days, tone: "closed", label: "Caso concluido", rank: 5 };
  if (days === null) return { date, days, tone: "unknown", label: "Sin fecha definida", rank: 2 };
  if (days < 0) return { date, days, tone: "overdue", label: "Plazo vencido", rank: 0 };
  if (days === 0) return { date, days, tone: "soon", label: "Vence hoy", rank: 1 };
  if (days <= 14) return { date, days, tone: "soon", label: "Próximo a vencer", rank: 1 };
  return { date, days, tone: "normal", label: "Plazo vigente", rank: 4 };
}

export function displayWorkDate(value?: string): string {
  const date = parseWorkDate(value);
  return date ? new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00Z`)) : "Sin fecha definida";
}

type NoticeInput = { title: string; brand: string; urgency: string; changeDetail?: unknown };
export function noticePresentation(notice: NoticeInput, deadline?: string, today = chileToday()) {
  if (notice.changeDetail) return { title: notice.title, label: "Novedad del expediente", tone: "neutral", kind: "activity" };
  if (/plazo|vencim|vencid|vence|vencer/i.test(notice.title)) {
    const due = workDeadline(deadline, false, today);
    return { title: `Seguimiento de plazo · ${notice.brand}`, label: due.date ? due.label : "Fecha por confirmar", tone: due.date ? due.tone : "unknown", kind: "deadline" };
  }
  if (/similitud|coincidencia/i.test(notice.title)) return { title: notice.title, label: `${notice.urgency} similitud`, tone: notice.urgency.toLowerCase(), kind: "match" };
  return { title: notice.title, label: `Prioridad ${notice.urgency.toLowerCase()}`, tone: "neutral", kind: "other" };
}
