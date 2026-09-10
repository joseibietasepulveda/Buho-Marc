"use client";
import { useState } from "react";
import { caseTasks, TASK_STATUS_LABELS, type CaseTask, type CaseTaskStatus, type TaskMember } from "@/lib/case-tasks";
import { displayWorkDate } from "@/lib/work-priorities";
import { ReviewDialog } from "./review-dialog";

export function TaskEditor({ task, members, currentUserId, targets, defaultTarget, defaultDate, onSave, onDelete, onClose }: {
  task?: CaseTask; members: TaskMember[]; currentUserId?: string; targets: { id: string; label: string }[];
  defaultTarget?: string; defaultDate?: string; onSave: (targetId: string, task: CaseTask) => Promise<boolean>;
  onDelete?: (targetId: string, task: CaseTask) => Promise<boolean>; onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [date, setDate] = useState(task?.dueDate ?? defaultDate ?? "");
  const [assignee, setAssignee] = useState(task ? task.assigneeId ?? "" : currentUserId ?? "");
  const [status, setStatus] = useState<CaseTaskStatus>(task?.status ?? "pending");
  const [targetId, setTargetId] = useState(defaultTarget ?? (targets.length === 1 ? targets[0].id : ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saved = task && !task.id.startsWith("suggested-");
  async function perform(remove = false) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const ok = remove && task && onDelete ? await onDelete(targetId, task) : await onSave(targetId, { id: saved ? task.id : crypto.randomUUID(), title: title.trim(), status, dueDate: date || null, assigneeId: assignee || null });
      if (ok) onClose(); else setError("No se pudo guardar. Tus datos siguen aquí para reintentar.");
    } catch { setError("No se pudo guardar. Tus datos siguen aquí para reintentar."); }
    finally { setBusy(false); }
  }
  return <ReviewDialog title={task ? "Editar tarea" : "Nueva tarea"} onClose={() => { if (!busy) onClose(); }} className="task-editor-dialog">
    <form className="task-editor" onSubmit={event => { event.preventDefault(); void perform(); }}>
      <p>Define qué hay que tener listo y quién se encargará. La fecha de la tarea es interna; no modifica el plazo legal.</p>
      <label>Vincular a<select aria-label="Vincular tarea a" required disabled={Boolean(task)} value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Selecciona un caso o solicitud</option>{targets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label>
      <label>¿Qué hay que hacer?<input required maxLength={255} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej. Tener listo el escrito de oposición" /></label>
      <div className="task-editor-grid"><label>Para cuándo<input type="date" aria-label="Para cuándo" value={date} onInput={event => setDate(event.currentTarget.value)} onChange={event => setDate(event.target.value)} /><small>{date ? "Aparecerá en el calendario de ese día." : "Sin fecha: aparecerá en la lista de tareas."}</small></label><label>Responsable<select aria-label="Responsable de la tarea" value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Sin asignar</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}{member.id === currentUserId ? " (yo)" : ""}</option>)}</select>{currentUserId && <button type="button" onClick={() => setAssignee(currentUserId)}>Asignármela</button>}</label></div>
      <label>Estado<select value={status} onChange={event => setStatus(event.target.value as CaseTaskStatus)}>{Object.entries(TASK_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {error && <p role="alert" className="task-error">{error}</p>}
      {confirmDelete && <p role="alert">¿Eliminar esta tarea? El plazo legal y el expediente se conservarán. <button type="button" disabled={busy} onClick={() => void perform(true)}>Sí, eliminar tarea</button> <button type="button" onClick={() => setConfirmDelete(false)}>Conservar</button></p>}
      <footer>{saved && onDelete && <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>Eliminar tarea</button>}<button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="buho-primary" type="submit" disabled={busy || !title.trim() || !targetId}>{busy ? "Guardando…" : "Guardar tarea"}</button></footer>
    </form>
  </ReviewDialog>;
}

export function CaseTasks({ tasks, onSave, onDelete, members = [], currentUserId, label = "Este caso", suggestions = true }: {
  tasks?: CaseTask[]; onSave: (task: CaseTask) => Promise<boolean>; onDelete?: (task: CaseTask) => Promise<boolean>;
  members?: TaskMember[]; currentUserId?: string; label?: string; suggestions?: boolean;
}) {
  const [editing, setEditing] = useState<CaseTask | "new" | null>(null);
  const entries = suggestions ? caseTasks(tasks) : tasks ?? [];
  return <section className="buho-case-section case-tasks"><header><div><h3>Tareas del equipo</h3><small>{entries.filter(task => task.status === "pending").length} pendientes</small></div><button type="button" onClick={() => setEditing("new")}>Agregar tarea +</button></header>
    {entries.map(task => <button type="button" className={`task-row task-${task.status}`} key={task.id} onClick={() => setEditing(task)}><span><strong>{task.title}</strong><small>{displayWorkDate(task.dueDate ?? undefined)} · {members.find(member => member.id === task.assigneeId)?.name ?? "Sin responsable"}</small></span><span>{TASK_STATUS_LABELS[task.status]}</span><b>Editar →</b></button>)}
    {!entries.length && <p>Agrega una tarea, asígnala y define para cuándo debe estar lista.</p>}
    {editing && <TaskEditor task={editing === "new" ? undefined : editing} members={members} currentUserId={currentUserId} targets={[{ id: "current", label }]} defaultTarget="current" onSave={(_, task) => onSave(task)} onDelete={onDelete ? (_, task) => onDelete(task) : undefined} onClose={() => setEditing(null)} />}
  </section>;
}
