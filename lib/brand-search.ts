export const MOCK_ATTRIBUTE_SEARCH = process.env.NEXT_PUBLIC_MOCK_ATTRIBUTE_SEARCH !== "false";
export const BRAND_SEARCH_FIELDS = {
  any: "Cualquier campo", name: "Nombre de la marca", registration: "Número de registro", applicationNumber: "Número de solicitud",
  owner: "Nombre del titular", rut: "RUT del titular / solicitante", representativeName: "Representante", ownerCountry: "País del titular",
  representativeCountry: "País del representante", country: "País del registro", type: "Tipo de marca", classes: "Clase Niza", registrationState: "Estado del registro",
  filingDate: "Fecha de presentación", publicationDate: "Fecha de publicación", expirationDate: "Fecha de vencimiento", id: "Identificador interno",
} as const;
export type BrandSearchField = keyof typeof BRAND_SEARCH_FIELDS;
export type SearchableBrand = Partial<Record<Exclude<BrandSearchField, "any">, string>>;
const fold = (text: string) => text.trim().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function exactBrandMatch(brand: SearchableBrand, field: BrandSearchField, query: string): boolean {
  if (!query.trim()) return true;
  if (field === "any") return Object.keys(BRAND_SEARCH_FIELDS).filter(key => key !== "any").some(key => exactBrandMatch(brand, key as BrandSearchField, query));
  const value = brand[field];
  if (!value) return false;
  if (field === "rut") return fold(value).replace(/[.\s-]/g, "") === fold(query).replace(/[.\s-]/g, "");
  if (field === "classes") return /^\d{1,2}$/.test(query.trim()) && (value.match(/\d+/g) ?? []).some(number => Number(number) === Number(query));
  return fold(value) === fold(query);
}
export type SearchCandidate = SearchableBrand & { name: string; owner: string; rut: string; registration: string; applicationNumber: string; classes: string; type: "Denominativa" | "Figurativa" | "Mixta" | "Otra"; logo?: string };
export const MOCK_SEARCH_CATALOGUE: SearchCandidate[] = [
  { name: "ACME ANDES", owner: "ACME Chile SpA", rut: "77.888.410-5", registration: "1560998", applicationNumber: "1700998", classes: "35, 42", type: "Denominativa", country: "Chile", ownerCountry: "Chile", representativeName: "Estudio Andes", representativeCountry: "Chile", registrationState: "Registrada", filingDate: "2025-03-18", publicationDate: "2025-05-04", expirationDate: "2035-08-18" },
  { name: "ACME NATURAL", owner: "ACME Chile SpA", rut: "77.888.410-5", registration: "1560999", applicationNumber: "1700999", classes: "29, 30", type: "Denominativa", country: "Chile", ownerCountry: "Chile", representativeName: "Estudio Andes", representativeCountry: "Chile", registrationState: "Registrada" },
  { name: "CAFETERAS MISTRAL", owner: "Cafeteras Mistral SpA", rut: "76.300.120-8", registration: "1506001", applicationNumber: "1690101", classes: "11, 30, 43", type: "Mixta", logo: "/feasibility/cafeteras-mistral.png", country: "Chile", ownerCountry: "Chile", representativeName: "Estudio Mistral", representativeCountry: "Chile", registrationState: "Registrada" },
];
