import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withSession } from '@/lib/auth';
import { currentIdentity } from '@/lib/tenant-context';
import { assignAnalyticsBrand, deleteAnalyticsCostRule, parseAnalyticsScope, readAdminDashboard, saveAnalyticsCostRule } from '@/db/admin-analytics';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('refresh'),from:date.optional(),to:date.optional(),organizationId:z.uuid().nullable().optional(),userId:z.uuid().nullable().optional()}).strict(),
 z.object({action:z.literal('save_cost_rule'),organizationId:z.uuid().nullable().optional(),provider:z.string().trim().min(1).max(60).regex(/^[a-z0-9_-]+$/),operation:z.string().trim().min(1).max(120).regex(/^[a-z0-9_.-]+$/).nullable().optional(),kind:z.enum(['per_call','fixed_monthly','budget_monthly']),amountUsd:z.number().finite().min(0).max(1000000),label:z.string().trim().min(1).max(180),effectiveFrom:date,effectiveTo:date.nullable().optional()}).strict(),
 z.object({action:z.literal('delete_cost_rule'),id:z.uuid()}).strict(),
 z.object({action:z.literal('assign_brand'),organizationId:z.uuid(),brandId:z.uuid(),userId:z.uuid().nullable()}).strict(),
]);
export const GET=withSession(async request=>{
 try {
  const query=new URL(request.url).searchParams;
  const scope=parseAnalyticsScope({from:query.get('from'),to:query.get('to'),organizationId:query.get('organizationId'),userId:query.get('userId')});
  return NextResponse.json(await readAdminDashboard(scope));
 } catch(error) {return NextResponse.json({message:error instanceof Error?error.message:'No se pudo leer el dashboard'},{status:400});}
},{admin:true,capability:'sourceAdmin'});
export const POST=withSession(async request=>{
 const parsed=input.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({message:'Solicitud inválida'},{status:400});
 try {
  const data=parsed.data,actor=currentIdentity()!.userId;
  if(data.action==='refresh')return NextResponse.json(await readAdminDashboard(parseAnalyticsScope(data),true),{status:202});
  if(data.action==='assign_brand')return NextResponse.json(await assignAnalyticsBrand(data.organizationId,data.brandId,data.userId,actor));
  if(data.action==='delete_cost_rule')return NextResponse.json(await deleteAnalyticsCostRule(data.id,actor));
  parseAnalyticsScope({from:data.effectiveFrom,to:data.effectiveFrom});
  if(data.effectiveTo){parseAnalyticsScope({from:data.effectiveTo,to:data.effectiveTo});if(data.effectiveTo<data.effectiveFrom)throw new Error('La vigencia final no puede preceder al inicio');}
  return NextResponse.json(await saveAnalyticsCostRule({...data,organizationId:data.organizationId??null,operation:data.operation??null,effectiveTo:data.effectiveTo??null},actor),{status:201});
 } catch(error) {return NextResponse.json({message:error instanceof Error?error.message:'No se pudo guardar'},{status:400});}
},{admin:true,capability:'sourceAdmin'});
