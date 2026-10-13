import { legalFieldLabel } from "./legal-language";
import { displayValue } from "./source-contract";
import { parseWorkDate } from "./work-priorities";

export type EvidenceField = { label: string; value: string };
const labels: Record<string, string> = { event_id: "ID de la actuación", eventId: "ID de la actuación", status_code: "Código INAPI", code: "Código INAPI", status_description: "Descripción de la fuente", status: "Descripción de la fuente", title: "Descripción de la fuente", event_date: "Fecha de actuación", date: "Fecha de actuación", observation: "Observaciones", detail: "Observaciones", due_date: "Vencimiento informado por la fuente", intake: "Ingreso de solicitud" };
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

// Filters presentation only. Every source field/version remains in the timeline.
export function notificationEvidenceFields(entries: Record<string, unknown>[], shown?: { title: string; date: string }): EvidenceField[] {
  const fields = new Map<string, EvidenceField>();
  for (const entry of entries) for (const [key, value] of Object.entries(entry)) {
    if (value == null || key === "Referencia del aviso" || Array.isArray(value) && !value.length || typeof value === "object" && !Object.keys(value).length) continue;
    const text = typeof value === "object" ? displayValue(value) : String(value).trim();
    if (!text || /^(null|undefined)$/i.test(text)) continue;
    const label = labels[key] ?? legalFieldLabel(key);
    if (shown) {
      if (["event_date", "date"].includes(key) && parseWorkDate(text) === shown.date) continue;
      if (["status_description", "status", "title", "observation", "detail", "Notificación", "Descripción"].includes(key) && fold(text) === fold(shown.title)) continue;
      if (key === "intake") continue;
      if (key === "Fecha del aviso" && parseWorkDate(text) === shown.date) continue;
    }
    fields.set(`${label}:${fold(text)}`, { label, value: text });
  }
  return [...fields.values()];
}
