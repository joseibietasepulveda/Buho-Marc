import { discoveryGroups, followedGroups, DEFAULT_PUBLICATION_FILTER, type PublicationFilter, type WatchTarget } from "./watch-list";
import { watchSettingsSchema, type WatchSettings } from "./watch-policy";

export type WatchSnapshot = { configured: boolean; automaticEnabled: boolean; settings: WatchSettings; targets: WatchTarget[]; ai?: { configured: boolean; automatic: boolean; run: { id: string; status: string; evaluated: number; failures: number; limited: boolean; cursor: number; selected: number; error?: string; created_at: string } | null } };
export function watchPage(snapshot: WatchSnapshot, params: URLSearchParams) {
  const positive = (value: string | null, fallback: number, max: number) => Math.min(max, Math.max(1, Math.floor(Number(value) || fallback)));
  const preview = watchSettingsSchema.safeParse({ high: Number(params.get("high")), medium: Number(params.get("medium")) });
  const settings = params.has("high") && preview.success ? preview.data : snapshot.settings;
  const publication: PublicationFilter = {
    source: ["all", "inapi", "official"].includes(params.get("publication") || "") ? params.get("publication") as PublicationFilter["source"] : DEFAULT_PUBLICATION_FILTER.source,
    from: params.get("from") || "", to: params.get("to") || "",
  };
  const groupLimit = positive(params.get("groups"), 30, 2000);
  // Legacy scope parameters are aliases of the unified inbox.
  const scope = 'new' as const;
  const relevance = params.get('relevance') === 'all' ? 'all' : 'related';
  const groups = discoveryGroups(snapshot.targets, params.get("q") || "", settings, publication, 'all', relevance);
  const featured: {target: WatchTarget; hits: WatchTarget["results"]}[] = [];
  const groupCount = (bands: typeof groups) => bands.reduce((n, g) => n + g.rows.reduce((m, r) => m + r.hits.length, 0), 0);
  const followed = followedGroups(snapshot.targets, params.get("q") || "", publication);
  const pageRows = (rows: typeof followed, band: string) => rows.slice(0, groupLimit).map(row => ({
    ...row, total: row.hits.length,
    hits: row.hits.slice(0, positive(params.get(`limit:${band}:${row.target.id}`), 5, 10000)),
    target: { ...row.target, results: [], savedResults: [] },
  }));
  const followState = params.get("followState") || "all";
  const filteredFollowed = followed.map(row => ({ ...row, hits: row.hits.filter(hit => followState === "all" || hit.reviewStatus === followState) })).filter(row => row.hits.length);
  const ownTargets = snapshot.targets.filter(t => !t.presentationExample);
  let remaining = groupLimit;
  const pagedGroups = groups.map(g => {
    const rows = g.rows.flatMap(row => row.hits.map(hit => ({ target: { ...row.target, results: [], savedResults: [] }, hits: [hit], total: 1 }))).sort((a,b) => b.hits[0].score-a.hits[0].score || a.hits[0].applicationId.localeCompare(b.hits[0].applicationId));
    const visible = rows.slice(0, remaining); remaining -= visible.length;
    return { level: g.level, totalGroups: rows.length, rows: visible };
  });
  return {
    ai: snapshot.ai, configured: snapshot.configured, automaticEnabled: snapshot.automaticEnabled, settings: snapshot.settings,
    reviewTargets: ownTargets.map(t => ({ id: t.id, name: t.name, paused: t.paused })),
    total: ownTargets.length, reviewed: ownTargets.filter(t => t.reviewedAt).length,
    pending: ownTargets.filter(t => ["queued", "running", "retry"].includes(t.status) && !t.paused).length,
    reviewedAt: ownTargets.reduce<string | null>((latest, t) => t.reviewedAt && (!latest || t.reviewedAt > latest) ? t.reviewedAt : latest, null),
    scope, relevance, count: groupCount(groups) + featured.reduce((n, row) => n + row.hits.length, 0), baselineCount: 0,
    followedCount: followed.reduce((n, r) => n + r.hits.length, 0),
    groups: pagedGroups,
    featured: featured.map(row => ({ ...row, total: row.hits.length, target: { ...row.target, results: [], savedResults: [] } })),
    followed: pageRows(filteredFollowed, "follow"), followedTotalGroups: filteredFollowed.length,
  };
}
export type WatchPage = ReturnType<typeof watchPage>;
