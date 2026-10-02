import { NextResponse } from 'next/server';
import { withSession } from '@/lib/auth';
import { BodyLimitError, boundedJson } from '@/lib/bounded-json';
import { conclusionInputSchema } from '@/lib/feasibility-conclusion';
import { prepareConclusion } from '@/db/feasibility-conclusions';
import { sourceError } from '@/lib/source-api';
export const runtime = 'nodejs';
export const POST = withSession(async request => {
  try {
    const input = conclusionInputSchema.parse(await boundedJson(request, 8 * 1024 * 1024));
    const result = await prepareConclusion(input);
    return NextResponse.json(result, { status: result.pending ? 202 : 200 });
  } catch (error) {
    if (error instanceof BodyLimitError) return NextResponse.json({ message: error.message }, { status: 413 });
    if (error instanceof SyntaxError) return NextResponse.json({ message: 'Los datos del informe no son válidos.' }, { status: 400 });
    return sourceError(error);
  }
});
