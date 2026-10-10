import { z } from 'zod';
import { CLASS_DECISIONS, hasPercentages, type ClassDecision } from './feasibility-study';
import { proposalSchema, type SimilarityResult } from './similarity-contract';
import { reportRecommendation, REPORT_RECOMMENDATIONS, type ReportRecommendation } from './feasibility-recommendation';
import { applyVerifiedDecision } from './verified-decisions';
import { reportProfileText, type ReportProfile } from './report-profile';

// Bounds cover the complete retrieved search, including full coverage and history.
const text=z.string().max(30000),nullable=text.nullable();
const mark=z.object({applicationId:text,registrationId:nullable,name:text,type:text,image:text,holders:z.array(z.object({name:text,rut:nullable.optional(),dv:nullable.optional()}).passthrough()).max(100),classes:z.array(z.object({nice_class:z.number().int().min(1).max(45),coverage_text:nullable.optional()}).passthrough()).max(100),filedAt:nullable,publishedAt:nullable,registeredAt:nullable,status:text,statusCode:nullable}).passthrough();
const hit=mark.extend({score:z.number().finite().min(0).max(1),channels:z.record(z.string(),z.object({rank:z.number().finite().optional(),score:z.number().finite().optional(),cosine:z.number().finite().optional(),contribution:z.number().finite().optional()}).passthrough()),history:z.array(z.object({date:text,title:text,detail:text.optional()}).passthrough()).max(5000)});
export const conclusionInputSchema=z.object({
  proposal:proposalSchema,
  result:z.object({query:mark,results:z.array(hit).max(100),groups:z.array(z.object({representative_id:z.number(),member_ids:z.array(z.number()),holder_names:z.array(text).optional()}).passthrough()).max(100),warnings:z.array(text).max(1000),candidateCount:z.number().finite().nonnegative(),elapsedSeconds:z.number().finite().nonnegative(),fetchedAt:z.iso.datetime({offset:true})}).passthrough(),
  selectedIds:z.array(z.string().max(30)).max(100).default([]),
  recommendation:z.enum(['review','proceed','adjust']).optional(),
  decision:z.enum(['proceed','moderate','avoid','insufficient']).optional(),
  client:z.string().trim().max(160).default(''),author:z.string().trim().max(160).default(''),
}).strict().refine(input => input.proposal.niceClass === undefined || input.result.results.every(hit => hit.classes.some(c => c.nice_class === input.proposal.niceClass)), { message: 'Los antecedentes deben pertenecer a la clase analizada.', path: ['result', 'results'] });
export type ConclusionInput=z.infer<typeof conclusionInputSchema>;
export type ReportConclusion={
  title:string; recommendation:ReportRecommendation; paragraphs:string[]; decision?:ClassDecision;
  source:'openrouter'|'deterministic'|'author';
  generationId?:string; reason?:'not_configured'|'provider_error'|'timeout'|'invalid_response'|'input_too_large';
  evidenceApplicationIds:string[]; model?:string;
};
export function conclusionContext(input:ConclusionInput,profile:ReportProfile){
  const result={...input.result,results:input.result.results.map(hit=>applyVerifiedDecision(hit))} as SimilarityResult;
  const context = {version:1,proposal:input.proposal,client:input.client,author:input.author||profile.lawyerName,studio:reportProfileText(profile),selection:{detailedApplicationIds:input.selectedIds,recommendationChosenByAuthor:input.recommendation??null,decisionChosenByAuthor:input.decision??null},search:result,deterministicAssessment:reportRecommendation(result,input.recommendation,'',input.proposal.coverage.map(c=>c.nice_class)),interpretation:{highSimilarityFrom:.65,mediumSimilarityFrom:.45,similarityIsRejectionProbability:false,scope:'El lote recuperado, con todos sus estados, coberturas, titulares, señales, advertencias e historial; la selección del informe no restringe la evaluación.'}};
  if (input.proposal.niceClass !== undefined) {
    const facts=Object.fromEntries(Object.entries(context).filter(([key])=>!['deterministicAssessment','interpretation'].includes(key)));
    // Proposed ownership and coverage come from the author, not a source query echo.
    const query = { ...result.query, name: input.proposal.name, holders: input.proposal.holders ?? [], classes: input.proposal.coverage.map(c => ({nice_class:c.nice_class,coverage_text:c.text})) };
    // Strip image fields even inside the original source payload: the model receives text only.
    return JSON.parse(JSON.stringify({ ...facts, search:{...result,query}, interpretation: { scope: 'Solo antecedentes de la clase indicada; analizar todos los resultados y comparar sus coberturas concretas. Sin evaluación automática previa. No se han enviado imágenes.' } }, (key, value) => /^(image|image_url|logo|imageData|dataUrl)$/i.test(key) ? undefined : value));
  }
  return context;
}
export function deterministicConclusion(input:ConclusionInput):ReportConclusion{
  const result={...input.result,results:input.result.results.map(hit=>applyVerifiedDecision(hit))} as SimilarityResult;
  const choice=reportRecommendation(result,input.recommendation,'',input.proposal.coverage.map(c=>c.nice_class));
  const name=input.proposal.name||input.result.query.name||'la marca propuesta';
  const classes=input.proposal.coverage.map(c=>c.nice_class).join(', ');
  const paragraphs=[`Para ${name}${classes?`, en ${input.proposal.coverage.length===1?'la clase':'las clases'} ${classes}`:''}, ${choice.explanation.charAt(0).toLocaleLowerCase('es')+choice.explanation.slice(1)}`];
  if(choice.evidence.uncertainHigh)paragraphs.push(`${choice.evidence.uncertainHigh} antecedente${choice.evidence.uncertainHigh===1?' tiene':'s tienen'} semejanza alta y estado por verificar. Antes de presentar corresponde confirmar su situación y comparar las coberturas.`);
  if(!input.proposal.coverage.length||input.proposal.coverage.some(c=>!c.text.trim()))paragraphs.push('Conviene precisar los productos o servicios que se pretende proteger para completar la comparación de coberturas.');
  if(result.warnings.length)paragraphs.push('La búsqueda informa advertencias sobre sus antecedentes. Deben revisarse antes de adoptar una decisión definitiva.');
  paragraphs.push(`La evaluación considera los ${result.results.length} resultados de la consulta, aunque el informe detalle solo una selección. El índice de semejanza no expresa una probabilidad de rechazo. La decisión de registro corresponde a INAPI.`);
  return {title:choice.title,recommendation:input.recommendation??choice.suggested,paragraphs,source:'deterministic',evidenceApplicationIds:result.results.filter(h=>h.score>=.45).map(h=>h.applicationId)};
}
export const conclusionResponseSchema=z.object({decision:z.enum(['proceed','moderate','avoid','insufficient']).optional(),recommendation:z.enum(['review','proceed','adjust']),paragraphs:z.array(z.string().trim().min(20).max(2400)).min(1).max(6),evidenceApplicationIds:z.array(z.string().max(30)).max(100)}).strict();
export function validateModelConclusion(value:unknown,input:ConclusionInput):ReportConclusion{
  const parsed=conclusionResponseSchema.parse(value);
  if(parsed.evidenceApplicationIds.some(id=>!input.result.results.some(h=>h.applicationId===id)))throw new Error('Referencia ajena a la consulta');
  if (hasPercentages(parsed.paragraphs.join(' '))) throw new Error('La conclusión contiene porcentajes');
  if (input.proposal.niceClass !== undefined) {
    if (!parsed.decision) throw new Error('Falta la decisión para esta clase');
    const recommendations = { proceed: 'proceed', moderate: 'review', avoid: 'adjust', insufficient: 'review' } as const;
    if (recommendations[parsed.decision] !== parsed.recommendation) throw new Error('Decisión y recomendación inconsistentes');
    if (!input.result.results.length && parsed.decision !== 'insufficient') throw new Error('Una búsqueda vacía no permite afirmar disponibilidad');
  }
  if(input.decision&&parsed.decision!==input.decision)throw new Error('La respuesta cambió la decisión por clase del autor');
  if(input.recommendation&&parsed.recommendation!==input.recommendation)throw new Error('La respuesta cambió la decisión del autor');
  return {...parsed,title:parsed.decision ? CLASS_DECISIONS[parsed.decision] : REPORT_RECOMMENDATIONS[parsed.recommendation],source:'openrouter'};
}
