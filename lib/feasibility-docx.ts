import { AlignmentType, Document, Header, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx';
import type { FeasibilityReportInput } from './feasibility-report';
import { selectReportHits } from './report-selection';
import { filterFeasibility, uncertainState } from './feasibility-policy';
import { reportRecommendation } from './feasibility-recommendation';
import { applyVerifiedDecision } from './verified-decisions';

const date = (value: string) => new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'long' }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
const pngSize = (bytes: Uint8Array, maxWidth: number, maxHeight: number) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16), height = view.getUint32(20);
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

export async function createFeasibilityDocx(input: FeasibilityReportInput): Promise<Blob> {
  const { proposal, status } = input;
  const result = { ...input.result, results: input.result.results.map(applyVerifiedDecision) };
  const allHits = filterFeasibility(result.results, status);
  const hits = selectReportHits(allHits, input.selectedIds);
  const recommendation = reportRecommendation(result, input.recommendation, input.explanation, proposal.coverage.map(item => item.nice_class));
  const body: Paragraph[] = [];
  const paragraph = (value: string, options: { bold?: boolean; small?: boolean; after?: number; keepNext?: boolean } = {}) => new Paragraph({
    children: [new TextRun({ text: value, bold: options.bold, color: options.small ? '60666B' : '1F2933', size: options.small ? 19 : 22, font: 'Aptos' })],
    spacing: { after: options.after ?? 130, line: 310 }, keepNext: options.keepNext,
  });
  const heading = (value: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: value, bold: true, color: '000000', size: 27, font: 'Aptos' })], spacing: { before: 280, after: 130 }, keepNext: true });
  const picture = (bytes: Uint8Array, width: number, height: number) => new Paragraph({ children: [new ImageRun({ type: 'png', data: bytes, transformation: pngSize(bytes, width, height), altText: { name: 'Imagen de marca', title: 'Imagen de marca', description: 'Imagen de la marca examinada' } })], spacing: { after: 130 }, keepNext: false });

  body.push(new Paragraph({ style: 'Title', children: [new TextRun({ text: 'Informe de prefactibilidad de marca', bold: true, color: '000000', size: 34, font: 'Aptos' })], spacing: { after: 120 } }));
  body.push(paragraph(proposal.name.trim() || 'Marca sin nombre', { bold: true, after: 80 }));
  body.push(paragraph(date(result.fetchedAt), { small: true }));
  if (input.client?.trim()) body.push(paragraph(`Para: ${input.client.trim()}`, { small: true }));
  if (input.author?.trim()) body.push(paragraph(`Preparado por: ${input.author.trim()}`, { small: true }));

  body.push(heading('La marca que revisamos'));
  if (input.image) body.push(picture(input.image, 220, 150));
  body.push(paragraph(proposal.coverage.map(c => `${c.text.trim() || 'Productos o servicios por definir'} (clase ${c.nice_class})`).join('; ') || 'Los productos o servicios todavía no están definidos.'));

  body.push(heading('Marcas que conviene comparar'));
  body.push(paragraph(`La búsqueda devolvió ${result.results.length} resultados con los criterios elegidos. En este informe destacamos ${hits.length}.`));
  const { evidence } = recommendation;
  body.push(paragraph(`Entre las marcas registradas o en trámite: ${evidence.high} con similitud alta (65% a 100%) y ${evidence.medium} con similitud media (45% a 64%).${evidence.topScore == null ? '' : ` Índice mayor: ${Math.round(evidence.topScore * 100)}%.`}`, { bold: true }));
  body.push(paragraph('El índice expresa semejanza entre marcas; no es una probabilidad de rechazo.', { small: true }));
  if (hits.length) body.push(paragraph(input.selectedIds?.length ? 'Las marcas detalladas fueron seleccionadas para este informe. La recomendación considera toda la búsqueda.' : 'Marcas con mayor índice de similitud.', { small: true }));
  else body.push(paragraph('No hay resultados con este filtro. Conviene revisar también los demás estados.'));

  for (const [index, hit] of hits.entries()) {
    const shared = hit.classes.filter(c => proposal.coverage.some(p => p.nice_class === c.nice_class));
    const coverage = (shared.length ? shared : hit.classes).map(c => c.coverage_text || `Productos o servicios de la clase ${c.nice_class}`).join('; ');
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `${index + 1}. ${hit.name}`, bold: true, color: '000000', size: 24, font: 'Aptos' })], spacing: { before: 220, after: 90 }, keepNext: true }));
    body.push(paragraph(`Índice de similitud: ${Math.round(hit.score * 100)}%`, { bold: true, after: 65, keepNext: true }));
    body.push(paragraph(`${uncertainState(hit.status) ? 'Estado por confirmar' : hit.status} · Solicitud ${hit.applicationId}${hit.registrationId ? ` · Registro ${hit.registrationId}` : ''}`, { small: true, after: 65, keepNext: true }));
    body.push(paragraph(`Titular: ${hit.holders.map(h => h.name).join('; ') || 'No informado'}`, { small: true, after: 65, keepNext: true }));
    body.push(paragraph(`Clases ${hit.classes.map(c => c.nice_class).join(', ') || 'no informadas'} · ${coverage || 'Productos o servicios no informados'}`, { small: true }));
    if (hit.officialDecision) body.push(paragraph(`Decisión firme desde el ${date(hit.officialDecision.firmAt)}.`, { small: true }));
    else if (uncertainState(hit.status) || hit.dataWarnings?.length) body.push(paragraph('Hay datos de esta solicitud que debemos confirmar.', { small: true }));
    const bytes = input.resultImages?.[hit.applicationId];
    if (bytes) body.push(picture(bytes, 220, 145));
  }

  body.push(heading('Sobre esta revisión'));
  body.push(paragraph(`Fuente: datos de INAPI entregados por DeQuiénEs, consultados el ${date(result.fetchedAt)}. Se recuperaron hasta ${result.searchScope?.limit ?? 50} candidatos de la fuente.`, { small: true }));
  if (result.warnings.length || hits.some(h => h.dataWarnings?.length)) body.push(paragraph('Algunos datos de la fuente deben confirmarse antes de presentar.', { small: true }));
  if (input.includeAppendix) {
    body.push(heading('Anexo de resultados'));
    for (const hit of allHits) body.push(paragraph(`${hit.name} · Solicitud ${hit.applicationId} · ${Math.round(hit.score * 100)}% · ${hit.status}`, { small: true }));
  }
  body.push(heading('Recomendación final'));
  body.push(paragraph(recommendation.title, { bold: true, after: 80 }));
  body.push(paragraph(recommendation.explanation));

  const logo = input.studioLogo && new ImageRun({ type: 'png', data: input.studioLogo, transformation: pngSize(input.studioLogo, 150, 110), altText: { name: 'Logo del estudio', title: 'Logo del estudio', description: 'Estudio Jurídico' } });
  const doc = new Document({
    creator: input.author?.trim() || 'Estudio Jurídico', title: `Informe de prefactibilidad de marca ${proposal.name.trim()}`,
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1900, right: 1150, bottom: 1200, left: 1150, header: 450 } } },
      headers: logo ? { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [logo] })] }) } : undefined,
      children: body,
    }],
  });
  return Packer.toBlob(doc);
}
