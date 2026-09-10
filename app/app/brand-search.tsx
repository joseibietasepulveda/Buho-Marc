"use client";
import { useState } from "react";
import Image from "next/image";
import { BRAND_SEARCH_FIELDS, MOCK_ATTRIBUTE_SEARCH, MOCK_SEARCH_CATALOGUE, exactBrandMatch, type BrandSearchField, type SearchCandidate } from "@/lib/brand-search";
import { statusLabel } from "@/lib/source-contract";
import { ReviewDialog } from "./review-dialog";

export function BrandSearch({ real, tracked, onAddMock, onRefresh, onClose }: { real: boolean; tracked: { registration: string; applicationNumber?: string }[]; onAddMock: (candidate: SearchCandidate) => Promise<boolean>; onRefresh: () => Promise<void>; onClose: () => void }) {
  const [field, setField] = useState<BrandSearchField>("applicationNumber");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCandidate[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const live = real && field === "applicationNumber";
  const already = (candidate: SearchCandidate) => added.includes(candidate.applicationNumber) || tracked.some(brand => brand.applicationNumber === candidate.applicationNumber || Boolean(candidate.registration) && brand.registration === candidate.registration);
  function clear() { setResults(null); setSelected([]); setMessage(""); setError(""); }
  async function search() {
    setBusy(true); clear();
    try {
      if (live) {
        const r = await fetch("/api/inapi/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationNumber: query.trim() }) });
        const p = await r.json(); if (!r.ok) throw new Error(p.message);
        const record = p.record;
        setResults([{ ...record, registration: record.registrationNumber ?? "", classes: record.classes.join(", "), rut: record.ownerRut, registrationState: statusLabel(record.status) }]);
      } else setResults(MOCK_SEARCH_CATALOGUE.filter(candidate => exactBrandMatch(candidate, field, query)));
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo buscar. Intenta nuevamente."); }
    finally { setBusy(false); }
  }
  async function add() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      for (const candidate of results?.filter(result => selected.includes(result.applicationNumber) && !already(result)) ?? []) {
        if (live) {
          const r = await fetch("/api/inapi/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationNumber: candidate.applicationNumber, confirm: true }) });
          const p = await r.json(); if (!r.ok) throw new Error(p.message);
        } else if (!await onAddMock(candidate)) throw new Error("No se pudo agregar la marca. Puedes reintentar.");
        setAdded(current => [...current, candidate.applicationNumber]);
      }
      await onRefresh(); setSelected([]); setMessage("Seguimiento actualizado. Las marcas incorporadas aparecen en tu cartera.");
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo incorporar la selección."); }
    finally { setBusy(false); }
  }
  const focused = results?.find(result => selected.includes(result.applicationNumber)) ?? results?.[0];
  return <ReviewDialog title="Agregar marcas al seguimiento" onClose={() => { if (!busy) onClose(); }} className="brand-search-dialog">
    <div className="brand-search-layout"><aside className="brand-search-parameters"><form onSubmit={event => { event.preventDefault(); void search(); }}><h3>Buscar una marca</h3><label>Buscar por<select value={field} disabled={busy} onChange={event => { setField(event.target.value as BrandSearchField); setQuery(""); clear(); }}>{Object.entries(BRAND_SEARCH_FIELDS).filter(([key]) => key !== "id" && (MOCK_ATTRIBUTE_SEARCH || key === "applicationNumber")).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Valor exacto<input type="search" required value={query} disabled={busy} onChange={event => { setQuery(event.target.value); clear(); }} placeholder={field === "rut" ? "77.888.410-5" : field === "name" ? "ACME ANDES" : field === "applicationNumber" ? "1700998" : "Escribe el valor completo"} /></label><small>Coincidencia exacta. El RUT admite puntos y guion o solo dígitos.</small><button className="buho-primary" type="submit" disabled={busy || !query.trim()}>{busy ? "Consultando…" : "Buscar"}</button></form>
      {focused && <section className="brand-search-facts"><h3>Datos encontrados</h3><dl>{[["Marca", focused.name], ["Titular", focused.owner], ["RUT", focused.rut], ["Solicitud", focused.applicationNumber], ["Registro", focused.registration || "Aún no asignado"], ["Clases Niza", focused.classes], ["Representante", focused.representativeName], ["Estado", focused.registrationState]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "No informado"}</dd></div>)}</dl></section>}
    </aside><section className="brand-search-results"><p className="brand-search-provenance">{live ? "Consulta INAPI por número de solicitud" : "Catálogo de demostración · búsqueda por atributos"}</p>{!live && <p>Prueba con ACME ANDES, RUT 77.888.410-5 o registro 1560998. Los resultados por atributos son de ejemplo mientras se amplía la conexión.</p>}
      {results === null ? <div className="brand-search-empty"><h3>Encuentra la marca que quieres seguir</h3><p>Elige un campo a la izquierda. Al buscar, podrás revisar los datos y seleccionar una o varias marcas.</p></div> : <><h3>{results.length} {results.length === 1 ? "resultado" : "resultados"}</h3>{results.map(candidate => <label className="brand-search-result" key={candidate.applicationNumber}><input type="checkbox" disabled={busy || already(candidate)} checked={selected.includes(candidate.applicationNumber)} onChange={event => setSelected(current => event.target.checked ? [...current, candidate.applicationNumber] : current.filter(id => id !== candidate.applicationNumber))} />{candidate.logo ? <Image unoptimized src={candidate.logo} width={100} height={80} alt={`Logo de ${candidate.name}`} /> : <span className="brand-search-no-logo">{candidate.type === "Denominativa" ? "Denominativa" : "Sin logo"}</span>}<span><strong>{candidate.name}</strong><small>{candidate.owner} · {candidate.rut}</small><small>Solicitud {candidate.applicationNumber} · Registro {candidate.registration || "pendiente"}</small><small>Clases {candidate.classes}</small>{already(candidate) && <b>Ya en seguimiento</b>}</span></label>)}{!results.length && <p>No hay coincidencias exactas. Revisa el valor o busca por otro campo.</p>}</>}
      {real && !live && <p>Esta vista permite probar los filtros. Para incorporar un expediente real, busca su número de solicitud en INAPI.</p>}{error && <p role="alert" className="task-error">{error}</p>}{message && <p role="status">{message}</p>}
    </section></div><footer><button type="button" onClick={onClose} disabled={busy}>Cerrar</button><button type="button" onClick={() => void add()} disabled={busy || !selected.length || real && !live}>Agregar {selected.length || ""} {selected.length === 1 ? "marca" : "marcas"} al seguimiento</button></footer>
  </ReviewDialog>;
}
