"use client";
import { useState, useEffect, useRef } from "react";
import { caseTasks, TASK_STATUS_LABELS, type CaseTask, type CaseTaskStatus } from "@/lib/case-tasks";

export function CaseTasks({ tasks, onSave }: { tasks?: CaseTask[]; onSave: (task: CaseTask) => Promise<boolean> }) {
  const input = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<CaseTaskStatus>("not-applicable");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (adding) input.current?.focus(); }, [adding]);
  async function save(task: CaseTask) {
    setSaving(true); setError("");
    try { const ok = await onSave({ ...task, id: task.id.startsWith("suggested-") ? crypto.randomUUID() : task.id }); if (!ok) setError("No se pudo guardar la tarea. Inténtalo nuevamente."); return ok; }
    finally { setSaving(false); }
  }
  const options = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>);
  return <section className="buho-case-section case-tasks"><header><h3>Tareas</h3><button type="button" onClick={() => setAdding(true)} disabled={adding || saving}>Agregar tarea</button></header>
    {caseTasks(tasks).map(task => <label className="case-task-row" key={task.id}><span>{task.title}</span><select aria-label={`Estado de tarea: ${task.title}`} disabled={saving} value={task.status} onChange={event => void save({ ...task, status: event.target.value as CaseTaskStatus })}>{options}</select></label>)}
    {adding && <form className="case-task-form" onSubmit={async event => { event.preventDefault(); if (saving || !title.trim()) return; if (caseTasks(tasks).some(task => task.title.toLowerCase() === title.trim().toLowerCase())) { setError("Esta tarea ya existe. Cambia su estado en la lista."); return; } if (await save({ id: crypto.randomUUID(), title: title.trim(), status })) { setTitle(""); setStatus("not-applicable"); setAdding(false); } }}><label>Nueva tarea<input ref={input} aria-label="Nueva tarea" required maxLength={255} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej. Preparar contestación de oposición" /></label><label>Estado<select value={status} onChange={event => setStatus(event.target.value as CaseTaskStatus)}>{options}</select></label><div><button disabled={saving || !title.trim()} type="submit">{saving ? "Guardando…" : "Guardar tarea"}</button><button disabled={saving} type="button" onClick={() => { setAdding(false); setError(""); }}>Cancelar</button></div></form>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
