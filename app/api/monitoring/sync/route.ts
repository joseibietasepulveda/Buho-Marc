import { NextResponse } from "next/server";
import { syncSource } from "@/db/source-sync";
import { hasToken, sameOrigin, sourceError } from "@/lib/source-api";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const scheduled = new URL(request.url).searchParams.get("trigger") === "scheduled";
    if (scheduled ? !hasToken(request, process.env.MONITORING_CRON_SECRET) : !sameOrigin(request) && !hasToken(request, process.env.MONITORING_CRON_SECRET)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 403 });
    return NextResponse.json(await syncSource(scheduled ? "scheduled" : "manual"));
  } catch (error) { return sourceError(error); }
}
