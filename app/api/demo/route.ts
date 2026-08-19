import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_ORG_ID, DEMO_USER_ID, ensureDemoSeed, getDemoSnapshot, resetDemoData } from "@/db/demo";
import { getSql } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createBrand"), name: z.string().min(2).max(180), owner: z.string().min(2).max(180), registration: z.string().max(100).optional(), classes: z.string().min(1), country: z.string().min(2).max(100), description: z.string().max(3000).optional() }),
  z.object({ action: z.literal("createCase"), title: z.string().min(2).max(220), brand: z.string().min(2).max(180), client: z.string().min(2).max(180), priority: z.enum(["Alta", "Media", "Baja"]), deadline: z.string().min(2).max(40), owner: z.string().min(2).max(180), description: z.string().max(5000).optional() }),
  z.object({ action: z.literal("createUser"), name: z.string().min(2).max(180), email: z.string().email().max(255) }),
  z.object({ action: z.literal("reviewMatch"), id: z.string().min(1), status: z.enum(["Pendiente", "En observación", "Descartada", "Convertida en caso"]) }),
  z.object({ action: z.literal("moveCase"), id: z.string().min(1), stage: z.enum(["Evaluación", "Preparación", "Presentado", "Seguimiento"]) }),
  z.object({ action: z.literal("updateNotice"), id: z.string().min(1), subject: z.string().max(500).optional(), body: z.string().max(20000).optional(), status: z.enum(["Pendiente", "Gestionada"]).optional() }),
  z.object({ action: z.literal("reset") }),
]);

