import { createHash } from "node:crypto";
import { getSql } from "../db/index";
import { currentIdentity, organizationId } from "./tenant-context";
import { santiagoDay } from "./source-schedule";

// Called inside withSession: validators never bypass authentication or tenant checks.
// The revision is read before assembling the payload. A concurrent write forces
// the next request to refresh rather than tagging old data with a newer revision.
export async function conditionalSnapshot(request: Request, scope: string, render: () => Promise<Response>, variant = "") {
  const [row] = await getSql()`SELECT revision FROM snapshot_revisions WHERE organization_id = ${organizationId()} AND scope = ${scope}`;
  const tag = '"' + createHash("sha256").update(JSON.stringify([
    "cost-control-v1", process.env.RAILWAY_GIT_COMMIT_SHA, currentIdentity(), scope, variant,
    new URL(request.url).search, String(row?.revision ?? 0), santiagoDay(new Date()),
    process.env.MONITORING_SCHEDULER_ENABLED, process.env.SOURCE_PROVIDER,
  ])).digest("hex") + '"';
  if (request.headers.get("if-none-match") === tag) return new Response(null, { status: 304, headers: { ETag: tag, "Cache-Control": "private, no-store" } });
  const response = await render();
  if (response.ok) response.headers.set("ETag", tag);
  return response;
}
