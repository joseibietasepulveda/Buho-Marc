import type { Metadata } from "next";
import Link from "next/link";
import AssetScanner from "../components/asset-scanner";
import ColorBends from "../portada-3/color-bends";

export const metadata: Metadata = {
  title: "Buho Marc | Revisión y vigilancia integral de marcas",
  description:
    "Revisa una marca antes de inscribirla y vigílala después con detección fonética, visual y semántica.",
  openGraph: {
    title: "Buho Marc | Revisión y vigilancia integral de marcas",
    description:
      "Detección fonética, visual y semántica para revisar y vigilar marcas antes que el conflicto.",
  },
};

const monitoringSteps = [
  "Revisamos fonética, visual y semánticamente antes de inscribir.",
  "Te acompañamos en la evaluación y en el proceso de inscripción.",
  "Vigilamos tus marcas inscritas para presentar oposiciones a tiempo.",
] as const;

export default function LandingMixta() {
  return (
    <main className="mixta-page">
      <section className="mixta-hero" id="inicio">
        <div className="mixta-hero-signal" aria-hidden="true">
          <ColorBends
            color="#a855f7"
            speed={0.18}
            frequency={0.92}
            noise={0.13}
            bandWidth={0.12}
            rotation={104}
            fadeTop={0.84}
            waveY={0.53}
            intensity={1.15}
          />
        </div>
        <div className="mixta-grain" aria-hidden="true" />

        <nav className="mixta-nav" aria-label="Navegación principal">
          <Link className="mixta-brand" href="/landing-mixta" aria-label="Buho Marc, inicio">
            BUHO MARC<span>®</span>
          </Link>
          <div className="mixta-nav-links">
            <a href="#vigilancia">Comparación</a>
            <a href="#sistema">El proceso</a>
            <a href="#conversemos">Conversemos</a>
          </div>
          <div className="mixta-nav-contact">
            <a className="mixta-nav-email" href="mailto:hola@buhomarc.cl">hola@buhomarc.cl</a>
            <a className="mixta-nav-whatsapp" href="https://wa.me/56978083444" target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp">
              <img src="https://cdn.simpleicons.org/whatsapp/C7FF9C" alt="" />
            </a>
          </div>
        </nav>

        <div className="mixta-hero-grid">
          <article className="mixta-hero-panel mixta-hero-start">
            <p className="mixta-eyebrow mixta-phase-label"><i /> ANTES DE INSCRIBIR</p>
            <h1>Revisa tu marca<br /><em>antes de inscribirla.</em></h1>
            <p className="mixta-lead">
              Una revisión completa para entender si el nombre, la identidad visual y el concepto de tu marca se acercan demasiado a otra.
            </p>
            <div className="mixta-actions">
              <a className="mixta-button mixta-button-primary" href="#conversemos">Revisar marcas gratis <span>↘</span></a>
            </div>
          </article>

          <article className="mixta-hero-panel mixta-hero-watch">
            <p className="mixta-eyebrow mixta-phase-label"><i /> DESPUÉS DE INSCRIBIR</p>
            <h2>Vigila tus marcas,<br /><em>anticipa conflictos</em><br />y presenta oposiciones<br />a tiempo.</h2>
            <div className="mixta-actions">
              <a className="mixta-button mixta-button-secondary" href="#sistema">Conocer el sistema <span>↓</span></a>
            </div>
          </article>

          <AssetScanner className="mixta-scanner" compact multimodal dense />
        </div>

        <div className="mixta-hero-footer" aria-label="Resumen de Buho Marc">
          <span>Revisión antes de inscribir</span>
          <span>Vigilancia 24/7 después de registrar</span>
          <span>Fonética · visual · semántica</span>
        </div>
      </section>

      <section className="mixta-blindspot" id="vigilancia">
        <div className="mixta-blindspot-glow" aria-hidden="true" />
        <div className="mixta-blindspot-copy">
          <p className="mixta-index">02 / VIGILANCIA QUE VE MÁS</p>
          <h2>Una marca no es solo<br /><em>un nombre.</em></h2>
          <p>
            El nombre no cuenta toda la historia. Dos marcas pueden llamarse distinto y, aun así, acercarse demasiado por su tipografía, composición, logo o significado.
          </p>
          <p>
            Buho Marc cruza fonética, visual y semántica para entregar una lectura integral de cada señal antes de que se convierta en un problema.
          </p>
        </div>

        <div className="mixta-comparison" aria-label="Comparación entre análisis limitado y análisis integral de Buho Marc">
          <article className="mixta-comparison-basic">
            <div className="mixta-comparison-status mixta-comparison-status-bad"><i /> Otros: cobertura parcial</div>
            <span>ANÁLISIS LIMITADO</span>
            <h3>Busca si el nombre suena parecido.</h3>
            <ul>
              <li><i aria-hidden="true">✓</i> Fonética</li>
              <li className="is-muted"><i aria-hidden="true">×</i> Visual: logo, tipografía y composición</li>
              <li className="is-muted"><i aria-hidden="true">×</i> Semántica: significado y cercanía conceptual</li>
            </ul>
            <p>Puede dejar fuera similitudes visuales y cercanía conceptual.</p>
          </article>
          <article className="mixta-comparison-active">
            <div className="mixta-comparison-status mixta-comparison-status-good"><i /> Nosotros: cobertura Integral</div>
            <span>BUHO MARC</span>
            <h3>Entiende la marca como un sistema completo.</h3>
            <ul>
              <li><i aria-hidden="true">✓</i> Fonética</li>
              <li><i aria-hidden="true">✓</i> Visual: logo, tipografía y composición</li>
              <li><i aria-hidden="true">✓</i> Semántica: significado y cercanía conceptual</li>
            </ul>
            <p>Una alerta con contexto para decidir qué vale la pena revisar.</p>
          </article>
        </div>
      </section>

      <section className="mixta-system" id="sistema">
        <ColorBends
          color="#A855F7"
          speed={0.14}
          frequency={1.05}
          noise={0.12}
          bandWidth={0.12}
          rotation={104}
          fadeTop={0.2}
          waveY={0.22}
          intensity={1.1}
        />
        <header className="mixta-system-heading">
          <p className="mixta-index">03 / CÓMO FUNCIONA</p>
          <h2>Revisión inicial, acompañamiento en el proceso,<br /><em>vigilancia continua de tus marcas inscritas</em><br />para presentar oposiciones a tiempo.</h2>
        </header>
        <ol className="mixta-steps">
          {monitoringSteps.map((step, index) => (
            <li key={step}>
              <span>0{index + 1}</span>
              <p>{step}</p>
              {index < monitoringSteps.length - 1 && <i aria-hidden="true">→</i>}
            </li>
          ))}
        </ol>
      </section>

      <section className="mixta-tool" id="conversemos">
        <p className="mixta-index">CONVERSEMOS</p>
        <h2>Prevee,<br /><em>sigue, vigila.</em></h2>
        <div className="mixta-contact-actions">
          <a className="mixta-button mixta-button-light" href="mailto:hola@buhomarc.cl">hola@buhomarc.cl <span>↗</span></a>
          <a className="mixta-whatsapp-button" href="https://wa.me/56978083444" target="_blank" rel="noreferrer"><img src="https://cdn.simpleicons.org/whatsapp/C7FF9C" alt="" /> Escríbenos por WhatsApp <span>↗</span></a>
        </div>
      </section>

      <footer className="mixta-footer">
        <div><p className="mixta-footer-brand">BUHO MARC<span>®</span></p><p>Revisión y vigilancia integral de marcas.</p></div>
        <div><span>VIGILANCIA</span><p>Fonética</p><p>Visual</p><p>Semántica</p></div>
        <div><span>CONTACTO</span><a href="mailto:hola@buhomarc.cl">hola@buhomarc.cl</a><a href="https://wa.me/56978083444" target="_blank" rel="noreferrer">+56 9 7808 3444</a></div>
        <small>© 2026 Buho Marc. Todos los derechos reservados.</small>
      </footer>
    </main>
  );
}
