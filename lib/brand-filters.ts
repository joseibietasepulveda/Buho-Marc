import { exactBrandMatch, type BrandSearchField, type SearchableBrand } from "./brand-search";
import { statusLabel } from "./source-contract";

export type BrandFilterValues = { searchField?: BrandSearchField; origin: string; state: string; type: string; niceClass: string };
export const EMPTY_BRAND_FILTERS: BrandFilterValues = { origin: "", state: "", type: "", niceClass: "" };
type FilterableBrand = SearchableBrand & { name: string; owner: string; rut: string; registration: string; applicationNumber?: string; provider?: string; legalStatus?: string; registrationState: string; type: string; classes: string; status: string };
export const brandStateLabel = (brand: FilterableBrand) => brand.legalStatus ? statusLabel(brand.legalStatus) : brand.registrationState;
export const brandClassNumbers = (brand: FilterableBrand) => (brand.classes.match(/\d+/g) ?? []).map(Number);

export function matchesBrandFilters(brand: FilterableBrand, filters: BrandFilterValues, query = "", monitoring = "Todas") {
  if (monitoring !== "Todas" && brand.status !== monitoring) return false;
  if (filters.origin && filters.origin !== (brand.provider === "inapi" ? "real" : "mock")) return false;
  if (filters.state && brandStateLabel(brand) !== filters.state) return false;
  if (filters.type && brand.type !== filters.type) return false;
  if (filters.niceClass && !brandClassNumbers(brand).includes(Number(filters.niceClass))) return false;
  return exactBrandMatch(brand, filters.searchField ?? "any", query);
}
