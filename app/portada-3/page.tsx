import type { Metadata } from "next";
import Link from "next/link";
import AssetScanner from "../components/asset-scanner";
import ColorBends from "./color-bends";
import DashboardPreview from "./dashboard-preview";

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
  ["Casos por evaluar", "05", "Acción requerida", "alert"],
  ["Resoluciones favorables", "12", "Último trimestre"],
] as const;

const dashboardLinks = [
  "Ir a marcas revisadas",
  "Ir a signos distintivos identificados",
  "Ir a expedientes de oposición",
] as const;

const systemFlow = [
  "Detección de posible coincidencia gráfica",
  "Alerta del caso y la marca involucrada",
  "Revisión manual del caso",
  "Trackeo del caso si se presenta la oposición",
] as const;

type PortadaTresProps = {
  scannerMode?: "visual" | "multimodal";
  headlineSecondLine?: string;
  dashboardMode?: "legacy" | "preview";
};

export default function PortadaTres({
  scannerMode = "visual",
  headlineSecondLine = "intelectual intelectual",
  dashboardMode = "legacy",
}: PortadaTresProps = {}) {
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
            <a href="#dashboard">Dashboard</a>
            <a href="#pricing">Pricing</a>
          </div>
        </nav>

        <div className="bends-hero-content">
          <h1>Trackeo de la propiedad<br />{headlineSecondLine}<br /><em>de tus clientes.</em></h1>
          <p className="bends-intro">Que tus clientes se enteren por ti.</p>
          <div className="bends-actions">
            <a className="bends-button bends-button-primary" href="#sistema">Conoce el sistema <span>↓</span></a>
            <a className="bends-button bends-button-plain" href="https://wa.me/56978083444" target="_blank" rel="noreferrer">Hablemos <span>↗</span></a>
          </div>
        </div>

        <AssetScanner className="hero-scanner" compact multimodal={scannerMode === "multimodal"} />

        <div className="bends-hero-footer" aria-label="Resumen de monitoreo">
          <span>Detección automática y temprano</span>
          <span>Detección contextual</span>
          <span>Decisiones con evidencia</span>
        </div>
      </section>

      <section className="system-section" id="sistema">
        <ColorBends
          color="#A855F7"
          speed={0.2}
          frequency={1.0}
          noise={0.15}
          bandWidth={0.14}
          rotation={90}
          fadeTop={0.28}
          waveY={0.12}
          iterations={1}
          intensity={1.3}
        />
        <div className="system-section-glow" aria-hidden="true" />
        <div className="system-heading">
          <p className="bends-index section-index">01 / EL SISTEMA</p>
          <h2><span className="system-title-white">Monitoreamos automáticamente 24/7 todas las piezas gráficas</span><br /><em>publicadas en INAPI y el Diario Oficial.</em></h2>
          <p className="system-alert">Te alertamos si alguna se asemeja a las marcas que estés trackeando.</p>
          <p className="system-detail">Analizamos registros históricos de lo que ha sido rechazado o aceptado, de acuerdo con la <strong>Ley Nº 19.039</strong> y los reclamos exitosos.</p>
        </div>
        <div className="system-flow" aria-label="Flujo del sistema de detección">
          {systemFlow.map((step, index) => (
            <article className="system-flow-card" key={step}>
              <span>0{index + 1}</span>
              <p>{step}</p>
              {index < systemFlow.length - 1 && <i aria-hidden="true">→</i>}
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section" id="dashboard">
        <div className="dashboard-glow" aria-hidden="true" />
        <p className="bends-index section-index">02 / DASHBOARD</p>
        <div className="dashboard-heading">
          <div>
            <h2>Un tablero para llegar<br /><span className="dashboard-highlight">antes que la noticia.</span></h2>
            <p className="dashboard-detail">
              Un dashboard para que estés en control de todo lo que pasa y puedas tomar decisiones
            </p>
          </div>
        </div>
        {dashboardMode === "preview" ? <DashboardPreview /> : <div className="dashboard-shell">
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
        </div>}
      </section>

      <section className="pricing-section" id="pricing">
        <div className="pricing-glow" aria-hidden="true" />
        <p className="bends-index section-index">03 / PRICING</p>
        <div className="pricing-heading">
          <h2>Elige el alcance<br /><span>de tu monitoreo.</span></h2>
          <p>Planes mensuales que crecen junto a la cartera de marcas de tu estudio.</p>
        </div>

        <div className="pricing-grid">
          <article className="pricing-card">
            <p className="pricing-plan">BÁSICO</p>
            <h3>Para carteras compactas.</h3>
            <p className="pricing-price">4 UF <span>+ IVA</span></p>
            <p className="pricing-capacity">Hasta 25 marcas</p>
            <ul>
              <li>Monitoreo automático 24/7</li>
              <li>Alertas de coincidencias</li>
              <li>Acceso al dashboard</li>
            </ul>
            <a href="#contacto">Elegir Básico <span>↘</span></a>
          </article>

          <article className="pricing-card pricing-card-featured">
            <p className="pricing-plan">MEDIO</p>
            <h3>Para carteras en crecimiento.</h3>
            <p className="pricing-price">7 UF <span>+ IVA</span></p>
            <p className="pricing-capacity">Hasta 60 marcas</p>
            <ul>
              <li>Monitoreo automático 24/7</li>
              <li>Alertas de coincidencias</li>
              <li>Acceso al dashboard</li>
            </ul>
            <a href="#contacto">Elegir Medio <span>↘</span></a>
          </article>

          <article className="pricing-card pricing-card-enterprise">
            <p className="pricing-plan">ENTERPRISE</p>
            <h3>Una solución a tu medida.</h3>
            <p className="enterprise-copy">Para carteras de más de 60 marcas, conversemos sobre un plan personalizado.</p>
            <div className="enterprise-contact">
              <a href="mailto:contato@buhomarc.cl">contato@buhomarc.cl</a>
              <a href="https://wa.me/56978083444" target="_blank" rel="noreferrer">+56 9 7808 3444</a>
            </div>
            <a href="#contacto">Cotizar Enterprise <span>↘</span></a>
          </article>
        </div>
      </section>

      <section className="bends-contact" id="contacto">
        <p className="bends-index section-index">04 / CONTACTO</p>
        <h2>Que tu cliente<br />se entere por ti.</h2>
        <a className="bends-contact-link" href="mailto:contato@buhomarc.cl">contato@buhomarc.cl <span>↗</span></a>
        <a className="bends-whatsapp-link" href="https://wa.me/56978083444" target="_blank" rel="noreferrer">
          <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="" />
          <span>Conversemos</span>
        </a>
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
          <p>Oposiciones y seguimiento legal</p>
        </div>
        <div className="footer-column">
          <span>CONTACTO</span>
          <p>contato@buhomarc.cl</p>
          <p>+56 9 7808 3444</p>
          <p>Santiago · Chile</p>
        </div>
        <p className="footer-legal">© 2026 Buho Marc. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
