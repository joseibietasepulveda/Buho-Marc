"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

export function CandidateLogo({ src, name }: { src?: string; name: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!failed || attempt >= 2) return;
    const timer = setTimeout(() => { setAttempt(value => value + 1); setFailed(false); }, (attempt + 1) * 1200);
    return () => clearTimeout(timer);
  }, [failed, attempt]);
  if (!src) return <span className="candidate-no-logo">Sin logo</span>;
  if (failed) return <span className="candidate-logo-unavailable" role="status">
    {attempt < 2 ? "Reintentando imagen…" : <>Imagen no disponible<button type="button" aria-label={`Reintentar imagen de ${name}`} onClick={() => { setAttempt(0); setFailed(false); }}>Reintentar</button></>}
  </span>;
  const image = attempt && src.startsWith("/api/inapi/logo/") ? `${src}?retry=${attempt}` : src;
  return <Image unoptimized src={image} width={64} height={60} alt={`Logo de ${name}`} loading="lazy" onError={() => setFailed(true)} />;
}
