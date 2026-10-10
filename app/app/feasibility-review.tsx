"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { MagnifyingGlass, CaretRight, UploadSimple, X, CaretDown } from "@phosphor-icons/react";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { FEASIBILITY_STATUS_LABELS } from "@/lib/feasibility-policy";
import { type ReportRecommendation } from "@/lib/feasibility-recommendation";
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
import { analysisClass, upsertClassAnalysis, requireReviewedConclusion, hasPercentages, CLASS_DECISIONS, type FeasibilityClassAnalysis } from '@/lib/feasibility-study';
import { type SavedReportProfile } from "@/lib/report-profile";
import { type ConclusionInput, type ReportConclusion } from "@/lib/feasibility-conclusion";

async function fetchReportProfile(signal?: AbortSignal):Promise<SavedReportProfile> {
  const response=await fetch("/api/report-profile",{signal}); const value=await response.json();
  if(!response.ok)throw new Error(value.message || "No pudimos cargar la información del estudio.");
  return value;
}
export function FeasibilityReview({onStepChange}:{onStepChange?:(step:number)=>void}) {
  const [reportMode, setReportMode] = useState<'single'|'multiple'>('single');
  const [analyses, setAnalyses] = useState<FeasibilityClassAnalysis[]>([]);
  const [reportLayout, setReportLayout] = useState<'table'|'cards'>('cards');
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
  const [executed,setExecuted]=useState<{query:ConclusionInput['proposal'];file:File|null;image:string}|null>(null);
  useEffect(()=>()=>{if(executed?.image)URL.revokeObjectURL(executed.image);},[executed]);
  const [editedDecision, setEditedDecision] = useState<keyof typeof CLASS_DECISIONS>('insufficient');
  const [conclusion, setConclusion] = useState<ReportConclusion | null>(null);
  const reportEpoch = useRef(0), conclusionCache = useRef(new Map<string, ReportConclusion>());
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
  function invalidateReport(all = false) { setReviewed(false); reportEpoch.current++; setConclusion(null); setReportError(''); setAnalyses(current => current.map(item => all || item.proposal.niceClass === executed?.query.niceClass ? {...item, conclusion:undefined} : item)); }
  function proposalQuery() {
    return { name, niceClass:Object.keys(coverage).length === 1 ? Number(Object.keys(coverage)[0]) : undefined, coverage: Object.entries(coverage).map(([nice_class,text])=>({nice_class:Number(nice_class),text})), limit:100, grouped, states:states as ("registered"|"pending"|"other")[], minSimilarity:minimum/100, matchMode, ...Object.fromEntries(Object.entries(dates).filter(([,value])=>value)), visual_model:"base" as const, label_description:labelDescription || undefined, holders:holderName || holderRut ? [{name:holderName || undefined,rut:holderRut || undefined}] : undefined, exclude_same_holder:excludeHolder && Boolean(holderName || holderRut) };
  }
  const [preview, setPreview] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function chooseFile(value: File | null) { setFile(value); setPreview(value ? URL.createObjectURL(value) : ""); }
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => () => request.current?.abort(), []);
  function invalidate() { setError(''); }
  async function search(event: FormEvent) {
    event.preventDefault(); if(Object.keys(coverage).length !== 1) { setError('Elige una única clase Niza para este análisis.'); return; } generation.current++; request.current?.abort();
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
  function currentAnalysis(): FeasibilityClassAnalysis {
    if (!result || !executed) throw new Error('Realiza una búsqueda antes de preparar el informe.');
    return {proposal:executed.query, result, selectedIds:selected, conclusion:conclusion ?? undefined,
      recommendation:recommendation === 'auto' ? undefined : recommendation, decision:recommendation === 'auto'?undefined:editedDecision, explanation};
  }
  function reportAnalyses() {
    const current=currentAnalysis();
    return reportMode === 'single' ? [current] : upsertClassAnalysis(analyses, current);
  }
  function prepareClass() { setAnalyses(current=>upsertClassAnalysis(current,currentAnalysis()));setStep(3); }
  function openAnalysis(item: FeasibilityClassAnalysis) {
    if(result&&executed&&item.proposal.niceClass===executed.query.niceClass){setStep(3);return;}
    if(result&&executed&&item.proposal.niceClass!==executed.query.niceClass)setAnalyses(current=>upsertClassAnalysis(current,currentAnalysis()));
    reportEpoch.current++;setReviewed(false);setReportError('');setCoverage(Object.fromEntries(item.proposal.coverage.map(c=>[c.nice_class,c.text])));
    setGrouped(item.proposal.grouped);setStates(item.proposal.states);setMinimum(item.proposal.minSimilarity*100);setMatchMode(item.proposal.matchMode);
    setDates({filed_after:item.proposal.filed_after??'',published_after:item.proposal.published_after??'',registered_after:item.proposal.registered_after??''});
    setLabelDescription(item.proposal.label_description??'');setHolderName(item.proposal.holders?.[0]?.name??'');setHolderRut(item.proposal.holders?.[0]?.rut??'');setExcludeHolder(item.proposal.exclude_same_holder);
    setExecuted({query:item.proposal,file,image:file?URL.createObjectURL(file):''});setResult(item.result);setSelected(item.selectedIds);
    setConclusion(item.conclusion??null);setRecommendation(item.recommendation??'auto');setExplanation(item.explanation??'');setEditedDecision(item.decision??item.conclusion?.decision??'insufficient');setPage(1);setResultSearch('');setComparison(null);setStep(3);
  }
  function addAnalysis() {
    setAnalyses(current=>upsertClassAnalysis(current,currentAnalysis()));reportEpoch.current++;setReviewed(false);
    setCoverage({});setExecuted(null);setResult(null);setSelected([]);setConclusion(null);setRecommendation('auto');setExplanation('');setReportError('');setStep(1);
  }
  function newStudy() {
    generation.current++;request.current?.abort();reportEpoch.current++;conclusionCache.current.clear();setAnalyses([]);setExecuted(null);setResult(null);setConclusion(null);setSelected([]);setReviewed(false);setReportError('');setRecommendation('auto');setExplanation('');resetCriteria(false);setStep(1);
  }
  async function resolveConclusion(saved: SavedReportProfile, analysis:FeasibilityClassAnalysis): Promise<ReportConclusion> {
    const input: ConclusionInput = { proposal:analysis.proposal, result:analysis.result, selectedIds:analysis.selectedIds, recommendation:analysis.recommendation, decision:analysis.decision, client, author:author || saved.profile.lawyerName };
    if (analysis.explanation?.trim()) {
      if(hasPercentages(analysis.explanation)) throw new Error('Escribe la conclusión sin porcentajes.');
      const decision = analysis.decision??analysis.conclusion?.decision??'insufficient';
      return { title:CLASS_DECISIONS[decision], recommendation:analysis.recommendation??'review', decision, source:'author', paragraphs:analysis.explanation.trim().split(/\n\s*\n/), evidenceApplicationIds:analysis.selectedIds };
    }
    const key=JSON.stringify({input,profile:saved.version});
    const cached=conclusionCache.current.get(key);if(cached)return cached;
    let response=await fetch('/api/feasibility/conclusions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(60000)});
    let payload=await response.json();
    if(!response.ok)throw new Error(payload.message||'No pudimos preparar la conclusión con OpenRouter.');
    const pollingTimeout=AbortSignal.timeout(60000);
    for(let attempts=0;response.status===202 && payload.pending && attempts<40;attempts++) {
      await new Promise(resolve=>setTimeout(resolve,1500));
      response=await fetch(`/api/feasibility/conclusions/${payload.pending}`,{signal:AbortSignal.any([pollingTimeout,AbortSignal.timeout(15000)])});
      const polled=await response.json();if(!response.ok)throw new Error('No pudimos recuperar la conclusión.');payload={...polled,pending:payload.pending};
    }
    if(!payload.conclusion || payload.conclusion.source!=='openrouter')throw new Error(`OpenRouter no pudo concluir el análisis de clase ${analysisClass(analysis)}. Los hallazgos se conservan; revisa la configuración o vuelve a intentarlo.`);
    const value=requireReviewedConclusion(payload.conclusion);conclusionCache.current.set(key,value);return value;
  }
  async function previewConclusion() {
    const epoch=reportEpoch.current;setReviewed(false);setReportBusy(true);setReportError('');
    try {
      const saved=profile??await loadProfile();const items=reportAnalyses();
      setAnalyses(items);
      for(const item of items) {
        const value=item.conclusion ?? await resolveConclusion(saved,item);if(epoch!==reportEpoch.current)return;
        setAnalyses(current=>current.map(entry=>analysisClass(entry)===analysisClass(item)?{...entry,conclusion:value}:entry));
        if(item.proposal.niceClass===executed?.query.niceClass)setConclusion(value);
      }
    } catch(cause) {if(epoch===reportEpoch.current)setReportError(cause instanceof Error?cause.message:'No pudimos preparar las conclusiones.');}
    finally {setReportBusy(false);}
  }
  async function downloadReport(format: "pdf" | "docx") {
    if (!result || !executed || !reviewed || (result.results.length>0&&!selected.length)) return;
    const reportGeneration = generation.current, epoch=reportEpoch.current;
    setReportBusy(true); setReportError("");
    try {
      const makeReport = format === "pdf" ? (await import("@/lib/feasibility-report")).createFeasibilityReport : (await import("@/lib/feasibility-docx")).createFeasibilityDocx;
      const saved=profile ?? await loadProfile();
      const preparedAnalyses=reportAnalyses().map(item=>({...item,conclusion:requireReviewedConclusion(item.conclusion)}));
      const prepared=requireReviewedConclusion(conclusion??undefined);
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
      const chosen=[...new Map(preparedAnalyses.flatMap(item=>selectReportHits(item.result.results,item.selectedIds)).map(hit=>[hit.applicationId,hit])).values()];
      const {images,missing}=await reportImages(chosen);
      const report = await makeReport({ analyses:preparedAnalyses, layout:reportLayout, result, selectedIds:selected, resultImages:images, status: "all", proposal: { name:executed.query.name, coverage:preparedAnalyses.flatMap(item=>item.proposal.coverage), grouped:executed.query.grouped }, image, imageType:"png", studioLogo, studioProfile:saved.profile, conclusion:prepared, client, author:author || saved.profile.lawyerName, recommendation: recommendation === "auto" ? undefined : recommendation, explanation, includeAppendix });
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
  function resultRow(hit:SimilarityHit){return <tr key={hit.applicationId} className={selected.includes(hit.applicationId)?'is-selected':''}><td><input type="checkbox" aria-label={`Incluir ${hit.name} en el informe`} checked={selected.includes(hit.applicationId)} onChange={()=>toggleSelection(hit.applicationId)}/></td><td className="feasibility-result-logo"><SimilarityImage key={hit.image} src={hit.image} applicationId={hit.applicationId} name={hit.name}/></td><td><strong>{hit.name}</strong><small>{hit.applicationId}</small></td><td>{hit.holders.map(h=>h.name).join('; ')||'No informado'}</td><td>{hit.status}</td><td>{hit.classes.map(c=>c.nice_class).join(', ')||'—'}</td><td><strong className="feasibility-result-score">{Math.round(hit.score*100)}%</strong></td><td><button type="button" className="feasibility-subtle" aria-pressed={comparison?.applicationId===hit.applicationId} onClick={()=>showComparison(hit)}>Comparar</button></td></tr>;}
  const modeHelp:Record<TextMatchMode,string>={similar:'Incluye denominaciones parecidas; el índice es orientativo.',contains:'Busca esta secuencia dentro del nombre.',word:'La palabra debe aparecer completa dentro del nombre.',starts:'El nombre comienza con la secuencia indicada.',ends:'El nombre termina con la secuencia indicada.',exact:'Busca el nombre completo indicado.'};
  function resetCriteria(preserveBrand=analyses.length>0){invalidate();if(!preserveBrand)setName('');setCoverage(preserveBrand&&executed?Object.fromEntries(executed.query.coverage.map(c=>[c.nice_class,''])):{});setStates(['registered','pending']);setMinimum(0);setGrouped(true);setMatchMode('similar');setDates({filed_after:'',published_after:'',registered_after:''});setHolderName('');setHolderRut('');setLabelDescription('');setExcludeHolder(false);if(!preserveBrand){chooseFile(null);if(fileInput.current)fileInput.current.value='';}}
  const activeNumber=executed?.query.niceClass;
  const completeConclusions=Boolean(result && reportAnalyses().every(item=>item.conclusion && ['openrouter','author'].includes(item.conclusion.source)));
  const dirty=Boolean(executed && (JSON.stringify(proposalQuery())!==JSON.stringify(executed.query)||file!==executed.file));
  return <section ref={workflowRef} className="feasibility-workflow">
    <header className="feasibility-study-header"><div className="feasibility-report-mode" role="group" aria-label="Tipo de informe">{([['single','Informe'],['multiple','Multinforme']] as const).map(([mode,label])=><button type="button" key={mode} aria-pressed={reportMode===mode} disabled={reportBusy||busy||analyses.length>0} onClick={()=>{setReportMode(mode);setReviewed(false);}}>{label}</button>)}</div><p>{reportMode==='single'?'Un análisis de una clase Niza.':'Varios análisis por clase Niza reunidos en un informe.'}</p>{(analyses.length>0||result)&&<button type="button" disabled={reportBusy||busy} onClick={newStudy}>Nuevo estudio</button>}</header>
    {reportMode==='multiple' && <section className="feasibility-study-progress" aria-label="Análisis guardados"><strong>{analyses.length} {analyses.length===1?'análisis guardado':'análisis guardados'}</strong><div>{analyses.map(item=><span key={analysisClass(item)} className={activeNumber===analysisClass(item)?'is-active':''}><button type="button" disabled={reportBusy||busy} onClick={()=>openAnalysis(item)}>Clase {analysisClass(item)} · {item.conclusion?'Con conclusión':'Por concluir'}</button><button type="button" disabled={reportBusy||busy} aria-label={`Quitar análisis de clase ${analysisClass(item)}`} onClick={()=>{setReviewed(false);reportEpoch.current++;setAnalyses(current=>current.filter(entry=>analysisClass(entry)!==analysisClass(item)));if(activeNumber===analysisClass(item)){setExecuted(null);setResult(null);setConclusion(null);setSelected([]);setCoverage({});setStep(1);}}}><X size={14}/></button></span>)}</div></section>}
    <nav className="feasibility-steps" aria-label="Pasos de factibilidad">{(['Buscar','Revisar resultados','Preparar informe'] as const).map((label,index)=><button key={label} type="button" aria-current={step===index+1?'step':undefined} disabled={reportBusy||(index>0&&!result)||(index===2&&!canPrepare)} onClick={()=>index===2?prepareClass():setStep(index+1)}><b>{index+1}</b>{label}</button>)}</nav>
    {profileOpen && profile && <ReportProfileEditor saved={profile} onClose={()=>setProfileOpen(false)} onSaved={value=>{setProfile(value);invalidateReport(true);}}/>}
    {error && <p role="alert" className="similarity-error">{error}</p>}
    {step===1 && <form onSubmit={search} className="feasibility-search-grid">
      <section className="feasibility-search-card">
        <label htmlFor="proposal-name">Denominación de la marca</label><input id="proposal-name" disabled={analyses.length>0} aria-label="Nombre de la marca" value={name} maxLength={500} onChange={e=>{invalidate();setName(e.target.value);}} placeholder="Escribe el nombre que quieres revisar"/>
        <fieldset className="feasibility-mode-radios"><legend>Coincidencia del nombre</legend><div>{(['similar','contains','word','starts','ends','exact'] as TextMatchMode[]).map(mode=><label key={mode}><input type="radio" name="name-match" value={mode} checked={matchMode===mode} onChange={()=>{invalidate();setMatchMode(mode);}}/>{TEXT_MATCH_MODES[mode]}</label>)}</div><p className="feasibility-form-help">{modeHelp[matchMode]} {matchMode==='exact'?'Se muestran coincidencias exactas dentro de los candidatos recuperados.':'Este criterio se aplica al nombre; pueden aparecer antecedentes relacionados por fonética, imagen o cobertura.'}</p></fieldset>
        <div className="feasibility-nice-row"><div><label htmlFor="proposal-class">Clase Niza</label><select id="proposal-class" required value={Object.keys(coverage)[0]??''} onChange={e=>{const n=e.target.value;if(n){invalidate();setCoverage({[n]:coverage[n]??''});}}}><option value="">Elegir una clase por número o significado…</option>{NICE_CLASSES.map(c=><option key={c.number} value={c.number} disabled={analyses.some(item=>analysisClass(item)===c.number)&&activeNumber!==c.number}>{c.number} · {c.meaning}</option>)}</select></div><label className="feasibility-group-inline"><input type="checkbox" checked={grouped} onChange={e=>{invalidate();setGrouped(e.target.checked);}}/><span>Agrupar similares del mismo titular</span></label></div>
        {!!Object.keys(coverage).length && <div className="feasibility-chosen-classes">{Object.keys(coverage).map(n=><span key={n}>{n} · {NICE_CLASSES.find(c=>String(c.number)===n)?.meaning.split(',')[0]}<button type="button" aria-label={`Quitar clase ${n}`} onClick={()=>{invalidate();setCoverage(c=>Object.fromEntries(Object.entries(c).filter(([key])=>key!==n)));}}><X size={17} aria-hidden/></button></span>)}</div>}
        <p className="feasibility-form-help">Cada análisis admite una única clase. Los resultados mostrarán solo antecedentes que incluyan esa clase Niza.</p>
        <fieldset className="feasibility-state-field"><legend>Estados</legend><div className="feasibility-state-chips">{(['registered','pending','other'] as const).map(state=><button type="button" key={state} aria-pressed={states.includes(state)} onClick={()=>{invalidate();setStates(current=>current.includes(state)?current.filter(value=>value!==state):[...current,state]);}}>{FEASIBILITY_STATUS_LABELS[state]}</button>)}<button type="button" aria-pressed={states.length===3} onClick={()=>{invalidate();setStates(['registered','pending','other']);}}>Todos</button></div>{!states.length&&<p role="status">Selecciona al menos un estado para buscar.</p>}</fieldset>
        <details className="feasibility-advanced"><summary>Más criterios · fechas, cobertura y titular</summary><div className="feasibility-date-grid">{([['filed_after','Solicitud desde'],['published_after','Publicación DO desde'],['registered_after','Registro desde']] as const).map(([key,label])=><label key={key}>{label}<input type="date" value={dates[key]} onChange={e=>{invalidate();setDates(current=>({...current,[key]:e.target.value}));}}/></label>)}</div>
          <label>Similitud mínima<div className="feasibility-minimum-inline"><input type="range" aria-label="Similitud mínima" min={0} max={100} step={5} value={minimum} onChange={e=>{invalidate();setMinimum(Number(e.target.value));}}/><output>{minimum}%</output></div></label>
          {Object.entries(coverage).map(([n,text])=><label key={n}>Cobertura de clase {n}<textarea value={text} maxLength={6000} rows={2} placeholder="Productos o servicios que quieres proteger (opcional)" onChange={e=>{invalidate();setCoverage(c=>({...c,[n]:e.target.value}));}}/></label>)}
          <div className="feasibility-holder-grid"><label>Titular de la propuesta<input value={holderName} maxLength={500} placeholder="Nombre o razón social (opcional)" onChange={e=>{invalidate();setHolderName(e.target.value);}}/></label><label>RUT del titular<input value={holderRut} maxLength={30} placeholder="RUT (opcional)" onChange={e=>{invalidate();setHolderRut(e.target.value);}}/></label></div>
          <label>Descripción de la etiqueta<textarea value={labelDescription} maxLength={6000} rows={2} placeholder="Elementos de la imagen (opcional)" onChange={e=>{invalidate();setLabelDescription(e.target.value);}}/></label>
          <label className="feasibility-checkbox"><input type="checkbox" checked={excludeHolder} disabled={!holderName&&!holderRut} onChange={e=>{invalidate();setExcludeHolder(e.target.checked);}}/>Excluir antecedentes del mismo titular</label>
        </details>
        {dirty && <p role="status" className="feasibility-form-help">Hay criterios sin ejecutar. Los resultados anteriores se conservan hasta completar otra búsqueda.</p>}
        <div className="feasibility-search-actions"><button type="button" className="feasibility-subtle" onClick={()=>resetCriteria()} disabled={busy}>Restablecer</button><button className="buho-primary" type="submit" disabled={busy||Object.keys(coverage).length!==1||!states.length||(!name.trim()&&!file)}>{busy?'Buscando antecedentes…':'Buscar antecedentes'}<CaretRight size={17} aria-hidden/></button></div>
      </section>
      <aside className="feasibility-search-aside" aria-label="Estudio e imagen de la marca"><ReportProfileLauncher saved={profile} loading={profileLoading||reportBusy} error={profileError} onOpen={()=>{void loadProfile().then(()=>setProfileOpen(true)).catch(()=>{});}}/>
        <section className="feasibility-image-card"><h3>Imagen de la marca</h3><p className="feasibility-form-help">Opcional para búsqueda visual</p><input ref={fileInput} className="buho-sr-only" aria-label="Imagen de la marca" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{invalidate();const candidate=e.target.files?.[0]??null;if(candidate&&candidate.size>8*1024*1024){setError('La imagen debe pesar hasta 8 MiB.');e.target.value='';}else chooseFile(candidate);}}/>
          <div className="feasibility-upload-area"><button data-no-zoom type="button" disabled={analyses.length>0} onClick={()=>fileInput.current?.click()}>{preview?<Image unoptimized src={preview} alt="Imagen de la marca propuesta" width={158} height={112}/>:<UploadSimple size={30} aria-hidden/>}<span>{file?'Cambiar logo':'Subir logo'}</span></button>{file&&<button type="button" className="feasibility-image-remove" disabled={analyses.length>0} aria-label="Quitar imagen" onClick={()=>{invalidate();chooseFile(null);if(fileInput.current)fileInput.current.value='';}}><X size={18} aria-hidden/></button>}</div><p className="feasibility-form-help">JPEG, PNG o WebP · hasta 8 MiB</p></section>
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

      <div className="feasibility-selection-bar"><span>{selected.length} {selected.length===1?'antecedente seleccionado':'antecedentes seleccionados'}</span><div><button type="button" className="feasibility-clear-selection" disabled={!selected.length} onClick={()=>{invalidateReport();setSelected([]);}}>Limpiar selección</button><button type="button" disabled={!canPrepare} onClick={prepareClass}>Preparar informe <CaretRight size={17} aria-hidden/></button></div></div>
      <p className="feasibility-form-help">{result.searchScope?.retrieved??result.results.length} {(result.searchScope?.retrieved??result.results.length)===1?'candidato recuperado':'candidatos recuperados'} por la fuente · máximo {result.searchScope?.limit??100}. Esta consulta no revisa toda su base.</p>{!!result.warnings.length&&<details className="feasibility-advanced"><summary>Observaciones de la búsqueda</summary><ul>{result.warnings.map(w=><li key={w}>{w}</li>)}</ul></details>}
    </section>}
    {step===3 && result && <div className="feasibility-report-grid"><section className="feasibility-report-card"><h2>Contenido del informe</h2><p>{executedQuery?.name||'Marca figurativa'} · {reportAnalyses().length} {reportAnalyses().length===1?'clase':'clases'} · {reportAnalyses().reduce((sum,item)=>sum+item.selectedIds.length,0)} antecedentes seleccionados</p>
      <div className="feasibility-holder-grid"><label>Cliente (opcional)<input value={client} maxLength={160} disabled={reportBusy} onChange={e=>{invalidateReport(true);setClient(e.target.value);}} placeholder="Persona o empresa"/></label><label>Preparado por<input value={author} maxLength={160} disabled={reportBusy} onChange={e=>{invalidateReport(true);setAuthor(e.target.value);}} placeholder={profile?.profile.lawyerName||'Abogado o estudio'}/></label></div>
      <label>Recomendación para clase {activeNumber}<select value={recommendation==='auto'?'auto':editedDecision} disabled={reportBusy} onChange={e=>{invalidateReport();const value=e.target.value as keyof typeof CLASS_DECISIONS|'auto';if(value==='auto')setRecommendation('auto');else{setEditedDecision(value);setRecommendation(({proceed:'proceed',moderate:'review',avoid:'adjust',insufficient:'review'} as const)[value]);}}}><option value="auto">Conclusión redactada por OpenRouter</option>{Object.entries(CLASS_DECISIONS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p className="feasibility-form-help">OpenRouter analizará los antecedentes textuales de cada clase y redactará sus argumentos. La selección controla el detalle mostrado; la conclusión considera todos los hallazgos de esa clase.</p>
      <label>Conclusión del abogado · Clase {activeNumber} (opcional)<textarea value={explanation} maxLength={1600} rows={3} disabled={reportBusy} onChange={e=>{invalidateReport();setExplanation(e.target.value);}} placeholder="Escribe tu análisis o prepara una conclusión a partir de los antecedentes."/></label><button type="button" className="buho-secondary" disabled={reportBusy} onClick={()=>void previewConclusion()}>{reportBusy?'Preparando…':conclusion?'Completar conclusiones':'Generar conclusiones con OpenRouter'}</button>
      {reportMode==='multiple'&&<button type="button" className="buho-secondary" disabled={reportBusy||analyses.length>=45} onClick={addAnalysis}>Agregar otro análisis por clase de Niza</button>}
      <label className="feasibility-checkbox feasibility-appendix"><input type="checkbox" checked={includeAppendix} disabled={reportBusy} onChange={e=>{setReviewed(false);setIncludeAppendix(e.target.checked);}}/>Agregar un anexo con todos los resultados de la búsqueda</label><button type="button" className="feasibility-subtle" disabled={reportBusy} onClick={()=>setStep(2)}>Volver a la selección</button>
    <section className="feasibility-paper-preview"><h3>Vista previa del contenido</h3><article>{profile?.profile.logo&&<Image unoptimized src={profile.profile.logo} width={160} height={56} alt="Logo del estudio en el informe"/>}<small>{profile?.profile.studioName||author||'Informe para el cliente'}</small><h3>Informe de factibilidad<br/>{executedQuery?.name||'Marca figurativa'}</h3><p>Búsqueda: {TEXT_MATCH_MODES[executedQuery?.matchMode??'similar']} · {executedQuery?.coverage.length?`Niza ${reportAnalyses().flatMap(item=>item.proposal.coverage.map(c=>c.nice_class)).join(', ')}`:'Todas las clases'}<br/>{reportAnalyses().reduce((sum,item)=>sum+item.selectedIds.length,0)} solicitudes incluidas{client?` · Cliente: ${client}`:''}</p>{reportAnalyses().map(item=><section key={analysisClass(item)}><h4>Clase {analysisClass(item)}</h4>{item.conclusion?<><strong>{item.conclusion.title}</strong>{item.conclusion.paragraphs.map((p,i)=><p key={i}>{p}</p>)}<small>{item.conclusion.source==='author'?'Conclusión del abogado':'Conclusión redactada con OpenRouter para revisión'}</small><button type="button" disabled={reportBusy} onClick={()=>{openAnalysis(item);setExplanation(item.conclusion!.paragraphs.join('\n\n'));setRecommendation(item.conclusion!.recommendation);setEditedDecision(item.conclusion!.decision??'insufficient');setReviewed(false);}}>Editar conclusión de esta clase</button></>:<p>Conclusión pendiente de preparar y revisar.</p>}</section>)}</article></section></section><aside className="feasibility-report-aside"><section className="feasibility-export-card"><h3>Generar informe</h3><fieldset><legend>Presentación de antecedentes</legend>{(['table','cards'] as const).map(layout=><label key={layout}><input type="radio" name="report-layout" checked={reportLayout===layout} disabled={reportBusy} onChange={()=>{setReportLayout(layout);setReviewed(false);}}/>{layout==='table'?'Tabla comparativa':'Fichas con imágenes'}</label>)}</fieldset><fieldset><legend>Formato</legend><label><input type="radio" name="report-format" checked={format==='pdf'} onChange={()=>setFormat('pdf')}/>PDF</label><label><input type="radio" name="report-format" checked={format==='docx'} onChange={()=>setFormat('docx')}/>Word editable</label></fieldset><label className="feasibility-checkbox"><input type="checkbox" checked={reviewed} disabled={!completeConclusions||reportBusy} onChange={e=>setReviewed(e.target.checked)}/><span>Revisé los antecedentes y la conclusión del informe.</span></label>{!completeConclusions&&<p className="feasibility-form-help">Prepara y revisa las conclusiones de todas las clases antes de generar el informe.</p>}<button type="button" className="buho-primary" disabled={!reviewed||!completeConclusions||reportBusy} onClick={()=>void downloadReport(format)}>{reportBusy?'Preparando informe…':`Descargar ${format==='pdf'?'PDF':'Word'}`}</button></section><section className="feasibility-report-branding"><h3>Tu estudio en el informe</h3>{profile?.profile.logo&&<Image unoptimized src={profile.profile.logo} width={180} height={70} alt="Logo del estudio"/>}<strong>{profile?.profile.studioName||'Información del estudio opcional'}</strong><small>PDF y Word conservan la misma marca, antecedentes y conclusión.</small><button type="button" className="feasibility-subtle" onClick={()=>{void loadProfile().then(()=>setProfileOpen(true)).catch(()=>{});}}>Editar información del estudio</button></section></aside></div>}
    {reportError&&<p role="alert" className="similarity-error">{reportError}</p>}
    {comparison&&<ReviewDialog className="buho-drawer is-wide feasibility-compare-dialog" title="Revisión de factibilidad" eyebrow={`ANTECEDENTE · SOLICITUD ${comparison.applicationId}`} onClose={()=>setComparison(null)}>
      <div className="buho-drawer-scroll buho-drawer-match">
        <div className="buho-match-summary"><strong className="feasibility-result-score">{Math.round(comparison.score*100)}%</strong><div><strong>{comparison.name}</strong><small>{comparison.status}</small></div><a className="buho-inapi-link" href="https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx" target="_blank" rel="noreferrer">Ver en INAPI ↗</a></div>
        <p className="buho-work-note">Compara la denominación, el logo y las coberturas. El índice de similitud no representa una probabilidad de conflicto.</p>
        <TrademarkComparison left={{label:'MARCA PROPUESTA',name:executedQuery?.name||'Marca figurativa',image:executed?.image||result?.query.image||'',rows:[
          {label:'Denominación',value:executedQuery?.name||'Marca figurativa'},
          {label:'Clases de Niza',value:executedQuery?.coverage.map(c=>c.nice_class).join(', ')||'Sin clases indicadas'},
          {label:'Cobertura',value:executedQuery?.coverage.map(c=>`Clase ${c.nice_class}: ${c.text||'No definida'}`).join('; ')||'No definida'},
        ]}} right={{label:'ANTECEDENTE ENCONTRADO',name:comparison.name,image:comparison.image,applicationId:comparison.applicationId,rows:[
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
