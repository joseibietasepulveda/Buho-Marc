import { z } from "zod";
import { parseWorkDate } from "./work-priorities";

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  status: z.enum(["not-applicable", "pending", "completed"]),
  priority: z.enum(["Alta", "Media", "Baja"]).default("Media"),
  dueDate: z.string().refine(value => parseWorkDate(value) === value, "Fecha inválida").nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});
