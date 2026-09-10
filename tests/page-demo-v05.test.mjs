import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { DEMO_V05_CASE_DATES, DEMO_V05_EXTRA_CASES, DEMO_V05_MATCH_DATES, DEMO_V05_MIN_DATE, upgradeDemoCaseDateV05 } from "../lib/demo-v05-data.ts";
import { parseWorkDate, caseDeadlineDescription } from "../lib/work-priorities.ts";

// Exercise the page's pure fallback/migration code without mounting Next or its live providers.
const names = new Set([
  "INAPI_SEARCH_URL", "legalDeadlineOptions", "coreBrands", "supplementalNames", "initialBrands", "initialMatches", "extraDemoCases", "initialCases", "initialNotices",
  "inferBrandType", "normalizeMatch", "mergeInitialMatches", "normalizeCases", "upgradeDemoMatchesV05", "upgradeDemoCasesV05", "hydrateDemoMatchesV05", "hydrateDemoCasesV05",
]);
const source = readFileSync(new URL("../app/app/page.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const selected = ast.statements.filter(statement => ts.isFunctionDeclaration(statement) ? names.has(statement.name?.text) : ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => names.has(declaration.name.getText(ast))));
assert.equal(selected.length, names.size, "all targeted declarations must remain present");
const code = ts.transpileModule(`${selected.map(statement => statement.getText(ast)).join("\n")}\nglobalThis.demo = { ${[...names].join(", ")} };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function fixtures(storage = new Map()) {
  const context = vm.createContext({ DEMO_V05_CASE_DATES, DEMO_V05_EXTRA_CASES, DEMO_V05_MATCH_DATES, DEMO_V05_MIN_DATE, upgradeDemoCaseDateV05, parseWorkDate, caseDeadlineDescription, window: { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } } });
  vm.runInContext(code, context);
  return context.demo;
}

test("initial browser fixtures have nine cases, five tasks and no obsolete active due dates", () => {
  const demo = fixtures();
  assert.equal(demo.initialCases.length, 9);
  assert.equal(demo.initialCases.flatMap(item => item.tasks ?? []).length, 5);
  for (const item of demo.initialCases) assert.ok(parseWorkDate(item.deadline) >= DEMO_V05_MIN_DATE, item.id);
  for (const item of demo.initialCases.flatMap(item => item.tasks ?? [])) assert.ok(item.dueDate >= DEMO_V05_MIN_DATE, item.id);
  for (const item of demo.initialMatches.filter(item => item.deadline && item.status !== "Descartada")) assert.ok(parseWorkDate(item.deadline) >= DEMO_V05_MIN_DATE, item.id);
  for (const id of ["NO-117", "NO-118", "NO-112"]) {
    const notice = demo.initialNotices.find(item => item.id === id);
    assert.doesNotMatch(`${notice.title} ${notice.body}`, /vencido|en 5 días|quedan 3 días|22 de agosto/i);
  }
});

test("legacy cases retain edits and completed history while only known mock dates advance", () => {
  const demo = fixtures();
  const source = [{ ...demo.initialCases[0], title: "Mi título", stage: "En seguimiento", deadline: "20 ago 2026", tasks: [{ id: "pending", title: "Mi tarea", status: "pending", dueDate: "2026-09-02", assigneeId: "custom-user" }, { id: "done", title: "Histórica", status: "completed", dueDate: "2026-08-01" }] }, { ...demo.initialCases[1], deadline: "2026-12-01" }, { ...demo.initialCases[2], stage: "Concluido", deadline: "2026-08-10" }, { ...demo.initialCases[0], id: "REAL-42", deadline: "2026-08-10" }];
  const upgraded = demo.upgradeDemoCasesV05(source);
  assert.equal(upgraded[0].deadline, "2026-09-30");
  assert.equal(upgraded[0].title, "Mi título");
  assert.equal(upgraded[0].stage, "En seguimiento");
  assert.equal(upgraded[0].tasks[0].dueDate, "2026-09-30");
  assert.equal(upgraded[0].tasks[0].assigneeId, "custom-user");
  assert.equal(upgraded[0].tasks[1].dueDate, "2026-08-01");
  assert.equal(upgraded[1].deadline, "2026-12-01");
  assert.equal(upgraded[2].deadline, "2026-08-10");
  assert.equal(upgraded[3].deadline, "2026-08-10");
  assert.equal(upgraded.length, source.length + 5);
  assert.equal(demo.upgradeDemoCasesV05(upgraded).length, upgraded.length, "no duplicate cases");
  assert.equal(demo.upgradeDemoCasesV05([source[3]]).length, 1, "no demo insertion in an unrelated cached portfolio");
});

test("migration does not open another case for a discarded or already linked vigilance", () => {
  const demo = fixtures();
  const matches = demo.initialMatches.map(item => item.id === "CO-2485" ? { ...item, status: "Descartada" } : item);
  const existing = { ...demo.extraDemoCases[1], id: "USER-CASE", title: "Caso propio" };
  const upgraded = demo.upgradeDemoCasesV05([demo.initialCases[0], existing], matches);
  assert.ok(!upgraded.some(item => item.id === "BM-1050"));
  assert.equal(upgraded.filter(item => item.sourceMatch === "CO-2483").length, 1);
});

test("match date migration preserves other records, history and future user dates", () => {
  const demo = fixtures();
  const source = [{ ...demo.initialMatches[0], deadline: "27 ago 2026" }, { ...demo.initialMatches[1], deadline: "2026-12-01" }, { ...demo.initialMatches[5], status: "Descartada", deadline: "2026-08-31" }, { ...demo.initialMatches[0], id: "REAL-99", deadline: "2026-08-27" }];
  const upgraded = demo.upgradeDemoMatchesV05(source);
  assert.equal(upgraded[0].deadline, "2026-09-30");
  assert.equal(upgraded[0].date, source[0].date);
  assert.equal(upgraded[1].deadline, "2026-12-01");
  assert.equal(upgraded[2].deadline, "2026-08-31");
  assert.equal(upgraded[3].deadline, "2026-08-27");
});

test("browser migration runs once so later user removals and date edits are respected", () => {
  const storage = new Map();
  const demo = fixtures(storage);
  const first = demo.hydrateDemoCasesV05([{ ...demo.initialCases[0], deadline: "20 ago 2026" }]);
  assert.equal(first.length, 6);
  assert.ok(storage.get("buho-demo-v05-cases-upgraded"));
  const edited = [{ ...first[0], deadline: "2026-09-15" }];
  const next = demo.hydrateDemoCasesV05(edited);
  assert.equal(next.length, 1);
  assert.equal(next[0].deadline, "2026-09-15");
  storage.set("buho-demo-v5-matches", "invalid-json");
  storage.delete("buho-demo-v05-cases-upgraded");
  assert.equal(demo.hydrateDemoCasesV05(edited)[0].id, edited[0].id, "bad optional cache does not discard saved cases");
});
