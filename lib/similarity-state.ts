import { inapiProcedure } from './inapi-provider';
import type { SimilarityHit } from './similarity-contract';

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const ended: Record<string,string> = { 'abandoned-inapi':'Abandonada', 'abandoned-payment':'Abandonada por falta de pago', 'not-filed':'No presentada', 'cancelled':'Anulada', 'expired':'Vencida', 'rejected-final':'Rechazada definitivamente' };

/** Reinterpret saved evidence as well as new searches, retaining the source wording. */
export function resolveSimilarityState<T extends SimilarityHit>(hit: T): T {
  if (hit.officialDecision) return hit;
  if (!hit.history?.length && hit.sourceStatus && hit.status !== hit.sourceStatus) return hit;
  const sourceStatus = hit.sourceStatus ?? hit.status;
  const raw = fold(sourceStatus);
  const procedure = inapiProcedure((hit.history ?? []).map(e => ({event_date:e.date,status_description:e.title,observation:e.detail})));
  // Watch snapshots omit history after normalization; preserve that interpretation.
  let status = !hit.history?.length && hit.sourceStatus ? hit.status : sourceStatus;
  // The result of an opposition is not itself the result of the application.
  if (!/recurso|apelacion|oposicion|solicita|solicitud de|por confirmar/.test(raw)) {
    if (/^(abandonad[ao]|abandono)(\b|$)/.test(raw)) status = 'Abandonada';
    else if (/^(anulad[ao]|cancelad[ao]|nulidad declarada)(\b|$)/.test(raw)) status = 'Anulada';
    else if (/^(vencid[ao]|expirad[ao]|caducad[ao])(\b|$)/.test(raw)) status = /caduc/.test(raw) ? 'Caducada' : 'Vencida';
    else if (/^(desistid[ao]|no presentada|denegad[ao]|rechazad[ao])(\b|$)/.test(raw)) status = /^desist/.test(raw) ? 'Desistida' : /^no presentada/.test(raw) ? 'No presentada' : 'Rechazada';
  }
  const rawEnded = /^(abandonada|anulada|vencida|caducada|desistida|no presentada|rechazada)$/.test(status.toLowerCase());
  if (!rawEnded) {
    const registrationConfirmed = hit.registrationId && hit.registeredAt && ["inapi-waiting","registered"].includes(procedure.status);
    if (registrationConfirmed) status = 'Registrada';
    else if (ended[procedure.status]) status = ended[procedure.status];
    else if (procedure.status === 'registered') status = 'Registrada';
    else if (procedure.status === 'appeal-pending') status = 'En trámite · apelación';
    else if (procedure.status === 'rejected-appeal') status = 'Rechazada · recurso por verificar';
    else if (['finality-pending','accepted-payment','partial-payment','payment-verification'].includes(procedure.status)) status = 'Concedida · pendiente de registro';
  }
  return { ...hit, sourceStatus, status };
}
