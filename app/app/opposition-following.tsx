"use client";
import { useState } from "react";
import type { OppositionProceeding } from "@/lib/opposition";
import { statusLabel } from "@/lib/source-contract";
import { displayWorkDate } from "@/lib/work-priorities";
import { SimilarityImage } from "./similarity-results";
import { OppositionBadge, OppositionHistory } from "./opposition";
import { ReviewDialog } from "./review-dialog";

export type FollowedOppositionCase = {id:string;title:string;stage:string;proceeding?:OppositionProceeding};
export function OppositionFollowing({cases,onOpenCase,onAdd,onImport}:{cases:FollowedOppositionCase[];onOpenCase:(id:string)=>void;onAdd?:()=>void;onImport?:()=>void}) {
  const [query,setQuery]=useState(""),[selected,setSelected]=useState<FollowedOppositionCase|null>(null);
  const all=cases.filter(item=>item.proceeding);
  const visible=all.filter(item=>[item.proceeding!.record.name,item.proceeding!.record.applicationNumber,item.proceeding!.record.owner,item.proceeding!.opponent,item.proceeding!.clientName].join(" ").toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")));
  return <section className="opposition-following">
    <header><div><h2>Marcas seguidas por oposición o nulidad</h2><p>Expedientes con oposición o nulidad, presentada o recibida. Cada caso conserva el rol del cliente y sigue las novedades de la marca.</p></div><div className="opposition-follow-actions">{onImport && <button type="button" className="buho-secondary" onClick={onImport}>Subir oposiciones y nulidades</button>}{onAdd && <button type="button" className="buho-primary" onClick={onAdd}>Agregar seguimiento +</button>}</div></header>
    <label className="opposition-search">Buscar marca, solicitud, titular o cliente<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre o número de solicitud"/></label>
    {!visible.length && <p className="watch-empty">{all.length ? "No encontramos marcas con esta búsqueda." : "Todavía no hay seguimientos. Sube un Excel o agrega una oposición o nulidad."}</p>}
    <div className="opposition-follow-grid">{visible.map(item=>{
      const proceeding=item.proceeding!, record=proceeding.record;
      const events=[...((record.inapi?.events??[]) as {event_date?:string;status_description?:string}[])].sort((a,b)=>(a.event_date??"").localeCompare(b.event_date??""));
      const latest=events.at(-1);
      return <article key={item.id} className="opposition-follow-card"><OppositionBadge role={proceeding.role} type={proceeding.type}/><div className="opposition-follow-brand"><SimilarityImage src={record.logo} applicationId={record.applicationNumber} name={record.name}/><div><h3>{record.name}</h3><small>Solicitud {record.applicationNumber}</small><p>{record.owner}</p></div></div><strong>{statusLabel(record.status)}</strong><p>{proceeding.clientName ? "Cliente" : "Oponente"}: {proceeding.clientName ?? proceeding.opponent}</p><p className="opposition-last-event">{latest ? <><small>Última actuación disponible · {displayWorkDate(latest.event_date??"")}</small>{latest.status_description}</> : "La fuente no ha informado actuaciones."}</p><footer><button type="button" onClick={()=>setSelected(item)}>Ver historial de la marca</button><button type="button" onClick={()=>onOpenCase(item.id)}>Abrir caso →</button></footer></article>;
    })}</div>
    {selected?.proceeding && <ReviewDialog title={`Historial · ${selected.proceeding.record.name}`} className="pilot-dialog" onClose={()=>setSelected(null)}><div className="pilot-body"><OppositionHistory proceeding={selected.proceeding}/></div><footer><button type="button" onClick={()=>setSelected(null)}>Cerrar</button><button type="button" className="buho-primary" onClick={()=>{onOpenCase(selected.id);setSelected(null);}}>Abrir caso</button></footer></ReviewDialog>}
  </section>;
}
