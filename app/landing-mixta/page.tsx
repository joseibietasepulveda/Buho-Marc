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

const layers = [
  {
    index: "01",
    name: "Fonética",
    short: "Detección fonética",
    copy: "Detecta nombres que suenan parecido, incluso cuando se escriben distinto.",
    signal: "NÓVA / NOVA",
  },
  {
    index: "02",
    name: "Visual",
    short: "Detección visual",
    copy: "Compara logo, tipografía y composición para encontrar similitudes que el texto no alcanza a ver.",
    signal: "LOGO · TIPO · FORMA",
  },
  {
    index: "03",
    name: "Semántica",
    short: "Detección semántica",
    copy: "Reconoce cercanía conceptual: ideas, atributos y territorios de marca relacionados.",
    signal: "ORIGEN · RUMBO · NORTE",
  },
] as const;

const monitoringSteps = [
  "Ingresas la marca que quieres revisar o vigilar.",
  "Buho Marc la contrasta con publicaciones de INAPI y el Diario Oficial en las tres capas.",
  "Recibes una alerta clara para evaluar y actuar antes de que el cliente se entere por otro lado.",
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
            <a href="#capas">Las tres capas</a>
            <a href="#vigilancia">Vigilancia</a>
            <a href="#sistema">El sistema</a>
          </div>
          <a className="mixta-nav-contact" href="mailto:contacto@buhomarc.cl">Hablemos <span>↗</span></a>
        </nav>

        <div className="mixta-hero-grid">
          <article className="mixta-hero-panel mixta-hero-start">
            <p className="mixta-eyebrow mixta-phase-label"><i /> ANTES DE INSCRIBIR</p>
            <h1>Revisa tu marca<br /><em>antes de inscribirla.</em></h1>
            <p className="mixta-lead">
              Una revisión completa para entender si el nombre, la identidad visual y el concepto de tu marca se acercan demasiado a otra.
            </p>
            <div className="mixta-actions">
              <a className="mixta-button mixta-button-primary" href="#herramienta">Revisar marcas gratis <span>↘</span></a>
            </div>
          </article>

          <article className="mixta-hero-panel mixta-hero-watch">
            <p className="mixta-eyebrow mixta-phase-label"><i /> DESPUÉS DE INSCRIBIR</p>
            <h2>Vigila tus marcas<br /><em>y anticipa conflictos.</em></h2>
            <p>
              Buho Marc revisa continuamente nuevas solicitudes y publicaciones para detectar señales de conflicto antes de que se transformen en una oposición.
            </p>
            <div className="mixta-actions">
              <a className="mixta-button mixta-button-secondary" href="#sistema">Conocer el sistema <span>↓</span></a>
            </div>
          </article>

          <AssetScanner className="mixta-scanner" compact multimodal />
        </div>

        <div className="mixta-hero-footer" aria-label="Resumen de Buho Marc">
          <span>Revisión antes de inscribir</span>
          <span>Vigilancia 24/7 después de registrar</span>
          <span>Fonética · visual · semántica</span>
        </div>
      </section>

      <section className="mixta-layers" id="capas">
        <ColorBends
          color="#A855F7"
          speed={0.16}
          frequency={0.9}
          noise={0.14}
          bandWidth={0.13}
          rotation={92}
          fadeTop={0.22}
          waveY={0.18}
          intensity={1.15}
        />
        <header className="mixta-section-heading">
          <p className="mixta-index">01 / EL NÚCLEO DEL ANÁLISIS</p>
          <div>
            <h2>Una marca no es solo<br /><em>un nombre.</em></h2>
            <p>
              La vigilancia de Buho Marc cruza tres capas a la vez. Así encuentra riesgos que una búsqueda textual o fonética aislada deja pasar.
            </p>
          </div>
        </header>

        <div className="mixta-layers-grid">
          {layers.map((layer) => (
            <article className="mixta-layer-card" key={layer.name}>
              <div className="mixta-layer-card-head"><span>{layer.index}</span><small>{layer.short}</small></div>
              <div className={`mixta-layer-mark mixta-layer-mark-${layer.index}`} aria-hidden="true"><i /><i /><i /></div>
              <h3>{layer.name}</h3>
              <p>{layer.copy}</p>
              <b>{layer.signal}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="mixta-blindspot" id="vigilancia">
        <div className="mixta-blindspot-glow" aria-hidden="true" />
        <div className="mixta-blindspot-copy">
          <p className="mixta-index">02 / VIGILANCIA QUE VE MÁS</p>
          <h2>El texto no siempre<br />muestra el conflicto.</h2>
          <p>
            Dos marcas pueden llamarse distinto y, aun así, competir desde una tipografía, composición o logo prácticamente equivalentes. También pueden ocupar el mismo territorio conceptual aunque no compartan palabras.
          </p>
          <p>
            Frente al matching fonético que ofrecen herramientas como Smark, Buho Marc suma las capas visual y semántica para entregar una lectura integral de cada señal.
          </p>
        </div>

        <div className="mixta-comparison" aria-label="Comparación entre análisis limitado y análisis integral de Buho Marc">
          <article className="mixta-comparison-basic">
            <div className="mixta-comparison-status mixta-comparison-status-bad"><i /> COBERTURA PARCIAL</div>
            <span>ANÁLISIS LIMITADO</span>
            <h3>Busca si el nombre suena parecido.</h3>
            <ul>
              <li><i aria-hidden="true">✓</i> Nombre</li>
              <li className="is-muted"><i aria-hidden="true">×</i> Logo y tipografía</li>
              <li className="is-muted"><i aria-hidden="true">×</i> Significado y concepto</li>
            </ul>
            <p>Puede dejar fuera similitudes visuales y cercanía conceptual.</p>
          </article>
          <article className="mixta-comparison-active">
            <div className="mixta-comparison-status mixta-comparison-status-good"><i /> COBERTURA INTEGRAL</div>
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
          <h2>De la revisión inicial<br />a la vigilancia continua.</h2>
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

      <section className="mixta-tool" id="herramienta">
        <p className="mixta-index">HERRAMIENTA DE REVISIÓN</p>
        <h2>Antes de registrar,<br /><em>míralo desde todos los ángulos.</em></h2>
        <p>
          Muy pronto podrás revisar una marca de forma visual, fonética y semántica desde una misma herramienta.
        </p>
        <a className="mixta-button mixta-button-light" href="mailto:contacto@buhomarc.cl?subject=Quiero%20probar%20la%20herramienta%20de%20revisi%C3%B3n">Quiero conocer la herramienta <span>↗</span></a>
      </section>

      <footer className="mixta-footer">
        <div><p className="mixta-footer-brand">BUHO MARC<span>®</span></p><p>Revisión y vigilancia integral de marcas.</p></div>
        <div><span>VIGILANCIA</span><p>Fonética</p><p>Visual</p><p>Semántica</p></div>
        <div><span>CONTACTO</span><a href="mailto:contacto@buhomarc.cl">contacto@buhomarc.cl</a><a href="https://wa.me/56978083444" target="_blank" rel="noreferrer">+56 9 7808 3444</a></div>
        <small>© 2026 Buho Marc. Todos los derechos reservados.</small>
      </footer>
    </main>
  );
}
