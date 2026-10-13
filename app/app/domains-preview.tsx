"use client";

import { useState, type FormEvent } from "react";
import { Globe, Bell } from "@phosphor-icons/react";
import { addPreviewDomain, NIC_WHOIS_URL, searchDomainPreview, type DomainBrand, type DomainPreview, type DomainRecord, type DomainSearchResult } from "@/lib/domain-preview";
import { ReviewDialog } from "./review-dialog";
import "./domains-preview.css";

export type DomainsTab = "domains" | "feasibility" | "notices";
type PreviewProps = { state: DomainPreview; onChange: (next: DomainPreview) => void; brands: DomainBrand[] };
function dateLabel(date: string | null) {
  return date ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)) : "Pendiente de API";
}
function MockNote() {
  return <p className="domain-mock-note"><span>Vista de prueba</span> Datos simulados. Los cambios de prueba se reinician al recargar.</p>;
}

export function DomainMetrics({ state, onOpen }: { state: DomainPreview; onOpen: (tab: DomainsTab) => void }) {
  const pending = state.notices.filter(notice => !notice.reviewed).length;
  return <><button type="button" onClick={() => onOpen("domains")}><span><Globe size={16} aria-hidden /> Dominios vigilados</span><strong>{state.domains.length}</strong><small>Datos de ejemplo</small></button><button type="button" onClick={() => onOpen("notices")}><span><Bell size={16} aria-hidden /> Avisos de dominios</span><strong>{pending}</strong><small>Pendientes · simulados</small></button></>;
}

export function BrandDomainField({ brand, state, onChange, onOpen }: { brand: DomainBrand; state: DomainPreview; onChange: PreviewProps["onChange"]; onOpen: () => void }) {
  const domain = state.domains.find(item => item.brandId === brand.id);
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  function save() {
    try { onChange(addPreviewDomain(state, input, brand.id)); setAdding(false); setInput(""); setError(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo agregar el dominio."); }
  }
  return <section className="domain-brand-section"><header><div><h3>Dominio asociado</h3><p>Opcional · vista de prueba</p></div><button type="button" className="buho-secondary" onClick={onOpen}>Ver dominios</button></header>{domain ? <div className="domain-associated"><strong>{domain.name}</strong><button type="button" onClick={() => onChange({ ...state, domains: state.domains.map(item => item.id === domain.id ? { ...item, brandId: undefined } : item) })}>Desvincular</button><small>El dominio seguirá en la lista de vigilancia.</small></div> : adding ? <div><label htmlFor={`domain-${brand.id}`}>Nombre del dominio</label><div className="domain-inline-form"><input id={`domain-${brand.id}`} value={input} placeholder="mimarca.cl" onChange={event => { setInput(event.target.value); setError(""); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); save(); } }} /><button className="buho-primary" type="button" onClick={save}>Asociar dominio</button><button type="button" className="buho-secondary" onClick={() => { setAdding(false); setError(""); }}>Cancelar</button></div>{error && <p role="alert" className="domain-error">{error}</p>}</div> : <div className="domain-unassociated"><p>Esta marca aún no tiene un dominio asociado.</p><button type="button" className="buho-primary" onClick={() => setAdding(true)}>Agregar dominio</button></div>}</section>;
}

