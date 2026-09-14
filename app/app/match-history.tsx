"use client";

import { displayWorkDate, parseWorkDate } from "@/lib/work-priorities";
import { useRegistrationApplications } from "./registrations";

export function MatchHistory({ application, name, source, date, storedHistory }: {
  application: string; name: string; source: string; date: string;
  storedHistory?: { date: string; title: string }[];
}) {
  const [applications] = useRegistrationApplications();
  // A demo number can belong to an unrelated real trademark: require both identifiers.
  const record = applications.find(item => item.applicationNumber === application && item.name.trim().toLocaleUpperCase("es") === name.trim().toLocaleUpperCase("es"));
  const history = record?.history.map(event => ({ date: event.date, title: event.status || "Actuación", detail: event.detail, id: event.eventId, code: event.code }))
    ?? storedHistory?.map(event => ({ ...event, detail: undefined, id: undefined, code: undefined }))
    ?? [{ date: parseWorkDate(date) ?? "", title: source === "Diario Oficial" ? "Publicación de marca en Diario Oficial" : "Solicitud detectada en INAPI", detail: "Hito de demostración asociado a esta vigilancia.", id: undefined, code: undefined }];
  const real = record?.provider === "inapi" || Boolean(storedHistory);
  return <section className="buho-case-section buho-history match-history"><header><div><h3>Historial Marca Vigilada</h3><p>{name} · Solicitud {application}</p></div><span>{real ? "INAPI" : "Demostración"}</span></header>
    <ol>{[...history].sort((a, b) => a.date.localeCompare(b.date)).map((event, index) => <li key={`${event.id ?? index}:${event.date}`}><time dateTime={event.date || undefined}>{displayWorkDate(event.date)}</time><details><summary>{event.title}</summary><p>{event.detail || "Sin observaciones adicionales."}</p>{event.id && <small>ID de actuación: {event.id}</small>}{event.code && <small>Código INAPI: {event.code}</small>}</details></li>)}</ol>
    {!real && <p className="buho-work-note">Esta vigilancia es de demostración. El historial real se mostrará cuando su expediente esté conectado.</p>}
    {!history.length && <p>No hay actuaciones disponibles para esta marca.</p>}
  </section>;
}
