"use client";
import { useState } from "react";
import { foldText } from "@/lib/text-search";
export type WorkspaceUser = { id:string; name:string; email:string; createdAt:string; initials:string; role?:"admin"|"member" };
export function UsersView({users, organizationName, currentUserId, onAdd}:{users:WorkspaceUser[]; organizationName:string; currentUserId?:string; onAdd:()=>void}) {
 const [query,setQuery]=useState("");
 const visible=users.filter(user=>foldText(`${user.name} ${user.email}`).includes(foldText(query)));
 const canAdd=users.find(user=>user.id===currentUserId)?.role==="admin";
 return <section className="workspace-directory"><div className="directory-heading"><p>{organizationName} · {users.length} {users.length===1?"usuario":"usuarios"}</p>{canAdd&&<button type="button" className="buho-primary" onClick={onAdd}>Agregar usuario</button>}</div><div className="directory-toolbar"><label>Buscar usuario<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre o correo"/></label></div><div className="buho-table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Incorporación</th></tr></thead><tbody>{visible.map(user=><tr key={user.id}><td><strong>{user.name}</strong>{user.id===currentUserId&&<small>Tu cuenta</small>}</td><td>{user.email||"No informado"}</td><td>{user.role==="admin"?"Administrador":user.role==="member"?"Miembro":"No informado"}</td><td>{user.createdAt}</td></tr>)}</tbody></table></div>{!visible.length&&<div className="directory-empty"><h3>No encontramos usuarios</h3><p>Prueba con otro nombre o correo.</p></div>}<p className="directory-note">Los administradores pueden agregar usuarios a la organización. Los miembros acceden a las funciones habilitadas para su estudio.</p></section>;
}
