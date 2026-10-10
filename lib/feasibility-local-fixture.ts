import { readFile, stat } from 'node:fs/promises';
import { classOnlyResult } from './feasibility-study';
import { conclusionInputSchema, type ConclusionInput } from './feasibility-conclusion';
import { feasibilityStatus } from './feasibility-policy';
import { SimilarityError } from './similarity-provider';
import { foldText } from './text-search';

/** Opt-in local QA only. Hosted builds and configured real sources never use fixtures. */
export async function localFeasibilityFixture(proposal: ConclusionInput['proposal']) {
  const path=process.env.BUHO_LOCAL_FEASIBILITY_FIXTURE;
  if(!path || process.env.NODE_ENV!=='development' || process.env.SOURCE_PROVIDER!=='simulated' || !process.env.APP_PUBLIC_ORIGIN?.startsWith('http://127.0.0.1:'))return null;
  if((await stat(/* turbopackIgnore: true */ path)).size>2*1024*1024)throw new SimilarityError('La consulta local de prueba supera el tamaño permitido.',413);
  const raw=JSON.parse(await readFile(/* turbopackIgnore: true */ path,'utf8'));
  const result=conclusionInputSchema.parse({proposal:{name:raw.query?.name},result:raw}).result;
  if(foldText(proposal.name)!==foldText(result.query.name))throw new SimilarityError(`La prueba local utiliza la marca «${result.query.name}». Usa ese nombre para reutilizar sus antecedentes.`,400);
  const scoped=proposal.niceClass ? classOnlyResult(result,proposal.niceClass) : result;
  const filtered={...scoped,results:scoped.results.filter(hit=>hit.score>=proposal.minSimilarity && proposal.states.includes(feasibilityStatus(hit)))};
  // Rebuild groups after all filters, preserving the original consultation time.
  const ids=new Set(filtered.results.map(hit=>Number(hit.applicationId)));
  filtered.groups=filtered.groups.flatMap(group=>{const member_ids=group.member_ids.filter(id=>ids.has(id));return member_ids.length?[{...group,member_ids,representative_id:member_ids.includes(group.representative_id)?group.representative_id:member_ids[0]}]:[];});
  return {...filtered,sourceType:'fixture' as const,warnings:[...filtered.warnings,'Datos simulados para pruebas locales. No corresponden a una búsqueda real de INAPI.'],searchScope:{retrieved:result.results.length,limit:100,niceClass:proposal.niceClass,states:proposal.states,minSimilarity:proposal.minSimilarity}};
}
