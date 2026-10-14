import {NextResponse} from 'next/server';
import {z} from 'zod';
import {withSession} from '@/lib/auth';
import {checkRegistrationOfficial,OfficialCheckError} from '@/db/inapi-official-check';
import {nextManualReviewDay} from '@/lib/registration-follow-up';
import {sourceError} from '@/lib/source-api';
export const runtime='nodejs';
export const maxDuration=120;
const input=z.object({applicationId:z.string().min(1).max(80)});
export const POST=withSession(async request=>{
 try{
  const {applicationId}=input.parse(await request.json());
  const result=await checkRegistrationOfficial(applicationId);
  const message=result.busy?'Hay una consulta de INAPI en curso. Vuelve a intentarlo cuando termine.':result.status==='unchanged'?'Sigue sin haber información nueva, podrás consultar de nuevo mañana':result.status==='changed'?'Hay información nueva. El expediente fue actualizado.':result.status==='limited'?'Se alcanzó el límite diario de consultas; podrás consultar de nuevo mañana':result.status==='running'?'La consulta de hoy está en curso o fue interrumpida. Se conservan los antecedentes; podrás consultar de nuevo mañana':'No se pudo completar la consulta a INAPI. Se conservan tus antecedentes; podrás consultar de nuevo mañana';
  return NextResponse.json({message,review:result.busy?undefined:{enabled:true,day:result.day,status:result.status},nextAllowedDay:result.busy?undefined:nextManualReviewDay(result.day)}, {status:result.busy?202:result.alreadyChecked?429:result.status==='failed'?502:result.status==='limited'?429:200});
 }catch(error){if(error instanceof OfficialCheckError)return NextResponse.json({message:error.message},{status:error.status});return sourceError(error);}
});
