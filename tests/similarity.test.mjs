import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSimilar, SimilarityError } from '../lib/similarity-provider.ts';
import { normalizeInapi } from '../lib/inapi-provider.ts';
import { safeImage } from '../lib/similarity-contract.ts';
process.env.SOURCE_PROVIDER = 'inapi'; process.env.INAPI_API_KEY = 'test-only';
const dates = { filed_at: '2026-01-01', published_at: null, registered_at: null, expires_at: null, last_changed_at: null };
export const document = (id, publication = null) => ({ application_id: id, registration_id: null, name: `Marca ${id}`, status: { code: 'ET', description: 'En Trámite' }, dates: { ...dates, published_at: publication }, trademark: { sign_type: 'Mixta' }, holders: [{ name: 'Titular', country: 'CL' }], representatives: [], classes: [{ nice_class: 35, coverage_text: 'Publicidad' }], events: [], annotations: [], source: {} });
const query = { application_id: 100, registration_id: null, name: 'Marca propia', sign_type: 'Mixta', dates, holders: [{ name: 'Titular propio' }], classes: [{ nice_class: 35 }] };
const hit = { ...query, application_id: 200, score: .75, channels: { phonetic: { rank: 1, score: .9 } } };
test('real adapter preserves rank scores, empty publication, states and registration_id compatibility', async () => {
  const requests = [];
  const fetcher = async (url, options) => { requests.push(JSON.parse(options.body)); return Response.json(url.endsWith('/search') ? { query, results: [hit], candidate_count: 20, elapsed_seconds: 3.5 } : { documents: [document(200)], application_ids_not_found: [] }); };
  const result = await searchSimilar({ application_id: 100, limit: 30, grouped: false, exclude_same_holder: true, include: ['coverage'] }, undefined, fetcher);
  assert.equal(result.results[0].score, .75); assert.equal(result.results[0].status, 'En Trámite'); assert.equal(result.results[0].publishedAt, null);
  assert.equal(requests[0].limit, 30); assert.equal('states' in requests[0], false); assert.equal('filed_after' in requests[0], false);
  assert.deepEqual(requests[1], { application_ids: [200] });
  assert.equal(normalizeInapi(document(200)).registrationNumber, null);
  assert.equal(normalizeInapi({ ...document(200), registration_id: 123 }).registrationNumber, '123');
});
test('adapter fails closed on incomplete details and duplicate hits', async () => {
  await assert.rejects(searchSimilar({ limit: 30 }, undefined, async url => Response.json(url.endsWith('/search') ? { query, results: [hit], candidate_count: 1, elapsed_seconds: 1 } : { documents: [], application_ids_not_found: [200] })), /estados e historiales/);
  await assert.rejects(searchSimilar({ limit: 30 }, undefined, async () => Response.json({ query, results: [hit,hit], candidate_count: 2, elapsed_seconds: 1 })), /duplicados/);
});
test('429 is retryable and validation errors are not', async () => {
  await assert.rejects(searchSimilar({}, undefined, async () => new Response('', { status: 429 })), e => e instanceof SimilarityError && e.retryable);
  await assert.rejects(searchSimilar({}, undefined, async () => new Response('', { status: 422 })), e => e instanceof SimilarityError && !e.retryable);
});
test('upstream 403 survives search and batch errors for the durable watch retry policy', async () => {
  await assert.rejects(searchSimilar({}, undefined, async () => new Response('', { status: 403 })), e => e instanceof SimilarityError && e.upstreamStatus === 403 && e.status === 502);
  await assert.rejects(searchSimilar({limit:50}, undefined, async url => url.endsWith('/search')
    ? Response.json({query,results:[hit],candidate_count:1,elapsed_seconds:1})
    : new Response('', { status:403 })), e => e instanceof SimilarityError && e.upstreamStatus === 403);
  await assert.rejects(searchSimilar({}, undefined, async () => new Response('', { status:401 })), e => e.upstreamStatus === 401 && !e.retryable);
});
test('only allowed image sources reach the interface', () => { assert.equal(safeImage('https://evil.test/pixel'), ''); assert.equal(safeImage('javascript:alert(1)'), ''); assert.equal(safeImage('https://marcas.dequienes.cl/cl/test.jpg'), 'https://marcas.dequienes.cl/cl/test.jpg'); });
test('search keeps incomplete registration evidence while portfolio import still rejects it', async () => {
  const incomplete={...document(200),dates:{...dates,registered_at:'2026-02-01'}};
  assert.throws(()=>normalizeInapi(incomplete),/número de registro/);
  const result=await searchSimilar({application_id:100,limit:30},undefined,async url=>Response.json(url.endsWith('/search')?{query,results:[hit],candidate_count:1,elapsed_seconds:.1}:{documents:[incomplete],application_ids_not_found:[]}));
  assert.equal(result.results.length,1);assert.equal(result.results[0].registeredAt,'2026-02-01');assert.equal(result.results[0].registrationId,null);
  assert.match(result.results[0].dataWarnings[0],/número de registro/);assert.equal(result.warnings.length,1);
});
