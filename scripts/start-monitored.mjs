import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

if (process.env.SOURCE_PROVIDER === "inapi" && process.env.INAPI_IMPORT_COHORT === "true") {
  const imported = spawnSync(process.execPath, ["--import", "./tests/ts-loader.mjs", "scripts/import-inapi.ts"], { stdio: "inherit", env: process.env });
  if (imported.status !== 0) process.exit(imported.status ?? 1);
}

// A supervised process runs while the web service is alive, including with no open browsers.
const enabled = Boolean(process.env.DATABASE_URL) && process.env.MONITORING_SCHEDULER_ENABLED !== "false";
const env = { ...process.env, MONITORING_SCHEDULER_ENABLED: String(enabled), MONITORING_CRON_SECRET: process.env.MONITORING_CRON_SECRET || randomBytes(32).toString("hex") };
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.argv.includes("--dev") ? "dev" : "start"], { stdio: "inherit", env });
let stopping = false, inFlight = false;
async function tick() {
  if (!enabled || inFlight || stopping) return;
  inFlight = true;
  try {
    const response = await fetch(`http://127.0.0.1:${env.PORT || 3000}/api/monitoring/sync?trigger=scheduled`, { method: "POST", headers: { authorization: `Bearer ${env.MONITORING_CRON_SECRET}` }, signal: AbortSignal.timeout(120000) });
    if (!response.ok) console.error(`[revisión automática] HTTP ${response.status}; el detalle está en Corridas de la API`);
  } catch { /* Startup/restart: retry next tick. Database errors are persisted by the endpoint. */ }
  finally { inFlight = false; }
}
const timer = setInterval(() => void tick(), 30000);
const startup = setTimeout(() => void tick(), 10000);
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { stopping = true; clearInterval(timer); clearTimeout(startup); child.kill(signal); });
child.on("exit", (code, signal) => { clearInterval(timer); clearTimeout(startup); process.exit(code ?? (signal ? 1 : 0)); });
