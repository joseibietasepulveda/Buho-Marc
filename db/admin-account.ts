import {getSql} from './index';
import {hashPassword} from '../lib/password';
/** Creates the explicitly requested Dev-only administrator; never replaces credentials. */
export async function provisionAnalyticsAdmin(password:string){
 if(process.env.RAILWAY_ENVIRONMENT_ID!=='9e2891f0-7281-4872-a992-2c48866a782d')throw new Error('La cuenta de analytics está autorizada únicamente en Dev');
 if(password.length<16)throw new Error('La clave inicial del administrador requiere al menos 16 caracteres');
 const hash=await hashPassword(password),sql=getSql();
 return sql.begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(741043)`;
  const [org]=await tx`SELECT id FROM organizations WHERE slug='estudio-ibieta-ip' AND status='active'`;if(!org)throw new Error('Espacio interno no disponible');
  const [existing]=await tx`SELECT u.id,m.organization_id,m.role FROM users u LEFT JOIN organization_members m ON m.user_id=u.id WHERE u.username='admin'`;
  if(existing){if(existing.organization_id!==org.id||existing.role!=='admin')throw new Error('El usuario admin ya pertenece a otro espacio; no se alteró');return {created:false};}
  const [user]=await tx`INSERT INTO users(username,name,initials,password_hash,must_change_password) VALUES('admin','Administrador de analytics','AD',${hash},true) RETURNING id`;
  await tx`INSERT INTO organization_members(organization_id,user_id,role) VALUES(${org.id},${user.id},'admin')`;
  await tx`INSERT INTO audit_events(organization_id,actor_user_id,action,entity_type,entity_id,after_data) VALUES(${org.id},${user.id},'account.analytics_admin_created','user',${user.id},${tx.json({username:'admin',temporaryPassword:true})})`;
  return {created:true};
 });
}
