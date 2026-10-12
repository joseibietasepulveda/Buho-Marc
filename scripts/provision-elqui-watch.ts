import { getSql } from "../db/index";
import { prepareElquiWatch } from "../db/elqui-watch";

const apply = process.argv.includes("--apply");
const environment = process.env.RAILWAY_ENVIRONMENT_ID;
if (!["9e2891f0-7281-4872-a992-2c48866a782d", "01262643-e6b7-499c-ae75-e83254e1c697"].includes(environment ?? "")) throw new Error("Ambiente fuera de Dev/producción autorizados");
const sql = getSql();
try {
  for (const slug of ["estudio-ibieta-ip", "barros-errazuriz"]) console.log(JSON.stringify(await prepareElquiWatch(sql, slug, apply)));
} finally { await sql.end(); }
