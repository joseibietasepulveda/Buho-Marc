import { withSession } from "@/lib/auth";
import { organizationId, actorId, isDemoOrganization } from "@/lib/tenant-context";
import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { ensureDemoSeed } from "@/db/demo";
import { clientDataSchema, clientPatchSchema, demoClients } from "@/lib/client-directory";
import { sameOrigin, sourceError } from "@/lib/source-api";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureClients() {
  if (!isDemoOrganization()) return;
  await ensureDemoSeed();
  const sql = getSql();
  for (const { id, ...data } of demoClients) await sql`INSERT INTO client_contacts (organization_id, public_code, data) VALUES (${organizationId()}, ${id}, ${sql.json(data)}) ON CONFLICT (organization_id, public_code) DO NOTHING`;
}
async function handleGET() {
  try {
    await ensureClients();
    const rows = await getSql()`SELECT public_code, data, version, is_mock FROM client_contacts WHERE organization_id = ${organizationId()} ORDER BY public_code`;
    return NextResponse.json({ clients: rows.map(row => ({ ...row.data, id: row.public_code, version: row.version, mock: row.is_mock })) });
  } catch (error) { return sourceError(error); }
}
async function handlePATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Acceso no autorizado" }, { status: 403 });
  try {
    const input = clientPatchSchema.parse(await request.json());
    await ensureClients();
    const outcome = await getSql().begin(async tx => {
      const [row] = await tx`SELECT * FROM client_contacts WHERE organization_id = ${organizationId()} AND public_code = ${input.id} FOR UPDATE`;
      if (!row) return { status: 404, payload: { message: "Este cliente no existe" } };
      const current = { ...row.data, id: row.public_code, version: row.version, mock: row.is_mock };
      if (row.version !== input.version) return { status: 409, payload: { message: "Otro usuario actualizó este cliente. Revisa el valor actual y vuelve a guardar tu cambio.", client: current } };
      const data = clientDataSchema.parse({ ...row.data, [input.field]: input.value });
      if (data[input.field] === row.data[input.field]) return { status: 200, payload: { client: current } };
      await tx`UPDATE client_contacts SET data = ${tx.json(data)}, version = version + 1, updated_at = now() WHERE id = ${row.id}`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, before_data, after_data) VALUES (${organizationId()}, ${actorId()}, 'client_updated', 'client', ${row.id}, ${tx.json(row.data)}, ${tx.json(data)})`;
      return { status: 200, payload: { client: { ...data, id: row.public_code, version: row.version + 1, mock: row.is_mock } } };
    });
    return NextResponse.json(outcome.payload, { status: outcome.status });
  } catch (error) { return sourceError(error); }
}

export const GET = withSession(handleGET);
export const PATCH = withSession(handlePATCH);

const createSchema = z.object({ data: clientDataSchema, brandId: z.string().min(1).max(30).optional() }).strict();
const assignSchema = z.object({ brandId: z.string().min(1).max(30), clientId: z.string().regex(/^CL-\d+$/) }).strict();

export const POST = withSession(async request => {
  try {
    const input = createSchema.parse(await request.json());
    await ensureClients();
    const outcome = await getSql().begin(async tx => {
      // Serialize only client numbering for this organization.
      await tx`SELECT id FROM organizations WHERE id = ${organizationId()} FOR UPDATE`;
      const [brand] = input.brandId ? await tx`SELECT id, name, monitoring_config FROM brands WHERE organization_id = ${organizationId()} AND public_code = ${input.brandId} AND archived_at IS NULL FOR UPDATE` : [];
      if (input.brandId && !brand) return { status: 404, payload: { message: "No se encontró la marca en tu cartera." } };
      if (brand?.monitoring_config?.clientId) return { status: 409, payload: { message: "Esta marca ya tiene un cliente asignado. Actualiza la ficha para verlo." } };
      const [number] = await tx`SELECT COALESCE(max(substring(public_code from 4)::bigint), 0) + 1 AS next FROM client_contacts WHERE organization_id = ${organizationId()} AND public_code ~ '^CL-[0-9]+$'`;
      const code = `CL-${String(number.next).padStart(2, "0")}`;
      const [client] = await tx`INSERT INTO client_contacts (organization_id, public_code, data, is_mock) VALUES (${organizationId()}, ${code}, ${tx.json(input.data)}, false) RETURNING id, version`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, 'client.created', 'client', ${client.id}, ${tx.json(input.data)})`;
      if (brand) {
        await tx`UPDATE brands SET monitoring_config = monitoring_config || ${tx.json({ clientId: code })}::jsonb, updated_at = now() WHERE id = ${brand.id} AND organization_id = ${organizationId()}`;
        await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, 'brand.client_assigned', 'brand', ${brand.id}, ${tx.json({ clientId: code, clientName: input.data.name })})`;
      }
      return { status: 201, payload: { client: { ...input.data, id: code, version: client.version, mock: false } } };
    });
    return NextResponse.json(outcome.payload, { status: outcome.status });
  } catch (error) { return sourceError(error); }
});

export const PUT = withSession(async request => {
  try {
    const input = assignSchema.parse(await request.json());
    const outcome = await getSql().begin(async tx => {
      const [client] = await tx`SELECT id, data FROM client_contacts WHERE organization_id = ${organizationId()} AND public_code = ${input.clientId}`;
      const [brand] = await tx`SELECT id, monitoring_config FROM brands WHERE organization_id = ${organizationId()} AND public_code = ${input.brandId} AND archived_at IS NULL FOR UPDATE`;
      if (!client || !brand) return { status: 404, message: "No se encontró la marca o el cliente en tu espacio." };
      if (brand.monitoring_config?.clientId === input.clientId) return { status: 200, message: "Cliente asociado." };
      if (brand.monitoring_config?.clientId) return { status: 409, message: "Esta marca ya tiene un cliente asignado. Actualiza la ficha para verlo." };
      await tx`UPDATE brands SET monitoring_config = monitoring_config || ${tx.json({ clientId: input.clientId })}::jsonb, updated_at = now() WHERE id = ${brand.id} AND organization_id = ${organizationId()}`;
      await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${organizationId()}, ${actorId()}, 'brand.client_assigned', 'brand', ${brand.id}, ${tx.json({ clientId: input.clientId, clientName: client.data.name })})`;
      return { status: 200, message: "Cliente asociado." };
    });
    return NextResponse.json({ message: outcome.message }, { status: outcome.status });
  } catch (error) { return sourceError(error); }
});
