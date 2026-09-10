import { z } from "zod";
import { parseWorkDate } from "./work-priorities";

const date = z.string().refine(value => parseWorkDate(value) === value, "Indica una fecha válida (AAAA-MM-DD)");
const sourceUrl = z.union([z.literal(""), z.string().url().max(2000).refine(value => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
}, "Usa un enlace público HTTP o HTTPS sin credenciales")]).optional();
export const registrationEvidenceRequest = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"), applicationId: z.string().min(1).max(100),
    kind: z.enum(["notification", "finality", "ready-to-resolve", "certificate-payment"]),
    method: z.enum(["daily-state", "inapi-inbox", "personal", "official-document"]),
    date, reference: z.string().trim().min(10, "Describe el documento que acredita esta fecha").max(2000), sourceUrl,
    actId: z.string().max(200), actDate: date, actDescription: z.string().min(1).max(4000),
    confirmed: z.literal(true, { error: "Debes confirmar que revisaste el antecedente" }),
  }).strict(),
  z.object({ action: z.literal("revoke"), applicationId: z.string().min(1).max(100), evidenceId: z.string().uuid() }).strict(),
]);
