'use client';
import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { AGENDA_CATEGORIES } from '@/lib/agenda';
import type { DigestPayload } from '@/lib/watch-digest';
import '../watch-digest.css';
const date = (value:string) => new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'medium'}).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value));
function Summary() {
  const params=useSearchParams(); const id=params.get('run'), org=params.get('organizationId');
  const [payload,setPayload]=useState<DigestPayload|null>(null),[error,setError]=useState(''),[phase,setPhase]=useState('');
  useEffect(() => {
    const controller=new AbortController();
    const query=new URLSearchParams();if(id) query.set('run',id);if(org) query.set('organizationId',org);
    void fetch(`/api/watch/digest?${query}`,{signal:controller.signal,cache:'no-store'}).then(async r => {const data=await r.json();if(!r.ok) throw new Error(data.message);setPayload(data.payload);setPhase(data.status);}).catch(e => {if(!controller.signal.aborted)setError(e instanceof Error ? e.message : 'No se pudo cargar');});
    return () => controller.abort();
  },[id,org]);
  const image=(key?:string) => key ? `/api/watch/digest/image/${key}${org ? `?organizationId=${encodeURIComponent(org)}` : ''}` : undefined;
  if(error) return <main className="digest-page"><a href="/app">← Volver a la plataforma</a><p role="alert">{error}</p></main>;
  if(!payload) return <main className="digest-page"><p>Cargando resumen…</p></main>;
  return <main className="digest-page"><a href="/app">← Volver a Buho Marc</a><h1>Tu resumen semanal</h1><p>{payload.organizationName} · Generado el {date(payload.generatedAt)}</p><nav className="digest-tabs"><a href="#marcas">{payload.crosses.length} coincidencias</a><a href="#agenda">{payload.agenda.length} tareas y plazos</a></nav>
    {(payload.limited || payload.failures>0) && <p className="digest-notice">Se evaluaron {payload.evaluated} de {payload.available} cruces pendientes. {payload.failures>0 && `${payload.failures} evaluaciones no se completaron.`} Los cruces sin decisión se conservan para próximas ejecuciones.</p>}
    {phase==='prepared' && <p className="digest-notice">Vista de prueba: este correo todavía no se ha enviado.</p>}
    <section id="marcas"><h2>Marcas para revisar</h2>{payload.crosses.length ? <div className="digest-scroll"><table><thead><tr><th>Marca vigilada</th><th>Solicitud a revisar</th><th>Qué revisar</th></tr></thead><tbody>{payload.crosses.map(c => <tr key={c.matchId}><td><strong>{c.reference.name}</strong>{c.referenceImage && <Image src={image(c.referenceImage)!} width={160} height={105} unoptimized alt={c.reference.name}/>}<p>Solicitud {c.reference.applicationId}<br/>{c.reference.status}</p><div className="coverage">{c.reference.classes.map(n => `Clase ${n.nice_class}: ${n.coverage_text || 'Cobertura no informada'}`).join('\n')}</div></td><td><strong>{c.candidate.name}</strong>{c.candidateImage && <Image src={image(c.candidateImage)!} width={160} height={105} unoptimized alt={c.candidate.name}/>}<p>Solicitud {c.candidate.applicationId}<br/>{c.candidate.status}</p><div className="coverage">{c.candidate.classes.map(n => `Clase ${n.nice_class}: ${n.coverage_text || 'Cobertura no informada'}`).join('\n')}</div></td><td><p>{c.reason}</p>{c.insufficient && <p className="digest-notice">Antecedentes por confirmar</p>}<p className="digest-small">Similitud del algoritmo: {(c.score*100).toFixed(1)}%. Es un índice de semejanza.</p></td></tr>)}</tbody></table></div> : <p className="digest-empty">No se seleccionaron nuevas coincidencias para revisar.</p>}</section>
    <section id="agenda"><h2>Próximos 14 días</h2><p>Del {date(payload.from)} al {date(payload.through)}. Este resumen conserva los antecedentes del momento del envío.</p>{payload.agenda.length ? <div className="digest-scroll"><table><thead><tr><th>Fecha</th><th>Tarea o plazo</th><th>Marca / expediente</th></tr></thead><tbody>{payload.agenda.map(e => <tr key={e.id}><td>{date(e.date!)}</td><td><strong>{e.title}</strong><p>{AGENDA_CATEGORIES[e.category]}</p>{e.detail && <p className="coverage">{e.detail}</p>}</td><td>{e.context}{e.owner && <p>{e.owner}</p>}<p><a href={e.entityType==='case' ? '/app#cases' : '/app#registrations'}>Abrir {e.entityType==='case' ? 'casos' : 'tramitación'} →</a></p></td></tr>)}</tbody></table></div> : <p className="digest-empty">No hay tareas con fecha o plazos pendientes en este período.</p>}</section>
    <p className="digest-small">{payload.sourceReviewedAt && `Última revisión guardada: ${date(payload.sourceReviewedAt)}. `}Verifica el estado y el plazo aplicable antes de adoptar una acción jurídica.</p>
  </main>;
}
export default function DigestPage(){return <Suspense fallback={<main className="digest-page">Cargando resumen…</main>}><Summary/></Suspense>;}
