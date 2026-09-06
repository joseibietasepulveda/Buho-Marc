import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { ensureDemoSeed, DEMO_ORG_ID, DEMO_USER_ID } from "@/db/demo";
import { clientDataSchema, clientPatchSchema, demoClients } from "@/lib/client-directory";
import { sameOrigin, sourceError } from "@/lib/source-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureClients() {
  await ensureDemoSeed();
  const sql = getSql();
  for (const { id, ...data } of demoClients) await sql`INSERT INTO client_contacts (organization_id, public_code, data) VALUES (${DEMO_ORG_ID}, ${id}, ${sql.json(data)}) ON CONFLICT (organization_id, public_code) DO NOTHING`;
}
export async function GET() {
  try {
    await ensureClients();
    const rows = await getSql()`SELECT public_code, data, version, is_mock FROM client_contacts WHERE organization_id = ${DEMO_ORG_ID} ORDER BY public_code`;
    return NextResponse.json({ clients: rows.map(row => ({ ...row.data, id: row.public_code, version: row.version, mock: row.is_mock })) });
  } catch (error) { return sourceError(error); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 403 });
  try {
    const input = clientPatchSchema.parse(await request.json());
    await ensureClients();
    const outcome = await getSql().begin(async tx => {
      const [row] = await tx`SELECT * FROM client_contacts WHERE organization_id = ${DEMO_ORG_ID} AND public_code = ${input.id} FOR UPDATE`;
      if (!row) return { status: 404, payload: { message: "Este cliente no existe" } };
      const current = { ...row.data, id: row.public_code, version: row.version, mock: row.is_mock };
      if (row.version !== input.version) return { status: 409, payload: { message: "Otro usuario actualizó este cliente. Revisa el valor actual y vuelve a guardar tu cambio.", client: current } };
      const data = clientDataSchema.parse({ ...row.data, [input.field]: input.value });
      if (data[input.field] === row.data[input.field]) return { status: 200, payload: { client: current } };
      await tx`UPDATE client_contacts SET data = ${tx.json(data)}, version = version + 1, updated_at = now() WHERE id = ${row.id}`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, before_data, after_data) VALUES (${DEMO_ORG_ID}, ${DEMO_USER_ID}, 'client_updated', 'client', ${row.id}, ${tx.json(row.data)}, ${tx.json(data)})`;
      return { status: 200, payload: { client: { ...data, id: row.public_code, version: row.version + 1, mock: row.is_mock } } };
    });
    return NextResponse.json(outcome.payload, { status: outcome.status });
  } catch (error) { return sourceError(error); }
}
