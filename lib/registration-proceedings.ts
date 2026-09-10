import type { RegistrationApplication } from "./registration-data";

/** Procedural opposition acts, not the mere existence of an opposition window. */
export function hasContestedProceeding(application: RegistrationApplication): boolean {
  return application.history.some(event => {
    const text = `${event.status ?? ""} ${event.detail ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (/sin oposici|no (?:se )?(?:ha[n]? )?(?:presentad|formulad).*oposici/.test(text)) return false;
    return /contencios|demanda de nulidad|juicio de nulidad/.test(text) || /oposici/.test(text) && /demanda|presenta|traslado|contesta|juicio|sentencia|oponente|prueba|interpuesta|formulada|notifica/.test(text);
  });
}
