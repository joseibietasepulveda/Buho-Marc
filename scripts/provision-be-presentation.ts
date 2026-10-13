/** Explicit, bounded preparation; never runs on application startup. */
import { getSql } from '../db/index';
import { importRealRecord } from '../db/inapi-portfolio';
import { fetchInapiEvidence } from '../lib/inapi-provider';
import { runAs } from '../lib/tenant-context';
import { sourceRecordSchema } from '../lib/source-contract';

const pairs = [['1320072','1671049'],['1490801','1670768'],['1310436','1674156']] as const;
const apply = process.argv.includes('--apply');
if (!['9e2891f0-7281-4872-a992-2c48866a782d','01262643-e6b7-499c-ae75-e83254e1c697'].includes(process.env.RAILWAY_ENVIRONMENT_ID ?? '')) throw new Error('Ambiente fuera de Dev/producción autorizados');
const sql = getSql();
try {
  const [org] = await sql`SELECT o.id,o.name,m.user_id FROM organizations o JOIN organization_members m ON m.organization_id=o.id WHERE o.slug='barros-errazuriz' AND o.status='active' AND m.role='admin' ORDER BY m.user_id LIMIT 1`;
  if (!org) console.log(JSON.stringify({missingWorkspace:true,applied:false}));
  else {
    const ownIds = pairs.map(([own])=>own);
    const existing = await sql`SELECT monitoring_config->>'applicationNumber' AS application FROM brands WHERE organization_id=${org.id} AND monitoring_config->>'applicationNumber' IN ${sql(ownIds)}`;
    const missing = ownIds.filter(id=>!existing.some(row=>row.application===id));
    if (!apply) console.log(JSON.stringify({applied:false,missing,expectedPairs:pairs}));
    else {
      const saved = missing.length ? await sql`SELECT application_number,data FROM source_records WHERE application_number IN ${sql(missing)}` : [];
      const records = saved.map(row=>sourceRecordSchema.parse(row.data));
      const toFetch = missing.filter(id=>!records.some(record=>record.applicationNumber===id));
      if (toFetch.length) records.push(...(await fetchInapiEvidence({applicationIds:toFetch,registrationIds:[]})).records);
      if (records.some(record=>!record.registrationNumber || record.status!=='registered')) throw new Error('Las marcas propias solicitadas no están verificadas como registros vigentes');
      await runAs({organizationId:org.id,organizationSlug:'barros-errazuriz',userId:org.user_id,name:'Administrador',organizationName:org.name,role:'admin',mustChangePassword:false},()=>sql.begin(async tx=>{
        await tx`SELECT pg_advisory_xact_lock(hashtext(${org.id}),741028)`;
        for (const record of records) {
          // Recheck under the import lock; concurrent preparation cannot overwrite another person's changes.
          if ((await tx`SELECT id FROM brands WHERE organization_id=${org.id} AND monitoring_config->>'applicationNumber'=${record.applicationNumber}`).length) continue;
          await importRealRecord(tx,record,'brand');
          const [brand] = await tx`UPDATE brands SET monitoring_config=monitoring_config || '{"monitoringEnabled":true,"watchOnly":false}'::jsonb WHERE organization_id=${org.id} AND public_code=${'BM-R-'+record.applicationNumber} RETURNING id`;
          await tx`INSERT INTO audit_events(organization_id,actor_user_id,action,entity_type,entity_id,after_data) VALUES (${org.id},${org.user_id},'portfolio.be_presentation_2026_10_12','brand',${brand.id},${tx.json({application:record.applicationNumber,expectedMatch:pairs.find(([own])=>own===record.applicationNumber)?.[1],source:'dequienes'})})`;
        }
      }));
      console.log(JSON.stringify({applied:true,added:records.map(record=>({application:record.applicationNumber,name:record.name})),externalBatchRequests:toFetch.length?1:0}));
    }
    const matches=await sql`SELECT b.monitoring_config->>'applicationNumber' AS own,m.application_number AS found,m.evidence->'hit'->>'name' AS name,m.evidence->'hit'->>'score' AS score,m.evidence->'hit'->>'status' AS status,m.review_status FROM matches m JOIN brands b ON b.id=m.brand_id WHERE m.organization_id=${org.id} AND b.monitoring_config->>'applicationNumber' IN ${sql(ownIds)}`;
    console.log(JSON.stringify({verifiedPairs:pairs.map(([own,found])=>({own,found,match:matches.find(row=>row.own===own&&row.found===found)??null}))}));
  }
} finally {await sql.end();}
