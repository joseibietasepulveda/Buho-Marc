import { after, NextResponse } from 'next/server';
import { withSession } from '@/lib/auth';
import { sourceError } from '@/lib/source-api';
import { watchFeedbackInput } from '@/lib/watch-feedback';
import { deliverWatchFeedback, saveWatchFeedback } from '@/db/watch-feedback';
export const runtime='nodejs',maxDuration=180;
export const POST=withSession(async request=>{try{
  const {id,feedback}=await saveWatchFeedback(watchFeedbackInput.parse(await request.json()));
  // Best-effort immediate delivery after responding; the durable worker retries on restart/failure.
  after(async()=>{await deliverWatchFeedback(id);});
  return NextResponse.json({saved:true,feedback});
 }catch(error){return sourceError(error);}});
