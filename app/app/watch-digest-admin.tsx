'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import './watch-digest.css';
type Run = {id:string;status:string;trigger:string;created_at:string;evaluated:number;selected:number;available:number;failures:number;filtered_low_score:number;cursor:number;error?:string;confirmed_cost:number;unconfirmed_reserve:number;resend_id?:string;delivery_uncertain:boolean;has_payload:boolean;has_email:boolean};
type Data = {organizations:{id:string;name:string}[];organizationId?:string;enabled:boolean;nextRun:string;recipient:string;problems:string[];runs:Run[]};
const date = (value:string) => new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
const labels: Record<string,string> = {prepared:'Piloto preparado · correo pendiente',queued:'En cola',running:'Evaluando',sending:'Enviando',retry:'Reintentando envío',sent:'Aceptado por Resend',failed:'Requiere atención',uncertain:'Envío por confirmar'};
export function WatchDigestAdmin() {
  const [data,setData] = useState<Data|null>(null), [org,setOrg] = useState(''), [busy,setBusy] = useState(false), [error,setError] = useState(''), [message,setMessage] = useState('');
  const requestId = useRef<string|null>(null);
  const load = useCallback(async () => {
    try { const r=await fetch(`/api/watch/digest/admin${org ? `?organizationId=${org}` : ''}`,{cache:'no-store'}); const p=await r.json(); if (!r.ok) throw new Error(p.message); setData(p); }
    catch(e) { setError(e instanceof Error ? e.message : 'No se pudo cargar el resumen'); }
  },[org]);
  useEffect(() => { const initial=setTimeout(() => void load(),0); const timer=setInterval(() => {if(document.visibilityState==='visible') void load();},10000); return () => {clearTimeout(initial);clearInterval(timer);}; },[load]);
  async function execute(id?:string) {
    setBusy(true);setError('');setMessage('');
    requestId.current ??= crypto.randomUUID();
    try {
      const r=await fetch('/api/watch/digest/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(id ? {action:'retry',organizationId:data?.organizationId,id} : {action:'run',organizationId:data?.organizationId,requestId:requestId.current})});
      const p=await r.json();if(!r.ok) throw new Error(p.message);
      requestId.current=null;setMessage(id ? 'Se retomará el mismo correo, sin repetir la evaluación.' : 'Resumen en cola. Se analizarán hasta 150 cruces nuevos y se enviará a hola@rcirculo.com.');await load();
    } catch(e) {setError(e instanceof Error ? e.message : 'No se pudo iniciar');} finally {setBusy(false);}
  }
  const active=data?.runs.some(r => ['queued','running','retry','sending'].includes(r.status));
  return <section className="digest-admin" aria-labelledby="digest-admin-title"><header><div><small>CORREO SEMANAL</small><h2 id="digest-admin-title">Las marcas y gestiones que merecen atención</h2><p>Lunes a las 08:30 · Chile. Hasta cinco cruces nuevos por marca, con similitud del algoritmo de al menos 25%.</p></div><button className="buho-primary" disabled={busy || !data?.organizationId || !!data.problems.length || active} onClick={() => void execute()}>{busy ? 'Preparando…' : active ? 'Resumen en curso' : 'Ejecutar resumen · hasta 150 cruces'}</button></header>
    <div className="digest-admin-settings"><label>Estudio<select value={data?.organizationId ?? ''} onChange={e => {setOrg(e.target.value);setMessage('');requestId.current=null;}}>{data?.organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label><p>Destino de prueba: <strong>{data?.recipient ?? 'hola@rcirculo.com'}</strong><br />{data?.enabled ? `Próximo envío: ${date(data.nextRun)}` : 'Envío automático desactivado'}</p></div>
    {!!data?.problems.length && <p className="digest-notice">Para comenzar falta: {data.problems.join(', ')}.</p>}{error && <p role="alert" className="source-error">{error}</p>}{message && <p role="status">{message}</p>}
    <p className="digest-small">El correo muestra hasta ocho cruces y ocho tareas o plazos de los próximos 14 días. También se envía si no hay nuevas alertas. No vuelve a consultar DeQuiénEs.</p>
    <div className="digest-history">{data?.runs.map(r => <details key={r.id}><summary><strong>{date(r.created_at)}</strong> · {labels[r.status] ?? r.status} · {r.evaluated}/{r.selected} evaluados</summary><p>{r.available} cruces elegibles al comenzar · {r.filtered_low_score} excluidos por similitud inferior a 25% · {r.failures} evaluaciones incompletas · costo confirmado US$ {Number(r.confirmed_cost).toFixed(6)}{r.unconfirmed_reserve > 0 ? ` · reserva por cargos sin confirmar US$ ${Number(r.unconfirmed_reserve).toFixed(6)}` : ''}</p>{r.error && <p>{r.error}</p>}<div className="digest-actions">{r.has_payload && <a href={`/app/resumen-semanal?run=${r.id}&organizationId=${data.organizationId}`}>Abrir resumen completo →</a>}{r.has_email && ['failed','uncertain'].includes(r.status) && <button disabled={busy || active || !!data.problems.length} onClick={() => void execute(r.id)}>Reintentar correo</button>}</div>{r.resend_id && <small>Referencia en Resend: {r.resend_id}. La aceptación no confirma entrega en la bandeja.</small>}</details>)}</div>
  </section>;
}
