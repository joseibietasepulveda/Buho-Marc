"use client";

import { useState, type FormEvent } from "react";
import type { LegalEvidence, RegistrationApplication } from "@/lib/registration-data";
import { currentActMatches, evidenceKindAllowed } from "@/lib/registration-evidence";
import { chileToday } from "@/lib/work-priorities";

const kinds: Record<LegalEvidence["kind"], { title: string; help: string }> = {
  notification: { title: "Fecha de notificación", help: "Revisa la constancia del medio correspondiente. La fecha de la resolución y el correo de cortesía no bastan para acreditar el depósito en casilla." },
  finality: { title: "Ejecutoria de la resolución", help: "Revisa el documento que acredita que la aceptación quedó firme, incluidos los recursos que correspondan. No se presume sumando días a la resolución." },
  "ready-to-resolve": { title: "Certificación de estar en estado de resolver", help: "Debe ser la certificación solicitada por el interesado a la que se refiere el artículo 24 de la Ley 19.880. Activa un control de INAPI, no un vencimiento del abogado." },
  "certificate-payment": { title: "Validación del pago de un certificado", help: "Sólo para un certificado solicitado y pagado. No es el título gratuito ni el pago final del registro. Activa el control de emisión de 10 días hábiles." },
};
const methods: Record<LegalEvidence["method"], string> = { "daily-state": "Estado Diario oficial", "inapi-inbox": "Depósito en casilla INAPI", personal: "Notificación personal acreditada", "official-document": "Documento oficial" };

export function RegistrationEvidenceEditor({ application, onSaved }: { application: RegistrationApplication; onSaved: () => Promise<void> }) {
  const options = (Object.keys(kinds) as LegalEvidence["kind"][]).filter(kind => (Object.keys(methods) as LegalEvidence["method"][]).some(method => evidenceKindAllowed(application, { kind, method })));
  const [kind, setKind] = useState<LegalEvidence["kind"]>(options[0] ?? "notification");
  const availableMethods = (Object.keys(methods) as LegalEvidence["method"][]).filter(method => evidenceKindAllowed(application, { kind, method }));
  const [method, setMethod] = useState<LegalEvidence["method"]>(availableMethods[0] ?? "official-document");
  const selectedMethod = availableMethods.includes(method) ? method : availableMethods[0];
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const p = application.procedure;
  const proof = p?.notificationProof;
  const evidence = application.legalEvidence ?? [];

  async function send(body: Record<string, unknown>) {
    setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/registrations/evidence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar el antecedente");
      await onSaved();
      setMessage(body.action === "revoke" ? "Antecedente retirado del cálculo. Su registro se conserva en la auditoría." : "Antecedente guardado. Los plazos se recalcularon con esta fecha.");
      return true;
    } catch (failure) { setError(true); setMessage(failure instanceof Error ? failure.message : "No se pudo guardar. Intenta nuevamente."); return false; }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const success = await send({ action: "save", applicationId: application.id, kind, method: selectedMethod, date: data.get("date"), reference: data.get("reference"), sourceUrl: data.get("sourceUrl"), confirmed: data.get("confirmed") === "on", actId: p?.sourceActId ?? "", actDate: p?.sourceActDate, actDescription: p?.sourceActDescription });
    if (success) form.reset();
  }
  if (!options.length && !proof && !evidence.length) return null;
  return <section className="registration-evidence" aria-label="Antecedentes para calcular plazos">
    <h3>Respaldo de los plazos</h3>
    {proof && <div className="evidence-verified"><strong>{proof.verifiedBy === "public-document" ? "Notificación acreditada en documento público" : "Notificación confirmada por el equipo"}</strong><p>{proof.date.split("-").reverse().join("/")} · {methods[proof.method as LegalEvidence["method"]] ?? proof.method}</p><p>{proof.reference}</p>{proof.sourceUrl && <a href={proof.sourceUrl} target="_blank" rel="noreferrer">Consultar respaldo ↗</a>}</div>}
    {options.length > 0 && !(options.length === 1 && kind === "notification" && proof?.verifiedBy === "public-document") && <details className="evidence-form-disclosure"><summary>Añadir o corregir antecedente</summary>
      {!p?.sourceActDate || !p.sourceActDescription ? <p>Falta identificar la actuación de origen. Revisa el expediente antes de agregar una fecha.</p> : <form onSubmit={submit}>
        <label>Antecedente<select value={kind} disabled={busy} onChange={event => setKind(event.target.value as LegalEvidence["kind"])}>{options.filter(option => option !== "notification" || proof?.verifiedBy !== "public-document").map(option => <option key={option} value={option}>{kinds[option].title}</option>)}</select></label>
        <p className="evidence-help">{kinds[kind].help}</p>
        <div className="evidence-input-row"><label>Fecha acreditada<input name="date" type="date" min={p.sourceActDate} max={chileToday()} required disabled={busy} /></label><label>Medio o documento<select value={selectedMethod} disabled={busy} onChange={event => setMethod(event.target.value as LegalEvidence["method"])}>{availableMethods.map(option => <option key={option} value={option}>{methods[option]}</option>)}</select></label></div>
        <label>Referencia del respaldo<textarea name="reference" minLength={10} maxLength={2000} placeholder="Nombre del documento, número de resolución y dónde consultar la constancia" required disabled={busy} /></label>
        <label>Enlace al documento (opcional)<input name="sourceUrl" type="url" placeholder="https://…" maxLength={2000} disabled={busy} /></label>
        <label className="evidence-confirm"><input name="confirmed" type="checkbox" required disabled={busy} /><span>Revisé el respaldo y confirmo que corresponde a esta solicitud y actuación. La fecha quedará registrada como confirmada por el equipo.</span></label>
        <button className="buho-primary" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar antecedente y recalcular"}</button>
      </form>}
    </details>}
    {message && <p role={error ? "alert" : "status"} className={error ? "evidence-error" : "evidence-success"}>{message}</p>}
    {evidence.length > 0 && <details className="evidence-audit"><summary>Historial de antecedentes del equipo ({evidence.length})</summary><ul>{[...evidence].reverse().map(item => <li key={item.id}><strong>{kinds[item.kind].title} · {item.date.split("-").reverse().join("/")}</strong><p>{item.reference}</p><small>{item.revokedAt ? "Retirado del cálculo" : currentActMatches(application, item) ? "Vinculado a la actuación actual" : "Conservado como antecedente de una actuación anterior"} · Registrado {new Date(item.recordedAt).toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}</small><details><summary>Ver trazabilidad</summary><p>Usuario: {item.recordedBy}</p><p>Actuación: {item.actDescription} · {item.actDate}</p><p>ID: {item.id}</p></details>{!item.revokedAt && <button type="button" disabled={busy} onClick={() => void send({ action: "revoke", applicationId: application.id, evidenceId: item.id })}>Retirar este antecedente del cálculo</button>}</li>)}</ul></details>}
  </section>;
}
