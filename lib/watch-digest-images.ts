import sharp from "sharp";
import { loadTrademarkImage } from "./trademark-image-server";
import { dequienesImage, safeTrademarkImage } from "./trademark-image";
import { digestHash, type DigestImage } from "./watch-digest";
import type { SimilarityMark } from "./similarity-contract";

export async function digestMarkImage(mark: SimilarityMark, scope: string, fetcher: typeof fetch = fetch): Promise<DigestImage | null> {
  if (/denominativa/i.test(mark.type)) return null;
  const safe = safeTrademarkImage(mark.image);
  const sourceUrl = safe.startsWith("/") ? dequienesImage(new URL(safe, "https://buho.invalid").searchParams.get("source")) : dequienesImage(safe);
  if (!sourceUrl) return null;
  // Only fetch the saved trusted image. This job never queries INAPI, DeQuiénEs
  // dossiers, or arbitrary customer URLs to fill a missing image.
  const image = await loadTrademarkImage({ sourceUrl, scope }, fetcher);
  if (!image) return null;
  const bytes = await sharp(image.body).flatten({ background: "#ffffff" }).resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const content = bytes.toString("base64");
  return { key: digestHash(content), content };
}
