import type { SimilarityResult } from './similarity-contract';

export const REPORT_RECOMMENDATIONS = {
  review: 'Revisar las coincidencias antes de presentar',
  proceed: 'Proseguir con la solicitud',
  adjust: 'Ajustar la marca antes de presentar',
} as const;
export type ReportRecommendation = keyof typeof REPORT_RECOMMENDATIONS;

// Uses the entire search, never a filtered subset. A favorable recommendation
// must be selected by the author; an empty search is not automatic clearance.
export function reportRecommendation(result: SimilarityResult, choice: ReportRecommendation = 'review', explanation = '') {
  const reasons = {
    review: result.results.length
      ? 'Encontramos marcas que conviene comparar con tu propuesta antes de presentar la solicitud. El siguiente paso es revisar sus nombres, diseños y productos o servicios.'
      : 'Esta búsqueda no encontró marcas similares. Antes de presentar la solicitud, conviene completar la revisión del nombre y de los productos o servicios que quieres ofrecer.',
    proceed: 'El siguiente paso es preparar la solicitud con el nombre, la imagen y los productos o servicios que se acordaron para esta marca.',
    adjust: 'Conviene trabajar una alternativa de nombre o diseño y volver a compararla antes de presentar la solicitud.',
  };
  return { title: REPORT_RECOMMENDATIONS[choice], explanation: explanation.trim() || reasons[choice] };
}
