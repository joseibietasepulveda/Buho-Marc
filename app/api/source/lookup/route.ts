import { NextResponse } from "next/server";
import { lookupSchema } from "@/lib/source-contract";
import { sourceLookup } from "@/db/source";
import { hasToken, sourceError } from "@/lib/source-api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (process.env.SOURCE_API_TOKEN && !hasToken(request, process.env.SOURCE_API_TOKEN)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 401 });
  try { return NextResponse.json(await sourceLookup(lookupSchema.parse(await request.json()))); } catch (error) { return sourceError(error); }
}
