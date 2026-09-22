import { z } from 'zod';
import type { SimilarityHit } from './similarity-contract';
export const watchSettingsSchema = z.object({ high: z.number().min(0).max(1), medium: z.number().min(0).max(1) }).strict().refine(v => v.medium < v.high, { message: 'El límite medio debe ser menor que el alto.' });
export type WatchSettings = z.infer<typeof watchSettingsSchema>;
export const DEFAULT_WATCH_SETTINGS: WatchSettings = { high: .65, medium: .45 };
export const normalizedState = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es');
// System feature flags. Shared by the lists AND database counters. No records are deleted.
export const WATCH_VISIBILITY = { showRegistered: true, showLapsed: false, showExpired: false };
const terminalStates = ['denegada', 'rechazada', 'rechazada definitivamente', 'desistida', 'abandonada', 'abandonada por falta de pago', 'anulada', 'anulado', 'cancelada', 'cancelado', 'no presentada', 'caducada', 'caducado', 'vencida', 'vencido', 'expirada', 'expirado'];
export const registeredState = (value: string) => /^(registrad[ao]|concedid[ao])(?:$|\s| ·)/.test(normalizedState(value));
export const terminalState = (value: string) => terminalStates.includes(normalizedState(value)) || /^rechazada · recurso por verificar/.test(normalizedState(value));
export const pendingState = (value: string) => /^(en tramite|en tramitacion|pendiente|solicitud en tramite|examen|observacion|publicada|publicacion|aceptada a tramite|en oposicion|oposicion en tramite|recurso|apelacion)/.test(normalizedState(value));
export function hiddenWatchStates(flags = WATCH_VISIBILITY) {
  return ['denegada', 'rechazada', 'rechazada definitivamente', 'rechazada · recurso por verificar', 'desistida', 'abandonada', 'abandonada por falta de pago', 'anulada', 'anulado', 'cancelada', 'cancelado', 'no presentada',
    ...(!flags.showRegistered ? ['registrada', 'registrado'] : []),
    ...(!flags.showLapsed ? ['caducada', 'caducado'] : []),
    ...(!flags.showExpired ? ['vencida', 'vencido', 'expirada', 'expirado'] : [])];
}
export const hiddenDiscoveryState = (value: string, flags = WATCH_VISIBILITY) => {
  if (registeredState(value) && !flags.showRegistered) return true;
  if (hiddenWatchStates(flags).includes(normalizedState(value))) return true;
  return !(registeredState(value) || pendingState(value) || (flags.showLapsed && /^caducad/.test(normalizedState(value))) || (flags.showExpired && /^(vencid|expirad)/.test(normalizedState(value))));
};
export const stateTone = (value: string) => registeredState(value) ? 'registered' : terminalState(value) ? 'negative' : 'pending';
export function discoveryLevel(hit: Pick<SimilarityHit, 'score'>, settings: WatchSettings) {
  return hit.score >= settings.high ? 'Alta' : hit.score >= settings.medium ? 'Media' : null;
}
export function discoveryOrder(a: SimilarityHit, b: SimilarityHit) {
  return b.score - a.score || a.applicationId.localeCompare(b.applicationId);
}

export const canWatchPublication = (hit: Pick<SimilarityHit, 'publishedAt' | 'registeredAt' | 'status'>) => !hit.publishedAt && !hit.registeredAt && !registeredState(hit.status) && !terminalState(hit.status);
