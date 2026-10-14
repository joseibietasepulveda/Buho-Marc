import { NextResponse } from 'next/server';
import { withSession } from '@/lib/auth';
import { digestReadOrganization } from '@/lib/watch-digest-access';
import { digestRun } from '@/db/watch-digest';
import { z } from 'zod';
export const GET = withSession(async request => {
  const org = digestReadOrganization(request);
  if (!org) return NextResponse.json({message:'Resumen no disponible'},{status:404});
  const id = new URL(request.url).searchParams.get('run');
  if (id && !z.uuid().safeParse(id).success) return NextResponse.json({message:'Resumen inválido'},{status:400});
  const run = await digestRun(org,id ?? undefined);
  if (!run?.payload) return NextResponse.json({message:'Este resumen no está disponible en tu espacio'},{status:404});
  return NextResponse.json(run);
});
