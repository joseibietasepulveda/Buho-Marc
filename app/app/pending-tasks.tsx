"use client";

import { Clock } from "@phosphor-icons/react";
import { useState } from "react";
import { taskPriority, type CaseTask, type TaskMember } from "@/lib/case-tasks";
import { displayWorkDate } from "@/lib/work-priorities";

export function PendingTasks({ cases, users, onCase, compact = false, onAgenda, onAllTasks }: {
  cases: { id: string; title: string; brand: string; stage: string; tasks?: CaseTask[] }[];
  compact?: boolean; onAgenda?: () => void; onAllTasks?: () => void; users: TaskMember[]; onCase: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const rows = cases.filter(item => item.stage !== "Concluido").flatMap(item => (item.tasks ?? []).filter(task => task.status === "pending").map(task => ({ item, task })))
    .sort((a, b) => (a.task.dueDate || "9999").localeCompare(b.task.dueDate || "9999") || a.task.title.localeCompare(b.task.title, "es"));
  const pageSize = compact ? 2 : 3;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  if (compact) return <section className="pending-tasks-compact" aria-label="Tareas pendientes de los casos"><div className="pending-compact-header"><strong><Clock size={18} aria-hidden/> {rows.length} tareas pendientes</strong><button type="button" onClick={onAgenda}>Ver agenda →</button></div>{rows.slice(current*pageSize,current*pageSize+pageSize).map(({item,task}) => <button type="button" key={`${item.id}:${task.id}`} className="pending-task-compact" onClick={() => onCase(item.id)}><span><strong>{task.title} · {item.brand}</strong><small>{task.dueDate ? displayWorkDate(task.dueDate) : 'Sin fecha'} · {users.find(u => u.id === task.assigneeId)?.name ?? 'Sin responsable'}</small></span><b className={`task-priority-${taskPriority(task).toLowerCase()}`}>{taskPriority(task)}</b></button>)}{!rows.length && <p>No tienes tareas pendientes.</p>}<div className="pending-compact-footer">{pages > 1 && <><button type="button" disabled={current === 0} onClick={() => setPage(current-1)}>←</button><span>{current+1}/{pages}</span><button type="button" disabled={current === pages-1} onClick={() => setPage(current+1)}>→</button></>}<button type="button" onClick={onAllTasks ?? onAgenda}>Ver todas las tareas ({rows.length}) →</button></div></section>;
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
