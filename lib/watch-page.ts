import { discoveryGroups, followedGroups, DEFAULT_PUBLICATION_FILTER, type PublicationFilter, type WatchTarget } from "./watch-list";
import { watchSettingsSchema, type WatchSettings } from "./watch-policy";
import { DEMO_ORDER_EXPIRES_AT, DEMO_WATCH_ORDER, orderDemoRows } from "./demo-watch-order";

export type WatchSnapshot = { configured: boolean; automaticEnabled: boolean; settings: WatchSettings; targets: WatchTarget[] };
export function watchPage(snapshot: WatchSnapshot, params: URLSearchParams, demoOrder = false) {
  const positive = (value: string | null, fallback: number, max: number) => Math.min(max, Math.max(1, Math.floor(Number(value) || fallback)));
  const preview = watchSettingsSchema.safeParse({ high: Number(params.get("high")), medium: Number(params.get("medium")) });
  const settings = params.has("high") && preview.success ? preview.data : snapshot.settings;
  const publication: PublicationFilter = {
    source: ["all", "inapi", "official"].includes(params.get("publication") || "") ? params.get("publication") as PublicationFilter["source"] : DEFAULT_PUBLICATION_FILTER.source,
    from: params.get("from") || "", to: params.get("to") || "",
  };
  const groupLimit = Math.max(demoOrder ? DEMO_WATCH_ORDER.length : 0, positive(params.get("groups"), 10, 2000));
  const groups = discoveryGroups(snapshot.targets, params.get("q") || "", settings, publication).map(group => demoOrder ? { ...group, rows: orderDemoRows(group.rows) } : group);
  const followed = followedGroups(snapshot.targets, params.get("q") || "", publication);
  const pageRows = (rows: typeof followed, band: string) => rows.slice(0, groupLimit).map(row => ({
    ...row, total: row.hits.length,
    hits: row.hits.slice(0, positive(params.get(`limit:${band}:${row.target.id}`), demoOrder && band === "Alta" ? row.hits.filter(hit => DEMO_WATCH_ORDER.find(([own]) => own === row.target.applicationId)?.[1].includes(hit.applicationId)).length || 5 : 5, 10000)),
    target: { ...row.target, results: [], savedResults: [] },
  }));
  const followState = params.get("followState") || "all";
  const filteredFollowed = followed.map(row => ({ ...row, hits: row.hits.filter(hit => followState === "all" || hit.reviewStatus === followState) })).filter(row => row.hits.length);
  return {
    demoOrderExpiresAt: demoOrder ? DEMO_ORDER_EXPIRES_AT : null,
    configured: snapshot.configured, automaticEnabled: snapshot.automaticEnabled, settings: snapshot.settings,
    reviewTargets: snapshot.targets.map(t => ({ id: t.id, name: t.name, paused: t.paused })),
    total: snapshot.targets.length, reviewed: snapshot.targets.filter(t => t.reviewedAt).length,
    pending: snapshot.targets.filter(t => ["queued", "running", "retry"].includes(t.status) && !t.paused).length,
    reviewedAt: snapshot.targets.reduce<string | null>((latest, t) => t.reviewedAt && (!latest || t.reviewedAt > latest) ? t.reviewedAt : latest, null),
    count: groups.reduce((n, g) => n + g.rows.reduce((m, r) => m + r.hits.length, 0), 0),
    followedCount: followed.reduce((n, r) => n + r.hits.length, 0),
    groups: groups.map(g => ({ level: g.level, totalGroups: g.rows.length, rows: pageRows(g.rows, g.level) })),
    followed: pageRows(filteredFollowed, "follow"), followedTotalGroups: filteredFollowed.length,
  };
}
export type WatchPage = ReturnType<typeof watchPage>;
