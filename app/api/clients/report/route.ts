import { NextResponse } from "next/server";
import { z } from "zod";
import { withSession } from "@/lib/auth";
import { sourceError } from "@/lib/source-api";
import { loadClientReport } from "@/db/client-report";
import { CLIENT_REPORT_FORMATS, createClientReport } from "@/lib/client-report";

export const runtime="nodejs";
const clientCode=z.string().regex(/^CL-\d+$/);
export const GET=withSession(async request=>{
  try{
    const report=await loadClientReport(clientCode.parse(new URL(request.url).searchParams.get("clientId")));
    if(!report)return NextResponse.json({message:"No se encontró el cliente en tu espacio."},{status:404});
    return NextResponse.json({fields:report.fields,count:report.rows.length});
  }catch(error){return sourceError(error);}
});
const input=z.object({clientId:clientCode,format:z.enum(["xlsx","docx","pdf"]).default("xlsx"),fields:z.array(z.string().min(1).max(300)).min(1).max(1000)}).strict();
export const POST=withSession(async request=>{
  try{
    const chosen=input.parse(await request.json()),report=await loadClientReport(chosen.clientId);
    if(!report)return NextResponse.json({message:"No se encontró el cliente en tu espacio."},{status:404});
    if(chosen.fields.some(key=>!report.fields.some(f=>f.key===key)))return NextResponse.json({message:"Las columnas disponibles cambiaron. Actualiza la selección e intenta nuevamente."},{status:422});
    const content=await createClientReport(report,chosen.fields,chosen.format),spec=CLIENT_REPORT_FORMATS[chosen.format];
    const name=report.client.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"-").slice(0,80);
    return new Response(Buffer.from(content),{headers:{"Content-Type":spec.contentType,"Content-Disposition":`attachment; filename="informe-cliente-${name}.${spec.extension}"`}});
  }catch(error){return sourceError(error);}
});
