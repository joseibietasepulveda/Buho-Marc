"use client";
import { useState, type FormEvent } from "react";
import { ReviewDialog } from "./review-dialog";
import { statusLabel, type SourceRecord } from "@/lib/source-contract";
import type { OppositionProceeding } from "@/lib/opposition";
import { displayWorkDate } from "@/lib/work-priorities";
import "./pilot.css";
export function OppositionForm({ ownRecords, name, onClose, onSaved }: { ownRecords: { id: string; name: string }[]; name: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [record, setRecord] = useState<SourceRecord>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState<Record<string, string>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries([...new FormData(event.currentTarget)].map(([k,v]) => [k,String(v)]).filter(([,v]) => v.trim()));
    const confirm = !!record && JSON.stringify(values) === JSON.stringify(input);
    try {
      const response = await fetch("/api/oppositions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, confirm }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      if (confirm) { await onSaved(); onClose(); } else { setInput(values); setRecord(result.record); }
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); }
    finally { setBusy(false); }
  }
  return <ReviewDialog title="Oposición presentada" className="pilot-dialog" onClose={() => { if (!busy) onClose(); }}><form onSubmit={submit} onChange={() => setRecord(undefined)}><div className="pilot-body pilot-form"><p>Agrega la solicitud de la marca contra la que se presentó la oposición. El caso seguirá las novedades del expediente contrario.</p><label>Número de solicitud de la marca contraria<input name="applicationNumber" inputMode="numeric" pattern="[1-9][0-9]{0,8}" required disabled={busy} /></label><label>Persona o cliente oponente<input name="opponent" defaultValue={name} required minLength={2} maxLength={180} disabled={busy} /></label><label>Marca o solicitud de fundamento, si corresponde<select name="basisCode" disabled={busy}><option value="">Sin vínculo por ahora</option>{ownRecords.map(row => <option key={row.id} value={row.id}>{row.name} · {row.id}</option>)}</select></label><label>Fecha de presentación, si la tienes<input name="filedAt" type="date" disabled={busy} /></label><label>Enlace al escrito o resolución, opcional<input name="documentUrl" type="url" placeholder="https://…" disabled={busy} /></label><label>Notas<textarea name="note" rows={3} maxLength={3000} disabled={busy} /></label>{record && <section className="pilot-preview"><h3>Expediente encontrado</h3><strong>{record.name}</strong><p>Titular: {record.owner}<br />Solicitud: {record.applicationNumber}<br />Estado: {statusLabel(record.status)}</p><p>Confirma que esta es la marca contraria. Se creará una tarea para revisar la oposición y sus antecedentes.</p></section>}{error && <p role="alert" className="task-error">{error}</p>}</div><footer><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="buho-primary" disabled={busy}>{busy ? "Consultando…" : record ? "Crear caso y seguir expediente" : "Consultar expediente"}</button></footer></form></ReviewDialog>;
}
export function OppositionDetails({ proceeding, onOpenApplication }: { proceeding: OppositionProceeding; onOpenApplication?: (id: string) => void }) {
  const [showHistory,setShowHistory] = useState(false);
  const record = proceeding.record;
  const received = proceeding.role === "respondent";
  return <section className="buho-case-section opposition-details">
    <OppositionBadge role={proceeding.role}/><h3>{received ? "Nuestra solicitud con oposición" : "Expediente de la marca impugnada"}</h3><button type="button" className="opposition-history-button" onClick={()=>setShowHistory(true)}>Ver historial de {record.name} →</button>
    <dl>
      <dt>Oponente</dt><dd>{proceeding.opponent}</dd>
      <dt>{received ? "Nuestra solicitud" : "Marca contraria"}</dt><dd>{record.name} · Solicitud {record.applicationNumber}</dd>
      <dt>{received ? "Titular de nuestra solicitud" : "Titular de la marca contraria"}</dt><dd>{record.owner}</dd>
      <dt>Estado del expediente</dt><dd>{statusLabel(record.status)}</dd>
      <dt>{received ? "Solicitud vinculada" : "Fundamento vinculado"}</dt><dd>{received ? proceeding.applicationCode : proceeding.basisName ?? "Sin vínculo"}</dd>
      <dt>Presentación de la oposición</dt><dd>{proceeding.filedAt ?? "Ver actuaciones del expediente"}</dd>
    </dl>
    {received && proceeding.applicationCode && onOpenApplication && <button type="button" onClick={() => onOpenApplication(proceeding.applicationCode!)}>Ver solicitud vinculada →</button>}
    {proceeding.note && <p>{proceeding.note}</p>}
    {proceeding.documentUrl && <a href={proceeding.documentUrl} target="_blank" rel="noreferrer">Abrir respaldo ↗</a>}
    <p>{received ? "La solicitud permanece en Solicitudes de registro. Este caso comparte su seguimiento y sus avisos. Las novedades generan una tarea de revisión; verifica los plazos y la notificación en la solicitud vinculada." : "Las novedades generan una tarea de revisión. Los plazos del oponente requieren verificar la actuación y su notificación; las obligaciones de la parte solicitante no se asignan a este caso."}</p>
    {showHistory && <ReviewDialog title={`Historial · ${record.name}`} className="pilot-dialog" onClose={()=>setShowHistory(false)}><div className="pilot-body"><OppositionHistory proceeding={proceeding}/></div><footer><button type="button" onClick={()=>setShowHistory(false)}>Cerrar historial</button></footer></ReviewDialog>}
  </section>;
}

export function OppositionBadge({role}:{role:OppositionProceeding["role"]}) {
  const received=role==="respondent";
  return <span className={`opposition-role-badge ${received ? "is-received" : "is-presented"}`}><span aria-hidden>{received ? "↙" : "↗"}</span>{received ? "Oposición recibida" : "Oposición presentada"}</span>;
}
export function OppositionHistory({proceeding}:{proceeding:OppositionProceeding}) {
  const record=proceeding.record;
  const events=[...((record.inapi?.events??[]) as {event_id?:string;event_date?:string;status_description?:string;observation?:string}[])].sort((a,b)=>(a.event_date??"").localeCompare(b.event_date??""));
  return <section className="opposition-history"><p><strong>{record.name}</strong> · Solicitud {record.applicationNumber}</p><p>Actuaciones disponibles en INAPI / DeQuiénEs, de la más antigua a la más reciente.</p>{events.length ? <ol>{events.map((event,index)=><li key={`${event.event_id}-${index}`}><time>{displayWorkDate(event.event_date??"")}</time><strong>{event.status_description || "Actuación del expediente"}</strong>{event.observation && <p>{event.observation}</p>}</li>)}</ol> : <p>No hay historial disponible en la fuente. Esto no significa que el expediente no tenga actuaciones.</p>}<a href="https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx" target="_blank" rel="noreferrer">Consultar expediente oficial en INAPI ↗</a></section>;
}
