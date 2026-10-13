/** User-selected examples in the test workspace. Scores and source states are not overrides. */
export const FEATURED_WATCH_PAIRS = [
  ["1572142", "1670929"], ["1552147", "1672680"],
  ["1659715", "1683639"], ["1659715", "1689486"],
  ["1638707", "997604"], ["1644808", "1397032"],
  ["1675838", "1245326"], ["1652393", "1290829"],
  ["1630024", "1665441"], ["1671216", "1658314"],
] as const;
export const BE_PRESENTATION_PAIRS = [
  ["1572142", "1670929"], ["1320072", "1671049"],
  ["1490801", "1670768"], ["1310436", "1674156"],
] as const;
export function featuredWatchRank(ownApplication: string, otherApplication: string, organizationSlug = "estudio-ibieta-ip"): number | undefined {
  if (organizationSlug === "barros-errazuriz") {
    const index = BE_PRESENTATION_PAIRS.findIndex(([own, other]) => own === ownApplication && other === otherApplication);
    return index < 0 ? undefined : index + 1;
  }
  if (organizationSlug !== "estudio-ibieta-ip") return undefined;
  const index = FEATURED_WATCH_PAIRS.findIndex(([own, other]) => own === ownApplication && other === otherApplication);
  return index < 0 ? undefined : index + 1;
}
