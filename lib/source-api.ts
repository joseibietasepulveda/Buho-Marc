import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
export function hasToken(request: Request, token?: string) {
  if (!token) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const received = new URL(origin).origin;
    // Railway terminates TLS upstream: request.url may contain the internal
    // container hostname. Trust its configured public domain, not forwarded input.
    const expected = process.env.APP_PUBLIC_ORIGIN || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : new URL(request.url).origin);
    return received === new URL(expected).origin;
  } catch { return false; }
}
export function sourceError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  return NextResponse.json({ message: error instanceof Error ? error.message : "No se pudo completar la operación" }, { status: 500 });
}
