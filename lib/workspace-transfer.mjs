// Explicit one-off operation. Never called by application startup or HTTP routes.
export const TRANSFER_ORG = "10000000-0000-4000-8000-000000000001";
export const TRANSFER_DEV = "9e2891f0-7281-4872-a992-2c48866a782d";
export const TRANSFER_PRODUCTION = "01262643-e6b7-499c-ae75-e83254e1c697";
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const skipped = new Set(['auth_sessions', 'similarity_search_locks', 'snapshot_revisions', 'release_acknowledgements']);
export async function exportWorkspace(sql, environment) {
  if (![TRANSFER_DEV, TRANSFER_PRODUCTION, 'local-test'].includes(environment)) throw Error('Ambiente no autorizado');
  return sql.begin('isolation level repeatable read read only', async tx => {
    await tx`SET LOCAL timezone='UTC'`;
    const [org] = await tx`SELECT * FROM organizations WHERE id=${TRANSFER_ORG} AND slug='estudio-ibieta-ip'`;
    if (!org) throw Error('No se encontró el espacio Búho Marc esperado');
    const catalog = await tx`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
    const schema = {};
    for (const c of catalog) (schema[c.table_name] ??= []).push({name:c.column_name,type:c.data_type});
    const tables = {organizations:[org]};
    for (const [table, columns] of Object.entries(schema)) {
      if (skipped.has(table) || !columns.some(c=>c.name==='organization_id')) continue;
      tables[table] = await tx.unsafe(`SELECT * FROM ${quote(table)} WHERE organization_id=$1`, [TRANSFER_ORG]);
    }
    tables.users = await tx`SELECT u.id,u.name,u.email,u.initials,u.created_at FROM users u JOIN organization_members m ON m.user_id=u.id WHERE m.organization_id=${TRANSFER_ORG}`;
    tables.plans = await tx`SELECT DISTINCT p.* FROM plans p JOIN subscriptions s ON s.plan_id=p.id WHERE s.organization_id=${TRANSFER_ORG}`;
    tables.brand_classes = await tx`SELECT c.* FROM brand_classes c JOIN brands b ON b.id=c.brand_id WHERE b.organization_id=${TRANSFER_ORG}`;
    tables.brand_files = await tx`SELECT c.* FROM brand_files c JOIN brands b ON b.id=c.brand_id WHERE b.organization_id=${TRANSFER_ORG}`;
    tables.case_members = await tx`SELECT c.* FROM case_members c JOIN cases b ON b.id=c.case_id WHERE b.organization_id=${TRANSFER_ORG}`;
    tables.match_scores = await tx`SELECT c.* FROM match_scores c JOIN matches b ON b.id=c.match_id WHERE b.organization_id=${TRANSFER_ORG}`;
    tables.monitoring_job_attempts = await tx`SELECT c.* FROM monitoring_job_attempts c JOIN monitoring_jobs b ON b.id=c.monitoring_job_id WHERE b.organization_id=${TRANSFER_ORG}`;
    tables.source_records = await tx`SELECT DISTINCT r.* FROM source_records r JOIN source_snapshots s ON s.source_id=r.id WHERE s.organization_id=${TRANSFER_ORG}`;
    tables.inapi_recovery_jobs = await tx`SELECT j.* FROM inapi_recovery_jobs j WHERE j.source_id IN (SELECT source_id FROM source_snapshots WHERE organization_id=${TRANSFER_ORG})`;
    const keys = {};
    for (const table of Object.keys(tables)) keys[table] = (await tx`SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) WHERE i.indrelid=${'public.'+table}::regclass AND i.indisprimary ORDER BY array_position(i.indkey,a.attnum)`).map(r=>r.attname);
    return {format:1,organization:TRANSFER_ORG,environment,at:new Date().toISOString(),schema,keys,tables};
  });
}

const order = ['organizations','files','client_contacts','subscriptions','brands','brand_classes','brand_files','source_records','registration_applications','monitoring_jobs','monitoring_job_attempts','matches','cases','case_members','case_tasks','match_scores','match_reviews','legal_deadlines','comments','notifications','email_drafts','source_snapshots','source_sync_runs','registration_tasks','saved_views','audit_events','feasibility_conclusions','watch_feedback','inapi_recovery_jobs','organization_members'];
const children = {brand_classes:['brands','brand_id'],brand_files:['brands','brand_id'],case_members:['cases','case_id'],match_scores:['matches','match_id'],monitoring_job_attempts:['monitoring_jobs','monitoring_job_id']};
export async function importWorkspace(sql, records, environment, {apply=false, progress=()=>{}}={}) {
  if (![TRANSFER_PRODUCTION,'local-test'].includes(environment)) throw Error('El destino debe ser producción o ensayo local');
  let result;
  const rollback = new Error('Transfer dry-run rollback');
  try { await sql.begin(async tx=>{
    await tx`SET LOCAL timezone='UTC'`;
    await tx`SET LOCAL lock_timeout='5s'`;
    await tx`SET LOCAL statement_timeout='300s'`;
    await tx`SELECT pg_advisory_xact_lock(741080)`;
    let meta, current, buffer=[];
    const loaded={};
    const flush=async()=>{
      if(!buffer.length)return;
      await tx.unsafe(`INSERT INTO ${quote('buho_transfer_'+current)} SELECT * FROM jsonb_populate_recordset(NULL::public.${quote(current)},$1::jsonb)`,[tx.json(buffer)]);
      loaded[current]=(loaded[current]??0)+buffer.length;buffer=[];
    };
    for await (const line of records) {
      if(!meta){
        meta=line.meta;
        if(meta?.format!==1 || meta.environment!==TRANSFER_DEV || meta.organization!==TRANSFER_ORG)throw Error('Exportación Dev/Búho inválida');
        const allowed=new Set([...order,'users','plans']);
        for(const table of Object.keys(meta.keys)){
          if(!allowed.has(table))throw Error('Tabla no autorizada: '+table);
          const columns=await tx`SELECT column_name AS name,data_type AS type FROM information_schema.columns WHERE table_schema='public' AND table_name=${table} ORDER BY ordinal_position`;
          if(JSON.stringify(columns)!==JSON.stringify(meta.schema[table]))throw Error('Esquema incompatible: '+table);
          await tx.unsafe(`CREATE TEMP TABLE ${quote('buho_transfer_'+table)} (LIKE public.${quote(table)} INCLUDING DEFAULTS) ON COMMIT DROP`);
        }
        continue;
      }
      const {table,row}=line;
      if(!meta.keys[table] || !row || (row.organization_id && row.organization_id!==TRANSFER_ORG) || (table==='organizations' && (row.id!==TRANSFER_ORG || row.slug!=='estudio-ibieta-ip')))throw Error('Fila fuera del alcance');
      // Users and plans are checked separately; no credentials are imported.
      if(table==='users')continue;
      if(current!==table){await flush();current=table;progress({loading:table});}
      buffer.push(row);if(buffer.length>=40)await flush();
    }
    await flush();if(!meta)throw Error('Exportación vacía');
    const [org]=await tx`SELECT id FROM organizations WHERE id=${TRANSFER_ORG} AND slug='estudio-ibieta-ip' FOR UPDATE`;
    if(!org)throw Error('No se encontró la cuenta Búho en destino');
    const missingUsers=await tx`SELECT m.user_id FROM buho_transfer_organization_members m LEFT JOIN users u ON u.id=m.user_id WHERE u.id IS NULL`;
    if(missingUsers.length)throw Error('Faltan usuarios en producción; no se inventan ni copian claves');
    for(const table of order)if(meta.keys[table])await tx.unsafe(`LOCK TABLE public.${quote(table)} IN SHARE ROW EXCLUSIVE MODE`);
    // Seed contacts have environment-specific UUIDs. Reuse their production identity,
    // including every UUID reference nested in JSON, without touching production users.
    const contactIds=await tx`SELECT s.id AS source,d.id AS destination FROM buho_transfer_client_contacts s JOIN client_contacts d ON d.organization_id=s.organization_id AND d.public_code=s.public_code WHERE s.id<>d.id`;
    const caseIdentities=await tx`SELECT s.id AS source,d.id AS destination,s.public_code AS source_code,d.public_code AS destination_code FROM buho_transfer_cases s JOIN cases d ON d.organization_id=s.organization_id AND d.source_match_id=s.source_match_id WHERE s.id<>d.id`;
    const brandCodes=await tx`SELECT s.public_code AS source,replace(s.public_code,'BM-','BM-DEV-') AS destination,s.name AS source_name,d.name AS destination_name FROM buho_transfer_brands s JOIN brands d ON d.organization_id=s.organization_id AND d.public_code=s.public_code WHERE s.id<>d.id`;
    const demoCollisions={'BM-114':['ORIGEN','FANTA'],'BM-115':['ACME ANDES','SPRITE'],'BM-116':['COCA-COLA','POWERADE']};
    for(const item of brandCodes){
      if(JSON.stringify(demoCollisions[item.source])!==JSON.stringify([item.source_name,item.destination_name]))throw Error('Colisión de marca no revisada; requiere revisión');
      const occupied=await tx`SELECT 1 FROM brands d JOIN buho_transfer_brands s ON s.public_code=${item.source} WHERE d.organization_id=${TRANSFER_ORG} AND d.public_code=${item.destination} AND d.id<>s.id`;
      if(occupied.length)throw Error('El código de conservación ya está ocupado');
    }
    const replacements=Object.fromEntries([...contactIds,...caseIdentities,...caseIdentities.map(x=>({source:x.source_code,destination:x.destination_code})),...brandCodes].map(x=>[x.source,x.destination]));
    if(Object.keys(replacements).length){
      await tx.unsafe(`CREATE FUNCTION pg_temp.buho_remap(value jsonb, mapping jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
        DECLARE answer jsonb;
        BEGIN
          CASE jsonb_typeof(value)
          WHEN 'string' THEN RETURN COALESCE(mapping->(value#>>'{}'),value);
          WHEN 'array' THEN SELECT COALESCE(jsonb_agg(pg_temp.buho_remap(v,mapping) ORDER BY n),'[]'::jsonb) INTO answer FROM jsonb_array_elements(value) WITH ORDINALITY a(v,n);
          WHEN 'object' THEN SELECT COALESCE(jsonb_object_agg(k,pg_temp.buho_remap(v,mapping)),'{}'::jsonb) INTO answer FROM jsonb_each(value) a(k,v);
          ELSE RETURN value;
          END CASE;
          RETURN answer;
        END $$`);
      const pattern=Object.keys(replacements).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
      for(const table of order){
        if(!meta.keys[table])continue;
        const cols=meta.schema[table].map(c=>c.name);
        await tx.unsafe(`UPDATE ${quote('buho_transfer_'+table)} s SET (${cols.map(quote).join(',')})=(SELECT ${cols.map(quote).join(',')} FROM jsonb_populate_record(NULL::public.${quote(table)},pg_temp.buho_remap(to_jsonb(s),$1::jsonb))) WHERE to_jsonb(s)::text ~ $2`,[tx.json(replacements),pattern]);
      }
    }
    progress({mappedContacts:contactIds.length,mappedCases:caseIdentities.length,preservedBrandCodeCollisions:brandCodes.length});
    const plans=await tx`SELECT p.id FROM buho_transfer_plans p LEFT JOIN plans d ON d.id=p.id WHERE d.id IS NULL OR (to_jsonb(d)-'created_at')<>(to_jsonb(p)-'created_at')`;
    if(plans.length)throw Error('Los planes globales no coinciden');
    const active=await tx`SELECT id FROM buho_transfer_monitoring_jobs WHERE status IN ('queued','running','retry')`;
    if(active.length)throw Error('Hay consultas activas: no se duplican trabajos entre ambientes');
    const sourceConflicts=await tx`SELECT s.id FROM buho_transfer_source_records s JOIN source_records d ON d.application_number=s.application_number OR d.registration_number=s.registration_number OR d.id=s.id WHERE to_jsonb(s)<>to_jsonb(d)`;
    if(sourceConflicts.length)throw Error('Fuentes globales en conflicto; no se sobrescriben datos compartidos');
    for(const table of order){
      if(!meta.keys[table])continue;
      const columns=meta.schema[table].map(c=>c.name);
      if(columns.includes('organization_id') && !['organizations'].includes(table)){
        const keys=meta.keys[table];
        const collisions=await tx.unsafe(`SELECT 1 FROM public.${quote(table)} d JOIN ${quote('buho_transfer_'+table)} s ON ${keys.map(k=>`d.${quote(k)}=s.${quote(k)}`).join(' AND ')} WHERE d.organization_id<>$1 LIMIT 1`,[TRANSFER_ORG]);
        if(collisions.length)throw Error('Identificador ocupado por otro estudio: '+table);
      }
    }
    async function protectedState(){
      const state={};
      for(const table of [...order,'users','plans']){
        if(!meta.keys[table])continue;
        let filter='true';
        if(table==='organizations')filter='t.id<>$1';
        else if(meta.schema[table].some(c=>c.name==='organization_id'))filter='t.organization_id<>$1';
        else if(children[table]){const [parent,fk]=children[table];filter=`t.${quote(fk)} IN (SELECT id FROM public.${quote(parent)} WHERE organization_id<>$1)`;}
        // New unshared source records may be added; existing global rows are protected.
        else if(table==='source_records')filter='t.id IN (SELECT id FROM buho_existing_sources)';
        else if(table==='inapi_recovery_jobs')filter='t.id IN (SELECT id FROM buho_existing_recovery)';
        const params=filter.includes('$1')?[TRANSFER_ORG]:[];
        state[table]=(await tx.unsafe(`SELECT count(*)::int AS count,md5(COALESCE(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS hash FROM public.${quote(table)} t WHERE ${filter}`,params))[0];
      }
      return state;
    }
    await tx`CREATE TEMP TABLE buho_existing_sources ON COMMIT DROP AS SELECT id FROM source_records`;
    await tx`CREATE TEMP TABLE buho_existing_recovery ON COMMIT DROP AS SELECT id FROM inapi_recovery_jobs`;
    const before=await protectedState();
    const copied={};
    for(const table of order){
      if(!meta.keys[table])continue;
      const cols=meta.schema[table].map(c=>c.name),keys=meta.keys[table];
      const update=cols.filter(c=>!keys.includes(c));
      const select=cols.map(c=>table==='matches'&&c==='case_id'?'NULL::uuid':quote(c)).join(',');
      const guard=cols.includes('organization_id')?'d.organization_id=$1 AND ':table==='organizations'?'d.id=$1 AND ':'';
      const conflict=update.length?`DO UPDATE SET ${update.map(c=>`${quote(c)}=EXCLUDED.${quote(c)}`).join(',')} WHERE ${guard}to_jsonb(d)<>to_jsonb(EXCLUDED)`:'DO NOTHING';
      const query=`INSERT INTO public.${quote(table)} AS d (${cols.map(quote).join(',')}) SELECT ${select} FROM ${quote('buho_transfer_'+table)} WHERE true ON CONFLICT (${keys.map(quote).join(',')}) ${conflict}`;
      await tx.unsafe(query,guard?[TRANSFER_ORG]:[]);copied[table]=loaded[table]??0;progress({copied:table,count:copied[table]});
      if(table==='cases')await tx`UPDATE matches d SET case_id=s.case_id FROM buho_transfer_matches s WHERE d.id=s.id AND d.organization_id=${TRANSFER_ORG} AND d.case_id IS DISTINCT FROM s.case_id`;
    }
    for(const table of order){
      if(!meta.keys[table])continue;
      const keys=meta.keys[table];
      const [diff]=await tx.unsafe(`SELECT count(*)::int n FROM ${quote('buho_transfer_'+table)} s LEFT JOIN public.${quote(table)} d ON ${keys.map(k=>`d.${quote(k)}=s.${quote(k)}`).join(' AND ')} WHERE to_jsonb(s) IS DISTINCT FROM to_jsonb(d)`);
      if(diff.n)throw Error('No coincide la copia: '+table);
    }
    const after=await protectedState();
    if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Cambió información fuera del alcance; se revierte toda la copia');
    result={mode:apply?'applied':'dry-run',sourceAt:meta.at,copied,mappedContacts:contactIds.length,mappedCases:caseIdentities.length,preservedBrandCodeCollisions:brandCodes.length,otherOrganizationsUnchanged:true,credentialsUnchanged:true,sourceRowsIdenticalAfterIdentityMapping:true};
    if(!apply)throw rollback;
  }); }catch(error){if(error!==rollback)throw error;}
  return result;
}
