import { z } from "zod";
export const proceedingInput = z.object({
  applicationNumber: z.string().regex(/^[1-9]\d{0,8}$/), opponent: z.string().trim().max(180).default(""), type: z.enum(["opposition", "nullity"]).default("opposition"), role: z.enum(["opponent", "respondent"]).default("opponent"),
  basisCode: z.string().max(30).optional(), filedAt: z.string().date().optional(),
  documentUrl: z.string().url().max(1500).refine(v => { const url = new URL(v); return url.protocol === "https:" && !url.username && !url.password; }).optional(),
  note: z.string().max(3000).optional(), confirm: z.boolean().default(false),
}).strict();
export type ProceedingInput = z.infer<typeof proceedingInput>;
