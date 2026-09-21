"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CLIENT_FIELDS, associatedClientId, resolveBrandClientId, type ClientBrand, type Client, type ClientField, type ClientData } from "@/lib/client-directory";

import { ReviewDialog } from "./review-dialog";

type SaveResult = { ok: boolean; message?: string; client?: Client };
type Directory = {
  newClient: (brandId?: string) => void;
  assign: (brandId: string, clientId: string) => Promise<SaveResult>;
  brandIdFor: (name: string, id?: string) => string | undefined;
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

export function ClientDirectoryProvider({ brands, children, onOpenBrand, onAssigned }: { brands: ClientBrand[]; children: ReactNode; onOpenBrand: (id: string) => void; onAssigned: () => Promise<void> }) {
  const [creating, setCreating] = useState<{ brandId?: string } | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const linkedBrands = brands.map(brand => assignments[brand.id] ? { ...brand, clientId: assignments[brand.id] } : brand);
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
    return clients.find(client => client.id === resolveBrandClientId(linkedBrands, name, id));
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
  const brandIdFor = (name: string, id?: string) => {
    const candidates = brands.filter(brand => id ? brand.id === id : brand.name === name);
    return candidates.length === 1 ? candidates[0].id : undefined;
  };
  const assign: Directory["assign"] = async (brandId, clientId) => {
    try {
      const response = await fetch("/api/clients", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ brandId, clientId }) });
      const payload = await response.json();
      if (!response.ok) return { ok: false, message: payload.message };
      setAssignments(current => ({ ...current, [brandId]: clientId }));
      void onAssigned().catch(() => {});
      return { ok: true };
    } catch { return { ok: false, message: "No se pudo asociar el cliente. Intenta nuevamente." }; }
  };
  async function create(data: ClientData): Promise<SaveResult> {
    try {
      const response = await fetch("/api/clients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data, ...(creating?.brandId ? { brandId: creating.brandId } : {}) }) });
      const payload = await response.json();
      if (!response.ok) return { ok: false, message: payload.message };
      generation.current++;
      setClients(current => [...current, payload.client]);
      if (creating?.brandId) {
        const brandId = creating.brandId;
        setAssignments(current => ({ ...current, [brandId]: payload.client.id }));
      }
      setNotice(creating?.brandId ? "Cliente creado y asociado a la marca." : "Cliente creado. Ya puedes asociarlo a tus marcas.");
      setCreating(null);
      void onAssigned().catch(() => {});
      return { ok: true, client: payload.client };
    } catch { return { ok: false, message: "No se pudo confirmar el guardado. Intenta nuevamente." }; }
  }
  const selected = clients.find(client => client.id === selectedId);
  return <DirectoryContext.Provider value={{ newClient: brandId => setCreating({ brandId }), assign, brandIdFor, clients, loading, error, notice, reload, openClient: setSelectedId, clientForBrand, save }}>{children}{selected && <ClientProfile onOpenBrand={id => { setSelectedId(null); onOpenBrand(id); }} client={selected} brands={linkedBrands.filter(brand => associatedClientId(brand) === selected.id)} onClose={() => setSelectedId(null)} />}{creating && <CreateClient onSave={create} onClose={() => setCreating(null)} brandName={brands.find(brand => brand.id === creating.brandId)?.name} />}</DirectoryContext.Provider>;
}

