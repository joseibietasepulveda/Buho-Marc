import {NextResponse} from 'next/server';
import {z} from 'zod';
import {withSession} from '@/lib/auth';
import {analyticsSql,parseAnalyticsScope} from '@/db/admin-analytics';
import {readEvaluations} from '@/db/admin-evaluations';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const filters=z.object({asOf:z.iso.datetime().nullable().default(null),allDates:z.enum(['true','false']).default('false').transform(v=>v==='true'),page:z.coerce.number().int().min(1).max(1000000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(40),search:z.string().trim().max(160).default(''),source:z.enum(['all','formal','feedback']).default('all'),outcome:z.enum(['all','positive','negative','neutral']).default('all'),focus:z.enum(['all','changes','comments']).default('all'),matchId:z.uuid().nullable().default(null)});
export const GET=withSession(async request=>{
 let scope:ReturnType<typeof parseAnalyticsScope>,input:z.infer<typeof filters>;
 try{
  const query=new URL(request.url).searchParams;
  scope=parseAnalyticsScope({from:query.get('from'),to:query.get('to'),organizationId:query.get('organizationId'),userId:query.get('userId')});
  input=filters.parse(Object.fromEntries(['page','pageSize','search','source','outcome','focus','matchId','allDates','asOf'].filter(k=>query.has(k)).map(k=>[k,query.get(k)])));
 }catch{return NextResponse.json({message:'No se pudieron leer las evaluaciones. Revisa los filtros y vuelve a intentar.'},{status:400});}
 try{return NextResponse.json(await readEvaluations(analyticsSql(),scope,input));}
 catch{return NextResponse.json({message:'El historial no está disponible en este momento. Vuelve a intentar.'},{status:503});}
},{admin:true,capability:'sourceAdmin'});
