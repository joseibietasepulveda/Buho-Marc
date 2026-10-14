'use client';
import {useEffect,useState} from 'react';
import type {AdminDashboardReport,AnalyticsScope} from '@/lib/admin-analytics';
import {evaluationDecision,type EvaluationFilter,type EvaluationsPage} from '@/lib/admin-evaluations';
import {date,downloadCsv,number} from './format';
import {Empty,Icon,Panel,Pill,Table} from './visuals';

export function Evaluations({scope,report,allHistory=false}:{scope:AnalyticsScope;report:AdminDashboardReport;allHistory?:boolean}){
 const [filters,setFilters]=useState<EvaluationFilter>({page:1,pageSize:40,search:'',source:'all',outcome:'all',focus:'all',matchId:null,allDates:allHistory,asOf:null});
 const [search,setSearch]=useState(''),[data,setData]=useState<EvaluationsPage|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>{
   setLoading(true);setError('');
   const query=new URLSearchParams({from:scope.from,to:scope.to,page:String(filters.page),pageSize:String(filters.pageSize),search:filters.search,source:filters.source,outcome:filters.outcome,focus:filters.focus,allDates:String(filters.allDates)});
   if(filters.asOf)query.set('asOf',filters.asOf);
   if(scope.organizationId)query.set('organizationId',scope.organizationId);if(scope.userId)query.set('userId',scope.userId);if(filters.matchId)query.set('matchId',filters.matchId);
   void fetch(`/api/admin/evaluations?${query}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{const payload=await response.json();if(!response.ok)throw new Error(payload.message??'No se pudieron cargar las evaluaciones.');if(!controller.signal.aborted)setData(payload);}).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'No se pudo cargar.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  },0);
  return()=>{controller.abort();clearTimeout(timer);};
 },[scope,filters,revision]);
 const set=(patch:Partial<EvaluationFilter>)=>{setData(null);setFilters(current=>({...current,asOf:patch.page?data?.filters.asOf??null:null,...patch,page:patch.page??1}));};
 function csv(){if(!data)return;downloadCsv(`buho-evaluaciones-pagina-${data.page}.csv`,[
  ['Evaluaciones · página',data.page,'Registros filtrados',data.total],['Fechas',filters.allDates?'Todo el historial':`${scope.from} — ${scope.to}`],
  ['Fecha del registro','Estudio','Abogado','Marca protegida','Candidata','Solicitud protegida','Solicitud candidata','Origen','Tipo','Decisión','Decisión anterior','Cambio de opinión','Comentario','Comentario anterior','Motivo','Motivo anterior','Similitud algoritmo %','Índice de la evaluación','Estado parcial'],
  ...data.rows.map(row=>[row.at,row.organization,row.user??'Autor no registrado',row.reference,row.candidate,row.ownApplication,row.candidateApplication,row.source,row.kind,evaluationDecision(row.decision),row.previousDecision?evaluationDecision(row.previousDecision):'',row.opinionChanged,row.comment,row.previousComment,row.reason,row.previousReason,row.score,row.scoreAtEvaluation,row.snapshot])]);}
 return <>
  <Panel title="Evaluaciones por abogado" subtitle="Período seleccionado · decisiones formales y pulgares, sin contar las ediciones de comentario como otra decisión">
   <Table columns={['Abogado / estudio','Cruces únicos','Evaluaciones','👍 / 👎','Formales','Cambios de opinión','Comentarios agregados / editados']} rows={report.users.rows.map(user=>[<span key="name"><strong>{user.name}</strong><small>{user.organization}</small></span>,number(user.reviewedCrosses),number(user.reviews),`${number(user.thumbsUp)} / ${number(user.thumbsDown)}`,number(user.formalReviews),number(user.reviewOpinionChanges),number(user.reviewCommentUpdates)])}/>
   <p className="ad-note">Un cruce puede tener varias evaluaciones. Si dos abogados lo evalúan, cuenta una vez para cada abogado y una sola vez en el total global. Los comentarios pueden acompañar una decisión.</p>
  </Panel>
  <Panel title="Todas las evaluaciones" subtitle="Historial individual con decisiones, cambios y comentarios" action={<a className="ad-text-link" href="/app/admin/evaluaciones">Abrir vista independiente →</a>}>
   <form className="ad-evaluation-filters" onSubmit={event=>{event.preventDefault();set({search:search.trim()});}}>
    <label>Buscar marca, solicitud o comentario<input value={search} onChange={event=>setSearch(event.target.value)} maxLength={160}/></label>
    <label>Origen<select value={filters.source} onChange={event=>set({source:event.target.value as EvaluationFilter['source']})}><option value="all">Formales y pulgares</option><option value="feedback">👍 / 👎</option><option value="formal">Decisiones formales</option></select></label>
    <label>Valoración<select value={filters.outcome} onChange={event=>set({outcome:event.target.value as EvaluationFilter['outcome']})}><option value="all">Todas</option><option value="positive">Positivas</option><option value="negative">Negativas</option><option value="neutral">Sin conclusión</option></select></label>
    <label>Mostrar<select value={filters.focus} onChange={event=>set({focus:event.target.value as EvaluationFilter['focus']})}><option value="all">Todos los registros</option><option value="changes">Cambios de opinión</option><option value="comments">Con comentarios o motivos</option></select></label>
    <button className="ad-button" type="submit">Buscar</button>
    <label className="ad-evaluation-all"><input type="checkbox" checked={filters.allDates} onChange={event=>set({allDates:event.target.checked})}/>Ver todo el historial, sin límite de fechas</label>
   </form>
   {filters.matchId&&<p className="ad-note">Historial del cruce dentro del estudio y abogado seleccionados. <button className="ad-inline-button" onClick={()=>set({matchId:null})}>Ver todos los cruces</button></p>}
   {error&&<p className="ad-alert ad-alert-error" role="alert">{error} <button className="ad-inline-button" onClick={()=>setRevision(n=>n+1)}>Reintentar</button></p>}
   <div className="ad-evaluation-toolbar"><button className="ad-button" disabled={loading} onClick={()=>set({page:1,asOf:null})}>Actualizar historial</button><span role="status">{loading?'Cargando evaluaciones…':`${number(data?.total)} registros · ${filters.allDates?'todo el historial':'período seleccionado'}`}</span><button className="ad-button" disabled={loading||!data?.rows.length} onClick={csv}><Icon name="download"/>Descargar esta página</button></div>
   <div aria-busy={loading}>
   {data&&<Table initialLimit={100} columns={['Fecha / abogado','Cruce','Evaluación','Comentarios y motivos','']} rows={data.rows.map(row=>[
    <span key="who"><strong>{date(row.at,true)}</strong><small>{row.user??'Autor no registrado'}</small><small>{row.organization}</small>{row.snapshot&&<Pill tone="sand">Fecha de actualización · historial parcial</Pill>}</span>,
    <span key="cross"><strong>{row.reference??'Marca no disponible'} / {row.candidate??'Candidata no disponible'}</strong><small>{row.ownApplication??'Sin solicitud'} → {row.candidateApplication??'Sin solicitud'}</small>{row.score!=null&&<small>Algoritmo: {row.score.toFixed(1)}% · {row.scoreAtEvaluation?'guardado al evaluar':'último índice disponible'}</small>}</span>,
    <span key="decision"><Pill tone={row.outcome==='positive'?'teal':row.outcome==='negative'?'rose':'neutral'}>{row.kind==='comment'?'Voto asociado: ':''}{evaluationDecision(row.decision)}</Pill><small>{row.source==='formal'?'Decisión formal':row.snapshot?'Estado 👍/👎 sin bitácora':'Valoración 👍/👎'}</small>{row.kind==='comment'&&<small>Solo edición de comentario</small>}{row.opinionChanged&&<><Pill tone="sand">Cambio de opinión</Pill><small>Antes: {row.previousDecision?evaluationDecision(row.previousDecision):'Sin dato'}</small></>}</span>,
    <div key="comment" className="ad-evaluation-comment">{row.comment&&<p>{row.comment}</p>}{row.reason&&<p><strong>Motivo:</strong> {row.reason}</p>}{!row.comment&&!row.reason&&<small>{row.commentChanged?'Comentario eliminado':'Sin comentario'}</small>}{row.commentChanged&&(row.previousComment||row.previousReason)&&<details><summary>Ver texto anterior</summary>{row.previousComment&&<p>{row.previousComment}</p>}{row.previousReason&&<p>{row.previousReason}</p>}</details>}</div>,
    row.matchId?<button key="history" className="ad-inline-button" onClick={()=>{setSearch('');set({matchId:row.matchId,allDates:true,source:'all',outcome:'all',focus:'all',search:''});}}>Historial del cruce</button>:<small key="history">Cruce no disponible</small>
   ])}/>}
   {!loading&&data&&!data.rows.length&&<Empty/>}
   </div>
   <div className="ad-evaluation-toolbar"><span>Página {number(data?.page??filters.page)} de {number(Math.max(1,data?.pages??1))} · {filters.pageSize} registros por página</span><div><button className="ad-button" disabled={loading||filters.page===1} onClick={()=>set({page:filters.page-1})}>← Anterior</button> <button className="ad-button" disabled={loading||!data||data.page>=data.pages} onClick={()=>set({page:filters.page+1})}>Siguiente →</button></div></div>
   <p className="ad-note">{data?.coverage??'Solo registros guardados; no se reconstruyen evaluaciones perdidas.'} Los indicadores superiores conservan el período seleccionado aunque amplíes este historial a todas las fechas. La descarga contiene únicamente la página visible. El corte se conserva al paginar para evitar desplazamientos por nuevas evaluaciones; Actualizar historial incorpora registros nuevos.</p>
  </Panel>
 </>;
}
