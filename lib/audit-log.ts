export type AuditReference={type:"brand"|"application"|"case"|"match"|"client";id:string;name:string};
export type AuditMovement={id:string;occurredAt:string;actor:string;actorId:string|null;action:string;actionKey:string;area:string;detail:string;reference?:AuditReference;changes:{field:string;before:string;after:string}[]};
export type AuditPage={entries:AuditMovement[];total:number;page:number;pageSize:number;actors:{id:string;name:string}[];actions:{key:string;label:string}[]};
export const AUDIT_FIELDS:Record<string,string>={name:"Nombre",email:"Correo",rut:"RUT",contact:"Contacto",phone:"Teléfono",priority:"Prioridad",stage:"Etapa",enabled:"Vigilancia activa",status:"Estado",clientName:"Cliente",clientId:"Cliente vinculado",title:"Título",dueDate:"Fecha de la tarea",dueAt:"Fecha de la tarea",due_at:"Fecha de la tarea",role:"Rol",high:"Umbral de similitud alta",medium:"Umbral de similitud media",assigneeId:"Responsable"};
export function auditChanges(before:Record<string,unknown>|null,after:Record<string,unknown>|null){
 if(!before||!after)return [];
 const display=(v:unknown)=>v==null||v===""?"Sin dato":typeof v==="boolean"?v?"Sí":"No":String(v);
 return Object.entries(AUDIT_FIELDS).flatMap(([key,field])=>JSON.stringify(before[key])===JSON.stringify(after[key])||!(key in before||key in after)?[]:[{field,before:display(before[key]),after:display(after[key])}]);
}
