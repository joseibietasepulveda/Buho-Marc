"use client";

import { useState } from "react";
import Link from "next/link";
import AssetScanner from "../components/asset-scanner";

export default function ScannerShowcase() {
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <main className={`scanner-page ${isPlaying ? "is-playing" : "is-paused"}`}>
      <section className="scanner-hero" id="inicio">
        <div className="scanner-grid" aria-hidden="true" />
        <div className="scanner-glow scanner-glow-violet" aria-hidden="true" />
        <div className="scanner-glow scanner-glow-cyan" aria-hidden="true" />

        <nav className="navigation scanner-navigation" aria-label="Navegación principal">
          <Link className="wordmark" href="/" aria-label="Image Watch, inicio">
            Image Watch
          </Link>
          <div className="nav-tabs nav-tabs-dark" aria-label="Portadas">
            <Link className="nav-tab" href="/">Portada 1</Link>
            <Link className="nav-tab nav-tab-active" href="/portada-2">Portada 2</Link>
            <Link className="nav-tab" href="/portada-3">Portada 3</Link>
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
              <Link className="button button-secondary" href="/">
                Volver a portada 1 <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>

          <AssetScanner isPlaying={isPlaying} />
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
        <Link className="wordmark footer-wordmark" href="/">Image Watch</Link>
        <p>La vigilancia que tu identidad visual estaba esperando.</p>
        <span>© 2026 Image Watch</span>
      </footer>
    </main>
  );
}
