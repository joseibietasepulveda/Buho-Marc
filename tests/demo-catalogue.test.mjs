import assert from "node:assert/strict";
import test from "node:test";
import { expandedDemoBrands, demoBrandDetails } from "../lib/demo-brand-catalogue.ts";

test("the catalogue supplies unique brands and 50 new word-only marks", () => {
  assert.equal(expandedDemoBrands.length, 80);
  assert.equal(new Set(expandedDemoBrands.map((brand) => brand.id)).size, 80);
  assert.equal(new Set(expandedDemoBrands.map((brand) => brand.name)).size, 80);
  assert.equal(expandedDemoBrands.filter((brand) => brand.type === "Denominativa").length, 50);
  // An existing 30-brand portfolio receives 70 records, including all 50 without logos.
  const additions = expandedDemoBrands.slice(0, 100 - 30);
  assert.equal(additions.length, 70);
  assert.equal(additions.filter((brand) => brand.type === "Denominativa").length, 50);
  for (const brand of additions) assert.match(brand.rut, /^\d{2}\.\d{3}\.\d{3}-[0-9K]$/);
});

test("brand details have stable INAPI-style dates and representative fields", () => {
  const details = demoBrandDetails("BM-7000");
  assert.deepEqual(details, demoBrandDetails("BM-7000"));
  assert.match(details.applicationNumber, /^\d+$/);
  for (const date of [details.filingDate, details.publicationDate, details.expirationDate]) assert.match(date, /^\d{2}\/\d{2}\/\d{4}$/);
  for (const key of ["ownerCountry", "representativeName", "representativeCountry"]) assert.ok(details[key]);
});
