import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { DEMO_ORG_ID } from "@/db/demo";
import { ensureSourceSeed } from "@/db/source";
import { sourceError } from "@/lib/source-api";
import { isRealSource } from "@/lib/inapi-provider";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await ensureSourceSeed();
    const rows = await getSql()`SELECT data FROM registration_applications WHERE organization_id = ${DEMO_ORG_ID} ORDER BY public_code DESC`;
    return NextResponse.json({ provider: isRealSource() ? "inapi" : "simulated", applications: rows.map(r => r.data).filter(a => !isRealSource() || a.provider === "inapi") });
  } catch (error) { return sourceError(error); }
}
