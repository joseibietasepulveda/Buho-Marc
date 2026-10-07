"use client";
import { useEffect, useRef, useState } from "react";
import { MOCK_SEARCH_CATALOGUE, type SearchCandidate } from "@/lib/brand-search";
import { TEXT_MATCH_MODES, textMatches, type TextMatchMode } from "@/lib/text-search";
import type { DiscoveryCandidate, DiscoveryInput, DiscoveryResult } from "@/lib/inapi-discovery";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { ReviewDialog } from "./review-dialog";
import { CandidateReview, type CandidateAssignment } from "./candidate-review";
import { useClientDirectory } from "./client-provider";
import "./ux-october.css";

export function BrandSearch({ real, tracked, onAddMock, onRefresh, onClose }: { real: boolean; tracked: { registration: string; applicationNumber?: string }[]; onAddMock: (candidate: SearchCandidate) => Promise<boolean>; onRefresh: () => Promise<void>; onClose: () => void }) {
  const [criteria, setCriteria] = useState<DiscoveryInput>({ name: "", applicationNumber: "", partyName: "", rut: "", role: "any", matchMode: "similar" });
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]), [assignments, setAssignments] = useState<Record<string, CandidateAssignment>>({});
  const [defaultClient, setDefaultClient] = useState("unassigned"), [defaultRole, setDefaultRole] = useState<CandidateAssignment["clientRole"]>("holder");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const { clients } = useClientDirectory();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const canSearch = Boolean(criteria.name?.trim() || criteria.applicationNumber?.trim() || criteria.partyName?.trim() || criteria.rut?.trim());
  function change(patch: Partial<DiscoveryInput>) { setCriteria(current => ({ ...current, ...patch })); setResult(null); setSelected([]); setError(""); setMessage(""); }
  async function search(more = false) {
    if (busy) return;
    setBusy(true); setError(""); setMessage(""); if (!more) { setSelected([]); }
    const request = new AbortController(); controller.current = request;
    try {
      let payload: DiscoveryResult;
      if (real) {
        const response = await fetch("/api/inapi/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...criteria, offset: more ? result?.nextOffset ?? 0 : 0 }), signal: request.signal });
        payload = await response.json(); if (!response.ok) throw new Error((payload as unknown as { message: string }).message);
      } else {
        const candidates = MOCK_SEARCH_CATALOGUE.filter(c => (!criteria.name || textMatches(c.name, criteria.name, criteria.matchMode)) && (!criteria.applicationNumber || c.applicationNumber === criteria.applicationNumber) && (!criteria.partyName || textMatches(criteria.role === "representative" ? c.representativeName : c.owner, criteria.partyName, "similar")) && (!criteria.rut || c.rut.replace(/[.\s-]/g, "") === criteria.rut.replace(/[.\s-]/g, ""))).map(c => ({ ...c, representativeName: c.representativeName ?? "", registrationState: c.registrationState ?? "No informado", matchedParties: [], explanation: "Ejemplo de demostración" } as DiscoveryCandidate));
        payload = { candidates, total: candidates.length, nextOffset: null, hasMore: false, filtered: false, scope: "Ejemplos de demostración · conexión real no configurada" };
      }
      const candidates = payload.candidates.map(c => ({ ...c, tracked: c.tracked || tracked.some(b => b.applicationNumber === c.applicationNumber) || added.includes(c.applicationNumber) }));
      setResult(current => ({ ...payload, candidates: more ? [...(current?.candidates ?? []), ...candidates.filter(c => !current?.candidates.some(old => old.applicationNumber === c.applicationNumber))] : candidates }));
      setAssignments(current => ({ ...current, ...Object.fromEntries(candidates.filter(c => !current[c.applicationNumber]).map(c => [c.applicationNumber, { clientId: defaultClient, clientRole: defaultRole }])) }));
    } catch (failure) { if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudo completar la búsqueda."); }
    finally { setBusy(false); }
  }
  async function add() {
    if (busy || !selected.length) return;
    const chosen = result?.candidates.filter(c => selected.includes(c.applicationNumber) && !c.tracked) ?? [];
    setBusy(true); setError(""); let count = 0;
    try {
      for (let i = 0; i < chosen.length; i += 10) {
        const batch = chosen.slice(i, i + 10);
        if (real) {
          const response = await fetch("/api/portfolio/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "import", ids: batch.map(c => c.applicationNumber), assignments: Object.fromEntries(batch.map(c => [c.applicationNumber, { clientId: assignments[c.applicationNumber]?.clientId || "unassigned", clientRole: assignments[c.applicationNumber]?.clientRole ?? defaultRole }])) }) });
          const payload = await response.json(); if (!response.ok) throw new Error(payload.message);
          const successful = payload.results.filter((row: { outcome: string }) => ["imported", "existing"].includes(row.outcome));
          const successfulIds = successful.map((row: { id: string }) => row.id);
          count += successfulIds.length; setAdded(current => [...current, ...successfulIds]);
          setResult(current => current ? { ...current, candidates: current.candidates.map(c => successfulIds.includes(c.applicationNumber) ? { ...c, tracked: true } : c) } : current);
          setSelected(current => current.filter(id => !successfulIds.includes(id)));
          const failed = payload.results.find((row: { outcome: string }) => !["imported", "existing"].includes(row.outcome));
          if (failed) throw new Error(failed.message || "Hay expedientes que requieren revisión. Los incorporados se conservaron.");
        } else for (const candidate of batch) { if (!await onAddMock(candidate)) throw new Error("No se pudo agregar la marca."); count++; setAdded(current => [...current, candidate.applicationNumber]); setSelected(current => current.filter(id => id !== candidate.applicationNumber)); }
      }
      setMessage(`${count} ${count===1?"expediente incorporado":"expedientes incorporados"}. Se ubicaron en Mis marcas o Solicitudes según su estado.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo incorporar la selección."); }
    finally { try { await onRefresh(); } catch { setError("La selección se guardó. Recarga la página para actualizar la cartera."); } setBusy(false); }
  }
  return <ReviewDialog title="Agregar marcas al seguimiento" onClose={() => { if (!busy) onClose(); }} className="brand-search-dialog ux-discovery-dialog">
    <div className="brand-search-layout"><aside className="brand-search-parameters"><form onSubmit={event => { event.preventDefault(); void search(); }}><h3>Encuentra tus expedientes</h3><p>Combina los datos que conoces y revisa los resultados antes de agregarlos.</p>
      <label>Nombre de la marca<input type="search" maxLength={500} value={criteria.name} disabled={busy} onChange={e => change({ name: e.target.value })} placeholder="Ej. Ventisca" /></label>
      <label>Coincidencia de la marca<select value={criteria.matchMode} disabled={busy} onChange={e => change({ matchMode: e.target.value as TextMatchMode })}>{Object.entries(TEXT_MATCH_MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Número de solicitud<input inputMode="numeric" pattern="[0-9]{1,9}" maxLength={9} value={criteria.applicationNumber} disabled={busy} onChange={e => change({ applicationNumber: e.target.value })} placeholder="Ej. 1700998" /></label>
      <div className="discovery-party-fields"><label>Titular o representante<select value={criteria.role} disabled={busy} onChange={e => change({ role: e.target.value as DiscoveryInput["role"] })}><option value="any">Titular o representante</option><option value="holder">Titular / solicitante</option><option value="representative">Representante / estudio</option></select></label><label>Nombre o razón social<input type="search" maxLength={500} value={criteria.partyName} disabled={busy} onChange={e => change({ partyName: e.target.value })} placeholder="Persona, empresa o estudio" /></label><label>RUT<input maxLength={30} value={criteria.rut} disabled={busy} onChange={e => change({ rut: e.target.value })} placeholder="Con o sin puntos y guion" /></label></div>
      <details className="discovery-more"><summary>Más criterios</summary><label>Clase Niza<select value={criteria.niceClass ?? ""} onChange={e => change({ niceClass: e.target.value ? Number(e.target.value) : undefined })}><option value="">Todas las clases</option>{NICE_CLASSES.map(c => <option key={c.number} value={c.number}>{c.number} · {c.meaning}</option>)}</select></label><label>Estado INAPI<input value={criteria.status ?? ""} onChange={e => change({ status: e.target.value })} placeholder="Ej. Registrada" /></label></details>
      <small>RUT y solicitud usan coincidencia exacta. Los nombres de titulares y representantes se buscan por semejanza. Los demás criterios se aplican al lote recuperado.</small><button className="buho-primary" type="submit" disabled={busy || !canSearch}>{busy ? <><span className="loading-spinner" aria-hidden/> Consultando…</> : "Buscar en INAPI"}</button>
    </form></aside><section className="brand-search-results">
      {!result ? <div className="brand-search-empty"><span className="buho-overline">BÚSQUEDA ASISTIDA</span><h3>Una marca o toda la cartera de un estudio</h3><p>Busca por marca, solicitud, titular o representante. Podrás revisar quién coincidió, asignar un cliente si quieres y seleccionar los expedientes que deseas seguir.</p></div> : <><header className="discovery-results-heading"><div><h3>{result.candidates.length} {result.candidates.length===1?"resultado recuperado":"resultados recuperados"}</h3><p>{result.scope}</p><small>{result.total} {result.total===1?"candidato informado":"candidatos informados"} por la fuente{result.filtered ? " · filtros aplicados al lote recuperado" : ""}</small></div></header><div className="candidate-defaults"><label>Cliente para la selección<select value={defaultClient} disabled={busy} onChange={e => { const value = e.target.value; setDefaultClient(value); setAssignments(current => ({ ...current, ...Object.fromEntries(selected.map(id => [id, { clientId: value, clientRole: current[id]?.clientRole ?? defaultRole }])) })); }}><option value="unassigned">Sin cliente asignado</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Rol del cliente<select value={defaultRole} disabled={busy} onChange={e => { const value = e.target.value as CandidateAssignment["clientRole"]; setDefaultRole(value); setAssignments(current => ({ ...current, ...Object.fromEntries(selected.map(id => [id, { clientId: current[id]?.clientId ?? defaultClient, clientRole: value }])) })); }}><option value="holder">Titular / solicitante</option><option value="representative">Representante</option></select></label><small>Se aplica a la selección actual. Puedes ajustar cada expediente abajo.</small></div><CandidateReview candidates={result.candidates.map(c => added.includes(c.applicationNumber) ? { ...c, tracked: true } : c)} selected={selected} onSelected={ids => { setSelected(ids); setAssignments(current => ({ ...current, ...Object.fromEntries(ids.filter(id => !current[id]?.clientId && defaultClient).map(id => [id, { clientId: defaultClient, clientRole: defaultRole }])) })); }} assignments={assignments} onAssignment={(id, value) => setAssignments(current => ({ ...current, [id]: value }))} busy={busy} />{!result.candidates.length && <p className="discovery-empty">No encontramos candidatos con estos criterios. Amplía la búsqueda o revisa el RUT.</p>}{result.hasMore && <button type="button" disabled={busy} className="discovery-load-more" onClick={() => void search(true)}>Cargar más candidatos</button>}</>}
      {error && <p role="alert" className="task-error">{error}</p>}{message && <p role="status" className="discovery-success">{message}</p>}
    </section></div><footer><span>{selected.length ? `${selected.length} ${selected.length===1?"expediente seleccionado":"expedientes seleccionados"}` : "Selecciona los expedientes que quieres incorporar"}</span><button type="button" onClick={onClose} disabled={busy}>Cerrar</button><button className="buho-primary" type="button" onClick={() => void add()} disabled={busy || !selected.length}>{busy ? "Procesando…" : `Agregar ${selected.length || ""} al seguimiento`}</button></footer>
  </ReviewDialog>;
}
