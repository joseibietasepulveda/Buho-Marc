import type { SimilarityHit, SimilarityMark } from './similarity-contract';

export type DiscoveryKind = 'baseline' | 'filing' | 'publication' | 'status-change';
export type CommercialRelevance = 'related' | 'unknown' | 'unrelated';

// Product triage, not a legal determination. Broad families deliberately retain
// adjacent goods/services; no result is deleted by this filter.
const relatedClassFamilies = [
  [1, 2, 4], [3, 5, 10, 44], [6, 7, 8, 11, 37], [7, 12, 37, 39],
  [9, 38, 42], [9, 16, 41], [16, 40, 41], [17, 19, 20, 21, 37],
  [18, 22, 23, 24, 25, 26, 27], [25, 28, 41],
  [29, 30, 31, 32, 33, 43], [31, 44], [36, 37],
];
const generic = new Set('para como todos todas otros otras productos servicios clase clases relacionados comprendidos incluidos venta ventas comercio comercializacion menor mayor detalle por con los las del una unos unas este esta estos estas tales entre sobre mediante incluyendo relacionados relacionadas general'.split(' '));
function terms(classes: SimilarityMark['classes']) {
  return new Set(classes.flatMap(c => (c.coverage_text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z]{5,}/g) ?? []).filter(word => !generic.has(word)));
}
export function commercialRelevance(own: SimilarityMark['classes'], other: SimilarityMark['classes']): CommercialRelevance {
  if (!own?.length || !other?.length) return 'unknown';
  if (own.some(a => other.some(b => a.nice_class === b.nice_class || relatedClassFamilies.some(f => f.includes(a.nice_class) && f.includes(b.nice_class))))) return 'related';
  const ownTerms = terms(own), otherTerms = terms(other);
  if ([...ownTerms].filter(term => otherTerms.has(term)).length >= 2) return 'related';
  // Retail and manufacturing may relate to any product family. Missing or broad
  // coverage must remain visible for human review rather than imply irrelevance.
  if ([...own, ...other].some(c => [35, 40].includes(c.nice_class)) || !ownTerms.size || !otherTerms.size) return 'unknown';
  return 'unrelated';
}

export function discoveryKind(hit: SimilarityHit, startedDay: string, previous?: { hit: SimilarityHit; discoveryKind?: DiscoveryKind }): DiscoveryKind {
  if (previous && previous.hit.status !== hit.status) return 'status-change';
  if (previous?.discoveryKind && previous.discoveryKind !== 'baseline') return previous.discoveryKind;
  if (hit.publishedAt && hit.publishedAt >= startedDay) return 'publication';
  if (hit.filedAt && hit.filedAt >= startedDay) return 'filing';
  return 'baseline';
}

export const discoveryLabels: Record<DiscoveryKind, string> = {
  baseline: 'Antecedente anterior a la vigilancia', filing: 'Nueva solicitud',
  publication: 'Nueva publicación', 'status-change': 'Cambio de estado',
};
