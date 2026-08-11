import type { CSSProperties } from "react";

const particles = Array.from({ length: 48 }, (_, index) => ({
  left: `${(index * 37 + 7) % 101}%`,
  top: `${(index * 61 + 11) % 101}%`,
  size: [19, 23, 28, 34, 40, 47][index % 6],
  opacity: [0.19, 0.28, 0.38, 0.48][index % 4],
  delay: `${(index % 13) * -0.72}s`,
  duration: `${9 + (index % 7) * 1.45}s`,
  rotation: `${[-18, 0, 13, 28, -31, 45][index % 6]}deg`,
  logo: String((index * 7 + 3) % 30).padStart(2, "0"),
}));

const capabilities = [
  {
    number: "01",
    title: "Rastreamos presencia",
    text: "Observamos los espacios digitales donde una imagen puede aparecer, reutilizarse o reinterpretarse.",
  },
  {
    number: "02",
    title: "Leemos similitudes",
    text: "Ponemos cada hallazgo en contexto para distinguir una coincidencia inocente de una señal relevante.",
  },
  {
    number: "03",
    title: "Priorizamos acción",
    text: "Entregamos claridad sobre qué mirar primero, con evidencia visual para tomar decisiones con seguridad.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero" id="inicio">
        <div className="particle-field" aria-hidden="true">
          {particles.map((particle, index) => (
            <img
              className={`particle particle-${index % 5}`}
              key={index}
              src={`/logos/logo-${particle.logo}.png`}
              alt=""
              style={
                {
                  left: particle.left,
                  top: particle.top,
                  "--size": `${particle.size}px`,
                  "--opacity": particle.opacity,
                  "--delay": particle.delay,
                  "--duration": particle.duration,
                  "--rotation": particle.rotation,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <nav className="navigation" aria-label="Navegación principal">
          <a className="wordmark" href="#inicio" aria-label="Image Watch, inicio">
            Image Watch
          </a>
          <a className="nav-status" href="#metodo">
            <span /> Monitoreo visual
          </a>
        </nav>

        <div className="hero-orbit orbit-one" aria-hidden="true" />
        <div className="hero-orbit orbit-two" aria-hidden="true" />

        <div className="hero-content">
          <p className="eyebrow reveal reveal-1">
            <span className="eyebrow-dot" /> Inteligencia para marcas que se ven
          </p>
          <h1 className="reveal reveal-2">Image Watch</h1>
          <p className="hero-subtitle reveal reveal-3">
            Trackeo de la propiedad intelectual visual de tus clientes
          </p>
          <div className="hero-actions reveal reveal-4">
            <a className="button button-primary" href="#metodo">
              Cómo lo hacemos <span aria-hidden="true">↘</span>
            </a>
            <a className="button button-secondary" href="#nosotros">
              Conócenos <span aria-hidden="true">↘</span>
            </a>
          </div>
        </div>

        <div className="hero-meta reveal reveal-5">
          <span>Vigilancia continua</span>
          <span className="meta-line" />
          <span>Identidad en movimiento</span>
        </div>

        <div className="signal-window" aria-hidden="true">
          <div className="signal-window-top">
            <span>SEÑALES / 24H</span>
            <span className="signal-live">en vivo</span>
          </div>
          <div className="signal-wave">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>

        <a className="scroll-cue" href="#metodo" aria-label="Ir a cómo funciona">
          <span>Desliza para descubrir</span>
          <i aria-hidden="true" />
        </a>
      </section>

      <section className="statement-section" id="metodo">
        <div className="section-label">01 / Método</div>
        <div className="statement-grid">
          <h2>Lo visual deja huellas.<br />Nosotros las seguimos.</h2>
          <div className="statement-copy">
            <p>
              Image Watch convierte el universo visual de una marca en una señal
              monitoreable. Sin ruido, sin revisiones eternas, con foco en lo que importa.
            </p>
            <a className="text-link" href="#nosotros">
              Conocer nuestro enfoque <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="capabilities">
          {capabilities.map((capability) => (
            <article className="capability-card" key={capability.number}>
              <p className="card-number">{capability.number}</p>
              <div className="capability-symbol" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h3>{capability.title}</h3>
              <p>{capability.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="watch-section" aria-labelledby="watch-title">
        <div className="watch-intro">
          <p className="section-label">02 / Señales que importan</p>
          <h2 id="watch-title">Ver más no es mirar todo.</h2>
          <p>
            Es saber cuándo una imagen merece atención y tener la evidencia lista
            para conversar con tu cliente.
          </p>
        </div>
        <div className="watch-console">
          <div className="console-header">
            <span className="console-mark" />
            <span>IMAGE WATCH / OBSERVATORIO</span>
            <span className="console-date">ACTUALIZADO AHORA</span>
          </div>
          <div className="console-content">
            <div className="console-copy">
              <p className="console-kicker">RADAR VISUAL</p>
              <p className="console-number">04</p>
              <p className="console-label">señales priorizadas<br />para revisar</p>
            </div>
            <div className="radar" aria-hidden="true">
              <span className="radar-ring ring-a" />
              <span className="radar-ring ring-b" />
              <span className="radar-ring ring-c" />
              <span className="radar-sweep" />
              <span className="radar-core" />
              <span className="radar-hit hit-a" />
              <span className="radar-hit hit-b" />
              <span className="radar-hit hit-c" />
            </div>
          </div>
          <div className="console-footer">
            <span>COINCIDENCIAS</span>
            <span>REUTILIZACIÓN</span>
            <span>CONTEXTO</span>
          </div>
        </div>
      </section>

      <section className="about-section" id="nosotros">
        <div className="about-accent" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="about-content">
          <p className="section-label">03 / El criterio detrás de la señal</p>
          <h2>La propiedad intelectual visual merece una atención más inteligente.</h2>
          <p className="about-lead">
            Combinamos sensibilidad de marca y rigor de monitoreo para que los equipos
            puedan proteger, entender y hacer crecer lo que sus clientes construyen.
          </p>
          <a className="button button-light" href="mailto:hola@imagewatch.cl">
            Hablemos de tu marca <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer>
        <a className="wordmark footer-wordmark" href="#inicio">
          Image Watch
        </a>
        <p>La vigilancia que tu identidad visual estaba esperando.</p>
        <span>© 2026 Image Watch</span>
      </footer>
    </main>
  );
}
