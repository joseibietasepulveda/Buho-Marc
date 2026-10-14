import {NextResponse} from 'next/server';
import {withSession} from '@/lib/auth';
import {currentIdentity} from '@/lib/tenant-context';
import {clientAnalyticsBatch,analyticsCaptureEnabled} from '@/lib/analytics-capture';
import {captureAnalyticsEvent} from '@/lib/analytics-telemetry';
const buckets=new Map<string,{start:number;count:number}>();
export const runtime='nodejs';
export const POST=withSession(async request=>{
 if(!analyticsCaptureEnabled())return NextResponse.json({accepted:0,enabled:false});
 const identity=currentIdentity()!,now=Date.now(),previous=buckets.get(identity.userId),bucket=previous&&now-previous.start<60000?previous:{start:now,count:0};
 if(buckets.size>2000)for(const [key,value]of buckets)if(now-value.start>=60000)buckets.delete(key);
 if(Number(request.headers.get('content-length'))>32768)return NextResponse.json({message:'Demasiados eventos'},{status:413});
 const raw=await request.text();if(Buffer.byteLength(raw)>32768)return NextResponse.json({message:'Demasiados eventos'},{status:413});
 let value:unknown;try{value=JSON.parse(raw);}catch{return NextResponse.json({message:'Eventos inválidos'},{status:400});}
 const parsed=clientAnalyticsBatch.safeParse(value);if(!parsed.success)return NextResponse.json({message:'Eventos inválidos'},{status:400});
 bucket.count+=parsed.data.events.length;buckets.set(identity.userId,bucket);if(bucket.count>300)return NextResponse.json({message:'Límite de actividad'},{status:429});
 const valid=parsed.data.events.filter(e=>Math.abs(now-Date.parse(e.occurredAt))<24*3600000);
 for(const event of valid)captureAnalyticsEvent({...event,properties:{...event.properties,source:'client'}});
 return NextResponse.json({accepted:valid.length,enabled:true},{status:202});
});
