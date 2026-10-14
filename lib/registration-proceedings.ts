import type { RegistrationApplication } from "./registration-data";

/** Procedural opposition acts, not the mere existence of an opposition window. */
export function hasContestedProceeding(application: RegistrationApplication): boolean {
  return application.history.some(event => {
    const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const title = normalize(event.status ?? "");
    const detail = normalize(event.detail ?? "");
    const negative = /sin oposici|no (?:se )?(?:ha[n]? )?(?:presentad|formulad).*oposici/;
    if (event.code === "484") return true;
    if (!negative.test(title) && (/contencios|demanda de nulidad|juicio de nulidad/.test(title) || /oposici/.test(title) && /demanda|presenta|traslado|contesta|juicio|sentencia|oponente|prueba|interpuesta|formulada|notifica/.test(title))) return true;
    // Boilerplate about the expired opposition window and a "solicitud
    // presentada" elsewhere in a long observation is not an opposition act.
    return !negative.test(detail) && /\b(?:demanda|juicio) de (?:oposici|nulidad)|\b(?:traslado|contestacion)\b.{0,80}\boposici|\boposicion(?:es)?\b.{0,80}\b(?:presentad[ao]s?|interpuest[ao]s?|formulad[ao]s?|admitid[ao]s?|acogid[ao]s?|rechazad[ao]s?)\b/.test(detail);
  });
}

/** A dated administrative acceptance, not an inferred finality or status update.
 * Empty dates remain eligible for review; undefined means the act is not known
 * to be administrative. Terminal outcomes and pending appeals never reopen pay. */
export function administrativeAcceptanceDate(application: RegistrationApplication): string | undefined {
  if (application.provider !== "inapi" || !["finality-pending", "accepted-payment", "partial-payment", "partial-appeal"].includes(application.statusId) || hasContestedProceeding(application)) return;
  const administrative = (code?: string, description?: string) => {
    const text = (description ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (code === "484" || /fallo|contencios|oposici/.test(text)) return false;
    return code === "029" || /^resolucion de aceptacion (?:parcial )?a registro\b/.test(text);
  };
  const act = application.procedure;
  if (administrative(act?.sourceActCode, act?.sourceActDescription)) return act?.sourceActDate ?? "";
  // A later finality certificate can become the primary act. Retain the
  // original administrative acceptance as this convention's calculation base.
  return application.history.filter(event => administrative(event.code, event.status))
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
}
