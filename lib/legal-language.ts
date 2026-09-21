// Presentation labels also cover historical records written with provider keys.
const fields: Record<string, string> = {
  image_url: "imagen de la marca", registration_id: "número de registro", registration_number: "número de registro", application_id: "número de solicitud",
  events: "actuaciones del expediente", annotations: "anotaciones del registro", holders: "titulares", representatives: "representantes", classes: "clases de Niza y cobertura",
  trademark: "características de la marca", status: "estado del expediente", dates: "fechas del expediente", related_records: "expedientes relacionados",
  source: "fuente de los antecedentes", sign_type: "tipo de marca", nice_class: "clase de Niza", coverage_text: "cobertura", country: "país", name: "nombre", rut: "RUT", dv: "dígito verificador",
  filed_at: "fecha de presentación", published_at: "fecha de publicación", registered_at: "fecha de registro", expires_at: "fecha de vencimiento", last_changed_at: "última modificación",
  status_description: "descripción de la actuación", event_date: "fecha de la actuación", event_id: "referencia de la actuación", status_code: "código de la actuación", due_date: "vencimiento informado",
};
export function legalFieldLabel(key: string): string { return fields[key.replace(/^inapi\./, "")] ?? (/^[A-ZÁÉÍÓÚÑ]/.test(key) ? key : "Antecedente del expediente"); }
export function legalText(text: string): string {
  return text.replace(/\b(?:inapi\.)?[a-z]+(?:_[a-z]+)+\b/g, key => legalFieldLabel(key));
}
const actions: Record<string, string> = {
  "brand.monitoring_changed": "Cambio en la vigilancia de una marca", "watch.settings_changed": "Límites de similitud actualizados", "match.followed": "Coincidencia incorporada a seguimiento",
  "opposition.role_corrected": "Calidad de la parte corregida en la oposición", "opposition.received": "Oposición recibida", "opposition.created": "Oposición presentada incorporada",
  "brand.created": "Marca incorporada a la cartera", "brand.imported_by_rut": "Marca incorporada por RUT", "portfolio.imported": "Expediente incorporado a la cartera",
  "case.created": "Caso creado", "case.stage_changed": "Etapa del caso actualizada", "case.match_unlinked": "Vigilancia desvinculada del caso", "case.discarded": "Caso descartado", "case.owner_changed": "Responsable del caso actualizado",
  "member.added": "Usuario incorporado al equipo", "client_updated": "Datos del cliente actualizados", "client.created": "Cliente creado", "brand.client_assigned": "Cliente asociado a la marca",
  "task.save": "Tarea guardada", "task.delete": "Tarea eliminada", "registration.evidence.add": "Antecedente agregado a la solicitud", "registration.evidence.remove": "Antecedente retirado de la solicitud", "registration.evidence.delete": "Antecedente retirado de la solicitud",
};
export function auditAction(action: string, data?: Record<string, unknown>): string {
  if (action === "brand.monitoring_changed" && typeof data?.enabled === "boolean") return data.enabled ? "Vigilancia de la marca activada" : "Vigilancia de la marca pausada";
  return actions[action] ?? (/^[a-z]+[._]/.test(action) ? "Actualización registrada en la plataforma" : action);
}
export function auditEntity(type: string): string {
  return ({ brand: "Marca de la cartera", match: "Coincidencia de vigilancia", case: "Caso jurídico", organization: "Configuración del estudio", task: "Tarea del equipo", application: "Solicitud de registro", client: "Cliente del estudio", user: "Integrante del equipo" } as Record<string, string>)[type] ?? "Registro del estudio";
}
