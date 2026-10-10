import type { ConclusionInput, ReportConclusion } from './feasibility-conclusion';
import type { SimilarityResult } from './similarity-contract';

export const CLASS_DECISIONS = {
  proceed: 'Se recomienda presentar la solicitud',
  moderate: 'Se recomienda presentar con riesgo moderado de oposición',
  avoid: 'No se recomienda presentar la solicitud',
  insufficient: 'Completar antecedentes antes de decidir',
} as const;
export type ClassDecision = keyof typeof CLASS_DECISIONS;
export type FeasibilityClassAnalysis = {
  proposal: ConclusionInput['proposal'];
  result: SimilarityResult;
  selectedIds: string[];
  conclusion?: ReportConclusion;
  recommendation?: ConclusionInput['recommendation'];
  explanation?: string;
  decision?: ClassDecision;
};
export function analysisClass(analysis: FeasibilityClassAnalysis): number {
  if (analysis.proposal.coverage.length !== 1) throw new Error('Cada análisis requiere exactamente una clase Niza.');
  return analysis.proposal.coverage[0].nice_class;
}
export function upsertClassAnalysis(analyses: FeasibilityClassAnalysis[], analysis: FeasibilityClassAnalysis) {
  const number = analysisClass(analysis);
  if (analysis.result.results.some(hit => !hit.classes.some(c => c.nice_class === number))) throw new Error('El análisis contiene antecedentes de otra clase.');
  const previous = analyses.findIndex(item => analysisClass(item) === number);
  return previous < 0 ? [...analyses, analysis] : analyses.map((item, index) => index === previous ? analysis : item);
}
export function classOnlyResult(result: SimilarityResult, number: number): SimilarityResult {
  const results = result.results.filter(hit => hit.classes.some(c => c.nice_class === number));
  const ids = new Set(results.map(hit => Number(hit.applicationId)));
  return { ...result, results, searchScope: result.searchScope ? { ...result.searchScope, niceClass: number } : undefined,
    groups: result.groups.flatMap(group => {
      const member_ids = group.member_ids.filter(id => ids.has(id));
      return member_ids.length ? [{ ...group, member_ids, representative_id: member_ids.includes(group.representative_id) ? group.representative_id : member_ids[0] }] : [];
    }) };
}
export function hasPercentages(value: string) {
  return /%|\bpor\s+ciento\b|\bporcent(?:aje|ual)/i.test(value);
}
export function requireReviewedConclusion(conclusion?: ReportConclusion) {
  if (!conclusion || !['openrouter', 'author'].includes(conclusion.source)) throw new Error('Prepara y revisa la conclusión de cada clase antes de generar el informe.');
  if (hasPercentages([conclusion.title, ...conclusion.paragraphs].join(' '))) throw new Error('Las conclusiones del informe deben expresarse sin porcentajes.');
  return conclusion;
}
