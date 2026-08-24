import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the navigable demo exposes its main product modules", async () => {
  const page = await source("app/app/page.tsx");
  for (const label of ["Inicio", "Marcas", "Coincidencias", "Casos", "Notificaciones", "Usuarios"]) {
    assert.match(page, new RegExp(`label: "${label}"`));
  }
  assert.match(page, /fetch\("\/api\/demo"/);
  assert.doesNotMatch(page, /DATOS EN RAILWAY/);
  assert.doesNotMatch(page, /Configuración/);
});

test("the enhanced demo includes RUT import, full calendar and interactive case views", async () => {
  const [page, demo, api] = await Promise.all([
    source("app/app/page.tsx"),
    source("db/demo.ts"),
    source("app/api/demo/route.ts"),
  ]);
  for (const copy of ["Buenos días, José Ignacio.", "Marcas en seguimiento", "OPOSICIONES EN CURSO", "Agregar marcas según RUT", "Clases de Niza", "Ver en INAPI", "Mes anterior", "Mes siguiente", "Victor Tirreau", "Coca-Cola de Chile S.A.", "Suelta aquí para mover", "Descartar por ahora", "@dnd-kit/core", "En monitoreo", "Publicado en Diario Oficial"]) {
    assert.match(page, new RegExp(copy));
  }
  assert.match(page, /bulkCreateBrands/);
  assert.match(api, /bulkCreateBrands/);
  for (const behavior of ["N.º de registro", "Sin monitoreo", "Dejar de monitorear", "Empezar a monitorear", "Concluido", "Visual", "Fonético", "Conceptual"]) {
    assert.match(page, new RegExp(behavior));
  }
  assert.match(page, /buho-demo-v3/);
  assert.match(api, /toggleBrandMonitoring/);
  assert.match(api, /unlinkCaseMatch/);
  assert.match(api, /Concluido/);
  assert.match(demo, /supplementalSeedBrands/);
  assert.match(demo, /José Ignacio Ibieta/);
  assert.match(page, /buscadormarcas\.inapi\.cl/);
});

test("the database model and first migration contain the functional demo entities", async () => {
  const [schema, migration] = await Promise.all([
    source("db/schema.ts"),
    source("drizzle/0000_familiar_shadow_king.sql"),
  ]);
  for (const table of ["organizations", "users", "brands", "monitoring_jobs", "matches", "match_reviews", "cases", "notifications", "email_drafts", "audit_events"]) {
    assert.match(schema, new RegExp(`"${table}"`));
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(schema, /awaiting_engine/);
});

test("Railway applies migrations and checks the PostgreSQL connection", async () => {
  const [railwayText, packageText, health] = await Promise.all([
    source("railway.json"),
    source("package.json"),
    source("app/api/health/route.ts"),
  ]);
  const railway = JSON.parse(railwayText);
  const packageJson = JSON.parse(packageText);
  assert.equal(railway.deploy.healthcheckPath, "/api/health");
  assert.equal(railway.deploy.startCommand, "npm run railway:start");
  assert.match(packageJson.scripts["railway:start"], /db:migrate/);
  assert.match(health, /SELECT 1/);
  assert.match(health, /engine: "not-connected"/);
});

test("the macOS launcher only replaces a process belonging to this app", async () => {
  const launcher = await source("ABRIR BUHO MARC.command");
  assert.match(launcher, /process_directory/);
  assert.match(launcher, /stop_process_tree/);
  assert.match(launcher, /El puerto/);
  assert.match(launcher, /npm run dev/);
});
