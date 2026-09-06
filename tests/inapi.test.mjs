import test from "node:test";
import assert from "node:assert/strict";
import { normalizeInapi, fetchInapi } from "../lib/inapi-provider.ts";
import { compareRecords, describeChanges } from "../lib/source-contract.ts";

function doc(id=1663533) {
  return { application_id: id, registration_number: null, name: "Tire Market", status: { code: "016", description: "En Trámite" }, dates: { filed_at: "2026-03-19T00:00:00.000Z", published_at: "2026-07-10T00:00:00.000Z", registered_at: null, expires_at: null, last_changed_at: null }, trademark: { sign_type: "Denominativa" }, holders: [{ name: "Titular SpA", rut: "76157350", dv: "0", country: "CL" }], representatives: [], classes: [{ nice_class: 35, coverage_text: "venta de neumáticos" }], events: [{ event_id: "1", event_date: "2026-07-10T00:00:00.000Z", due_date: null, status_code: "425", status_description: "Publicación de marca en Diario Oficial", observation: null, seq: 1, updated_at: "2026-09-04" }], annotations: [], source: { updated_at: "2026-09-04" } };
}
test("grant evidence takes precedence over stale En Trámite; cancellation remains effective",()=>{
  const d=doc(); d.registration_number=1509249;d.dates.registered_at="2026-09-01T00:00:00.000Z";
  assert.equal(normalizeInapi(d).status,"registered");
  d.events.push({...d.events[0],event_id:"2",event_date:"2026-09-04",seq:2,status_description:"Resolución de cancelación del registro"});
  assert.equal(normalizeInapi(d).status,"cancelled");
});
test("new events and annotations alert even without a change of general status",()=>{
  const d=doc(),before=normalizeInapi(d);
  d.events.push({...d.events[0],event_id:"2",event_date:"2026-09-04",seq:2,status_description:"Oposición - Presentación de demanda"});
  const after=normalizeInapi(d), changes=compareRecords(before,after);
  assert.ok(changes.some(c=>c.field==="inapi.events"));assert.match(describeChanges(before,after).title,/Tire Market/);assert.equal(after.status,"opposition-answer");
  const baseline=normalizeInapi(d);d.annotations.push({...d.events[0],event_id:"3",status_description:"Transferencia de marca"});assert.ok(compareRecords(baseline,normalizeInapi(d)).some(c=>c.field==="inapi.annotations"));
});
test("scrape timestamps and array reordering do not send false notices; coverage edits do",()=>{
  const d=doc();d.classes.push({nice_class:12,coverage_text:"neumáticos"});const before=normalizeInapi(d);
  d.source.updated_at="2026-09-05";d.events[0].updated_at="2026-09-05";d.events[0].seq=99;d.classes.reverse();
  assert.deepEqual(compareRecords(before,normalizeInapi(d)),[]);
  d.classes[0].coverage_text="neumáticos de vehículos";assert.ok(compareRecords(before,normalizeInapi(d)).some(c=>c.field==="inapi.classes"));
});
test("initial expiry completion is recorded without a notification",()=>{
  const d=doc(),before=normalizeInapi(d);d.dates.expires_at="2036-09-01T00:00:00.000Z";
  const changes=compareRecords(before,normalizeInapi(d));assert.equal(changes.length,1);assert.equal(changes[0].ancillary,true);
});
test("a JSONB round trip reorders keys without creating changes or notifications",()=>{
  const reorder = value => Array.isArray(value) ? value.map(reorder) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])) : value;
  const record = normalizeInapi(doc());
  assert.deepEqual(compareRecords(reorder(record), record), []);
});
test("200 IDs use two bounded batches; duplicate, missing, foreign and failed responses are rejected",async()=>{
  process.env.INAPI_API_KEY="test-only";const ids=Array.from({length:200},(_,i)=>String(1600000+i));const calls=[];
  const good=async(_url,options)=>{const batch=JSON.parse(options.body).application_ids;calls.push(batch);return Response.json({documents:batch.map(doc),application_ids_not_found:[]})};
  assert.equal((await fetchInapi({applicationIds:ids,registrationIds:[]},good)).records.length,200);assert.deepEqual(calls.map(c=>c.length),[100,100]);
  const input={applicationIds:["1663533"],registrationIds:[]};
  for(const payload of [{documents:[],application_ids_not_found:[1663533]},{documents:[doc(),doc()],application_ids_not_found:[]},{documents:[doc(999999)],application_ids_not_found:[]}])await assert.rejects(fetchInapi(input,async()=>Response.json(payload)));
  await assert.rejects(fetchInapi(input,async()=>new Response("Unavailable",{status:503})),/503/);
});
