import { BRAND_SEARCH_FIELDS, type BrandSearchField, type SearchableBrand } from "./brand-search";
import { statusLabel } from "./source-contract";

export type BrandFilterValues = { searchField?: BrandSearchField; origin: string; state: string; type: string; niceClass: string };
export const EMPTY_BRAND_FILTERS: BrandFilterValues = { origin: "", state: "", type: "", niceClass: "" };
type FilterableBrand = SearchableBrand & { name: string; owner: string; rut: string; registration: string; applicationNumber?: string; provider?: string; legalStatus?: string; registrationState: string; type: string; classes: string; status: string };
export const brandStateLabel = (brand: FilterableBrand) => brand.legalStatus ? statusLabel(brand.legalStatus) : brand.registrationState;
export const brandClassNumbers = (brand: FilterableBrand) => (brand.classes.match(/\d+/g) ?? []).map(Number);
const fold = (value: string) => value.trim().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Portfolio filtering is partial; the separate source-lookup flow stays exact. */
export function containsBrandMatch(brand: SearchableBrand, field: BrandSearchField, query: string): boolean {
  const search = fold(query);
  if (!search) return true;
  if (field === "any") return Object.keys(BRAND_SEARCH_FIELDS).some(key => key !== "any" && containsBrandMatch(brand, key as BrandSearchField, query));
  const value = brand[field];
  if (!value) return false;
  if (field === "rut") {
    const compact = search.replace(/[.\s-]/g, "");
    return Boolean(compact) && fold(value).replace(/[.\s-]/g, "").includes(compact);
  }
  return fold(value).includes(search);
}

export function matchesBrandFilters(brand: FilterableBrand, filters: BrandFilterValues, query = "", monitoring = "Todas") {
  if (monitoring !== "Todas" && brand.status !== monitoring) return false;
  if (filters.origin && filters.origin !== (brand.provider === "inapi" ? "real" : "mock")) return false;
  if (filters.state && brandStateLabel(brand) !== filters.state) return false;
  if (filters.type && brand.type !== filters.type) return false;
  if (filters.niceClass && !brandClassNumbers(brand).includes(Number(filters.niceClass))) return false;
  return containsBrandMatch({ ...brand, registrationState: brandStateLabel(brand) }, filters.searchField ?? "any", query);
}
