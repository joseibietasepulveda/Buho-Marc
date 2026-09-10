import test from "node:test";
import assert from "node:assert/strict";
import { matchesBrandFilters, EMPTY_BRAND_FILTERS, brandStateLabel } from "../lib/brand-filters.ts";
import { exactBrandMatch } from "../lib/brand-search.ts";
const brand = { name: "MÁREA SUR", owner: "Comercial Pacífico SpA", rut: "76.123.456-7", registration: "1509249", applicationNumber: "1552147", provider: "inapi", legalStatus: "registered", registrationState: "En trámite", type: "Mixta", classes: "03, 30, 35", status: "En monitoreo" };
test("origin, legal state, type, exact class and monitoring combine", () => {
  const filters = { origin: "real", state: "Registro concedido", type: "Mixta", niceClass: "3" };
  assert.equal(matchesBrandFilters(brand, filters, "", "En monitoreo"), true);
  for (const patch of [{ origin:"mock" }, { state:"En trámite" }, { type:"Denominativa" }, { niceClass:"5" }]) assert.equal(matchesBrandFilters(brand, {...filters,...patch}),false);
  assert.equal(matchesBrandFilters(brand, filters, "", "Sin monitoreo"),false);
  assert.equal(brandStateLabel(brand), "Registro concedido");
});
test("portfolio contains search ignores accents and RUT formatting", () => {
  for (const query of ["marea sur", "Comercial Pacifico SpA", "1552147", "1509249", "76123456-7", "76.123.456-7", " marea   sur ", "marea", "pacifico", "1509", "7612345"]) assert.equal(matchesBrandFilters(brand, EMPTY_BRAND_FILTERS, query),true,query);
  for (const query of ["missing", "marea norte", "76123458"]) assert.equal(matchesBrandFilters(brand, EMPTY_BRAND_FILTERS, query), false, query);
});
test("contains search respects the selected attribute and the displayed legal state", () => {
  for (const [searchField, query] of [["name", "marea"], ["owner", "pacifico"], ["rut", "123.456"], ["registration", "1509"], ["applicationNumber", "5214"], ["classes", "35"], ["registrationState", "concedido"]]) {
    assert.equal(matchesBrandFilters(brand, { ...EMPTY_BRAND_FILTERS, searchField }, query), true, `${searchField}:${query}`);
  }
  assert.equal(matchesBrandFilters(brand, { ...EMPTY_BRAND_FILTERS, searchField: "name" }, "pacifico"), false);
  assert.equal(matchesBrandFilters(brand, { ...EMPTY_BRAND_FILTERS, searchField: "rut" }, "..."), false);
  assert.equal(matchesBrandFilters(brand, { ...EMPTY_BRAND_FILTERS, searchField: "registrationState" }, "En trámite"), false);
  assert.equal(exactBrandMatch(brand, "name", "marea"), false, "source lookup remains exact");
});
test("legacy mocks remain filterable and clearing restores the full portfolio", () => {
  const portfolio=[brand,{...brand,name:"Mock",provider:undefined,status:"Sin monitoreo"}];
  assert.equal(portfolio.filter(b=>matchesBrandFilters(b,{...EMPTY_BRAND_FILTERS,origin:"mock"})).length,1);
  assert.equal(portfolio.filter(b=>matchesBrandFilters(b,EMPTY_BRAND_FILTERS)).length,2);
});
test("contains works for optional descriptive, identifier and date attributes", () => {
  const complete = { ...brand, representativeName: "Estudio Ándes", ownerCountry: "CHILE", representativeCountry: "Argentina", country: "Chile", filingDate: "2026-08-24", publicationDate: "04/09/2026", expirationDate: "2036-09-04", id: "BM-123" };
  for (const [searchField, query] of [["representativeName", "andes"], ["ownerCountry", "chi"], ["representativeCountry", "gentina"], ["country", "CHIL"], ["type", "mixt"], ["filingDate", "2026-08"], ["publicationDate", "09/2026"], ["expirationDate", "2036"], ["id", "123"]]) {
    assert.equal(matchesBrandFilters(complete, { ...EMPTY_BRAND_FILTERS, searchField }, query), true, `${searchField}:${query}`);
  }
  assert.equal(matchesBrandFilters(brand, { ...EMPTY_BRAND_FILTERS, searchField: "representativeName" }, "andes"), false);
  assert.equal(matchesBrandFilters(complete, { ...EMPTY_BRAND_FILTERS, niceClass: "3" }, "30"), true);
  assert.equal(matchesBrandFilters({ ...complete, classes: "30, 35" }, { ...EMPTY_BRAND_FILTERS, niceClass: "3" }, "30"), false, "class filter remains exact");
});
