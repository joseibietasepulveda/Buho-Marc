import type { FeasibilityReportInput } from './feasibility-report';
import { conclusionText } from './report-selection';

export type ReportAudience = 'client' | 'study';
export const STUDIO_LOGO_SCALE = .8;
export const reportBrand = (value:string) => value.trim().normalize('NFC').toLocaleUpperCase('es');
const escapePattern = (value:string) => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

/** Presentation only: never change the source records or the saved conclusion. */
export function reportPresentation(input:FeasibilityReportInput) {
  const study = input.audience === 'study';
  const records = input.analyses?.flatMap(item=>item.result.results) ?? input.result.results;
  const names = [...new Set([input.proposal.name,...records.map(hit=>hit.name)].map(value=>value.trim().normalize('NFC')).filter(Boolean))].sort((a,b)=>b.length-a.length);
  const namePattern = names.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${names.map(escapePattern).join('|')})(?![\\p{L}\\p{N}])`,'giu') : undefined;
  const ids = [...new Set(records.flatMap(hit=>[hit.applicationId,hit.registrationId].filter((value):value is string=>Boolean(value))))];
  function text(value:string) {
    let result=conclusionText(value);
    if(namePattern)result=result.replace(namePattern,reportBrand);
    if(!study) {
      const before=result;
      for(const id of ids) {
        const literal=escapePattern(id);
        result=result.replace(new RegExp(`\\b(solicitud(?:es)?|registro(?:s)?)\\s*(?:n[º°.]?\\s*|número\\s*|nro\\.?\\s*)?:?\\s*${literal}\\b`,'giu'),'$1');
        if(id.length>=4)result=result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${literal}(?![\\p{L}\\p{N}])`,'gu'),'');
      }
      if(result!==before)result=result.replace(/\(\s*(?:(?:solicitud(?:es)?|registro(?:s)?)\s*[,;·]?\s*)*\)/giu,'').replace(/\s+([,.;:])/g,'$1').replace(/ {2,}/g,' ').trim();
    }
    return result;
  }
  function conclusion(value:string) {
    // Older consumers may supply a deterministic explanation containing an index.
    if(!/(?:factor\s+de\s+similitud|\bíndice\b|\bindice\b|\d+(?:[.,]\d+)?\s*%)/iu.test(value))return text(value);
    const sentences=value.match(/[^.!?]+(?:[.!?]|$)/g)??[];
    return text(sentences.filter(sentence=>!/(?:factor\s+de\s+similitud|\bíndice\b|\bindice\b|\d+(?:[.,]\d+)?\s*%)/iu.test(sentence)).map(sentence=>sentence.trim()).join(' '));
  }
  return {study,text,conclusion};
}
