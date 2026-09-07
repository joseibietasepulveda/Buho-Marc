import test from "node:test";
import assert from "node:assert/strict";
import { caseTasks } from "../lib/case-tasks.ts";
test("legal suggestions start as not applicable and never create pending work", () => {
  assert.ok(caseTasks().length > 0);
  assert.ok(caseTasks().every(task => task.status === "not-applicable"));
});
test("saved custom tasks and completed suggestions retain their state without duplicates", () => {
  const saved = [{ id: "custom", title: "Preparar contestación para clase 35", status: "pending" }, { id: "saved", title: "Preparar escrito de oposición", status: "completed" }];
  const result = caseTasks(saved);
  assert.equal(result.filter(task => task.title === "Preparar escrito de oposición").length, 1);
  assert.equal(result.find(task => task.id === "custom").status, "pending");
  assert.equal(result.find(task => task.id === "saved").status, "completed");
  assert.equal(saved.length, 2);
});
