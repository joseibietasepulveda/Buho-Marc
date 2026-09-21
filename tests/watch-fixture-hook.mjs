// Used only by the isolated end-to-end runner; never imported by application startup.
import { readFileSync } from 'node:fs';
const original = globalThis.fetch;
if (process.env.WATCH_FIXTURE_FILE) globalThis.fetch = async (url, init) => {
  const endpoint = String(url);
  if (!endpoint.startsWith('https://dequienes.cl/inapi/trademarks/')) return original(url, init);
  const fixture = JSON.parse(readFileSync(process.env.WATCH_FIXTURE_FILE, 'utf8'));
  if (fixture.fail) return new Response('', { status: 503 });
  if (endpoint.endsWith('/batch')) {
    const { application_ids: ids } = JSON.parse(init.body);
    return Response.json({ documents: ids.map(id => fixture.documents[id]).filter(Boolean), application_ids_not_found: ids.filter(id => !fixture.documents[id]) });
  }
  if (endpoint.endsWith('/search')) {
    const request = init.body instanceof FormData ? JSON.parse(init.body.get('options')) : JSON.parse(init.body);
    const response = structuredClone(fixture.searches[request.application_id] ?? Object.values(fixture.searches)[0]);
    response.results = response.results.slice(0, request.limit); response.groups = [];
    if (request.name) { response.query.application_id = null; response.query.name = request.name; }
    return Response.json(response);
  }
  return new Response('', { status: 404 });
};
