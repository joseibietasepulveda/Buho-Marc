"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import "./portfolio-logo.css";

type Props = { name: string; src?: string; type: string; width?: number; height?: number };

/** A changed source gets a fresh retry budget, including when switching dossiers. */
export function PortfolioLogo(props: Props) {
  if (!props.src) return <span className="portfolio-word-mark">{props.type === "Denominativa" ? "Denominativa" : "Sin imagen disponible"}</span>;
  return <LoadedLogo key={props.src} {...props} src={props.src} />;
}

function LoadedLogo({ name, src, width = 96, height = 72 }: Props & { src: string }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  useEffect(() => {
    if (status !== "error" || attempt >= 2) return;
    const timer = setTimeout(() => {
      setAttempt(value => value + 1);
      setStatus("loading");
    }, attempt === 0 ? 1000 : 3000);
    return () => clearTimeout(timer);
  }, [status, attempt]);

  // Only our authenticated proxy receives a cache-busting parameter. External
  // signed image URLs must remain intact; failed responses are not cached.
  const imageSrc = /^\/api\/inapi\/logo\/\d+$/.test(src) && attempt
    ? `${src}?retry=${attempt}` : src;
  const exhausted = status === "error" && attempt >= 2;
  return <span className="portfolio-logo" data-state={status} style={{ width, height }}>
    {!exhausted && <Image key={attempt} unoptimized src={imageSrc}
      alt={`Parte figurativa de ${name}`} width={width} height={height}
      tabIndex={status === "loaded" ? 0 : -1} role="button"
      aria-label={`Ampliar imagen de ${name}`}
      style={{ visibility: status === "loaded" ? "visible" : "hidden" }}
      onLoad={() => setStatus("loaded")} onError={() => setStatus("error")} />}
    {status !== "loaded" && <span className="portfolio-logo-status">
      {exhausted ? <span>Imagen no disponible</span> : <span role="status">Cargando imagen…</span>}
    </span>}
  </span>;
}
