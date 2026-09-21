"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  return <section className="similarity-panel feasibility-real"><header><div><h2>Estudiar una marca propuesta</h2><p>Busca por nombre, imagen o ambos y compara antecedentes de todos los estados.</p></div></header>
    <form onSubmit={search} className="similarity-form"><label>Nombre de la marca<input value={name} maxLength={500} onChange={e => { invalidate(); setName(e.target.value); }} placeholder="Ej.: Micelio" /></label>
      <label>Imagen de la marca (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { invalidate(); const candidate = e.target.files?.[0] ?? null; if (candidate && candidate.size > 8 * 1024 * 1024) { chooseFile(null); setError("La imagen debe pesar hasta 8 MiB."); e.target.value = ""; } else chooseFile(candidate); }} /><small>JPEG, PNG o WebP · hasta 8 MiB y 20 megapíxeles</small></label>
      <fieldset><legend>Clases y productos o servicios (opcional)</legend><label>Agregar clase<select value="" onChange={e => { if (e.target.value) { invalidate(); setCoverage(c => ({ ...c, [e.target.value]: "" })); } }}><option value="">Seleccionar clase</option>{NICE_CLASSES.map(c => <option key={c.number} value={c.number} disabled={String(c.number) in coverage}>{c.number} · {c.meaning}</option>)}</select></label>
        {Object.entries(coverage).map(([n, value]) => <div className="similarity-coverage" key={n}><label>Clase {n} · productos o servicios concretos<textarea value={value} maxLength={6000} placeholder="Describe lo que quieres proteger; puedes dejarlo vacío." onChange={e => { invalidate(); setCoverage(c => ({ ...c, [n]: e.target.value })); }} /></label><button type="button" onClick={() => { invalidate(); setCoverage(c => Object.fromEntries(Object.entries(c).filter(([key]) => key !== n))); }}>Quitar clase {n}</button></div>)}
      </fieldset><label className="similarity-checkbox"><input type="checkbox" checked={grouped} onChange={e => { invalidate(); setGrouped(e.target.checked); }} />Agrupar marcas similares del mismo titular</label>
      <button className="buho-primary" type="submit" disabled={busy || (!name.trim() && !file)}>{busy ? "Buscando similitudes…" : "Buscar similitudes"}</button>
    </form>
    {busy && <p role="status">Consultando marcas y sus estados. La búsqueda puede tardar unos segundos.</p>}{error && <p role="alert" className="similarity-error">{error}</p>}
    {result && <section className="similarity-search-results"><h3>{result.query.name === "Marca figurativa sin denominación" ? "Resultados de la imagen propuesta" : `Resultados para ${result.query.name}`}</h3><p>{result.results.length} solicitudes obtenidas · INAPI / DeQuiénEs · {new Date(result.fetchedAt).toLocaleString("es-CL")}</p><p>El orden refleja semejanza, no probabilidad de registro ni de conflicto.</p>
      {!result.results.length && <p>No se encontraron coincidencias en esta búsqueda.</p>}
      {groups ? groups.slice(0,visible).map(group => { const hits = result.results.filter(h => group.member_ids.includes(Number(h.applicationId))); const representative = hits.find(h => Number(h.applicationId) === group.representative_id) ?? hits[0]; return representative ? <section key={group.representative_id}><SimilarityCard hit={representative} queryName={name || "la propuesta"} queryImage={preview || result.query.image} /><details><summary>Ver las {hits.length} solicitudes del grupo</summary>{hits.map(hit => <SimilarityCard key={hit.applicationId} hit={hit} />)}</details></section> : null; }) : result.results.slice(0,visible).map((hit,i) => <SimilarityCard key={hit.applicationId} hit={hit} position={i+1} queryName={name || "la propuesta"} queryImage={preview || result.query.image} />)}
      {visible < (groups?.length ?? result.results.length) && <button className="similarity-more" onClick={() => setVisible(n => n + 10)}>Ver más resultados</button>}
      {!!result.warnings.length && <details><summary>Observaciones de la búsqueda</summary><ul>{result.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    </section>}
  </section>;
}
