import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { selectReportHits } from "./report-selection";
import type { SimilarityResult } from './similarity-contract';
import { FEASIBILITY_STATUS_LABELS, filterFeasibility, uncertainState, type FeasibilityStatus } from './feasibility-policy';
import { reportRecommendation, type ReportRecommendation } from './feasibility-recommendation';
import { applyVerifiedDecision } from './verified-decisions';

export type FeasibilityReportInput = {
  result: SimilarityResult; status: FeasibilityStatus;
  proposal: { name: string; coverage: { nice_class: number; text: string }[]; grouped: boolean };
  image?: Uint8Array; imageType?: 'png' | 'jpeg'; studioLogo?: Uint8Array;
  client?: string; author?: string; recommendation?: ReportRecommendation;
  explanation?: string; includeAppendix?: boolean; selectedIds?: string[]; resultImages?: Record<string,Uint8Array>;
};
const date = (value: string) => new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'long' }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
const excerpt = (value: string, limit = 230, sentenceCase = false) => {
  const plain = value.replace(/\s+/g, ' ').trim();
  const clean = sentenceCase && plain === plain.toLocaleUpperCase('es') ? plain.charAt(0) + plain.slice(1).toLocaleLowerCase('es') : plain;
  return clean.length > limit ? `${clean.slice(0, limit).replace(/\s+\S*$/, '')}…` : clean;
};

