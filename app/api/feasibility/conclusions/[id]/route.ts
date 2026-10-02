import { NextResponse } from 'next/server';
import { withSession } from '@/lib/auth';
import { getSql } from '@/db';
import { organizationId } from '@/lib/tenant-context';
import { sourceError } from '@/lib/source-api';
export const runtime = 'nodejs';
export const GET = withSession(async request => {
  const id = new URL(request.url).pathname.split('/').pop();
  if (!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return NextResponse.json({ message: 'Conclusión no encontrada.' }, { status: 404 });
  try {
    const [row] = await getSql()`SELECT status,output FROM feasibility_conclusions WHERE id=${id} AND organization_id=${organizationId()}`;
    if (!row) return NextResponse.json({ message: 'Conclusión no encontrada.' }, { status: 404 });
    return NextResponse.json({ status: row.status, conclusion: row.output }, { status: row.status === 'pending' ? 202 : 200 });
  } catch (error) { return sourceError(error); }
});
