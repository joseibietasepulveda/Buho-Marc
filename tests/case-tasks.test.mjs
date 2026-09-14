import test from "node:test";
import assert from "node:assert/strict";
import { caseTasks, taskPriority, hasPendingTaskPriority } from "../lib/case-tasks.ts";
test("priority filter uses pending task priorities and defaults existing tasks to Media", () => {
  const tasks = [{ id: "old", status: "pending" }, { id: "done", status: "completed", priority: "Alta" }, { id: "low", status: "pending", priority: "Baja" }];
  assert.equal(taskPriority(tasks[0]), "Media");
  assert.equal(hasPendingTaskPriority(tasks, "Alta"), false);
  assert.equal(hasPendingTaskPriority(tasks, "Media"), true);
  assert.equal(hasPendingTaskPriority(tasks, "Baja"), true);
  assert.equal(hasPendingTaskPriority([], ""), true);
  assert.equal(hasPendingTaskPriority([], "Alta"), false);
});
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
