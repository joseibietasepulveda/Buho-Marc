import type { SimilarityHit } from "./similarity-contract";
export function selectReportHits(hits:SimilarityHit[],selectedIds:string[]=[]) {
  const ordered=[...hits].sort((a,b)=>b.score-a.score || a.applicationId.localeCompare(b.applicationId));
  return selectedIds.length ? ordered.filter(hit=>selectedIds.includes(hit.applicationId)) : ordered.slice(0,5);
}
