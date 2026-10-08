import { sessionIdentity, requestToken } from "@/lib/auth";
import { savedTrademarkImage } from "@/db/trademark-image";
import { dequienesImage } from "@/lib/trademark-image";
import { loadTrademarkImage, trademarkImageResponse } from "@/lib/trademark-image-server";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const identity = await sessionIdentity(requestToken(request));
  if (!identity || identity.mustChangePassword) return new Response(null, { status: 401 });
  const params = new URL(request.url).searchParams;
  const source = dequienesImage(params.get("url"));
  const id = params.get("applicationId") ?? undefined;
  if (!source || (id && !/^\d{1,9}$/.test(id))) return new Response(null, { status: 400 });
  return trademarkImageResponse(await loadTrademarkImage({ sourceUrl: source, applicationId: id, scope: identity.organizationId,
    savedSource: id ? () => savedTrademarkImage(identity.organizationId, id) : undefined,
  }));
}
