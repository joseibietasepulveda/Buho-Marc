import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

if (process.env.RAILWAY_ENVIRONMENT_ID === "9e2891f0-7281-4872-a992-2c48866a782d") {
  const correction = spawnSync(process.execPath, ["--import", "./tests/ts-loader.mjs", "scripts/correct-daniel-oppositions.ts"], { stdio: "inherit", env: process.env });
  if (correction.status !== 0) process.exit(correction.status ?? 1);
}

if (process.env.SOURCE_PROVIDER === "inapi" && process.env.INAPI_IMPORT_COHORT === "true") {
  const imported = spawnSync(process.execPath, ["--import", "./tests/ts-loader.mjs", "scripts/import-inapi.ts"], { stdio: "inherit", env: process.env });
  if (imported.status !== 0) process.exit(imported.status ?? 1);
}

// A supervised process runs while the web service is alive, including with no open browsers.
const enabled = Boolean(process.env.DATABASE_URL) && process.env.MONITORING_SCHEDULER_ENABLED !== "false";
const env = { ...process.env, SOURCE_API_TOKEN: process.env.SOURCE_API_TOKEN || randomBytes(32).toString("hex"), MONITORING_SCHEDULER_ENABLED: String(enabled), MONITORING_CRON_SECRET: process.env.MONITORING_CRON_SECRET || randomBytes(32).toString("hex") };
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.argv.includes("--dev") ? "dev" : "start"], { stdio: "inherit", env });
let stopping = false, inFlight = false, watchInFlight = false;
let lastWatchProgress = "";
async function watchTick() {
  if (!env.DATABASE_URL || env.SOURCE_PROVIDER !== "inapi" || watchInFlight || stopping) return;
  watchInFlight = true;
  const started = Date.now();
  try {
    const response = await fetch(`http://127.0.0.1:${env.PORT || 3000}/api/watch/worker`, { method: "POST", headers: { authorization: `Bearer ${env.MONITORING_CRON_SECRET}` }, signal: AbortSignal.timeout(570000) });
    if (!response.ok) console.error(`[vigilancia] HTTP ${response.status}`);
    else {
      const result = await response.json();
      const progress = JSON.stringify(result.progress ?? []);
      if (progress !== lastWatchProgress) { console.info(`[vigilancia] Progreso por cartera: ${progress}`); lastWatchProgress = progress; }
      if (result.completed) {
        console.info(`[vigilancia] Revisión completada; solicitud=${result.applicationId}; organización=${result.organizationId}; stock=${result.stockCount}; búsquedas=${result.searchCount}; duración=${Date.now() - started}ms`);
        // Drain the initial portfolio serially without an idle 30-second slot per mark.
        setTimeout(() => { void watchTick(); }, 500).unref();
      }
      if (result.failed || result.enqueueErrors) console.error(`[vigilancia] Revisión incompleta; solicitud=${result.applicationId}; motivo=${result.message || "Preparación incompleta"}; reintento=${Boolean(result.retry)}; errores de preparación=${result.enqueueErrors || 0}`);
    }
  } catch { console.error("[vigilancia] No se pudo contactar al trabajador; la cola persistente permite recuperar la revisión."); }
  finally { watchInFlight = false; }
}
async function tick() {
  if (!enabled || inFlight || stopping) return;
  inFlight = true;
  try {
    const response = await fetch(`http://127.0.0.1:${env.PORT || 3000}/api/monitoring/sync?trigger=scheduled`, { method: "POST", headers: { authorization: `Bearer ${env.MONITORING_CRON_SECRET}` }, signal: AbortSignal.timeout(120000) });
    if (!response.ok) console.error(`[revisión automática] HTTP ${response.status}; el detalle está en Corridas de la API`);
  } catch { /* Startup/restart: retry next tick. Database errors are persisted by the endpoint. */ }
  finally { inFlight = false; }
}
const timer = setInterval(() => { void tick(); void watchTick(); }, 30000);
const startup = setTimeout(() => { void tick(); void watchTick(); }, 10000);
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { stopping = true; clearInterval(timer); clearTimeout(startup); child.kill(signal); });
child.on("exit", (code, signal) => { clearInterval(timer); clearTimeout(startup); process.exit(code ?? (signal ? 1 : 0)); });
