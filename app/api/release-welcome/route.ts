import { NextResponse } from "next/server";
import { z } from "zod";
import { withSession } from "@/lib/auth";
import { actorId, organizationId } from "@/lib/tenant-context";
import { getSql } from "@/db";
import { RELEASE_VERSION, RELEASE_NEWS, RELEASE_FUTURE } from "@/lib/release-welcome";
import { boundedJson } from "@/lib/bounded-json";

export const runtime = "nodejs";
export const GET = withSession(async () => {
  const [row] = await getSql()`SELECT news_accepted,future_accepted FROM release_acknowledgements
    WHERE organization_id=${organizationId()} AND user_id=${actorId()} AND version=${RELEASE_VERSION}`;
  return NextResponse.json({ version: RELEASE_VERSION, newsAccepted: row?.news_accepted ?? false, futureAccepted: row?.future_accepted ?? false });
});
const input = z.object({ version: z.literal(RELEASE_VERSION), stage: z.enum(["news", "future"]), readIds: z.array(z.string()).max(8) }).strict();
export const POST = withSession(async request => {
  let body: z.infer<typeof input>;
  try { body = input.parse(await boundedJson(request, 2048)); }
  catch { return NextResponse.json({message:"No se pudo confirmar la lectura."}, {status:400}); }
  const required = (body.stage === "news" ? RELEASE_NEWS : RELEASE_FUTURE).map(item=>item.id);
  if (body.readIds.length !== required.length || new Set(body.readIds).size !== required.length || required.some(id=>!body.readIds.includes(id))) {
    return NextResponse.json({message:"Marca todas las novedades como leídas para continuar."}, {status:422});
  }
  return getSql().begin(async tx => {
    await tx`INSERT INTO release_acknowledgements (organization_id,user_id,version) VALUES (${organizationId()},${actorId()},${RELEASE_VERSION}) ON CONFLICT DO NOTHING`;
    const [row] = await tx`SELECT news_accepted,future_accepted FROM release_acknowledgements WHERE organization_id=${organizationId()} AND user_id=${actorId()} AND version=${RELEASE_VERSION} FOR UPDATE`;
    if (body.stage === "future" && !row.news_accepted) return NextResponse.json({message:"Acepta primero las novedades disponibles."}, {status:409});
    const [saved] = body.stage === "news"
      ? await tx`UPDATE release_acknowledgements SET news_accepted=true,updated_at=now() WHERE organization_id=${organizationId()} AND user_id=${actorId()} AND version=${RELEASE_VERSION} RETURNING news_accepted,future_accepted`
      : await tx`UPDATE release_acknowledgements SET future_accepted=true,updated_at=now() WHERE organization_id=${organizationId()} AND user_id=${actorId()} AND version=${RELEASE_VERSION} RETURNING news_accepted,future_accepted`;
    return NextResponse.json({version:RELEASE_VERSION,newsAccepted:saved.news_accepted,futureAccepted:saved.future_accepted});
  });
});
