import { NextResponse } from 'next/server';
import { hasToken } from '@/lib/source-api';
import { processAnalyticsSnapshot } from '@/db/admin-analytics';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(request:Request) {
 if(!hasToken(request,process.env.MONITORING_CRON_SECRET))return NextResponse.json({message:'Acceso no autorizado'},{status:403});
 return NextResponse.json(await processAnalyticsSnapshot());
}
