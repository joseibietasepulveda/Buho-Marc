import test from "node:test";
import assert from "node:assert/strict";
import { buildNotificationTimeline, conciseNoticeTitle, priorityNoticeSummary } from "../lib/notification-timeline.ts";

const act = (id, date, title, observation = "") => ({ event_id: id, event_date: date, status_description: title, status_code: `CODE-${id}`, observation });
const change = (before, after, field = "inapi.events") => ({ field, label: "Actuaciones", before, after, ancillary: false });
const notice = (changes = []) => ({ id: "N1", title: "Nueva actuación en MARCA: Resolución 2026/123456", brand: "MARCA", date: "09 sep 2026", body: "Texto antiguo repetido", changeDetail: { source: "inapi", summary: "Resumen", changes } });

test("complete available timeline unions application history and changed INAPI events without duplicates", () => {
  const published = act("2", "2026-03-25", "Publicación en Diario Oficial", "Observación íntegra");
  const accepted = act("3", "2026-08-10", "Resolución de aceptación a registro 2026/176625");
  const selected = notice([change([], [accepted, published])]);
  const application = { name: "MARCA", applicationNumber: "123", history: [{ date: "2026-01-10", status: "Presentación de solicitud", eventId: "1" }, { date: "2026-03-25", status: published.status_description, eventId: "2" }] };
  const timeline = buildNotificationTimeline(selected, [selected], [application], [{ name: "MARCA", applicationNumber: "123", sourceHistory: [{ date: "2026-03-25", title: published.status_description }] }]);
  assert.equal(timeline.official, true);
  assert.equal(timeline.entries.length, 3);
  assert.deepEqual(timeline.entries.map(entry => entry.date), ["2026-01-10", "2026-03-25", "2026-08-10"]);
  assert.equal(timeline.entries[1].current, true);
  assert.ok(timeline.entries[1].details.some(entry => entry.observation === "Observación íntegra" && entry.status_code === "CODE-2"));
  assert.equal(timeline.entries[2].title, "Resolución de aceptación a registro");
  assert.equal(priorityNoticeSummary(selected), "Resolución de aceptación a registro");
});
test("changed and removed versions are preserved, not silently claimed as current acts", () => {
  const selected = notice([change([act("1", "2026-08-01", "Observación", "Antes"), act("2", "2026-08-02", "Acto retirado")], [act("1", "2026-08-01", "Observación corregida", "Después")])]);
  const timeline = buildNotificationTimeline(selected, [selected]);
  assert.equal(timeline.entries.length, 2);
  assert.equal(timeline.entries[0].previous, false);
  assert.equal(timeline.entries[0].title, "Observación corregida");
  assert.equal(timeline.entries[0].details.length, 2);
  assert.equal(timeline.entries[1].previous, true);
});
test("raw IDs distinguish separate same-day acts with the same description", () => {
  const selected = notice([change([], [act("1", "2026-08-01", "Fin de plazo"), act("2", "2026-08-01", "Fin de plazo")])]);
  assert.equal(buildNotificationTimeline(selected, [selected]).entries.length, 2);
});
test("newest-first notices cannot overwrite the latest correction with an older version", () => {
  const latest = notice([change([], [act("1", "2026-08-01", "Descripción corregida")])]);
  const older = { ...notice([change([], [act("1", "2026-08-01", "Descripción anterior")])]), id: "old", date: "08 sep 2026" };
  const result = buildNotificationTimeline(latest, [latest, older]);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].title, "Descripción corregida");
  assert.equal(result.entries[0].details.length, 2);
});
test("same-name applications do not lend each other their histories", () => {
  const selected = notice([change([], [act("1", "2026-09-01", "Actuación conocida")])]);
  const applications = ["111", "222"].map(applicationNumber => ({ name: "MARCA", applicationNumber, history: [{ date: "2026-01-01", status: "Historia ajena" }] }));
  const timeline = buildNotificationTimeline(selected, [selected], applications);
  assert.equal(timeline.ambiguous, true);
  assert.equal(timeline.entries.length, 1);
  assert.equal(timeline.entries[0].title, "Actuación conocida");
});
test("non-source vigilance timeline is explicitly platform notices, scoped to the same match", () => {
  const selected = { id: "N2", title: "Coincidencia detectada", brand: "MARCA", date: "09 sept 2026", body: "Revisar", matchId: "M1" };
  const older = { ...selected, id: "N1", date: "08 sep 2026" };
  const other = { ...selected, id: "N3", matchId: "M2" };
  const timeline = buildNotificationTimeline(selected, [selected, older, other]);
  assert.equal(timeline.official, false);
  assert.equal(timeline.kind, "notices");
  assert.deepEqual(timeline.entries.map(entry => entry.date), ["2026-09-08", "2026-09-09"]);
  assert.equal(timeline.entries[1].current, true);
});
test("internal reminder combines its application's history with the notice, not another brand or a match", () => {
  const selected = { id: "internal", title: "Recordatorio de respuesta a observación", brand: "MARCA", date: "10 sep 2026", body: "Revisar la respuesta pendiente" };
  const unrelated = { ...selected, id: "other", brand: "OTRA MARCA" };
  const vigilance = { ...selected, id: "watch", matchId: "M-WATCH", title: "Coincidencia de otra solicitud" };
  const application = { name: "MARCA", applicationNumber: "123", provider: "inapi", history: [{ date: "2026-08-01", status: "Presentación de solicitud", eventId: "a1" }, { date: "2026-09-01", status: "Observación de fondo", eventId: "a2", detail: "Detalle original de la observación" }] };
  const otherApplication = { name: "OTRA MARCA", applicationNumber: "456", history: [{ date: "2026-08-02", status: "Historia de otra marca" }] };
  const timeline = buildNotificationTimeline(selected, [selected, unrelated, vigilance], [application, otherApplication]);
  assert.equal(timeline.kind, "acts");
  assert.equal(timeline.official, true);
  assert.equal(timeline.entries.length, 3);
  assert.deepEqual(timeline.entries.map(entry => entry.kind), ["act", "act", "notice"]);
  assert.deepEqual(timeline.entries.map(entry => entry.date), ["2026-08-01", "2026-09-01", "2026-09-10"]);
  assert.equal(timeline.entries[2].key, "notice-internal");
  assert.equal(timeline.entries[2].current, true);
  assert.equal(timeline.entries[2].details[0]["Referencia del aviso"], "internal");
  assert.ok(!JSON.stringify(timeline.entries).includes("Historia de otra marca"));
  assert.ok(!JSON.stringify(timeline.entries).includes("Coincidencia de otra solicitud"));
});
test("match notices never borrow the watched brand's dossier, even when they contain raw source changes", () => {
  const watched = { name: "MARCA", applicationNumber: "123", provider: "inapi", history: [{ date: "2026-01-01", status: "Registro de la marca vigilada", eventId: "watched-act" }] };
  const competitor = act("competitor-act", "2026-09-02", "Publicación de la solicitud competidora");
  const selected = { ...notice([change([], [competitor])]), matchId: "M-COMPETITOR" };
  const timeline = buildNotificationTimeline(selected, [selected], [watched]);
  assert.equal(timeline.entries.length, 1);
  assert.equal(timeline.entries[0].details[0].event_id, "competitor-act");
  const plainMatch = { id: "plain", title: "Coincidencia detectada", brand: "MARCA", date: "10 sep 2026", body: "Revisar", matchId: "M-PLAIN" };
  const plainTimeline = buildNotificationTimeline(plainMatch, [plainMatch], [watched]);
  assert.equal(plainTimeline.kind, "notices");
  assert.equal(plainTimeline.official, false);
  assert.equal(plainTimeline.entries.length, 1);
  const simulatedMatch = { ...selected, changeDetail: { ...selected.changeDetail, source: "simulated" } };
  assert.equal(buildNotificationTimeline(simulatedMatch, [simulatedMatch], [watched]).official, false, "A real watched brand cannot make a simulated competitor event official");
});
test("missing dates stay unknown and actor changes do not create fictional legal acts", () => {
  const selected = notice([change([], [act("1", null, "Actuación sin fecha")]), change([], [{ name: "Abogada" }], "inapi.representatives")]);
  const timeline = buildNotificationTimeline(selected, [selected]);
  assert.equal(timeline.entries.length, 1);
  assert.equal(timeline.entries[0].date, "");
  assert.equal(timeline.entries[0].kind, "act");
});
test("compact headings remove technical references but keep source details untouched", () => {
  assert.equal(conciseNoticeTitle("Nueva actuación en MARCA: Título de marca 2026/191330", "MARCA"), "Título de marca");
  assert.equal(conciseNoticeTitle("Oposición - Presentación C/2023/115525"), "Oposición - Presentación");
  assert.ok(conciseNoticeTitle("Descripción ".repeat(40)).length <= 150);
  const raw = act("12345", "2026-09-10", "Título de marca 2026/191330");
  const selected = notice([change([], [raw])]);
  assert.equal(buildNotificationTimeline(selected, [selected]).entries[0].details[0].status_description, raw.status_description);
});
