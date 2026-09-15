import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { requestToken, SESSION_COOKIE, tokenHash, sessionCookieOptions } from "@/lib/auth";
import { sameOrigin } from "@/lib/source-api";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  const token = requestToken(request);
  if (token) await getSql()`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash(token)}`;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
