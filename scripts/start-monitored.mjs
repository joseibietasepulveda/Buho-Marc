import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

if (process.env.RAILWAY_ENVIRONMENT_ID === "9e2891f0-7281-4872-a992-2c48866a782d") {
  const correction = spawnSync(process.execPath, ["--import", "./tests/ts-loader.mjs", "scripts/correct-daniel-oppositions.ts"], { stdio: "inherit", env: process.env });
  if (correction.status !== 0) process.exit(correction.status ?? 1);
  const recovery = spawnSync(process.execPath, ["--import", "./tests/ts-loader.mjs", "scripts/recover-watch-403.ts", "--apply"], { stdio: "inherit", env: process.env });
  if (recovery.status !== 0) process.exit(recovery.status ?? 1);
}

if (process.env.DATABASE_URL) {
  const policy = spawnSync(process.execPath, ["--import", "./tests/ts-loader.mjs", "scripts/monitoring-policy-status.ts"], { stdio: "inherit", env: process.env });
  if (policy.status !== 0) process.exit(policy.status ?? 1);
}

if (process.env.SOURCE_PROVIDER === "inapi" && process.env.INAPI_IMPORT_COHORT === "true") {
  const imported = spawnSync(process.execPath, ["--import", "./tests/ts-loader.mjs", "scripts/import-inapi.ts"], { stdio: "inherit", env: process.env });
  if (imported.status !== 0) process.exit(imported.status ?? 1);
}

// A supervised process runs while the web service is alive, including with no open browsers.
const enabled = Boolean(process.env.DATABASE_URL) && process.env.MONITORING_SCHEDULER_ENABLED !== "false";
const env = { ...process.env, SOURCE_API_TOKEN: process.env.SOURCE_API_TOKEN || randomBytes(32).toString("hex"), MONITORING_SCHEDULER_ENABLED: String(enabled), MONITORING_CRON_SECRET: process.env.MONITORING_CRON_SECRET || randomBytes(32).toString("hex") };
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.argv.includes("--dev") ? "dev" : "start"], { stdio: "inherit", env });
let stopping = false, inFlight = false, watchInFlight = false, recoveryInFlight = false, digestInFlight = false, analyticsInFlight = false;
let discoveryInFlight = false;
async function discoveryTick() {
  if (!enabled || env.SOURCE_PROVIDER !== "inapi" || discoveryInFlight || stopping) return;
  discoveryInFlight = true;
  try {
    const response = await fetch(`http://127.0.0.1:${env.PORT || 3000}/api/portfolio/discover`, { method: "POST", headers: { authorization: `Bearer ${env.MONITORING_CRON_SECRET}` }, signal: AbortSignal.timeout(85000) });
    if (!response.ok) console.error(`[descubrimiento de cartera] HTTP ${response.status}`);
  } catch { /* Durable page cursor; capped retry on a later tick. */ }
  finally { discoveryInFlight = false; }
}
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
      if (result.retryDelayMs > 0) setTimeout(() => { void watchTick(); }, result.retryDelayMs).unref();
      if (result.failed || result.enqueueErrors) console.error(`[vigilancia] Revisión incompleta; solicitud=${result.applicationId}; motivo=${result.message || "Preparación incompleta"}; HTTP=${result.upstreamStatus ?? 'desconocido'}; intento=${result.attempt ?? '-'}; reintento=${Boolean(result.retry)}; espera=${result.retryDelayMs ?? 0}ms; errores de preparación=${result.enqueueErrors || 0}`);
    }
  } catch { console.error("[vigilancia] No se pudo contactar al trabajador; la cola persistente permite recuperar la revisión."); }
  finally { watchInFlight = false; }
}
async function recoveryTick() {
  if (!env.DATABASE_URL || env.SOURCE_PROVIDER !== "inapi" || env.INAPI_DIRECT_RECOVERY_ENABLED === "false" || recoveryInFlight || stopping) return;
  recoveryInFlight = true;
  try {
    const response = await fetch(`http://127.0.0.1:${env.PORT || 3000}/api/inapi/recovery`, { method: "POST", headers: { authorization: `Bearer ${env.MONITORING_CRON_SECRET}` }, signal: AbortSignal.timeout(110000) });
    if (!response.ok) console.error(`[antecedentes INAPI] HTTP ${response.status}`);
    else { const result = await response.json(); if (result.failed) console.error("[antecedentes INAPI] Consulta fallida; cola en pausa durante una hora."); }
  } catch { /* A persisted attempt is never automatically repeated. */ }
  finally { recoveryInFlight = false; }
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

async function digestTick() {
  if (!env.DATABASE_URL || digestInFlight || stopping) return;
  digestInFlight = true;
  try {
    const response = await fetch(`http://127.0.0.1:${env.PORT || 3000}/api/watch/digest/worker`, { method: "POST", headers: { authorization: `Bearer ${env.MONITORING_CRON_SECRET}` }, signal: AbortSignal.timeout(110000) });
    if (!response.ok) console.error(`[correo semanal] HTTP ${response.status}`);
    else { const result = await response.json(); if (result.progress) setTimeout(() => { void digestTick(); }, 500).unref(); }
  } catch { /* The persisted job is resumed on the next tick. */ }
  finally { digestInFlight = false; }
}

async function analyticsTick(){
 if(!env.DATABASE_URL || analyticsInFlight || stopping)return;
 analyticsInFlight=true;
 try{const response=await fetch(`http://127.0.0.1:${env.PORT||3000}/api/admin/dashboard/worker`,{method:'POST',headers:{authorization:`Bearer ${env.MONITORING_CRON_SECRET}`},signal:AbortSignal.timeout(60000)});if(response.ok){const result=await response.json();if(result.processed)setTimeout(()=>void analyticsTick(),500).unref();}}
 catch{/* Snapshotqueue is durable; existing userprocesses continue. */}
 finally{analyticsInFlight=false;}
}
const analyticsTimer=setInterval(()=>void analyticsTick(),60000);
const timer = setInterval(() => { void tick(); void discoveryTick(); void watchTick(); void recoveryTick(); void digestTick(); }, 30000);
const startup = setTimeout(() => { void tick(); void discoveryTick(); void watchTick(); void recoveryTick(); void digestTick(); }, 10000);
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { stopping = true; clearInterval(timer); clearTimeout(startup);clearInterval(analyticsTimer); child.kill(signal); });
child.on("exit", (code, signal) => { clearInterval(timer); clearTimeout(startup);clearInterval(analyticsTimer); process.exit(code ?? (signal ? 1 : 0)); });
