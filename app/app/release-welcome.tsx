"use client";

import { useEffect, useRef, useState } from "react";
import { RELEASE_VERSION, RELEASE_NEWS, RELEASE_FUTURE } from "@/lib/release-welcome";
import "./release-welcome.css";

export function ReleaseWelcome() {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [stage,setStage] = useState<"news"|"future">("news");
  const [read,setRead] = useState<string[]>([]);
  const [open,setOpen] = useState(false);
  const [available,setAvailable] = useState(false);
  const [completed,setCompleted] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/release-welcome",{cache:"no-store",signal:controller.signal}).then(async response=>{
      if(!response.ok) return;
      const data=await response.json();
      if(controller.signal.aborted || data.version!==RELEASE_VERSION) return;
      setAvailable(true);setCompleted(Boolean(data.futureAccepted));
      if(!data.futureAccepted){setStage(data.newsAccepted?"future":"news");setOpen(true);}
    }).catch(()=>{/* A welcome failure must not prevent access to the workspace. */});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    const element=dialog.current;
    if(!element) return;
    if(open){previousFocus.current=document.activeElement as HTMLElement; if(!element.open)element.showModal();heading.current?.focus();}
    else if(element.open){element.close();(opener.current??previousFocus.current)?.focus();}
  },[open]);
  useEffect(()=>{if(open){heading.current?.focus();dialog.current?.querySelector(".release-scroll")?.scrollTo(0,0);}},[stage,open]);
  const items=stage==="news"?RELEASE_NEWS:RELEASE_FUTURE;
  const dismiss=()=>{if(!busy)setOpen(false);};
  async function accept(){
    if(busy || read.length!==items.length)return;
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/release-welcome",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({version:RELEASE_VERSION,stage,readIds:read})});
      const data=await response.json();
      if(!response.ok)throw Error(data.message||"No se pudo guardar. Vuelve a intentarlo.");
      setRead([]);
      if(data.futureAccepted){setCompleted(true);setOpen(false);}else setStage("future");
    }catch(reason){setError(reason instanceof Error?reason.message:"No se pudo guardar. Vuelve a intentarlo.");}
    finally{setBusy(false);}
  }
  if(!available)return null;
  return <>
    {!open && !completed && <button ref={opener} type="button" className="release-reopen" onClick={()=>{setRead([]);setError("");setOpen(true);}}>Conoce las novedades</button>}
    <dialog className={`release-welcome ${stage==="future"?"is-future":""}`} ref={dialog} aria-labelledby="release-title" aria-describedby="release-intro" onCancel={event=>{event.preventDefault();dismiss();}}>
      <div className="release-scroll">
        <div className="release-meta"><span>{stage==="news"?"YA DISPONIBLE":"LO QUE VIENE"}</span><small>{stage==="news"?"1 de 2 · Lo nuevo para ti":"2 de 2 · El siguiente paso"}</small></div>
        <h2 id="release-title" ref={heading} tabIndex={-1}>{stage==="news"?"¡Buenas noticias!":"Y esto es lo que puedes esperar en la nueva versión"}</h2>
        <p id="release-intro">{stage==="news"?"Buho Marc se renovó para que dediques menos tiempo a organizar información y más a tomar decisiones. Conoce lo que puedes aprovechar desde hoy.":"Seguimos trabajando para que Buho Marc se ajuste cada vez más a la forma en que trabajas."}</p>
        <p className="release-instructions">Marca «Leído» en cada novedad para continuar.</p>
        <div className="release-features">{items.map(item=><label className="release-feature" key={`${stage}-${item.id}`}><span><h3>{item.title}</h3><p>{item.copy}</p><small>Leído</small></span><input type="checkbox" checked={read.includes(item.id)} disabled={busy} aria-label={`Leído: ${item.title}`} onChange={event=>setRead(current=>event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))}/></label>)}</div>
        {stage==="future" && <p className="release-instructions">Estas mejoras están en preparación. Te avisaremos cuando estén disponibles.</p>}
        {error && <p className="release-error" role="alert">{error}</p>}
      </div>
      <footer><p role="status" aria-live="polite">{read.length} de {items.length} novedades leídas</p><div><button className="release-later" type="button" disabled={busy} onClick={dismiss}>Lo veo después</button><button className="release-accept" type="button" disabled={busy||read.length!==items.length} onClick={()=>void accept()}>{busy?"Guardando…":stage==="news"?"Aceptar":"Aceptar y entrar"}</button></div></footer>
    </dialog>
  </>;
}
