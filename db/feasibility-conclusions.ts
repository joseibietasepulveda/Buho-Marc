import { createHash, randomUUID } from 'node:crypto';
import { getSql } from './index';
import { actorId, organizationId } from '../lib/tenant-context';
import { reportProfileSchema } from '../lib/report-profile';
import { conclusionContext, type ConclusionInput, type ReportConclusion } from '../lib/feasibility-conclusion';
import { CONCLUSION_PROMPT_VERSION, generateConclusion, openRouterConfig } from '../lib/openrouter-conclusion';

export async function prepareConclusion(input: ConclusionInput) {
  const sql = getSql(), config = await openRouterConfig();
  const [organization] = await sql`SELECT report_profile FROM organizations WHERE id=${organizationId()}`;
  const profile = reportProfileSchema.parse(organization.report_profile);
  const context = conclusionContext(input, profile);
  const hash = createHash('sha256').update(JSON.stringify({ context, model: config.model, promptVersion: CONCLUSION_PROMPT_VERSION, credential: createHash('sha256').update(config.apiKey).digest('hex') })).digest('hex');
  const id = randomUUID();
  const claim = await sql.begin(async tx => {
    await tx`SELECT id FROM organizations WHERE id=${organizationId()} FOR UPDATE`;
    const [existing] = await tx`SELECT id,status,output,created_at,completed_at FROM feasibility_conclusions WHERE organization_id=${organizationId()} AND context_hash=${hash}`;
    if (existing) {
      if (existing.status === 'complete' && (existing.output?.source !== 'deterministic' || existing.output?.reason === 'not_configured' || input.proposal.niceClass === undefined && Date.now() - new Date(existing.completed_at).getTime() < 300000)) return { cached: existing.output as ReportConclusion };
      if (existing.status === 'pending' && Date.now() - new Date(existing.created_at).getTime() < 120000) return { pending: existing.id as string };
      // Retain failed/abandoned attempts and their metadata when retrying.
      const archivedHash = createHash('sha256').update(hash + existing.id).digest('hex');
      await tx`UPDATE feasibility_conclusions SET context_hash=${archivedHash},status=CASE WHEN status='pending' THEN 'abandoned' ELSE status END WHERE id=${existing.id}`;
    }
    await tx`INSERT INTO feasibility_conclusions (id,organization_id,user_id,context_hash,input,model) VALUES (${id},${organizationId()},${actorId()},${hash},${tx.json(JSON.parse(JSON.stringify({ ...context, promptVersion: CONCLUSION_PROMPT_VERSION })))},${config.model})`;
    return {};
  });
  if ('cached' in claim) return { conclusion: claim.cached };
  if ('pending' in claim) return { pending: claim.pending };
  const generated = await generateConclusion(input, profile, config);
  const conclusion = { ...generated.conclusion, generationId: id };
  await sql`UPDATE feasibility_conclusions SET status='complete',output=${sql.json(conclusion)},provider_id=${generated.providerId ?? null},usage=${generated.usage ? sql.json(JSON.parse(JSON.stringify(generated.usage))) : null},cost=${generated.cost ?? null},completed_at=now() WHERE id=${id} AND organization_id=${organizationId()}`;
  return { conclusion };
}
