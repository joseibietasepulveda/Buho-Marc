"use client";
import { uncertainState } from "@/lib/feasibility-policy";
import { applyVerifiedDecision } from "@/lib/verified-decisions";
import { stateTone, terminalState, registeredState } from "@/lib/watch-policy";
import Image from "next/image";
import { useState } from "react";
import { channelNames, safeImage, similarityExplanation, type SimilarityHit } from "@/lib/similarity-contract";
import { displayWorkDate, chileToday } from "@/lib/work-priorities";
import { addProcedureDays } from "@/lib/registration-procedure";

export function SimilarityImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const image = src.startsWith("blob:") ? src : safeImage(src);
  return <div className="similarity-image">{image && !failed ? <Image unoptimized src={image} alt={`Marca ${name}`} width={160} height={100} onError={() => setFailed(true)} /> : <span>{name}<small>Sin imagen disponible</small></span>}</div>;
}
export function SimilarityStatusNotice({hit}:{hit:SimilarityHit}) {
  if (hit.officialDecision) return <div className="similarity-official-decision"><strong>{hit.status} · decisión firme desde {displayWorkDate(hit.officialDecision.firmAt)}</strong><p>Corrección respaldada por documentos oficiales. La fuente de consulta informa «{hit.officialDecision.sourceStatus}» y puede estar desactualizada.</p>{hit.officialDecision.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} · {displayWorkDate(source.date)} · pág. {source.page} ↗</a>)}</div>;
  if (uncertainState(hit.status)) return <p className="similarity-data-warning">La fuente informa «{hit.status}». Estado por verificar en INAPI: no confirma que la solicitud siga en trámite. Verifica el último fallo y su firmeza en el expediente oficial.</p>;
  return null;
}
export function SimilarityCard({ hit, position, children, queryImage, queryName }: { hit: SimilarityHit; position?: number; children?: React.ReactNode; queryImage?: string; queryName?: string }) {
  hit = applyVerifiedDecision(hit);
  let opposition: string | undefined;
  if (hit.publishedAt && !hit.dataWarnings?.length && !terminalState(hit.status) && !registeredState(hit.status) && !uncertainState(hit.status)) {
    const deadline = addProcedureDays(hit.publishedAt, 30);
    if (deadline) opposition = deadline < chileToday() ? "Plazo de oposición finalizado según la fecha de publicación informada" : `Plazo de oposición calculado: ${displayWorkDate(deadline)} · verificar antecedentes`;
    else opposition = "Plazo de oposición por verificar; fecha fuera del calendario disponible";
  }
  return <article className="similarity-card">
    <SimilarityImage src={hit.image} name={hit.name} />
    <div className="similarity-card-body"><h4>{position ? `${position}. ` : ""}{hit.name}</h4><p>{hit.holders.map(h => h.name).join("; ") || "Titular no informado"}</p>
      <div className="similarity-badges"><span className={`similarity-status is-${stateTone(hit.status)}`}>{uncertainState(hit.status) ? "Estado por verificar en INAPI" : hit.status}</span><span>Solicitud {hit.applicationId}</span><span>Clases {hit.classes.map(c => c.nice_class).join(", ") || "no informadas"}</span>{hit.reviewStatus && hit.reviewStatus !== "Detectada" && <strong>{hit.reviewStatus}</strong>}</div>
      <p className="similarity-publication-date">{hit.publishedAt ? <>Publicada en Diario Oficial · <strong>{displayWorkDate(hit.publishedAt)}</strong></> : "INAPI · Sin publicación informada en Diario Oficial"}</p>
      <SimilarityStatusNotice hit={hit}/>
      <p className="similarity-dates">Ingreso: {displayWorkDate(hit.filedAt ?? "")} · Publicación: {displayWorkDate(hit.publishedAt ?? "")} · Registro: {displayWorkDate(hit.registeredAt ?? "")}</p>
      {!!hit.dataWarnings?.length && <p className="similarity-data-warning">Antecedentes por verificar: {hit.dataWarnings.join(". ")}. Se muestran los datos informados por la fuente.</p>}
      {opposition && <p className="similarity-dates">{opposition}</p>}
      <details><summary>Coberturas y semejanza</summary><p>{similarityExplanation(hit)}</p><p>Puntaje de ordenamiento: {hit.score.toFixed(4)}. No representa probabilidad de conflicto.</p><ul>{Object.entries(hit.channels).map(([key, value]) => <li key={key}>{channelNames[key] ?? key}{value.rank ? ` · posición ${value.rank}` : ""}</li>)}</ul>{hit.classes.map(c => <p key={c.nice_class}><strong>Clase {c.nice_class}:</strong> {c.coverage_text || "Cobertura no informada"}</p>)}</details>
      {queryName && <details><summary>Comparar con {queryName}</summary><div className="similarity-comparison"><SimilarityImage src={queryImage ?? ""} name={queryName} /><SimilarityImage src={hit.image} name={hit.name} /></div></details>}
      {!!hit.history.length && <details><summary>Historial de la solicitud</summary><ol className="similarity-history">{[...hit.history].sort((a,b) => a.date.localeCompare(b.date)).map((e,i) => <li key={i}><time>{displayWorkDate(e.date)}</time><details><summary>{e.title}</summary><p>{e.detail || "Sin observaciones adicionales."}</p></details></li>)}</ol></details>}
      {children && <div className="similarity-actions">{children}</div>}
    </div>
  </article>;
}
