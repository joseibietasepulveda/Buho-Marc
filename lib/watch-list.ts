import type { SimilarityHit } from './similarity-contract';
export type WatchLevel = 'Alta' | 'Media' | 'Baja';
export type WatchStatus = 'Pendiente de clasificación' | 'En seguimiento' | 'Convertida en caso' | 'Descartada';
export type WatchHit = SimilarityHit & { level?: WatchLevel | 'Sin clasificar' };
export type WatchTarget = { id: string; name: string; applicationId: string; image: string; ownStatus: string; paused: boolean; status: string; error?: string; reviewedAt: string | null; nextReviewAt: string | null; warnings: string[]; results: WatchHit[]; savedResults?: WatchHit[] };
export const watchStatuses: WatchStatus[] = ['Pendiente de clasificación', 'En seguimiento', 'Convertida en caso', 'Descartada'];
export const reviewStatus = (hit: WatchHit): WatchStatus => !hit.reviewStatus || hit.reviewStatus === 'Detectada' ? 'Pendiente de clasificación' : hit.reviewStatus as WatchStatus;
const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
export function watchHits(target: WatchTarget): WatchHit[] {
  const hits = new Map(target.results.map(hit => [hit.applicationId, hit]));
  for (const hit of target.savedResults ?? []) if (!hits.has(hit.applicationId)) hits.set(hit.applicationId, hit);
  return [...hits.values()];
}
export function filterWatchTargets(targets: WatchTarget[], query: string, levels: WatchLevel[], statuses: WatchStatus[]) {
  const needle = fold(query);
  return targets.flatMap(target => {
    const ownNameMatches = fold(`${target.name} ${target.applicationId}`).includes(needle);
    const hits = watchHits(target).filter(hit =>
      (ownNameMatches || fold(`${hit.name} ${hit.applicationId} ${hit.holders.map(h => h.name).join(' ')}`).includes(needle)) &&
      (!levels.length || levels.some(level => level === hit.level)) &&
      (!statuses.length || statuses.includes(reviewStatus(hit)))
    );
    return hits.length || (ownNameMatches && !levels.length && !statuses.length) ? [{ target, hits }] : [];
  });
}
