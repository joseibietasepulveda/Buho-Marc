import { NextResponse } from "next/server";
import { withSession } from "@/lib/auth";
import { organizationId } from "@/lib/tenant-context";
import { getSql } from "@/db";
import { discoverInapi } from "@/lib/inapi-discovery";
import { SimilarityError } from "@/lib/similarity-provider";
import { z } from "zod";
export const runtime = "nodejs";
export const maxDuration = 180;
export const POST = withSession(async request => {
  try {
    const result = await discoverInapi(await request.json());
    const rows = await getSql()`SELECT data->>'applicationNumber' AS application_number FROM source_snapshots WHERE organization_id = ${organizationId()} AND entity_type IN ('brand', 'application')`;
    const tracked = new Set(rows.map(row => row.application_number));
    return NextResponse.json({ ...result, candidates: result.candidates.map(candidate => ({ ...candidate, tracked: tracked.has(candidate.applicationNumber) })) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "No se pudo completar la búsqueda." }, { status: error instanceof SimilarityError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500 });
  }
});
