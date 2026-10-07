"use client";
import { useRef, useState } from "react";
import type { AssistedQuery } from "@/lib/portfolio-import";
import type { DiscoveryCandidate, DiscoveryResult } from "@/lib/inapi-discovery";
import { ReviewDialog } from "./review-dialog";
import { ImportFilePicker } from "./import-file-picker";
import { CandidateReview, type CandidateAssignment } from "./candidate-review";
import { useClientDirectory } from "./client-provider";
import "./pilot.css";
import "./ux-october.css";
type QueryRow = AssistedQuery & { done?: boolean; nextOffset?: number | null; total?: number; error?: string };
type IdentifierRow = { id: string; outcome: string; message?: string; candidate?: DiscoveryCandidate };
export function PortfolioImport({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [identifiers, setIdentifiers] = useState<IdentifierRow[]>([]), [queries, setQueries] = useState<QueryRow[]>([]);
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]), [selected, setSelected] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, CandidateAssignment>>({});
  const [invalid, setInvalid] = useState<{ sheet: string; row: number; value: string }[]>([]);
  const [duplicates, setDuplicates] = useState(0), [repeatedCandidates, setRepeatedCandidates] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [progress, setProgress] = useState("");
  const [filename, setFilename] = useState("");
  const [defaultClient, setDefaultClient] = useState("unassigned"), [defaultRole, setDefaultRole] = useState<CandidateAssignment["clientRole"]>("holder");
  const { clients } = useClientDirectory();
  const stop = useRef(false), seen = useRef(new Set<string>());
  function merge(items: DiscoveryCandidate[]) {
    let repeats = 0;
    for (const item of items) { if (seen.current.has(item.applicationNumber)) repeats++; else seen.current.add(item.applicationNumber); }
    setRepeatedCandidates(current => current + repeats);
    setCandidates(current => {
      const records = new Map(current.map(c => [c.applicationNumber, c]));
      for (const c of items) { const old = records.get(c.applicationNumber); records.set(c.applicationNumber, old ? { ...old, tracked: old.tracked || c.tracked, explanation: [...new Set([old.explanation, c.explanation])].join(" · ") } : c); }
      return [...records.values()];
    });
  }
  async function previewIds(ids: string[]) {
    for (let i = 0; i < ids.length && !stop.current; i += 10) {
      setProgress(`Consultando solicitudes: ${i} de ${ids.length}`);
      const response = await fetch("/api/portfolio/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "preview", ids: ids.slice(i, i + 10) }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message);
      setIdentifiers(current => current.map(row => payload.results.find((result: IdentifierRow) => result.id === row.id) ?? row));
      merge(payload.results.flatMap((row: IdentifierRow) => row.candidate ? [row.candidate] : []));
    }
  }
  async function read(file?: File) {
    if (!file) return;
    stop.current = false; seen.current = new Set(); setBusy(true); setError(""); setProgress("Leyendo archivo…");
    setCandidates([]); setSelected([]); setAssignments({}); setIdentifiers([]); setQueries([]); setInvalid([]); setDuplicates(0); setRepeatedCandidates(0); setFilename(file.name);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("El archivo supera 2 MB");
      const data = new FormData(); data.set("file", file);
      const response = await fetch("/api/portfolio/import", { method: "POST", body: data });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message);
      setIdentifiers(payload.ids.map((id: string) => ({ id, outcome: "pending" }))); setQueries(payload.queries ?? []); setInvalid(payload.invalid); setDuplicates(payload.duplicates);
      if (payload.ids.length) await previewIds(payload.ids);
      setProgress(stop.current ? "Consulta pausada. Puedes continuar con los pendientes." : payload.queries?.length ? "Archivo leído. Revisa los roles y busca los candidatos." : "Consulta terminada. Selecciona los expedientes y asigna clientes si quieres.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo leer el archivo."); setProgress(""); }
    finally { setBusy(false); }
  }
  async function searchQueries(rows: QueryRow[], more = false) {
    setBusy(true); setError(""); stop.current = false;
    try {
      for (const [index, row] of rows.entries()) {
        if (stop.current) break;
        setProgress(`Buscando candidatos: ${index + 1} de ${rows.length} · ${row.rut || row.partyName || row.name}`);
        const response = await fetch("/api/inapi/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: row.name, partyName: row.partyName, rut: row.rut, role: row.role, offset: more ? row.nextOffset ?? 0 : 0, limit: 50 }) });
        const payload: DiscoveryResult & { message?: string } = await response.json();
        if (!response.ok) { setQueries(current => current.map(q => q.key === row.key ? { ...q, error: payload.message || "No se pudo consultar" } : q)); continue; }
        merge(payload.candidates.map(c => ({ ...c, explanation: `${c.explanation} · ${row.sheet}, fila ${row.row}` })));
        setQueries(current => current.map(q => q.key === row.key ? { ...q, done: true, error: undefined, total: payload.total, nextOffset: payload.nextOffset } : q));
      }
      setProgress(stop.current ? "Consulta pausada. Se conservan los candidatos encontrados." : "Consulta terminada. Revisa candidatos, clientes y roles antes de incorporar.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo completar la consulta."); }
    finally { setBusy(false); }
  }
  async function incorporate() {
    if (busy || !selected.length) return;
    setBusy(true); setError(""); stop.current = false; const ids = [...selected];
    try {
      for (let i = 0; i < ids.length && !stop.current; i += 10) {
        setProgress(`Incorporando selección: ${i} de ${ids.length}`); const batch = ids.slice(i, i + 10);
        const response = await fetch("/api/portfolio/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "import", ids: batch, assignments: Object.fromEntries(batch.map(id => [id, { clientId: assignments[id]?.clientId || "unassigned", clientRole: assignments[id]?.clientRole ?? defaultRole }])) }) });
        const payload = await response.json(); if (!response.ok) throw new Error(payload.message);
        const completed = payload.results.filter((row: IdentifierRow) => ["imported", "existing"].includes(row.outcome)).map((row: IdentifierRow) => row.id);
        setCandidates(current => current.map(c => completed.includes(c.applicationNumber) ? { ...c, tracked: true } : c));
        setSelected(current => current.filter(id => !completed.includes(id)));
        const failure = payload.results.find((row: IdentifierRow) => !["imported", "existing"].includes(row.outcome));
        if (failure) throw new Error(failure.message || "Hay expedientes que requieren revisión. Los incorporados se conservaron.");
      }
      setProgress(stop.current ? "Carga pausada. Los expedientes incorporados se conservaron." : "Carga terminada. Tus expedientes están en Mis marcas o Solicitudes, según su estado.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo completar la carga."); }
    finally { try { await onSaved(); } catch { setError("La carga se guardó; recarga la página para actualizar la cartera."); } setBusy(false); }
  }
  const pendingIds = identifiers.filter(row => ["pending", "error"].includes(row.outcome));
  const pendingQueries = queries.filter(row => !row.done || row.error);
  return <ReviewDialog title="Carga desde Excel" onClose={() => { if (!busy) onClose(); }} className="pilot-dialog assisted-import-dialog">
    <div className="pilot-body"><section className="excel-simple-guide"><h3>Una hoja, una columna</h3><p>Pon un número de solicitud de INAPI en cada fila. El nombre de la hoja puede ser cualquiera.</p><div className="excel-guide-example"><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1700998</td></tr><tr><td>1700999</td></tr><tr><td>1701000</td></tr></tbody></table><div><strong>Con o sin encabezado</strong><p>Puedes comenzar directamente con los números o poner un título, por ejemplo «Solicitudes». Lo reconoceremos automáticamente, aunque los números estén guardados como texto.</p><small>Usa números de solicitud, que pueden ser distintos de los números de registro.</small></div></div><p><strong>Formatos: .xls, .xlsx o .csv</strong> · Hasta 2.000 filas y 2 MB.</p></section><details className="excel-assisted-guide"><summary>También puedes buscar una cartera por cliente o representante</summary><p>Columnas disponibles: numero_solicitud, rut, razon_social, representante, rut_representante, rol, cliente y marca. «Rol» admite titular, representante o ambos. Revisarás los candidatos y podrás asignar un cliente antes de incorporarlos.</p></details><ImportFilePicker filename={filename} disabled={busy} onFile={file => void read(file)} />
      <div className="assisted-template-links"><a className="pilot-template-link" download="plantilla-solicitudes.csv" href="data:text/csv;charset=utf-8,numero_solicitud%0A">Plantilla por solicitud</a><a className="pilot-template-link" download="plantilla-cartera-asistida.csv" href="data:text/csv;charset=utf-8,rut%2Crazon_social%2Crepresentante%2Crut_representante%2Crol%2Ccliente%2Cmarca%0A">Plantilla por cliente o representante</a><small>.xls, .xlsx o .csv · hasta 2.000 filas y 2 MB</small></div>
      {filename && <p><strong>{filename}</strong> · {identifiers.length} {identifiers.length===1?"solicitud":"solicitudes"} · {queries.length} {queries.length===1?"búsqueda":"búsquedas"} · {duplicates} {duplicates===1?"fila repetida omitida":"filas repetidas omitidas"} · {repeatedCandidates} {repeatedCandidates===1?"coincidencia repetida reunida":"coincidencias repetidas reunidas"}</p>}<p role="status" className="assisted-progress">{progress}</p>{error && <p role="alert" className="task-error">{error}</p>}
      {invalid.length > 0 && <details><summary>{invalid.length} {invalid.length===1?"fila necesita corrección":"filas necesitan corrección"}</summary><ul>{invalid.map((row, i) => <li key={i}>{row.sheet}, fila {row.row}: {row.value}</li>)}</ul></details>}
      {queries.length > 0 && <section className="assisted-queries"><header><h3>Datos que vamos a buscar</h3><button type="button" disabled={busy || !pendingQueries.length} onClick={() => void searchQueries(pendingQueries)}>Buscar candidatos ({pendingQueries.length})</button></header>{queries.map(row => <div key={row.key}><span><strong>{row.rut || row.partyName || row.name}</strong><small>{row.sheet}, fila {row.row}{row.clientName ? ` · Cliente sugerido: ${row.clientName}` : ""}</small>{row.done && <small>{row.total} {row.total===1?"candidato":"candidatos"} en la fuente</small>}{row.error && <small role="alert">{row.error}</small>}</span><label>Buscar como<select aria-label={`Rol de búsqueda de la fila ${row.row} en ${row.sheet}`} value={row.role} disabled={busy || row.done} onChange={e => setQueries(current => current.map(q => q.key === row.key ? { ...q, role: e.target.value as QueryRow["role"] } : q))}><option value="holder">Titular / solicitante</option><option value="representative">Representante</option><option value="any">Ambos</option></select></label>{row.nextOffset != null && <button type="button" disabled={busy} onClick={() => void searchQueries([row], true)}>Cargar más de esta búsqueda</button>}</div>)}</section>}
      {pendingIds.length > 0 && <section><h3>Solicitudes pendientes de consulta</h3>{pendingIds.map(row => <p key={row.id}>Solicitud {row.id} · {row.message || "Pendiente"}</p>)}<button type="button" disabled={busy} onClick={async () => { setBusy(true); stop.current = false; try { await previewIds(pendingIds.map(row => row.id)); } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo consultar."); } finally { setBusy(false); } }}>Reintentar solicitudes</button></section>}
      {candidates.length > 0 && <section><h3>Expedientes encontrados ({candidates.length})</h3><div className="candidate-defaults"><label>Cliente de la selección<select value={defaultClient} disabled={busy} onChange={e => { const value = e.target.value; setDefaultClient(value); setAssignments(current => ({ ...current, ...Object.fromEntries(selected.map(id => [id, { clientId: value, clientRole: current[id]?.clientRole ?? defaultRole }])) })); }}><option value="unassigned">Sin cliente asignado</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Rol del cliente<select value={defaultRole} disabled={busy} onChange={e => { const value = e.target.value as CandidateAssignment["clientRole"]; setDefaultRole(value); setAssignments(current => ({ ...current, ...Object.fromEntries(selected.map(id => [id, { clientId: current[id]?.clientId ?? defaultClient, clientRole: value }])) })); }}><option value="holder">Titular / solicitante</option><option value="representative">Representante</option></select></label><small>Aplica a la selección actual; cada expediente puede ajustarse abajo.</small></div><CandidateReview candidates={candidates} selected={selected} onSelected={ids => { setSelected(ids); setAssignments(current => ({ ...current, ...Object.fromEntries(ids.filter(id => !current[id]?.clientId && defaultClient).map(id => [id, { clientId: defaultClient, clientRole: defaultRole }])) })); }} assignments={assignments} onAssignment={(id, value) => setAssignments(current => ({ ...current, [id]: value }))} busy={busy} /></section>}
    </div><footer><span>{selected.length} {selected.length===1?"expediente seleccionado":"expedientes seleccionados"}</span><button type="button" disabled={busy} onClick={onClose}>Cerrar</button>{busy ? <button type="button" onClick={() => { stop.current = true; setProgress("Se pausará al terminar la consulta actual…"); }}>Pausar</button> : <button type="button" className="buho-primary" disabled={!selected.length} onClick={() => void incorporate()}>Incorporar {selected.length} {selected.length===1?"expediente":"expedientes"}</button>}</footer>
  </ReviewDialog>;
}
