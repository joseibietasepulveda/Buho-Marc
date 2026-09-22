import type { SimilarityHit } from './similarity-contract';
import { normalizedState, registeredState, terminalState } from './watch-policy';
export type FeasibilityStatus = 'all' | 'registered' | 'pending' | 'other';
export const FEASIBILITY_STATUS_LABELS = { all: 'Todos los estados', registered: 'Registradas', pending: 'En trámite', other: 'Otros / por verificar' };
export const uncertainState = (value: string) => /ver instancia|no disponible|no informado|sin estado/.test(normalizedState(value));
export function feasibilityStatus(hit: Pick<SimilarityHit, 'status' | 'statusCode'>): Exclude<FeasibilityStatus, 'all'> {
  if (registeredState(hit.status)) return 'registered';
  if (terminalState(hit.status) || uncertainState(hit.status)) return 'other';
  const state = normalizedState(hit.status);
  return hit.statusCode === 'P' || /tramite|examen|publicacion|oposicion|solicitud|pendiente/.test(state) ? 'pending' : 'other';
}
export const filterFeasibility = (hits: SimilarityHit[], status: FeasibilityStatus) => status === 'all' ? hits : hits.filter(hit => feasibilityStatus(hit) === status);
