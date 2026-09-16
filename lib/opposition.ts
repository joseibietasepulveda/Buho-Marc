import type { SourceRecord } from "./source-contract";
export type OppositionProceeding = {
  role: "opponent" | "respondent";
  opponent: string;
  applicationCode?: string;
  basisCode?: string;
  basisName?: string;
  filedAt?: string;
  documentUrl?: string;
  note?: string;
  record: SourceRecord;
};

// A publication window alone is not an opposition filed against the applicant.
export function hasReceivedOpposition(record: SourceRecord): boolean {
  if (["opposition-answer", "opposition-answered"].includes(record.status)) return true;
  const events = (record.inapi?.events ?? []) as { status_description?: string }[];
  return events.some(event => {
    const text = (event.status_description ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (/sin oposicion|no se (?:ha |han )?present|plazo.{0,35}oposici|oposici.{0,35}plazo/.test(text)) return false;
    return /(?:oposicion|oposiciones)/.test(text) && /presenta|presento|traslado|contest|demanda|interpuest|deducid|notific/.test(text);
  });
}
