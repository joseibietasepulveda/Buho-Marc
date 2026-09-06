import test from "node:test";
import assert from "node:assert/strict";
import { sameOrigin } from "../lib/source-api.ts";

test("same-origin requests work behind Railway TLS without accepting foreign origins", () => {
  const prior = process.env.RAILWAY_PUBLIC_DOMAIN;
  process.env.RAILWAY_PUBLIC_DOMAIN = "dev.example.test";
  try {
    const request = origin => new Request("http://localhost:8080/api/monitoring/sync", { headers: origin ? { origin } : {} });
    assert.equal(sameOrigin(request("https://dev.example.test")), true);
    for (const origin of ["https://evil.test", "http://dev.example.test", "https://dev.example.test.evil.test", "null", "invalid", ""]) assert.equal(sameOrigin(request(origin)), false);
  } finally { if (prior === undefined) delete process.env.RAILWAY_PUBLIC_DOMAIN; else process.env.RAILWAY_PUBLIC_DOMAIN = prior; }
});
