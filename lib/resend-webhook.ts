import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
export function verifyResendWebhook(raw:string,headers:Headers,secret:string,now=Date.now()){
 const id=headers.get('svix-id')??'',timestamp=headers.get('svix-timestamp')??'',signatures=headers.get('svix-signature')??'';
 if(!secret.startsWith('whsec_')||!id||id.length>180||!/^\d{10}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||signatures.length>2000)return false;
 const key=Buffer.from(secret.slice(6),'base64');if(key.length<16)return false;
 const expected=createHmac('sha256',key).update(`${id}.${timestamp}.${raw}`).digest();
 return signatures.split(' ').some(signature=>{const [version,value]=signature.split(',');if(version!=='v1'||!value)return false;const actual=Buffer.from(value,'base64');return actual.length===expected.length&&timingSafeEqual(actual,expected);});
}
const webhook=z.object({type:z.string().max(100),created_at:z.iso.datetime({offset:true}),data:z.object({email_id:z.string().min(1).max(180)}).passthrough()}).passthrough();
const kinds:Record<string,string>={'email.delivered':'delivered','email.bounced':'bounced','email.failed':'failed','email.complained':'complained','email.opened':'opened','email.clicked':'clicked'};
export function resendLifecycleEvent(value:unknown){const input=webhook.parse(value);return kinds[input.type]?{type:kinds[input.type],emailId:input.data.email_id,occurredAt:input.created_at}:null;}
