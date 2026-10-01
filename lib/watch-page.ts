import { discoveryGroups, featuredGroups, followedGroups, DEFAULT_PUBLICATION_FILTER, type PublicationFilter, type WatchTarget } from "./watch-list";
import { watchSettingsSchema, type WatchSettings } from "./watch-policy";

export type WatchSnapshot = { configured: boolean; automaticEnabled: boolean; settings: WatchSettings; targets: WatchTarget[] };
export function watchPage(snapshot: WatchSnapshot, params: URLSearchParams) {
  const positive = (value: string | null, fallback: number, max: number) => Math.min(max, Math.max(1, Math.floor(Number(value) || fallback)));
  const preview = watchSettingsSchema.safeParse({ high: Number(params.get("high")), medium: Number(params.get("medium")) });
  const settings = params.has("high") && preview.success ? preview.data : snapshot.settings;
  const publication: PublicationFilter = {
    source: ["all", "inapi", "official"].includes(params.get("publication") || "") ? params.get("publication") as PublicationFilter["source"] : DEFAULT_PUBLICATION_FILTER.source,
    from: params.get("from") || "", to: params.get("to") || "",
  };
  const groupLimit = positive(params.get("groups"), 10, 2000);
  const scope = params.get('scope') === 'baseline' ? 'baseline' : 'new';
  const relevance = params.get('relevance') === 'all' ? 'all' : 'related';
  const newGroups = discoveryGroups(snapshot.targets, params.get("q") || "", settings, publication, 'new', relevance);
  const baselineGroups = discoveryGroups(snapshot.targets, params.get("q") || "", settings, publication, 'baseline', relevance);
  const groups = scope === 'baseline' ? baselineGroups : newGroups;
  const featured = featuredGroups(snapshot.targets, params.get("q") || "", publication);
  const groupCount = (groups: typeof newGroups) => groups.reduce((n, g) => n + g.rows.reduce((m, r) => m + r.hits.length, 0), 0);
  const followed = followedGroups(snapshot.targets, params.get("q") || "", publication);
  const pageRows = (rows: typeof followed, band: string) => rows.slice(0, groupLimit).map(row => ({
    ...row, total: row.hits.length,
    hits: row.hits.slice(0, positive(params.get(`limit:${band}:${row.target.id}`), 5, 10000)),
    target: { ...row.target, results: [], savedResults: [] },
  }));
  const followState = params.get("followState") || "all";
  const filteredFollowed = followed.map(row => ({ ...row, hits: row.hits.filter(hit => followState === "all" || hit.reviewStatus === followState) })).filter(row => row.hits.length);
  const ownTargets = snapshot.targets.filter(t => !t.presentationExample);
  return {
    configured: snapshot.configured, automaticEnabled: snapshot.automaticEnabled, settings: snapshot.settings,
    reviewTargets: ownTargets.map(t => ({ id: t.id, name: t.name, paused: t.paused })),
    total: ownTargets.length, reviewed: ownTargets.filter(t => t.reviewedAt).length,
    pending: ownTargets.filter(t => ["queued", "running", "retry"].includes(t.status) && !t.paused).length,
    reviewedAt: ownTargets.reduce<string | null>((latest, t) => t.reviewedAt && (!latest || t.reviewedAt > latest) ? t.reviewedAt : latest, null),
    scope, relevance, count: groupCount(newGroups), baselineCount: groupCount(baselineGroups),
    followedCount: followed.reduce((n, r) => n + r.hits.length, 0),
    groups: groups.map(g => ({ level: g.level, totalGroups: g.rows.length, rows: pageRows(g.rows, g.level) })),
    featured: featured.map(row => ({ ...row, total: row.hits.length, target: { ...row.target, results: [], savedResults: [] } })),
    followed: pageRows(filteredFollowed, "follow"), followedTotalGroups: filteredFollowed.length,
  };
}
export type WatchPage = ReturnType<typeof watchPage>;
