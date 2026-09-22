"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { MagnifyingGlass, Sparkle, UploadSimple, X } from "@phosphor-icons/react";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { FEASIBILITY_STATUS_LABELS } from "@/lib/feasibility-policy";
import { REPORT_RECOMMENDATIONS, reportRecommendation, type ReportRecommendation } from "@/lib/feasibility-recommendation";
import type { SimilarityResult } from "@/lib/similarity-contract";
import { SimilarityCard } from "./similarity-results";
import { selectReportHits } from "@/lib/report-selection";
import { reportImages } from "./report-images";
import "./similarity.css";

export function FeasibilityReview() {
  const [name, setName] = useState(""), [file, setFile] = useState<File | null>(null), [coverage, setCoverage] = useState<Record<string, string>>({});
  const [grouped, setGrouped] = useState(false), [result, setResult] = useState<SimilarityResult | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [page, setPage] = useState(1), [pageSize,setPageSize] = useState(10);
  const [states,setStates] = useState<string[]>(["registered","pending"]), [minimum,setMinimum] = useState(0), [selected,setSelected] = useState<string[]>([]), [reportBusy, setReportBusy] = useState(false), [reportError, setReportError] = useState("");
  const [client, setClient] = useState(""), [author, setAuthor] = useState("");
  const [recommendation, setRecommendation] = useState<ReportRecommendation>("review"), [explanation, setExplanation] = useState(""), [includeAppendix, setIncludeAppendix] = useState(false);
  const [preview, setPreview] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function chooseFile(value: File | null) { setFile(value); setPreview(value ? URL.createObjectURL(value) : ""); }
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => () => request.current?.abort(), []);
  function invalidate() { generation.current++; request.current?.abort(); setBusy(false); setResult(null); setError(""); setPage(1); setSelected([]); setReportError(""); setRecommendation("review"); setExplanation(""); }
  async function search(event: FormEvent) {
    event.preventDefault(); invalidate(); const ownGeneration = generation.current; const controller = new AbortController(); request.current = controller; setBusy(true);
    try {
      const query = { name, coverage: Object.entries(coverage).map(([nice_class, text]) => ({ nice_class: Number(nice_class), text })), limit: 100, grouped, states, minSimilarity:minimum/100 };
      const form = new FormData(); form.set("query", JSON.stringify(query)); if (file) form.set("image", file);
      const response = await fetch("/api/similarity", { method: "POST", body: form, signal: controller.signal }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No se pudo completar la búsqueda.");
      if (generation.current === ownGeneration) setResult(payload);
    } catch (e) { if (!controller.signal.aborted && generation.current === ownGeneration) setError(e instanceof Error ? e.message : "No se pudo completar la búsqueda."); }
    finally { if (generation.current === ownGeneration) setBusy(false); }
  }
  async function downloadReport() {
    if (!result) return;
    const reportGeneration = generation.current;
    setReportBusy(true); setReportError("");
    try {
      const { createFeasibilityReport } = await import("@/lib/feasibility-report");
      let studioLogo: Uint8Array;
      try {
        const logoResponse = await fetch("/reports/studio-logo.png", { signal: AbortSignal.timeout(10000) });
        if (!logoResponse.ok) throw new Error("Logo no disponible");
        studioLogo = new Uint8Array(await logoResponse.arrayBuffer());
      } catch { throw new Error("No pudimos cargar el logo del estudio. Intenta descargar el informe nuevamente."); }
      let image: Uint8Array | undefined;
      if (file) {
        const bitmap = await createImageBitmap(file);
        try {
          const scale = Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
          const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width*scale); canvas.height = Math.round(bitmap.height*scale);
          const context = canvas.getContext("2d"); if (!context) throw new Error("No pudimos preparar la imagen del informe.");
          context.fillStyle="#ffffff"; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(bitmap,0,0,canvas.width,canvas.height);
          const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error("No pudimos preparar la imagen.")),"image/png"));
          image = new Uint8Array(await blob.arrayBuffer());
        } finally { bitmap.close(); }
      }
      const chosen=selectReportHits(result.results,selected);
      const {images,missing}=await reportImages(chosen);
      const bytes = await createFeasibilityReport({ result, selectedIds:selected, resultImages:images, status: "all", proposal: { name, coverage: Object.entries(coverage).map(([n,text])=>({nice_class:Number(n),text})), grouped }, image, imageType:"png", studioLogo, client, author, recommendation, explanation, includeAppendix });
      if (generation.current !== reportGeneration) return;
      const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:"application/pdf"}));
      const link=document.createElement("a"); link.href=url; link.download=`prefactibilidad-${(name || "marca-figurativa").replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ-]/g,"-").slice(0,80)}.pdf`; link.click(); if(missing.length) setReportError(`El informe se descargó, pero no pudimos cargar ${missing.length} imágenes. Sus marcas aparecen identificadas sin imagen. Puedes reintentar la descarga.`); setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch (e) { if (generation.current === reportGeneration) setReportError(e instanceof Error ? e.message : "No pudimos generar el informe. Tus resultados se conservan; intenta descargarlo nuevamente."); }
    finally { setReportBusy(false); }
  }
  const filteredHits = [...(result?.results ?? [])].sort((a,b)=>b.score-a.score);
  function toggleSelection(id:string) {setSelected(current=>current.includes(id) ? current.filter(value=>value!==id) : [...current,id]);}
  const groups = grouped && result?.groups.length ? (() => {
    const available = new Set(filteredHits.map(hit => Number(hit.applicationId)));
    const used = new Set<number>();
    const normalized = result.groups.flatMap(group => {
      const member_ids = group.member_ids.filter(id => available.has(id) && !used.has(id));
      member_ids.forEach(id => used.add(id));
      return member_ids.length ? [{ ...group, member_ids, representative_id: member_ids.includes(group.representative_id) ? group.representative_id : member_ids[0] }] : [];
    });
    for (const id of available) if (!used.has(id)) normalized.push({ representative_id: id, member_ids: [id] });
    return normalized;
  })() : null;
  const totalPages=Math.max(1,Math.ceil((groups?.length ?? filteredHits.length)/pageSize));
  const pageStart=(page-1)*pageSize;
  return <section className="feasibility-real">
    <section className="feasibility-builder"><header className="feasibility-intro"><div><span className="buho-overline">ANÁLISIS PREVIO A LA SOLICITUD</span><h2>Revisa una marca antes de registrarla</h2><p>Prepara el nombre, la imagen y las clases Niza que deseas revisar.</p></div></header>
    <form onSubmit={search} className="feasibility-search-layout">
      <div className="feasibility-input-area"><div className="feasibility-searchbar"><div className="feasibility-mode feasibility-real-mode">Por similitud</div><label className="feasibility-name"><MagnifyingGlass size={23} aria-hidden /><input aria-label="Nombre de la marca" value={name} maxLength={500} onChange={e => { invalidate(); setName(e.target.value); }} placeholder="Nombre de la marca" /></label></div>
        <div className="feasibility-options"><div className="feasibility-class-picker"><label htmlFor="proposal-class">Clases Niza <span>Opcional · puedes agregar varias</span></label><select id="proposal-class" value="" onChange={e => { const n=e.target.value; if(n) {invalidate();setCoverage(c => ({...c,[n]:""}));} }}><option value="">Agregar una clase por número o significado…</option>{NICE_CLASSES.map(c => <option key={c.number} value={c.number} disabled={String(c.number) in coverage}>{c.number} · {c.meaning}</option>)}</select></div><div className="feasibility-class-tags">{Object.keys(coverage).map(n => <button type="button" key={n} aria-label={`Quitar clase ${n}`} onClick={() => {invalidate();setCoverage(c => Object.fromEntries(Object.entries(c).filter(([key]) => key !== n)));}}>{n} <X size={14}/></button>)}</div></div>
        <button className="feasibility-submit" type="submit" disabled={busy || !states.length || (!name.trim() && !file)}><Sparkle size={22} />{busy ? "Buscando similitudes…" : "Buscar"}</button>
      </div>
      <div className="feasibility-logo-picker"><input ref={fileInput} className="buho-sr-only" aria-label="Imagen de la marca" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { invalidate(); const candidate=e.target.files?.[0] ?? null; if(candidate && candidate.size > 8*1024*1024) {chooseFile(null);setError("La imagen debe pesar hasta 8 MiB.");e.target.value="";} else chooseFile(candidate); }} /><button data-no-zoom className={`feasibility-upload ${preview ? 'has-image' : ''}`} type="button" onClick={() => fileInput.current?.click()}>{preview ? <Image unoptimized src={preview} alt="Imagen de la marca propuesta" width={158} height={112}/> : <UploadSimple size={36} aria-hidden/>}<span>{file ? "Cambiar logo" : "Subir logo"}</span></button>{file && <button type="button" className="feasibility-remove-x" aria-label="Quitar imagen" onClick={() => {invalidate();chooseFile(null);if(fileInput.current)fileInput.current.value="";}}><X size={18}/></button>}<small>JPEG, PNG o WebP · hasta 8 MiB</small></div>
      <div className="feasibility-pre-filters"><fieldset><legend>Estados que quieres consultar</legend><div className="feasibility-state-chips">{(["registered","pending","other"] as const).map(state=><button type="button" key={state} aria-pressed={states.includes(state)} onClick={()=>{invalidate();setStates(current=>current.includes(state) ? current.filter(value=>value!==state) : [...current,state]);}}>{FEASIBILITY_STATUS_LABELS[state]}</button>)}<button type="button" aria-pressed={states.length===3} onClick={()=>{invalidate();setStates(["registered","pending","other"]);}}>Todos los estados</button></div>{!states.length && <p role="status">Selecciona al menos un estado para buscar.</p>}</fieldset><label className="feasibility-minimum"><span>Similitud mínima</span><div><button type="button" aria-label="Reducir similitud mínima 5%" disabled={minimum===0} onClick={()=>{invalidate();setMinimum(value=>Math.max(0,value-5));}}>−</button><input type="range" aria-label="Similitud mínima" min={0} max={100} step={5} value={minimum} onChange={e=>{invalidate();setMinimum(Number(e.target.value));}}/><button type="button" aria-label="Aumentar similitud mínima 5%" disabled={minimum===100} onClick={()=>{invalidate();setMinimum(value=>Math.min(100,value+5));}}>+</button><output>{minimum}%</output></div></label></div>
      <details className="feasibility-extra"><summary>Coberturas y opciones de búsqueda</summary><p>Describe los productos o servicios para comparar también su cobertura.</p>{!Object.keys(coverage).length && <p>Agrega una clase para especificar su cobertura.</p>}{Object.entries(coverage).map(([n,value]) => <label key={n}>Clase {n}<textarea value={value} maxLength={6000} placeholder="Productos o servicios que quieres proteger (opcional)" onChange={e => {invalidate();setCoverage(c => ({...c,[n]:e.target.value}));}}/></label>)}<label className="similarity-checkbox"><input type="checkbox" checked={grouped} onChange={e => {invalidate();setGrouped(e.target.checked);}}/>Agrupar marcas similares del mismo titular</label></details>
    </form></section>
    {busy && <p role="status">Consultando marcas y sus estados. La búsqueda puede tardar unos segundos.</p>}{error && <p role="alert" className="similarity-error">{error}</p>}
    {result && <section className="similarity-search-results"><h3>{result.query.name === "Marca figurativa sin denominación" ? "Resultados de la imagen propuesta" : `Resultados para ${result.query.name}`}</h3><p>{result.results.length} solicitudes obtenidas · INAPI / DeQuiénEs · {new Date(result.fetchedAt).toLocaleString("es-CL")}</p><p>El orden refleja semejanza, no probabilidad de registro ni de conflicto.</p>
      <div className="feasibility-result-toolbar"><span>{selected.length ? `${selected.length} ${selected.length === 1 ? "marca seleccionada" : "marcas seleccionadas"} para el informe` : "Sin selección: se incluirán hasta 5 marcas con mayor índice."}</span>{!!selected.length && <button type="button" onClick={()=>setSelected([])}>Limpiar selección</button>}<button type="button" className="buho-primary" disabled={reportBusy} onClick={()=>void downloadReport()}>{reportBusy ? "Preparando informe e imágenes…" : "Descargar informe PDF"}</button></div>
      <p className="watch-help">Haz clic en las tarjetas que quieras incluir: quedarán en celeste. Puedes ampliar cada imagen sin cambiar la selección.</p>
      <section className="feasibility-report-options" aria-label="Recomendación del informe">
        <label className="feasibility-recommendation">Recomendación para el cliente<select value={recommendation} disabled={reportBusy} onChange={e=>{setRecommendation(e.target.value as ReportRecommendation);setExplanation("");}}>{Object.entries(REPORT_RECOMMENDATIONS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <p>El informe termina con esta recomendación. Puedes ajustarla según tu revisión de los antecedentes.</p>
        <details><summary>Personalizar informe para el cliente</summary>
          <label>Nombre del cliente (opcional)<input value={client} maxLength={160} disabled={reportBusy} onChange={e=>setClient(e.target.value)} placeholder="Persona o empresa"/></label>
          <label>Preparado por (opcional)<input value={author} maxLength={160} disabled={reportBusy} onChange={e=>setAuthor(e.target.value)} placeholder="Abogado o estudio"/></label>
          <label className="feasibility-report-explanation">Motivo de la recomendación<textarea value={explanation} maxLength={1600} rows={3} disabled={reportBusy} onChange={e=>setExplanation(e.target.value)} placeholder={reportRecommendation(result,recommendation).explanation}/><span>Si lo dejas vacío, usaremos la explicación sugerida arriba.</span></label>
          <label className="feasibility-report-appendix"><input type="checkbox" checked={includeAppendix} disabled={reportBusy} onChange={e=>setIncludeAppendix(e.target.checked)}/>Agregar un anexo con todos los resultados del filtro</label>
          <p>Formato breve, logo del estudio y lenguaje simple. Los antecedentes de las marcas incluidas se conservan como respaldo adjunto. No se realiza una nueva búsqueda ni se utiliza IA generativa.</p>
        </details>
      </section>
      {reportError && <p role="alert" className="similarity-error">{reportError} Puedes reintentar la descarga; los resultados no se han perdido.</p>}
      {!result.results.length && <p>No encontramos coincidencias con los estados y el mínimo de similitud elegidos. Puedes ampliar los estados o reducir el porcentaje y volver a buscar.</p>}
      {groups ? groups.slice(pageStart,pageStart+pageSize).map(group => { const hits = filteredHits.filter(h => group.member_ids.includes(Number(h.applicationId))); const representative = hits.find(h => Number(h.applicationId) === group.representative_id) ?? hits[0]; return representative ? <section key={group.representative_id}><SimilarityCard selected={selected.includes(representative.applicationId)} onSelect={()=>toggleSelection(representative.applicationId)} hit={representative} queryName={name || "la propuesta"} queryImage={preview || result.query.image} /><details><summary>Ver las {hits.length} solicitudes del grupo</summary>{hits.map(hit => <SimilarityCard selected={selected.includes(hit.applicationId)} onSelect={()=>toggleSelection(hit.applicationId)} key={hit.applicationId} hit={hit} />)}</details></section> : null; }) : filteredHits.slice(pageStart,pageStart+pageSize).map((hit,i) => <SimilarityCard selected={selected.includes(hit.applicationId)} onSelect={()=>toggleSelection(hit.applicationId)} key={hit.applicationId} hit={hit} position={pageStart+i+1} queryName={name || "la propuesta"} queryImage={preview || result.query.image} />)}
      {!!filteredHits.length && <nav className="feasibility-pagination" aria-label="Páginas de resultados"><label>Mostrar <select aria-label="Resultados por página" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,25,50,100].map(size=><option key={size} value={size}>{size}</option>)}</select> {groups ? "grupos" : "resultados"} por página</label><div><button type="button" disabled={page===1} onClick={()=>setPage(value=>value-1)}>← Anterior</button><span>Página {page} de {totalPages}</span><button type="button" disabled={page===totalPages} onClick={()=>setPage(value=>value+1)}>Siguiente →</button></div></nav>}
      <p className="watch-help">Se filtra sobre los {result.searchScope?.retrieved ?? result.results.length} candidatos recuperados por la fuente (máximo {result.searchScope?.limit ?? 50}); no es una revisión de toda su base.</p>
      {!!result.warnings.length && <details><summary>Observaciones de la búsqueda</summary><ul>{result.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    </section>}
  </section>;
}
