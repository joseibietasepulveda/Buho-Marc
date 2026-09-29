"use client";
import { useRef, useState } from "react";
import type { ProceedingImportRow } from "@/lib/proceeding-import";
import { statusLabel, type SourceRecord } from "@/lib/source-contract";
import { ReviewDialog } from "./review-dialog";
import { ImportFilePicker } from "./import-file-picker";
import "./pilot.css";
type Row = ProceedingImportRow & { outcome: "pending" | "ready" | "existing" | "imported" | "error"; record?: SourceRecord; message?: string; caseId?: string; existingRole?: string };
const labels = { pending: "Pendiente de consulta", ready: "Lista para crear", existing: "Ya existe; se conserva", imported: "Seguimiento creado", error: "Revisar" };
export function ProceedingImport({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [rows, setRows] = useState<Row[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(""), [progress, setProgress] = useState("");
  const [invalid, setInvalid] = useState<{sheet:string;row:number;value:string}[]>([]), [duplicates, setDuplicates] = useState(0), [filename, setFilename] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const stop = useRef(false);
  function change(key: string, patch: Partial<Row>) { setConfirmed(false); setRows(current => current.map(row => row.key === key ? { ...row, ...patch } : row)); }
  async function read(file?: File) {
    if (!file) return;
    setBusy(true); setRows([]); setInvalid([]); setDuplicates(0); setConfirmed(false); setError(""); setFilename(file.name); setProgress("Leyendo archivo…");
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("El archivo supera 2 MB");
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/oppositions/import", { method: "POST", body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setRows(data.rows.map((row: ProceedingImportRow) => ({ ...row, outcome: "pending" })));
      setInvalid(data.invalid); setDuplicates(data.duplicates); setProgress("Archivo leído. Revisa el tipo y consulta los expedientes antes de crear seguimientos.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo leer el archivo"); setProgress(""); }
    finally { setBusy(false); }
  }
  async function process(selected: Row[], action: "preview" | "import") {
    setBusy(true); setError(""); stop.current = false;
    try {
      for (let i = 0; i < selected.length && !stop.current; i += 5) {
        setProgress(`${action === "preview" ? "Consultando expedientes" : "Creando seguimientos"}: ${i} de ${selected.length}`);
        const batch = selected.slice(i, i + 5).map(row => ({ key: row.key, applicationNumber: row.applicationNumber, type: row.type, ...(row.role ? { role: row.role } : {}), opponent: row.opponent }));
        const response = await fetch("/api/oppositions/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, rows: batch }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.message);
        setRows(current => current.map(row => { const result = data.results.find((r: Row) => r.key === row.key); return result ? { ...row, message: undefined, ...result } : row; }));
      }
      setProgress(stop.current ? "Proceso pausado. Puedes continuar con los pendientes." : action === "preview" ? "Consulta terminada. Revisa marcas, roles y resultados antes de confirmar." : "Proceso terminado. Revisa el resultado de cada fila; los seguimientos creados ya aparecen en la pestaña y en Casos.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar. Puedes reintentar."); }
    finally { if (action === "import") { try { await onSaved(); } catch { setError("Los seguimientos se guardaron. Recarga la página para actualizar la vista."); } } setBusy(false); setConfirmed(false); }
  }
  const editable = (row: Row) => !["existing", "imported"].includes(row.outcome);
  const pending = rows.filter(row => ["pending", "error"].includes(row.outcome));
  const ready = rows.filter(row => row.outcome === "ready");
  return <ReviewDialog title="Subir oposiciones y nulidades" className="pilot-dialog proceeding-import-dialog" onClose={() => { if (!busy) onClose(); }}><div className="pilot-body">
    <p>Usa una columna <strong>Solicitud</strong>. Las hojas <strong>Oposiciones</strong> y <strong>Nulidades</strong> determinan el tipo. También puedes usar columnas tipo, rol y cliente en un Excel o CSV.</p>
    <p>Los expedientes se guardarán como casos en este espacio. Las marcas impugnadas no se agregan a tu cartera. La carga crea una tarea inicial de revisión, sin avisos históricos ni plazos calculados.</p>
    <ImportFilePicker filename={filename} disabled={busy} onFile={file => void read(file)} />
    {filename && <p><strong>{filename}</strong> · {rows.length} filas · {duplicates} repetidos omitidos</p>}
    {rows.length > 0 && <div className="pilot-form"><label>Aplicar rol a todas las filas pendientes<select aria-label="Rol para todas las filas" defaultValue="" disabled={busy} onChange={e => { const role = e.target.value as Row["role"]; setRows(current => current.map(row => editable(row) ? { ...row, role } : row)); setConfirmed(false); }}><option value="">Seleccionar rol</option><option value="opponent">Nuestro cliente presenta la acción</option><option value="respondent">Nuestro cliente defiende la marca</option></select></label><p>Si hay distintos roles, ajústalos fila por fila. Puedes dejar el cliente por confirmar.</p></div>}
    <p role="status">{progress}</p>{error && <p role="alert" className="task-error">{error}</p>}
    {!!invalid.length && <section><h3>Filas sin cargar: corrige el archivo</h3><ul>{invalid.map((row, i) => <li key={i}>{row.sheet}, fila {row.row}: {row.value}</li>)}</ul></section>}
    {!!rows.length && <div className="pilot-table"><table><thead><tr><th>Solicitud / hoja</th><th>Expediente INAPI</th><th>Tipo</th><th>Rol del cliente</th><th>Cliente</th><th>Resultado</th></tr></thead><tbody>{rows.map(row => <tr key={row.key}><td>{row.applicationNumber}<small>{row.sheet} · fila {row.row}</small></td><td>{row.record ? <><strong>{row.record.name}</strong><small>{row.record.owner}</small><small>{statusLabel(row.record.status)}</small></> : "Por consultar"}</td><td><select aria-label={`Tipo ${row.applicationNumber} ${row.sheet}`} value={row.type} disabled={busy || !editable(row)} onChange={e => change(row.key, { type: e.target.value as Row["type"], outcome: "pending", record: undefined })}><option value="">Seleccionar tipo</option><option value="opposition">Oposición</option><option value="nullity">Nulidad</option></select></td><td><select aria-label={`Rol ${row.applicationNumber} ${row.sheet}`} value={row.existingRole ?? row.role} disabled={busy || !editable(row)} onChange={e => change(row.key, { role: e.target.value as Row["role"] })}><option value="">Seleccionar rol</option><option value="opponent">Presenta la acción</option><option value="respondent">Defiende la marca</option></select></td><td><input aria-label={`Cliente ${row.applicationNumber} ${row.sheet}`} value={row.opponent} placeholder="Por confirmar" maxLength={180} disabled={busy || !editable(row)} onChange={e => change(row.key, { opponent: e.target.value })}/></td><td>{row.message ?? labels[row.outcome]}{row.caseId && <small>{row.caseId}</small>}</td></tr>)}</tbody></table></div>}
    {!!ready.length && <label className="proceeding-confirm"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/> Confirmo los expedientes, el tipo de acción y el rol del cliente en las {ready.length} filas listas para crear.</label>}
  </div><footer><button disabled={busy} onClick={onClose}>Cerrar</button>{busy ? <button onClick={() => { stop.current = true; }}>Pausar al terminar este bloque</button> : <>{!!pending.length && <button disabled={pending.some(row => !row.type)} onClick={() => void process(pending, "preview")}>Consultar {pending.length} expedientes</button>}<button className="buho-primary" disabled={!ready.length || !confirmed || ready.some(row => !row.role)} onClick={() => void process(ready, "import")}>Crear {ready.length} seguimientos</button></>}</footer></ReviewDialog>;
}
