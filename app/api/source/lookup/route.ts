import { NextResponse } from "next/server";
import { lookupSchema } from "@/lib/source-contract";
import { sourceLookup } from "@/db/source";
import { hasToken, sourceError } from "@/lib/source-api";
import { withSession } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!hasToken(request, process.env.SOURCE_API_TOKEN)) return withSession(async () => NextResponse.json({ message: "Usa la consulta por número de solicitud" }, { status: 403 }))(request);
  try { return NextResponse.json(await sourceLookup(lookupSchema.parse(await request.json()))); } catch (error) { return sourceError(error); }
}
