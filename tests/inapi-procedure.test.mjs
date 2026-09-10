import test from "node:test";
import assert from "node:assert/strict";
import { inapiProcedure, normalizeInapi, reprojectInapiRecord, stageForAct } from "../lib/inapi-provider.ts";
import { updatedApplication } from "../db/source.ts";
import { compareRecords, describeChanges, sourceRecordSchema } from "../lib/source-contract.ts";

const act = (description, date, extra = {}) => ({ event_id: date, event_date: date, status_code: null, status_description: description, ...extra });

test('negative notification and finality wording never confirms the missing legal event', () => {
  for (const description of ['Resolución de observaciones de fondo pendiente de notificación', 'Notificación fallida de observaciones de fondo', 'Observaciones de fondo sin notificación', 'Observaciones de fondo no notificadas', 'Notificación de observaciones de fondo solicitada', 'Notificación de observaciones de fondo anulada', 'Resolución sobre notificación de observación de fondo']) {
    assert.equal(inapiProcedure([act(description, '2026-09-04')]).procedure.notifiedAt, undefined, description);
  }
  for (const description of ['Resolución de aceptación a registro no está firme', 'Resolución de aceptación a registro sin certificación de ejecutoria', 'Solicitud de certificado de ejecutoria', 'Certificado de ejecutoria solicitado']) {
    const p = inapiProcedure([act('Resolución de aceptación a registro', '2026-09-01'), act(description, '2026-09-04')]);
    assert.equal(p.procedure.finalAt, undefined, description);
    assert.notEqual(p.status, 'accepted-payment', description);
  }
  assert.equal(stageForAct('Resolución de rechazo definitivo no firme'), 'rejected-appeal');
  assert.equal(stageForAct('Resolución que rechaza solicitud de abandono'), undefined);
  assert.equal(stageForAct('Resolución que deja sin efecto la concesión de marca'), 'decision-review');
});

test('a granted evidence extension adds only its stated days without resetting the original clock', () => {
  const original = act('Notificación de resolución que recibe la causa a prueba', '2026-07-01');
  const request = act('Solicitud de prórroga del término probatorio', '2026-07-10');
  const ambiguous = act('Prórroga del término probatorio notificada', '2026-07-15');
  const granted = act('Se concede prórroga de 20 días del término probatorio', '2026-07-20');
  const result = inapiProcedure([original, request, ambiguous, granted, granted]);
  assert.equal(result.procedure.notifiedAt, '2026-07-01');
  assert.equal(result.procedure.sourceActDate, '2026-07-01');
  assert.equal(result.procedure.evidenceExtensionDays, 20);
  assert.equal(result.status, 'evidence-period');
});

test('new observations in the same stage cannot inherit an earlier notification', () => {
  const result = inapiProcedure([act('Notificación de observaciones de fondo', '2026-08-03'), act('Resolución de observaciones de fondo', '2026-09-04')]);
  assert.equal(result.status, 'substantive-objection');
  assert.equal(result.procedure.sourceActDate, '2026-09-04');
  assert.equal(result.procedure.notifiedAt, undefined);
});
function document(events, patch = {}) {
  return { application_id: 1663533, registration_number: null, name: "MARCA DE PRUEBA", status: { code: "016", description: "En Trámite" }, dates: { filed_at: "2026-01-05", published_at: "2026-03-10", registered_at: null, expires_at: null, last_changed_at: null }, trademark: { sign_type: "Denominativa" }, holders: [{ name: "Titular SpA", country: "CL" }], representatives: [], classes: [{ nice_class: 35 }], events, annotations: [], source: {}, ...patch };
}
function application(record) {
  return updatedApplication({ id: "IM-TEST", name: record.name, applicationNumber: record.applicationNumber, type: record.type, filedAt: record.filingDate, statusId: record.status, recentEvent: "Ingreso", niceClasses: "35", holder: record.owner, holderRut: "", client: "Cliente de prueba", history: [] }, record, "Actualización");
}

