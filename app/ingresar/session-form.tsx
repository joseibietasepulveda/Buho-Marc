"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
export function LoginForm({ changePassword = false }: { changePassword?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    if (changePassword && data.get("password") !== data.get("repeatPassword")) { setError("Las claves nuevas no coinciden"); setBusy(false); return; }
    try {
      const response = await fetch(changePassword ? "/api/auth/password" : "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      window.location.assign(payload.redirect ?? "/app");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo conectar"); setBusy(false); }
  }
  return <main className="session-page"><section className="session-card"><Link href="/" className="session-wordmark">BUHO MARC</Link><p className="session-eyebrow">TU ESPACIO DE TRABAJO</p><h1>{changePassword ? "Elige tu nueva clave" : "Bienvenido"}</h1><p>{changePassword ? "Reemplaza la clave temporal para comenzar. Usa al menos 12 caracteres." : "Ingresa para consultar tus marcas, solicitudes y casos."}</p><form onSubmit={submit}>{changePassword ? <label>Clave actual<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={256} /></label> : <label>Usuario<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={120} /></label>}<label>{changePassword ? "Nueva clave" : "Clave"}<input name="password" type="password" autoComplete={changePassword ? "new-password" : "current-password"} required minLength={changePassword ? 12 : 1} maxLength={256} /></label>{changePassword && <label>Repite la nueva clave<input name="repeatPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>}{error && <p role="alert" className="session-error">{error}</p>}<button disabled={busy}>{busy ? "Un momento…" : changePassword ? "Guardar y entrar" : "Entrar"}</button></form></section></main>;
}
