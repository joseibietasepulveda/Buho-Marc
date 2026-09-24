import { automaticMonitoringEnabled } from "@/db/monitoring-policy";
import { withSession } from "@/lib/auth";
import { organizationId } from "@/lib/tenant-context";
import { NextResponse } from "next/server";
import { getSql } from "@/db";

import { nextSourceReview } from "@/lib/source-schedule";
import { sourceError } from "@/lib/source-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleGET() {
  try {
    const sql = getSql();
    // Manual/scheduled runs are full portfolio reviews. Initial imports and
    // enrollment lookups must never masquerade as a portfolio refresh. Keep
    // request IDs, event payloads and error internals out of this polling route.
    const [latest, lastSuccess] = await Promise.all([
      sql`SELECT id, trigger, status, started_at, completed_at, requested, received
        FROM source_sync_runs WHERE organization_id = ${organizationId()}
        AND trigger IN ('manual', 'scheduled')
        AND (error IS NULL OR error NOT LIKE 'Corrida invalidada durante verificación:%')
        ORDER BY started_at DESC LIMIT 1`,
      sql`SELECT id, trigger, status, started_at, completed_at, requested, received
        FROM source_sync_runs WHERE organization_id = ${organizationId()}
        AND trigger IN ('manual', 'scheduled') AND status = 'success'
        AND completed_at IS NOT NULL AND requested > 0 AND received >= requested
        ORDER BY completed_at DESC LIMIT 1`,
    ]);
    const now = new Date();
    const automaticEnabled = await automaticMonitoringEnabled();
    return NextResponse.json({ checkedAt: now.toISOString(), automaticEnabled, latest: latest[0] ?? null, lastSuccess: lastSuccess[0] ?? null, nextScheduledAt: nextSourceReview(now, automaticEnabled) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return sourceError(error); }
}

export const GET = withSession(handleGET);
