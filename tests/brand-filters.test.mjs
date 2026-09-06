import test from "node:test";
import assert from "node:assert/strict";
import { matchesBrandFilters, EMPTY_BRAND_FILTERS, brandStateLabel } from "../lib/brand-filters.ts";
const brand = { name: "MÁREA SUR", owner: "Comercial Pacífico SpA", rut: "76.123.456-7", registration: "1509249", applicationNumber: "1552147", provider: "inapi", legalStatus: "registered", registrationState: "En trámite", type: "Mixta", classes: "03, 30, 35", status: "En monitoreo" };
test("origin, legal state, type, exact class and monitoring combine", () => {
  const filters = { origin: "real", state: "Registro concedido", type: "Mixta", niceClass: "3" };
  assert.equal(matchesBrandFilters(brand, filters, "", "En monitoreo"), true);
  for (const patch of [{ origin:"mock" }, { state:"En trámite" }, { type:"Denominativa" }, { niceClass:"5" }]) assert.equal(matchesBrandFilters(brand, {...filters,...patch}),false);
  assert.equal(matchesBrandFilters(brand, filters, "", "Sin monitoreo"),false);
  assert.equal(brandStateLabel(brand), "Registro concedido");
});
test("search ignores accents and matches request, register, owner and formatted RUT", () => {
  for (const query of ["marea", "pacifico", "1552147", "1509249", "76123456-7", "76.123.456-7", " marea   sur "]) assert.equal(matchesBrandFilters(brand, EMPTY_BRAND_FILTERS, query),true,query);
  assert.equal(matchesBrandFilters(brand, EMPTY_BRAND_FILTERS, "missing"),false);
});
test("legacy mocks remain filterable and clearing restores the full portfolio", () => {
  const portfolio=[brand,{...brand,name:"Mock",provider:undefined,status:"Sin monitoreo"}];
  assert.equal(portfolio.filter(b=>matchesBrandFilters(b,{...EMPTY_BRAND_FILTERS,origin:"mock"})).length,1);
  assert.equal(portfolio.filter(b=>matchesBrandFilters(b,EMPTY_BRAND_FILTERS)).length,2);
});
