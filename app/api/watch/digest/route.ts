import { NextResponse } from 'next/server';
import { withSession } from '@/lib/auth';
import { digestReadOrganization } from '@/lib/watch-digest-access';
import { digestRun } from '@/db/watch-digest';
import { z } from 'zod';
import { captureAnalyticsEvent } from '@/lib/analytics-telemetry';
import { currentIdentity } from '@/lib/tenant-context';
export const GET = withSession(async request => {
  const org = digestReadOrganization(request);
  if (!org) return NextResponse.json({message:'Resumen no disponible'},{status:404});
  const id = new URL(request.url).searchParams.get('run');
  if (id && !z.uuid().safeParse(id).success) return NextResponse.json({message:'Resumen inválido'},{status:400});
  const run = await digestRun(org,id ?? undefined);
  if (!run?.payload) return NextResponse.json({message:'Este resumen no está disponible en tu espacio'},{status:404});
  // Attribute only validated reads in the user's own study; an internal preview
  // of another study is not evidence that its recipient opened the summary.
  if(currentIdentity()?.organizationId===org)captureAnalyticsEvent({module:'summary',eventName:'digest_viewed',properties:{source:'server',digest_run_id:run.id}});
  return NextResponse.json(run);
});