// A local report of the completed search. No LLM, extra search or upload.
export async function createFeasibilityReport(input: FeasibilityReportInput): Promise<Uint8Array> {
  const { proposal, status } = input;
  const result = { ...input.result, results: input.result.results.map(applyVerifiedDecision) };
  const allHits = filterFeasibility(result.results, status);
  const hits = selectReportHits(allHits,input.selectedIds);
  const recommendation = reportRecommendation(result, input.recommendation, input.explanation);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Informe de prefactibilidad - ${proposal.name || 'Marca sin nombre'}`);
  pdf.setAuthor(input.author?.trim() || 'Estudio Jurídico'); pdf.setLanguage('es-CL');
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.12,.16,.20), muted = rgb(.40,.43,.46), gold = rgb(.54,.47,.32), line = rgb(.85,.85,.83);
  const logo = input.studioLogo ? await pdf.embedPng(input.studioLogo) : undefined;
  let page = pdf.addPage([595.28,841.89]), y = 774, replacedGlyph = false;
  function safe(value: string) {
    return Array.from(value.normalize('NFC').replace(/[\u2010-\u2015]/g, '-').replace(/[\t\r\n]+/g, ' ')).map(c => {
      try { regular.encodeText(c); return c; } catch { replacedGlyph = true; return '?'; }
    }).join('');
  }
  function newPage() {
    page = pdf.addPage([595.28,841.89]); y = 750;
    page.drawText('ESTUDIO DE MARCA', { x:52, y:789, size:8, font:bold, color:muted });
    page.drawLine({ start:{x:52,y:775}, end:{x:543,y:775}, thickness:.5, color:line });
  }
  function ensure(height: number) { if (y - height < 72) newPage(); }
  function lines(value: string, font: PDFFont, size: number, width: number) {
    const rows: string[] = []; let current = '';
    for (const word of safe(value).split(/\s+/)) {
      if (font.widthOfTextAtSize(`${current} ${word}`.trim(), size) <= width) { current = `${current} ${word}`.trim(); continue; }
      if (current) { rows.push(current); current = ''; }
      for (const c of word) { if (font.widthOfTextAtSize(current + c,size) > width) { rows.push(current); current=''; } current += c; }
    }
    if (current) rows.push(current);
    return rows;
  }
  function text(value: string, size = 10.5, strong = false, color = ink, width = 491, gap = 6) {
    const font = strong ? bold : regular;
    for (const row of lines(value,font,size,width)) { ensure(size*1.5); page.drawText(row,{x:52,y,size,font,color}); y -= size*1.5; }
    y -= gap;
  }
  function heading(value: string) { ensure(64); y -= 12; text(value,14,true); }
  function rule() { ensure(24); page.drawLine({ start:{x:52,y},end:{x:543,y},thickness:.6,color:line }); y -= 20; }
  const name = proposal.name.trim() || 'Marca sin nombre';
  // Place the supplied asset intact, using its own white margins for spacing.
  if (logo) page.drawImage(logo,{x:365,y:650,...logo.scaleToFit(190,190)});
  text('INFORME DE PREFACTIBILIDAD',10,true,gold,295);
  y -= 8; text(name,25,true,ink,295);
  text(date(result.fetchedAt),10,false,muted,295);
  if (input.client?.trim()) text(`Para: ${input.client.trim()}`,10,false,muted,295);
  if (input.author?.trim()) text(`Preparado por: ${input.author.trim()}`,10,false,muted,295);
  y = Math.min(y - 14, 650); rule();

  heading('La marca que revisamos');
  if (input.image) {
    const image = input.imageType === 'jpeg' ? await pdf.embedJpg(input.image) : await pdf.embedPng(input.image);
    const dimensions = image.scaleToFit(160,140);
    const description = proposal.coverage.map(c => `${c.text.trim() || 'Productos o servicios por definir.'} (Clase ${c.nice_class})`).join(' ')
      || 'Los productos o servicios todavía no están definidos.';
    const rows = lines(excerpt(description,450),regular,10.5,305);
    const height = Math.max(140,rows.length*15.75+20); ensure(height+16);
    const start = y;
    page.drawImage(image,{x:383+(160-dimensions.width)/2,y:start-height+16+(height-16-dimensions.height)/2,...dimensions});
    text(excerpt(description,450),10.5,false,ink,305);
    y = Math.min(y,start-height); y -= 8;
  } else {
    text(proposal.coverage.map(c=>`${c.text.trim() || 'Productos o servicios por definir.'} (Clase ${c.nice_class})`).join(' ') || 'Los productos o servicios todavía no están definidos.');
  }
  heading('Marcas que conviene comparar');
  text(`La búsqueda devolvió ${result.results.length} resultados con los criterios elegidos. En este informe destacamos ${hits.length}.`,10,false,muted);
  if (hits.length) text(input.selectedIds?.length ? "Marcas seleccionadas por quien preparó el informe." : "Seleccionadas por su mayor índice de similitud.",9,false,muted);
  else text('No hay resultados con este filtro. Esto no indica que la marca esté disponible: conviene revisar también los demás estados.',11);
  for (const [index,hit] of hits.entries()) {
    const shared = hit.classes.filter(c=>proposal.coverage.some(p=>p.nice_class === c.nice_class));
    const coverage = (shared.length ? shared : hit.classes).map(c=>c.coverage_text || `Productos o servicios de la clase ${c.nice_class}`).join('; ');
    const nameText = `${index+1}. ${hit.name.length > 120 ? hit.name.slice(0,117)+'…' : hit.name}`;
    const state = uncertainState(hit.status) ? 'Estado por confirmar' : hit.status;
    const details = [
      `${state} · Solicitud ${hit.applicationId}${hit.registrationId ? ` · Registro ${hit.registrationId}` : ''}`,
      `Titular: ${excerpt(hit.holders.map(h=>h.name).join('; ') || 'No informado',140)}`,
      `Clases ${hit.classes.map(c=>c.nice_class).join(", ") || "no informadas"} · ${excerpt(coverage || "Productos o servicios no informados",155,true)}`,
    ];
    if (hit.officialDecision) details.push(`Decisión firme desde el ${date(hit.officialDecision.firmAt)}. Respaldo oficial en los antecedentes adjuntos.`);
    else if (uncertainState(hit.status) || hit.dataWarnings?.length) details.push('Hay datos de esta solicitud que debemos confirmar.');
    const height = Math.max(112,30+lines(nameText,bold,12,380).length*18+details.reduce((sum,s)=>sum+lines(s,regular,9,380).length*13.5+3,0));
    ensure(height); rule();
    const top=y;
    const bytes=input.resultImages?.[hit.applicationId];
    let embedded;
    if(bytes) try {embedded=await pdf.embedPng(bytes);}catch {/* The source can supply an unreadable image; label it explicitly. */}
    page.drawRectangle({x:441,y:top-83,width:102,height:83,color:rgb(.98,.98,.975),borderColor:line,borderWidth:.5});
    if(embedded){const size=embedded.scaleToFit(92,73);page.drawImage(embedded,{x:446+(92-size.width)/2,y:top-78+(73-size.height)/2,...size});}
    else page.drawText('Sin imagen',{x:459,y:top-46,size:9,font:regular,color:muted});
    text(nameText,12,true,ink,375,4);
    details.forEach((detail,i)=>text(detail,9,false,i===0 ? ink : muted,375,3));
    y=Math.min(y,top-92);
  }

  heading('Sobre esta revisión');
  text(`Fuente: datos de INAPI entregados por DeQuiénEs, consultados el ${date(result.fetchedAt)}. Se recuperaron hasta ${result.searchScope?.limit ?? 50} candidatos de la fuente, no toda la base de marcas.`,9,false,muted);
  if (result.warnings.length || hits.some(h=>h.dataWarnings?.length)) text('La fuente contiene algunos datos incompletos o inconsistentes. Los puntos relevantes deben confirmarse antes de presentar.',9,false,muted);
  text('INAPI decide sobre el registro. Los antecedentes de las marcas incluidas están adjuntos a este PDF como respaldo.',9,false,muted);
  if (replacedGlyph) text('Algunos caracteres se muestran como ?. El respaldo adjunto conserva su escritura original.',9,false,muted);
  if (input.includeAppendix) {
    newPage(); text('Anexo · Resultados completos',20,true);
    text(`Filtro: ${FEASIBILITY_STATUS_LABELS[status]}`,10,false,muted);
    for (const hit of allHits) {
      ensure(74); rule(); text(`${hit.name} · Solicitud ${hit.applicationId}`,11,true);
      text(`${uncertainState(hit.status) ? 'Estado por confirmar' : hit.status}${hit.registrationId ? ` · Registro ${hit.registrationId}` : ''}`,10,false,muted);
      text(`Titular: ${hit.holders.map(h=>h.name).join('; ') || 'No informado'}`,10);
      for (const c of hit.classes) text(`Clase ${c.nice_class}: ${c.coverage_text || 'Productos o servicios no informados.'}`,9);
    }
  }
  ensure(150); rule(); text('RECOMENDACIÓN FINAL',9,true,gold);
  text(recommendation.title,20,true);
  text(recommendation.explanation,11);
  await pdf.attach(new TextEncoder().encode(JSON.stringify({version:3,proposal,filter:status,selectedIds:hits.map(hit=>hit.applicationId),recommendation,result:{...result,results:input.includeAppendix ? allHits : hits,groups:[]}},null,2)), 'antecedentes-consulta.json', {mimeType:'application/json',description:'Antecedentes de las marcas incluidas, fuentes y alcance del informe'});
  const pages = pdf.getPages();
  pages.forEach((p,i)=>{
    p.drawLine({start:{x:52,y:48},end:{x:543,y:48},color:line,thickness:.5});
    p.drawText('INFORME DE PREFACTIBILIDAD',{x:52,y:32,size:8,font:regular,color:muted});
    p.drawText(`${i+1} / ${pages.length}`,{x:515,y:32,size:8,font:regular,color:muted});
  });
  return pdf.save();
}
