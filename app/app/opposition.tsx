"use client";
import { useState, type FormEvent } from "react";
import { BrandCombobox } from "./brand-combobox";
import { ReviewDialog } from "./review-dialog";
import { statusLabel, type SourceRecord } from "@/lib/source-contract";
import { proceedingLabel, type OppositionProceeding } from "@/lib/opposition";
import { displayWorkDate } from "@/lib/work-priorities";
import "./pilot.css";
export function OppositionForm({ ownRecords, onClose, onSaved }: { ownRecords: { id: string; name: string; applicationNumber?: string }[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [basisCode, setBasisCode] = useState("");
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
  return <ReviewDialog title="Agregar oposición o nulidad" className="pilot-dialog" onClose={() => { if (!busy) onClose(); }}><form onSubmit={submit} onChange={() => setRecord(undefined)}><div className="pilot-body pilot-form"><p>Selecciona el tipo de acción y el rol de tu cliente. Consulta el expediente antes de confirmar su seguimiento.</p><label>Tipo de acción<select name="type" required disabled={busy}><option value="opposition">Oposición</option><option value="nullity">Nulidad</option></select></label><label>Rol del cliente<select name="role" required defaultValue="" disabled={busy}><option value="" disabled>Seleccionar rol</option><option value="opponent">Presenta la acción</option><option value="respondent">Defiende la marca</option></select></label><label>Número de solicitud del expediente<input name="applicationNumber" inputMode="numeric" pattern="[1-9][0-9]{0,8}" required disabled={busy} /></label><label>Cliente, opcional<input name="opponent" placeholder="Cliente por confirmar" maxLength={180} disabled={busy} /></label><label htmlFor="opposition-basis">Marca o solicitud de fundamento, si corresponde<BrandCombobox inputId="opposition-basis" name="basisCode" label="Marca o solicitud de fundamento" disabled={busy} options={[{ value: "", label: "Sin vínculo por ahora" }, ...ownRecords.map(row => ({ value: row.id, label: `${row.name}${row.applicationNumber ? ` · Solicitud ${row.applicationNumber}` : ""}` }))]} value={basisCode} onChange={value => { setBasisCode(value); setRecord(undefined); }}/></label><label>Fecha de presentación, si la tienes<input name="filedAt" type="date" disabled={busy} /></label><label>Enlace al escrito o resolución, opcional<input name="documentUrl" type="url" placeholder="https://…" disabled={busy} /></label><label>Notas<textarea name="note" rows={3} maxLength={3000} disabled={busy} /></label>{record && <section className="pilot-preview"><h3>Expediente encontrado</h3><strong>{record.name}</strong><p>Titular: {record.owner}<br />Solicitud: {record.applicationNumber}<br />Estado: {statusLabel(record.status)}</p><p>Confirma que este es el expediente correcto. Se creará el caso y una tarea de revisión. Los plazos se confirman por separado según las actuaciones y notificaciones.</p></section>}{error && <p role="alert" className="task-error">{error}</p>}</div><footer><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="buho-primary" disabled={busy}>{busy ? "Consultando…" : record ? "Crear caso y seguir expediente" : "Consultar expediente"}</button></footer></form></ReviewDialog>;
}
export function OppositionDetails({ proceeding, onOpenApplication }: { proceeding: OppositionProceeding; onOpenApplication?: (id: string) => void }) {
  const [showHistory,setShowHistory] = useState(false);
  const record = proceeding.record;
  const received = proceeding.role === "respondent";
  return <section className="buho-case-section opposition-details">
    <header className="opposition-dossier-header"><OppositionBadge role={proceeding.role} type={proceeding.type}/><div><h3>{received ? "Expediente de la marca defendida" : "Expediente de la marca impugnada"}</h3><button type="button" className="opposition-history-button" onClick={() => setShowHistory(true)}>Ver historial →</button></div></header>
    <table className="opposition-dossier-table"><tbody>{[
      [proceeding.clientName ? "Cliente" : "Oponente", proceeding.clientName ?? proceeding.opponent],
      [received ? "Marca defendida" : "Marca contraria", record.name],
      ["Número de solicitud", record.applicationNumber],
      ["Número de registro", record.registrationNumber || "No informado"],
      [received ? "Titular de la marca defendida" : "Titular de la marca contraria", record.owner],
      ["Estado del expediente", statusLabel(record.status)],
      [received ? "Solicitud vinculada" : "Fundamento vinculado", received ? proceeding.applicationCode ? `Solicitud ${record.applicationNumber}` : "Sin vínculo" : proceeding.basisName ?? "Sin vínculo"],
      ["Presentación de la acción", proceeding.filedAt ? displayWorkDate(proceeding.filedAt) : "Ver actuaciones del expediente"],
    ].map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value || "No informado por la fuente"}</td></tr>)}</tbody></table>
    <div className="opposition-dossier-actions">{received && proceeding.applicationCode && onOpenApplication && <button type="button" className="opposition-history-button" onClick={() => onOpenApplication(proceeding.applicationCode!)}>Ver solicitud vinculada →</button>}{proceeding.documentUrl && <a href={proceeding.documentUrl} target="_blank" rel="noreferrer">Abrir respaldo ↗</a>}</div>
    {proceeding.note && <p>{proceeding.note}</p>}
    <p className="opposition-dossier-note">{received && proceeding.applicationCode ? "La solicitud comparte su seguimiento y sus avisos con este caso. Revisa sus actuaciones para confirmar plazos y notificaciones." : "Las novedades generan una tarea de revisión. Confirma los plazos según la acción, el rol del cliente y la notificación de cada actuación."}</p>
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