export function DomainsPreview({ state, onChange, brands, tab, onTab }: PreviewProps & { tab: DomainsTab; onTab: (tab: DomainsTab) => void }) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const domain = state.domains.find(item => item.id === selected);
  const filtered = state.domains.filter(item => `${item.name} ${brands.find(brand => brand.id === item.brandId)?.name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pending = state.notices.filter(notice => !notice.reviewed).length;
  return <section className="domains-preview"><MockNote /><div className="domain-tabs" role="tablist" aria-label="Revisión de dominios">{([["domains", "Mis dominios"], ["feasibility", "Factibilidad dominio"], ["notices", `Avisos de dominios (${pending})`]] as const).map(([value, label]) => <button id={`domain-tab-${value}`} aria-controls={`domain-panel-${value}`} key={value} role="tab" aria-selected={tab === value} type="button" onClick={() => onTab(value)}>{label}</button>)}</div>
    {tab === "domains" && <div role="tabpanel" id="domain-panel-domains" aria-labelledby="domain-tab-domains"><div className="domain-toolbar"><label>Buscar dominio o marca<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ej. novafoods.cl" /></label><button className="buho-primary" type="button" onClick={() => setFormOpen(true)}>Agregar dominio +</button></div><div className="domain-table-wrap"><table className="domain-table"><thead><tr><th>Dominio</th><th>Fecha de creación</th><th>Titular</th><th>Marca asociada</th><th>Seguimiento</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><button type="button" className="domain-name" onClick={() => setSelected(item.id)}>{item.name}</button></td><td>{dateLabel(item.createdAt)}</td><td>{item.holder ?? "Pendiente de API"}</td><td>{brands.find(brand => brand.id === item.brandId)?.name ?? "Sin marca asociada"}</td><td><span className="domain-status">Vigilado · simulado</span></td></tr>)}</tbody></table></div>{!filtered.length && <p className="domain-empty">No hay dominios que coincidan con tu búsqueda.</p>}<p className="domain-footnote">{state.domains.length} dominios vigilados. Las fechas de ejemplo representan la creación del dominio; las nuevas altas quedan pendientes de API.</p></div>}
    {tab === "feasibility" && <div role="tabpanel" id="domain-panel-feasibility" aria-labelledby="domain-tab-feasibility"><DomainFeasibility state={state} onChange={onChange} /></div>}
    {tab === "notices" && <div role="tabpanel" id="domain-panel-notices" aria-labelledby="domain-tab-notices" className="domain-notices">{state.notices.map(notice => <article key={notice.id}><div><span className="domain-status">Aviso simulado</span><h3>{notice.title}</h3><strong>{state.domains.find(item => item.id === notice.domainId)?.name}</strong><p>{dateLabel(notice.date)}</p></div><button className="buho-secondary" type="button" disabled={notice.reviewed} onClick={() => onChange({ ...state, notices: state.notices.map(item => item.id === notice.id ? { ...item, reviewed: true } : item) })}>{notice.reviewed ? "Revisado" : "Marcar revisado"}</button></article>)}{!state.notices.length && <p className="domain-empty">No hay avisos de dominios.</p>}</div>}
    {formOpen && <DomainForm brands={brands} state={state} onChange={onChange} onClose={() => setFormOpen(false)} />}
    {domain && <DomainDetails domain={domain} brands={brands} state={state} onChange={onChange} onClose={() => setSelected(null)} />}
  </section>;
}

function DomainForm({ brands, state, onChange, onClose }: PreviewProps & { onClose: () => void }) {
  const [input, setInput] = useState("");
  const [brandId, setBrandId] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { onChange(addPreviewDomain(state, input, brandId || undefined)); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo agregar el dominio."); }
  }
  return <ReviewDialog title="Agregar dominio" eyebrow="VISTA DE PRUEBA" className="domain-dialog" onClose={onClose}><form className="domain-form" onSubmit={submit}><p>Vigila un dominio por sí solo o asócialo a una marca de tu cartera.</p><label>Dominio<input required value={input} onChange={event => { setInput(event.target.value); setError(""); }} placeholder="mimarca.cl" maxLength={253} /></label><label>Marca asociada (opcional)<select value={brandId} onChange={event => { setBrandId(event.target.value); setError(""); }}><option value="">Sin marca asociada</option>{brands.map(brand => <option key={brand.id} value={brand.id} disabled={state.domains.some(domain => domain.brandId === brand.id)}>{brand.name}{state.domains.some(domain => domain.brandId === brand.id) ? " · ya tiene dominio" : ""}</option>)}</select></label><p>Fecha de creación y titular: pendientes de la futura consulta a la API.</p>{error && <p role="alert" className="domain-error">{error}</p>}<footer><button type="button" className="buho-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="buho-primary">Agregar a vigilancia</button></footer></form></ReviewDialog>;
}

function DomainDetails({ domain, brands, state, onChange, onClose }: PreviewProps & { domain: DomainRecord; onClose: () => void }) {
  const [error, setError] = useState("");
  return <ReviewDialog title={domain.name} eyebrow="DOMINIO · SIMULADO" className="domain-dialog" onClose={onClose}><div className="domain-form"><dl className="domain-detail"><div><dt>Fecha de creación</dt><dd>{dateLabel(domain.createdAt)}</dd></div><div><dt>Titular</dt><dd>{domain.holder ?? "Pendiente de API"}</dd></div><div><dt>Inicio de vigilancia</dt><dd>{dateLabel(domain.addedAt)}</dd></div></dl><label>Marca asociada (opcional)<select value={domain.brandId ?? ""} onChange={event => {
    const brandId = event.target.value || undefined;
    if (brandId && state.domains.some(item => item.id !== domain.id && item.brandId === brandId)) { setError("Esta marca ya tiene un dominio asociado."); return; }
    setError(""); onChange({ ...state, domains: state.domains.map(item => item.id === domain.id ? { ...item, brandId } : item) });
  }}><option value="">Sin marca asociada</option>{brands.map(brand => <option key={brand.id} value={brand.id} disabled={state.domains.some(item => item.id !== domain.id && item.brandId === brand.id)}>{brand.name}</option>)}</select></label>{error && <p role="alert" className="domain-error">{error}</p>}<p>La asociación es opcional y no cambia los antecedentes de la marca.</p><a href={NIC_WHOIS_URL} target="_blank" rel="noreferrer">Abrir consulta oficial en NIC Chile ↗</a><footer><button className="buho-secondary" type="button" onClick={onClose}>Cerrar</button></footer></div></ReviewDialog>;
}

function DomainFeasibility({ state, onChange }: { state: DomainPreview; onChange: PreviewProps["onChange"] }) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"exact" | "contains">("exact");
  const [results, setResults] = useState<DomainSearchResult[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    try { setResults(searchDomainPreview(state.domains, input, mode)); setError(""); }
    catch (failure) { setResults(null); setError(failure instanceof Error ? failure.message : "No se pudo buscar."); }
  }
  return <section className="domain-feasibility"><h2>Factibilidad dominio</h2><p>Busca un nombre de dominio .CL con coincidencia exacta o que contenga el texto, siguiendo la consulta de NIC Chile.</p><form onSubmit={search}><label>Buscar dominio<input required value={input} onChange={event => { setInput(event.target.value); setResults(null); setError(""); setMessage(""); }} placeholder="Ej. novafoods.cl" /></label><fieldset><legend>Coincidencia</legend><label><input type="radio" name="domain-match" checked={mode === "exact"} onChange={() => { setMode("exact"); setResults(null); setMessage(""); }} />Exacta</label><label><input type="radio" name="domain-match" checked={mode === "contains"} onChange={() => { setMode("contains"); setResults(null); setMessage(""); }} />Contenga</label></fieldset><button className="buho-primary" type="submit">Buscar dominio</button></form><p className="domain-footnote">Prueba con novafoods.cl, “nova” en Contenga o nuevamarcaejemplo.cl. La disponibilidad mostrada es ficticia; confirma cualquier nombre en <a href={NIC_WHOIS_URL} target="_blank" rel="noreferrer">NIC Chile ↗</a>.</p>{error && <p role="alert" className="domain-error">{error}</p>}{message && <p role="status">{message}</p>}{results && <div aria-live="polite"><p>{results.length} {results.length === 1 ? "resultado simulado" : "resultados simulados"}</p>{results.length ? <div className="domain-search-results">{results.map(result => <article key={result.name}><div><h3>{result.name}</h3><span className={`domain-status ${result.status === "Disponible" ? "is-available" : ""}`}>{result.status} · simulado</span><p>Titular: {result.holder ?? "Pendiente de API"}</p><p>Fecha de creación: {result.status === "Disponible" ? "No aplica en este ejemplo" : dateLabel(result.createdAt)}</p></div><button className="buho-secondary" type="button" disabled={state.domains.some(domain => domain.name === result.name)} onClick={() => {
    try { onChange(addPreviewDomain(state, result.name)); setMessage(`${result.name} agregado a la vigilancia de prueba.`); } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo agregar."); }
  }}>{state.domains.some(domain => domain.name === result.name) ? "Ya en vigilancia" : "Vigilar dominio"}</button></article>)}</div> : <p className="domain-empty">Sin datos en esta demo para ese nombre. Esto no indica que el dominio esté disponible.</p>}</div>}</section>;
}
