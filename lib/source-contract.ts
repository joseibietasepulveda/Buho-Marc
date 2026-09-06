import { z } from "zod";
import { STATUS_DEFINITIONS, STATUS_BY_ID, type RegistrationStatusId } from "./registration-data";

export const sourceStatuses = STATUS_DEFINITIONS.map(s => s.id);
export const statusLabel = (id: string) => STATUS_BY_ID[id as RegistrationStatusId]?.label ?? ({ expired: "Registro vencido", cancelled: "Registro cancelado" }[id] ?? id);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, "Fecha inválida").nullable();
const text = z.string().trim().min(1).max(180);
export const sourceRecordSchema = z.object({
  provider: z.literal("inapi").optional(),
  inapi: z.record(z.string(), z.json()).optional(),
  applicationNumber: z.string().regex(/^\d{1,30}$/), registrationNumber: z.string().regex(/^\d{1,30}$/).nullable(),
  name: text, status: z.enum(sourceStatuses), type: z.enum(["Denominativa", "Figurativa", "Mixta", "Otra"]),
  filingDate: date, publicationDate: date, expirationDate: date, registrationDate: date, statusDate: date,
  owner: text, ownerRut: z.string().max(30), ownerCountry: text, representativeName: text, representativeCountry: text,
  classes: z.array(z.number().int().min(1).max(45)).transform(v => [...new Set(v)].sort((a, b) => a - b)),
  logo: z.string().max(1500).refine(v => !v || /^\/[^/]/.test(v) || /^https:\/\//.test(v), "Usa una imagen local o HTTPS"),
  officialUrl: z.string().url().max(1500).refine(v => /^https:\/\//.test(v)),
}).strict().superRefine((v, ctx) => {
  if (!v.provider && !v.classes.length) ctx.addIssue({ code: "custom", message: "Seleccione al menos una clase", path: ["classes"] });
  if (v.publicationDate && v.filingDate && v.publicationDate < v.filingDate) ctx.addIssue({ code: "custom", message: "La publicación no puede preceder a la presentación", path: ["publicationDate"] });
  if (v.status === "registered" && !v.registrationNumber) ctx.addIssue({ code: "custom", message: "Un registro concedido requiere número de registro", path: ["registrationNumber"] });
  if (v.status === "opposition-window" && !v.publicationDate) ctx.addIssue({ code: "custom", message: "La ventana de oposición requiere fecha de publicación", path: ["publicationDate"] });
});
export type SourceRecord = z.infer<typeof sourceRecordSchema>;
export const lookupSchema = z.object({ registrationIds: z.array(z.string().regex(/^\d{1,30}$/)).max(2000), applicationIds: z.array(z.string().regex(/^\d{1,30}$/)).max(2000) }).strict();
export type Lookup = z.infer<typeof lookupSchema>;
export const sourceResponseSchema = z.object({ version: z.literal(1), records: z.array(sourceRecordSchema).max(4000), missing: z.array(z.string()), fetchedAt: z.string().datetime() }).strict();
export const fieldLabels: Record<keyof SourceRecord, string> = {
  provider: "Fuente", inapi: "Antecedentes del expediente",
  applicationNumber: "N.º de solicitud", registrationNumber: "N.º de registro", name: "Denominación", status: "Estado del expediente", type: "Tipo de marca",
  filingDate: "Fecha de presentación", publicationDate: "Fecha de publicación", expirationDate: "Fecha de vencimiento", registrationDate: "Fecha de registro", statusDate: "Fecha de la actuación",
  owner: "Titular", ownerRut: "RUT del titular", ownerCountry: "País del titular", representativeName: "Representante", representativeCountry: "País del representante", classes: "Clases de Niza", logo: "Logo o etiqueta", officialUrl: "Enlace al expediente",
};
type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
export type FieldChange = { field: string; label: string; before: JsonValue | undefined; after: JsonValue | undefined; ancillary: boolean };
// PostgreSQL JSONB reorders object keys. Compare values, never serialization order.
export function stableJson(value: unknown): string | undefined {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function compareRecords(before: SourceRecord, after: SourceRecord): FieldChange[] {
  const changes: FieldChange[] = (Object.keys(fieldLabels) as (keyof SourceRecord)[]).filter(k => k !== "inapi" && k !== "provider" && JSON.stringify(before[k]) !== JSON.stringify(after[k])).map(field => ({
    field, label: fieldLabels[field], before: before[field], after: after[field],
    // Initial completion of derived dates accompanies the main event; corrections remain reportable.
    ancillary: (field === "expirationDate" || field === "registrationDate") && !before[field] && Boolean(after[field]) || field === "statusDate" && before.status !== after.status,
  }));
  const labels: Record<string, string> = { events: "Actuaciones del expediente", annotations: "Anotaciones del registro", holders: "Titulares", representatives: "Representantes", classes: "Cobertura y clases de Niza", trademark: "Características y protección del signo", status: "Estado informado por INAPI", dates: "Fechas del expediente", related_records: "Expedientes relacionados" };
  for (const key of new Set([...Object.keys(before.inapi ?? {}), ...Object.keys(after.inapi ?? {})])) {
    const a = before.inapi?.[key] ?? null, b = after.inapi?.[key] ?? null;
    if (stableJson(a) === stableJson(b)) continue;
    let previous = a, current = b;
    if (Array.isArray(a) && Array.isArray(b)) {
      previous = a.filter(v => !b.some(w => stableJson(v) === stableJson(w)));
      current = b.filter(v => !a.some(w => stableJson(v) === stableJson(w)));
    }
    changes.push({ field: `inapi.${key}`, label: labels[key] ?? key, before: previous, after: current, ancillary: false });
  }
  return changes;
}
export function displayValue(value: unknown): string {
  if (value == null || value === "") return "No informado";
  if (Array.isArray(value)) return value.length ? value.map(displayValue).join("\n") : "Sin antecedentes";
  if (typeof value === "object") {
    const event = value as Record<string, unknown>;
    if (event.status_description) return [event.event_date, event.status_description, event.observation, event.due_date ? `Vencimiento informado: ${event.due_date}` : ""].filter(Boolean).join(" · ");
    return Object.entries(event).map(([k,v]) => `${k}: ${displayValue(v)}`).join(" · ");
  }
  return String(value);
}
export function describeChanges(before: SourceRecord, after: SourceRecord, changes = compareRecords(before, after)) {
  const subjects: string[] = [];
  const name = after.name;
  if (!before.publicationDate && after.publicationDate) subjects.push(`La solicitud de ${name} fue publicada en ${after.applicationNumber.length === 9 ? "la Gaceta de Marcas de INAPI" : "el Diario Oficial"}`);
  if (before.status !== after.status) {
    const events: Record<string, string> = {
      "appeal-pending": `Se registró una actuación de apelación respecto de ${name}`,
      "inapi-waiting": `La solicitud de ${name} se encuentra en revisión inicial de INAPI`,
      "form-observation": `INAPI formuló una observación de forma a ${name}`,
      "accepted-publication": `${name} fue aceptada a trámite y está pendiente de publicación`,
      "opposition-window": `${name} ingresó a la etapa de oposición`,
      "opposition-answer": `Se registró una oposición contra la solicitud de ${name}`,
      "opposition-answered": `Se registró la contestación a la oposición de ${name}`,
      "evidence-period": `Se abrió el período probatorio en la oposición de ${name}`,
      "substantive-exam": `${name} ingresó a examen de fondo en INAPI`,
      "substantive-objection": `INAPI formuló una observación de fondo a ${name}`,
      "accepted-payment": `INAPI aceptó a registro ${name}; el pago de derechos finales está pendiente`,
      "partial-payment": `INAPI aceptó parcialmente ${name}; el pago de derechos finales está pendiente`,
      "registered": `INAPI concedió el registro de ${name}`,
      "rejected-appeal": `INAPI rechazó ${name}; corresponde revisar la procedencia de una apelación`,
      "partial-appeal": `${name} fue aceptada parcialmente; corresponde revisar la resolución`,
      "rejected-final": `Se registró el rechazo definitivo de ${name}`,
      "abandoned-inapi": `La solicitud de ${name} fue declarada abandonada`,
      "abandoned-gazette": `La solicitud de ${name} fue declarada abandonada`,
      expired: `El registro de ${name} figura vencido`, cancelled: `El registro de ${name} figura cancelado`,
    };
    if (!(after.status === "opposition-window" && subjects.length)) subjects.push(events[after.status] ?? `Se actualizó el estado de ${name}: ${statusLabel(after.status)}`);
  }
  const eventChanges = changes.filter(c => c.field === "inapi.events" || c.field === "inapi.annotations");
  for (const change of eventChanges) {
    const entries = Array.isArray(change.after) ? change.after : [];
    for (const entry of entries) {
      const event = entry as Record<string, unknown>;
      if (event.status_description) subjects.push(`Nueva actuación en ${name}: ${event.status_description}`);
    }
    if (!entries.length) subjects.push(`Se rectificó el historial de actuaciones de ${name}`);
  }
  if (before.owner !== after.owner) subjects.push(`Se actualizó la titularidad de ${name}: ahora figura ${after.owner}`);
  if (before.representativeName !== after.representativeName) subjects.push(`Se actualizó el representante de ${name}: ${after.representativeName}`);
  if (!subjects.length) {
    const fields = changes.filter(c => !c.ancillary).map(c => c.label.toLowerCase());
    subjects.push(`Se actualizó ${name}: ${fields.join(", ")}`);
  }
  const title = subjects[0].slice(0, 220);
  const details = changes.map(c => `${c.label}: ${c.field === "status" ? statusLabel(String(c.before)) : displayValue(c.before)} → ${c.field === "status" ? statusLabel(String(c.after)) : displayValue(c.after)}${c.ancillary ? " (antecedente complementario)" : ""}.`).join("\n");
  return { title, urgency: ["form-observation", "substantive-objection", "opposition-answer", "rejected-appeal", "expired", "cancelled"].includes(after.status) || eventChanges.some(c => /oposici|rechaz|observaci|plazo/i.test(displayValue(c.after))) ? "Alta" : "Media", body: `${subjects.join(". ")}.\n\nSolicitud N.º ${after.applicationNumber}${after.registrationNumber ? ` · Registro N.º ${after.registrationNumber}` : ""}.\n\nAntecedentes detectados:\n${details}\n\n${after.provider === "inapi" ? `Fuente: INAPI, consultada a través de dequienes.cl. Expediente: ${after.officialUrl}` : "Fuente de prueba."} Revise la actuación para confirmar su alcance y los plazos aplicables.` };
}
export function chileClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map(p => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, due: Number(parts.hour) * 60 + Number(parts.minute) >= 750 };
}
