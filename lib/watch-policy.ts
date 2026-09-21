import { z } from 'zod';
import type { SimilarityHit } from './similarity-contract';
export const watchSettingsSchema = z.object({ high: z.number().min(0).max(1), medium: z.number().min(0).max(1) }).strict().refine(v => v.medium < v.high, { message: 'El límite medio debe ser menor que el alto.' });
export type WatchSettings = z.infer<typeof watchSettingsSchema>;
export const DEFAULT_WATCH_SETTINGS: WatchSettings = { high: .6, medium: .3 };
export const normalizedState = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es');
// Exact source labels only: this is a display rule, never a legal conclusion.
export const hiddenDiscoveryState = (value: string) => ['denegada', 'desistida', 'abandonada'].includes(normalizedState(value));
export const registeredState = (value: string) => normalizedState(value) === 'registrada';
export const stateTone = (value: string) => registeredState(value) ? 'registered' : hiddenDiscoveryState(value) ? 'negative' : 'pending';
export function discoveryLevel(hit: Pick<SimilarityHit, 'score'>, settings: WatchSettings) {
  return hit.score >= settings.high ? 'Alta' : hit.score >= settings.medium ? 'Media' : null;
}
export function discoveryOrder(a: SimilarityHit, b: SimilarityHit) {
  return Number(registeredState(a.status)) - Number(registeredState(b.status)) || b.score - a.score || a.applicationId.localeCompare(b.applicationId);
}

export const canWatchPublication = (hit: Pick<SimilarityHit, 'publishedAt' | 'registeredAt' | 'status'>) => !hit.publishedAt && !hit.registeredAt && !registeredState(hit.status);