export function BrandClientLink({ brand, brandId }: { brand: string; brandId?: string }) {
  const { clientForBrand, openClient, loading, error, reload, brandIdFor } = useClientDirectory();
  const client = clientForBrand(brand, brandId);
  if (loading) return <span className="buho-client-unassigned">Cargando cliente…</span>;
  if (error) return <button className="buho-client-link" type="button" onClick={event => { event.stopPropagation(); reload(); }} onKeyDown={event => event.stopPropagation()}>Reintentar carga de cliente</button>;
  if (!client) { const id = brandIdFor(brand, brandId); return id ? <AssignClient brandId={id} brand={brand} /> : <span className="buho-client-unassigned">Sin cliente asignado</span>; }
  return <button className="buho-client-link" type="button" aria-label={`Ver ficha de ${client.name}`} onClick={event => { event.stopPropagation(); openClient(client.id); }} onKeyDown={event => event.stopPropagation()}>{client.name}<span aria-hidden> ↗</span></button>;
}
export function ClientNameLink({ name }: { name: string }) {
  const { clients, openClient } = useClientDirectory();
  const client = clients.find(item => item.name === name);
  return client ? <button className="buho-client-link" type="button" onClick={() => openClient(client.id)}>{client.name} ↗</button> : <span>{name}</span>;
}
export function ClientContact({ brand, brandId, compact = false }: { brand: string; brandId?: string; compact?: boolean }) {
  const { clientForBrand } = useClientDirectory();
  const client = clientForBrand(brand, brandId);
  if (compact) return <p className="client-inline">Cliente: <BrandClientLink brand={brand} brandId={brandId} /></p>;
  return <section className="buho-client-contact" aria-label="Datos de contacto del cliente"><div><span>Cliente</span><BrandClientLink brand={brand} brandId={brandId} />{client && <small>{client.contact || "Sin contacto"} · RUT {client.rut || "No informado"}</small>}</div>{client && <><div><span>Correo de contacto</span><strong>{client.email || "No informado"}</strong></div><div><span>Teléfono de contacto</span><strong>{client.phone || "No informado"}</strong></div>{client.mock && <small className="buho-client-demo">Cliente Mock · datos de demostración</small>}</>}</section>;
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

function ClientProfile({ client, brands, onClose, onOpenBrand }: { client: Client; brands: ClientBrand[]; onClose: () => void; onOpenBrand: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { notice } = useClientDirectory();
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} className="buho-client-profile" aria-labelledby="client-profile-title" onCancel={onClose}><header><div><span className="buho-overline">CLIENTE · {client.mock ? "MOCK" : "REAL"}</span><h2 id="client-profile-title">{client.name}</h2></div><button type="button" aria-label="Cerrar ficha del cliente" onClick={onClose}>×</button></header><div className="buho-client-profile-body"><p>Datos del cliente y las marcas que el estudio gestiona para él.</p><dl>{CLIENT_FIELDS.map(field => <div key={field.key}><dt>{field.label}</dt><dd><EditableClientCell client={client} field={field.key} label={field.label} /></dd></div>)}</dl><p className="buho-client-save-status" role="status">{notice}</p><section><h3>Marcas vinculadas <span>({brands.length})</span></h3>{brands.length ? <ul>{brands.map(brand => <li key={brand.id}><button className="client-brand-link" type="button" onClick={() => onOpenBrand(brand.id)}>{brand.name}<span aria-hidden>Ver marca →</span></button></li>)}</ul> : <p>Aún no hay marcas vinculadas a este cliente.</p>}</section>{client.mock && <small>Este cliente y sus vínculos son de demostración. No se asignan automáticamente a marcas reales.</small>}</div></dialog>;
}

export function ClientsView() {
  const { clients, loading, error, notice, reload, openClient, newClient } = useClientDirectory();
  const [query, setQuery] = useState("");
  const visible = clients.filter(client => CLIENT_FIELDS.map(field => client[field.key]).join(" ").toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  return <section className="buho-clients buho-table-panel"><header><div><strong>{clients.length} clientes</strong><p>Haz clic en una fila para abrir la ficha y editar los datos del cliente.</p></div><div className="client-directory-actions"><button type="button" className="buho-primary" onClick={() => newClient()}>Nuevo cliente +</button><label className="buho-live-search">Buscar cliente<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cliente, RUT o contacto" /></label></div></header><p className="buho-client-save-status" role="status">{loading ? "Cargando clientes…" : notice || (clients.some(client => client.mock) ? "Clientes Mock · directorio de demostración" : "Directorio de clientes de tu espacio")}</p>{error && <p role="alert">{error} <button type="button" onClick={reload}>Reintentar</button></p>}<div className="buho-table-wrap"><table><thead><tr>{CLIENT_FIELDS.map(field => <th key={field.key}>{field.label}</th>)}<th>Ficha</th></tr></thead><tbody>{visible.map(client => <tr className="is-clickable" key={client.id} tabIndex={0} aria-label={`Abrir ficha de ${client.name}`} onClick={() => openClient(client.id)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openClient(client.id); } }}>{CLIENT_FIELDS.map(field => <td key={field.key} data-client-field={field.key}>{client[field.key] || "No informado"}</td>)}<td><button className="buho-client-link" type="button" aria-label={`Ver ficha de ${client.name}`} onClick={() => openClient(client.id)}>Ver ficha ↗</button></td></tr>)}</tbody></table>{!loading && !error && !visible.length && <div className="clients-empty"><h3>{clients.length ? "No encontramos clientes con esa búsqueda" : "Crea tu primer cliente"}</h3><p>{clients.length ? "Prueba con otro nombre, RUT o contacto." : "Guarda sus datos de contacto y vincula las marcas que gestionas para él."}</p>{!clients.length && <button type="button" className="buho-primary" onClick={() => newClient()}>Crear cliente</button>}</div>}</div></section>;
}

function AssignClient({ brandId, brand }: { brandId: string; brand: string }) {
  const { clients, assign, newClient } = useClientDirectory();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <span className="client-assignment">
    <select aria-label={`Asignar cliente a ${brand}`} value="" disabled={busy} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onChange={async event => {
      const id = event.target.value; if (!id) return;
      if (id === "new") { newClient(brandId); return; }
      setBusy(true); setError("");
      const result = await assign(brandId, id);
      if (!result.ok) setError(result.message ?? "No se pudo guardar.");
      setBusy(false);
    }}><option value="">{busy ? "Asociando cliente…" : "Asignar cliente…"}</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}<option value="new">+ Crear un nuevo cliente</option></select>
    {error && <small role="alert">{error}</small>}
  </span>;
}

function CreateClient({ onSave, onClose, brandName }: { onSave: (data: ClientData) => Promise<SaveResult>; onClose: () => void; brandName?: string }) {
  const [data, setData] = useState<ClientData>({ name: "", rut: "", contact: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <ReviewDialog title="Nuevo cliente" onClose={() => { if (!busy) onClose(); }} className="client-create-dialog">
    <form className="client-create-form" onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(""); const result = await onSave(data); if (!result.ok) setError(result.message ?? "No se pudo crear el cliente."); setBusy(false); }}>
      <p>{brandName ? `El cliente quedará asociado a ${brandName}.` : "Agrega una persona o empresa a tu directorio. Después podrás vincular sus marcas."}</p>
      <label>Nombre o razón social <span>(obligatorio)</span><input required minLength={2} maxLength={180} value={data.name} onChange={e => setData(v => ({ ...v, name: e.target.value }))} placeholder="Ej. Comercial Los Andes SpA" /></label>
      <div className="client-create-grid">{CLIENT_FIELDS.filter(field => field.key !== "name").map(field => <label key={field.key}>{field.label} <span>(opcional)</span><input type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"} maxLength={field.key === "rut" ? 30 : field.key === "phone" ? 60 : field.key === "email" ? 255 : 180} value={data[field.key]} onChange={e => setData(v => ({ ...v, [field.key]: e.target.value }))} /></label>)}</div>
      {error && <p role="alert" className="task-error">{error}</p>}
      <footer><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="buho-primary" disabled={busy || data.name.trim().length < 2}>{busy ? "Guardando…" : brandName ? "Crear y asociar cliente" : "Crear cliente"}</button></footer>
    </form>
  </ReviewDialog>;
}
