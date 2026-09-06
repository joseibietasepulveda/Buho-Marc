"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CLIENT_FIELDS, associatedClientId, resolveBrandClientId, type ClientBrand, type Client, type ClientField } from "@/lib/client-directory";

type SaveResult = { ok: boolean; message?: string; client?: Client };
type Directory = {
  clients: Client[]; loading: boolean; error: string; notice: string;
  reload: () => void; openClient: (id: string) => void;
  clientForBrand: (name: string, id?: string) => Client | undefined;
  save: (client: Client, field: ClientField, value: string, version: number) => Promise<SaveResult>;
};
const DirectoryContext = createContext<Directory | null>(null);
export function useClientDirectory() {
  const value = useContext(DirectoryContext);
  if (!value) throw new Error("ClientDirectoryProvider is required");
  return value;
}

export function ClientDirectoryProvider({ brands, children }: { brands: ClientBrand[]; children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    try {
      const response = await fetch("/api/clients", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo cargar el directorio");
      if (current === generation.current) { setClients(data.clients); setError(""); }
    } catch (failure) {
      if (current === generation.current) setError(failure instanceof Error ? failure.message : "No se pudo cargar el directorio");
    } finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const requestGeneration = generation;
    // State updates happen only after the directory request resolves or fails.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    const onFocus = () => { void reload(); };
    window.addEventListener("focus", onFocus);
    return () => { requestGeneration.current++; window.removeEventListener("focus", onFocus); };
  }, [reload]);
  const clientForBrand = (name: string, id?: string) => {
    return clients.find(client => client.id === resolveBrandClientId(brands, name, id));
  };
  const save: Directory["save"] = async (client, field, value, version) => {
    generation.current++;
    setNotice("");
    try {
      const response = await fetch("/api/clients", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: client.id, field, value, version }) });
      const data = await response.json();
      generation.current++;
      if (data.client) setClients(current => current.map(item => item.id === data.client.id && item.version <= data.client.version ? data.client : item));
      if (!response.ok) return { ok: false, message: data.message || "No se pudo guardar el cambio", client: data.client };
      setNotice("Cambio guardado. Las fichas del cliente ya están actualizadas.");
      return { ok: true, client: data.client };
    } catch { return { ok: false, message: "No se pudo confirmar el guardado. Revisa tu conexión e inténtalo nuevamente." }; }
  };
  const selected = clients.find(client => client.id === selectedId);
  return <DirectoryContext.Provider value={{ clients, loading, error, notice, reload, openClient: setSelectedId, clientForBrand, save }}>{children}{selected && <ClientProfile client={selected} brands={brands.filter(brand => associatedClientId(brand) === selected.id)} onClose={() => setSelectedId(null)} />}</DirectoryContext.Provider>;
}

export function BrandClientLink({ brand, brandId }: { brand: string; brandId?: string }) {
  const { clientForBrand, openClient, loading, error, reload } = useClientDirectory();
  const client = clientForBrand(brand, brandId);
  if (loading) return <span className="buho-client-unassigned">Cargando cliente…</span>;
  if (error) return <button className="buho-client-link" type="button" onClick={event => { event.stopPropagation(); reload(); }} onKeyDown={event => event.stopPropagation()}>Reintentar carga de cliente</button>;
  if (!client) return <span className="buho-client-unassigned">Sin cliente asignado</span>;
  return <button className="buho-client-link" type="button" aria-label={`Ver ficha de ${client.name}`} onClick={event => { event.stopPropagation(); openClient(client.id); }} onKeyDown={event => event.stopPropagation()}>{client.name}<span aria-hidden> ↗</span></button>;
}
export function ClientNameLink({ name }: { name: string }) {
  const { clients, openClient } = useClientDirectory();
  const client = clients.find(item => item.name === name);
  return client ? <button className="buho-client-link" type="button" onClick={() => openClient(client.id)}>{client.name} ↗</button> : <span>{name}</span>;
}
export function ClientContact({ brand, brandId }: { brand: string; brandId?: string }) {
  const { clientForBrand } = useClientDirectory();
  const client = clientForBrand(brand, brandId);
  return <section className="buho-client-contact" aria-label="Datos de contacto del cliente"><div><span>Estudio cliente</span><BrandClientLink brand={brand} brandId={brandId} />{client && <small>{client.contact || "Sin contacto"} · RUT {client.rut || "No informado"}</small>}</div>{client && <><div><span>Correo de contacto</span><strong>{client.email || "No informado"}</strong></div><div><span>Teléfono de contacto</span><strong>{client.phone || "No informado"}</strong></div>{client.mock && <small className="buho-client-demo">Cliente Mock · datos de demostración</small>}</>}</section>;
}

