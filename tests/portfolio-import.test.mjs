import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { readImportFile, portfolioKind, normalizeApplicationId } from "../lib/portfolio-import.ts";
import { hashPassword, verifyPassword } from "../lib/password.ts";
import { runAs, organizationId, actorId } from "../lib/tenant-context.ts";

test("Excel: headers, multiple sheets, duplicate IDs, invalid cells and optional state columns", async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Actuales").addRows([["numero_solicitud", "estado"], [1234567, "En trámite"], [1234567, "Registrada"], ["no-es-id", ""], [{ formula: "1+2", result: 3 }, ""]]);
  workbook.addWorksheet("Antiguas").addRows([["N° solicitud"], [2345678]]);
  const result = await readImportFile(Buffer.from(await workbook.xlsx.writeBuffer()), "cartera.xlsx");
  assert.deepEqual(result.ids, ["1234567", "2345678"]);
  assert.equal(result.duplicates, 1); assert.equal(result.invalid.length, 2);
  await assert.rejects(readImportFile(Buffer.from("registro\n1234567\n"), "registro.csv"), /no de registro/);
  assert.deepEqual((await readImportFile(Buffer.from("numero_solicitud;estado\n1234567;concluida\n2345678;pendiente"), "test.csv")).ids, ["1234567", "2345678"]);
  await assert.rejects(readImportFile(Buffer.alloc(2 * 1024 * 1024 + 1), "test.xlsx"), /2 MB/);
  assert.equal(normalizeApplicationId("1e6"), null);
  assert.equal(normalizeApplicationId("00123"), "123");
});
test("Only actual grants enter the brand portfolio; rejected/abandoned do not", () => {
  for (const status of ["registered", "expired", "cancelled"]) assert.equal(portfolioKind({ registrationNumber: "123", status }), "brand");
  for (const status of ["rejected-final", "abandoned-inapi", "accepted-payment", "opposition-answer", "decision-review"]) assert.equal(portfolioKind({ registrationNumber: null, status }), "application");
  assert.equal(portfolioKind({ registrationNumber: null, status: "registered" }), "application");
});
test("Password hashing uses independent salts and rejects wrong passwords", async () => {
  const [a, b] = await Promise.all([hashPassword("test-password-long"), hashPassword("test-password-long")]);
  assert.notEqual(a, b); assert.ok(await verifyPassword("test-password-long", a)); assert.equal(await verifyPassword("wrong", a), false);
});
test("Concurrent asynchronous requests keep organization and actor isolated", async () => {
  const scopes = [{ organizationId: "org-a", userId: "user-a" }, { organizationId: "org-b", userId: "user-b" }];
  await Promise.all(scopes.map(scope => runAs(scope, async () => { await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(organizationId(), scope.organizationId); assert.equal(actorId(), scope.userId); })));
});
