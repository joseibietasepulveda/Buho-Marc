import { NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requestToken, sessionIdentity, tokenHash } from "@/lib/auth";
import { sameOrigin } from "@/lib/source-api";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  const token = requestToken(request);
  const identity = await sessionIdentity(token);
  if (!identity) return NextResponse.json({ message: "Inicia sesión para continuar" }, { status: 401 });
  try {
    const input = z.object({ currentPassword: z.string().min(1).max(256), password: z.string().min(12).max(256) }).parse(await request.json());
    const sql = getSql();
    const key = tokenHash(`password:${identity.userId}`);
    const [attempt] = await sql`INSERT INTO auth_attempts (key, count) VALUES (${key}, 1) ON CONFLICT (key) DO UPDATE SET count = CASE WHEN auth_attempts.window_start < now() - interval '15 minutes' THEN 1 ELSE auth_attempts.count + 1 END, window_start = CASE WHEN auth_attempts.window_start < now() - interval '15 minutes' THEN now() ELSE auth_attempts.window_start END RETURNING count`;
    if (attempt.count > 10) return NextResponse.json({ message: "Demasiados intentos. Reintenta en 15 minutos." }, { status: 429 });
    const [user] = await sql`SELECT password_hash, username FROM users WHERE id = ${identity.userId}`;
    if (!await verifyPassword(input.currentPassword, user.password_hash)) return NextResponse.json({ message: "La clave actual es incorrecta" }, { status: 400 });
    if (input.password === input.currentPassword || input.password.toLowerCase() === user.username) return NextResponse.json({ message: "Elige una clave diferente del usuario y de la clave temporal" }, { status: 400 });
    const hash = await hashPassword(input.password);
    await sql.begin(async tx => {
      await tx`UPDATE users SET password_hash = ${hash}, must_change_password = false, updated_at = now() WHERE id = ${identity.userId}`;
      await tx`DELETE FROM auth_sessions WHERE user_id = ${identity.userId} AND token_hash <> ${tokenHash(token!)}`;
      await tx`DELETE FROM auth_attempts WHERE key = ${key}`;
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ message: "Usa una clave de al menos 12 caracteres" }, { status: 400 }); }
}
