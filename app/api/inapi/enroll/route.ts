import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchInapi, isRealSource } from "@/lib/inapi-provider";
import { sameOrigin, sourceError } from "@/lib/source-api";
import { getSql } from "@/db";
import { DEMO_ORG_ID } from "@/db/demo";
import { importRealRecord } from "@/db/inapi-portfolio";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 403 });
  if (!isRealSource()) return NextResponse.json({ message: "La conexión con INAPI no está activa" }, { status: 409 });
  try {
    const input = z.object({ applicationNumber: z.string().regex(/^\d{1,9}$/), confirm: z.boolean().default(false) }).parse(await request.json());
    const { records: [record] } = await fetchInapi({ applicationIds: [input.applicationNumber], registrationIds: [] });
    if (!input.confirm) return NextResponse.json({ record });
    const result = await getSql().begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(741028)`;
      const [existing] = await tx`SELECT id FROM source_snapshots WHERE organization_id = ${DEMO_ORG_ID} AND data->>'provider' = 'inapi' AND data->>'applicationNumber' = ${record.applicationNumber}`;
      if (existing) return { existing: true };
      await importRealRecord(tx, record, record.registrationNumber && record.registrationDate ? "brand" : "application");
      await tx`INSERT INTO source_sync_runs (organization_id, trigger, status, completed_at, requested, received, baseline, request) VALUES (${DEMO_ORG_ID}, 'enrollment', 'success', now(), 1, 1, 1, ${tx.json({ applicationIds: [record.applicationNumber], registrationIds: [] })})`;
      return { existing: false };
    });
    return NextResponse.json({ ...result, record });
  } catch (error) { return sourceError(error); }
}
