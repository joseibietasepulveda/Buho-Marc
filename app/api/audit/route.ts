import { NextResponse } from "next/server";
import { withSession } from "@/lib/auth";
import { organizationId } from "@/lib/tenant-context";
import { getSql } from "@/db";
import { sourceError } from "@/lib/source-api";
import { auditAction, auditEntity } from "@/lib/legal-language";
import { auditChanges, type AuditReference } from "@/lib/audit-log";
import { foldText } from "@/lib/text-search";
import { z } from "zod";
export const runtime="nodejs",dynamic="force-dynamic";
const filters=z.object({q:z.string().max(180).default(""),actor:z.union([z.literal(""),z.literal("system"),z.uuid()]).default(""),action:z.string().max(100).default(""),from:z.union([z.literal(""),z.iso.date()]).default(""),to:z.union([z.literal(""),z.iso.date()]).default(""),page:z.coerce.number().int().min(1).max(100000).default(1)});
export const GET=withSession(async request=>{
 try{
  const input=filters.parse(Object.fromEntries(new URL(request.url).searchParams));
  if(input.from&&input.to&&input.from>input.to)return NextResponse.json({message:"La fecha inicial debe ser anterior o igual a la final."},{status:400});
  const sql=getSql(),org=organizationId(),pageSize=25;
  const joined=sql`FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id
   LEFT JOIN brands b ON a.entity_type='brand' AND b.id=a.entity_id AND b.organization_id=a.organization_id
   LEFT JOIN matches m ON a.entity_type='match' AND m.id=a.entity_id AND m.organization_id=a.organization_id
   LEFT JOIN cases c ON a.entity_type='case' AND c.id=a.entity_id AND c.organization_id=a.organization_id
   LEFT JOIN client_contacts cc ON a.entity_type='client' AND cc.id=a.entity_id AND cc.organization_id=a.organization_id
   LEFT JOIN registration_applications ra ON a.entity_type='application' AND ra.id=a.entity_id AND ra.organization_id=a.organization_id
   LEFT JOIN case_tasks ct ON a.entity_type='task' AND ct.id=a.entity_id AND ct.organization_id=a.organization_id
   LEFT JOIN registration_tasks rt ON a.entity_type='task' AND rt.id=a.entity_id AND rt.organization_id=a.organization_id`;
  const where=sql`WHERE a.organization_id=${org}
   AND (${input.actor===""} OR ${input.actor==="system"} AND a.actor_user_id IS NULL OR a.actor_user_id::text=${input.actor})
   AND (${input.action===""} OR a.action=${input.action})
   AND (${input.from===""} OR (a.occurred_at AT TIME ZONE 'America/Santiago')::date>=${input.from||"0001-01-01"}::date)
   AND (${input.to===""} OR (a.occurred_at AT TIME ZONE 'America/Santiago')::date<=${input.to||"9999-12-31"}::date)
   AND (${input.q===""} OR translate(lower(concat_ws(' ',u.name,a.action,b.name,m.found_name,c.title,cc.data->>'name',ra.data->>'name',ct.title,rt.title,b.monitoring_config->>'applicationNumber',m.application_number,ra.data->>'applicationNumber',a.after_data->>'clientName')),'áéíóúüñ','aeiouun') LIKE ${'%'+foldText(input.q)+'%'})`;
  const [counts,actors,actions]=await Promise.all([
   sql`SELECT count(*)::int AS total ${joined} ${where}`,
   sql`SELECT DISTINCT a.actor_user_id AS id,COALESCE(u.name,'Sistema') AS name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.organization_id=${org} ORDER BY name`,
   sql`SELECT DISTINCT action FROM audit_events WHERE organization_id=${org} ORDER BY action`
  ]);
  const total=counts[0].total,page=Math.min(input.page,Math.max(1,Math.ceil(total/pageSize)));
  const rows=await sql`SELECT a.id,a.action,a.entity_type,a.entity_id,a.before_data,a.after_data,a.occurred_at,a.actor_user_id,u.name,
   COALESCE(b.name,m.found_name,c.title,cc.data->>'name',ra.data->>'name',ct.title,rt.title) AS entity_name,
   CASE WHEN b.archived_at IS NULL THEN b.public_code END AS brand_code,m.public_code AS match_code,CASE WHEN c.status='active' THEN c.public_code END AS case_code,cc.public_code AS client_code,ra.public_code AS application_code
   ${joined} ${where} ORDER BY a.occurred_at DESC,a.id DESC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`;
  return NextResponse.json({total,page,pageSize,actors:actors.map(a=>({id:a.id||"system",name:a.name})),actions:actions.map(a=>({key:a.action,label:auditAction(a.action)})),entries:rows.map(row=>{
   const id=row.brand_code||row.match_code||row.case_code||row.client_code||row.application_code;
   const reference=id?{id,type:row.entity_type as AuditReference["type"],name:row.entity_name||auditEntity(row.entity_type)}:undefined;
   return {id:row.id,occurredAt:new Date(row.occurred_at).toISOString(),actor:row.name||"Sistema",actorId:row.actor_user_id,action:auditAction(row.action,row.after_data),actionKey:row.action,area:auditEntity(row.entity_type),detail:[row.entity_name||auditEntity(row.entity_type),row.after_data?.applicationNumber?`Solicitud ${row.after_data.applicationNumber}`:"",row.after_data?.clientName?`Cliente: ${row.after_data.clientName}`:"",row.after_data?.stage||""].filter(Boolean).join(" · "),reference,changes:auditChanges(row.before_data,row.after_data)};
  })});
 }catch(error){return sourceError(error);}
});
