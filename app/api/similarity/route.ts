import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { withSession } from "@/lib/auth";
import { organizationId } from "@/lib/tenant-context";
import { getSql } from "@/db";
import { proposalSchema } from "@/lib/similarity-contract";
import { searchSimilar, SimilarityError } from "@/lib/similarity-provider";
export const runtime = "nodejs";
export const maxDuration = 180;
export const POST = withSession(async request => {
  const sql = getSql(), token = randomUUID();
  let locked = false;
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ message: "Faltan los datos de búsqueda." }, { status: 400 });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 9 * 1024 * 1024) { await reader.cancel(); throw new SimilarityError("La imagen debe pesar hasta 8 MiB.", 413); } chunks.push(value); }
    const body = new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") ?? "application/json" } });
    let data: unknown, image: File | undefined;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await body.formData();
      data = JSON.parse(String(form.get("query") ?? "{}"));
      const file = form.get("image");
      if (file instanceof File && file.size) image = file;
    } else data = await body.json();
    const input = proposalSchema.parse(data);
    if (!input.name && !image) return NextResponse.json({ message: "Escribe un nombre o agrega una imagen." }, { status: 400 });
    if (image) {
      if (image.size > 8 * 1024 * 1024) throw new SimilarityError("La imagen debe pesar hasta 8 MiB.", 413);
      if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) throw new SimilarityError("Usa una imagen JPEG, PNG o WebP.", 415);
      try { const metadata = await sharp(Buffer.from(await image.arrayBuffer()), { limitInputPixels: 20000000 }).metadata(); if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || !metadata.width || !metadata.height || metadata.width * metadata.height > 20000000) throw new Error(); }
      catch { throw new SimilarityError("La imagen no es válida o supera los 20 megapíxeles.", 422); }
    }
    const acquired = await sql`INSERT INTO similarity_search_locks (organization_id, token, expires_at) VALUES (${organizationId()}, ${token}, now() + interval '3 minutes') ON CONFLICT (organization_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at WHERE similarity_search_locks.expires_at < now() RETURNING token`;
    if (!acquired.length) throw new SimilarityError("Ya hay una búsqueda en curso en tu organización. Espera a que termine.", 429);
    locked = true;
    const result = await searchSimilar({ ...input, include: ["coverage", "label_description", "protection"] }, image);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof SimilarityError ? error.message : "Revisa los datos de búsqueda e inténtalo nuevamente." }, { status: error instanceof SimilarityError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500 });
  } finally { if (locked) await sql`DELETE FROM similarity_search_locks WHERE organization_id = ${organizationId()} AND token = ${token}`; }
});
