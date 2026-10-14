import {getSql} from './index';
import {applySavedInapiRecord,inapiDailyAttempts,officialRequestGate} from './inapi-recovery';
import {directRecoveryEnabled,recoveryDailyLimit} from '../lib/inapi-recovery';
import {fetchOfficialInapi,mergeOfficialEvidence} from '../lib/inapi-official';
import {reprojectInapiRecord} from '../lib/inapi-provider';
import {compareRecords,type SourceRecord} from '../lib/source-contract';
import {organizationId} from '../lib/tenant-context';
import {updatedApplication} from './source';
import {registrationFollowUp} from '../lib/registration-follow-up';

export type OfficialCheckResult = {status:'running'|'changed'|'unchanged'|'failed'|'limited';day:string;alreadyChecked?:boolean;busy?:boolean;record?:SourceRecord};
export class OfficialCheckError extends Error {
 readonly status:number;
 constructor(message:string,status:number){super(message);this.status=status;}
}

export async function checkRegistrationOfficial(publicCode:string,fetcher:typeof fetch=fetch) {
 const [row]=await getSql()`SELECT a.data,r.id AS source_id,r.data AS source_data FROM registration_applications a JOIN source_snapshots s ON s.entity_id=a.id AND s.organization_id=a.organization_id AND s.entity_type='application' JOIN source_records r ON r.id=s.source_id WHERE a.public_code=${publicCode} AND a.organization_id=${organizationId()} AND COALESCE(a.data->>'portfolioRole','own')<>'third-party'`;
 if(!row||row.source_data?.provider!=='inapi')throw new OfficialCheckError('No se encontró un expediente INAPI en tu cartera',404);
 const record=reprojectInapiRecord(row.source_data),app=updatedApplication(row.data,record,row.data.recentEvent);
 if(!registrationFollowUp(app))throw new OfficialCheckError('Este expediente no tiene un antecedente o actuación pendiente de revisión',409);
 return checkOfficialInapi(record,row.source_id,fetcher);
}

/** One explicit check per dossier/Santiago day, including errors. A missing
 * sourceId is for a trusted read-only audit: retain no dossier/customer data. */
export async function checkOfficialInapi(base:SourceRecord,sourceId?:string,fetcher:typeof fetch=fetch):Promise<OfficialCheckResult> {
 if(!directRecoveryEnabled())throw new OfficialCheckError('La consulta directa a INAPI no está habilitada en este ambiente',503);
 if(base.provider!=='inapi'||! /^[1-9]\d{0,8}$/.test(base.applicationNumber))throw new OfficialCheckError('Expediente INAPI inválido',400);
 const sql=getSql(),connection=await sql.reserve();let locked=false;
 try{
  const [{day}]=await connection`SELECT (now() AT TIME ZONE 'America/Santiago')::date::text AS day`;
  const [lock]=await connection`SELECT pg_try_advisory_lock(741031) AS acquired`;locked=lock.acquired;
  if(!locked)return {status:'running',day,busy:true};
  const [prior]=await connection`SELECT status FROM inapi_official_checks WHERE application_number=${base.applicationNumber} AND check_day=${day}`;
  if(prior)return {status:prior.status,day,alreadyChecked:true};
  if(sourceId){const [source]=await connection`SELECT application_number FROM source_records WHERE id=${sourceId}`;if(source?.application_number!==base.applicationNumber)throw new Error('El expediente no corresponde a la fuente indicada');}
  const [clock]=await connection`SELECT blocked_until>now() AS blocked FROM inapi_request_clock WHERE id=1`;
  const allowed=await inapiDailyAttempts(connection)<recoveryDailyLimit();
  const [attempt]=await connection`INSERT INTO inapi_official_checks(source_id,application_number,check_day,status,started_at,completed_at) VALUES(${sourceId??null},${base.applicationNumber},${day},${allowed&&!clock?.blocked?'running':allowed?'failed':'limited'},${allowed&&!clock?.blocked?new Date():null},${allowed&&!clock?.blocked?null:new Date()}) RETURNING id,status`;
  if(attempt.status!=='running')return {status:attempt.status,day};
  try{
   const official=await fetchOfficialInapi(base,officialRequestGate,fetcher);
   const projectedBase=reprojectInapiRecord(base);
   let changed=compareRecords(projectedBase,mergeOfficialEvidence(projectedBase,official,official.retrieval!.officialCheckedAt!)).length>0;
   if(sourceId) await sql.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(741028)`;
    const [saved]=await tx`SELECT data FROM source_records WHERE id=${sourceId} AND application_number=${base.applicationNumber} FOR UPDATE`;
    if(!saved)throw new Error('El expediente dejó de estar disponible');
    const current=reprojectInapiRecord(saved.data),checkedAt=official.retrieval!.officialCheckedAt!;
    const merged=mergeOfficialEvidence(current,official,checkedAt);
    changed=compareRecords(current,merged).length>0;
    merged.retrieval={...merged.retrieval,lastChangeDetectedAt:changed?checkedAt:saved.data.retrieval?.lastChangeDetectedAt};
    await tx`UPDATE source_records SET data=${tx.json(merged)},registration_number=${merged.registrationNumber},version=version+${changed?1:0},updated_at=now() WHERE id=${sourceId}`;
    await applySavedInapiRecord(tx,sourceId,merged);
   });
   const status=changed?'changed':'unchanged';
   await connection`UPDATE inapi_official_checks SET status=${status},completed_at=now() WHERE id=${attempt.id}`;
   return {status,day,record:official};
  }catch{
   await connection`UPDATE inapi_official_checks SET status='failed',completed_at=now(),error='La consulta oficial no se completó; se conservan los antecedentes anteriores' WHERE id=${attempt.id}`;
   await connection`UPDATE inapi_request_clock SET blocked_until=now()+interval '1 hour' WHERE id=1`;
   return {status:'failed',day};
  }
 }finally{try{if(locked)await connection`SELECT pg_advisory_unlock(741031)`;}finally{connection.release();}}
}
