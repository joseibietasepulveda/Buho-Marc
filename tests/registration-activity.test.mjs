import test from "node:test";
import assert from "node:assert/strict";
import { activityContent, activityDate, latestActivityFirst } from "../lib/registration-activity.ts";

test("INAPI movements without status display the act and preserve the complete observation", () => {
  const detail = "Resolución de observaciones de forma 2026/184063 · Acompañe poder.\nhttps://tramites.inapi.cl/documento";
  assert.deepEqual(activityContent({ date: "2026-07-31", detail }), { title: "Resolución de observaciones de forma 2026/184063", detail });
});
test("missing, whitespace and legacy sentinel values never become user-facing statuses", () => {
  for (const event of [{}, { status: "undefined", detail: " null " }, { status: " ", detail: "" }]) {
    assert.equal(activityContent(event).title, "Movimiento sin descripción disponible");
  }
  assert.equal(activityContent({ intake: true }).title, "Ingreso de solicitud a INAPI");
  assert.equal(activityContent({ status: "Registro concedido" }).title, "Registro concedido");
});
test("long unstructured source text stays available in full", () => {
  const detail = "Observación de la fuente ".repeat(30);
  const activity = activityContent({ detail });
  assert.ok(activity.title.length <= 160);
  assert.equal(activity.detail, detail.trim());
});
test("newest dates first, stable same-day ordering and missing dates last without mutating the source", () => {
  const events = [{ date: "" }, { date: "2026-06-11" }, { date: "2026-09-04", detail: "a" }, { date: "2026-09-04", detail: "b" }, { date: "invalid" }];
  assert.deepEqual(latestActivityFirst(events), [events[2], events[3], events[1], events[0], events[4]]);
  assert.equal(events[0].date, "");
  for (const date of ["", "undefined", "2026-02-30", "2026-13-01"]) assert.equal(activityDate(date), "");
  assert.equal(activityDate("2026-09-04T00:00:00Z"), "2026-09-04");
});
