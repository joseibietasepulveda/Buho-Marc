import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

test("local HTTP + PostgreSQL: task dates, assignees, edits, isolation and deletion", { skip: !process.env.TASK_TEST_BASE_URL }, async () => {
  const origin = new URL(process.env.TASK_TEST_BASE_URL).origin;
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Only use a disposable local database");
  const read = async path => { const r = await fetch(origin + path); assert.equal(r.status, 200); return r.json(); };
  const post = (path, input, sendOrigin = true) => fetch(origin + path, { method: "POST", headers: { "content-type": "application/json", ...(sendOrigin ? { origin } : {}) }, body: JSON.stringify(input) });
  const portfolio = (await read("/api/demo")).data;
  const applications = (await read("/api/registrations")).applications;
  for (const kind of ["case", "application"]) {
    const entities = kind === "case" ? portfolio.cases : applications;
    assert.ok(entities.length >= 2);
    const task = { id: randomUUID(), title: "Prueba automática v0.4", status: "pending", dueDate: "2026-09-16", assigneeId: portfolio.users[1].id };
    const save = (patch = {}, entityId = entities[0].id) => kind === "case" ? post("/api/demo", { action: "saveCaseTask", id: entityId, task: { ...task, ...patch } }) : post("/api/tasks", { action: "save", entityType: "application", entityId, task: { ...task, ...patch } });
    const stored = async () => kind === "case" ? (await read("/api/demo")).data.cases.find(c => c.id === entities[0].id).tasks.find(t => t.id === task.id) : (await read("/api/registrations")).tasks.find(t => t.id === task.id);
    const remove = () => post("/api/tasks", { action: "delete", entityType: kind, entityId: entities[0].id, taskId: task.id });
    try {
      assert.equal((await save()).status, 200);
      assert.equal((await stored()).dueDate, task.dueDate);
      assert.equal((await stored()).assigneeId, task.assigneeId);
      assert.notEqual((await save({}, entities[1].id)).status, 200, "Cannot move another entity's task by reusing its ID");
      assert.equal((await save({ dueDate: "2026-02-30" })).status, 400);
      assert.notEqual((await save({ assigneeId: randomUUID() })).status, 200);
      assert.equal((await stored()).dueDate, task.dueDate, "Rejected writes preserve task");
      assert.equal((await save({ status: "completed", dueDate: null, assigneeId: null })).status, 200);
      const completed = await stored();
      assert.equal(completed.status, "completed"); assert.equal(completed.dueDate, null); assert.equal(completed.assigneeId, null);
      assert.equal((await remove()).status, 200); assert.equal(await stored(), undefined);
    } finally { if (await stored()) await remove(); }
  }
  const rejected = await post("/api/tasks", { action: "delete", entityType: "case", entityId: portfolio.cases[0].id, taskId: randomUUID() }, false);
  assert.equal(rejected.status, 403);
});
