"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const visualCubes = [
  { logo: "02", result: "match" },
  { logo: "16", result: "match" },
  { logo: "23", result: "alert" },
  { logo: "07", result: "match" },
  { logo: "11", result: "match" },
  { logo: "28", result: "alert" },
  { logo: "05", result: "match" },
] as const;

const multimodalCubes = [
  { logo: "02", result: "match", detection: "clear", text: "NORTE ESTUDIO" },
  { logo: "16", result: "alert", detection: "image", text: "MONTAÑA SUR" },
  { logo: "23", result: "alert", detection: "text", text: "BUHO LEGAL" },
  { logo: "07", result: "match", detection: "clear", text: "CÍRCULO CREATIVO" },
  { logo: "28", result: "alert", detection: "image", text: "PRISMA MARCAS" },
  { logo: "11", result: "alert", detection: "text", text: "BUHO STUDIO" },
] as const;

const resultCopy = {
  match: {
    symbol: "✓",
    title: "Sin coincidencia detectada",
    note: "No hay coincidencia detectada",
  },
  alert: {
    symbol: "×",
    title: "Revisión requerida",
    note: "Similitud relevante",
  },
  idle: {
    symbol: "·",
    title: "Esperando siguiente activo",
    note: "El escáner continúa en movimiento",
  },
} as const;

type AssetScannerProps = {
  className?: string;
  compact?: boolean;
  isPlaying?: boolean;
  multimodal?: boolean;
};

export default function AssetScanner({
  className = "",
  compact = false,
  isPlaying = true,
  multimodal = false,
}: AssetScannerProps) {
  const gateRef = useRef<HTMLDivElement>(null);
  const cubeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeCubeIndex, setActiveCubeIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

    let animationFrame = 0;

    const syncScanner = () => {
      const gate = gateRef.current?.getBoundingClientRect();
      if (gate) {
        const gateCenter = gate.left + gate.width / 2;
        const readingWidth = Math.min(34, gate.width * 0.24);
        const nextActiveCubeIndex = cubeRefs.current.findIndex((cube) => {
          if (!cube) return false;
          const cubeRect = cube.getBoundingClientRect();
          const cubeCenter = cubeRect.left + cubeRect.width / 2;
          const passesReadingLine = Math.abs(cubeCenter - gateCenter) <= readingWidth;
          const overlapsGateVertically = cubeRect.bottom > gate.top && cubeRect.top < gate.bottom;
          return passesReadingLine && overlapsGateVertically;
        });

        setActiveCubeIndex((currentIndex) =>
          currentIndex === nextActiveCubeIndex ? currentIndex : nextActiveCubeIndex,
        );
      }

      animationFrame = window.requestAnimationFrame(syncScanner);
    };

    animationFrame = window.requestAnimationFrame(syncScanner);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  const activeCubes = multimodal ? multimodalCubes : visualCubes;
  const activeCube = activeCubeIndex === null ? null : activeCubes[activeCubeIndex];
  const multimodalResult = activeCube && "detection" in activeCube
    ? activeCube.detection === "image"
      ? { symbol: "×", title: "Coincidencia visual detectada", note: "Similitud gráfica relevante" }
      : activeCube.detection === "text"
        ? { symbol: "×", title: "Coincidencia textual detectada", note: "Nombre y elementos verbales" }
        : { symbol: "✓", title: "Sin coincidencias detectadas", note: "Imagen y texto verificados" }
    : null;
  const currentResult = multimodalResult ?? (activeCube ? resultCopy[activeCube.result] : resultCopy.idle);

  return (
    <section
      className={`scanner-stage ${compact ? "scanner-stage-compact" : ""} ${multimodal ? "scanner-stage-multimodal" : ""} ${className}`}
      aria-label={multimodal ? "Demostración del escáner de imágenes y texto" : "Demostración del escáner visual"}
    >
      <div className="stage-header">
        <span>{multimodal ? "ANÁLISIS DE IMAGEN + TEXTO" : "ENTRADA DE ACTIVOS"}</span>
        <span className="stage-live"><i /> EN VIVO</span>
      </div>

      <div className="scanner-status" aria-live="polite">
        <span className={`result-symbol ${activeCube ? `result-${activeCube.result}` : "result-idle"}`}>
          {currentResult.symbol}
        </span>
        <span>
          <strong>{currentResult.title}</strong>
          <small>{currentResult.note}</small>
        </span>
      </div>

      <div className="scanner-machine" aria-hidden="true">
        <div className="scanner-rail scanner-rail-top" />
        <div className="scanner-rail scanner-rail-bottom" />
        <div className="scan-gate" ref={gateRef}>
          <span className="gate-corner gate-corner-a" />
          <span className="gate-corner gate-corner-b" />
          <span className="gate-corner gate-corner-c" />
          <span className="gate-corner gate-corner-d" />
          <span className="scan-beam" />
          <span className="scan-core" />
        </div>

        <div className="cube-track">
          {activeCubes.map((cube, index) => (
            <div
              className={`cube-unit ${index === activeCubeIndex ? `cube-current cube-result-${cube.result}` : ""}`}
              key={cube.logo}
              ref={(element) => {
                cubeRefs.current[index] = element;
              }}
              style={{ "--cube-delay": `${index * 2.4 - 8.4}s` } as React.CSSProperties}
            >
              <div className="brand-cube">
                <span className="cube-front">
                  <Image
                    src={`/logos/logo-${cube.logo}.png`}
                    alt=""
                    width={92}
                    height={92}
                    sizes="92px"
                  />
                </span>
                <span className="cube-side" />
                <span className="cube-top" />
              </div>
              {multimodal && "text" in cube && (
                <div className={`asset-text-card ${index === activeCubeIndex && cube.result === "alert" ? "asset-text-card-alert" : ""}`}>
                  <span className="asset-text-kicker">TEXTO DETECTADO</span>
                  <strong>{cube.text}</strong>
                  <span className="asset-text-lines" aria-hidden="true"><i /><i /><i /></span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
