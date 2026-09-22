import type { SimilarityHit } from './similarity-contract';
import { resolveSimilarityState } from './similarity-state';

// Verified against INAPI's official daily records, not inferred from provider code P.
// Keep source observations intact; amend this registry only with newer official evidence.
export const VERIFIED_DECISIONS = {
  '1367215': {
    status: 'Rechazada definitivamente', firmAt: '2024-03-13', verifiedAt: '2026-09-22',
    sources: [
      { date: '2024-02-14', title: 'Fallo de rechazo', page: 66, url: 'https://tramites.inapi.cl/Trademark/TrademarkDailyStatus/DownloadFile?dailyStatesTypeId=1&filedate=14%2F02%2F2024+12%3A00%3A00+a.+m.&stream_id=b6d60b9f-41cb-ee11-892f-040973dcfef1' },
      { date: '2024-03-13', title: 'Certificación de decisión en firme por no recurso', page: 55, url: 'https://tramites.inapi.cl/Trademark/TrademarkDailyStatus/DownloadFile?dailyStatesTypeId=1&filedate=13%2F03%2F2024+12%3A00%3A00+a.+m.&stream_id=66797f4f-42e1-ee11-892f-040973dcfef1' },
    ],
  },
} as const;
export const verifiedTerminalApplications = Object.keys(VERIFIED_DECISIONS);
export function applyVerifiedDecision<T extends SimilarityHit>(hit: T): T {
  const decision = VERIFIED_DECISIONS[hit.applicationId as keyof typeof VERIFIED_DECISIONS];
  if (!decision) return resolveSimilarityState(hit);
  return { ...hit, status: decision.status, officialDecision: { ...decision, sources: [...decision.sources], sourceStatus: hit.officialDecision?.sourceStatus ?? hit.status },
    history: [...hit.history, ...decision.sources.filter(source => !hit.history.some(event => event.date === source.date && event.title === source.title)).map(source => ({ date: source.date, title: source.title, detail: `Antecedente oficial verificado en Estado Diario INAPI, página ${source.page}.` }))],
  };
}
