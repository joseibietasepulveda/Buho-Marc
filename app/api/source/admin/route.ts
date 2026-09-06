import { NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/db";
import { DEMO_ORG_ID } from "@/db/demo";
import { advanceSource, editSource, ensureSourceSeed } from "@/db/source";
import { sourceRecordSchema } from "@/lib/source-contract";
import { hasToken, sameOrigin, sourceError } from "@/lib/source-api";
import { isRealSource } from "@/lib/inapi-provider";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await ensureSourceSeed();
    const sql = getSql();
    const records = await sql`SELECT r.*, EXISTS (SELECT 1 FROM source_snapshots s WHERE s.source_id = r.id AND s.organization_id = ${DEMO_ORG_ID}) AS tracked, EXISTS (SELECT 1 FROM source_snapshots s WHERE s.source_id = r.id AND s.organization_id = ${DEMO_ORG_ID} AND s.data <> r.data) AS pending FROM source_records r ORDER BY tracked DESC, r.data->>'name'`;
    const runs = await sql`SELECT * FROM source_sync_runs WHERE organization_id = ${DEMO_ORG_ID} ORDER BY started_at DESC LIMIT 100`;
    // Invalidated test runs remain in PostgreSQL for audit, without sending their
    // redundant historical payload to every browser poll.
    for (const run of runs) if (run.error?.startsWith("Corrida invalidada durante verificación:")) run.detail = [];
    return NextResponse.json({ records: records.filter(r => !isRealSource() || r.data.provider === "inapi"), runs, provider: isRealSource() ? "inapi" : "simulated", schedule: "Todos los días a las 12:30 · America/Santiago", automaticEnabled: process.env.MONITORING_SCHEDULER_ENABLED === "true" });
  } catch (error) { return sourceError(error); }
}
const action = z.discriminatedUnion("action", [z.object({ action: z.literal("advance") }), z.object({ action: z.literal("edit"), id: z.string().uuid(), version: z.number().int().positive(), data: sourceRecordSchema })]);
export async function POST(request: Request) {
  if (isRealSource()) return NextResponse.json({ message: "Los datos recibidos de INAPI son de solo lectura. Use Revisar para actualizarlos." }, { status: 405 });
  if (!sameOrigin(request) && !hasToken(request, process.env.SOURCE_API_TOKEN)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 403 });
  try {
    const input = action.parse(await request.json());
    if (input.action === "advance") return NextResponse.json({ changes: await advanceSource() });
    await editSource(input.id, input.version, input.data);
    return NextResponse.json({ saved: true });
  } catch (error) { return sourceError(error); }
}