test("procedural acts distinguish publication, finality, payment and an actual grant", () => {
  for (const [description, expected] of [
    ["Solicitud de publicación de marca en Diario Oficial", "publication-pending"],
    ["Publicación de marca en Diario Oficial", "opposition-window"],
    ["Resolución de aceptación a registro", "finality-pending"],
    ["Resolución de aceptación parcial", "partial-appeal"],
    ["Resolución firme de aceptación a registro", "accepted-payment"],
    ["Resolución firme de aceptación parcial", "partial-payment"],
    ["Acreditación del pago de derechos finales", "payment-verification"],
    ["Resolución tiene por no presentada la solicitud", "not-filed"],
    ["Solicitud abandonada por falta de pago de derechos finales", "abandoned-payment"],
    ["Resolución de rechazo de oposición", "substantive-exam"],
    ["Fallo del Tribunal de Propiedad Industrial", "decision-review"],
    ["Resolución de apelación", "decision-review"],
    ["Resolución de admisión de apelación administrativa 2026/222297", "appeal-pending"],
    ["Resolución que concede recurso de apelación en ambos efectos", "appeal-pending"],
    ["Resolución no firme de aceptación a registro", "finality-pending"],
    ["Resolución firme de rechazo de oposición", "substantive-exam"],
    ["Cumplimiento de observaciones de forma", "inapi-waiting"],
    ["Cumplimiento de observaciones de fondo", "substantive-exam"],
  ]) assert.equal(stageForAct(description), expected, description);
  assert.equal(stageForAct("Fin de plazo"), undefined);
  assert.equal(stageForAct("Presentación de demanda de nulidad"), undefined);
  assert.equal(stageForAct("Orden de pago de derechos finales"), undefined);
  assert.equal(stageForAct("Orden de pago de publicación"), undefined);
  assert.equal(stageForAct("Pago de publicación pendiente"), undefined);
  assert.equal(stageForAct("Falta de pago de publicación"), undefined);
  assert.equal(stageForAct("No presenta contestación de oposición"), undefined);
  assert.equal(stageForAct("Incumplimiento de observaciones de forma"), "form-observation");
  assert.equal(stageForAct("Incumplimiento de observaciones de fondo"), "substantive-objection");
  assert.equal(stageForAct("Requerimiento para acreditar pago de derechos finales"), undefined);
  assert.equal(stageForAct("No se acredita pago de derechos finales"), undefined);
  assert.equal(stageForAct("Rechazo del requerimiento de publicación"), undefined);
});

test("only the current triggering act supplies a deadline; a later clerical row does not replace it", () => {
  const events = [act("Resolución de observaciones de forma", "2026-07-01", { due_date: "2026-08-12" }), act("Acompaña poder", "2026-07-03", { due_date: "2026-10-01" })];
  const first = application(normalizeInapi(document(events)));
  assert.equal(first.officialDeadline, "2026-08-12");
  assert.equal(first.procedure.sourceActDate, "2026-07-01");
  assert.equal(first.procedure.notifiedAt, undefined);
  assert.equal(first.recentEvent, "Acompaña poder");
  events.push(act("Cumplimiento de observaciones de forma", "2026-07-05"));
  const fulfilled = application(normalizeInapi(document(events)));
  assert.equal(fulfilled.statusId, "inapi-waiting");
  assert.equal(fulfilled.officialDeadline, undefined);
  events[0].due_date = "2026-02-30";
  assert.equal(application(normalizeInapi(document(events.slice(0, 2)))).officialDeadline, undefined);
});

test("publication act is evidence of publication and an absent date does not erase that stage", () => {
  const d = document([act("Publicación de marca en Diario Oficial", "2026-03-10")]);
  d.dates.published_at = null;
  assert.equal(normalizeInapi(d).publicationDate, "2026-03-10");
  d.events[0].event_date = null;
  const missingDate = normalizeInapi(d);
  assert.equal(missingDate.status, "opposition-window");
  assert.equal(missingDate.publicationDate, null);
});

test("recorded grant does not hide a later appeal and a later grant can close the appeal", () => {
  const d = document([act("Interposición de recurso de apelación", "2026-08-05")]);
  d.registration_number = 1509249;
  d.dates.registered_at = "2026-08-01";
  assert.equal(normalizeInapi(d).status, "appeal-pending");
  d.events.push(act("Concesión de marca", "2026-08-20"));
  assert.equal(normalizeInapi(d).status, "registered");
  d.registration_number = null;
  d.dates.registered_at = null;
  assert.equal(normalizeInapi(d).status, "decision-review");
});

test("a recorded publication takes precedence over older acceptance and does not invent payment evidence", () => {
  const d = document([act("Resolución de aceptación a trámite", "2026-02-01")]);
  const record = normalizeInapi(d);
  assert.equal(record.status, "opposition-window");
  assert.equal(application(record).procedure.paymentAccreditedAt, undefined);
});

