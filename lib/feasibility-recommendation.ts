import type { SimilarityResult } from './similarity-contract';
import { feasibilityStatus, uncertainState } from './feasibility-policy';
import { applyVerifiedDecision } from './verified-decisions';

export const REPORT_RECOMMENDATIONS = {
  review: 'Revisar las coincidencias antes de presentar',
  proceed: 'Proseguir con la solicitud',
  adjust: 'Ajustar la marca antes de presentar',
} as const;
export type ReportRecommendation = keyof typeof REPORT_RECOMMENDATIONS;

export const REPORT_HIGH_SIMILARITY = 0.65;
export const REPORT_MEDIUM_SIMILARITY = 0.45;

// The author's selection controls only the detailed findings, not the assessment.
export function reportEvidence(result: SimilarityResult, proposalClasses: number[] = []) {
  const classes = new Set(proposalClasses);
  const relevant = (hit: SimilarityResult['results'][number]) => !classes.size || !hit.classes.length || hit.classes.some(item => classes.has(item.nice_class));
  const corrected = result.results.map(applyVerifiedDecision);
  const comparable = corrected.filter(hit => ['registered', 'pending'].includes(feasibilityStatus(hit)) && relevant(hit));
  const high = comparable.filter(hit => Number.isFinite(hit.score) && hit.score >= REPORT_HIGH_SIMILARITY);
  const medium = comparable.filter(hit => Number.isFinite(hit.score) && hit.score >= REPORT_MEDIUM_SIMILARITY && hit.score < REPORT_HIGH_SIMILARITY);
  const uncertainHigh = corrected.filter(hit => uncertainState(hit.status) && relevant(hit) && Number.isFinite(hit.score) && hit.score >= REPORT_HIGH_SIMILARITY);
  const scores = comparable.map(hit => hit.score).filter(Number.isFinite);
  return { high: high.length, medium: medium.length, uncertainHigh: uncertainHigh.length, topScore: scores.length ? Math.max(...scores) : null, comparable: comparable.length, checked: result.results.length };
}

export function reportRecommendation(result: SimilarityResult, choice?: ReportRecommendation, explanation = '', proposalClasses: number[] = []) {
  const evidence = reportEvidence(result, proposalClasses);
  const suggested: ReportRecommendation = evidence.high >= 2 ? 'adjust' : evidence.high || evidence.medium || evidence.uncertainHigh || !evidence.checked ? 'review' : 'proceed';
  const selected = choice ?? suggested;
  const pct = evidence.topScore == null ? '' : ` El mayor índice relevante es ${Math.round(evidence.topScore * 100)}%.`;
  const scope = proposalClasses.length ? 'en las clases consultadas o sin clase informada' : 'entre los resultados obtenidos';
  const reasons: Record<ReportRecommendation, string> = {
    adjust: `La búsqueda muestra ${evidence.high} marcas registradas o en trámite con similitud alta ${scope}.${pct} Conviene considerar otro nombre o diseño y volver a compararlo antes de presentar.`,
    review: evidence.high
      ? `La búsqueda muestra ${evidence.high} marca${evidence.high === 1 ? '' : 's'} vigente${evidence.high === 1 ? '' : 's'} con similitud alta ${scope}.${pct} Conviene revisarla${evidence.high === 1 ? '' : 's'} antes de decidir si se presenta la propuesta.`
      : evidence.medium
        ? `Hay ${evidence.medium} marca${evidence.medium === 1 ? '' : 's'} vigente${evidence.medium === 1 ? '' : 's'} con similitud media ${scope}.${pct} Conviene comparar los signos y productos antes de presentar.`
        : evidence.uncertainHigh
          ? `Hay ${evidence.uncertainHigh} resultado${evidence.uncertainHigh === 1 ? '' : 's'} de similitud alta cuyo estado actual no está claro. Conviene comprobarlo antes de presentar.`
          : 'La búsqueda no recuperó coincidencias suficientes para concluir que la marca esté libre. Conviene completar la revisión antes de presentar.',
    proceed: evidence.high || evidence.medium
      ? `Se puede preparar la solicitud, teniendo presentes las ${evidence.high + evidence.medium} coincidencias de similitud media o alta encontradas.${pct} La revisión de sus signos y productos debe quedar resuelta antes de presentar.`
      : `La búsqueda no mostró marcas registradas o en trámite con similitud media o alta ${scope}.${pct} Se puede preparar la solicitud con el nombre, imagen y productos o servicios definidos.`,
  };
  return { title: REPORT_RECOMMENDATIONS[selected], explanation: explanation.trim() || reasons[selected], suggested, evidence };
}
