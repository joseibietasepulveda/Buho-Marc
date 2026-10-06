import type { WatchPage } from "./watch-page";
import type { WatchHit } from "./watch-list";

// Confirmed writes update the visible page without waiting for another snapshot.
export function updateWatchPage(page: WatchPage, id: string, patch: Pick<WatchHit, "reviewStatus" | "watchPublication">): WatchPage {
  const allRows = [...page.featured, ...page.groups.flatMap(group => group.rows), ...page.followed];
  const source = allRows.find(row => row.hits.some(hit => hit.matchId === id));
  const prior = source?.hits.find(hit => hit.matchId === id);
  if (!source || !prior) return page;
  const update = (row: typeof source) => ({ ...row, hits: row.hits.map(hit => hit.matchId === id ? { ...hit, ...patch } : hit) });
  let followed = page.followed.map(update);
  const previouslyFollowed = ["En seguimiento", "Convertida en caso"].includes(prior.reviewStatus ?? "");
  const nowFollowed = ["En seguimiento", "Convertida en caso"].includes(patch.reviewStatus ?? "");
  if (nowFollowed && !followed.some(row => row.hits.some(hit => hit.matchId === id))) {
    const hit = { ...prior, ...patch };
    const row = followed.find(row => row.target.id === source.target.id);
    followed = row ? followed.map(entry => entry === row ? { ...entry, total: entry.total + 1, hits: [...entry.hits, hit] } : entry) : [...followed, { ...source, total: 1, hits: [hit] }];
  }
  if (!nowFollowed) followed = followed.map(row => ({ ...row, total: row.total - row.hits.filter(hit => hit.matchId === id).length, hits: row.hits.filter(hit => hit.matchId !== id) })).filter(row => row.total > 0);
  const visibleRows = (rows: WatchPage["featured"]) => rows.map(update).map(row => patch.reviewStatus === "Descartada" ? { ...row, total: row.total - row.hits.filter(hit => hit.matchId === id).length, hits: row.hits.filter(hit => hit.matchId !== id) } : row).filter(row => row.hits.length > 0);
  const wasPending = !previouslyFollowed && prior.reviewStatus !== "Descartada";
  return { ...page, featured: visibleRows(page.featured), groups: page.groups.map(group => ({ ...group, rows: visibleRows(group.rows), totalGroups: group.totalGroups - (group.rows.length - visibleRows(group.rows).length) })), followed,
    followedCount: Math.max(0, page.followedCount + (nowFollowed ? previouslyFollowed ? 0 : 1 : previouslyFollowed ? -1 : 0)),
    followedTotalGroups: Math.max(page.followedTotalGroups, followed.length),
    count: Math.max(0, page.count - (wasPending && (prior.discoveryKind ?? "baseline") !== "baseline" ? 1 : 0)),
    baselineCount: Math.max(0, page.baselineCount - (wasPending && (prior.discoveryKind ?? "baseline") === "baseline" ? 1 : 0)) };
}

// Keep the new case link in its original card while the same filters are open.
// A changed filter uses the new server page as-is; no session data is persisted.
export function retainConvertedFindings(next: WatchPage, current: WatchPage): WatchPage {
  const liveConverted = new Set(next.followed.flatMap(row => row.hits.filter(hit => hit.reviewStatus === "Convertida en caso").map(hit => hit.matchId)));
  function retain(rows: WatchPage["featured"], previous: WatchPage["featured"]) {
    const result = [...rows];
    for (const row of previous) {
      const saved = row.hits.filter(hit => hit.reviewStatus === "Convertida en caso" && liveConverted.has(hit.matchId) && !rows.some(entry => entry.hits.some(candidate => candidate.matchId === hit.matchId)));
      if (!saved.length) continue;
      const index = result.findIndex(entry => entry.target.id === row.target.id);
      if (index < 0) result.push({ ...row, hits: saved, total: saved.length });
      else result[index] = { ...result[index], hits: [...result[index].hits, ...saved], total: result[index].total + saved.length };
    }
    return result;
  }
  return { ...next, featured: retain(next.featured, current.featured), groups: next.groups.map(group => {
    const rows = retain(group.rows, current.groups.find(previous => previous.level === group.level)?.rows ?? []);
    return { ...group, rows, totalGroups: Math.max(group.totalGroups, rows.length) };
  }) };
}