test("a new response or decision obligation cannot reuse completion evidence from an older stage", () => {
  const events = [act("Resolución de observaciones de forma", "2026-01-15"), act("Cumplimiento de observaciones de forma", "2026-01-20"), act("Observaciones de fondo", "2026-07-10")];
  assert.equal(inapiProcedure(events).procedure.responseFiledAt, undefined);
  events.push(act("Resolución firme de aceptación a registro", "2026-07-25"), act("Acreditación de pago de derechos finales", "2026-07-26"), act("Resolución de aceptación parcial", "2026-08-02"));
  const p = inapiProcedure(events).procedure;
  assert.equal(p.paymentAccreditedAt, undefined);
  assert.equal(p.finalAt, undefined);
  const notAnswered = inapiProcedure([act("Observaciones de fondo", "2026-07-10"), act("Incumplimiento de observaciones de fondo", "2026-08-10")]);
  assert.equal(notAnswered.status, "substantive-objection");
  assert.equal(notAnswered.procedure.responseFiledAt, undefined);
});

test("finality certificate retains the underlying result and never presumes a notification date", () => {
  const events = [act("Resolución de aceptación parcial", "2026-07-01"), act("Certificado de ejecutoria", "2026-07-25")];
  const projection = inapiProcedure(events);
  assert.equal(projection.status, "partial-payment");
  assert.equal(projection.procedure.finalAt, "2026-07-25");
  assert.equal(projection.procedure.notifiedAt, undefined);
  events.push(act("Interposición de recurso de apelación", "2026-07-26"));
  assert.equal(inapiProcedure(events).procedure.finalAt, undefined);
});

test("substantive observations and opposition obligations coexist until each is answered", () => {
  const events = [act("Notificación de observaciones de fondo", "2026-07-01", { due_date: "2026-08-12" }), act("Notificación de traslado de oposición", "2026-07-03", { due_date: "2026-08-14" })];
  let projection = inapiProcedure(events);
  assert.equal(projection.status, "opposition-answer");
  assert.deepEqual(projection.procedure.concurrent, [{ statusId: "substantive-objection", notifiedAt: "2026-07-01", officialDeadline: "2026-08-12", sourceActDate: "2026-07-01" }]);
  events.push(act("Contestación de oposición", "2026-07-20"));
  projection = inapiProcedure(events);
  assert.equal(projection.procedure.concurrent[0].statusId, "substantive-objection");
  events.push(act("Cumplimiento de observaciones de fondo", "2026-07-21"));
  assert.equal(inapiProcedure(events).procedure.concurrent, undefined);
});

test("stored source evidence can be reprojected without modifying the record or waiting for a new consultation", () => {
  const record = normalizeInapi(document([act("Resolución de aceptación parcial", "2026-07-01")]));
  const previousProjection = { ...record, status: "partial-payment" };
  const updated = reprojectInapiRecord(previousProjection);
  assert.equal(updated.status, "partial-appeal");
  assert.equal(previousProjection.status, "partial-payment");
  assert.deepEqual(updated.inapi, record.inapi);
});

test("normalization corrections stay silent at the next consultation while new source acts still produce a notice", () => {
  const d = document([act("Resolución de aceptación a registro", "2026-07-01")]);
  const current = normalizeInapi(d);
  const savedBeforeRulesUpdate = { ...current, status: "accepted-payment" };
  const baseline = reprojectInapiRecord(savedBeforeRulesUpdate);
  assert.equal(baseline.status, "finality-pending");
  assert.deepEqual(compareRecords(baseline, normalizeInapi(d)), []);
  d.events.push(act("Certificado de ejecutoria", "2026-07-25"));
  const after = normalizeInapi(d);
  const actualChanges = compareRecords(baseline, after);
  assert.equal(after.status, "accepted-payment");
  assert.ok(actualChanges.some(change => change.field === "inapi.events"));
  assert.ok(actualChanges.some(change => !change.ancillary));
  assert.match(describeChanges(baseline, after, actualChanges).body, /Certificado de ejecutoria/);
});

test("simulated source rejects contradictory stages and impossible registry chronology", () => {
  const { provider: _provider, inapi: _inapi, ...record } = normalizeInapi(document([act("Publicación de marca en Diario Oficial", "2026-03-10")]));
  for (const patch of [
    { status: "accepted-publication" },
    { status: "publication-pending" },
    { status: "substantive-objection", publicationDate: null },
    { registrationDate: "2026-05-01" },
    { expirationDate: "2036-05-01" },
    { registrationNumber: "1234", registrationDate: "2026-02-01" },
    { registrationNumber: "1234", registrationDate: "2026-05-01", expirationDate: "2026-04-01" },
  ]) assert.equal(sourceRecordSchema.safeParse({ ...record, ...patch }).success, false, JSON.stringify(patch));
});
