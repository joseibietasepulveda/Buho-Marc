import type { Metadata } from "next";
import ColorBends from "./color-bends";

export const metadata: Metadata = {
  title: "Portada 3 | Image Watch",
  description: "Una nueva manera de monitorear la identidad visual de tus clientes.",
  openGraph: {
    title: "Image Watch | La señal de tu marca no se detiene",
    description: "Una nueva manera de monitorear la identidad visual de tus clientes.",
    images: [{ url: "/og-portada-3.png", width: 1731, height: 909 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-portada-3.png"],
  },
};

const signals = [
  ["01", "Explora", "Rastrea cada aparición relevante en el ecosistema visual de tu cliente."],
  ["02", "Entiende", "Compara contexto, similitud y alcance sin perderte entre resultados."],
  ["03", "Actúa", "Convierte cada hallazgo en una conversación clara y oportuna."],
];

const watchlist = [
  ["Marca", "Activos de marca, campañas y piezas propias"],
  ["Contexto", "Dónde aparece, con quién y por qué importa"],
  ["Decisión", "Evidencia lista para priorizar la siguiente acción"],
];

export default function PortadaTres() {
  return (
    <main className="bends-page">
      <section className="bends-hero" id="inicio">
        <ColorBends
          color="#A855F7"
          speed={0.2}
          frequency={1.0}
          noise={0.15}
          bandWidth={0.14}
          rotation={90}
          fadeTop={0.75}
          iterations={1}
          intensity={1.3}
        />
        <div className="bends-grain" aria-hidden="true" />

        <nav className="bends-nav" aria-label="Navegación principal">
          <a className="bends-brand" href="/" aria-label="Image Watch, inicio">IMAGE WATCH<span>®</span></a>
          <div className="bends-nav-links">
            <a href="#sistema">Sistema</a>
            <a href="#senal">Señales</a>
            <a href="#contacto">Contacto</a>
          </div>
          <div className="bends-tabs" aria-label="Portadas">
            <a href="/">01</a>
            <a href="/portada-2">02</a>
            <a className="is-current" href="/portada-3" aria-current="page">03</a>
          </div>
        </nav>

        <div className="bends-hero-content">
          <p className="bends-kicker"><i /> Inteligencia visual continua</p>
          <h1>La señal de tu marca<br /><em>no se detiene.</em></h1>
          <p className="bends-intro">Observamos lo que circula, detectamos lo que importa y te damos claridad para proteger la identidad de tus clientes.</p>
          <div className="bends-actions">
            <a className="bends-button bends-button-primary" href="#sistema">Conoce el sistema <span>↓</span></a>
            <a className="bends-button bends-button-plain" href="mailto:hola@imagewatch.cl">Hablemos <span>↗</span></a>
          </div>
        </div>

        <div className="bends-hero-footer" aria-label="Resumen de monitoreo">
          <span>Protección visual</span>
          <span>Detección contextual</span>
          <span>Decisiones con evidencia</span>
        </div>
      </section>

      <section className="bends-intro-section" id="sistema">
        <div className="bends-section-top">
          <p className="bends-index">01 / EL SISTEMA</p>
          <p className="bends-side-copy">Para marcas que saben que una imagen nunca viaja sola.</p>
        </div>
        <h2>Una mirada más nítida<br />sobre todo lo que <em>representa</em> tu marca.</h2>
        <div className="signal-cards">
          {signals.map(([number, title, text]) => (
            <article key={number} className="signal-card">
              <span>{number}</span>
              <div className="signal-card-line" aria-hidden="true"><i /><i /><i /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bends-statement" id="senal">
        <div className="bends-statement-orb" aria-hidden="true" />
        <p className="bends-index">02 / EL CRITERIO</p>
        <blockquote>Ver una coincidencia es fácil.<br />Saber qué hacer con ella,<br /><em>no tanto.</em></blockquote>
        <p className="statement-detail">Image Watch suma sensibilidad de marca a una lectura precisa de cada aparición. Así, el equipo ve menos ruido y más oportunidades de acción.</p>
      </section>

      <section className="watchlist-section">
        <div className="watchlist-heading">
          <p className="bends-index">03 / ENFOQUE</p>
          <h2>Lo que una marca necesita ver, sin buscarlo todo.</h2>
        </div>
        <div className="watchlist" role="list">
          {watchlist.map(([title, text], index) => (
            <div className="watchlist-item" role="listitem" key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <i aria-hidden="true">↘</i>
            </div>
          ))}
        </div>
      </section>

      <section className="bends-contact" id="contacto">
        <p className="bends-index">IMAGE WATCH / 2026</p>
        <h2>Haz que cada imagen<br />cuente a tu favor.</h2>
        <a className="bends-contact-link" href="mailto:hola@imagewatch.cl">hola@imagewatch.cl <span>↗</span></a>
      </section>

      <footer className="bends-footer">
        <a className="bends-brand" href="#inicio">IMAGE WATCH<span>®</span></a>
        <p>La vigilancia que tu identidad visual estaba esperando.</p>
        <a href="/portada-2">Ver portada 2 ↗</a>
      </footer>
    </main>
  );
}
