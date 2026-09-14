export type CaseTaskStatus = "not-applicable" | "pending" | "completed";
export type TaskPriority = "Alta" | "Media" | "Baja";
export type CaseTask = { id: string; title: string; status: CaseTaskStatus; priority?: TaskPriority; dueDate?: string | null; assigneeId?: string | null };
export const taskPriority = (task: CaseTask): TaskPriority => task.priority ?? "Media";
export function hasPendingTaskPriority(tasks: CaseTask[] = [], priority: string) {
  return !priority || tasks.some(task => task.status === "pending" && taskPriority(task) === priority);
}
export type TaskMember = { id: string; name: string };
export type RegistrationTask = CaseTask & { applicationId: string };
export const TASK_STATUS_LABELS: Record<CaseTaskStatus, string> = { "not-applicable": "No aplica", pending: "Pendiente", completed: "Completado" };
const suggestions = ["Revisar antecedentes de la publicación", "Confirmar instrucciones con el cliente", "Analizar causales de oposición", "Preparar escrito de oposición", "Recopilar antecedentes probatorios"];
export function caseTasks(tasks: CaseTask[] = []): CaseTask[] {
  return [...tasks, ...suggestions.filter(title => !tasks.some(task => task.title === title)).map((title, index) => ({ id: `suggested-${index}`, title, status: "not-applicable" as const }))];
}