function EditableClientCell({ client, field, label }: { client: Client; field: ClientField; label: string }) {
  const { save } = useClientDirectory();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [version, setVersion] = useState(client.version);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);
  if (!editing) return <button className={`buho-client-cell client-field-${field}`} type="button" aria-label={`Editar ${label} de ${client.name}`} onClick={() => { setDraft(client[field]); setVersion(client.version); setError(""); setEditing(true); }}><span>{client[field] || "Agregar dato"}</span><span className="buho-client-pencil" aria-hidden>✎</span></button>;
  return <form className="buho-client-editor" onSubmit={async event => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError("");
    const result = await save(client, field, draft, version);
    setSaving(false);
    if (result.ok) setEditing(false);
    else { setError(`${result.message}${result.client ? ` Valor actual: ${result.client[field] || "vacío"}.` : ""}`); if (result.client) setVersion(result.client.version); }
  }}><input ref={input} aria-label={label} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} required={field === "name"} minLength={field === "name" ? 2 : undefined} maxLength={field === "rut" ? 30 : field === "phone" ? 60 : field === "email" ? 255 : 180} value={draft} disabled={saving} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Escape" && !saving) { event.preventDefault(); event.stopPropagation(); setEditing(false); } }} /><div><button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button><button type="button" disabled={saving} onClick={() => setEditing(false)}>Cancelar</button></div>{error && <small role="alert">{error}</small>}</form>;
}

function ClientProfile({ client, brands, onClose }: { client: Client; brands: ClientBrand[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { notice } = useClientDirectory();
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} className="buho-client-profile" aria-labelledby="client-profile-title" onCancel={onClose}><header><div><span className="buho-overline">ESTUDIO CLIENTE · {client.mock ? "MOCK" : "REAL"}</span><h2 id="client-profile-title">{client.name}</h2></div><button type="button" aria-label="Cerrar ficha del cliente" onClick={onClose}>×</button></header><div className="buho-client-profile-body"><p>Información del estudio que gestiona la cartera. El titular de la marca se mantiene separado.</p><dl>{CLIENT_FIELDS.map(field => <div key={field.key}><dt>{field.label}</dt><dd><EditableClientCell client={client} field={field.key} label={field.label} /></dd></div>)}</dl><p className="buho-client-save-status" role="status">{notice}</p><section><h3>Marcas vinculadas <span>({brands.length})</span></h3>{brands.length ? <ul>{brands.map(brand => <li key={brand.id}>{brand.name}</li>)}</ul> : <p>Aún no hay marcas vinculadas a este estudio.</p>}</section>{client.mock && <small>Este estudio y sus vínculos son de demostración. No se asignan automáticamente a marcas reales.</small>}</div></dialog>;
}

export function ClientsView() {
  const { clients, loading, error, notice, reload, openClient } = useClientDirectory();
  const [query, setQuery] = useState("");
  const visible = clients.filter(client => CLIENT_FIELDS.map(field => client[field.key]).join(" ").toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  return <section className="buho-clients buho-table-panel"><header><div><strong>{clients.length} estudios clientes</strong><p>Haz clic en cualquier dato para editarlo. Usa «Ver ficha» para consultar el cliente.</p></div><label className="buho-live-search">Buscar cliente<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Estudio, RUT o contacto" /></label></header><p className="buho-client-save-status" role="status">{loading ? "Cargando clientes…" : notice || "Clientes Mock · directorio de demostración"}</p>{error && <p role="alert">{error} <button type="button" onClick={reload}>Reintentar</button></p>}<div className="buho-table-wrap"><table><thead><tr>{CLIENT_FIELDS.map(field => <th key={field.key}>{field.label}</th>)}<th>Ficha</th></tr></thead><tbody>{visible.map(client => <tr key={client.id}>{CLIENT_FIELDS.map(field => <td key={field.key} data-client-field={field.key}><EditableClientCell client={client} field={field.key} label={field.label} /></td>)}<td><button className="buho-client-link" type="button" aria-label={`Ver ficha de ${client.name}`} onClick={() => openClient(client.id)}>Ver ficha ↗</button></td></tr>)}</tbody></table>{!loading && !error && !visible.length && <p className="buho-info-line">No se encontraron clientes para esta búsqueda.</p>}</div></section>;
}
