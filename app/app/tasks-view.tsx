"use client";
import { useState } from "react";
import { TaskEditor } from "./case-tasks";
import { useRegistrationApplications, useRegistrationTasks } from "./registrations";
import { TASK_STATUS_LABELS, taskPriority, type CaseTask, type TaskMember } from "@/lib/case-tasks";
import { displayWorkDate } from "@/lib/work-priorities";

type TaskCase = { id: string; title: string; brand: string; stage: string; tasks?: CaseTask[] };
export function TasksView({ cases, users, currentUserId, onSaveCase, onDeleteCase, onCase, onApplication }: {
  cases: TaskCase[]; users: TaskMember[]; currentUserId?: string;
  onSaveCase: (id: string, task: CaseTask) => Promise<boolean>; onDeleteCase: (id: string, task: CaseTask) => Promise<boolean>;
  onCase: (id: string) => void; onApplication: (id: string) => void;
}) {
  const [applications, , load] = useRegistrationApplications();
  const { tasks, save } = useRegistrationTasks();
  const [status, setStatus] = useState("pending"), [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ target: string; task?: CaseTask } | null>(null);
  const targets = [...cases.map(item => ({ id: `case:${item.id}`, label: `${item.title} · ${item.brand}` })), ...applications.map(item => ({ id: `application:${item.id}`, label: `${item.name} · Solicitud ${item.applicationNumber}` }))];
  const rows = [...cases.flatMap(item => (item.tasks ?? []).map(task => ({ task, target: `case:${item.id}`, label: item.title, context: item.brand, open: () => onCase(item.id) }))), ...tasks.flatMap(task => { const item = applications.find(app => app.id === task.applicationId); return item ? [{ task, target: `application:${item.id}`, label: item.name, context: `Solicitud ${item.applicationNumber}`, open: () => onApplication(item.id) }] : []; })];
  const visible = rows.filter(row => (status === "all" || row.task.status === status) && `${row.task.title} ${row.label} ${row.context}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")))
    .sort((a, b) => (a.task.dueDate || "9999").localeCompare(b.task.dueDate || "9999") || a.task.title.localeCompare(b.task.title, "es"));
  async function persist(target: string, task: CaseTask, remove = false) {
    const [kind, id] = target.split(":");
    return kind === "case" ? (remove ? onDeleteCase(id, task) : onSaveCase(id, task)) : save(id, task, remove);
  }
  return <section className="tasks-view"><div className="tasks-toolbar"><div><strong>{rows.filter(row => row.task.status === "pending").length} tareas pendientes</strong><p>Organiza las gestiones de tus casos y solicitudes.</p></div><button type="button" className="buho-primary" disabled={!targets.length} onClick={() => setEditing({ target: "" })}>Nueva tarea +</button></div>
    <div className="tasks-filters"><label>Buscar tarea<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tarea, caso o marca" /></label><label>Estado<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todas las tareas</option>{Object.entries(TASK_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    {load.loading && <p role="status">Cargando tareas de solicitudes…</p>}{load.error && <p role="alert">{load.error}</p>}
    <div className="tasks-list">{visible.map(row => <article key={`${row.target}:${row.task.id}`}><button type="button" className="task-list-main" onClick={() => setEditing({ target: row.target, task: row.task })}><strong>{row.task.title}</strong><span>{displayWorkDate(row.task.dueDate ?? undefined)} · {users.find(user => user.id === row.task.assigneeId)?.name ?? "Sin responsable"}</span></button><button type="button" className="task-list-context" onClick={row.open}>{row.label}<small>{row.context} ↗</small></button><span className={`task-priority-${taskPriority(row.task).toLowerCase()}`}>{taskPriority(row.task)}</span><span>{TASK_STATUS_LABELS[row.task.status]}</span></article>)}</div>
    {!visible.length && <div className="tasks-empty"><h3>{query ? "No encontramos tareas con esa búsqueda" : "No hay tareas en este estado"}</h3><p>{targets.length ? "Puedes crear una tarea y vincularla a un caso o solicitud." : "Incorpora un caso o una solicitud para crear tu primera tarea."}</p></div>}
    {editing && <TaskEditor task={editing.task} defaultTarget={editing.target} targets={targets} members={users} currentUserId={currentUserId} onSave={persist} onDelete={(id, task) => persist(id, task, true)} onClose={() => setEditing(null)} />}
  </section>;
}
