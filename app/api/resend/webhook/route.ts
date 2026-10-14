import {NextResponse} from 'next/server';
import {getSql} from '@/db';
import {verifyResendWebhook,resendLifecycleEvent} from '@/lib/resend-webhook';
export const runtime='nodejs';
export async function POST(request:Request){
 const secret=process.env.RESEND_WEBHOOK_SECRET??'';if(!secret)return NextResponse.json({message:'Webhook no configurado'},{status:503});
 if(Number(request.headers.get('content-length'))>1048576)return NextResponse.json({message:'Evento demasiado grande'},{status:413});
 const raw=await request.text();if(Buffer.byteLength(raw)>1048576)return NextResponse.json({message:'Evento demasiado grande'},{status:413});
 if(!verifyResendWebhook(raw,request.headers,secret))return NextResponse.json({message:'Firma inválida'},{status:401});
 let event;try{event=resendLifecycleEvent(JSON.parse(raw));}catch{return NextResponse.json({message:'Evento inválido'},{status:400});}
 if(!event)return NextResponse.json({accepted:true,ignored:true});
 const sql=getSql();
 const [run]=await sql`SELECT id,organization_id FROM watch_digest_runs WHERE resend_id=${event.emailId} LIMIT 1`;
 if(!run)return NextResponse.json({accepted:true,ignored:true});
 await sql`INSERT INTO analytics_email_events(event_key,organization_id,run_id,event_type,occurred_at,properties) VALUES(${request.headers.get('svix-id')!},${run.organization_id},${run.id},${event.type},${event.occurredAt},${sql.json({source:'resend'})}) ON CONFLICT(event_key) DO NOTHING`;
 return NextResponse.json({accepted:true});
}