function deadlineToIso(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const months: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };
  const match = trimmed.toLowerCase().match(/^(\d{1,2})\s+([a-záéíóú]{3})/);
  if (!match || !months[match[2]]) return null;
  const month = months[match[2]];
  const year = month < 8 ? 2027 : 2026;
  return `${year}-${String(month).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

function nextCode(prefix: string, current: unknown, width: number) {
  return `${prefix}-${String(Number(current)).padStart(width, "0")}`;
}

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ mode: "local", message: "DATABASE_URL no está configurada" }, { status: 503 });
  try {
    await ensureDemoSeed();
    return NextResponse.json({ mode: "database", data: await getDemoSnapshot() });
  } catch (error) {
    console.error("Demo database read failed", error);
    return NextResponse.json({ mode: "error", message: "No fue posible leer la base de datos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ message: "DATABASE_URL no está configurada" }, { status: 503 });
  try {
    await ensureDemoSeed();
    const input = actionSchema.parse(await request.json());
    const sql = getSql();

    if (input.action === "reset") {
      await resetDemoData();
    } else if (input.action === "createBrand") {
      const classes = [...new Set(input.classes.split(/[,;\s]+/).map(Number).filter((item) => Number.isInteger(item) && item >= 1 && item <= 45))];
      if (!classes.length) return NextResponse.json({ message: "Ingresa al menos una clase de Niza entre 1 y 45" }, { status: 400 });
      await sql.begin(async (tx) => {
        const [counter] = await tx`SELECT COALESCE(MAX(NULLIF(regexp_replace(public_code, '\\D', '', 'g'), '')::int), 18) + 1 AS next FROM brands WHERE organization_id = ${DEMO_ORG_ID}`;
        const code = nextCode("BM", counter.next, 3);
        const [brand] = await tx`INSERT INTO brands (organization_id, public_code, name, word_mark, owner_name, registration_number, jurisdiction, description, status, created_by) VALUES (${DEMO_ORG_ID}, ${code}, ${input.name.toUpperCase()}, ${input.name.toUpperCase()}, ${input.owner}, ${input.registration || null}, ${input.country}, ${input.description || null}, 'Procesando', ${DEMO_USER_ID}) RETURNING id`;
        for (const niceClass of classes) await tx`INSERT INTO brand_classes (brand_id, nice_class) VALUES (${brand.id}, ${niceClass})`;
        await tx`INSERT INTO monitoring_jobs (organization_id, brand_id, status, idempotency_key, requested_by) VALUES (${DEMO_ORG_ID}, ${brand.id}, 'awaiting_engine', ${`brand:${brand.id}:initial`}, ${DEMO_USER_ID})`;
        await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${DEMO_ORG_ID}, ${DEMO_USER_ID}, 'brand.created', 'brand', ${brand.id}, ${tx.json({ code, engineStatus: "awaiting_engine" })})`;
      });
    } else if (input.action === "createCase") {
      const deadline = deadlineToIso(input.deadline);
      await sql.begin(async (tx) => {
        const [counter] = await tx`SELECT COALESCE(MAX(NULLIF(regexp_replace(public_code, '\\D', '', 'g'), '')::int), 1042) + 1 AS next FROM cases WHERE organization_id = ${DEMO_ORG_ID}`;
        const [brand] = await tx`SELECT id FROM brands WHERE organization_id = ${DEMO_ORG_ID} AND name = ${input.brand} LIMIT 1`;
        const [owner] = await tx`SELECT u.id FROM users u JOIN organization_members om ON om.user_id = u.id WHERE om.organization_id = ${DEMO_ORG_ID} AND u.name = ${input.owner} LIMIT 1`;
        const [created] = await tx`INSERT INTO cases (organization_id, public_code, brand_id, client_name, title, description, stage, priority, next_deadline, owner_id, created_by) VALUES (${DEMO_ORG_ID}, ${nextCode("BM", counter.next, 4)}, ${brand?.id ?? null}, ${input.client}, ${input.title}, ${input.description || null}, 'Evaluación', ${input.priority}, ${deadline}, ${owner?.id ?? DEMO_USER_ID}, ${DEMO_USER_ID}) RETURNING id`;
        await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${DEMO_ORG_ID}, ${DEMO_USER_ID}, 'case.created', 'case', ${created.id}, ${tx.json({ source: "manual" })})`;
      });
    } else if (input.action === "createUser") {
      await sql.begin(async (tx) => {
        const initials = input.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
        const [user] = await tx`INSERT INTO users (email, name, initials) VALUES (${input.email.toLowerCase()}, ${input.name}, ${initials}) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
        await tx`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${DEMO_ORG_ID}, ${user.id}, 'member') ON CONFLICT DO NOTHING`;
        await tx`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${DEMO_ORG_ID}, ${DEMO_USER_ID}, 'member.added', 'user', ${user.id}, ${tx.json({ email: input.email.toLowerCase() })})`;
      });
    } else if (input.action === "reviewMatch") {
      await sql.begin(async (tx) => {
        const [match] = await tx`SELECT m.*, b.name AS brand_name, b.owner_name FROM matches m JOIN brands b ON b.id = m.brand_id WHERE m.organization_id = ${DEMO_ORG_ID} AND m.public_code = ${input.id} LIMIT 1`;
        if (!match) throw new Error("Coincidencia no encontrada");
        await tx`UPDATE matches SET review_status = ${input.status}, updated_at = now() WHERE id = ${match.id}`;
        await tx`INSERT INTO match_reviews (organization_id, match_id, reviewer_id, decision, comparison_snapshot) VALUES (${DEMO_ORG_ID}, ${match.id}, ${DEMO_USER_ID}, ${input.status}, ${tx.json({ score: match.total_score, foundName: match.found_name, reviewedAt: new Date().toISOString() })})`;
        if (input.status === "Convertida en caso") {
          const [counter] = await tx`SELECT COALESCE(MAX(NULLIF(regexp_replace(public_code, '\\D', '', 'g'), '')::int), 1042) + 1 AS next FROM cases WHERE organization_id = ${DEMO_ORG_ID}`;
          const priority = match.level === "Alta" ? "Alta" : "Media";
          const [created] = await tx`INSERT INTO cases (organization_id, public_code, source_match_id, brand_id, client_name, title, stage, priority, next_deadline, owner_id, created_by) VALUES (${DEMO_ORG_ID}, ${nextCode("BM", counter.next, 4)}, ${match.id}, ${match.brand_id}, ${match.owner_name}, ${`Revisión ${match.found_name}`}, 'Evaluación', ${priority}, ${match.legal_deadline}, ${match.owner_id ?? DEMO_USER_ID}, ${DEMO_USER_ID}) ON CONFLICT (organization_id, source_match_id) DO UPDATE SET updated_at = now() RETURNING id`;
          await tx`UPDATE matches SET case_id = ${created.id} WHERE id = ${match.id}`;
        }
      });
    } else if (input.action === "moveCase") {
      const [item] = await sql`UPDATE cases SET stage = ${input.stage}, updated_at = now() WHERE organization_id = ${DEMO_ORG_ID} AND public_code = ${input.id} RETURNING id`;
      if (item) await sql`INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, after_data) VALUES (${DEMO_ORG_ID}, ${DEMO_USER_ID}, 'case.stage_changed', 'case', ${item.id}, ${sql.json({ stage: input.stage })})`;
    } else if (input.action === "updateNotice") {
      const [notice] = await sql`SELECT id FROM notifications WHERE organization_id = ${DEMO_ORG_ID} AND public_code = ${input.id} LIMIT 1`;
      if (!notice) throw new Error("Notificación no encontrada");
      if (input.subject !== undefined) await sql`UPDATE email_drafts SET subject = ${input.subject}, updated_at = now() WHERE notification_id = ${notice.id}`;
      if (input.body !== undefined) await sql`UPDATE email_drafts SET body = ${input.body}, updated_at = now() WHERE notification_id = ${notice.id}`;
      if (input.status !== undefined) {
        if (input.status === "Gestionada") await sql`UPDATE notifications SET managed_at = now(), updated_at = now() WHERE id = ${notice.id}`;
        else await sql`UPDATE notifications SET managed_at = NULL, updated_at = now() WHERE id = ${notice.id}`;
      }
    }

    return NextResponse.json({ mode: "database", data: await getDemoSnapshot() });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Los datos enviados no son válidos", issues: error.issues }, { status: 400 });
    console.error("Demo database mutation failed", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "No fue posible guardar el cambio" }, { status: 500 });
  }
}
