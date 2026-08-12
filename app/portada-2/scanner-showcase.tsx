"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const cubes = [
  { logo: "02", result: "match" },
  { logo: "16", result: "match" },
  { logo: "23", result: "alert" },
  { logo: "07", result: "match" },
  { logo: "11", result: "match" },
  { logo: "28", result: "alert" },
  { logo: "05", result: "match" },
] as const;

const scanStepMs = 1700;
const glowLeadMs = 800;

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
} as const;

export default function ScannerShowcase() {
  const [scanIndex, setScanIndex] = useState(0);
  const [approachingIndex, setApproachingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const currentCube = cubes[scanIndex];
  const currentResult = resultCopy[currentCube.result];
  const highlightedCubeIndex = approachingIndex ?? scanIndex;

  useEffect(() => {
    if (!isPlaying) return;

    const nextIndex = (scanIndex + 1) % cubes.length;
    const glowTimer = window.setTimeout(() => {
      setApproachingIndex(nextIndex);
    }, scanStepMs - glowLeadMs);
    const scanTimer = window.setTimeout(() => {
      setApproachingIndex(null);
      setScanIndex(nextIndex);
    }, scanStepMs);

    return () => {
      window.clearTimeout(glowTimer);
      window.clearTimeout(scanTimer);
    };
  }, [isPlaying, scanIndex]);

  return (
    <main className={`scanner-page ${isPlaying ? "is-playing" : "is-paused"}`}>
      <section className="scanner-hero" id="inicio">
        <div className="scanner-grid" aria-hidden="true" />
        <div className="scanner-glow scanner-glow-violet" aria-hidden="true" />
        <div className="scanner-glow scanner-glow-cyan" aria-hidden="true" />

        <nav className="navigation scanner-navigation" aria-label="Navegación principal">
          <a className="wordmark" href="/" aria-label="Image Watch, inicio">
            Image Watch
          </a>
          <div className="nav-tabs nav-tabs-dark" aria-label="Portadas">
            <a className="nav-tab" href="/">Portada 1</a>
            <a className="nav-tab nav-tab-active" href="/portada-2">Portada 2</a>
          </div>
          <a className="nav-status" href="#como-opera">
            <span /> Algoritmo activo
          </a>
        </nav>

        <div className="scanner-hero-layout">
          <div className="scanner-copy">
            <p className="eyebrow scanner-reveal scanner-reveal-1">
              <span className="eyebrow-dot" /> Revisión visual continua
            </p>
            <h1 className="scanner-reveal scanner-reveal-2">
              Cada marca entra.<br />Cada señal queda clara.
            </h1>
            <p className="scanner-subtitle scanner-reveal scanner-reveal-3">
              Nuestro algoritmo observa los activos visuales de tus clientes, uno tras otro,
              para detectar coincidencias y alertar lo que necesita contexto.
            </p>
            <div className="scanner-actions scanner-reveal scanner-reveal-4">
              <a className="button button-primary" href="#como-opera">
                Ver cómo opera <span aria-hidden="true">↓</span>
              </a>
              <a className="button button-secondary" href="/">
                Volver a portada 1 <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="scanner-stage" aria-label="Demostración del escáner visual de Image Watch">
            <div className="stage-header">
              <span>ENTRADA DE ACTIVOS</span>
              <span className="stage-live"><i /> EN VIVO</span>
            </div>

            <div className="scanner-status" aria-live="polite">
              <span className={`result-symbol result-${currentCube.result}`}>{currentResult.symbol}</span>
              <span>
                <strong>{currentResult.title}</strong>
                <small>{currentResult.note}</small>
              </span>
            </div>

            <div className="scanner-machine" aria-hidden="true">
              <div className="scanner-rail scanner-rail-top" />
              <div className="scanner-rail scanner-rail-bottom" />
              <div className="scan-gate">
                <span className="gate-corner gate-corner-a" />
                <span className="gate-corner gate-corner-b" />
                <span className="gate-corner gate-corner-c" />
                <span className="gate-corner gate-corner-d" />
                <span className="scan-beam" />
                <span className="scan-core" />
                <span className="scan-label">ANALIZANDO</span>
              </div>

              <div className="conveyor">
                <div className="conveyor-surface" />
                <div className="conveyor-lights" />
                <div className="cube-track">
                  {cubes.map((cube, index) => {
                    const isApproaching = index === approachingIndex;
                    const isHighlighted = index === highlightedCubeIndex;

                    return (
                      <div
                        className={`cube-unit ${isHighlighted ? `cube-current cube-result-${cube.result}` : ""} ${isApproaching ? "cube-approaching" : ""}`}
                        key={cube.logo}
                        style={{ "--cube-delay": `${index * 1.7 - 5.95}s` } as React.CSSProperties}
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
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="stage-footer">
              <span>LECTURA <b>98.4%</b></span>
              <span>SECUENCIA <b>✓&nbsp; ✓&nbsp; ×</b></span>
            </div>
          </div>
        </div>

        <div className="scanner-bottom-line">
          <span>Image Watch / motor de reconocimiento visual</span>
          <button type="button" onClick={() => setIsPlaying((value) => !value)}>
            <i className={isPlaying ? "pause-icon" : "play-icon"} aria-hidden="true" />
            {isPlaying ? "Pausar escena" : "Reanudar escena"}
          </button>
        </div>
      </section>

      <section className="operation-section" id="como-opera">
        <div>
          <p className="section-label">El proceso / 01–03</p>
          <h2>Una señal visual no se queda esperando.</h2>
        </div>
        <div className="operation-steps">
          <article>
            <span>01</span>
            <h3>Ingresa</h3>
            <p>El activo visual se incorpora al flujo de revisión sin detener el resto del monitoreo.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Compara</h3>
            <p>El modelo reconoce rasgos, variaciones y similitudes frente a la identidad que estamos cuidando.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Decide</h3>
            <p>La señal queda validada o llega al equipo cuando su contexto amerita una revisión más cercana.</p>
          </article>
        </div>
      </section>

      <footer>
        <a className="wordmark footer-wordmark" href="/">Image Watch</a>
        <p>La vigilancia que tu identidad visual estaba esperando.</p>
        <span>© 2026 Image Watch</span>
      </footer>
    </main>
  );
}
