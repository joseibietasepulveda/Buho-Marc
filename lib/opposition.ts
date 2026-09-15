import type { SourceRecord } from "./source-contract";
export type OppositionProceeding = {
  role: "opponent";
  opponent: string;
  basisCode?: string;
  basisName?: string;
  filedAt?: string;
  documentUrl?: string;
  note?: string;
  record: SourceRecord;
};
