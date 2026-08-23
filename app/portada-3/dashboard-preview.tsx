const metrics = [
  ["MARCAS EN SEGUIMIENTO", "20", "20 de 25 cupos utilizados"],
  ["NUEVAS COINCIDENCIAS", "08", "Pendientes de revisión"],
  ["CASOS ACTIVOS", "04", "2 con plazo cercano"],
  ["OPOSICIONES EN CURSO", "02", "Revisa los próximos vencimientos"],
] as const;

const calendarDays = Array.from({ length: 31 }, (_, index) => index + 1);
const eventDays = new Set([20, 22, 24, 27, 29]);

const agendaItems = [
  ["20 AGO", "Vence el plazo de NOVA FUDS para presentar una oposición."],
  ["22 AGO", "Vence el plazo de TERRA DEL SUR para presentar una oposición."],
] as const;

const matches = [
  ["ALTA", "NOVA FOODS", "NOVA FUDS"],
  ["ALTA", "TERRA SUR", "TERRA DEL SUR"],
  ["MEDIA", "NOVA FOODS", "NOVO FOOD LAB"],
] as const;

export default function DashboardPreview() {
  return (
    <div
      className="prospect-dashboard"
      aria-label="Vista previa no interactiva del dashboard de Buho Marc"
      aria-disabled="true"
    >
      <header className="prospect-dashboard-header">
        <span>DOMINGO, 23 AGO 2026</span>
        <h3>Buenos días, José Ignacio.</h3>
        <p>Resumen de tu cartera y acciones prioritarias</p>
      </header>

      <div className="prospect-attention">
        <strong><i /><span>7 COINCIDENCIAS REQUIEREN SER<br />REVISADAS</span></strong>
        <div className="prospect-attention-levels">
          <span className="is-high"><b>3</b> Alta similitud</span>
          <span className="is-medium"><b>3</b> Media similitud</span>
          <span className="is-low"><b>2</b> Baja similitud</span>
        </div>
        <span className="prospect-faux-link">Revisar ahora →</span>
      </div>

      <div className="prospect-metrics">
        {metrics.map(([label, value, detail]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>

      <div className="prospect-dashboard-grid">
        <article className="prospect-panel prospect-agenda">
          <header>
            <div><span>AGENDA LEGAL</span><h4>Agosto 2026</h4></div>
            <small>2 oposiciones activas</small>
          </header>
          <div className="prospect-calendar-week">
            {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="prospect-calendar-grid">
            {calendarDays.map((day) => <span className={eventDays.has(day) ? "is-event" : ""} key={day}>{day}</span>)}
          </div>
          <div className="prospect-agenda-list">
            {agendaItems.map(([date, copy]) => (
              <div key={date}><span>{date}</span><b>ALTA</b><strong>{copy}</strong></div>
            ))}
          </div>
        </article>

        <article className="prospect-panel prospect-matches">
          <header>
            <div><span>BANDEJA DE REVISIÓN</span><h4>Coincidencias nuevas</h4></div>
            <span className="prospect-view-all">Ver todas</span>
          </header>
          {matches.map(([level, brand, found]) => (
            <div className="prospect-match-row" key={`${brand}-${found}`}>
              <b className={level === "MEDIA" ? "is-medium" : "is-high"}>{level}</b>
              <div><small>MARCA EN SEGUIMIENTO</small><strong>{brand}</strong></div>
              <div><small>POSIBLE COINCIDENCIA</small><strong>{found}</strong></div>
              <span>Ver en INAPI ↗</span>
            </div>
          ))}
        </article>
      </div>
    </div>
  );
}
