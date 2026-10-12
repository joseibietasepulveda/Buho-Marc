import type { SimilarityHit } from "./similarity-contract";
const identityText = (value:string) => value.trim().replace(/\s+/g,' ').normalize('NFC').toLocaleLowerCase('es');
export function selectReportHits(hits:SimilarityHit[],selectedIds?:string[]) {
  const ordered=[...hits].sort((a,b)=>b.score-a.score || a.applicationId.localeCompare(b.applicationId));
  return selectedIds === undefined ? ordered.slice(0,5) : ordered.filter(hit=>selectedIds.includes(hit.applicationId));
}

/** A relevant mark can have several applications; keep every source record. */
export function reportMarkGroups(hits: SimilarityHit[]) {
  const groups = new Map<string, {hit: SimilarityHit; members: SimilarityHit[]}>();
  for (const hit of hits) {
    const holders = [...new Set(hit.holders.map(holder=>identityText(holder.name)).filter(Boolean))].sort();
    const name=identityText(hit.name);
    const named=Boolean(name && name!=='marca figurativa sin denominación');
    const key = named && holders.length ? JSON.stringify([name,holders]) : `application:${hit.applicationId}`;
    const group = groups.get(key);
    if (group) { group.members.push(hit); if (!group.hit.image && hit.image) group.hit = hit; }
    else groups.set(key,{hit,members:[hit]});
  }
  return [...groups.values()];
}

/** Repair missing comma spacing in generated prose, preserving numeric commas. */
export function conclusionText(value: string) {
  return value.normalize('NFC').replace(/,(?=[\p{L}“"¿¡])/gu, ', ');
}
