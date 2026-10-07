export const runtime = "nodejs";
import { sessionIdentity, requestToken } from "@/lib/auth";
import { savedTrademarkImage } from "@/db/trademark-image";
import { dequienesImage } from "@/lib/trademark-image";
import { loadTrademarkImage, trademarkImageResponse } from "@/lib/trademark-image-server";

// Compatibility URL for saved portfolios. INAPI is now only the fallback.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await sessionIdentity(requestToken(request));
  if (!identity || identity.mustChangePassword) return new Response(null, { status: 401 });
  const { id } = await params;
  const source = new URL(request.url).searchParams.get("source");
  if (!/^\d{1,9}$/.test(id) || (source && !dequienesImage(source))) return new Response(null, { status: 400 });
  const logo = await loadTrademarkImage({ applicationId: id, sourceUrl: source ?? undefined, scope: identity.organizationId,
    savedSource: () => savedTrademarkImage(identity.organizationId, id),
  });
  return trademarkImageResponse(logo);
}
