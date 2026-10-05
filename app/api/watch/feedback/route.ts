import { NextResponse } from 'next/server';
import { withSession } from '@/lib/auth';
import { sourceError } from '@/lib/source-api';
import { watchFeedbackInput } from '@/lib/watch-feedback';
import { saveWatchFeedback } from '@/db/watch-feedback';
export const runtime='nodejs',maxDuration=180;
export const POST=withSession(async request=>{try{return NextResponse.json({saved:true,feedback:await saveWatchFeedback(watchFeedbackInput.parse(await request.json()))});}catch(error){return sourceError(error);}});
