import type { SimilarityHit } from './similarity-contract';
import { registeredState, terminalState } from './watch-policy';
import { uncertainState } from './feasibility-policy';
import { addProcedureDays } from './registration-procedure';
import { nationalBusinessDay, calendarCovered } from './legal-calendar';
import { chileToday, displayWorkDate } from './work-priorities';

export function oppositionWindow(hit: Pick<SimilarityHit,'publishedAt'|'status'>, today = chileToday()) {
  if (terminalState(hit.status)) return { tone:'ended', label:'Solicitud terminada', detail:'Sin ventana de oposición abierta' };
  if (registeredState(hit.status)) return { tone:'ended', label:'Marca concedida', detail:'La etapa de oposición a la solicitud ya terminó' };
  if (!hit.publishedAt) return { tone:'pending', label:'Aún sin publicación informada', detail:'La ventana comienza con la publicación en Diario Oficial' };
  const deadline = addProcedureDays(hit.publishedAt,30);
  if (!deadline || uncertainState(hit.status)) return {tone:'pending', label:'Plazo por confirmar', detail:`Publicada el ${displayWorkDate(hit.publishedAt)}`};
  if (deadline < today) return {tone:'ended',label:'Plazo de oposición finalizado',detail:`Terminó el ${displayWorkDate(deadline)}`,deadline};
  if (!calendarCovered(today)) return {tone:'pending',label:'Plazo por confirmar',detail:`Fecha calculada: ${displayWorkDate(deadline)}`,deadline};
  let remaining = 0;
  const current = new Date(`${today}T12:00:00Z`);
  while (current.toISOString().slice(0,10) < deadline) { current.setUTCDate(current.getUTCDate()+1); if (nationalBusinessDay(current.toISOString().slice(0,10))) remaining++; }
  return {tone:remaining <= 5 ? 'soon':'open',label:deadline === today ? 'Hoy vence el plazo para oponerse' : `Quedan ${remaining} días hábiles para oponerse`, detail:`Hasta el ${displayWorkDate(deadline)} · calculado desde la publicación`, deadline};
}
