import test from "node:test";
import assert from "node:assert/strict";
import { hasReceivedOpposition } from "../lib/opposition.ts";

const record = (description, status = "substantive-exam") => ({ status, inapi: { events: [{ status_description: description }] } });
test("received opposition requires a proceeding, not a publication window", () => {
  for (const description of ["Oposición - Presentación C/ antecedentes", "Traslado de oposición", "Contestación de oposición", "Demanda de oposición presentada", "Notificación de oposición"]) assert.equal(hasReceivedOpposition(record(description)), true, description);
  for (const description of ["Publicación en Diario Oficial", "Fin de plazo para presentar oposición", "Apertura de plazo de oposición", "Sin oposición presentada", "No se han presentado oposiciones", "Examen de fondo", "Se recibe la causa a prueba"]) assert.equal(hasReceivedOpposition(record(description)), false, description);
  assert.equal(hasReceivedOpposition(record("", "opposition-window")), false);
  assert.equal(hasReceivedOpposition(record("", "opposition-answer")), true);
  assert.equal(hasReceivedOpposition(record("", "opposition-answered")), true);
});
