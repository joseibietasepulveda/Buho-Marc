import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSql } from "../db/index";
import { sameOrigin } from "./source-api";
import { runAs, type Identity } from "./tenant-context";

export const SESSION_COOKIE = "buho_session";
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const sessionCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 12 });
export async function sessionIdentity(token?: string): Promise<Identity | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [row] = await getSql()`SELECT u.id, u.name, u.must_change_password, o.id AS organization_id, o.name AS organization_name, m.role
    FROM auth_sessions s JOIN users u ON u.id = s.user_id JOIN organizations o ON o.id = s.organization_id
    JOIN organization_members m ON m.organization_id = o.id AND m.user_id = u.id
    WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > now() AND o.status = 'active'`;
  return row ? { userId: row.id, name: row.name, organizationId: row.organization_id, organizationName: row.organization_name, role: row.role, mustChangePassword: row.must_change_password } : null;
}
export function requestToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}
export async function createSession(userId: string, organizationId: string) {
  const token = randomBytes(32).toString("hex");
  await getSql()`INSERT INTO auth_sessions (token_hash, user_id, organization_id, expires_at) VALUES (${tokenHash(token)}, ${userId}, ${organizationId}, now() + interval '12 hours')`;
  return token;
}
export function withSession(handler: (request: Request) => Promise<Response>, options: { admin?: boolean } = {}) {
  return async (request: Request) => {
    try {
      const identity = await sessionIdentity(requestToken(request));
      if (!identity) return NextResponse.json({ message: "Inicia sesión para continuar" }, { status: 401 });
      if (identity.mustChangePassword) return NextResponse.json({ message: "Cambia tu clave temporal para continuar" }, { status: 403 });
      if (options.admin && identity.role !== "admin") return NextResponse.json({ message: "Se requiere un administrador" }, { status: 403 });
      if (!["GET", "HEAD"].includes(request.method) && !sameOrigin(request)) return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
      const response = await runAs(identity, () => handler(request));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      console.error("Authenticated request failed", error);
      return NextResponse.json({ message: "No se pudo completar la operación. Vuelve a intentarlo." }, { status: 500 });
    }
  };
}
