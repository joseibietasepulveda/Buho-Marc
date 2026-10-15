import type {RegistrationApplication} from './registration-data';
import {registrationDeadlines} from './registration-procedure';
import {chileToday,parseWorkDate} from './work-priorities';

const waits:Partial<Record<RegistrationApplication['statusId'],string>>={
 'inapi-waiting':'Se espera el examen de forma de INAPI.',
 'publication-pending':'Falta la publicación efectiva en el Diario Oficial.',
 'opposition-filed':'Falta la resolución de traslado de la oposición.',
 'opposition-answered':'Se espera la siguiente resolución del juicio de oposición.',
 'decision-pending':'Se espera el fallo de INAPI.',
 'decision-review':'Falta confirmar el resultado y alcance de la resolución.',
 'finality-pending':'Falta la ejecutoria que permite calcular el pago.',
 'substantive-exam':'Se espera el resultado del examen de fondo de INAPI.',
 'payment-verification':'Se espera la concesión del registro después del pago.',
 'appeal-pending':'Se espera la resolución del recurso ante el tribunal.',
};
export function nextManualReviewDay(day:string):string {
 const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);
}
export function registrationFollowUp(a:RegistrationApplication,today=chileToday()):string|undefined {
 if(a.provider!=='inapi')return;
 if(a.manualPayment?.state==='pending')return 'Se espera que INAPI refleje el pago informado por el equipo. La confirmación oficial sigue pendiente.';
 const deadlines=registrationDeadlines(a,today);
 const pending=deadlines.filter(d=>d.attention==='pending'&&d.kind!=='milestone');
 const active=deadlines.some(d=>d.kind==='legal'&&d.dueDate&&d.fatal&&['normal','soon','overdue'].includes(d.attention));
 if(pending.length)return pending.map(d=>d.explanation).join(' ');
 if(active)return;
 if(waits[a.statusId])return waits[a.statusId];
 if(a.statusId==='opposition-window'&&deadlines.some(d=>d.key==='opposition-window'&&d.dueDate&&d.dueDate<today))return 'Terminó la ventana de oposición; se espera la siguiente actuación de INAPI.';
 if(deadlines.some(d=>d.kind==='legal'&&d.attention==='none'&&/respuesta presentada|esperando publicaci[oó]n|pago acreditado/i.test(d.label)))return 'La gestión ya fue presentada; se espera el pronunciamiento o registro de INAPI.';
}
export function manualReviewAvailability(a:RegistrationApplication,today=chileToday()) {
 const review=a.officialReview;
 const day=parseWorkDate(review?.day);
 const checkedToday=Boolean(day&&day>=today);
 return {enabled:review?.enabled===true,canConsult:review?.enabled===true&&!checkedToday,nextAllowedDay:checkedToday?nextManualReviewDay(day!):today,checkedToday};
}
