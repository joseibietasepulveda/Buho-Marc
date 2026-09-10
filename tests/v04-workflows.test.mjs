import test from "node:test";
import assert from "node:assert/strict";
import { isPriorityNotice, isTitleIssued } from "../lib/notification-policy.ts";
import { significantRegistrationEvent } from "../lib/registration-milestones.ts";
import { caseAgenda, registrationAgenda, urgentAgenda } from "../lib/agenda.ts";
import { exactBrandMatch } from "../lib/brand-search.ts";
import { oppositionEmail } from "../lib/client-email.ts";
import { taskSchema } from "../lib/task-validation.ts";

test("INAPI milestones in the lawyer's reference are priorities, including title without an emission verb", () => {
  for (const title of ["Presentación Solicitud", "Resolución de aceptación a trámite de marca", "Pago de publicación efectuado (Diario Oficial)", "Publicación de marca en Diario Oficial", "Fin de plazo", "Resolución de aceptación a registro", "Pago - Pago final de marcas nuevas", "Constatación de pago completo y en plazo", "Resolución de concesión de marca", "Título de marca 2026/191330"]) {
    assert.equal(isPriorityNotice({ title, urgency: "Media" }), true, title);
    assert.equal(isPriorityNotice({ title: "Nueva actuación", urgency: "Media", changeDetail: { changes: [{ field: "inapi.events", after: [{ status_description: title }] }] } }), true, title);
  }
});
test("administrative changes stay in All even if the notice inherits high urgency", () => {
  for (const field of ["owner", "ownerRut", "representativeName", "inapi.representatives"]) assert.equal(isPriorityNotice({ title: "Se actualizó el representante", urgency: "Alta", changeDetail: { changes: [{ field, after: "Nuevo dato" }] } }), false);
  assert.equal(isPriorityNotice({ title: "Cambio de titularidad", urgency: "Alta" }), false);
  assert.equal(isTitleIssued("Solicitud de título de marca"), false);
  assert.equal(isTitleIssued("Título de marca pendiente de emisión"), false);
  assert.equal(isTitleIssued("Resolución de concesión de marca"), false);
  assert.equal(isTitleIssued("Título de marca 2026/191330"), true);
});
test("registration list does not mistake Fin de plazo for a new procedural state", () => {
  const result = significantRegistrationEvent({ statusId: "substantive-exam", recentEvent: "Fin de plazo", history: [{ date: "2026-09-01", status: "Publicación de marca en Diario Oficial" }, { date: "2026-09-05", status: "Fin de plazo" }] });
  assert.match(result.title, /Publicación/);
  assert.doesNotMatch(result.status, /concedido|Fin de plazo/);
});
test("agenda retains multiple events on a day, never includes closed cases or completed tasks, and includes undated pending tasks", () => {
  const item = { id: "case", title: "Oposición", brand: "ACME", stage: "En seguimiento", deadline: "2026-09-16", deadlineDescription: "Presentar oposición desde la publicación", owner: "Abogado", tasks: [{ id: "a", title: "Preparar", status: "pending", dueDate: "2026-09-16" }, { id: "b", title: "Revisar", status: "completed", dueDate: "2026-09-16" }, { id: "c", title: "Llamar", status: "pending" }] };
  const events = caseAgenda([item, { ...item, id: "closed", stage: "Concluido" }]);
  assert.equal(events.length, 3);
  assert.equal(events.filter(event => event.date === "2026-09-16").length, 2);
  assert.equal(events.find(event => event.category !== "task").category, "inapi");
  assert.equal(urgentAgenda(events, "2026-09-10").length, 2);
});
test("publication management belongs to Diario Oficial while opposition remains INAPI", () => {
  const base = { id: "app", name: "ACME", applicationNumber: "123", filedAt: "2026-06-01", statusId: "accepted-publication", procedure: { notifiedAt: "2026-09-01" }, history: [] };
  assert.equal(registrationAgenda([base], [], "2026-09-10")[0].category, "gazette");
  assert.equal(registrationAgenda([{ ...base, statusId: "opposition-window", publishedAt: "2026-09-01" }], [], "2026-09-10")[0].category, "inapi");
});
test("exact search normalizes RUT punctuation but never accepts a partial name or registration", () => {
  const brand = { name: "MÁREA SUR", rut: "76.123.456-7", registration: "1560998", representativeName: "Estudio Andes", classes: "3, 30" };
  assert.equal(exactBrandMatch(brand, "name", "marea sur"), true);
  assert.equal(exactBrandMatch(brand, "name", "marea"), false);
  assert.equal(exactBrandMatch(brand, "rut", "761234567"), true);
  assert.equal(exactBrandMatch(brand, "any", "156099"), false);
  assert.equal(exactBrandMatch(brand, "representativeName", "Estudio Andes"), true);
  assert.equal(exactBrandMatch(brand, "classes", "03"), true);
});
test("task validation rejects impossible dates and foreign-shaped assignees", () => {
  const task = { id: "10000000-0000-4000-8000-000000000099", title: "Revisar expediente", status: "pending" };
  assert.equal(taskSchema.safeParse({ ...task, dueDate: "2026-02-30" }).success, false);
  assert.equal(taskSchema.safeParse({ ...task, dueDate: "2026-09-16", assigneeId: "someone" }).success, false);
  assert.equal(taskSchema.safeParse({ ...task, dueDate: "2026-09-16", assigneeId: null }).success, true);
});
test("client email preserves the chosen lawyer and escapes content while excluding the internal report", () => {
  const result = oppositionEmail({ name: 'A <script>alert(1)</script>', classes: "35", logo: "/logos/a.png" }, { name: "B", classes: "35", logo: "javascript:alert(1)" }, "Camila León", "CO-1", "https://example.com");
  assert.match(result.text, /Se recomienda presentar oposición/);
  assert.match(result.text, /Camila León$/);
  assert.match(result.html, /<table/);
  assert.match(result.html, /https:\/\/example.com\/logos\/a.png/);
  assert.doesNotMatch(result.html, /<script>|javascript:|\.pdf|informe adjunto/);
});
