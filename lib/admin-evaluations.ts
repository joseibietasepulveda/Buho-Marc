import type { AnalyticsScope } from './admin-analytics';

export type EvaluationSource = 'formal' | 'feedback' | 'feedback_snapshot';
export type EvaluationFilter = { page:number; pageSize:number; search:string; source:'all'|'formal'|'feedback'; outcome:'all'|'positive'|'negative'|'neutral'; focus:'all'|'changes'|'comments'; matchId:string|null; allDates:boolean; asOf:string|null };
export type EvaluationCounts = { evaluations:number; uniqueCrosses:number; records:number; thumbsUp:number; thumbsDown:number; formalEvaluations:number; opinionChanges:number; commentUpdates:number; commentOnly:number; snapshots:number };
export type EvaluationUserCounts = EvaluationCounts & { organizationId:string; userId:string|null };
export type EvaluationRow = {
 id:string; organizationId:string; organization:string; userId:string|null; user:string|null;
 matchId:string|null; matchCode:string|null; reference:string|null; candidate:string|null; ownApplication:string|null; candidateApplication:string|null;
 at:string; source:EvaluationSource; kind:'evaluation'|'comment'; decision:string; outcome:'positive'|'negative'|'neutral'; previousDecision:string|null;
 opinionChanged:boolean; commentChanged:boolean; comment:string; previousComment:string; reason:string; previousReason:string; score:number|null; scoreAtEvaluation:boolean; snapshot:boolean;
};
export type EvaluationsPage = {scope:AnalyticsScope;filters:EvaluationFilter;rows:EvaluationRow[];total:number;page:number;pageSize:number;pages:number;coverage:string};
export const EMPTY_EVALUATION_COUNTS:EvaluationCounts={evaluations:0,uniqueCrosses:0,records:0,thumbsUp:0,thumbsDown:0,formalEvaluations:0,opinionChanges:0,commentUpdates:0,commentOnly:0,snapshots:0};
export const evaluationDecision=(value:string)=>value==='up'?'👍 Me interesa':value==='down'?'👎 No me interesa':value;
