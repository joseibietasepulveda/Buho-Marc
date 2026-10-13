import type { ReportConclusion } from './feasibility-conclusion';

export function conclusionFailureMessage(conclusion:ReportConclusion|undefined,niceClass:number):string {
  const retained='Los hallazgos y las conclusiones de las otras clases se conservan.';
  if(conclusion?.reason==='not_configured')return `La generación con IA no está configurada en este ambiente. ${retained}`;
  if(conclusion?.reason==='input_too_large')return `Los antecedentes de clase ${niceClass} superan el tamaño admitido por la IA. ${retained}`;
  if(conclusion?.reason==='timeout')return `La IA agotó el tiempo para preparar la clase ${niceClass}. ${retained} Puedes reintentar esta clase.`;
  if(conclusion?.providerStatus===401||conclusion?.providerStatus===403)return `No se pudo autenticar el servicio de IA. ${retained}`;
  if(conclusion?.providerStatus===402)return `El servicio de IA alcanzó su límite de gasto o saldo disponible. ${retained}`;
  if(conclusion?.reason==='invalid_response')return `La respuesta de IA para la clase ${niceClass} no cumplió las validaciones del informe${conclusion.generationAttempts===2?' después de dos intentos':''}. ${retained} Puedes reintentar esta clase.`;
  return `IA - Buho Marc no pudo concluir el análisis de clase ${niceClass}. ${retained} Vuelve a intentarlo.`;
}
