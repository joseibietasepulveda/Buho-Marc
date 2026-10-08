import { z } from 'zod';

export const reportProfileSchema = z.object({
  studioName: z.string().trim().max(180).default(''),
  address: z.string().trim().max(500).default(''),
  lawyerName: z.string().trim().max(160).default(''),
  headerText: z.string().trim().max(500).default(''),
  email: z.union([z.email().max(180), z.literal('')]).default(''),
  phone: z.string().trim().max(80).default(''),
  website: z.string().trim().max(300).refine(value => { if (!value) return true; try { return ['https:','http:'].includes(new URL(value).protocol); } catch { return false; } }, 'Escribe un enlace con https://').default(''),
  logo: z.string().max(1500000).regex(/^$|^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/).default(''),
}).strict();
export type ReportProfile = z.infer<typeof reportProfileSchema>;
export type SavedReportProfile = { profile: ReportProfile; version: number };
export const EMPTY_REPORT_PROFILE: ReportProfile = { studioName:'',address:'',lawyerName:'',headerText:'',email:'',phone:'',website:'',logo:'' };
export const reportProfileText = ({ studioName,address,lawyerName,headerText,email,phone,website }: ReportProfile) => ({ studioName,address,lawyerName,headerText,email,phone,website });
