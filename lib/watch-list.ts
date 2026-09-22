import { discoveryLevel, discoveryOrder, hiddenDiscoveryState, type WatchSettings } from './watch-policy';
import type { SimilarityHit } from './similarity-contract';
export type WatchLevel = 'Alta' | 'Media' | 'Baja';
export type WatchStatus = 'Pendiente de clasificación' | 'En seguimiento' | 'Convertida en caso' | 'Descartada';
export type WatchHit = SimilarityHit & { level?: WatchLevel | 'Sin clasificar' };
export type WatchTarget = { id: string; name: string; applicationId: string; image: string; ownStatus: string; classes?: number[]; type?: string; paused: boolean; status: string; error?: string; reviewedAt: string | null; nextReviewAt: string | null; warnings: string[]; results: WatchHit[]; savedResults?: WatchHit[] };
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

export type PublicationFilter = { source: 'all' | 'inapi' | 'official'; from: string; to: string };
export const DEFAULT_PUBLICATION_FILTER: PublicationFilter = { source: 'all', from: '', to: '' };
export function matchesPublication(hit: Pick<SimilarityHit, 'publishedAt'>, filter = DEFAULT_PUBLICATION_FILTER) {
  const day = hit.publishedAt?.slice(0, 10);
  if (filter.from && filter.to && filter.from > filter.to) return false;
  const source = filter.from || filter.to ? 'official' : filter.source;
  if (source === 'inapi') return !day;
  if (source === 'official' && !day) return false;
  return (!filter.from || !!day && day >= filter.from) && (!filter.to || !!day && day <= filter.to);
}
export function discoveryGroups(targets: WatchTarget[], query: string, settings: WatchSettings, publication = DEFAULT_PUBLICATION_FILTER) {
  return (['Alta', 'Media'] as const).map(level => ({ level, rows: filterWatchTargets(targets, query, [], ['Pendiente de clasificación']).flatMap(({ target, hits }) => {
    const visible = hits.filter(hit => !hiddenDiscoveryState(hit.status) && matchesPublication(hit, publication) && discoveryLevel(hit, settings) === level).sort(discoveryOrder);
    return visible.length ? [{ target, hits: visible }] : [];
  }).sort((a,b) => (b.hits[0]?.score ?? 0) - (a.hits[0]?.score ?? 0) || a.target.name.localeCompare(b.target.name,'es')) }));
}
export function followedGroups(targets: WatchTarget[], query: string, publication = DEFAULT_PUBLICATION_FILTER) {
  return filterWatchTargets(targets, query, [], ['En seguimiento', 'Convertida en caso']).flatMap(({target,hits}) => {
    const visible = hits.filter(hit => matchesPublication(hit, publication)).sort(discoveryOrder);
    return visible.length ? [{target, hits:visible}] : [];
  });
}
