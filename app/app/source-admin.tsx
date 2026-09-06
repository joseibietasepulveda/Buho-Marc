"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { displayValue, fieldLabels, sourceStatuses, statusLabel, type FieldChange, type SourceRecord } from "@/lib/source-contract";

type SourceRow = { id: string; version: number; data: SourceRecord; tracked: boolean; pending: boolean };
type Run = { id: string; status: string; trigger: string; started_at: string; completed_at: string | null; requested: number; received: number; changed: number; notifications: number; error: string | null; request: { applicationIds: string[]; registrationIds: string[] }; detail: { name: string; title: string; notified: boolean; changes: FieldChange[] }[] };
type AdminData = { provider?: string; records: SourceRow[]; runs: Run[]; schedule: string; automaticEnabled: boolean };
const when = (date: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
const runLabel = (status: string) => ({ success: "Completada", failed: "Fallida", running: "En curso" }[status] ?? status);
export function ChangeTable({ changes }: { changes: FieldChange[] }) {
  return <div className="source-table-scroll"><table className="source-changes"><thead><tr><th>Antecedente</th><th>Anterior</th><th>Actual</th></tr></thead><tbody>{changes.map(c => <tr key={c.field}><th>{c.label}{c.ancillary && <small>Complementario</small>}</th><td>{c.field === "status" ? statusLabel(String(c.before)) : displayValue(c.before)}</td><td>{c.field === "status" ? statusLabel(String(c.after)) : displayValue(c.after)}</td></tr>)}</tbody></table></div>;
}
export function SourceAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false); const [tab, setTab] = useState<"records" | "runs">("records");
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState("all"); const [page, setPage] = useState(0);
  const [inspecting, setInspecting] = useState<SourceRow | null>(null);
  const [editing, setEditing] = useState<{ row: SourceRow; field: keyof SourceRecord } | null>(null);
  const load = useCallback(async () => {
    try { const r = await fetch("/api/source/admin", { cache: "no-store" }); const p = await r.json(); if (!r.ok) throw new Error(p.message); setData(p); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar la fuente"); }
  }, []);
  useEffect(() => { const initial = setTimeout(() => void load(), 0); const timer = setInterval(() => void load(), 30000); return () => { clearTimeout(initial); clearInterval(timer); }; }, [load]);
  async function advance() {
    setBusy(true); setMessage(""); setError("");
    try { const r = await fetch("/api/source/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "advance" }) }); const p = await r.json(); if (!r.ok) throw new Error(p.message); setMessage(`${p.changes.length} expedientes actualizados en la fuente. Use Revisar en Marcas registradas para detectar las novedades.`); await load(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar"); } finally { setBusy(false); }
  }
  const records = (data?.records ?? []).filter(r => (filter === "all" || filter === "tracked" && r.tracked || filter === "pending" && r.pending) && `${r.data.name} ${r.data.owner} ${r.data.applicationNumber} ${r.data.registrationNumber ?? ""}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const fields = ["name", "status", "applicationNumber", "registrationNumber", "owner", "type", "classes", "publicationDate", "expirationDate", "filingDate", "registrationDate", "statusDate", "ownerRut", "ownerCountry", "representativeName", "representativeCountry", "logo", "officialUrl"] as (keyof SourceRecord)[];
  return <section className="source-admin">
    <div className="source-summary"><div><strong>{data?.records.length ?? "—"}</strong><span>expedientes en la fuente</span></div><div><strong>{data?.records.filter(r => r.tracked).length ?? "—"}</strong><span>en la cartera</span></div><div><strong>{data?.records.filter(r => r.pending).length ?? "—"}</strong><span>con diferencias</span></div><p><b>{data?.provider === "inapi" ? "INAPI · datos reales" : "Fuente simulada"}</b><span>{data?.schedule ?? "Revisión diaria a las 12:30 de Chile"}</span><small>{data?.automaticEnabled ? "Programación automática habilitada" : "Programación automática inactiva en esta instancia"}</small></p></div>
    <div className="source-tabs" role="tablist" aria-label="Administración de la fuente"><button role="tab" aria-selected={tab === "records"} onClick={() => setTab("records")}>Gran base</button><button role="tab" aria-selected={tab === "runs"} onClick={() => setTab("runs")}>Corridas de la API</button></div>
    {error && <p className="source-error" role="alert">{error} <button onClick={() => void load()}>Reintentar</button></p>}{message && <p className="source-feedback" role="status">{message}</p>}
    {!data && !error && <p role="status">Preparando la fuente y su fotografía inicial…</p>}
    {tab === "records" && <><div className="source-toolbar"><label>Buscar expediente<input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="Marca, titular, solicitud o registro" /></label><label>Cartera<select value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}><option value="all">Todos los expedientes</option><option value="tracked">Solo cartera de la plataforma</option><option value="pending">Con diferencias pendientes</option></select></label>{data?.provider !== "inapi" && <button className="buho-primary" disabled={busy || !data} onClick={() => void advance()}>{busy ? "Actualizando…" : "Actualizar · generar 6 cambios"}</button>}</div>
      <p className="source-hint">{data?.provider === "inapi" ? "Última información recibida de INAPI. Seleccione un expediente para consultar sus actuaciones y el estado general informado por la API. Use Revisar en Marcas registradas para actualizar." : "Seleccione un parámetro para editarlo. Los cambios llegan a la plataforma en la siguiente revisión."}</p>
      <div className="source-table-scroll"><table className="source-records"><thead><tr><th>Seguimiento</th>{fields.map(f => <th key={f}>{fieldLabels[f]}</th>)}</tr></thead><tbody>{records.slice(page * 25, (page + 1) * 25).map(row => <tr key={row.id}><td><span className={`source-pill ${row.pending ? "pending" : ""}`}>{row.pending ? "Cambio pendiente" : row.tracked ? "En cartera" : "Fuera de cartera"}</span></td>{fields.map(f => <td key={f}><button className="source-cell" aria-label={`${data?.provider === "inapi" ? "Ver" : "Editar"} ${fieldLabels[f]} de ${row.data.name}`} onClick={() => data?.provider === "inapi" ? setInspecting(row) : setEditing({ row, field: f })}>{f === "status" ? statusLabel(row.data.status) : displayValue(row.data[f])}</button></td>)}</tr>)}</tbody></table></div>
      {!records.length && data && <p>No hay expedientes con estos filtros.</p>}
      <footer className="source-pagination"><span>{records.length ? page * 25 + 1 : 0}–{Math.min((page + 1) * 25, records.length)} de {records.length}</span><button disabled={!page} onClick={() => setPage(p => p - 1)}>Anterior</button><button disabled={(page + 1) * 25 >= records.length} onClick={() => setPage(p => p + 1)}>Siguiente</button></footer></>}
    {tab === "runs" && <div className="source-runs"><p>Revisiones automáticas a las 12:30 de Chile y revisiones manuales desde Marcas registradas. Se muestran las últimas 100 corridas.</p>{data?.runs.length === 0 && <p className="source-empty">Todavía no hay corridas. La fotografía inicial ya está preparada; pulse Revisar en la plataforma para comenzar.</p>}{data?.runs.map(run => <details className="source-run" key={run.id}><summary><span><b>{when(run.started_at)}</b><small>{run.trigger === "initial" ? "Carga inicial · sin notificaciones" : run.trigger === "enrollment" ? "Incorporación a cartera" : run.trigger === "manual" ? "Revisión manual" : "Revisión automática"}{run.completed_at ? ` · ${Math.max(0, Math.round((Date.parse(run.completed_at) - Date.parse(run.started_at)) / 1000))} s` : ""}</small></span><span className={`source-pill ${run.status}`}>{runLabel(run.status)}</span><span>{run.received}/{run.requested} expedientes</span><span>{run.changed} actualizados · {run.notifications} avisos</span></summary><div className="source-run-body">{run.error && <p className="source-error">{run.error}. No se aplicaron cambios de esta corrida.</p>}{run.status === "success" && !run.changed && <p>La cartera coincide con la fuente. No se generaron notificaciones nuevas.</p>}{run.detail.map((d, i) => <article key={i}><h3>{d.title}</h3><small>{d.notified ? "Notificación registrada" : "Solo actualización de antecedentes complementarios"}</small><ChangeTable changes={d.changes} /></article>)}<details><summary>Identificadores enviados a la API</summary><p>Solicitudes ({run.request.applicationIds.length}): {run.request.applicationIds.join(", ")}</p><p>Registros ({run.request.registrationIds.length}): {run.request.registrationIds.join(", ") || "Ninguno"}</p></details><small>Referencia de corrida: {run.id}</small></div></details>)}</div>}
    {inspecting && <SourceInspector row={inspecting} onClose={() => setInspecting(null)} />}
    {editing && <SourceEditor row={editing.row} field={editing.field} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); setMessage("Expediente guardado en la fuente. La próxima revisión detectará las diferencias."); await load(); }} />}
  </section>;
}

function SourceEditor({ row, field, onClose, onSaved }: { row: SourceRow; field: keyof SourceRecord; onClose: () => void; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(row.data); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); dialog.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus(); }, [field]);
  async function save(e: FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { const r = await fetch("/api/source/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "edit", id: row.id, version: row.version, data: draft }) }); const p = await r.json(); if (!r.ok) throw new Error(p.message); await onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); setBusy(false); } }
  function update(key: keyof SourceRecord, value: unknown) { setDraft(current => ({ ...current, [key]: value })); }
  return <dialog ref={dialog} className="source-editor" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }} aria-labelledby="source-editor-title"><form onSubmit={save}><header><div><small>EDITAR FUENTE SIMULADA · versión {row.version}</small><h2 id="source-editor-title">{row.data.name}</h2></div><button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar editor">×</button></header><p>La solicitud es el identificador estable. Una fecha de publicación ya informada queda fija.</p><div className="source-editor-fields">{(Object.keys(fieldLabels) as (keyof SourceRecord)[]).map(key => <label key={key}>{fieldLabels[key]}{key === "classes" ? <select multiple name={key} value={draft.classes.map(String)} onChange={e => update(key, Array.from(e.target.selectedOptions).map(o => Number(o.value)))}>{Array.from({ length: 45 }, (_, i) => <option value={i + 1} key={i}>Clase {i + 1}</option>)}</select> : key === "status" ? <select name={key} value={draft.status} onChange={e => update(key, e.target.value)}>{sourceStatuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select> : key === "type" ? <select name={key} value={draft.type} onChange={e => update(key, e.target.value)}>{["Denominativa", "Figurativa", "Mixta", "Otra"].map(t => <option key={t}>{t}</option>)}</select> : key.endsWith("Country") ? <select name={key} value={String(draft[key])} onChange={e => update(key, e.target.value)}>{[...new Set([String(draft[key]), "CHILE", "ARGENTINA", "BRASIL", "PERÚ", "COLOMBIA", "MÉXICO", "ESTADOS UNIDOS", "ESPAÑA", "CHINA", "JAPÓN", "ALEMANIA", "FRANCIA", "REINO UNIDO", "OTRO"])].map(c => <option key={c}>{c}</option>)}</select> : <input name={key} type={key.endsWith("Date") ? "date" : "text"} value={String(draft[key] ?? "")} readOnly={key === "applicationNumber" || key === "publicationDate" && Boolean(row.data.publicationDate) || key === "registrationNumber" && Boolean(row.data.registrationNumber)} onChange={e => update(key, e.target.value || (key.endsWith("Date") || key === "registrationNumber" ? null : ""))} />}</label>)}</div>{error && <p role="alert" className="source-error">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="buho-primary" disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar en la fuente"}</button></footer></form></dialog>;
}

function SourceInspector({ row, onClose }: { row: SourceRow; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const data = row.data;
  const general = data.inapi?.status as { description?: string; code?: string } | undefined;
  return <dialog ref={dialog} className="source-editor" onCancel={onClose} aria-label={`Expediente ${data.name}`}>
    <header><div><small>INAPI · SOLICITUD {data.applicationNumber}</small><h2>{data.name}</h2></div><button onClick={onClose} aria-label="Cerrar expediente">×</button></header>
    <p><b>Etapa según los antecedentes: {statusLabel(data.status)}</b></p>
    <p>Estado general informado por la API: {general?.description ?? "No informado"} ({general?.code ?? "sin código"}). Registro: {data.registrationNumber ?? "No asignado"}. Fecha de registro: {data.registrationDate ?? "No informada"}.</p>
    {data.status === "registered" && general?.description === "En Trámite" && <p className="source-feedback">El estado general de la API aún dice “En trámite”. El número y la fecha de registro, junto con la resolución de concesión del historial, acreditan la inscripción.</p>}
    <a href={data.officialUrl} target="_blank" rel="noreferrer">Abrir buscador INAPI ↗</a><p>Busque por el número de solicitud {data.applicationNumber} y abra el expediente.</p>
    {Object.entries(data.inapi ?? {}).map(([key, value]) => <details key={key} open={key === "events" || key === "annotations"}><summary>{{ events: "Actuaciones del expediente", annotations: "Anotaciones", holders: "Titulares", representatives: "Representantes", classes: "Clases y cobertura", trademark: "Características del signo", status: "Estado original", related_records: "Expedientes relacionados" }[key] ?? key}</summary><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{displayValue(value)}</p></details>)}
    <footer><button onClick={onClose}>Cerrar</button></footer>
  </dialog>;
}

export function EnrollInapi({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [id, setId] = useState(""); const [record, setRecord] = useState<SourceRecord | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(confirm: boolean) {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/inapi/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationNumber: id, confirm }) });
      const p = await r.json(); if (!r.ok) throw new Error(p.message);
      setRecord(p.record);
      if (confirm) { await onSaved(); setMessage(p.existing ? "Este expediente ya está en la cartera." : "Expediente incorporado. Las próximas revisiones detectarán sus novedades."); }
    } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo consultar INAPI"); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="source-editor" onCancel={onClose} aria-label="Agregar expediente INAPI"><form onSubmit={e => { e.preventDefault(); void submit(false); }}><header><h2>Agregar expediente INAPI</h2><button type="button" onClick={onClose}>Cerrar</button></header><label>Número de solicitud<input inputMode="numeric" pattern="[0-9]{1,9}" required value={id} onChange={e => { setId(e.target.value); setRecord(null); setMessage(""); }} placeholder="Ej. 1663533" /></label><p>Utilice el número de solicitud, incluso si la marca ya tiene registro.</p><button className="buho-primary" disabled={busy} type="submit">{busy ? "Consultando…" : "Buscar en INAPI"}</button>{record && <section><h3>{record.name}</h3><p>{record.owner}</p><p>{statusLabel(record.status)} · Solicitud {record.applicationNumber} · Registro {record.registrationNumber ?? "No asignado"}</p><p>Clases: {record.classes.join(", ") || "No informadas"}</p><button className="buho-primary" type="button" disabled={busy} onClick={() => void submit(true)}>Incorporar a seguimiento</button></section>}{message && <p role="status">{message}</p>}</form></dialog>;
}

export function ReviewSource({ onReviewed, real = false }: { onReviewed: () => Promise<void>; real?: boolean }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState(false);
  async function review() {
    setBusy(true); setMessage(""); setError(false);
    try { const r = await fetch("/api/monitoring/sync", { method: "POST" }); const p = await r.json(); if (!r.ok) throw new Error(p.message); await onReviewed(); window.dispatchEvent(new Event("buho-source-reviewed")); setMessage(p.skipped ? p.reason : `${p.received} expedientes revisados · ${p.changed} actualizados · ${p.notifications} notificaciones nuevas`); } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo revisar la fuente"); setError(true); } finally { setBusy(false); }
  }
  return <div className="source-review"><div><b>Revisión de expedientes</b><span>Todos los días a las 12:30, hora de Chile · {real ? "INAPI · datos reales" : "Fuente simulada"}</span></div>{message && <p className={error ? "source-error" : ""} role={error ? "alert" : "status"}>{message}</p>}<a href="#sourceAdmin">Administrar fuente ↗</a><button className="buho-primary" disabled={busy} onClick={() => void review()}>{busy ? "Revisando…" : "Revisar"}</button></div>;
}
