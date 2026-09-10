/**
 * Evidence checked against INAPI's public Estado Diario, not a date inferred
 * from a resolution or the provider's retrieval timestamp.
 *
 * Scope: only the 19 acceptance-for-processing notices in section M2 below.
 * A public daily-list entry for an observation of substance is NOT sufficient
 * proof of its required electronic notification. Nor does an acceptance for
 * registration entry prove finality or activate the final-payment period.
 *
 * The public PDF identifies application + procedural section. Provider event
 * identifiers/descriptions were cross-checked on the saved Dev source payload;
 * they are additional binding guards, not fields claimed to appear in the PDF.
 */
export const INAPI_DAILY_SOURCE_2026_09_04 = {
  date: "2026-09-04",
  title: "Estado Diario Subdirección de Marcas 04/09/2026 — versión corta",
  url: "https://tramites.inapi.cl/Trademark/TrademarkDailyStatus/DownloadFile?dailyStatesTypeId=1&filedate=04%2F09%2F2026+12%3A00%3A00+a.+m.&stream_id=f222377c-71a8-f111-8956-040973dcfef1",
  sha256: "848dcf8f8be26640f65e30a502283b2dcdc363e049e5bacae219d0f124309b90",
  bytes: 756886,
  verifiedAt: "2026-09-10T16:58:12.691Z",
  section: "M2",
  sectionLabel: "Aceptación a Trámite",
} as const;

export type VerifiedDailyNotice = {
  applicationNumber: string;
  eventId: string;
  statusCode: "009";
  actDate: "2026-09-04";
  description: string;
  notifiedAt: "2026-09-04";
  method: "daily-state";
  section: "M2";
  page: 4 | 5;
  sourceUrl: string;
};

const checkedActs: readonly (readonly [string, string, string, 4 | 5])[] = [
  ["1673959", "331599701", "2026/221639", 4],
  ["1674156", "331599727", "2026/222095", 4],
  ["1674568", "331599765", "2026/222114", 4],
  ["1674588", "331599778", "2026/222152", 4],
  ["1675607", "331600053", "2026/221623", 4],
  ["1675608", "331600070", "2026/221643", 4],
  ["1675626", "331600083", "2026/221645", 4],
  ["1675644", "331600091", "2026/221647", 4],
  ["1675645", "331600100", "2026/221652", 4],
  ["1675646", "331600117", "2026/221659", 4],
  ["1675659", "331600142", "2026/221672", 4],
  ["1675718", "331600155", "2026/221677", 4],
  ["1675729", "331600168", "2026/221679", 4],
  ["1675737", "331600184", "2026/221680", 4],
  ["1675761", "331600197", "2026/222096", 4],
  ["1675836", "331600213", "2026/222130", 4],
  ["1675838", "331600225", "2026/222139", 4],
  ["1675839", "331600242", "2026/222144", 4],
  ["1684636", "331601144", "2026/222203", 5],
];

export const VERIFIED_DAILY_NOTICES: readonly VerifiedDailyNotice[] = checkedActs.map(([applicationNumber, eventId, resolution, page]) => ({
  applicationNumber,
  eventId,
  statusCode: "009",
  actDate: "2026-09-04",
  description: `Resolución de aceptación a trámite de marca ${resolution}`,
  notifiedAt: "2026-09-04",
  method: "daily-state",
  section: "M2",
  page,
  sourceUrl: INAPI_DAILY_SOURCE_2026_09_04.url,
}));

/** Only bind verified evidence to the exact act that was checked. */
export function verifiedDailyNotice(applicationNumber: string, act: {
  event_id?: string | null;
  event_date?: string | null;
  status_code?: string | null;
  status_description?: string | null;
}): VerifiedDailyNotice | undefined {
  return VERIFIED_DAILY_NOTICES.find(item =>
    item.applicationNumber === applicationNumber &&
    item.eventId === act.event_id &&
    item.statusCode === act.status_code &&
    item.actDate === act.event_date?.slice(0, 10) &&
    item.description === act.status_description,
  );
}
