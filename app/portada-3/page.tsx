import type { Metadata } from "next";
import Link from "next/link";
import AssetScanner from "../components/asset-scanner";
import ColorBends from "./color-bends";

export const metadata: Metadata = {
  title: "Buho Marc | Vigilancia temprana de marcas",
  description: "Monitoreo de marcas, coincidencias y oposiciones para anticipar cada acción legal.",
  openGraph: {
    title: "Buho Marc | Que tu cliente se entere por ti",
    description: "Monitoreo de marcas, coincidencias y oposiciones para anticipar cada acción legal.",
    images: [{ url: "/og-portada-3.png", width: 1731, height: 909 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-portada-3.png"],
  },
};

const dashboardStats = [
  ["Marcas siendo vigiladas", "84", "Cartera activa"],
  ["Coincidencias a revisar manualmente", "24", "Prioridad alta", "alert"],
  ["Oposiciones en curso", "07", "Con seguimiento"],
  ["Alertas del Diario Oficial", "16", "Esta semana"],
  ["Solicitudes en observación", "31", "Próximos 30 días"],
  ["Escritos por presentar", "05", "Acción requerida", "alert"],
  ["Resoluciones favorables", "12", "Último trimestre"],
] as const;

const dashboardLinks = [
  "Ir a marcas revisadas",
  "Ir a signos distintivos identificados",
  "Ir a expedientes de oposición",
] as const;

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
          <Link className="bends-brand" href="/" aria-label="Buho Marc, inicio">BUHO MARC<span>®</span></Link>
          <div className="bends-nav-links">
            <a href="#sistema">Sistema</a>
            <a href="#senal">Señales</a>
            <a href="#contacto">Contacto</a>
          </div>
          <div className="bends-tabs" aria-label="Portadas">
            <Link href="/">01</Link>
            <Link href="/portada-2">02</Link>
            <Link className="is-current" href="/portada-3" aria-current="page">03</Link>
          </div>
        </nav>

        <div className="bends-hero-content">
          <h1>Trackeo de la propiedad<br />intelectual visual<br /><em>de tus clientes.</em></h1>
          <p className="bends-intro">Que tus clientes se enteren por ti.</p>
          <div className="bends-actions">
            <a className="bends-button bends-button-primary" href="#sistema">Conoce el sistema <span>↓</span></a>
            <a className="bends-button bends-button-plain" href="https://wa.me/56978083444" target="_blank" rel="noreferrer">Hablemos <span>↗</span></a>
          </div>
        </div>

        <AssetScanner className="hero-scanner" compact />

        <div className="bends-hero-footer" aria-label="Resumen de monitoreo">
          <span>Detección temprana en el Diario Oficial</span>
          <span>Detección contextual</span>
          <span>Decisiones con evidencia</span>
        </div>
      </section>

      <section className="dashboard-section" id="sistema">
        <div className="dashboard-glow" aria-hidden="true" />
        <div className="dashboard-heading">
          <div>
            <p className="bends-index">01 / EL SISTEMA</p>
            <h2>Un tablero para llegar<br />antes que la noticia.</h2>
          </div>
          <p>Buho Marc ordena las señales que necesitan una decisión legal, desde el Diario Oficial hasta el escrito que corresponde presentar.</p>
        </div>
        <div className="dashboard-shell">
          <div className="dashboard-topbar">
            <span><i /> MONITOREO ACTIVO</span>
            <span>ACTUALIZADO AHORA</span>
          </div>
          <div className="dashboard-stats">
            {dashboardStats.map(([label, value, detail, tone]) => (
              <article className={`dashboard-stat ${tone === "alert" ? "dashboard-stat-alert" : ""}`} key={label}>
                <p>{label}</p>
                <strong>{value}</strong>
                <span>{detail}</span>
              </article>
            ))}
          </div>
          <div className="dashboard-links" aria-label="Vistas del tablero">
            {dashboardLinks.map((label, index) => (
              <span key={label}><b>0{index + 1}</b>{label}<i aria-hidden="true">↗</i></span>
            ))}
          </div>
        </div>
      </section>

      <section className="bends-statement" id="senal">
        <div className="bends-statement-orb" aria-hidden="true" />
        <p className="bends-index">02 / EL CRITERIO</p>
        <blockquote>No solo encontramos coincidencias,<br />te adelantamos el escrito<br /><em>que hay que presentar.</em></blockquote>
        <p className="statement-detail">Buho Marc suma monitoreo continuo y criterio legal para que cada alerta llegue con el contexto, la evidencia y la próxima acción clara.</p>
      </section>

      <section className="bends-contact" id="contacto">
        <p className="bends-index">BUHO MARC / 2026</p>
        <h2>Que tu cliente<br />se entere por ti.</h2>
        <a className="bends-contact-link" href="mailto:hola@buhomarc.cl">hola@buhomarc.cl <span>↗</span></a>
        <a className="bends-whatsapp-link" href="https://wa.me/56978083444" target="_blank" rel="noreferrer">Click to WhatsApp · +56 9 7808 3444 <span>↗</span></a>
      </section>

      <footer className="bends-footer">
        <div className="footer-branding">
          <p className="footer-brand">BUHO MARC<span>®</span></p>
          <p>Vigilancia temprana para decisiones de marca.</p>
        </div>
        <div className="footer-column">
          <span>VIGILANCIA</span>
          <p>Marcas y signos distintivos</p>
          <p>Diario Oficial</p>
          <p>Oposiciones y escritos</p>
        </div>
        <div className="footer-column">
          <span>CONTACTO</span>
          <p>hola@buhomarc.cl</p>
          <p>+56 9 7808 3444</p>
          <p>Santiago · Chile</p>
        </div>
        <p className="footer-legal">© 2026 Buho Marc. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
