"use client";

import { useEffect, useRef } from "react";
import { ArrowSquareOut, X } from "@phosphor-icons/react";
import { activityDate, oldestActivityFirst } from "@/lib/registration-activity";
import { statusLabel, type SourceRecord } from "@/lib/source-contract";

export function sourceDate(value: unknown) {
  const day = typeof value === "string" ? activityDate(value) : "";
  return day ? new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)) : "No informada";
}

const labels: Record<string, string> = {
  annotations: "Anotaciones", holders: "Titulares", representatives: "Representantes", classes: "Clases y cobertura", trademark: "Características y protección del signo", status: "Estado original de la fuente", related_records: "Expedientes relacionados", dates: "Otras fechas del expediente",
  name: "Nombre", rut: "RUT", dv: "Dígito verificador", country: "País", commune: "Comuna", code: "Código informado", description: "Descripción", nice_class: "Clase de Niza", coverage_text: "Cobertura", outcome: "Resultado informado por la fuente", sign_type: "Tipo de signo", type: "Tipo", subtype: "Modalidad", translation: "Traducción", label_description: "Descripción de la etiqueta", protection_description: "Protección del signo", applies_phrase_to_registration: "Registro al que se aplica la frase", renews_application_id: "Solicitud que se renueva", event_id: "Referencia de actuación", status_code: "Código de actuación", status_description: "Actuación", observation: "Texto de la resolución", event_date: "Fecha de actuación", due_date: "Vencimiento informado",
};
const labelFor = (key: string) => labels[key] ?? key.replaceAll("_", " ").replace(/^./, first => first.toUpperCase());
const recordOf = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function SourceValue({ value, field = "" }: { value: unknown; field?: string }) {
  if (value == null || value === "") return <span className="source-missing">No informado</span>;
  if (Array.isArray(value)) return value.length ? <div className="source-value-list">{value.map((item, index) => <div key={index}><SourceValue value={item} /></div>)}</div> : <p className="source-missing">Sin antecedentes informados</p>;
  if (typeof value === "object") {
    const item = recordOf(value);
    return <dl className="source-field-list">{Object.entries(item).filter(([key]) => key !== "dv" || !item.rut).map(([key, content]) => <div key={key}><dt>{labelFor(key)}</dt><dd><SourceValue field={key} value={key === "rut" && item.dv ? `${content}-${item.dv}` : content} /></dd></div>)}</dl>;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T[\d:.+-]+Z?)?$/.test(value) && activityDate(value)) return <>{sourceDate(value)}</>;
  if (field === "country" && typeof value === "string" && /^[a-z]{2}$/i.test(value)) return <>{new Intl.DisplayNames(["es"], { type: "region" }).of(value.toUpperCase())}</>;
  return <>{typeof value === "boolean" ? value ? "Sí" : "No" : String(value)}</>;
}

function SourceActivities({ value }: { value: unknown }) {
  const events = oldestActivityFirst((Array.isArray(value) ? value : []).map(item => {
    const source = recordOf(item);
    return { date: String(source.event_date ?? ""), source };
  }));
  if (!events.length) return <p className="source-missing">Sin actuaciones informadas</p>;
  return <ol className="source-activity-list">{events.map(({ date, source }, index) => <li key={`${String(source.event_id ?? date)}-${index}`}><i aria-hidden /><div><time dateTime={activityDate(date) || undefined}>{sourceDate(date)}</time><h4>{String(source.status_description || "Actuación sin descripción")}</h4>{source.due_date ? <p className="source-activity-due">Vencimiento informado: {sourceDate(source.due_date)}</p> : null}{source.observation ? <details className="source-observation"><summary>Leer resolución completa</summary><p>{String(source.observation)}</p></details> : null}<details className="source-act-reference"><summary>Referencia de la actuación</summary><SourceValue value={Object.fromEntries(Object.entries(source).filter(([key]) => !["event_date", "status_description", "observation", "due_date"].includes(key)))} /></details>{index < events.length - 1 && <span className="source-activity-arrow" aria-hidden>↓</span>}</div></li>)}</ol>;
}

export function SourceInspector({ data, tracked, pending, onClose }: { data: SourceRecord; tracked: boolean; pending: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    const opener = document.activeElement;
    node?.showModal();
    return () => { node?.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); };
  }, []);
  const general = recordOf(data.inapi?.status);
  const events = Array.isArray(data.inapi?.events) ? data.inapi.events : [];
  const facts = [
    ["Número de solicitud", data.applicationNumber], ["Número de registro", data.registrationNumber ?? "No asignado"], ["Tipo de marca", data.type], ["Clases de Niza", data.classes.join(", ") || "No informadas"],
    ["Presentación", sourceDate(data.filingDate)], ["Publicación en Diario Oficial", sourceDate(data.publicationDate)], ["Fecha de registro", sourceDate(data.registrationDate)], ["Vencimiento del registro", sourceDate(data.expirationDate)],
  ];
  return <dialog ref={dialog} className="source-inspector" onCancel={onClose} aria-labelledby="source-inspector-title">
    <header><div><span>INAPI · SOLICITUD {data.applicationNumber}</span><h2 id="source-inspector-title">{data.name}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar expediente"><X size={22} /></button></header>
    <div className="source-inspector-body">
      <section className="source-inspector-status"><div className="source-status-heading"><span>Etapa según los antecedentes</span><span className={`source-pill ${pending ? "pending" : ""}`}>{pending ? "Con diferencias pendientes" : tracked ? "En cartera" : "Fuera de cartera"}</span></div><h3>{statusLabel(data.status)}</h3><p>Estado general de INAPI: <strong>{String(general.description ?? "No informado")}</strong>{general.code ? ` · Código ${general.code}` : ""}</p>{data.status === "registered" && general.description === "En Trámite" && <p className="source-feedback">El estado general de la fuente aún indica “En trámite”. Los antecedentes de registro y la resolución del historial sustentan la etapa “Registro concedido”.</p>}</section>
      <section className="source-inspector-section"><h3>Datos del expediente</h3><dl className="source-fact-grid">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <details className="source-inspector-section" open><summary>Clases y cobertura</summary><SourceValue value={data.inapi?.classes} /></details>
      <details className="source-inspector-section" open><summary>Actuaciones del expediente <span>{events.length}</span></summary><p className="source-section-hint">De más antiguo a más reciente</p><SourceActivities value={events} /></details>
      {Object.entries(data.inapi ?? {}).filter(([key]) => !["events", "classes", "status"].includes(key)).map(([key, value]) => <details className="source-inspector-section" key={key}><summary>{labelFor(key)}{Array.isArray(value) && <span>{value.length}</span>}</summary>{key === "annotations" ? <SourceActivities value={value} /> : <SourceValue value={value} />}</details>)}
      <section className="source-inspector-section source-official-reference"><h3>Consulta oficial</h3><p>Busca la solicitud {data.applicationNumber} para consultar el expediente en INAPI.</p><a href={data.officialUrl} target="_blank" rel="noreferrer">Abrir buscador INAPI <ArrowSquareOut size={17} aria-hidden /></a></section>
    </div>
    <footer><span>Antecedentes recibidos de INAPI · Solo lectura</span><button type="button" onClick={onClose}>Cerrar</button></footer>
  </dialog>;
}
