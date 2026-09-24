import type { WatchHit, WatchTarget } from './watch-list';

// TEMPORARY: user-selected examples from the “Bueno” tab, in document order.
// https://docs.google.com/document/d/14FKhsw800v05jSoRXR1t9m3FxZiBfKkselfqLJjTc9Q/edit?tab=t.s6ula3boj36e
// Remove this file and its call sites after the demonstration on 2026-09-24.
// No score, state, evidence, filter or persisted result is modified.
export const DEMO_ORDER_EXPIRES_AT = '2026-09-24T23:00:00-03:00';
export const DEMO_WATCH_ORDER: readonly (readonly [string, readonly string[]])[] = [
  ['1660689', ['872236', '914119', '1093757', '1345467']], // SELLA
  ['1652054', ['1689032']], // Safaera
  ['1671015', ['968788', '1470127', '1499795']], // Manzanar
  ['1644808', ['1397032', '1107467']], // Maison Dubai Niche
  ['1655576', ['899244']], // GRANDES MUJERES CHILENAS
  ['1669816', ['1688581']], // The Crack
  ['1671211', ['1168350']], // RITUAL
  ['1653684', ['1549674']], // DECOMAV
  ['1670667', ['1538826']], // Samy happy pets
  ['1649633', ['1649631']], // ALIMENTOS WINKLER
  ['1659879', ['1686028']], // Play and Glow
  ['1652393', ['1081570', '1290829']], // INIZZI
  ['1675718', ['929852']], // MIA VIK
  ['1659720', ['1677848', '1685987']], // La Perla del Maule
  ['1641401', ['1136969']], // Sirena Loca
  ['1662227', ['922390', '1016748', '1016753', '1222196']], // The Founders Lab - TFL
  ['1671034', ['1196533', '1196534', '1241195', '1583918']], // AMAPOLA
  ['1654707', ['1273863', '1553947', '1663900', '1311144']], // LUCRECIA MICHAUD
  ['1663190', ['1598486']], // SUSAN ANANIAS NOVIAS: only the uncrossed-out comparison
];

export function demoWatchOrderActive(organization: string, environment: string | undefined, now = Date.now()) {
  return organization === '10000000-0000-4000-8000-000000000001'
    && environment === '9e2891f0-7281-4872-a992-2c48866a782d'
    && now < Date.parse(DEMO_ORDER_EXPIRES_AT);
}

export function orderDemoRows<T extends { target: WatchTarget; hits: WatchHit[] }>(rows: T[]): T[] {
  const rank = (id: string) => { const index = DEMO_WATCH_ORDER.findIndex(([own]) => own === id); return index < 0 ? Infinity : index; };
  return rows.map(row => {
    const selected = DEMO_WATCH_ORDER.find(([own]) => own === row.target.applicationId)?.[1];
    if (!selected) return row;
    const hitRank = (id: string) => { const index = selected.indexOf(id); return index < 0 ? Infinity : index; };
    return { ...row, hits: [...row.hits].sort((a, b) => hitRank(a.applicationId) - hitRank(b.applicationId) || 0) };
  }).sort((a, b) => rank(a.target.applicationId) - rank(b.target.applicationId) || 0);
}
