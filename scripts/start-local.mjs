// Dedicated local demo. Never reads or migrates the hosted DATABASE_URL.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".buho-local", "postgres");
const dbPort = 55433;
const appPort = Number(process.env.BUHO_LOCAL_PORT || 3000);
if (!Number.isInteger(appPort) || appPort < 1024 || appPort > 65535) throw new Error("BUHO_LOCAL_PORT no es válido");
const env = { ...process.env, DATABASE_URL: `postgresql://postgres:buho-local-only@127.0.0.1:${dbPort}/buho_local`, SOURCE_PROVIDER: "simulated", MONITORING_SCHEDULER_ENABLED: "false", INAPI_IMPORT_COHORT: "false", PORT: String(appPort) };
delete env.INAPI_API_KEY;
env.APP_PUBLIC_ORIGIN = `http://127.0.0.1:${appPort}`;
delete env.RAILWAY_PUBLIC_DOMAIN;
const db = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "buho-local-only", port: dbPort, persistent: true, initdbFlags: ["--locale=C", "--encoding=UTF8"], postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
let child;
let stopping = false;
let started = false;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopping = true; child?.kill(signal); });

async function freePort(port) {
  await new Promise((resolve, reject) => {
    const check = createServer();
    check.once("error", () => reject(new Error(`El puerto local ${port} está ocupado. Cierra la otra instancia antes de continuar.`)));
    check.listen(port, "127.0.0.1", () => check.close(resolve));
  });
}
async function run(command, args) {
  if (stopping) return 0;
  return new Promise((resolve, reject) => {
    child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", code => { child = undefined; resolve(code ?? (stopping ? 0 : 1)); });
  });
}

try {
  await freePort(dbPort);
  await freePort(appPort);
  await mkdir(path.dirname(dataDir), { recursive: true });
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) await db.initialise();
  await db.start(); started = true;
  try { await db.createDatabase("buho_local"); } catch (error) { if (error.code !== "42P04") throw error; }
  if (await run("npm", ["run", "db:migrate"]) !== 0) throw new Error("No se pudo preparar la base local");
  console.log(`Buho Marc local: http://127.0.0.1:${appPort}/app — datos de demostración; sin conexión a producción.`);
  process.exitCode = await run(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(appPort)]);
} catch (error) {
  console.error(error instanceof Error ? error.message : "No se pudo iniciar la demo local");
  process.exitCode = 1;
} finally {
  if (started) await db.stop();
}
