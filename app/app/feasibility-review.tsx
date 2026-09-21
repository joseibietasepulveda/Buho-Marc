"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { MagnifyingGlass, Sparkle, UploadSimple, X } from "@phosphor-icons/react";
import { NICE_CLASSES } from "@/lib/nice-classes";
import type { SimilarityResult } from "@/lib/similarity-contract";
import { SimilarityCard } from "./similarity-results";
import "./similarity.css";

export function FeasibilityReview() {
  const [name, setName] = useState(""), [file, setFile] = useState<File | null>(null), [coverage, setCoverage] = useState<Record<string, string>>({});
  const [grouped, setGrouped] = useState(false), [result, setResult] = useState<SimilarityResult | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [visible, setVisible] = useState(10);
  const [preview, setPreview] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function chooseFile(value: File | null) { setFile(value); setPreview(value ? URL.createObjectURL(value) : ""); }
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => () => request.current?.abort(), []);
  function invalidate() { generation.current++; request.current?.abort(); setBusy(false); setResult(null); setError(""); setVisible(10); }
  async function search(event: FormEvent) {
    event.preventDefault(); invalidate(); const ownGeneration = generation.current; const controller = new AbortController(); request.current = controller; setBusy(true);
    try {
      const query = { name, coverage: Object.entries(coverage).map(([nice_class, text]) => ({ nice_class: Number(nice_class), text })), limit: 50, grouped };
      const form = new FormData(); form.set("query", JSON.stringify(query)); if (file) form.set("image", file);
      const response = await fetch("/api/similarity", { method: "POST", body: form, signal: controller.signal }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No se pudo completar la búsqueda.");
      if (generation.current === ownGeneration) setResult(payload);
    } catch (e) { if (!controller.signal.aborted && generation.current === ownGeneration) setError(e instanceof Error ? e.message : "No se pudo completar la búsqueda."); }
    finally { if (generation.current === ownGeneration) setBusy(false); }
  }
  const groups = grouped && result?.groups.length ? (() => {
    const available = new Set(result.results.map(hit => Number(hit.applicationId)));
    const used = new Set<number>();
    const normalized = result.groups.flatMap(group => {
      const member_ids = group.member_ids.filter(id => available.has(id) && !used.has(id));
      member_ids.forEach(id => used.add(id));
      return member_ids.length ? [{ ...group, member_ids, representative_id: member_ids.includes(group.representative_id) ? group.representative_id : member_ids[0] }] : [];
    });
    for (const id of available) if (!used.has(id)) normalized.push({ representative_id: id, member_ids: [id] });
    return normalized;
  })() : null;
  return <section className="feasibility-real">
    <section className="feasibility-builder"><header className="feasibility-intro"><div><span className="buho-overline">ANÁLISIS PREVIO A LA SOLICITUD</span><h2>Revisa una marca antes de registrarla</h2><p>Prepara el nombre, la imagen y las clases Niza que deseas revisar.</p></div></header>
    <form onSubmit={search} className="feasibility-search-layout">
      <div className="feasibility-input-area"><div className="feasibility-searchbar"><div className="feasibility-mode feasibility-real-mode">Por similitud</div><label className="feasibility-name"><MagnifyingGlass size={23} aria-hidden /><input aria-label="Nombre de la marca" value={name} maxLength={500} onChange={e => { invalidate(); setName(e.target.value); }} placeholder="Nombre de la marca" /></label></div>
        <div className="feasibility-options"><div className="feasibility-class-picker"><label htmlFor="proposal-class">Clases Niza <span>Opcional · puedes agregar varias</span></label><select id="proposal-class" value="" onChange={e => { const n=e.target.value; if(n) {invalidate();setCoverage(c => ({...c,[n]:""}));} }}><option value="">Agregar una clase por número o significado…</option>{NICE_CLASSES.map(c => <option key={c.number} value={c.number} disabled={String(c.number) in coverage}>{c.number} · {c.meaning}</option>)}</select></div><div className="feasibility-class-tags">{Object.keys(coverage).map(n => <button type="button" key={n} aria-label={`Quitar clase ${n}`} onClick={() => {invalidate();setCoverage(c => Object.fromEntries(Object.entries(c).filter(([key]) => key !== n)));}}>{n} <X size={14}/></button>)}</div></div>
        <button className="feasibility-submit" type="submit" disabled={busy || (!name.trim() && !file)}><Sparkle size={22} />{busy ? "Buscando similitudes…" : "Buscar"}</button>
      </div>
      <div className="feasibility-logo-picker"><input ref={fileInput} className="buho-sr-only" aria-label="Imagen de la marca" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { invalidate(); const candidate=e.target.files?.[0] ?? null; if(candidate && candidate.size > 8*1024*1024) {chooseFile(null);setError("La imagen debe pesar hasta 8 MiB.");e.target.value="";} else chooseFile(candidate); }} /><button className={`feasibility-upload ${preview ? 'has-image' : ''}`} type="button" onClick={() => fileInput.current?.click()}>{preview ? <Image unoptimized src={preview} alt="Imagen de la marca propuesta" width={158} height={112}/> : <UploadSimple size={36} aria-hidden/>}<span>{file ? "Cambiar logo" : "Subir logo"}</span></button>{file && <button type="button" className="feasibility-remove-x" aria-label="Quitar imagen" onClick={() => {invalidate();chooseFile(null);if(fileInput.current)fileInput.current.value="";}}><X size={18}/></button>}<small>JPEG, PNG o WebP · hasta 8 MiB</small></div>
      <details className="feasibility-extra"><summary>Coberturas y opciones de búsqueda</summary><p>Describe los productos o servicios para comparar también su cobertura.</p>{!Object.keys(coverage).length && <p>Agrega una clase para especificar su cobertura.</p>}{Object.entries(coverage).map(([n,value]) => <label key={n}>Clase {n}<textarea value={value} maxLength={6000} placeholder="Productos o servicios que quieres proteger (opcional)" onChange={e => {invalidate();setCoverage(c => ({...c,[n]:e.target.value}));}}/></label>)}<label className="similarity-checkbox"><input type="checkbox" checked={grouped} onChange={e => {invalidate();setGrouped(e.target.checked);}}/>Agrupar marcas similares del mismo titular</label></details>
    </form></section>
    {busy && <p role="status">Consultando marcas y sus estados. La búsqueda puede tardar unos segundos.</p>}{error && <p role="alert" className="similarity-error">{error}</p>}
    {result && <section className="similarity-search-results"><h3>{result.query.name === "Marca figurativa sin denominación" ? "Resultados de la imagen propuesta" : `Resultados para ${result.query.name}`}</h3><p>{result.results.length} solicitudes obtenidas · INAPI / DeQuiénEs · {new Date(result.fetchedAt).toLocaleString("es-CL")}</p><p>El orden refleja semejanza, no probabilidad de registro ni de conflicto.</p>
      {!result.results.length && <p>No se encontraron coincidencias en esta búsqueda.</p>}
      {groups ? groups.slice(0,visible).map(group => { const hits = result.results.filter(h => group.member_ids.includes(Number(h.applicationId))); const representative = hits.find(h => Number(h.applicationId) === group.representative_id) ?? hits[0]; return representative ? <section key={group.representative_id}><SimilarityCard hit={representative} queryName={name || "la propuesta"} queryImage={preview || result.query.image} /><details><summary>Ver las {hits.length} solicitudes del grupo</summary>{hits.map(hit => <SimilarityCard key={hit.applicationId} hit={hit} />)}</details></section> : null; }) : result.results.slice(0,visible).map((hit,i) => <SimilarityCard key={hit.applicationId} hit={hit} position={i+1} queryName={name || "la propuesta"} queryImage={preview || result.query.image} />)}
      {visible < (groups?.length ?? result.results.length) && <button className="similarity-more" onClick={() => setVisible(n => n + 10)}>Ver más resultados</button>}
      {!!result.warnings.length && <details><summary>Observaciones de la búsqueda</summary><ul>{result.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    </section>}
  </section>;
}
