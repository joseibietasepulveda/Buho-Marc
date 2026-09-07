"use client";
import { useEffect, useState } from "react";
import type { RegistrationApplication } from "@/lib/registration-data";

export function RegistrationLogo({ application, large = false }: { application: RegistrationApplication; large?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!failed || attempt >= 2) return;
    const timer = setTimeout(() => { setAttempt(value => value + 1); setFailed(false); }, (attempt + 1) * 1200);
    return () => clearTimeout(timer);
  }, [failed, attempt]);
  const label = application.type === "Denominativa" && !application.logo ? "Marca denominativa" : application.logo ? "Imagen no disponible" : "Imagen no informada";
  if (!application.logo || (failed && attempt >= 2)) return <span className={`trademark-no-logo${large ? " is-large" : ""}`} title={label} aria-label={label}>{large ? label : application.type === "Denominativa" && !application.logo ? "Aa" : "—"}</span>;
  const src = attempt && application.logo.startsWith("/api/inapi/logo/") ? `${application.logo}?retry=${attempt}` : application.logo;
  return <img alt={`Logo de ${application.name}`} src={src} width={large ? 104 : 48} height={large ? 104 : 48} loading={large ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />;
}
