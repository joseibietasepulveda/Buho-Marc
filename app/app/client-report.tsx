"use client";
import { useEffect, useState } from "react";
import type { ClientReportField, ClientReportFormat } from "@/lib/client-report";
export function ClientReportPicker({ clientId, clientName, onBack }: { clientId:string; clientName:string; onBack:()=>void }) {
  const [fields,setFields]=useState<ClientReportField[]>([]),[selected,setSelected]=useState<string[]>([]);
  const [format,setFormat]=useState<ClientReportFormat>("xlsx"),[count,setCount]=useState(0);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/clients/report?clientId=${encodeURIComponent(clientId)}`,{cache:"no-store",signal:controller.signal})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.message);return data;})
      .then(data=>{setFields(data.fields);setSelected(data.fields.filter((f:ClientReportField)=>f.default).map((f:ClientReportField)=>f.key));setCount(data.count);setError("");})
      .catch(failure=>{if(!controller.signal.aborted)setError(failure.message || "No se pudieron cargar las columnas.");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[clientId,attempt]);
  async function download(){
    if(busy || !selected.length)return;setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/clients/report",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({clientId,format,fields:selected})});
      if(!response.ok){const data=await response.json();throw new Error(data.message || "No se pudo preparar el informe.");}
      const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download=response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || `informe-cliente.${format}`;
      link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);setNotice("Informe descargado con las columnas seleccionadas.");
    }catch(failure){setError(failure instanceof Error?failure.message:"No se pudo descargar el informe.");}
    finally{setBusy(false);}
  }
  const groups=[...new Set(fields.map(f=>f.group))];
  return <>
    <section className="client-report-pane" aria-label="Preparar informe de cliente">
      <h3>Elige qué incluir en el informe</h3><p>Selecciona una por una las columnas de los expedientes de {clientName}. Se ofrecen todos los antecedentes que tenemos guardados, incluidas solicitudes en trámite e información completa de INAPI.</p>
      {loading ? <p role="status">Cargando columnas disponibles…</p> : <>
        <fieldset className="client-report-format" disabled={busy}><legend>Formato del informe</legend>{([["xlsx","Excel"],["docx","Word"],["pdf","PDF"]] as const).map(([key,label])=><label key={key}><input type="radio" name="client-report-format" value={key} checked={format===key} onChange={()=>setFormat(key)}/>{label}</label>)}</fieldset>
        <div className="client-report-selection"><span>{count} {count===1?"expediente":"expedientes"} · {selected.length} de {fields.length} {fields.length===1?"columna":"columnas"}</span><button type="button" disabled={busy || !fields.length} onClick={()=>setSelected(fields.map(f=>f.key))}>Seleccionar todas</button><button type="button" disabled={busy || !selected.length} onClick={()=>setSelected([])}>Quitar selección</button></div>
        <div className="client-report-fields">{groups.map(group=><fieldset key={group} disabled={busy}><legend>{group}</legend><div className="field-grid">{fields.filter(f=>f.group===group).map(field=><label className="client-report-field" key={field.key}><input type="checkbox" checked={selected.includes(field.key)} onChange={e=>setSelected(current=>e.target.checked?[...current,field.key]:current.filter(key=>key!==field.key))}/>{field.label}</label>)}</div></fieldset>)}</div>
        {!count && !error && <p>No hay expedientes vinculados a este cliente. Confirma sus vínculos al incorporar marcas.</p>}
      </>}
      {error && <p role="alert" className="task-error">{error} {!fields.length && <button type="button" onClick={()=>{setLoading(true);setAttempt(v=>v+1);}}>Reintentar</button>}</p>}
      {notice && <p role="status" className="discovery-success">{notice}</p>}
    </section><footer className="client-report-footer"><span>{selected.length} {selected.length===1?"columna seleccionada":"columnas seleccionadas"}</span><button type="button" disabled={busy} onClick={onBack}>Volver a la ficha</button><button type="button" className="buho-primary" disabled={loading || busy || !selected.length || !count} onClick={()=>void download()}>{busy?"Preparando informe…":`Descargar ${format==="xlsx"?"Excel":format==="docx"?"Word":"PDF"}`}</button></footer>
  </>;
}
