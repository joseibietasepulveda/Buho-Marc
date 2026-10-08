"use client";
import { useId, useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown } from '@phosphor-icons/react';
import type { WatchFeedbackValue } from '@/lib/watch-feedback';

export function WatchFeedback({matchId,initial}:{matchId:string;initial?:WatchFeedbackValue}){
 const [value,setValue]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [text,setText]=useState(initial?.rationale||''),[savedComment,setSavedComment]=useState(false);
 const saving=useRef(false),commentId=useId();
 async function save(vote:'up'|'down',rationale?:string){
  // Update the choice before waiting for persistence; keep the draft on all failures.
  if(saving.current)return;
  saving.current=true;setBusy(true);setError('');setSavedComment(false);
  setValue(current=>({vote,rationale:current?.rationale||'',delivery:'pending'}));
  try{
   const response=await fetch('/api/watch/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matchId,vote,...(rationale!==undefined?{rationale}:{})})});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.message||'No pudimos guardar tu valoración.');
   setValue(payload.feedback);setSavedComment(rationale!==undefined);
  }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos guardar tu valoración.');}
  finally{saving.current=false;setBusy(false);}
 }
 return <div className="watch-rating">
  <div className="watch-rating-controls">
   <button type="button" className={value?.vote==='up'?'is-positive':''} disabled={busy} aria-label="Esta coincidencia me interesa" aria-pressed={value?.vote==='up'} onClick={()=>void save('up')}><ThumbsUp size={21} weight={value?.vote==='up'?'fill':'regular'} aria-hidden/></button>
   <button type="button" className={value?.vote==='down'?'is-negative':''} disabled={busy} aria-label="Esta coincidencia no me interesa" aria-pressed={value?.vote==='down'} onClick={()=>void save('down')}><ThumbsDown size={21} weight={value?.vote==='down'?'fill':'regular'} aria-hidden/></button>
   <span>Ayúdanos a mostrarte lo que te interesa</span>
  </div>
  {value&&<form className="watch-rating-comment" onSubmit={event=>{event.preventDefault();void save(value.vote,text);}}>
   <label htmlFor={commentId}>Explícanos por qué <span>(opcional)</span></label>
   <textarea id={commentId} value={text} maxLength={2000} rows={3} onChange={event=>{setText(event.target.value);setSavedComment(false);}} placeholder="¿Qué te parece relevante o poco útil de esta coincidencia?"/>
   <div className="watch-rating-comment-actions"><small role="status">{busy?'Guardando…':error?'Valoración sin guardar':savedComment&&text.trim()===value.rationale?'Comentario guardado':'Valoración guardada'}</small><button type="submit" className="buho-primary" disabled={busy}>{busy?'Guardando…':'Enviar'}</button></div>
  </form>}
  {error&&<div className="watch-rating-error" role="alert"><p>{error} Tu comentario sigue aquí. Puedes volver a enviarlo.</p><button type="button" disabled={busy} onClick={()=>value&&void save(value.vote,text)}>Reintentar guardado</button></div>}
 </div>;
}
