import test from "node:test";
import assert from "node:assert/strict";
import { isCompletePortfolioReview, nextSourceReview, santiagoDay, sourceReviewDate } from "../lib/source-schedule.ts";

test("next daily review is 12:30 Santiago, with winter and summer offsets", () => {
  assert.equal(nextSourceReview(new Date("2026-07-10T14:00:00Z"), true), "2026-07-10T16:30:00.000Z");
  assert.equal(nextSourceReview(new Date("2026-09-10T14:00:00Z"), true), "2026-09-10T15:30:00.000Z");
  assert.equal(nextSourceReview(new Date("2026-09-10T15:30:00Z"), true), "2026-09-11T15:30:00.000Z");
});
test("next review resolves the new offset across Chile's September transition", () => {
  assert.equal(nextSourceReview(new Date("2026-09-05T22:00:00Z"), true), "2026-09-06T15:30:00.000Z");
  assert.equal(nextSourceReview(new Date("2026-09-10T00:00:00Z"), false), null);
});
test("relative labels use Santiago's day and an explicit midday p.m.", () => {
  const now = new Date("2026-09-11T01:00:00Z");
  assert.equal(santiagoDay(now), "2026-09-10");
  assert.equal(sourceReviewDate("2026-09-10T15:30:00Z", now), "10/09/2026 (hoy) a las 12:30 p. m.");
  assert.equal(sourceReviewDate("2026-09-09T15:32:00Z", now), "09/09/2026 (ayer) a las 12:32 p. m.");
  assert.equal(sourceReviewDate("2026-09-11T15:30:00Z", now), "11/09/2026 (mañana) a las 12:30 p. m.");
  assert.equal(sourceReviewDate("2026-09-10T12:00:00Z", now), "10/09/2026 (hoy) a las 9:00 a. m.");
  assert.equal(sourceReviewDate("invalid", now), "Fecha no disponible");
});
test("initial, enrollment, incomplete and failed reviews do not replace a complete success", () => {
  const run = { id: "run", trigger: "manual", status: "success", completed_at: "2026-09-10T15:30:00Z", started_at: "2026-09-10T15:29:00Z", requested: 100, received: 100 };
  assert.equal(isCompletePortfolioReview(run), true);
  assert.equal(isCompletePortfolioReview({ ...run, trigger: "scheduled" }), true);
  for (const override of [{ trigger: "initial" }, { trigger: "enrollment" }, { received: 99 }, { requested: 0 }, { status: "failed" }, { status: "running" }, { completed_at: null }]) assert.equal(isCompletePortfolioReview({ ...run, ...override }), false);
});
