import {hashPassword} from '../../lib/password.ts';
export async function seedAdminEvaluations(sql){
 const [org]=await sql`INSERT INTO organizations(name,slug)VALUES('Estudio de prueba','estudio-ibieta-ip')RETURNING id`;
 const [other]=await sql`INSERT INTO organizations(name,slug)VALUES('Otro estudio ficticio','evaluations-foreign')RETURNING id`;
 const hash=await hashPassword('evaluaciones-local-123');
 const [ana]=await sql`INSERT INTO users(username,name,initials,password_hash,must_change_password)VALUES('admin','Abogada Ana','AA',${hash},false)RETURNING id`;
 const [bruno]=await sql`INSERT INTO users(username,name,initials,must_change_password)VALUES('bruno','Abogado Bruno','BB',false)RETURNING id`;
 const [foreign]=await sql`INSERT INTO users(username,name,initials,must_change_password)VALUES('extranjero','Administrador externo','AE',false)RETURNING id`;
 await sql`INSERT INTO organization_members(organization_id,user_id,role)VALUES(${org.id},${ana.id},'admin'),(${org.id},${bruno.id},'member'),(${other.id},${foreign.id},'admin')`;
 async function cross(code,organization=org.id){
  const [brand]=await sql`INSERT INTO brands(organization_id,public_code,name,word_mark,owner_name,monitoring_config)VALUES(${organization},${`MA-${code}`},${`ALBA ${code}`},'ALBA','Titular ficticio',${sql.json({applicationNumber:'1000000',monitoringEnabled:true})})RETURNING id`;
  const [match]=await sql`INSERT INTO matches(organization_id,brand_id,public_code,source,source_record_id,application_number,found_name,applicant,level,total_score,explanation)VALUES(${organization},${brand.id},${`CO-${code}`},'DeQuiénEs',${`fixture-${code}`},${`200${code.padStart(4,'0')}`},${`ALBA candidata ${code}`},'Solicitante ficticio','Alta',85,'Fixture')RETURNING id`;
  return match;
 }
 const [a,b,c,d,foreignCross]=await Promise.all([cross('1'),cross('2'),cross('3'),cross('4'),cross('5',other.id)]);
 async function feedback(match,user,at,vote,rationale='',previous=null,organization=org.id){
  const [row]=await sql`INSERT INTO audit_events(organization_id,actor_user_id,action,entity_type,entity_id,before_data,after_data,occurred_at)VALUES(${organization},${user},'watch.feedback','match',${match},${previous?sql.json(previous):null},${sql.json({vote,rationale,ownApplicationId:'1000000',offeredApplicationId:'2000001',score:.91})},${at})RETURNING id`;
  return `feedback:${row.id}`;
 }
 async function formal(match,user,at,decision,reason='',comment=''){
  const [row]=await sql`INSERT INTO match_reviews(organization_id,match_id,reviewer_id,decision,reason,comment,comparison_snapshot,created_at)VALUES(${org.id},${match},${user},${decision},${reason},${comment},${sql.json({score:88})},${at})RETURNING id`;
  return `formal:${row.id}`;
 }
 await feedback(a.id,ana.id,'2026-09-30T10:00:00Z','up','Inicial');
 const changed=await feedback(a.id,ana.id,'2026-10-01T10:00:00Z','down','Los conjuntos difieren',{vote:'up',rationale:'Inicial'});
 const commentOnly=await feedback(a.id,ana.id,'2026-10-02T10:00:00Z','down','Preciso el motivo',{vote:'down',rationale:'Los conjuntos difieren'});
 await feedback(a.id,ana.id,'2026-10-03T10:00:00Z','down','Preciso el motivo',{vote:'down',rationale:'Preciso el motivo'});
 await formal(a.id,ana.id,'2026-10-04T10:00:00Z','En seguimiento','Caso relevante');
 await formal(a.id,ana.id,'2026-10-05T10:00:00Z','Convertida en caso','Caso relevante');
 const removedComment=await feedback(a.id,ana.id,'2026-10-06T10:00:00Z','down','',{vote:'down',rationale:'Preciso el motivo'});
 await feedback(a.id,bruno.id,'2026-10-01T11:00:00Z','up','=HYPERLINK("https://fixture.invalid","texto") <script>no ejecutar</script>');
 await formal(b.id,ana.id,'2026-10-03T11:00:00Z','Descartada');
 await formal(d.id,null,'2026-10-06T11:00:00Z','Pendiente de clasificación');
 await feedback(foreignCross.id,foreign.id,'2026-10-01T11:00:00Z','up','Privado de otro estudio',null,other.id);
 await sql`INSERT INTO watch_feedback(organization_id,match_id,actor_user_id,own_application_id,offered_application_id,score,vote,rationale,version,updated_at)VALUES(${org.id},${a.id},${ana.id},'1000000','2000001',.91,'down','',4,'2026-10-07T10:00:00Z'),(${org.id},${c.id},${bruno.id},'1000000','2000003',.77,'up','Estado guardado sin historial',3,'2026-10-09T10:00:00Z')`;
 return {org,other,ana,bruno,foreign,a,b,c,d,foreignCross,changed,commentOnly,removedComment,feedback,formal};
}
