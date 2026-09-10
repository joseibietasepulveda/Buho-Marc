import type { FieldChange } from "./source-contract";
type Notice = { title: string; urgency: string; kind?: string; changeDetail?: { changes: FieldChange[] } };
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const administrative = /cambio.*titular|actualiz.*titular|cambio.*representante|actualiz.*representante|transferencia.*titular|anotacion.*titular/;
const decisive = /presentacion.*solicitud|acepta|observacion|objecion|oposicion|concesion|conced|rechaz|abandono|abandonad|resolucion|ejecutoria|apelacion|termino probatorio|recib[ei].*prueba|publicacion.*diario|publicad.*diario|pago.*publicacion|pago.*final|constatacion.*pago|plazo|vencim|vence|vencido/;

export function isTitleIssued(value: string): boolean {
  const text = fold(value);
  if (/solicitud de|solicita|requiere|pendiente|no emit|sin emit|por emitir/.test(text)) return false;
  if (/^(titulo de marca|certificado de titularidad)(?:\s+\d|\s*$)/.test(text.trim())) return true;
  return /(?:emisi[oó]n|emitid|expedid|disponible|otorgad|generad|extendid).*(?:titulo|certificado de titularidad)|(?:titulo|certificado de titularidad).*(?:emitid|expedid|disponible|otorgad|generad|extendid)/.test(text);
}
export function eventDescriptions(changes: FieldChange[]): string[] {
  return changes.filter(change => ["inapi.events", "inapi.annotations"].includes(change.field)).flatMap(change =>
    (Array.isArray(change.after) ? change.after : []).flatMap(entry => entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.status_description === "string" ? [entry.status_description] : []));
}
export function isPriorityNotice(notice: Notice): boolean {
  if (notice.kind === "title-issued" || notice.kind === "deadline") return true;
  const changes = notice.changeDetail?.changes;
  if (changes) {
    if (changes.some(change => ["status", "publicationDate", "registrationNumber"].includes(change.field) && change.after)) return true;
    return eventDescriptions(changes).some(description => isTitleIssued(description) || !administrative.test(fold(description)) && decisive.test(fold(description)));
  }
  const title = fold(notice.title);
  if (administrative.test(title)) return false;
  if (isTitleIssued(title) || decisive.test(title)) return true;
  return /similitud|coincidencia/.test(title) && notice.urgency === "Alta";
}
