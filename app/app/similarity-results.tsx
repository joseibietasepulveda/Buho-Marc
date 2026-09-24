"use client";
import { uncertainState } from "@/lib/feasibility-policy";
import { applyVerifiedDecision } from "@/lib/verified-decisions";
import { stateTone } from "@/lib/watch-policy";
import Image from "next/image";
import { useState } from "react";
import { channelNames, safeImage, similarityExplanation, type SimilarityHit } from "@/lib/similarity-contract";
import { displayWorkDate } from "@/lib/work-priorities";
import { oppositionWindow } from "@/lib/opposition-window";

export function SimilarityImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const image = src.startsWith("blob:") ? src : safeImage(src);
  return <div className="similarity-image">{image && !failed ? <Image unoptimized src={image} alt={`Marca ${name}`} width={160} height={100} tabIndex={0} role="button" aria-label={`Ampliar imagen de ${name}`} title="Ampliar imagen" onError={() => setFailed(true)} /> : <span aria-label={`${name}: sin imagen`}><b aria-hidden>Aa</b><small>Sin imagen</small></span>}</div>;
}
export function SimilarityStatusNotice({hit}:{hit:SimilarityHit}) {
  if (hit.officialDecision) return <div className="similarity-official-decision"><strong>{hit.status} · decisión firme desde {displayWorkDate(hit.officialDecision.firmAt)}</strong><p>Corrección respaldada por documentos oficiales. La fuente de consulta informa «{hit.officialDecision.sourceStatus}» y puede estar desactualizada.</p>{hit.officialDecision.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} · {displayWorkDate(source.date)} · pág. {source.page} ↗</a>)}</div>;
  if (uncertainState(hit.status)) return <p className="similarity-data-warning">La fuente informa «{hit.status}». Estado por verificar en INAPI: no confirma que la solicitud siga en trámite. Verifica el último fallo y su firmeza en el expediente oficial.</p>;
  return null;
}
export function OppositionWindow({hit}:{hit:SimilarityHit}) {
  const window = hit.dataWarnings?.length ? {tone:"pending",label:"Plazo por confirmar",detail:"La fecha de publicación requiere revisión"} : oppositionWindow(hit);
  return <div className={`opposition-window is-${window.tone}`}><strong>{window.label}</strong><small>{window.detail}</small></div>;
}
export function SimilarityCard({ hit, position, children, queryImage, queryName, selected, onSelect, onDetails }: { hit: SimilarityHit; position?: number; children?: React.ReactNode; queryImage?: string; queryName?: string; selected?:boolean; onSelect?:()=>void; onDetails?:()=>void }) {
  hit = applyVerifiedDecision(hit);
  // The explicit selection button provides the keyboard equivalent; nested controls keep their own behavior.
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
  return <article className={`similarity-card ${selected ? "is-selected" : ""} ${onSelect ? "is-selectable" : ""}`} onClick={onSelect ? e=>{if (!(e.target as HTMLElement).closest("button,a,input,select,textarea,summary,details,img")) onSelect();} : undefined}>
    <SimilarityImage src={hit.image} name={hit.name} />
    <div className="similarity-card-body"><h4>{position ? `${position}. ` : ""}{hit.name}</h4><p>{hit.holders.map(h => h.name).join("; ") || "Titular no informado"}</p>
      <div className="similarity-badges"><span className={`similarity-status is-${stateTone(hit.status)}`}>{uncertainState(hit.status) ? "Estado por verificar en INAPI" : hit.status}</span><span>Solicitud {hit.applicationId}</span>{hit.reviewStatus && hit.reviewStatus !== "Detectada" && <strong>{hit.reviewStatus}</strong>}</div>
      <p className="similarity-publication-date">{hit.publishedAt ? <>Publicada en Diario Oficial · <strong>{displayWorkDate(hit.publishedAt)}</strong></> : "INAPI · Sin publicación informada en Diario Oficial"}</p>
      <SimilarityStatusNotice hit={hit}/>
      {!!hit.dataWarnings?.length && <p className="similarity-data-warning">Antecedentes por verificar: {hit.dataWarnings.join(". ")}.</p>}
      {onDetails ? <button type="button" onClick={onDetails}>Ver coberturas y semejanza</button> : <details><summary>Coberturas y semejanza</summary><p>{similarityExplanation(hit)}</p><p>Similitud: {Math.round(hit.score*100)}%. No representa probabilidad de conflicto.</p><ul>{Object.entries(hit.channels).map(([key, value]) => <li key={key}>{channelNames[key] ?? key}{value.rank ? ` · posición ${value.rank}` : ""}</li>)}</ul>{hit.classes.map(c => <p key={c.nice_class}><strong>Clase {c.nice_class}:</strong> {c.coverage_text || "Cobertura no informada"}</p>)}</details>}
      {queryName && <details><summary>Comparar con {queryName}</summary><div className="similarity-comparison"><SimilarityImage src={queryImage ?? ""} name={queryName} /><SimilarityImage src={hit.image} name={hit.name} /></div></details>}
      {!!hit.history.length && <details><summary>Historial de la solicitud</summary><ol className="similarity-history">{[...hit.history].sort((a,b) => a.date.localeCompare(b.date)).map((e,i) => <li key={i}><time>{displayWorkDate(e.date)}</time><details><summary>{e.title}</summary><p>{e.detail || "Sin observaciones adicionales."}</p></details></li>)}</ol></details>}
    </div>
    <aside className="similarity-card-facts"><div className="similarity-score"><small>Índice de similitud</small><strong>{Math.round(hit.score*100)}%</strong></div><div className="similarity-nice"><small>Clases de Niza</small><strong>{hit.classes.map(c=>c.nice_class).join(" · ") || "No informadas"}</strong></div><OppositionWindow hit={hit}/>{onSelect && <button type="button" className="report-select" aria-pressed={!!selected} onClick={onSelect}>{selected ? "✓ Incluida en el informe" : "+ Incluir en el informe"}</button>}</aside>
    {children && <div className="similarity-actions">{children}</div>}
  </article>;
}
