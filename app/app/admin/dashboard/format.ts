export const number = (value: number | null | undefined) => value == null ? 'Sin dato' : new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value);
export const usd = (value: number | null | undefined) => value == null ? 'Sin dato' : `US$ ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: value > 0 && value < .01 ? 6 : 4 }).format(value)}`;
export const percent = (value: number | null | undefined) => value == null ? 'Sin dato' : `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)}%`;
export const date = (value: string | null | undefined, time = false) => {
  if (!value) return 'Sin registro';
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return 'Sin registro';
  return new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'medium', ...(time ? { timeStyle: 'short' as const } : {}) }).format(parsed);
};
export const shortDate = (value: string) => new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: 'numeric', month: 'short' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
export const milliseconds = (value: number | null | undefined) => value == null ? 'Sin medición' : value < 1000 ? `${number(value)} ms` : `${number(value / 1000)} s`;
export const hours = (value: number | null | undefined) => value == null ? 'Sin dato' : value < 24 ? `${number(value)} h` : `${number(value / 24)} días`;
export function csvCell(value: unknown): string {
  const raw = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const safe = /^[\s]*[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csvDocument(rows: readonly (readonly unknown[])[]): string {
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
export function downloadCsv(filename: string, rows: readonly (readonly unknown[])[]) {
  const href = URL.createObjectURL(new Blob([csvDocument(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = href; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}
export function dateRange(days: number, now = new Date()) {
  const to = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const start = new Date(`${to}T12:00:00Z`); start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to };
}
