import { getSql } from "./index";
import { organizationId, isDemoOrganization } from "../lib/tenant-context";
import { associatedClientId } from "../lib/client-directory";
import { completeReportFields, flattenReportData, type ClientReport, type ClientReportRow } from "../lib/client-report";
import { STATUS_BY_ID, type RegistrationStatusId } from "../lib/registration-data";
import { statusLabel } from "../lib/source-contract";

const object = (value: unknown): Record<string,unknown> => value && typeof value==="object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
const without = (row: Record<string,unknown>, keys:string[]) => Object.fromEntries(Object.entries(row).filter(([key])=>!keys.includes(key)));
const known = (value: unknown) => typeof value==="string" ? value : "";
export async function loadClientReport(clientCode:string):Promise<ClientReport | null> {
  const sql=getSql(),org=organizationId();
  const [client]=await sql`SELECT data, public_code FROM client_contacts WHERE organization_id=${org} AND public_code=${clientCode}`;
  if(!client)return null;
  const [brands,applications]=await Promise.all([
    sql`SELECT b.*, s.data AS source_data, COALESCE((SELECT jsonb_agg(jsonb_build_object('clase',bc.nice_class,'cobertura',bc.description) ORDER BY bc.nice_class) FROM brand_classes bc WHERE bc.brand_id=b.id),'[]'::jsonb) AS class_data FROM brands b LEFT JOIN source_snapshots s ON s.organization_id=b.organization_id AND s.entity_type='brand' AND s.entity_id=b.id WHERE b.organization_id=${org} AND b.archived_at IS NULL ORDER BY b.name`,
    sql`SELECT a.*, s.data AS source_data FROM registration_applications a LEFT JOIN source_snapshots s ON s.organization_id=a.organization_id AND s.entity_type='application' AND s.entity_id=a.id WHERE a.organization_id=${org} ORDER BY a.data->>'name'`,
  ]);
  const linkedBrands=brands.filter(b=>associatedClientId({id:b.public_code,name:b.name,provider:b.monitoring_config?.provider || (isDemoOrganization()?"simulated":"inapi"),clientId:b.monitoring_config?.clientId})===clientCode);
  const linkedApplications=applications.filter(a=>a.data?.clientId===clientCode || isDemoOrganization() && a.data?.provider!=="inapi" && associatedClientId({id:a.public_code,name:a.data?.name,clientId:a.data?.clientId})===clientCode);
  const brandIds=linkedBrands.map(b=>b.id),appIds=linkedApplications.map(a=>a.id);
  const applicationNumbers=[...linkedBrands.map(b=>b.source_data?.applicationNumber ?? b.monitoring_config?.applicationNumber),...linkedApplications.map(a=>a.data?.applicationNumber)].filter((value):value is string=>typeof value==="string" && Boolean(value));
  const [cases,findings,tasks,comments,attachments]=await Promise.all([
    brandIds.length||appIds.length ? sql`SELECT c.*, COALESCE((SELECT jsonb_agg(jsonb_build_object('tarea',t.title,'estado',t.status,'prioridad',t.priority,'fecha',t.due_at,'responsable',u.name)) FROM case_tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.organization_id=c.organization_id AND t.case_id=c.id),'[]'::jsonb) AS tasks FROM cases c WHERE c.organization_id=${org} AND (c.brand_id IN ${sql(brandIds.length?brandIds:["00000000-0000-0000-0000-000000000000"])} OR c.proceeding->>'applicationCode' IN ${sql(linkedApplications.length?linkedApplications.map(a=>a.public_code):["__none__"])} OR c.proceeding->'record'->>'applicationNumber' IN ${sql(applicationNumbers.length?applicationNumbers:["__none__"])})` : [],
    brandIds.length?sql`SELECT m.brand_id, m.public_code, m.found_name, m.applicant, m.application_number, m.source, m.total_score, m.level, m.review_status, m.published_at, m.official_url, m.explanation, m.evidence FROM matches m WHERE m.organization_id=${org} AND m.brand_id IN ${sql(brandIds)}`:[],
    appIds.length?sql`SELECT t.application_id, t.title, t.status, t.priority, t.due_date, u.name AS assignee FROM registration_tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.organization_id=${org} AND t.application_id IN ${sql(appIds)}`:[],
    brandIds.length||appIds.length?sql`SELECT entity_id, body, created_at FROM comments WHERE organization_id=${org} AND entity_id IN ${sql([...brandIds,...appIds])}`:[],
    brandIds.length?sql`SELECT bf.brand_id,f.original_name,f.mime_type,f.size,f.created_at FROM brand_files bf JOIN files f ON f.id=bf.file_id WHERE f.organization_id=${org} AND bf.brand_id IN ${sql(brandIds)}`:[],
  ]);
  const rows:ClientReportRow[]=[];
  for(const b of linkedBrands){
    const config=object(b.monitoring_config),source=object(b.source_data);
    const values:Record<string,unknown>={
      applicationNumber:source.applicationNumber??config.applicationNumber,name:b.name,registrationNumber:b.registration_number,
      type:source.type??config.type,classes:source.classes??b.class_data.map((c:{clase:number})=>c.clase),coverage:b.class_data,
      logo:source.logo??config.logo,status:source.status?statusLabel(known(source.status)):config.legalStatus??config.registrationState,
      filingDate:source.filingDate??config.filingDate,publicationDate:source.publicationDate??config.publicationDate,
      registrationDate:source.registrationDate??b.registration_date,expirationDate:source.expirationDate??config.expirationDate,
      owner:source.owner??b.owner_name,ownerRut:source.ownerRut??config.rut,ownerCountry:source.ownerCountry??config.ownerCountry,
      representativeName:source.representativeName??config.representativeName,representativeCountry:source.representativeCountry??config.representativeCountry,
      clientRole:config.clientRole==="representative"?"Representante":config.clientRole==="holder"?"Titular / solicitante":"Por confirmar",
      client:client.data,monitoring:b.status,updatedAt:b.updated_at,sourceUrl:source.officialUrl??config.inapiUrl,
      tasks:[],cases:cases.filter(c=>c.brand_id===b.id || Boolean(source.applicationNumber ?? config.applicationNumber) && c.proceeding?.record?.applicationNumber === (source.applicationNumber ?? config.applicationNumber)).map(c=>without(c,["brand_id","organization_id","id"])),
      findings:findings.filter(m=>m.brand_id===b.id).map(m=>without(m,["brand_id"])),
    };
    flattenReportData(source,"source",values);
    flattenReportData({...config,description:b.description,wordMark:b.word_mark,country:b.jurisdiction,createdAt:b.created_at,lastReviewedAt:b.last_reviewed_at,comments:comments.filter(c=>c.entity_id===b.id).map(c=>without(c,["entity_id"])),attachments:attachments.filter(f=>f.brand_id===b.id).map(f=>without(f,["brand_id"]))},"portfolio",values);
    rows.push({title:b.name,values});
  }
  for(const a of linkedApplications){
    const data=object(a.data),source=object(a.source_data);
    const values:Record<string,unknown>={
      applicationNumber:data.applicationNumber,name:data.name,registrationNumber:data.registrationNumber,type:data.type,classes:data.niceClasses,
      coverage:object(source.inapi).classes??source.classes,logo:data.logo,status:data.sourceStatus?statusLabel(known(data.sourceStatus)):STATUS_BY_ID[data.statusId as RegistrationStatusId]?.label,
      filingDate:data.filedAt,publicationDate:data.publishedAt,registrationDate:data.registrationDate,expirationDate:data.expirationDate,
      owner:data.holder,ownerRut:data.holderRut,ownerCountry:data.ownerCountry,representativeName:data.representativeName,representativeCountry:data.representativeCountry,
      clientRole:data.clientRole==="representative"?"Representante":data.clientRole==="holder"?"Titular / solicitante":"Por confirmar",client:client.data,
      monitoring:data.monitoringEnabled===false?"Sin seguimiento":"En seguimiento",updatedAt:a.updated_at,sourceUrl:data.fileUrl,
      tasks:tasks.filter(t=>t.application_id===a.id).map(t=>without(t,["application_id"])),
      cases:cases.filter(c=>c.proceeding?.applicationCode===a.public_code || Boolean(data.applicationNumber) && c.proceeding?.record?.applicationNumber===data.applicationNumber).map(c=>without(c,["brand_id","organization_id","id"])),findings:[],
    };
    flattenReportData(source,"source",values);flattenReportData({...data,createdAt:a.created_at,comments:comments.filter(c=>c.entity_id===a.id).map(c=>without(c,["entity_id"]))},"portfolio",values);
    rows.push({title:known(data.name),values});
  }
  return {client:client.data,fields:completeReportFields(rows),rows};
}
