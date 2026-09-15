import { NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/db";
import { verifyPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE, sessionCookieOptions, tokenHash } from "@/lib/auth";
import { sameOrigin } from "@/lib/source-api";
const inputSchema = z.object({ username: z.string().trim().toLowerCase().min(1).max(120), password: z.string().min(1).max(256) });
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  try {
    const input = inputSchema.parse(await request.json());
    const sql = getSql();
    const key = tokenHash(`login:${input.username}`);
    const [attempt] = await sql`INSERT INTO auth_attempts (key, count) VALUES (${key}, 1) ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN auth_attempts.window_start < now() - interval '15 minutes' THEN 1 ELSE auth_attempts.count + 1 END,
      window_start = CASE WHEN auth_attempts.window_start < now() - interval '15 minutes' THEN now() ELSE auth_attempts.window_start END RETURNING count`;
    if (attempt.count > 10) return NextResponse.json({ message: "Demasiados intentos. Vuelve a intentar en 15 minutos." }, { status: 429 });
    const [user] = await sql`SELECT u.id, u.password_hash, u.must_change_password, m.organization_id FROM users u JOIN organization_members m ON m.user_id = u.id JOIN organizations o ON o.id = m.organization_id WHERE u.username = ${input.username} AND o.status = 'active' ORDER BY m.created_at LIMIT 1`;
    const valid = await verifyPassword(input.password, user?.password_hash ?? "scrypt:00000000000000000000000000000000:" + "00".repeat(64));
    if (!user || !valid) return NextResponse.json({ message: "Usuario o clave incorrectos" }, { status: 401 });
    await sql`DELETE FROM auth_attempts WHERE key = ${key}`;
    const token = await createSession(user.id, user.organization_id);
    const response = NextResponse.json({ redirect: user.must_change_password ? "/cambiar-clave" : "/app" });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return NextResponse.json({ message: error instanceof z.ZodError ? "Completa tu usuario y clave" : "No se pudo iniciar sesión. Reintenta en unos minutos." }, { status: error instanceof z.ZodError ? 400 : 503 });
  }
}
