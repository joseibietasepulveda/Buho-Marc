// Loaded only by the isolated pilot test process, never by application startup.
import { readFileSync } from "node:fs";
const originalFetch = globalThis.fetch;
if (process.env.PILOT_FIXTURE_FILE) globalThis.fetch = async (input, init) => {
  if (String(input) !== "https://dequienes.cl/inapi/trademarks/batch") return originalFetch(input, init);
  const fixture = JSON.parse(readFileSync(process.env.PILOT_FIXTURE_FILE, "utf8"));
  const ids = JSON.parse(init.body).application_ids;
  if (fixture.fail) return new Response("temporary outage", { status: 503 });
  return Response.json({ documents: ids.flatMap(id => fixture.documents[id] ? [fixture.documents[id]] : []), application_ids_not_found: ids.filter(id => !fixture.documents[id]) });
};
