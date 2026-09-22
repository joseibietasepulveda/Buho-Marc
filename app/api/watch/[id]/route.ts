import { applyVerifiedDecision } from "@/lib/verified-decisions";
import { NextResponse } from "next/server";
import { withSession } from "@/lib/auth";
import { organizationId } from "@/lib/tenant-context";
import { getSql } from "@/db";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withSession(async () => {
    const { id } = await context.params;
    const [row] = await getSql()`SELECT m.*, b.public_code AS brand_code, b.name AS brand_name, b.registration_number, b.monitoring_config, u.name AS owner_name FROM matches m JOIN brands b ON b.id = m.brand_id LEFT JOIN users u ON u.id = m.owner_id WHERE m.organization_id = ${organizationId()} AND m.public_code = ${id} AND m.source = 'DeQuiénEs'`;
    if (!row?.evidence?.hit) return NextResponse.json({ message: "Coincidencia no encontrada" }, { status: 404 });
    const hit = applyVerifiedDecision(row.evidence.hit), query = row.evidence.query, config = row.monitoring_config;
    return NextResponse.json({ id, brandId: row.brand_code, brand: row.brand_name, brandType: config.type || "Otra", brandApplication: config.applicationNumber, brandLogo: query.image || config.logo || "", brandClasses: query.classes.map((c: { nice_class: number }) => c.nice_class).join(", ") || "No informadas", found: hit.name, foundType: hit.type, foundLogo: hit.image, foundClasses: hit.classes.map((c: { nice_class: number }) => c.nice_class).join(", ") || "No informadas", applicant: hit.holders.map((h: { name: string }) => h.name).join("; "), application: hit.applicationId, score: hit.score, level: row.level, status: row.review_status === 'Detectada' ? 'Pendiente de clasificación' : row.review_status, date: hit.publishedAt || "Sin publicación informada", source: row.source, owner: row.owner_name || "Sin asignar", rut: config.rut || "No informado", applicantRut: hit.holders[0]?.rut || "No informado", officialUrl: "https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx", brandRegistration: row.registration_number || "No informado", officialRegistration: hit.registrationId || "No informado", evidence: { ...row.evidence, hit }, explanation: row.explanation });
  })(request);
}
