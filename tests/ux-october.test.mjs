import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { textMatches, compactRut } from "../lib/text-search.ts";
import { readAssistedImportFile } from "../lib/portfolio-import.ts";
import { discoverySchema, discoverInapi } from "../lib/inapi-discovery.ts";
import { proposalSchema } from "../lib/similarity-contract.ts";
import { flattenReportData, completeReportFields, createClientReport } from "../lib/client-report.ts";

test("text modes ignore accents, distinguish words, and preserve exact RUT matching",()=>{
  assert.equal(textMatches("RAULÍ NATURAL","rauli","starts"),true);
  assert.equal(textMatches("RAULÍ NATURAL","natural","ends"),true);
  assert.equal(textMatches("RAULÍ NATURAL","rauli natural","exact"),true);
  assert.equal(textMatches("RAULÍ NATURAL","rauli","exact"),false);
  assert.equal(textMatches("NOVA FOODS","nova","word"),true);
  assert.equal(textMatches("INNOVACIÓN","nova","word"),false);
  assert.equal(textMatches("A+B MARCA","a+b","word"),true);
  assert.equal(textMatches("TERRA SUR","tierra sur","similar"),true);
  assert.equal(compactRut("76.123.456-k"),"76123456k");
});
test("assisted workbook supports mixed sheets, explicit representative roles, deduplication and formula rejection",async()=>{
  const wb=new ExcelJS.Workbook();
  wb.addWorksheet("Solicitudes").addRows([["numero_solicitud"],[1234567],[1234567]]);
  wb.addWorksheet("Estudio").addRows([["rut_representante","representante","rol","cliente"],["76.123.456-7","Estudio Jurídico","representante","Cliente por confirmar"],["76123456-7","Estudio Juridico","representante","Cliente por confirmar"],["","Otro","rol incorrecto",""]]);
  wb.addWorksheet("Empresas").addRows([["razon_social","rut"],["Comercial Río SpA",""],[{formula:"1+1"},""]]);
  const result=await readAssistedImportFile(Buffer.from(await wb.xlsx.writeBuffer()),"cartera.xlsx");
  assert.deepEqual(result.ids,["1234567"]);assert.equal(result.duplicates,2);assert.equal(result.invalid.length,2);
  assert.equal(result.queries[0].role,"representative");assert.equal(result.queries[0].clientName,"Cliente por confirmar");
  assert.equal(result.queries[1].role,"holder");assert.equal(result.queries[1].partyName,"Comercial Río SpA");
  await assert.rejects(()=>readAssistedImportFile(Buffer.from("rol,cliente\nambos,\n"),"vacio.csv"));
});
test("new feasibility options validate dates and grouping while excluding unsupported criteria",()=>{
  const proposal=proposalSchema.parse({name:"Ventisca",filed_after:"2026-01-01",published_after:"2026-03-01",matchMode:"word",visual_model:"contrastive4k",holders:[{name:"Cliente"}],exclude_same_holder:true});
  assert.equal(proposal.grouped,true);assert.equal(proposal.matchMode,"word");
  assert.equal(proposalSchema.safeParse({name:"Marca",filed_after:"2026-02-30"}).success,false);
  assert.equal(discoverySchema.safeParse({name:""}).success,false);
});
const document=(id,name)=>({application_id:id,registration_number:123456,name,status:{code:"016",description:"Registrada"},dates:{filed_at:"2026-01-01",published_at:"2026-03-01",registered_at:"2026-05-01",expires_at:"2036-05-01",last_changed_at:null},trademark:{sign_type:"Denominativa"},holders:[{name:"Comercial Río",rut:"76123456",dv:"7",country:"CL"}],representatives:[{name:"Estudio Jurídico",rut:"77123456",dv:"K",country:"CL"}],classes:[{nice_class:35}],events:[{event_id:"1",event_date:"2026-05-01",status_description:"Concesión de marca",status_code:"001"}],annotations:[],source:{}});
test("party discovery pages without losing total count and filters only the recovered batch",async()=>{
  const oldProvider=process.env.SOURCE_PROVIDER,oldKey=process.env.INAPI_API_KEY;
  process.env.SOURCE_PROVIDER="inapi";process.env.INAPI_API_KEY="fixture-only";
  const calls=[];
  try{
    const fetcher=async(url,init)=>{
      const body=JSON.parse(init.body);calls.push({url,body});
      if(url.endsWith("/by-holder"))return Response.json({total_count:7,results:[{application_id:1234567,matched_parties:[{role:"representative",name:"Estudio Jurídico",rut:"77123456",dv:"K",score:1}]},{application_id:1234568,matched_parties:[{role:"representative",name:"Estudio Jurídico",score:.9}]}]});
      return Response.json({documents:body.application_ids.map(id=>document(id,id===1234567?"VENTISCA SUR":"VENTISCAL")),application_ids_not_found:[]});
    };
    const result=await discoverInapi({partyName:"Estudio Jurídico",role:"representative",name:"ventisca",matchMode:"word",limit:2,offset:2},fetcher);
    assert.equal(result.total,7);assert.equal(result.nextOffset,4);assert.equal(result.hasMore,true);assert.equal(result.filtered,true);
    assert.equal(result.candidates.length,1);assert.match(result.candidates[0].explanation,/Representante/);
    assert.deepEqual(calls[0].body,{name:"Estudio Jurídico",role:"representative",limit:2,offset:2});
    assert.ok(!("matchMode" in calls[0].body));assert.deepEqual(calls[1].body.application_ids,[1234567,1234568]);
    const combined = await discoverInapi({applicationNumber:"1234568",partyName:"Estudio Jurídico",role:"representative",rut:"77.123.456-K"},fetcher);
    assert.equal(combined.candidates.length,1);assert.equal(combined.candidates[0].applicationNumber,"1234568");
    assert.equal(calls[2].body.rut,"77.123.456-K");assert.equal(calls[2].body.name,"Estudio Jurídico");
  }finally{if(oldProvider===undefined)delete process.env.SOURCE_PROVIDER;else process.env.SOURCE_PROVIDER=oldProvider;if(oldKey===undefined)delete process.env.INAPI_API_KEY;else process.env.INAPI_API_KEY=oldKey;}
});
test("client exports contain only selected columns, retain long cells and produce valid PDF/Word",async()=>{
  const values={applicationNumber:"1234567",name:"RAULÍ",ownerRut:"76.123.456-7",coverage:"Contenido de cobertura ".repeat(2500)};
  flattenReportData({events:[{fecha:"2026-01-01",descripcion:"Observación"}],extra:{foo:"dato disponible"}},"source",values);
  const rows=[{title:"RAULÍ",values}],fields=completeReportFields(rows),report={client:{name:"Cliente de prueba"},rows,fields};
  assert.ok(fields.some(f=>f.key==="source.extra.foo"));
  const selected=["applicationNumber","name","coverage","source.events"];
  const bytes=await createClientReport(report,selected,"xlsx"),wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(bytes));
  assert.equal(wb.worksheets[0].columnCount,4);
  assert.deepEqual(wb.worksheets[0].getRow(2).values.slice(1,3),["1234567","RAULÍ"]);
  assert.ok(wb.getWorksheet("Contenido extenso"));assert.ok(!wb.worksheets[0].getRow(1).values.includes("RUT del titular"));
  const pdf=await PDFDocument.load(await createClientReport(report,["name","source.events"],"pdf"));
  assert.equal(pdf.getTitle(),"Informe de cliente · Cliente de prueba");assert.ok(pdf.getPageCount()>=1);
  const docx=await createClientReport(report,["name","source.events"],"docx");assert.equal(Buffer.from(docx).subarray(0,2).toString(),"PK");
  await assert.rejects(()=>createClientReport(report,["unknown"],"xlsx"));
});
