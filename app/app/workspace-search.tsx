"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { foldText, compactRut } from "@/lib/text-search";
import type { RegistrationApplication } from "@/lib/registration-data";
import { associatedClientId } from "@/lib/client-directory";
import type { OppositionProceeding } from "@/lib/opposition";
import { useClientDirectory } from "./client-provider";
import { ReviewDialog } from "./review-dialog";

type SearchBrand={id:string;name:string;owner:string;rut:string;registration:string;applicationNumber?:string;representativeName?:string;provider?:string;clientId?:string};
type SearchCase={id:string;title:string;brand:string;client:string;sourceMatch?:string;proceeding?:OppositionProceeding};
type SearchMatch={id:string;brand:string;found:string;applicant:string;application:string;applicantRut:string;officialRegistration?:string};
type Kind="brand"|"application"|"case"|"match"|"client";
type Entry={id:string;kind:Kind;title:string;detail:string;text:string;identifiers:string[]};
const kinds:Record<Kind,string>={brand:"Marca",application:"Solicitud",case:"Caso",match:"Vigilancia",client:"Cliente"};
export function WorkspaceSearch({brands,applications,cases,matches,onBrand,onApplication,onCase,onMatch,onDiscover}:{
  brands:SearchBrand[];applications:RegistrationApplication[];cases:SearchCase[];matches:SearchMatch[];
  onBrand:(id:string)=>void;onApplication:(id:string)=>void;onCase:(id:string)=>void;onMatch:(id:string)=>void;onDiscover:()=>void;
}){
  const {clients,openClient}=useClientDirectory();
  const [open,setOpen]=useState(false),[query,setQuery]=useState(""),[scope,setScope]=useState<Kind|"all">("all"),[limit,setLimit]=useState(25);
  const deferred=useDeferredValue(query),input=useRef<HTMLInputElement>(null);
  useEffect(()=>{const shortcut=(event:globalThis.KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setOpen(current=>!current);}};window.addEventListener("keydown",shortcut);return()=>window.removeEventListener("keydown",shortcut);},[]);
  useEffect(()=>{if(open)input.current?.focus();},[open]);
  const entries=useMemo(()=>{
    const all:Entry[]=[];
    for(const b of brands){const client=clients.find(c=>c.id===associatedClientId(b));all.push({id:b.id,kind:"brand",title:b.name,detail:`Solicitud ${b.applicationNumber||"no informada"} · Registro ${b.registration} · ${client?.name||b.owner}`,text:[b.name,b.owner,b.rut,b.applicationNumber,b.registration,b.representativeName,client?.name,client?.rut].join(" "),identifiers:[b.applicationNumber||"",b.registration,b.rut,client?.rut||""]});}
    for(const a of applications){const client=clients.find(c=>c.id===a.clientId);all.push({id:a.id,kind:"application",title:a.name,detail:`Solicitud ${a.applicationNumber}${a.registrationNumber?` · Registro ${a.registrationNumber}`:""} · ${client?.name||a.client||a.holder}`,text:[a.name,a.applicationNumber,a.registrationNumber,a.holder,a.holderRut,a.representativeName,client?.name,client?.rut,a.client].join(" "),identifiers:[a.applicationNumber,a.registrationNumber||"",a.holderRut,client?.rut||""]});}
    for(const c of cases){const origin=matches.find(m=>m.id===c.sourceMatch),record=c.proceeding?.record;all.push({id:c.id,kind:"case",title:c.title,detail:`${c.brand} · ${c.client}${record?` · Solicitud ${record.applicationNumber}`:""}`,text:[c.title,c.brand,c.client,c.proceeding?.opponent,c.proceeding?.clientName,record?.name,record?.owner,record?.ownerRut,record?.applicationNumber,record?.registrationNumber,record?.representativeName,origin?.found,origin?.applicant,origin?.applicantRut,origin?.application,origin?.officialRegistration].join(" "),identifiers:[record?.applicationNumber||"",record?.registrationNumber||"",record?.ownerRut||"",origin?.application||"",origin?.applicantRut||""]});}
    for(const m of matches)all.push({id:m.id,kind:"match",title:`${m.found} · ${m.brand}`,detail:`Contraparte: ${m.applicant} · Solicitud ${m.application}`,text:[m.brand,m.found,m.applicant,m.applicantRut,m.application,m.officialRegistration].join(" "),identifiers:[m.application,m.applicantRut,m.officialRegistration||""]});
    for(const c of clients)all.push({id:c.id,kind:"client",title:c.name,detail:`${c.rut||"RUT no informado"} · ${c.contact||"Contacto por completar"}`,text:[c.name,c.rut,c.contact,c.email,c.phone].join(" "),identifiers:[c.rut]});
    return all;
  },[brands,applications,cases,matches,clients]);
  const needle=foldText(deferred),identifier=compactRut(deferred);
  const results=entries.filter(entry=>(scope==="all"||entry.kind===scope)&&needle&&(foldText(entry.text).includes(needle)||identifier && /^[\d.kK-]+$/.test(deferred.replace(/\s/g,""))&&entry.identifiers.some(id=>id&&compactRut(id).includes(identifier))))
    .sort((a,b)=>Number(b.identifiers.some(id=>id&&compactRut(id)===identifier))-Number(a.identifiers.some(id=>id&&compactRut(id)===identifier))||a.title.localeCompare(b.title,"es"));
  function choose(entry:Entry){setOpen(false);({brand:onBrand,application:onApplication,case:onCase,match:onMatch,client:openClient}[entry.kind])(entry.id);}
  return <><button type="button" className="workspace-search-launcher" onClick={()=>setOpen(true)}><span>Buscar en mi espacio</span><kbd>⌘ K</kbd></button>{open&&<ReviewDialog title="Buscar en mi espacio" className="workspace-search-dialog" onClose={()=>setOpen(false)}><div className="workspace-search-body"><input ref={input} className="workspace-search-input" type="search" aria-label="Buscar marca, cliente, RUT o expediente" placeholder="Marca, cliente, RUT, solicitud, registro o contraparte…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(25);}}/><div className="workspace-search-scopes" role="group" aria-label="Tipo de resultado"><button type="button" aria-pressed={scope==="all"} onClick={()=>{setScope("all");setLimit(25);}}>Todo</button>{Object.entries(kinds).map(([key,label])=><button type="button" key={key} aria-pressed={scope===key} onClick={()=>{setScope(key as Kind);setLimit(25);}}>{label}</button>)}</div><p>Busca entre los expedientes y clientes guardados. Cada resultado abre su ficha correspondiente.</p>{needle?<><p role="status">{results.length} {results.length===1?"resultado":"resultados"}</p>{results.slice(0,limit).map(entry=><button className="workspace-search-result" type="button" key={`${entry.kind}:${entry.id}`} onClick={()=>choose(entry)}><span>{kinds[entry.kind]}</span><span><strong>{entry.title}</strong><small>{entry.detail}</small></span><span aria-hidden>→</span></button>)}{!results.length&&<div className="workspace-search-empty">No encontramos resultados. Prueba con otro nombre o identificador, o consulta INAPI para incorporar expedientes nuevos.</div>}{results.length>limit&&<button type="button" className="discovery-load-more" onClick={()=>setLimit(current=>current+25)}>Mostrar más resultados</button>}</>:<div className="workspace-search-empty">Encuentra una marca, una persona o un expediente sin cambiar de sección.</div>}</div><footer><button type="button" onClick={()=>{setOpen(false);onDiscover();}}>Buscar nuevos expedientes en INAPI →</button></footer></ReviewDialog>}</>;
}
