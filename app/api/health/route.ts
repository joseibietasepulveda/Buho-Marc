import { NextResponse } from "next/server";
import { getSql } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, database: "not-configured" }, { status: 503 });
  try {
    await getSql()`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected", provider: process.env.SOURCE_PROVIDER ?? "simulated", sourceConfigured: Boolean(process.env.INAPI_API_KEY), automaticEnabled: process.env.MONITORING_SCHEDULER_ENABLED === "true", version: "1.0", engine: process.env.SOURCE_PROVIDER === "inapi" && process.env.INAPI_API_KEY ? "dequienes" : "not-configured" });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
