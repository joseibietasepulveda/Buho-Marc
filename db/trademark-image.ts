import { getSql } from "./index";
import { dequienesImage } from "../lib/trademark-image";

export async function savedTrademarkImage(organizationId: string, applicationId: string) {
  const rows = await getSql()`SELECT r.data->'inapi'->>'image_url' AS image_url FROM source_records r
    JOIN source_snapshots s ON s.source_id = r.id
    WHERE s.organization_id = ${organizationId} AND r.application_number = ${applicationId}
    ORDER BY r.updated_at DESC LIMIT 1`;
  return dequienesImage(rows[0]?.image_url);
}
