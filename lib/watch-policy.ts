import { z } from 'zod';
import type { SimilarityHit } from './similarity-contract';
export const watchSettingsSchema = z.object({ high: z.number().min(0).max(1), medium: z.number().min(0).max(1) }).strict().refine(v => v.medium < v.high, { message: 'El límite medio debe ser menor que el alto.' });
export type WatchSettings = z.infer<typeof watchSettingsSchema>;
export const DEFAULT_WATCH_SETTINGS: WatchSettings = { high: .6, medium: .3 };
export const normalizedState = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es');
// System feature flags. Shared by the lists AND database counters. No records are deleted.
export const WATCH_VISIBILITY = { showRegistered: false, showLapsed: false, showExpired: false };
const terminalStates = ['denegada', 'rechazada', 'rechazada definitivamente', 'desistida', 'abandonada', 'caducada', 'caducado', 'vencida', 'vencido', 'expirada', 'expirado'];
export const registeredState = (value: string) => ['registrada', 'registrado'].includes(normalizedState(value));
export const terminalState = (value: string) => terminalStates.includes(normalizedState(value));
export function hiddenWatchStates(flags = WATCH_VISIBILITY) {
  return ['denegada', 'rechazada', 'rechazada definitivamente', 'desistida', 'abandonada',
    ...(!flags.showRegistered ? ['registrada', 'registrado'] : []),
    ...(!flags.showLapsed ? ['caducada', 'caducado'] : []),
    ...(!flags.showExpired ? ['vencida', 'vencido', 'expirada', 'expirado'] : [])];
}
export const hiddenDiscoveryState = (value: string, flags = WATCH_VISIBILITY) => hiddenWatchStates(flags).includes(normalizedState(value));
export const stateTone = (value: string) => registeredState(value) ? 'registered' : terminalState(value) ? 'negative' : 'pending';
export function discoveryLevel(hit: Pick<SimilarityHit, 'score'>, settings: WatchSettings) {
  return hit.score >= settings.high ? 'Alta' : hit.score >= settings.medium ? 'Media' : null;
}
export function discoveryOrder(a: SimilarityHit, b: SimilarityHit) {
  return Number(registeredState(a.status)) - Number(registeredState(b.status)) || b.score - a.score || a.applicationId.localeCompare(b.applicationId);
}

export const canWatchPublication = (hit: Pick<SimilarityHit, 'publishedAt' | 'registeredAt' | 'status'>) => !hit.publishedAt && !hit.registeredAt && !registeredState(hit.status) && !terminalState(hit.status);
