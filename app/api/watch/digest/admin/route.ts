import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withSession } from '@/lib/auth';
import { currentIdentity } from '@/lib/tenant-context';
import { digestAdminRuns, digestOrganizations, enqueueDigest, retryDigestEmail } from '@/db/watch-digest';
import { digestConfig, digestConfigurationProblems, nextDigestSlot } from '@/lib/watch-digest';
const input = z.discriminatedUnion('action', [
  z.object({action:z.literal('run'),organizationId:z.uuid(),requestId:z.uuid()}).strict(),
  z.object({action:z.literal('retry'),organizationId:z.uuid(),id:z.uuid()}).strict(),
]);
export const dynamic = 'force-dynamic';
export const GET = withSession(async request => {
  const organizations = await digestOrganizations();
  const selected = new URL(request.url).searchParams.get('organizationId') ?? organizations[0]?.id;
  if (selected && !organizations.some(o => o.id === selected)) return NextResponse.json({message:'Organización no disponible'},{status:404});
  const config = digestConfig();
  return NextResponse.json({organizations,organizationId:selected,enabled:config.enabled,nextRun:nextDigestSlot(new Date()),recipient:config.to,problems:digestConfigurationProblems(config),runs:selected ? await digestAdminRuns(selected) : []});
}, {capability:'sourceAdmin',admin:true});
export const POST = withSession(async request => {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({message:'Solicitud inválida'},{status:400});
  const data = parsed.data;
  if (!(await digestOrganizations()).some(o => o.id===data.organizationId)) return NextResponse.json({message:'Organización no disponible'},{status:404});
  try {
    const result = data.action==='retry' ? await retryDigestEmail(data.organizationId,data.id) : await enqueueDigest(data.organizationId,'manual',`manual:${data.requestId}`,currentIdentity()?.userId);
    return NextResponse.json(result,{status:202});
  } catch (error) { return NextResponse.json({message:error instanceof Error ? error.message : 'No se pudo preparar el resumen'},{status:409}); }
}, {capability:'sourceAdmin',admin:true});
