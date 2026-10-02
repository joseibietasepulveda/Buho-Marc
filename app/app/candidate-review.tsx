"use client";
import Image from "next/image";
import { useClientDirectory } from "./client-provider";
import type { DiscoveryCandidate } from "@/lib/inapi-discovery";
export type CandidateAssignment = { clientId: string; clientRole: "holder" | "representative" };
export function CandidateReview({ candidates, selected, onSelected, assignments, onAssignment, busy = false }: {
  candidates: DiscoveryCandidate[]; selected: string[]; onSelected: (ids: string[]) => void;
  assignments: Record<string, CandidateAssignment>; onAssignment: (id: string, value: CandidateAssignment) => void; busy?: boolean;
}) {
  const { clients, newClient } = useClientDirectory();
  const available = candidates.filter(c => !c.tracked);
  const allSelected = available.length > 0 && available.every(c => selected.includes(c.applicationNumber));
  return <div className="candidate-review">
    <div className="candidate-select-toolbar"><label><input type="checkbox" checked={allSelected} disabled={busy || !available.length} onChange={e => onSelected(e.target.checked ? [...new Set([...selected, ...available.map(c => c.applicationNumber)])] : selected.filter(id => !available.some(c => c.applicationNumber === id)))} />Seleccionar resultados disponibles</label><span>{selected.length} seleccionados</span><button type="button" disabled={busy} onClick={() => newClient()}>Nuevo cliente +</button></div>
    {candidates.map(candidate => {
      const id = candidate.applicationNumber, checked = selected.includes(id);
      const assignment = assignments[id] ?? { clientId: "", clientRole: "holder" as const };
      return <article className={`candidate-row${checked ? " is-selected" : ""}`} key={id}>
        <div className="candidate-selection"><input type="checkbox" id={`candidate-${id}`} checked={checked} disabled={busy || candidate.tracked} onChange={e => onSelected(e.target.checked ? [...selected, id] : selected.filter(value => value !== id))} aria-label={`Seleccionar ${candidate.name}, solicitud ${id}`} />{candidate.logo ? <Image unoptimized src={candidate.logo} width={64} height={60} alt={`Logo de ${candidate.name}`} /> : <span className="candidate-no-logo">Sin logo</span>}</div>
        <div className="candidate-copy"><label htmlFor={`candidate-${id}`}><strong>{candidate.name}</strong></label><span>Solicitud {id}{candidate.registration ? ` · Registro ${candidate.registration}` : ""}</span><span>{candidate.registrationState} · Clases {candidate.classes || "no informadas"}</span><span>Titular: {candidate.owner || "No informado"}</span><p className="candidate-explanation">{candidate.explanation}</p>{candidate.tracked && <strong className="candidate-tracked">Ya incorporada · se omite el duplicado</strong>}</div>
        {!candidate.tracked && <div className="candidate-assignment"><label>Cliente<select aria-label={`Cliente de ${candidate.name}, solicitud ${id}`} value={assignment.clientId} disabled={busy} onChange={e => onAssignment(id, { ...assignment, clientId: e.target.value })}><option value="">Confirmar cliente…</option><option value="unassigned">Sin cliente asignado</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Rol del cliente<select aria-label={`Rol del cliente en ${candidate.name}, solicitud ${id}`} value={assignment.clientRole} disabled={busy} onChange={e => onAssignment(id, { ...assignment, clientRole: e.target.value as CandidateAssignment["clientRole"] })}><option value="holder">Titular / solicitante</option><option value="representative">Representante</option></select></label></div>}
      </article>;
    })}
  </div>;
}
