"use client";

import { useState } from "react";

export const demoClients = [
  { id: "CL-01", name: "Araya & Montes Abogados", rut: "77.810.240-6", contact: "Catalina Araya", phone: "+56 2 2400 0101", email: "catalina.araya@example.com" },
  { id: "CL-02", name: "Estudio Rivas del Valle", rut: "77.810.241-4", contact: "Tomás Rivas", phone: "+56 2 2400 0102", email: "tomas.rivas@example.com" },
  { id: "CL-03", name: "Fuentes y Lagos Propiedad Intelectual", rut: "77.810.242-2", contact: "Antonia Lagos", phone: "+56 2 2400 0103", email: "antonia.lagos@example.com" },
  { id: "CL-04", name: "Estudio Córdova Legal", rut: "77.810.243-0", contact: "Diego Córdova", phone: "+56 2 2400 0104", email: "diego.cordova@example.com" },
  { id: "CL-05", name: "Valdés & Pizarro Asociados", rut: "77.810.244-9", contact: "Josefina Valdés", phone: "+56 2 2400 0105", email: "josefina.valdes@example.com" },
  { id: "CL-06", name: "Estudio Andrade Sur", rut: "77.810.245-7", contact: "Nicolás Andrade", phone: "+56 2 2400 0106", email: "nicolas.andrade@example.com" },
];

export function clientForBrand(brand: string) {
  const key = brand.trim().toLocaleUpperCase("es");
  const index = Array.from(key).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % demoClients.length;
  return demoClients[index];
}

export function ClientContact({ brand }: { brand: string }) {
  const client = clientForBrand(brand);
  return <section className="buho-client-contact" aria-label="Datos de contacto del cliente"><div><span>Estudio cliente</span><strong>{client.name}</strong><small>{client.contact} · RUT {client.rut}</small></div><div><span>Correo de contacto</span><strong>{client.email}</strong></div><div><span>Teléfono de contacto</span><strong>{client.phone}</strong></div><small className="buho-client-demo">Datos ficticios de demostración</small></section>;
}

export function ClientsView() {
  const [query, setQuery] = useState("");
  const visible = demoClients.filter((client) => Object.values(client).join(" ").toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  return <section className="buho-clients buho-table-panel"><header><div><strong>{demoClients.length} estudios clientes</strong><p>Directorio de contactos · datos ficticios</p></div><label className="buho-live-search">Buscar cliente<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Estudio, RUT o contacto" /></label></header><div className="buho-table-wrap"><table><thead><tr><th>Nombre del estudio</th><th>RUT</th><th>Nombre de contacto</th><th>Teléfono de contacto</th><th>Mail de contacto</th></tr></thead><tbody>{visible.map((client) => <tr key={client.id}><td><strong>{client.name}</strong></td><td>{client.rut}</td><td>{client.contact}</td><td>{client.phone}</td><td>{client.email}</td></tr>)}</tbody></table>{!visible.length && <p className="buho-info-line">No se encontraron clientes para esta búsqueda.</p>}</div></section>;
}
