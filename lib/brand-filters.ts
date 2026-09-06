import { statusLabel } from "./source-contract";

export type BrandFilterValues = { origin: string; state: string; type: string; niceClass: string };
export const EMPTY_BRAND_FILTERS: BrandFilterValues = { origin: "", state: "", type: "", niceClass: "" };
type FilterableBrand = { name: string; owner: string; rut: string; registration: string; applicationNumber?: string; provider?: string; legalStatus?: string; registrationState: string; type: string; classes: string; status: string };
export const brandStateLabel = (brand: FilterableBrand) => brand.legalStatus ? statusLabel(brand.legalStatus) : brand.registrationState;
export const brandClassNumbers = (brand: FilterableBrand) => (brand.classes.match(/\d+/g) ?? []).map(Number);
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

export function matchesBrandFilters(brand: FilterableBrand, filters: BrandFilterValues, query = "", monitoring = "Todas") {
  if (monitoring !== "Todas" && brand.status !== monitoring) return false;
  if (filters.origin && filters.origin !== (brand.provider === "inapi" ? "real" : "mock")) return false;
  if (filters.state && brandStateLabel(brand) !== filters.state) return false;
  if (filters.type && brand.type !== filters.type) return false;
  if (filters.niceClass && !brandClassNumbers(brand).includes(Number(filters.niceClass))) return false;
  const needle = fold(query.trim());
  if (!needle) return true;
  const haystack = fold(`${brand.name} ${brand.owner} ${brand.rut} ${brand.applicationNumber ?? ""} ${brand.registration}`);
  if (needle.split(/\s+/).every(token => haystack.includes(token))) return true;
  // RUT searches work both with and without Chilean punctuation.
  return /^[\d.k-]+$/i.test(needle) && fold(brand.rut).replace(/[.\s-]/g, "").includes(needle.replace(/[.-]/g, ""));
}
