"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { MagnifyingGlass, CaretRight, UploadSimple, X, CaretDown } from "@phosphor-icons/react";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { FEASIBILITY_STATUS_LABELS } from "@/lib/feasibility-policy";
import { REPORT_RECOMMENDATIONS, reportRecommendation, type ReportRecommendation } from "@/lib/feasibility-recommendation";
import type { SimilarityHit, SimilarityResult } from "@/lib/similarity-contract";
import { SimilarityImage, SimilarityStatusNotice } from "./similarity-results";
import { TrademarkComparison } from "./trademark-comparison";
import { MatchHistory } from "./match-history";
import { displayWorkDate } from "@/lib/work-priorities";

import { selectReportHits } from "@/lib/report-selection";
import { reportImages } from "./report-images";
import "./similarity.css";
import { ReviewDialog } from "./review-dialog";
import { foldText, TEXT_MATCH_MODES, type TextMatchMode } from "@/lib/text-search";
import "./ux-october.css";
import { ReportProfileEditor, ReportProfileLauncher } from "./report-profile-editor";
import { type SavedReportProfile } from "@/lib/report-profile";
import { deterministicConclusion, type ConclusionInput, type ReportConclusion } from "@/lib/feasibility-conclusion";

async function fetchReportProfile(signal?: AbortSignal):Promise<SavedReportProfile> {
  const response=await fetch("/api/report-profile",{signal}); const value=await response.json();
  if(!response.ok)throw new Error(value.message || "No pudimos cargar la información del estudio.");
  return value;
}
export function FeasibilityReview({onStepChange}:{onStepChange?:(step:number)=>void}) {
  const [name, setName] = useState(""), [file, setFile] = useState<File | null>(null), [coverage, setCoverage] = useState<Record<string, string>>({});
  const [grouped, setGrouped] = useState(true), [result, setResult] = useState<SimilarityResult | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [page, setPage] = useState(1), [pageSize,setPageSize] = useState(10);
  const [states,setStates] = useState<string[]>(["registered","pending"]), [minimum,setMinimum] = useState(0), [selected,setSelected] = useState<string[]>([]), [reportBusy, setReportBusy] = useState(false), [reportError, setReportError] = useState("");
  const [matchMode, setMatchMode] = useState<TextMatchMode>("similar");
  const [dates, setDates] = useState({ filed_after: "", published_after: "", registered_after: "" });
  const [labelDescription, setLabelDescription] = useState("");
  const [holderName, setHolderName] = useState(""), [holderRut, setHolderRut] = useState(""), [excludeHolder, setExcludeHolder] = useState(false);
  const [client, setClient] = useState(""), [author, setAuthor] = useState("");
  const [recommendation, setRecommendation] = useState<ReportRecommendation | "auto">("auto"), [explanation, setExplanation] = useState(""), [includeAppendix, setIncludeAppendix] = useState(false);
  const [profile, setProfile] = useState<SavedReportProfile | null>(null), [profileLoading, setProfileLoading] = useState(true), [profileError, setProfileError] = useState(""), [profileOpen, setProfileOpen] = useState(false);
  const [step,setCurrentStep]=useState(1),[resultSearch,setResultSearch]=useState(''),[sort,setSort]=useState('score'),[onlySelected,setOnlySelected]=useState(false);
  const workflowRef=useRef<HTMLElement>(null);
  useEffect(()=>onStepChange?.(step),[onStepChange,step]);
  function setStep(value:number){setCurrentStep(value);requestAnimationFrame(()=>workflowRef.current?.closest('.buho-workspace')?.scrollTo({top:0}));}
  const [format,setFormat]=useState<'pdf'|'docx'>('pdf'),[reviewed,setReviewed]=useState(false),[comparison,setComparison]=useState<SimilarityHit|null>(null),[expandedGroups,setExpandedGroups]=useState<string[]>([]);
  const [executed,setExecuted]=useState<{query:ReturnType<typeof proposalQuery>;file:File|null;image:string}|null>(null);
  useEffect(()=>()=>{if(executed?.image)URL.revokeObjectURL(executed.image);},[executed]);
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
  function invalidateReport() { setReviewed(false); reportEpoch.current++; conclusionCache.current=null; setConclusion(null); setReportError(""); }
  function proposalQuery() {
    return { name, coverage: Object.entries(coverage).map(([nice_class,text])=>({nice_class:Number(nice_class),text})), limit:100, grouped, states:states as ("registered"|"pending"|"other")[], minSimilarity:minimum/100, matchMode, ...Object.fromEntries(Object.entries(dates).filter(([,value])=>value)), visual_model:"base" as const, label_description:labelDescription || undefined, holders:holderName || holderRut ? [{name:holderName || undefined,rut:holderRut || undefined}] : undefined, exclude_same_holder:excludeHolder && Boolean(holderName || holderRut) };
  }
  const [preview, setPreview] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function chooseFile(value: File | null) { setFile(value); setPreview(value ? URL.createObjectURL(value) : ""); }
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => () => request.current?.abort(), []);
  function invalidate() { setError(''); }
  async function search(event: FormEvent) {
    event.preventDefault(); generation.current++; request.current?.abort();
    const ownGeneration=generation.current, controller=new AbortController();request.current=controller;setBusy(true);setError('');
    const query=proposalQuery(), searchedFile=file;
    try {
      const form=new FormData();form.set('query',JSON.stringify(query));if(searchedFile)form.set('image',searchedFile);
      const response=await fetch('/api/similarity',{method:'POST',body:form,signal:controller.signal}),payload=await response.json();
      if(!response.ok)throw new Error(payload.message||'No se pudo completar la búsqueda.');
      if(generation.current===ownGeneration){invalidateReport();setExecuted({query,file:searchedFile,image:searchedFile?URL.createObjectURL(searchedFile):''});setResult(payload);setSelected(payload.results.slice(0,5).map((hit:SimilarityHit)=>hit.applicationId));setRecommendation('auto');setExplanation('');setPage(1);setResultSearch('');setOnlySelected(false);setComparison(null);setExpandedGroups([]);setStep(2);}
    }catch(cause){if(!controller.signal.aborted&&generation.current===ownGeneration)setError(cause instanceof Error?cause.message:'No se pudo completar la búsqueda.');}
    finally{if(generation.current===ownGeneration)setBusy(false);}
  }
  async function resolveConclusion(saved: SavedReportProfile): Promise<ReportConclusion> {
    if (!result) throw new Error("Realiza una búsqueda antes de preparar el informe.");
    const input: ConclusionInput = { proposal:executed?.query ?? proposalQuery(), result, selectedIds:selected, recommendation:recommendation === "auto" ? undefined : recommendation, client, author:author || saved.profile.lawyerName };
    if (explanation.trim()) { const base=deterministicConclusion(input); return {...base,source:"author",paragraphs:explanation.trim().split(/\n\s*\n/)}; }
    const key=JSON.stringify({input,profile:saved.version});
    if (conclusionCache.current?.key===key) return conclusionCache.current.value;
    let value: ReportConclusion;
    try {
      let response=await fetch("/api/feasibility/conclusions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(60000)});
      let payload=await response.json();
      if (!response.ok) throw new Error("No pudimos preparar la conclusión asistida.");
      const pollingTimeout=AbortSignal.timeout(60000);
      for(let attempts=0;response.status===202 && payload.pending && attempts<40;attempts++) {
        await new Promise(resolve=>setTimeout(resolve,1500));
        response=await fetch(`/api/feasibility/conclusions/${payload.pending}`,{signal:AbortSignal.any([pollingTimeout,AbortSignal.timeout(15000)])});
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
    if (!result || !executed || !reviewed || (result.results.length>0&&!selected.length)) return;
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
      if (executed.file) {
        const bitmap = await createImageBitmap(executed.file);
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
      const report = await makeReport({ result, selectedIds:selected, resultImages:images, status: "all", proposal: { name:executed.query.name, coverage:executed.query.coverage, grouped:executed.query.grouped }, image, imageType:"png", studioLogo, studioProfile:saved.profile, conclusion:prepared, client, author:author || saved.profile.lawyerName, recommendation: recommendation === "auto" ? undefined : recommendation, explanation, includeAppendix });
      if (generation.current !== reportGeneration || epoch!==reportEpoch.current) return;
      const blob = report instanceof Blob ? report : new Blob([new Uint8Array(report)],{type:"application/pdf"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a"); link.href=url; link.download=`factibilidad-${(executed.query.name || "marca-figurativa").replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ-]/g,"-").slice(0,80)}.${format}`; link.click(); if(missing.length) setReportError(`El informe se descargó, pero no pudimos cargar ${missing.length} imágenes. Sus marcas aparecen identificadas sin imagen. Puedes reintentar la descarga.`); setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch (e) { if (generation.current === reportGeneration) setReportError(e instanceof Error ? e.message : "No pudimos generar el informe. Tus resultados se conservan; intenta descargarlo nuevamente."); }
    finally { setReportBusy(false); }
  }
  const filteredHits = [...(result?.results ?? [])].sort((a,b)=>b.score-a.score);
  function toggleSelection(id:string) {invalidateReport();setSelected(current=>current.includes(id) ? current.filter(value=>value!==id) : [...current,id]);}
  const groups = executed?.query.grouped && result?.groups.length ? (() => {
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
  const executedQuery = executed?.query;
  const reviewHits = filteredHits.filter(hit => (!resultSearch || foldText(`${hit.name} ${hit.applicationId} ${hit.holders.map(h=>h.name).join(' ')}`).includes(foldText(resultSearch))) && (!onlySelected || selected.includes(hit.applicationId)));
  if(sort==='name')reviewHits.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  if(sort==='filed')reviewHits.sort((a,b)=>(b.filedAt||'').localeCompare(a.filedAt||''));
  const groupById=new Map((groups??[]).flatMap(group=>group.member_ids.map(id=>[String(id),group] as const)));
  const units=reviewHits.filter(hit=>!groupById.has(hit.applicationId)||groupById.get(hit.applicationId)!.member_ids.length===1||reviewHits.find(member=>groupById.get(member.applicationId)===groupById.get(hit.applicationId))===hit);
  const totalPages=Math.max(1,Math.ceil(units.length/pageSize)), currentPage=Math.min(page,totalPages), pageStart=(currentPage-1)*pageSize;
  const pageUnits=units.slice(pageStart,pageStart+pageSize);
  const shown=pageUnits.flatMap(hit=>{const group=groupById.get(hit.applicationId);return group&&group.member_ids.length>1?reviewHits.filter(member=>group.member_ids.includes(Number(member.applicationId))):[hit];});
  const canPrepare=Boolean(result&&(!result.results.length||selected.length));
  function showComparison(hit:SimilarityHit){setComparison(hit);}
  function resultRow(hit:SimilarityHit){return <tr key={hit.applicationId} className={selected.includes(hit.applicationId)?'is-selected':''}><td><input type="checkbox" aria-label={`Incluir ${hit.name} en el informe`} checked={selected.includes(hit.applicationId)} onChange={()=>toggleSelection(hit.applicationId)}/></td><td className="feasibility-result-logo"><SimilarityImage key={hit.image} src={hit.image} name={hit.name}/></td><td><strong>{hit.name}</strong><small>{hit.applicationId}</small></td><td>{hit.holders.map(h=>h.name).join('; ')||'No informado'}</td><td>{hit.status}</td><td>{hit.classes.map(c=>c.nice_class).join(', ')||'—'}</td><td><strong className="feasibility-result-score">{Math.round(hit.score*100)}%</strong></td><td><button type="button" className="feasibility-subtle" aria-pressed={comparison?.applicationId===hit.applicationId} onClick={()=>showComparison(hit)}>Comparar</button></td></tr>;}
  const modeHelp:Record<TextMatchMode,string>={similar:'Incluye denominaciones parecidas; el índice es orientativo.',contains:'Busca esta secuencia dentro del nombre.',word:'La palabra debe aparecer completa dentro del nombre.',starts:'El nombre comienza con la secuencia indicada.',ends:'El nombre termina con la secuencia indicada.',exact:'Busca el nombre completo indicado.'};
  function resetCriteria(){invalidate();setName('');setCoverage({});setStates(['registered','pending']);setMinimum(0);setGrouped(true);setMatchMode('similar');setDates({filed_after:'',published_after:'',registered_after:''});setHolderName('');setHolderRut('');setLabelDescription('');setExcludeHolder(false);chooseFile(null);if(fileInput.current)fileInput.current.value='';}
  const dirty=Boolean(executed && (JSON.stringify(proposalQuery())!==JSON.stringify(executed.query)||file!==executed.file));
  return <section ref={workflowRef} className="feasibility-workflow">
    <nav className="feasibility-steps" aria-label="Pasos de factibilidad">{(['Buscar','Revisar resultados','Preparar informe'] as const).map((label,index)=><button key={label} type="button" aria-current={step===index+1?'step':undefined} disabled={(index>0&&!result)||(index===2&&!canPrepare)} onClick={()=>setStep(index+1)}><b>{index+1}</b>{label}</button>)}</nav>
    {profileOpen && profile && <ReportProfileEditor saved={profile} onClose={()=>setProfileOpen(false)} onSaved={value=>{setProfile(value);invalidateReport();}}/>}
    {error && <p role="alert" className="similarity-error">{error}</p>}
    {step===1 && <form onSubmit={search} className="feasibility-search-grid">
      <section className="feasibility-search-card">
        <label htmlFor="proposal-name">Denominación de la marca</label><input id="proposal-name" aria-label="Nombre de la marca" value={name} maxLength={500} onChange={e=>{invalidate();setName(e.target.value);}} placeholder="Escribe el nombre que quieres revisar"/>
        <fieldset className="feasibility-mode-radios"><legend>Coincidencia del nombre</legend><div>{(['similar','contains','word','starts','ends','exact'] as TextMatchMode[]).map(mode=><label key={mode}><input type="radio" name="name-match" value={mode} checked={matchMode===mode} onChange={()=>{invalidate();setMatchMode(mode);}}/>{TEXT_MATCH_MODES[mode]}</label>)}</div><p className="feasibility-form-help">{modeHelp[matchMode]} {matchMode==='exact'?'Se muestran coincidencias exactas dentro de los candidatos recuperados.':'Este criterio se aplica al nombre; pueden aparecer antecedentes relacionados por fonética, imagen o cobertura.'}</p></fieldset>
        <div className="feasibility-nice-row"><div><label htmlFor="proposal-class">Clases Niza</label><select id="proposal-class" value="" onChange={e=>{const n=e.target.value;if(n){invalidate();setCoverage(c=>({...c,[n]:''}));}}}><option value="">Agregar una clase por número o significado…</option>{NICE_CLASSES.map(c=><option key={c.number} value={c.number} disabled={String(c.number) in coverage}>{c.number} · {c.meaning}</option>)}</select></div><label className="feasibility-group-inline"><input type="checkbox" checked={grouped} onChange={e=>{invalidate();setGrouped(e.target.checked);}}/><span>Agrupar similares del mismo titular</span></label></div>
        {!!Object.keys(coverage).length && <div className="feasibility-chosen-classes">{Object.keys(coverage).map(n=><span key={n}>{n} · {NICE_CLASSES.find(c=>String(c.number)===n)?.meaning.split(',')[0]}<button type="button" aria-label={`Quitar clase ${n}`} onClick={()=>{invalidate();setCoverage(c=>Object.fromEntries(Object.entries(c).filter(([key])=>key!==n)));}}><X size={17} aria-hidden/></button></span>)}</div>}
        <p className="feasibility-form-help">Las clases orientan la búsqueda; también pueden aparecer actividades relacionadas de otras clases.</p>
        <fieldset className="feasibility-state-field"><legend>Estados</legend><div className="feasibility-state-chips">{(['registered','pending','other'] as const).map(state=><button type="button" key={state} aria-pressed={states.includes(state)} onClick={()=>{invalidate();setStates(current=>current.includes(state)?current.filter(value=>value!==state):[...current,state]);}}>{FEASIBILITY_STATUS_LABELS[state]}</button>)}<button type="button" aria-pressed={states.length===3} onClick={()=>{invalidate();setStates(['registered','pending','other']);}}>Todos</button></div>{!states.length&&<p role="status">Selecciona al menos un estado para buscar.</p>}</fieldset>
        <details className="feasibility-advanced"><summary>Más criterios · fechas, cobertura y titular</summary><div className="feasibility-date-grid">{([['filed_after','Solicitud desde'],['published_after','Publicación DO desde'],['registered_after','Registro desde']] as const).map(([key,label])=><label key={key}>{label}<input type="date" value={dates[key]} onChange={e=>{invalidate();setDates(current=>({...current,[key]:e.target.value}));}}/></label>)}</div>
          <label>Similitud mínima<div className="feasibility-minimum-inline"><input type="range" aria-label="Similitud mínima" min={0} max={100} step={5} value={minimum} onChange={e=>{invalidate();setMinimum(Number(e.target.value));}}/><output>{minimum}%</output></div></label>
          {Object.entries(coverage).map(([n,text])=><label key={n}>Cobertura de clase {n}<textarea value={text} maxLength={6000} rows={2} placeholder="Productos o servicios que quieres proteger (opcional)" onChange={e=>{invalidate();setCoverage(c=>({...c,[n]:e.target.value}));}}/></label>)}
          <div className="feasibility-holder-grid"><label>Titular de la propuesta<input value={holderName} maxLength={500} placeholder="Nombre o razón social (opcional)" onChange={e=>{invalidate();setHolderName(e.target.value);}}/></label><label>RUT del titular<input value={holderRut} maxLength={30} placeholder="RUT (opcional)" onChange={e=>{invalidate();setHolderRut(e.target.value);}}/></label></div>
          <label>Descripción de la etiqueta<textarea value={labelDescription} maxLength={6000} rows={2} placeholder="Elementos de la imagen (opcional)" onChange={e=>{invalidate();setLabelDescription(e.target.value);}}/></label>
          <label className="feasibility-checkbox"><input type="checkbox" checked={excludeHolder} disabled={!holderName&&!holderRut} onChange={e=>{invalidate();setExcludeHolder(e.target.checked);}}/>Excluir antecedentes del mismo titular</label>
        </details>
        {dirty && <p role="status" className="feasibility-form-help">Hay criterios sin ejecutar. Los resultados anteriores se conservan hasta completar otra búsqueda.</p>}
        <div className="feasibility-search-actions"><button type="button" className="feasibility-subtle" onClick={resetCriteria} disabled={busy}>Restablecer</button><button className="buho-primary" type="submit" disabled={busy||!states.length||(!name.trim()&&!file)}>{busy?'Buscando antecedentes…':'Buscar antecedentes'}<CaretRight size={17} aria-hidden/></button></div>
      </section>
      <aside className="feasibility-search-aside" aria-label="Estudio e imagen de la marca"><ReportProfileLauncher saved={profile} loading={profileLoading||reportBusy} error={profileError} onOpen={()=>{void loadProfile().then(()=>setProfileOpen(true)).catch(()=>{});}}/>
        <section className="feasibility-image-card"><h3>Imagen de la marca</h3><p className="feasibility-form-help">Opcional para búsqueda visual</p><input ref={fileInput} className="buho-sr-only" aria-label="Imagen de la marca" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{invalidate();const candidate=e.target.files?.[0]??null;if(candidate&&candidate.size>8*1024*1024){setError('La imagen debe pesar hasta 8 MiB.');e.target.value='';}else chooseFile(candidate);}}/>
          <div className="feasibility-upload-area"><button data-no-zoom type="button" onClick={()=>fileInput.current?.click()}>{preview?<Image unoptimized src={preview} alt="Imagen de la marca propuesta" width={158} height={112}/>:<UploadSimple size={30} aria-hidden/>}<span>{file?'Cambiar logo':'Subir logo'}</span></button>{file&&<button type="button" className="feasibility-image-remove" aria-label="Quitar imagen" onClick={()=>{invalidate();chooseFile(null);if(fileInput.current)fileInput.current.value='';}}><X size={18} aria-hidden/></button>}</div><p className="feasibility-form-help">JPEG, PNG o WebP · hasta 8 MiB</p></section>
      </aside>
    </form>}
    {step===2 && result && <section className="feasibility-results-step">
      <div className="feasibility-result-summary"><div><strong>{executedQuery?.name||'Marca figurativa'} · {result.results.length} {result.results.length===1?'antecedente recuperado':'antecedentes recuperados'}</strong><small>{Object.keys(Object.fromEntries((executedQuery?.coverage??[]).map(c=>[c.nice_class,c.text]))).length?`Niza ${executedQuery?.coverage.map(c=>c.nice_class).join(', ')} · `:''}{TEXT_MATCH_MODES[executedQuery?.matchMode??'similar']} · {new Date(result.fetchedAt).toLocaleString('es-CL',{timeZone:'America/Santiago'})}</small></div><button type="button" onClick={()=>setStep(1)}>Editar búsqueda</button></div>
      <p className="feasibility-form-help">El índice ordena semejanzas; no representa probabilidad de registro ni de conflicto. Selecciona los antecedentes que deseas explicar en el informe.</p>
      <div className="feasibility-result-controls"><label className="feasibility-result-search"><MagnifyingGlass size={20} aria-hidden/><input type="search" aria-label="Buscar entre resultados de factibilidad" value={resultSearch} onChange={e=>{setResultSearch(e.target.value);setPage(1);}} placeholder="Buscar marca, titular o solicitud"/></label><select aria-label="Orden de resultados" value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="score">Mayor similitud</option><option value="name">Nombre de la marca</option><option value="filed">Solicitud más reciente</option></select><label className="feasibility-checkbox"><input type="checkbox" checked={onlySelected} onChange={e=>{setOnlySelected(e.target.checked);setPage(1);}}/>Solo seleccionadas</label></div>
      {/* Keyboard focus makes the overflowing results table scrollable. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="feasibility-results-table" role="region" aria-label="Antecedentes de factibilidad" tabIndex={0}><table><thead><tr><th><input type="checkbox" aria-label="Seleccionar resultados de esta página" checked={shown.length>0&&shown.every(hit=>selected.includes(hit.applicationId))} onChange={e=>{invalidateReport();setSelected(current=>e.target.checked?[...new Set([...current,...shown.map(hit=>hit.applicationId)])]:current.filter(id=>!shown.some(hit=>hit.applicationId===id)));}}/></th><th>Logo</th><th>Solicitud / marca</th><th>Titular</th><th>Estado INAPI</th><th>Niza</th><th>Similitud</th><th>Revisión</th></tr></thead>{pageUnits.map(hit=>{const group=groupById.get(hit.applicationId),members=group&&group.member_ids.length>1?reviewHits.filter(member=>group.member_ids.includes(Number(member.applicationId))):[];if(members.length<2)return <tbody key={hit.applicationId}>{resultRow(hit)}</tbody>;const key=String(group!.representative_id),expanded=expandedGroups.includes(key);return <tbody key={key} className="feasibility-family"><tr className="feasibility-family-heading"><td><input type="checkbox" aria-label={`Seleccionar grupo de ${hit.holders.map(h=>h.name).join(', ')}`} checked={members.every(member=>selected.includes(member.applicationId))} onChange={e=>{invalidateReport();setSelected(current=>e.target.checked?[...new Set([...current,...members.map(member=>member.applicationId)])]:current.filter(id=>!members.some(member=>member.applicationId===id)));}}/></td><td colSpan={7}><button type="button" className="feasibility-family-toggle" aria-expanded={expanded} onClick={()=>setExpandedGroups(current=>expanded?current.filter(id=>id!==key):[...current,key])}><CaretDown size={16} aria-hidden/><strong>{group?.holder_names?.join('; ')||hit.holders.map(h=>h.name).join('; ')||'Titular no informado'}</strong><span>{members.length} solicitudes · {members.filter(member=>selected.includes(member.applicationId)).length} {members.filter(member=>selected.includes(member.applicationId)).length===1?'seleccionada':'seleccionadas'}</span></button></td></tr>{(expanded?members:[hit]).map(resultRow)}</tbody>;})}</table>{!shown.length&&<p className="feasibility-empty">{result.results.length?'No hay resultados con estos filtros.':'No encontramos coincidencias con estos criterios. Amplía los estados o reduce el porcentaje y vuelve a buscar.'}</p>}</div>
      {!!reviewHits.length&&<nav className="feasibility-pagination" aria-label="Páginas de resultados"><label>Mostrar<select aria-label="Resultados por página" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,25,50,100].map(size=><option key={size} value={size}>{size}</option>)}</select>por página</label><div><button type="button" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Anterior</button><span>{currentPage} / {totalPages}</span><button type="button" disabled={currentPage===totalPages} onClick={()=>setPage(currentPage+1)}>Siguiente</button></div></nav>}

      <div className="feasibility-selection-bar"><span>{selected.length} {selected.length===1?'antecedente seleccionado':'antecedentes seleccionados'}</span><div><button type="button" className="feasibility-clear-selection" disabled={!selected.length} onClick={()=>{invalidateReport();setSelected([]);}}>Limpiar selección</button><button type="button" disabled={!canPrepare} onClick={()=>setStep(3)}>Preparar informe <CaretRight size={17} aria-hidden/></button></div></div>
      <p className="feasibility-form-help">{result.searchScope?.retrieved??result.results.length} {(result.searchScope?.retrieved??result.results.length)===1?'candidato recuperado':'candidatos recuperados'} por la fuente · máximo {result.searchScope?.limit??100}. Esta consulta no revisa toda su base.</p>{!!result.warnings.length&&<details className="feasibility-advanced"><summary>Observaciones de la búsqueda</summary><ul>{result.warnings.map(w=><li key={w}>{w}</li>)}</ul></details>}
    </section>}
    {step===3 && result && <div className="feasibility-report-grid"><section className="feasibility-report-card"><h2>Contenido del informe</h2><p>{executedQuery?.name||'Marca figurativa'} · {selected.length} {selected.length===1?'antecedente seleccionado':'antecedentes seleccionados'}</p>
      <div className="feasibility-holder-grid"><label>Cliente (opcional)<input value={client} maxLength={160} disabled={reportBusy} onChange={e=>{invalidateReport();setClient(e.target.value);}} placeholder="Persona o empresa"/></label><label>Preparado por<input value={author} maxLength={160} disabled={reportBusy} onChange={e=>{invalidateReport();setAuthor(e.target.value);}} placeholder={profile?.profile.lawyerName||'Abogado o estudio'}/></label></div>
      <label>Recomendación para el cliente<select value={recommendation} disabled={reportBusy} onChange={e=>{invalidateReport();setRecommendation(e.target.value as ReportRecommendation|'auto');}}><option value="auto">Sugerida según los resultados</option>{Object.entries(REPORT_RECOMMENDATIONS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p className="feasibility-form-help">Sugerencia: {reportRecommendation(result,undefined,'',executedQuery?.coverage.map(c=>c.nice_class)).title}. Considera toda la búsqueda, aunque selecciones algunos antecedentes para mostrar en detalle.</p>
      <label>Conclusión del abogado (opcional)<textarea value={explanation} maxLength={1600} rows={3} disabled={reportBusy} onChange={e=>{invalidateReport();setExplanation(e.target.value);}} placeholder="Escribe tu análisis o prepara una conclusión a partir de los antecedentes."/></label><button type="button" className="buho-secondary" disabled={reportBusy} onClick={()=>void previewConclusion()}>{reportBusy?'Preparando…':conclusion?'Actualizar conclusión':'Preparar conclusión para revisar'}</button>
      <label className="feasibility-checkbox feasibility-appendix"><input type="checkbox" checked={includeAppendix} disabled={reportBusy} onChange={e=>{setReviewed(false);setIncludeAppendix(e.target.checked);}}/>Agregar un anexo con todos los resultados de la búsqueda</label><button type="button" className="feasibility-subtle" onClick={()=>setStep(2)}>Volver a la selección</button>
    <section className="feasibility-paper-preview"><h3>Vista previa del contenido</h3><article>{profile?.profile.logo&&<Image unoptimized src={profile.profile.logo} width={160} height={56} alt="Logo del estudio en el informe"/>}<small>{profile?.profile.studioName||author||'Informe para el cliente'}</small><h3>Informe de factibilidad<br/>{executedQuery?.name||'Marca figurativa'}</h3><p>Búsqueda: {TEXT_MATCH_MODES[executedQuery?.matchMode??'similar']} · {executedQuery?.coverage.length?`Niza ${executedQuery.coverage.map(c=>c.nice_class).join(', ')}`:'Todas las clases'}<br/>{selected.length} {selected.length===1?'solicitud incluida':'solicitudes incluidas'}{client?` · Cliente: ${client}`:''}</p>{conclusion?<><strong>{conclusion.title}</strong>{conclusion.paragraphs.map((p,i)=><p key={i}>{p}</p>)}<small>{conclusion.source==='author'?'Conclusión del abogado':conclusion.source==='openrouter'?'Borrador asistido para revisión':'Borrador basado en los resultados para revisión'}</small></>:<p>Conclusión pendiente de preparar y revisar.</p>}</article></section></section><aside className="feasibility-report-aside"><section className="feasibility-export-card"><h3>Descargar informe</h3><fieldset><legend>Formato</legend><label><input type="radio" name="report-format" checked={format==='pdf'} onChange={()=>setFormat('pdf')}/>PDF</label><label><input type="radio" name="report-format" checked={format==='docx'} onChange={()=>setFormat('docx')}/>Word editable</label></fieldset><label className="feasibility-checkbox"><input type="checkbox" checked={reviewed} disabled={!conclusion||reportBusy} onChange={e=>setReviewed(e.target.checked)}/><span>Revisé los antecedentes y la conclusión del informe.</span></label>{!conclusion&&<p className="feasibility-form-help">Prepara la conclusión y revísala antes de descargar.</p>}<button type="button" className="buho-primary" disabled={!reviewed||reportBusy} onClick={()=>void downloadReport(format)}>{reportBusy?'Preparando informe…':`Descargar ${format==='pdf'?'PDF':'Word'}`}</button></section><section className="feasibility-report-branding"><h3>Tu estudio en el informe</h3>{profile?.profile.logo&&<Image unoptimized src={profile.profile.logo} width={180} height={70} alt="Logo del estudio"/>}<strong>{profile?.profile.studioName||'Información del estudio opcional'}</strong><small>PDF y Word conservan la misma marca, antecedentes y conclusión.</small><button type="button" className="feasibility-subtle" onClick={()=>{void loadProfile().then(()=>setProfileOpen(true)).catch(()=>{});}}>Editar información del estudio</button></section></aside></div>}
    {reportError&&<p role="alert" className="similarity-error">{reportError}</p>}
    {comparison&&<ReviewDialog className="buho-drawer is-wide feasibility-compare-dialog" title="Revisión de factibilidad" eyebrow={`ANTECEDENTE · SOLICITUD ${comparison.applicationId}`} onClose={()=>setComparison(null)}>
      <div className="buho-drawer-scroll buho-drawer-match">
        <div className="buho-match-summary"><strong className="feasibility-result-score">{Math.round(comparison.score*100)}%</strong><div><strong>{comparison.name}</strong><small>{comparison.status}</small></div><a className="buho-inapi-link" href="https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx" target="_blank" rel="noreferrer">Ver en INAPI ↗</a></div>
        <p className="buho-work-note">Compara la denominación, el logo y las coberturas. El índice de similitud no representa una probabilidad de conflicto.</p>
        <TrademarkComparison left={{label:'MARCA PROPUESTA',name:executedQuery?.name||'Marca figurativa',image:executed?.image||result?.query.image||'',rows:[
          {label:'Denominación',value:executedQuery?.name||'Marca figurativa'},
          {label:'Clases de Niza',value:executedQuery?.coverage.map(c=>c.nice_class).join(', ')||'Sin clases indicadas'},
          {label:'Cobertura',value:executedQuery?.coverage.map(c=>`Clase ${c.nice_class}: ${c.text||'No definida'}`).join('; ')||'No definida'},
        ]}} right={{label:'ANTECEDENTE ENCONTRADO',name:comparison.name,image:comparison.image,rows:[
          {label:'Denominación',value:comparison.name},
          {label:'Clases de Niza',value:comparison.classes.map(c=>c.nice_class).join(', ')},
          {label:'Cobertura',value:comparison.classes.map(c=>`Clase ${c.nice_class}: ${c.coverage_text||'No informada'}`).join('; ')},
          {label:'Tipo de marca',value:comparison.type},
          {label:'Titular',value:comparison.holders.map(h=>h.name).join('; ')},
          {label:'N.º de registro',value:comparison.registrationId},
          {label:'N.º solicitud (INAPI)',value:comparison.applicationId},
          {label:'Publicación en Diario Oficial',value:displayWorkDate(comparison.publishedAt||'')},
        ]}}/>
        {!!comparison.dataWarnings?.length&&<p className="similarity-data-warning">Antecedentes por verificar: {comparison.dataWarnings.join('. ')}</p>}
        <SimilarityStatusNotice hit={comparison}/>
        <MatchHistory title="Historial del antecedente" application={comparison.applicationId} name={comparison.name} source="INAPI" date={comparison.publishedAt||''} storedHistory={comparison.history}/>
      </div>
      <footer className="buho-drawer-actions"><button type="button" onClick={()=>setComparison(null)}>Cerrar</button><button type="button" className="buho-primary" aria-pressed={selected.includes(comparison.applicationId)} onClick={()=>toggleSelection(comparison.applicationId)}>{selected.includes(comparison.applicationId)?'Quitar del informe':'Incluir en el informe'}</button></footer>
    </ReviewDialog>}
  </section>;
}
