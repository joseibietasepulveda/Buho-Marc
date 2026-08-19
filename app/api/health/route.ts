import { NextResponse } from "next/server";
import { getSql } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, database: "not-configured" }, { status: 503 });
  try {
    await getSql()`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected", engine: "not-connected" });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
