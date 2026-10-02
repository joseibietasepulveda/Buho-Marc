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
import { TEXT_MATCH_MODES, type TextMatchMode } from "@/lib/text-search";
import "./ux-october.css";
import { ReportProfileEditor, ReportProfileLauncher } from "./report-profile-editor";
import { type SavedReportProfile } from "@/lib/report-profile";
import { deterministicConclusion, type ConclusionInput, type ReportConclusion } from "@/lib/feasibility-conclusion";

async function fetchReportProfile(signal?: AbortSignal):Promise<SavedReportProfile> {
  const response=await fetch("/api/report-profile",{signal}); const value=await response.json();
  if(!response.ok)throw new Error(value.message || "No pudimos cargar la información del estudio.");
  return value;
}
export function FeasibilityReview() {
  const [name, setName] = useState(""), [file, setFile] = useState<File | null>(null), [coverage, setCoverage] = useState<Record<string, string>>({});
  const [grouped, setGrouped] = useState(true), [result, setResult] = useState<SimilarityResult | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [page, setPage] = useState(1), [pageSize,setPageSize] = useState(10);
  const [states,setStates] = useState<string[]>(["registered","pending"]), [minimum,setMinimum] = useState(0), [selected,setSelected] = useState<string[]>([]), [reportBusy, setReportBusy] = useState(false), [reportError, setReportError] = useState("");
  const [matchMode, setMatchMode] = useState<TextMatchMode>("similar");
  const [dates, setDates] = useState({ filed_after: "", published_after: "", registered_after: "" });
  const [visualModel, setVisualModel] = useState("base"), [labelDescription, setLabelDescription] = useState("");
  const [holderName, setHolderName] = useState(""), [holderRut, setHolderRut] = useState(""), [excludeHolder, setExcludeHolder] = useState(false);
  const [client, setClient] = useState(""), [author, setAuthor] = useState("");
  const [recommendation, setRecommendation] = useState<ReportRecommendation | "auto">("auto"), [explanation, setExplanation] = useState(""), [includeAppendix, setIncludeAppendix] = useState(false);
  const [profile, setProfile] = useState<SavedReportProfile | null>(null), [profileLoading, setProfileLoading] = useState(true), [profileError, setProfileError] = useState(""), [profileOpen, setProfileOpen] = useState(false);
  const [conclusion, setConclusion] = useState<ReportConclusion | null>(null);
  const reportEpoch = useRef(0), conclusionCache = useRef<{ key: string; value: ReportConclusion } | null>(null);
  async function loadProfile(signal?: AbortSignal) {
    setProfileLoading(true); setProfileError("");
    try {
      const value = await fetchReportProfile(signal);
      setProfile(value); return value as SavedReportProfile;
    } catch (cause) { if (!signal?.aborted) setProfileError(cause instanceof Error ? cause.message : "No pudimos cargar la información del estudio."); throw cause; }
    finally { if (!signal?.aborted) setProfileLoading(false); }
  }
  useEffect(()=>{
    const controller=new AbortController();
    void fetchReportProfile(controller.signal).then(value=>{if(!controller.signal.aborted)setProfile(value);}).catch(cause=>{if(!controller.signal.aborted)setProfileError(cause instanceof Error ? cause.message : "No pudimos cargar los datos del estudio.");}).finally(()=>{if(!controller.signal.aborted)setProfileLoading(false);});
    return ()=>controller.abort();
  },[]);
  function invalidateReport() { reportEpoch.current++; conclusionCache.current=null; setConclusion(null); setReportError(""); }
  function proposalQuery() {
    return { name, coverage: Object.entries(coverage).map(([nice_class,text])=>({nice_class:Number(nice_class),text})), limit:100, grouped, states:states as ("registered"|"pending"|"other")[], minSimilarity:minimum/100, matchMode, ...Object.fromEntries(Object.entries(dates).filter(([,value])=>value)), visual_model:visualModel as "base"|"contrastive4k", label_description:labelDescription || undefined, holders:holderName || holderRut ? [{name:holderName || undefined,rut:holderRut || undefined}] : undefined, exclude_same_holder:excludeHolder && Boolean(holderName || holderRut) };
  }
  const [preview, setPreview] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function chooseFile(value: File | null) { setFile(value); setPreview(value ? URL.createObjectURL(value) : ""); }
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => () => request.current?.abort(), []);
  function invalidate() { invalidateReport(); generation.current++; request.current?.abort(); setBusy(false); setResult(null); setError(""); setPage(1); setSelected([]); setReportError(""); setRecommendation("auto"); setExplanation(""); }
  async function search(event: FormEvent) {
    event.preventDefault(); invalidate(); const ownGeneration = generation.current; const controller = new AbortController(); request.current = controller; setBusy(true);
    try {
      const query = proposalQuery();
      const form = new FormData(); form.set("query", JSON.stringify(query)); if (file) form.set("image", file);
      const response = await fetch("/api/similarity", { method: "POST", body: form, signal: controller.signal }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No se pudo completar la búsqueda.");
      if (generation.current === ownGeneration) setResult(payload);
    } catch (e) { if (!controller.signal.aborted && generation.current === ownGeneration) setError(e instanceof Error ? e.message : "No se pudo completar la búsqueda."); }
    finally { if (generation.current === ownGeneration) setBusy(false); }
  }
  async function resolveConclusion(saved: SavedReportProfile): Promise<ReportConclusion> {
    if (!result) throw new Error("Realiza una búsqueda antes de preparar el informe.");
    const input: ConclusionInput = { proposal:proposalQuery(), result, selectedIds:selected, recommendation:recommendation === "auto" ? undefined : recommendation, client, author:author || saved.profile.lawyerName };
    if (explanation.trim()) { const base=deterministicConclusion(input); return {...base,source:"author",paragraphs:explanation.trim().split(/\n\s*\n/)}; }
    const key=JSON.stringify({input,profile:saved.version});
    if (conclusionCache.current?.key===key) return conclusionCache.current.value;
    let value: ReportConclusion;
    try {
      let response=await fetch("/api/feasibility/conclusions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(60000)});
      let payload=await response.json();
      if (!response.ok) throw new Error("No pudimos preparar la conclusión asistida.");
      const deadline=Date.now()+60000;
      while(response.status===202 && payload.pending && Date.now()<deadline) {
        await new Promise(resolve=>setTimeout(resolve,1500));
        response=await fetch(`/api/feasibility/conclusions/${payload.pending}`,{signal:AbortSignal.timeout(15000)});
        const polled=await response.json();
        if(!response.ok)throw new Error("No pudimos recuperar la conclusión.");
        payload={...polled,pending:payload.pending};
      }
      if (!payload.conclusion) throw new Error("La conclusión sigue pendiente.");
      value=payload.conclusion;
    } catch { value={...deterministicConclusion(input),reason:"provider_error"}; }
    conclusionCache.current={key,value}; return value;
  }
  async function previewConclusion() {
    const epoch=reportEpoch.current; setReportBusy(true); setReportError("");
    try { const saved=profile ?? await loadProfile(); const value=await resolveConclusion(saved); if(epoch===reportEpoch.current)setConclusion(value); }
    catch(cause){if(epoch===reportEpoch.current)setReportError(cause instanceof Error ? cause.message : "No pudimos preparar la conclusión.");}
    finally {setReportBusy(false);}
  }
  async function downloadReport(format: "pdf" | "docx") {
    if (!result) return;
    const reportGeneration = generation.current, epoch=reportEpoch.current;
    setReportBusy(true); setReportError("");
    try {
      const makeReport = format === "pdf" ? (await import("@/lib/feasibility-report")).createFeasibilityReport : (await import("@/lib/feasibility-docx")).createFeasibilityDocx;
      const saved=profile ?? await loadProfile();
      const prepared=await resolveConclusion(saved);
      if(epoch!==reportEpoch.current)return;
      setConclusion(prepared);
      const studioLogo=saved.profile.logo ? Uint8Array.from(atob(saved.profile.logo.split(",")[1]),char=>char.charCodeAt(0)) : undefined;
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
      const report = await makeReport({ result, selectedIds:selected, resultImages:images, status: "all", proposal: { name, coverage: Object.entries(coverage).map(([n,text])=>({nice_class:Number(n),text})), grouped }, image, imageType:"png", studioLogo, studioProfile:saved.profile, conclusion:prepared, client, author:author || saved.profile.lawyerName, recommendation: recommendation === "auto" ? undefined : recommendation, explanation, includeAppendix });
      if (generation.current !== reportGeneration || epoch!==reportEpoch.current) return;
      const blob = report instanceof Blob ? report : new Blob([new Uint8Array(report)],{type:"application/pdf"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a"); link.href=url; link.download=`factibilidad-${(name || "marca-figurativa").replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ-]/g,"-").slice(0,80)}.${format}`; link.click(); if(missing.length) setReportError(`El informe se descargó, pero no pudimos cargar ${missing.length} imágenes. Sus marcas aparecen identificadas sin imagen. Puedes reintentar la descarga.`); setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch (e) { if (generation.current === reportGeneration) setReportError(e instanceof Error ? e.message : "No pudimos generar el informe. Tus resultados se conservan; intenta descargarlo nuevamente."); }
    finally { setReportBusy(false); }
  }
  const filteredHits = [...(result?.results ?? [])].sort((a,b)=>b.score-a.score);
  function toggleSelection(id:string) {invalidateReport();setSelected(current=>current.includes(id) ? current.filter(value=>value!==id) : [...current,id]);}
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
    <ReportProfileLauncher saved={profile} loading={profileLoading || reportBusy} error={profileError} onOpen={()=>{void loadProfile().then(()=>setProfileOpen(true)).catch(()=>{});}}/>
    {profileOpen && profile && <ReportProfileEditor saved={profile} onClose={()=>setProfileOpen(false)} onSaved={value=>{setProfile(value);invalidateReport();}}/>}
    <form onSubmit={search} className="feasibility-search-layout">
      <div className="feasibility-search-controls"><label className="feasibility-group-toggle"><input type="checkbox" checked={grouped} onChange={e => { invalidate(); setGrouped(e.target.checked); }} />Agrupar marcas similares del mismo titular</label><label>Buscar por<select aria-label="Coincidencia del nombre de la marca" value={matchMode} onChange={e => { invalidate(); setMatchMode(e.target.value as TextMatchMode); }}>{Object.entries(TEXT_MATCH_MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="feasibility-input-area"><div className="feasibility-searchbar"><label className="feasibility-name"><MagnifyingGlass size={23} aria-hidden /><input aria-label="Nombre de la marca" value={name} maxLength={500} onChange={e => { invalidate(); setName(e.target.value); }} placeholder="Nombre de la marca" /></label></div>
        <div className="feasibility-options"><div className="feasibility-class-picker"><label htmlFor="proposal-class">Clases Niza <span>Opcional · puedes agregar varias</span></label><select id="proposal-class" value="" onChange={e => { const n=e.target.value; if(n) {invalidate();setCoverage(c => ({...c,[n]:""}));} }}><option value="">Agregar una clase por número o significado…</option>{NICE_CLASSES.map(c => <option key={c.number} value={c.number} disabled={String(c.number) in coverage}>{c.number} · {c.meaning}</option>)}</select></div><div className="feasibility-class-tags">{Object.keys(coverage).map(n => <button type="button" key={n} aria-label={`Quitar clase ${n}`} onClick={() => {invalidate();setCoverage(c => Object.fromEntries(Object.entries(c).filter(([key]) => key !== n)));}}>{n} <X size={14}/></button>)}</div></div>
        <button className="feasibility-submit" type="submit" disabled={busy || !states.length || (!name.trim() && !file)}><Sparkle size={22} />{busy ? "Buscando similitudes…" : "Buscar"}</button>
      </div>
      <div className="feasibility-logo-picker"><input ref={fileInput} className="buho-sr-only" aria-label="Imagen de la marca" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { invalidate(); const candidate=e.target.files?.[0] ?? null; if(candidate && candidate.size > 8*1024*1024) {chooseFile(null);setError("La imagen debe pesar hasta 8 MiB.");e.target.value="";} else chooseFile(candidate); }} /><button data-no-zoom className={`feasibility-upload ${preview ? 'has-image' : ''}`} type="button" onClick={() => fileInput.current?.click()}>{preview ? <Image unoptimized src={preview} alt="Imagen de la marca propuesta" width={158} height={112}/> : <UploadSimple size={36} aria-hidden/>}<span>{file ? "Cambiar logo" : "Subir logo"}</span></button>{file && <button type="button" className="feasibility-remove-x" aria-label="Quitar imagen" onClick={() => {invalidate();chooseFile(null);if(fileInput.current)fileInput.current.value="";}}><X size={18}/></button>}<small>JPEG, PNG o WebP · hasta 8 MiB</small></div>
      <div className="feasibility-date-filters">{([["filed_after", "Solicitud desde"], ["published_after", "Publicación DO desde"], ["registered_after", "Registro desde"]] as const).map(([key, label]) => <label key={key}>{label}<input type="date" value={dates[key]} onChange={e => { invalidate(); setDates(current => ({ ...current, [key]: e.target.value })); }} /></label>)}</div><div className="feasibility-pre-filters"><fieldset><legend>Estados que quieres consultar</legend><div className="feasibility-state-chips">{(["registered","pending","other"] as const).map(state=><button type="button" key={state} aria-pressed={states.includes(state)} onClick={()=>{invalidate();setStates(current=>current.includes(state) ? current.filter(value=>value!==state) : [...current,state]);}}>{FEASIBILITY_STATUS_LABELS[state]}</button>)}<button type="button" aria-pressed={states.length===3} onClick={()=>{invalidate();setStates(["registered","pending","other"]);}}>Todos los estados</button></div>{!states.length && <p role="status">Selecciona al menos un estado para buscar.</p>}</fieldset><label className="feasibility-minimum"><span>Similitud mínima</span><div><button type="button" aria-label="Reducir similitud mínima 5%" disabled={minimum===0} onClick={()=>{invalidate();setMinimum(value=>Math.max(0,value-5));}}>−</button><input type="range" aria-label="Similitud mínima" min={0} max={100} step={5} value={minimum} onChange={e=>{invalidate();setMinimum(Number(e.target.value));}}/><button type="button" aria-label="Aumentar similitud mínima 5%" disabled={minimum===100} onClick={()=>{invalidate();setMinimum(value=>Math.min(100,value+5));}}>+</button><output>{minimum}%</output></div></label></div>
      <details className="feasibility-extra"><summary>Coberturas y opciones de búsqueda</summary><p>Describe los productos o servicios para comparar también su cobertura.</p>{!Object.keys(coverage).length && <p>Agrega una clase para especificar su cobertura.</p>}{Object.entries(coverage).map(([n,value]) => <label key={n}>Clase {n}<textarea value={value} maxLength={6000} placeholder="Productos o servicios que quieres proteger (opcional)" onChange={e => {invalidate();setCoverage(c => ({...c,[n]:e.target.value}));}}/></label>)}<div className="feasibility-advanced-grid"><label>Titular de la propuesta<input value={holderName} maxLength={500} placeholder="Nombre o razón social (opcional)" onChange={e => { invalidate(); setHolderName(e.target.value); }} /></label><label>RUT del titular<input value={holderRut} maxLength={30} placeholder="RUT (opcional)" onChange={e => { invalidate(); setHolderRut(e.target.value); }} /></label><label>Análisis de imagen<select value={visualModel} onChange={e => { invalidate(); setVisualModel(e.target.value); }}><option value="base">Modelo estándar</option><option value="contrastive4k">Modelo alternativo · en evaluación</option></select></label></div><label>Descripción de la etiqueta<textarea value={labelDescription} maxLength={6000} placeholder="Elementos de la imagen que quieres comparar (opcional)" onChange={e => { invalidate(); setLabelDescription(e.target.value); }} /></label><label className="similarity-checkbox"><input type="checkbox" checked={excludeHolder} disabled={!holderName && !holderRut} onChange={e => { invalidate(); setExcludeHolder(e.target.checked); }} />Excluir antecedentes del mismo titular</label><p>Las fechas delimitan la consulta en la fuente. Las clases orientan la búsqueda. Los estados, el índice mínimo y los modos textuales se aplican a los candidatos recuperados.</p></details>
    </form></section>
    {busy && <p role="status">Consultando marcas y sus estados. La búsqueda puede tardar unos segundos.</p>}{error && <p role="alert" className="similarity-error">{error}</p>}
    {result && <section className="similarity-search-results"><h3>{result.query.name === "Marca figurativa sin denominación" ? "Resultados de la imagen propuesta" : `Resultados para ${result.query.name}`}</h3><p>{result.results.length} solicitudes obtenidas · INAPI / DeQuiénEs · {new Date(result.fetchedAt).toLocaleString("es-CL")}</p><p>El orden refleja semejanza, no probabilidad de registro ni de conflicto.</p>
      <div className="feasibility-result-toolbar"><span>{selected.length ? `${selected.length} ${selected.length === 1 ? "marca seleccionada" : "marcas seleccionadas"} para el informe` : "Sin selección: se incluirán hasta 5 marcas con mayor índice."}</span>{!!selected.length && <button type="button" onClick={()=>{invalidateReport();setSelected([]);}}>Limpiar selección</button>}<button type="button" className="buho-primary" disabled={reportBusy} onClick={()=>void downloadReport("pdf")}>{reportBusy ? "Preparando informe e imágenes…" : "Descargar PDF"}</button><button type="button" disabled={reportBusy} onClick={()=>void downloadReport("docx")}>Descargar Word editable</button></div>
      <p className="watch-help">Haz clic en las tarjetas que quieras incluir: quedarán en celeste. Puedes ampliar cada imagen sin cambiar la selección.</p>
      <section className="feasibility-report-options" aria-label="Recomendación del informe">
        <label className="feasibility-recommendation">Recomendación para el cliente<select value={recommendation} disabled={reportBusy} onChange={e=>{invalidateReport();setRecommendation(e.target.value as ReportRecommendation | "auto");setExplanation("");}}><option value="auto">Sugerida según los resultados</option>{Object.entries(REPORT_RECOMMENDATIONS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <p><strong>Sugerencia: {reportRecommendation(result, undefined, "", Object.keys(coverage).map(Number)).title}.</strong> Considera toda la búsqueda, aunque selecciones algunas marcas para mostrar en detalle. Puedes cambiarla tras revisar los antecedentes.</p>
        <div className="feasibility-conclusion-actions"><button type="button" disabled={reportBusy} onClick={()=>void previewConclusion()}>{reportBusy ? "Preparando…" : conclusion ? "Revisar conclusión" : "Preparar conclusión"}</button><span>Puedes leerla antes de descargar. PDF y Word usan la misma conclusión.</span></div>
        {conclusion && <div className="feasibility-conclusion-preview" role="status"><span>{conclusion.source==="openrouter" ? "Conclusión asistida" : conclusion.source==="author" ? "Texto del abogado" : "Conclusión basada en los resultados"}</span><h4>{conclusion.title}</h4>{conclusion.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}{conclusion.source==="deterministic" && conclusion.reason && <small>{conclusion.reason==="not_configured" ? "La asistencia aún no está configurada. Puedes descargar el informe con esta conclusión." : "La asistencia no estuvo disponible. El informe conserva una conclusión basada en los antecedentes."}</small>}</div>}
        <details><summary>Personalizar informe para el cliente</summary>
          <label>Nombre del cliente (opcional)<input value={client} maxLength={160} disabled={reportBusy} onChange={e=>{invalidateReport();setClient(e.target.value);}} placeholder="Persona o empresa"/></label>
          <label>Preparado por (opcional)<input value={author} maxLength={160} disabled={reportBusy} onChange={e=>{invalidateReport();setAuthor(e.target.value);}} placeholder={profile?.profile.lawyerName || "Abogado o estudio"}/></label>
          <label className="feasibility-report-explanation">Motivo de la recomendación<textarea value={explanation} maxLength={1600} rows={3} disabled={reportBusy} onChange={e=>{invalidateReport();setExplanation(e.target.value);}} placeholder={reportRecommendation(result,recommendation === "auto" ? undefined : recommendation,"",Object.keys(coverage).map(Number)).explanation}/><span>Si lo dejas vacío, prepararemos la conclusión con los antecedentes de la búsqueda.</span></label>
          <label className="feasibility-report-appendix"><input type="checkbox" checked={includeAppendix} disabled={reportBusy} onChange={e=>setIncludeAppendix(e.target.checked)}/>Agregar un anexo con todos los resultados del filtro</label>
          <p>Datos de tu estudio, coberturas completas y conclusión al final. La conclusión asistida utiliza los antecedentes de esta búsqueda. Si no está disponible, se incluye una explicación basada en los resultados.</p>
        </details>
      </section>
      {reportError && <p role="alert" className="similarity-error">{reportError} Puedes reintentar la descarga; los resultados no se han perdido.</p>}
      {!result.results.length && <p>No encontramos coincidencias con los estados y el mínimo de similitud elegidos. Puedes ampliar los estados o reducir el porcentaje y volver a buscar.</p>}
      {groups ? groups.slice(pageStart,pageStart+pageSize).map(group => { const hits = filteredHits.filter(h => group.member_ids.includes(Number(h.applicationId))); const representative = hits.find(h => Number(h.applicationId) === group.representative_id) ?? hits[0]; return representative ? <section key={group.representative_id}><SimilarityCard selected={selected.includes(representative.applicationId)} onSelect={()=>toggleSelection(representative.applicationId)} hit={representative} queryName={name || "la propuesta"} queryImage={preview || result.query.image} /><details><summary>Ver las {hits.length} solicitudes del grupo</summary>{hits.map(hit => <SimilarityCard selected={selected.includes(hit.applicationId)} onSelect={()=>toggleSelection(hit.applicationId)} key={hit.applicationId} hit={hit} />)}</details></section> : null; }) : filteredHits.slice(pageStart,pageStart+pageSize).map((hit,i) => <SimilarityCard selected={selected.includes(hit.applicationId)} onSelect={()=>toggleSelection(hit.applicationId)} key={hit.applicationId} hit={hit} position={pageStart+i+1} queryName={name || "la propuesta"} queryImage={preview || result.query.image} />)}
      {!!filteredHits.length && <nav className="feasibility-pagination" aria-label="Páginas de resultados"><label>Mostrar <select aria-label="Resultados por página" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,25,50,100].map(size=><option key={size} value={size}>{size}</option>)}</select> {groups ? "grupos" : "resultados"} por página</label><div><button type="button" disabled={page===1} onClick={()=>setPage(value=>value-1)}>← Anterior</button><span>Página {page} de {totalPages}</span><button type="button" disabled={page===totalPages} onClick={()=>setPage(value=>value+1)}>Siguiente →</button></div></nav>}
      <p className="watch-help">Se filtra sobre los {result.searchScope?.retrieved ?? result.results.length} candidatos recuperados por la fuente (máximo {result.searchScope?.limit ?? 50}); no es una revisión de toda su base. Los modos Contiene, palabra completa, empieza, termina y exacto se aplican sobre ese lote.</p>
      {!!result.warnings.length && <details><summary>Observaciones de la búsqueda</summary><ul>{result.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    </section>}
  </section>;
}
