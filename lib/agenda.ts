import type { CaseTask, RegistrationTask } from "./case-tasks";
import type { RegistrationApplication } from "./registration-data";
import { registrationDeadlines } from "./registration-procedure";
import { chileToday, parseWorkDate, workDeadline } from "./work-priorities";

export const AGENDA_CATEGORIES = { task: "Tareas", inapi: "Plazos INAPI", gazette: "Plazos Diario Oficial" } as const;
export type AgendaCategory = keyof typeof AGENDA_CATEGORIES;
export type AgendaEvent = {
  id: string; entityId: string; entityType: "case" | "application"; taskId?: string;
  title: string; context: string; date: string | null; category: AgendaCategory;
  assigneeId?: string | null; owner?: string; fatal?: boolean; detail?: string;
};
type AgendaCase = { id: string; title: string; brand: string; stage: string; deadline: string; deadlineDescription: string; owner: string; tasks?: CaseTask[] };

// Category describes the institution responsible for the action, not the macrophase.
// Opposition is filed at INAPI even though publication activates its time limit.
export function caseDeadlineCategory(description: string): AgendaCategory {
  return /publicaci[oó]n/i.test(description) && /requerir|pagar|publicar/i.test(description) && !/oposici[oó]n/i.test(description) ? "gazette" : "inapi";
}
export function caseAgenda(cases: AgendaCase[]): AgendaEvent[] {
  return cases.filter(item => item.stage !== "Concluido").flatMap(item => [
    ...(parseWorkDate(item.deadline) ? [{ id: `case:${item.id}`, entityId: item.id, entityType: "case" as const, title: item.deadlineDescription || "Revisar plazo del caso", context: `${item.title} · ${item.brand}`, date: parseWorkDate(item.deadline), category: caseDeadlineCategory(item.deadlineDescription), owner: item.owner, fatal: Boolean(item.deadlineDescription && !/no informad|por confirmar|revisar plazo/i.test(item.deadlineDescription)) }] : []),
    ...(item.tasks ?? []).filter(task => task.status === "pending").map(task => ({ id: `task:${task.id}`, entityId: item.id, entityType: "case" as const, taskId: task.id, title: task.title, context: `${item.title} · ${item.brand}`, date: parseWorkDate(task.dueDate ?? undefined), category: "task" as const, assigneeId: task.assigneeId })),
  ]);
}
export function registrationAgenda(applications: RegistrationApplication[], tasks: RegistrationTask[], today?: string): AgendaEvent[] {
  return applications.flatMap(application => [
    ...registrationDeadlines(application, today).filter(deadline => deadline.dueDate).map(deadline => ({
      id: `application:${application.id}:${deadline.key}`, entityId: application.id, entityType: "application" as const,
      title: deadline.label, context: `${application.name} · Solicitud ${application.applicationNumber}`, date: deadline.dueDate!,
      category: deadline.key === "accepted-publication" ? "gazette" as const : "inapi" as const,
      fatal: true, detail: `${deadline.trigger}${deadline.sourceDate ? ` · ${deadline.sourceDate}` : ""}. ${deadline.explanation}`,
    })),
    ...tasks.filter(task => task.applicationId === application.id && task.status === "pending").map(task => ({ id: `task:${task.id}`, entityId: application.id, entityType: "application" as const, taskId: task.id, title: task.title, context: `${application.name} · Solicitud ${application.applicationNumber}`, date: parseWorkDate(task.dueDate ?? undefined), category: "task" as const, assigneeId: task.assigneeId })),
  ]);
}
export function urgentAgenda(events: AgendaEvent[], today = chileToday()) {
  return events.filter(event => event.date && ["soon", "overdue"].includes(workDeadline(event.date, false, today).tone))
    .sort((a, b) => a.date!.localeCompare(b.date!) || Number(Boolean(b.fatal)) - Number(Boolean(a.fatal)));
}
