export type DomainRecord = {
  id: string;
  name: string;
  brandId?: string;
  // Registry creation date, distinct from the date added to monitoring.
  createdAt: string | null;
  addedAt: string;
  holder: string | null;
};
export type DomainNotice = { id: string; domainId: string; title: string; date: string; reviewed: boolean };
export type DomainPreview = { domains: DomainRecord[]; notices: DomainNotice[] };
export type DomainBrand = { id: string; name: string };
export const NIC_WHOIS_URL = "https://www.nic.cl/registry/Whois.do";

export function initialDomainPreview(): DomainPreview {
  return {
    domains: [
      { id: "domain-demo-1", name: "novafoods.cl", createdAt: "2024-03-12", addedAt: "2026-10-10", holder: null },
      { id: "domain-demo-2", name: "terrasur.cl", createdAt: "2023-08-24", addedAt: "2026-10-10", holder: null },
      { id: "domain-demo-3", name: "casanube.cl", createdAt: "2025-02-06", addedAt: "2026-10-11", holder: null },
      { id: "domain-demo-4", name: "estudioejemplo.cl", createdAt: "2022-06-17", addedAt: "2026-10-12", holder: null },
    ],
    notices: [
      { id: "domain-notice-1", domainId: "domain-demo-1", title: "Cambio de titular detectado", date: "2026-10-12", reviewed: false },
      { id: "domain-notice-2", domainId: "domain-demo-2", title: "Cambio en los servidores de nombre", date: "2026-10-11", reviewed: false },
    ],
  };
}

/** Accept a hostname, not a URL, path, email address or port. NIC-style bare names default to .cl. */
export function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase().normalize("NFC").replace(/\.$/, "");
  if (!raw || /[\s/:@?#]/u.test(raw)) throw new Error("Ingresa un dominio, por ejemplo mimarca.cl, sin dirección web ni rutas.");
  const complete = raw.includes(".") ? raw : `${raw}.cl`;
  let name: string;
  try { name = new URL(`https://${complete}`).hostname; } catch { throw new Error("El dominio no tiene un formato válido."); }
  const labels = name.split(".");
  if (name.length > 253 || labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/[a-z]/.test(labels.at(-1)!)) {
    throw new Error("Usa un dominio válido, sin guiones al inicio o final de cada parte.");
  }
  return name;
}

export function addPreviewDomain(state: DomainPreview, input: string, brandId?: string): DomainPreview {
  const name = normalizeDomain(input);
  if (brandId && state.domains.some(domain => domain.brandId === brandId && domain.name !== name)) throw new Error("Esta marca ya tiene un dominio asociado. Desvincúlalo primero para cambiarlo.");
  const existing = state.domains.find(domain => domain.name === name);
  if (existing) {
    if (!brandId || existing.brandId === brandId) throw new Error("Este dominio ya está en vigilancia.");
    if (existing.brandId) throw new Error("Este dominio ya está asociado a otra marca.");
    return { ...state, domains: state.domains.map(domain => domain.id === existing.id ? { ...domain, brandId } : domain) };
  }
  return { ...state, domains: [...state.domains, { id: `domain-${name}`, name, brandId, createdAt: null, holder: null, addedAt: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date()) }] };
}

export type DomainSearchResult = { name: string; status: "Inscrito" | "Disponible"; createdAt: string | null; holder: string | null };
export function searchDomainPreview(domains: DomainRecord[], input: string, mode: "exact" | "contains"): DomainSearchResult[] {
  const query = mode === "exact" ? normalizeDomain(input) : input.trim().toLowerCase().normalize("NFC");
  if (!query) throw new Error("Escribe un nombre para buscar.");
  // A single deliberately fictitious available fixture, never infer availability from absence.
  const examples: DomainSearchResult[] = [...domains.filter(domain => domain.createdAt).map(domain => ({ name: domain.name, status: "Inscrito" as const, createdAt: domain.createdAt, holder: domain.holder })), { name: "nuevamarcaejemplo.cl", status: "Disponible", createdAt: null, holder: null }];
  return examples.filter(domain => mode === "exact" ? domain.name === query : domain.name.includes(query));
}
