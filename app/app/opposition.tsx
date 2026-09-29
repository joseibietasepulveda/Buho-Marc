"use client";
import { useState, type FormEvent } from "react";
import { ReviewDialog } from "./review-dialog";
import { statusLabel, type SourceRecord } from "@/lib/source-contract";
import { proceedingLabel, type OppositionProceeding } from "@/lib/opposition";
import { displayWorkDate } from "@/lib/work-priorities";
import "./pilot.css";
export function OppositionForm({ ownRecords, onClose, onSaved }: { ownRecords: { id: string; name: string }[]; onClose: () => void; onSaved: () => Promise<void> }) {
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
  return <ReviewDialog title="Agregar oposición o nulidad" className="pilot-dialog" onClose={() => { if (!busy) onClose(); }}><form onSubmit={submit} onChange={() => setRecord(undefined)}><div className="pilot-body pilot-form"><p>Selecciona el tipo de acción y el rol de tu cliente. Consulta el expediente antes de confirmar su seguimiento.</p><label>Tipo de acción<select name="type" required disabled={busy}><option value="opposition">Oposición</option><option value="nullity">Nulidad</option></select></label><label>Rol del cliente<select name="role" required defaultValue="" disabled={busy}><option value="" disabled>Seleccionar rol</option><option value="opponent">Presenta la acción</option><option value="respondent">Defiende la marca</option></select></label><label>Número de solicitud del expediente<input name="applicationNumber" inputMode="numeric" pattern="[1-9][0-9]{0,8}" required disabled={busy} /></label><label>Cliente, opcional<input name="opponent" placeholder="Cliente por confirmar" maxLength={180} disabled={busy} /></label><label>Marca o solicitud de fundamento, si corresponde<select name="basisCode" disabled={busy}><option value="">Sin vínculo por ahora</option>{ownRecords.map(row => <option key={row.id} value={row.id}>{row.name} · {row.id}</option>)}</select></label><label>Fecha de presentación, si la tienes<input name="filedAt" type="date" disabled={busy} /></label><label>Enlace al escrito o resolución, opcional<input name="documentUrl" type="url" placeholder="https://…" disabled={busy} /></label><label>Notas<textarea name="note" rows={3} maxLength={3000} disabled={busy} /></label>{record && <section className="pilot-preview"><h3>Expediente encontrado</h3><strong>{record.name}</strong><p>Titular: {record.owner}<br />Solicitud: {record.applicationNumber}<br />Estado: {statusLabel(record.status)}</p><p>Confirma que este es el expediente correcto. Se creará el caso y una tarea de revisión. Los plazos se confirman por separado según las actuaciones y notificaciones.</p></section>}{error && <p role="alert" className="task-error">{error}</p>}</div><footer><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="buho-primary" disabled={busy}>{busy ? "Consultando…" : record ? "Crear caso y seguir expediente" : "Consultar expediente"}</button></footer></form></ReviewDialog>;
}
export function OppositionDetails({ proceeding, onOpenApplication }: { proceeding: OppositionProceeding; onOpenApplication?: (id: string) => void }) {
  const [showHistory,setShowHistory] = useState(false);
  const record = proceeding.record;
  const received = proceeding.role === "respondent";
  return <section className="buho-case-section opposition-details">
    <OppositionBadge role={proceeding.role} type={proceeding.type}/><h3>{received ? "Expediente de la marca defendida" : "Expediente de la marca impugnada"}</h3><button type="button" className="opposition-history-button" onClick={()=>setShowHistory(true)}>Ver historial de {record.name} →</button>
    <dl>
      <dt>{proceeding.clientName ? "Cliente" : "Oponente"}</dt><dd>{proceeding.clientName ?? proceeding.opponent}</dd>
      <dt>{received ? "Marca defendida" : "Marca contraria"}</dt><dd>{record.name} · Solicitud {record.applicationNumber}</dd>
      <dt>{received ? "Titular de la marca defendida" : "Titular de la marca contraria"}</dt><dd>{record.owner}</dd>
      <dt>Estado del expediente</dt><dd>{statusLabel(record.status)}</dd>
      <dt>{received ? "Solicitud vinculada" : "Fundamento vinculado"}</dt><dd>{received ? proceeding.applicationCode ?? "Sin vínculo" : proceeding.basisName ?? "Sin vínculo"}</dd>
      <dt>Presentación de la acción</dt><dd>{proceeding.filedAt ?? "Ver actuaciones del expediente"}</dd>
    </dl>
    {received && proceeding.applicationCode && onOpenApplication && <button type="button" onClick={() => onOpenApplication(proceeding.applicationCode!)}>Ver solicitud vinculada →</button>}
    {proceeding.note && <p>{proceeding.note}</p>}
    {proceeding.documentUrl && <a href={proceeding.documentUrl} target="_blank" rel="noreferrer">Abrir respaldo ↗</a>}
    <p>{received && proceeding.applicationCode ? "La solicitud permanece en Solicitudes de registro. Este caso comparte su seguimiento y sus avisos. Las novedades generan una tarea de revisión; verifica los plazos y la notificación en la solicitud vinculada." : "Las novedades generan una tarea de revisión. Verifica los plazos según la acción, el rol del cliente y la notificación de cada actuación."}</p>
    {showHistory && <ReviewDialog title={`Historial · ${record.name}`} className="pilot-dialog" onClose={()=>setShowHistory(false)}><div className="pilot-body"><OppositionHistory proceeding={proceeding}/></div><footer><button type="button" onClick={()=>setShowHistory(false)}>Cerrar historial</button></footer></ReviewDialog>}
  </section>;
}

export function OppositionBadge({role,type}:{role:OppositionProceeding["role"];type?:OppositionProceeding["type"]}) {
  const received=role==="respondent";
  return <span className={`opposition-role-badge ${received ? "is-received" : "is-presented"}`}><span aria-hidden>{received ? "↙" : "↗"}</span>{proceedingLabel({role,type})}</span>;
}
export function OppositionHistory({proceeding}:{proceeding:OppositionProceeding}) {
  const record=proceeding.record;
  const events=[...((record.inapi?.events??[]) as {event_id?:string;event_date?:string;status_description?:string;observation?:string}[])].sort((a,b)=>(a.event_date??"").localeCompare(b.event_date??""));
  return <section className="opposition-history"><p><strong>{record.name}</strong> · Solicitud {record.applicationNumber}</p><p>Actuaciones disponibles en INAPI / DeQuiénEs, de la más antigua a la más reciente.</p>{events.length ? <ol>{events.map((event,index)=><li key={`${event.event_id}-${index}`}><time>{displayWorkDate(event.event_date??"")}</time><strong>{event.status_description || "Actuación del expediente"}</strong>{event.observation && <p>{event.observation}</p>}</li>)}</ol> : <p>No hay historial disponible en la fuente. Esto no significa que el expediente no tenga actuaciones.</p>}<a href="https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx" target="_blank" rel="noreferrer">Consultar expediente oficial en INAPI ↗</a></section>;
}
