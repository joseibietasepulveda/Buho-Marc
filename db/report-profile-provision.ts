import { readFile } from 'node:fs/promises';
import type { Sql } from 'postgres';
import { REPORT_PROFILE_PRESETS } from '../lib/report-profile-presets';
import { reportProfileSchema } from '../lib/report-profile';

export const REPORT_PROFILE_DEV_ENVIRONMENT = '9e2891f0-7281-4872-a992-2c48866a782d';
export async function provisionReportProfiles(sql: Sql, environmentId: string | undefined) {
  if (environmentId !== REPORT_PROFILE_DEV_ENVIRONMENT) throw new Error('La precarga de estudios está autorizada únicamente en Dev.');
  const prepared: string[] = [];
  for (const preset of REPORT_PROFILE_PRESETS) {
    const profile = reportProfileSchema.parse({ ...preset.profile,
      logo: preset.logoPath ? `data:image/png;base64,${(await readFile(preset.logoPath)).toString('base64')}` : '',
    });
    await sql.begin(async tx => {
      // Match an existing space by exact identity; never create accounts or overwrite edits.
      const updatedRows = await tx`UPDATE organizations SET report_profile=${JSON.stringify(profile)}::text::jsonb, report_profile_version=1, updated_at=now()
        WHERE (slug IN ${tx([preset.slug,...(preset.aliases??[])])} OR lower(name) IN ${tx((preset.names??[preset.profile.studioName]).map(name=>name.toLowerCase()))}) AND report_profile_version=0 AND report_profile='{}'::jsonb RETURNING id,slug`;
      for(const updated of updatedRows){await tx`INSERT INTO audit_events (organization_id,action,entity_type,entity_id,after_data)
        VALUES (${updated.id},'report_profile.updated','organization',${updated.id},${JSON.stringify({ ...profile, logo:profile.logo?'Logo guardado':'', initialSetup:true, source:preset.source??null })}::text::jsonb)`;
      prepared.push(updated.slug);}
    });
  }
  return prepared;
}
