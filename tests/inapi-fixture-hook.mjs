// Loaded only by the isolated pilot test process, never by application startup.
import { readFileSync } from "node:fs";
const originalFetch = globalThis.fetch;
if (process.env.PILOT_FIXTURE_FILE) globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (!["https://dequienes.cl/inapi/trademarks/batch", "https://dequienes.cl/inapi/trademarks/by-holder", "https://dequienes.cl/inapi/trademarks/search"].includes(url)) return originalFetch(input, init);
  const fixture = JSON.parse(readFileSync(process.env.PILOT_FIXTURE_FILE, "utf8"));
  if (fixture.fail) return new Response("temporary outage", { status: 503 });
  const query = JSON.parse(init.body);
  const normalize = text => String(text ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (url.endsWith("/by-holder")) {
    const rows = Object.values(fixture.documents).sort((a,b)=>b.application_id-a.application_id).flatMap(doc => {
      const parties = [...(query.role !== "representative" ? doc.holders.map(p=>({...p,role:"holder"})) : []), ...(query.role !== "holder" ? doc.representatives.map(p=>({...p,role:"representative"})) : [])];
      const matched = parties.filter(p=>(!query.name || normalize(p.name).includes(normalize(query.name))) && (!query.rut || String(p.rut) === String(query.rut).replace(/[.\s]/g, "").split("-")[0]));
      return matched.length ? [{application_id:doc.application_id,matched_parties:matched.map(p=>({...p,score:1}))}] : [];
    });
    return Response.json({total_count:rows.length,results:rows.slice(query.offset ?? 0,(query.offset ?? 0)+(query.limit ?? 50))});
  }
  if (url.endsWith("/search")) {
    const rows=Object.values(fixture.documents).filter(doc=>!query.name || normalize(doc.name).includes(normalize(query.name))).slice(0,query.limit ?? 100);
    const mark=doc=>({application_id:doc.application_id,registration_id:doc.registration_id ?? doc.registration_number ?? null,name:doc.name,sign_type:doc.trademark.sign_type,dates:doc.dates,holders:doc.holders,classes:doc.classes,score:.85,channels:{name:{rank:1,score:.85}}});
    return Response.json({query:{name:query.name ?? "",dates:{filed_at:null,published_at:null,registered_at:null},holders:[],classes:query.coverage ?? []},results:rows.map(mark),groups:[],warnings:[],candidate_count:rows.length,elapsed_seconds:.01});
  }
  const ids = query.application_ids;
  return Response.json({ documents: ids.flatMap(id => fixture.documents[id] ? [fixture.documents[id]] : []), application_ids_not_found: ids.filter(id => !fixture.documents[id]) });
};
