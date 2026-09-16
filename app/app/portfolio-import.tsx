"use client";
import { useRef, useState } from "react";
import { ReviewDialog } from "./review-dialog";
import "./pilot.css";
type Row = { id: string; outcome: string; name?: string; destination?: string; status?: string; message?: string };
const outcomeLabel: Record<string, string> = { ready: "Lista para incorporar", existing: "Ya incorporada", imported: "Incorporada", error: "Revisar", pending: "Pendiente", opposition: "Ya seguida como oposición presentada; no se carga como propia" };
export function PortfolioImport({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [invalid, setInvalid] = useState<{ sheet: string; row: number; value: string }[]>([]);
  const [duplicates, setDuplicates] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [filename, setFilename] = useState("");
  const [ownPortfolioConfirmed, setOwnPortfolioConfirmed] = useState(false);
  const stop = useRef(false);
  async function process(ids: string[], action: "preview" | "import") {
    setBusy(true); setError(""); stop.current = false;
    try {
      for (let i = 0; i < ids.length && !stop.current; i += 10) {
        setProgress(`${action === "preview" ? "Consultando INAPI" : "Incorporando"}: ${i} de ${ids.length}`);
        const response = await fetch("/api/portfolio/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ids: ids.slice(i, i + 10), ownPortfolioConfirmed }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message);
        setRows(current => current.map(row => payload.results.find((result: Row) => result.id === row.id) ?? row));
      }
      setProgress(stop.current ? "Proceso pausado. Puedes continuar con los pendientes." : action === "preview" ? "Consulta terminada. Revisa los resultados antes de incorporar." : "Carga terminada. Tus módulos ya están actualizados.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar. Puedes reintentar los pendientes."); }
    finally { if (action === "import") { try { await onSaved(); } catch { setError("La carga se guardó, pero no se pudo actualizar la vista. Recarga la página."); } } setBusy(false); }
  }
  async function read(file?: File) {
    if (!file) return;
    setOwnPortfolioConfirmed(false);
    setBusy(true); setError(""); setProgress("Leyendo archivo…"); setRows([]); setInvalid([]); setDuplicates(0); setFilename(file.name);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("El archivo supera 2 MB");
      const data = new FormData(); data.set("file", file);
      const response = await fetch("/api/portfolio/import", { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      setRows(payload.ids.map((id: string) => ({ id, outcome: "pending" }))); setInvalid(payload.invalid); setDuplicates(payload.duplicates);
      if (payload.ids.length) await process(payload.ids, "preview");
      else setProgress("No hay números válidos para consultar. Corrige las filas indicadas.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo leer el archivo"); setProgress(""); }
    finally { setBusy(false); }
  }
  const ready = rows.filter(r => r.outcome === "ready");
  const pending = rows.filter(r => ["pending", "error"].includes(r.outcome));
  return <ReviewDialog title="Subir cartera desde Excel" onClose={() => { if (!busy) onClose(); }} className="pilot-dialog"><div className="pilot-body"><p>Usa una columna <strong>numero_solicitud</strong>, con un número INAPI por fila. Consultaremos el estado para ubicar cada expediente en Marcas o Solicitudes.</p><p>Admite .xlsx y .csv, hasta 2.000 filas y 2 MB. Puedes cargar tus dos archivos consecutivamente; los repetidos se omiten. Las oposiciones que presentaste se agregan desde Casos.</p><label><input type="checkbox" checked={ownPortfolioConfirmed} disabled={busy} onChange={e => setOwnPortfolioConfirmed(e.target.checked)} /> Confirmo que son solicitudes propias o de mis clientes como solicitantes, no solicitudes de terceros contra las que presentamos oposición.</label><label className="pilot-file">Elegir archivo<input type="file" accept=".xlsx,.csv" disabled={busy} onChange={e => void read(e.target.files?.[0])} /></label><a download="plantilla-solicitudes.csv" href="data:text/csv;charset=utf-8,numero_solicitud%0A">Descargar plantilla CSV</a>{filename && <p><strong>{filename}</strong> · {rows.length} IDs únicos · {duplicates} repetidos omitidos</p>}<p role="status">{progress}</p>{error && <p role="alert" className="task-error">{error}</p>}{invalid.length > 0 && <section><h3>Filas que necesitan corrección</h3><ul>{invalid.map((row,i) => <li key={i}>{row.sheet}, fila {row.row}: {row.value}</li>)}</ul></section>}{rows.length > 0 && <div className="pilot-table"><table><thead><tr><th>Solicitud</th><th>Marca</th><th>Estado INAPI</th><th>Destino</th><th>Resultado</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.id}</td><td>{row.name ?? "—"}</td><td>{row.status ?? "—"}</td><td>{row.destination ?? "—"}</td><td>{row.message ?? outcomeLabel[row.outcome]}</td></tr>)}</tbody></table></div>}</div><footer><button disabled={busy} onClick={onClose}>Cerrar</button>{busy ? <button onClick={() => { stop.current = true; setProgress("Se pausará al terminar el bloque actual…"); }}>Pausar</button> : <>{pending.length > 0 && <button onClick={() => void process(pending.map(r => r.id), "preview")}>Reintentar pendientes</button>}<button className="buho-primary" disabled={!ready.length || !ownPortfolioConfirmed} onClick={() => void process(ready.map(r => r.id), "import")}>Incorporar {ready.length} expedientes</button></>}</footer></ReviewDialog>;
}
