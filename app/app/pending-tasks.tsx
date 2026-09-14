"use client";

import { useState } from "react";
import { taskPriority, type CaseTask, type TaskMember } from "@/lib/case-tasks";
import { displayWorkDate } from "@/lib/work-priorities";

export function PendingTasks({ cases, users, onCase }: {
  cases: { id: string; title: string; brand: string; stage: string; tasks?: CaseTask[] }[];
  users: TaskMember[]; onCase: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const rows = cases.filter(item => item.stage !== "Concluido").flatMap(item => (item.tasks ?? []).filter(task => task.status === "pending").map(task => ({ item, task })))
    .sort((a, b) => (a.task.dueDate || "9999").localeCompare(b.task.dueDate || "9999") || a.task.title.localeCompare(b.task.title, "es"));
  const pages = Math.max(1, Math.ceil(rows.length / 3));
  const current = Math.min(page, pages - 1);
  return <section className="buho-panel pending-tasks" aria-label="Tareas pendientes de los casos">
    <div className="pending-tasks-scroll"><table><thead><tr><th scope="col">Tareas pendientes</th><th scope="col">Caso</th><th scope="col">Fecha</th></tr></thead>
      <tbody>{rows.slice(current * 3, current * 3 + 3).map(({ item, task }) => <tr key={`${item.id}:${task.id}`}>
        <td><button type="button" onClick={() => onCase(item.id)}><strong>{task.title}</strong><small>Prioridad {taskPriority(task).toLowerCase()} · {users.find(user => user.id === task.assigneeId)?.name ?? "Sin responsable"}</small></button></td>
        <td><button type="button" onClick={() => onCase(item.id)}>{item.title}<small>{item.brand}</small></button></td>
        <td><time dateTime={task.dueDate || undefined}>{displayWorkDate(task.dueDate ?? undefined)}</time></td>
      </tr>)}</tbody></table></div>
    {rows.length ? <nav className="pending-tasks-pagination" aria-label="Páginas de tareas pendientes"><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>← Anterior</button><span role="status">Página {current + 1} de {pages} · {rows.length} tareas</span><button type="button" disabled={current === pages - 1} onClick={() => setPage(current + 1)}>Siguiente →</button></nav> : <p>No hay tareas pendientes. Puedes agregarlas desde cada caso.</p>}
  </section>;
}
