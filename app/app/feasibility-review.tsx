"use client";

import {
  ArrowClockwise,
  CaretRight,
  Check,
  FileImage,
  Info,
  MagnifyingGlass,
  ShieldCheck,
  Sparkle,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { ChangeEvent, FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ReviewDialog } from "./review-dialog";

type NiceClass = { number: number; meaning: string };
type FeasibilityMatch = {
  id: string;
  name: string;
  logo: string;
  appliedAt: string;
  classes: number[];
  status: "Registrada" | "En trámite";
  application: string;
  applicant: string;
  similarity: number;
  matchType: "Visual" | "Fonética" | "Conceptual";
  reason: string;
};

const NICE_CLASSES: NiceClass[] = [
  { number: 1, meaning: "Productos químicos para la industria, ciencia y agricultura" },
  { number: 2, meaning: "Pinturas, barnices y productos contra la corrosión" },
  { number: 3, meaning: "Cosméticos, perfumería y productos de limpieza" },
  { number: 4, meaning: "Aceites industriales, lubricantes, combustibles y velas" },
  { number: 5, meaning: "Productos farmacéuticos, médicos y veterinarios" },
  { number: 6, meaning: "Metales comunes y productos metálicos" },
  { number: 7, meaning: "Máquinas, máquinas herramienta y motores" },
  { number: 8, meaning: "Herramientas e instrumentos accionados manualmente" },
  { number: 9, meaning: "Aparatos científicos, electrónicos y software" },
  { number: 10, meaning: "Aparatos e instrumentos médicos" },
  { number: 11, meaning: "Aparatos de iluminación, calefacción, cocción y refrigeración" },
  { number: 12, meaning: "Vehículos y aparatos de transporte" },
  { number: 13, meaning: "Armas de fuego, municiones y fuegos artificiales" },
  { number: 14, meaning: "Joyería, piedras preciosas y relojería" },
  { number: 15, meaning: "Instrumentos musicales" },
  { number: 16, meaning: "Papel, impresos, material de oficina y enseñanza" },
  { number: 17, meaning: "Caucho, plásticos semielaborados y materiales aislantes" },
  { number: 18, meaning: "Cuero, equipaje, paraguas y artículos de talabartería" },
  { number: 19, meaning: "Materiales de construcción no metálicos" },
  { number: 20, meaning: "Muebles, espejos y recipientes no metálicos" },
  { number: 21, meaning: "Utensilios domésticos, recipientes, cristalería y porcelana" },
  { number: 22, meaning: "Cuerdas, redes, tiendas y materias textiles en bruto" },
  { number: 23, meaning: "Hilos e hilados para uso textil" },
  { number: 24, meaning: "Tejidos y ropa de hogar" },
  { number: 25, meaning: "Prendas de vestir, calzado y sombrerería" },
  { number: 26, meaning: "Encajes, bordados, botones y flores artificiales" },
  { number: 27, meaning: "Alfombras, revestimientos de suelos y tapices" },
  { number: 28, meaning: "Juegos, juguetes y artículos deportivos" },
  { number: 29, meaning: "Carne, pescado, lácteos y alimentos procesados" },
  { number: 30, meaning: "Café, té, cacao, pan, pastelería y condimentos" },
  { number: 31, meaning: "Productos agrícolas, plantas y animales vivos" },
  { number: 32, meaning: "Cervezas, aguas y bebidas sin alcohol" },
  { number: 33, meaning: "Bebidas alcohólicas, excepto cervezas" },
  { number: 34, meaning: "Tabaco y artículos para fumadores" },
  { number: 35, meaning: "Publicidad, gestión comercial y venta minorista" },
  { number: 36, meaning: "Servicios financieros, seguros e inmobiliarios" },
  { number: 37, meaning: "Construcción, reparación e instalación" },
  { number: 38, meaning: "Telecomunicaciones" },
  { number: 39, meaning: "Transporte, embalaje y almacenamiento" },
  { number: 40, meaning: "Tratamiento y transformación de materiales" },
  { number: 41, meaning: "Educación, formación, entretenimiento y deporte" },
  { number: 42, meaning: "Servicios científicos, tecnológicos y desarrollo de software" },
  { number: 43, meaning: "Restauración, cafeterías y alojamiento temporal" },
  { number: 44, meaning: "Servicios médicos, veterinarios, agrícolas y de belleza" },
  { number: 45, meaning: "Servicios jurídicos, seguridad y servicios personales" },
];

const DEMO_MATCHES: FeasibilityMatch[] = [
  {
    id: "FM-001",
    name: "CAFETERAS LAS DELICIAS",
    logo: "/feasibility/cafeteras-las-delicias.png",
    appliedAt: "14/03/2024",
    classes: [11, 30, 35, 43],
    status: "Registrada",
    application: "1569821",
    applicant: "Las Delicias Café SpA",
    similarity: 94,
    matchType: "Visual",
    reason: "Alta cercanía gráfica: taza, vapor, composición centrada y denominación CAFETERAS en una posición equivalente.",
  },
  {
    id: "FM-002",
    name: "HOTEL MISTRAL",
    logo: "/feasibility/hoteles-mistral.jpeg",
    appliedAt: "02/08/2022",
    classes: [35, 43],
    status: "Registrada",
    application: "1497340",
    applicant: "Inversiones Hoteleras Mistral Ltda.",
    similarity: 88,
    matchType: "Fonética",
    reason: "Coincidencia dominante en la palabra MISTRAL y cercanía entre servicios de cafetería y alojamiento de la clase 43.",
  },
  {
    id: "FM-003",
    name: "PISCO MISTRAL",
    logo: "/feasibility/pisco-mistral.png",
    appliedAt: "19/11/2018",
    classes: [33],
    status: "Registrada",
    application: "1324186",
    applicant: "Compañía Pisquera de Chile S.A.",
    similarity: 27,
    matchType: "Fonética",
    reason: "Comparte la palabra MISTRAL, pero la clase y la identidad visual se alejan de la marca analizada.",
  },
  {
    id: "FM-004",
    name: "MUSEO GABRIELA MISTRAL",
    logo: "/feasibility/museo-gabriela-mistral.png",
    appliedAt: "07/05/2021",
    classes: [41],
    status: "En trámite",
    application: "1459077",
    applicant: "Fundación Cultural Gabriela Mistral",
    similarity: 7,
    matchType: "Conceptual",
    reason: "La coincidencia se limita a MISTRAL; el conjunto denominativo, el logo y los servicios son claramente distintos.",
  },
];

const DEMO_CLASSES = [11, 30, 43];

function riskTone(value: number) {
  if (value < 15) return "risk-low";
  if (value === 15) return "risk-neutral";
  return "risk-high";
}

function riskLabel(value: number) {
  if (value < 15) return "Probabilidad baja";
  if (value === 15) return "Punto de referencia";
  return value >= 65 ? "Probabilidad alta" : "Probabilidad sobre la referencia";
}

export function FeasibilityReview() {
  const [brandName, setBrandName] = useState("Cafeteras Mistral");
  const [selectedClasses, setSelectedClasses] = useState<number[]>(DEMO_CLASSES);
  const [classChoice, setClassChoice] = useState("");
  const [imageUrl, setImageUrl] = useState("/feasibility/cafeteras-mistral.png");
  const [uploadedName, setUploadedName] = useState("cafeteras-mistral.png");
  const [phase, setPhase] = useState<"ready" | "loading" | "results">("ready");
  const [selectedMatch, setSelectedMatch] = useState<FeasibilityMatch | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const selectedMeanings = useMemo(
    () => selectedClasses.map((number) => NICE_CLASSES.find((item) => item.number === number)).filter(Boolean) as NiceClass[],
    [selectedClasses],
  );

  function addClass(value: string) {
    const number = Number(value);
    if (!number) return;
    setSelectedClasses((current) => current.includes(number) ? current : [...current, number].sort((a, b) => a - b));
    setClassChoice("");
  }

  function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setUploadedName(file.name);
    setPhase("ready");
  }

  function analyze(event: FormEvent) {
    event.preventDefault();
    if (!brandName.trim()) return;
    setPhase("loading");
    window.setTimeout(() => setPhase("results"), 1150);
  }

  function restoreDemo() {
    if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    setBrandName("Cafeteras Mistral");
    setSelectedClasses(DEMO_CLASSES);
    setImageUrl("/feasibility/cafeteras-mistral.png");
    setUploadedName("cafeteras-mistral.png");
    setSelectedMatch(null);
    setPhase("ready");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="feasibility-view">
      <form className="feasibility-search-panel" onSubmit={analyze}>
        <div className="feasibility-intro">
          <div>
            <span className="buho-overline">ANÁLISIS PREVIO A LA SOLICITUD</span>
            <h2>Revisa una marca antes de inscribirla</h2>
            <p>Busca coincidencias por nombre, imagen y clases Niza para preparar una primera evaluación.</p>
          </div>
          <button className="feasibility-reset" onClick={restoreDemo} type="button"><ArrowClockwise size={16} /> Restablecer caso demo</button>
        </div>

        <div className="feasibility-searchbar">
          <label className="feasibility-mode">
            <span className="sr-only">Tipo de coincidencia</span>
            <select aria-label="Tipo de coincidencia" defaultValue="contains">
              <option value="contains">Contiene</option>
              <option value="exact">Coincidencia exacta</option>
              <option value="starts">Comienza con</option>
            </select>
          </label>
          <label className="feasibility-name">
            <MagnifyingGlass aria-hidden="true" size={22} />
            <span className="sr-only">Nombre de la marca</span>
            <input aria-label="Nombre de la marca" onChange={(event) => { setBrandName(event.target.value); setPhase("ready"); }} placeholder="Introduce el nombre de la marca" value={brandName} />
          </label>
          <input accept="image/*" className="sr-only" onChange={uploadImage} ref={fileRef} type="file" />
          <button aria-label="Subir logo de la marca" className={`feasibility-upload${imageUrl ? " has-image" : ""}`} onClick={() => fileRef.current?.click()} type="button">
            {imageUrl ? <img alt="Logo cargado para analizar" src={imageUrl} /> : <UploadSimple size={23} />}
            <span>{imageUrl ? "Cambiar logo" : "Subir logo"}</span>
          </button>
          <button className="feasibility-submit" disabled={!brandName.trim() || phase === "loading"} type="submit">
            {phase === "loading" ? <><span className="feasibility-spinner" /> Analizando</> : <><Sparkle size={19} weight="fill" /> Analizar factibilidad</>}
          </button>
        </div>

        <div className="feasibility-options">
          <div className="feasibility-class-picker">
            <label htmlFor="nice-class">Clases Niza <span>Opcional · puedes agregar varias</span></label>
            <select id="nice-class" onChange={(event) => addClass(event.target.value)} value={classChoice}>
              <option value="">Agregar una clase por número o significado…</option>
              {NICE_CLASSES.map((item) => <option key={item.number} value={item.number}>Clase {item.number} — {item.meaning}</option>)}
            </select>
          </div>
          <div aria-label="Clases Niza seleccionadas" className="feasibility-class-chips">
            {selectedClasses.map((number) => <button aria-label={`Quitar clase ${number}`} key={number} onClick={() => setSelectedClasses((current) => current.filter((item) => item !== number))} title={NICE_CLASSES.find((item) => item.number === number)?.meaning} type="button"><span>{number}</span><X size={12} weight="bold" /></button>)}
            {!selectedClasses.length && <small>Sin clases seleccionadas</small>}
          </div>
          <div className="feasibility-file"><FileImage size={19} /><div><span>Imagen para comparar</span><strong>{uploadedName}</strong></div><Check aria-label="Imagen cargada" size={17} weight="bold" /></div>
        </div>
        {!!selectedMeanings.length && <details className="feasibility-class-detail"><summary>Ver significado de las clases seleccionadas</summary><ul>{selectedMeanings.map((item) => <li key={item.number}><b>{item.number}</b>{item.meaning}</li>)}</ul></details>}
      </form>

      {phase === "ready" && <section className="feasibility-ready" aria-live="polite"><ShieldCheck size={30} /><div><strong>Caso demo listo para analizar</strong><p>Presiona “Analizar factibilidad” para revisar Cafeteras Mistral frente a cuatro marcas mock.</p></div></section>}

      {phase === "loading" && <section aria-live="polite" className="feasibility-loading"><span className="feasibility-spinner is-large" /><div><strong>Comparando nombre, logo y clases Niza…</strong><p>Revisando coincidencias visuales, fonéticas y conceptuales.</p></div></section>}

      {phase === "results" && <div className="feasibility-results" aria-live="polite">
        <section className="feasibility-summary">
          <header>
            <div><span className="buho-overline">RESUMEN</span><h2>Factibilidad de “{brandName}”</h2></div>
            <span className="feasibility-evaluated"><Check size={15} weight="bold" /> 4 coincidencias evaluadas</span>
          </header>
          <div className="feasibility-risk-grid">
            <RiskCard label="Riesgo de observaciones de fondo: similitud gráfica o fonética con marcas previas, fama y notoriedad, emblemas nacionales, nombres propios o un signo descriptivo o genérico." value={88} />
            <article className="feasibility-finding">
              <Sparkle size={22} weight="fill" />
              <div><span>Hallazgo principal · motores simulados</span><strong>Similitud visual, fonética y semántica relevante</strong><p>“Cafeteras Las Delicias” comparte elementos gráficos, “Hotel Mistral” coincide en el componente denominativo y las coberturas presentan cercanía conceptual.</p></div>
            </article>
          </div>
          <footer><Info size={16} /><span>Estimación orientativa elaborada con datos mock para la demo. No corresponde a una resolución, búsqueda oficial ni pronóstico de INAPI.</span></footer>
        </section>

        <section className="feasibility-table-panel">
          <header><div><span className="buho-overline">POSIBLES COINCIDENCIAS</span><h2>Marcas que conviene revisar</h2></div><span>Ordenadas por similitud</span></header>
          <div className="feasibility-table-wrap">
            <table>
              <thead><tr><th aria-label="Comparar marcas" /><th>Representación gráfica</th><th>Nombre de la marca</th><th>Fecha de solicitud</th><th>Clases Niza</th><th>Situación</th><th>Número de solicitud</th><th>Nombre del solicitante</th><th>Coincidencia</th></tr></thead>
              <tbody>{DEMO_MATCHES.map((match) => (
                <tr className="feasibility-comparable-row" key={match.id} onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button")) return;
                  event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus();
                  setSelectedMatch(match);
                }}>
                  <td><button aria-label={`Comparar tu marca con ${match.name}`} aria-haspopup="dialog" className="feasibility-expand" onClick={() => setSelectedMatch(match)} type="button"><CaretRight size={18} /></button></td>
                  <td><button aria-label={`Ampliar y comparar logo de ${match.name}`} aria-haspopup="dialog" className="feasibility-logo" onClick={() => setSelectedMatch(match)} type="button"><img alt={`Logo ${match.name}`} src={match.logo} /></button></td>
                  <td><button aria-haspopup="dialog" className="feasibility-brand-name" onClick={() => setSelectedMatch(match)} type="button">{match.name}</button><small>{match.matchType} · Ver comparación</small></td>
                  <td>{match.appliedAt}</td>
                  <td><div className="feasibility-table-classes">{match.classes.map((number) => <span key={number}>{number}</span>)}</div></td>
                  <td><span className={`feasibility-status ${match.status === "Registrada" ? "is-registered" : "is-pending"}`}>{match.status}</span></td>
                  <td>{match.application}</td>
                  <td><strong>{match.applicant}</strong></td>
                  <td><span className={`feasibility-match-score score-${match.similarity >= 70 ? "high" : match.similarity >= 15 ? "medium" : "low"}`}><b>{match.similarity}%</b><small>{match.matchType}</small></span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      </div>}
      {selectedMatch && <BrandComparison match={selectedMatch} name={brandName} logo={imageUrl} classes={selectedClasses} onClose={() => setSelectedMatch(null)} />}
    </section>
  );
}

function RiskCard({ label, value }: { label: string; value: number }) {
  const tone = riskTone(value);
  return <article className={`feasibility-risk-card ${tone}`}>
    <div className="feasibility-risk-value"><strong>{value}%</strong><span>{riskLabel(value)}</span></div>
    <p>{label}</p>
    <div aria-label={`${value} por ciento`} className="feasibility-risk-scale"><span style={{ width: `${value}%` }} /></div>
    <small><i /> Bajo 15% <i /> 15% referencia <i /> Sobre 15%</small>
  </article>;
}

function ComparisonLogo({ src, name, onEnlarge }: { src: string; name: string; onEnlarge: () => void }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <button className="comparison-logo" aria-label={`Ampliar logo de ${name}`} onClick={onEnlarge} type="button">
    <img alt={`Logo de ${name}`} src={src} onError={() => setFailed(true)} />
    <span><MagnifyingGlass size={18} aria-hidden /> Ampliar logo</span>
  </button> : <div className="comparison-logo is-unavailable"><FileImage size={32} aria-hidden /><p>Logo no disponible</p></div>;
}

function BrandComparison({ match, name, logo, classes, onClose }: { match: FeasibilityMatch; name: string; logo: string; classes: number[]; onClose: () => void }) {
  const [enlarged, setEnlarged] = useState<{ name: string; src: string } | null>(null);
  const shared = classes.filter((number) => match.classes.includes(number));
  return <ReviewDialog title="Comparación de marcas" onClose={onClose} className="brand-comparison-dialog">
    <div className="comparison-content">
      <p className="comparison-context">Revisión preliminar · Coincidencia de demostración</p>
      <div className="comparison-brands">
        {[{ label: "Tu marca", name, logo, classes, status: "Marca en evaluación" }, { label: "Marca encontrada", name: match.name, logo: match.logo, classes: match.classes, status: match.status }].map((brand) => <section className="comparison-brand" key={brand.label} aria-label={brand.label}>
          <header><span>{brand.label}</span><h3>{brand.name}</h3><p>{brand.status}</p></header>
          <ComparisonLogo key={brand.logo} src={brand.logo} name={brand.name} onEnlarge={() => setEnlarged({ name: brand.name, src: brand.logo })} />
          <div className="comparison-classes"><strong>Clases Niza</strong><ul>{brand.classes.map((number) => <li key={number} className={shared.includes(number) ? "is-shared" : ""}>Clase {number}{shared.includes(number) && <span> · Compartida</span>}</li>)}</ul>{!brand.classes.length && <p>Sin clases seleccionadas</p>}</div>
        </section>)}
      </div>
      <section className="comparison-reason"><Sparkle size={22} aria-hidden /><div><h3>Por qué aparece esta marca</h3><p>{match.reason}</p><strong>Similitud {match.matchType.toLowerCase()}: {match.similarity}% · Dato simulado</strong></div></section>
      <details className="comparison-coverage"><summary>Ver significado de las clases y datos de la solicitud</summary>
        <dl className="comparison-record"><div><dt>Solicitud de la marca encontrada</dt><dd>{match.application}</dd></div><div><dt>Fecha de solicitud</dt><dd>{match.appliedAt}</dd></div><div><dt>Solicitante</dt><dd>{match.applicant}</dd></div></dl>
        <ul>{[...new Set([...classes, ...match.classes])].sort((a, b) => a - b).map((number) => <li key={number}><strong>Clase {number}</strong> — {NICE_CLASSES.find((item) => item.number === number)?.meaning}</li>)}</ul>
      </details>
      <p className="comparison-note">Los porcentajes y las coincidencias de esta demostración son simulados. Compartir una clase no determina por sí solo un conflicto entre marcas.</p>
    </div>
    <footer><button onClick={onClose} type="button">Volver a los resultados</button></footer>
    {enlarged && <LogoViewer name={enlarged.name} src={enlarged.src} onClose={() => setEnlarged(null)} />}
  </ReviewDialog>;
}

function LogoViewer({ name, src, onClose }: { name: string; src: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.scrollLeft = (canvas.scrollWidth - canvas.clientWidth) / 2;
      canvas.scrollTop = (canvas.scrollHeight - canvas.clientHeight) / 2;
    }
  }, [zoom]);
  return <ReviewDialog title={`Logo de ${name}`} onClose={onClose} className="logo-viewer-dialog">
    <div className="logo-viewer-toolbar"><label>Ampliación <input aria-label="Ampliación del logo" type="range" min="100" max="300" step="25" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label><output>{zoom}%</output><button onClick={() => setZoom(100)} type="button">Ajustar</button></div>
    {/* The scrollable image region must be focusable for keyboard panning. */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
    <div ref={canvasRef} className="logo-viewer-canvas" tabIndex={0} role="region" aria-label="Logo ampliado; desplázate para ver sus detalles"><div style={{ width: `${zoom}%`, height: `${zoom}%` }}><img alt={`Logo de ${name}`} src={src} /></div></div>
    <footer><span>La nitidez depende de la imagen original.</span><button onClick={onClose} type="button">Volver a la comparación</button></footer>
  </ReviewDialog>;
}
