import type { SourceRecord } from "./source-contract";
export type PortfolioRole = "own" | "third-party";
export function normalizedRut(value: unknown, dv?: unknown) {
  const raw = `${value ?? ""}${dv && !String(value).includes("-") ? `-${dv}` : ""}`.replace(/[.\s-]/g, "").toUpperCase();
  return /^\d{5,9}[\dK]$/.test(raw) ? `${raw.slice(0, -1)}-${raw.slice(-1)}` : "";
}
export function normalizedPartyName(value: string) { return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().replace(/\s+/g, " ").toLocaleUpperCase("es"); }
export function recordParties(record: SourceRecord, role: "holders" | "representatives") {
  const raw = record.inapi?.[role] as { name?: string; rut?: string | number; dv?: string }[] | undefined;
  const parties = raw?.length ? raw : role === "holders" ? [{ name: record.owner, rut: record.ownerRut }] : [];
  const unique = new Map<string, { name: string; rut: string }>();
  for (const p of parties) {
    const name = p.name?.trim(); if (!name || /^no informado$/i.test(name)) continue;
    const rut = normalizedRut(p.rut, p.dv);
    unique.set(rut || normalizedPartyName(name), { name, rut });
  }
  return [...unique.values()];
}
export function representativeForPortfolio(records: { record: SourceRecord; portfolioRole?: string }[]) {
  const counts = new Map<string, Set<string>>();
  for (const { record, portfolioRole } of records) {
    if (portfolioRole === "third-party") continue;
    for (const p of recordParties(record, "representatives")) {
      if (!p.rut) continue;
      const ids = counts.get(p.rut) ?? new Set<string>(); ids.add(record.applicationNumber); counts.set(p.rut, ids);
    }
  }
  const ranked = [...counts].map(([rut, ids]) => ({ rut, count: ids.size })).sort((a, b) => b.count - a.count || a.rut.localeCompare(b.rut));
  return !ranked.length ? { reason: "missing" as const } : ranked[1]?.count === ranked[0].count ? { reason: "tied" as const } : { ...ranked[0], reason: "selected" as const };
}
