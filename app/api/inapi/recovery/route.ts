import { NextResponse } from "next/server";
import { processInapiRecovery } from "@/db/inapi-recovery";
import { hasToken, sourceError } from "@/lib/source-api";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  if (!hasToken(request, process.env.MONITORING_CRON_SECRET)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 403 });
  try { return NextResponse.json(await processInapiRecovery()); }
  catch (error) { return sourceError(error); }
}
