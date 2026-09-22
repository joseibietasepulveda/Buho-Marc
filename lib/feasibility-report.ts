import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { SimilarityResult } from './similarity-contract';
import { channelNames } from './similarity-contract';
import { FEASIBILITY_STATUS_LABELS, filterFeasibility, uncertainState, type FeasibilityStatus } from './feasibility-policy';
import { applyVerifiedDecision } from './verified-decisions';

export type FeasibilityReportInput = {
  result: SimilarityResult; status: FeasibilityStatus;
  proposal: { name: string; coverage: { nice_class: number; text: string }[]; grouped: boolean };
  image?: Uint8Array; imageType?: 'png' | 'jpeg'; client?: string; author?: string;
};
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'medium' }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : 'No informada';
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9]/g, '');

// A local, deterministic report of the completed search. No LLM, extra search or upload.
export async function createFeasibilityReport(input: FeasibilityReportInput): Promise<Uint8Array> {
  const { proposal, status } = input;
  const result = { ...input.result, results: input.result.results.map(applyVerifiedDecision) };
  const hits = filterFeasibility(result.results, status);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Informe preliminar de prefactibilidad - ${proposal.name || 'Marca figurativa'}`);
  pdf.setAuthor(input.author || 'Buho Marc'); pdf.setLanguage('es-CL');
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.14,.1,.18), muted = rgb(.43,.39,.47), accent = rgb(.43,.25,.57), light = rgb(.96,.94,.98);
  let page = pdf.addPage([595.28,841.89]), y = 774;
  let replacedGlyph = false;
  function safe(value: string) {
    return Array.from(value.normalize('NFC').replace(/[\u2010-\u2015]/g, '-').replace(/[\t\r\n]+/g, ' ')).map(c => {
      try { regular.encodeText(c); return c; } catch { replacedGlyph = true; return '?'; }
    }).join('');
  }
  function newPage() { page = pdf.addPage([595.28,841.89]); y = 774; }
  function ensure(height: number) { if (y - height < 68) newPage(); }
  function lines(value: string, font: PDFFont, size: number, width: number) {
    const rows: string[] = []; let current = '';
    for (const word of safe(value).split(/\s+/)) {
      if (font.widthOfTextAtSize(`${current} ${word}`.trim(), size) <= width) { current = `${current} ${word}`.trim(); continue; }
      if (current) { rows.push(current); current = ''; }
      for (const c of word) { if (font.widthOfTextAtSize(current + c,size) > width) {rows.push(current);current='';} current += c; }
    }
    if (current) rows.push(current);
    return rows;
  }
  function text(value: string, size = 10, strong = false, color = ink, width = 491) {
    const font = strong ? bold : regular, rows = lines(value,font,size,width);
    for (const row of rows) { ensure(size*1.5); page.drawText(row,{x:52,y,size,font,color}); y -= size*1.5; }
    y -= 6;
  }
  function heading(value: string) { ensure(64); y -= 12; text(value,15,true,accent); }
  function rule() { ensure(22); page.drawLine({ start:{x:52,y},end:{x:543,y},thickness:.6,color:rgb(.86,.82,.89) }); y -= 18; }
  const name = proposal.name.trim() || 'Marca figurativa sin denominación';
  text('BUHO MARC  /  ESTUDIO PRELIMINAR',10,true,accent); y-=8;
  text('Informe de prefactibilidad',27,true);
  text(name,20,true,accent);
  text(`Consulta: ${date(result.fetchedAt)}  |  Mercado: Chile`,10,false,muted);
  if (input.client?.trim()) text(`Preparado para: ${input.client.trim()}`,10);
  if (input.author?.trim()) text(`Preparado por: ${input.author.trim()}`,10);
  if (input.image) {
    const image = input.imageType === 'jpeg' ? await pdf.embedJpg(input.image) : await pdf.embedPng(input.image);
    const dimensions = image.scaleToFit(240,170); ensure(190);
    page.drawRectangle({x:52,y:y-180,width:491,height:180,color:light});
    page.drawImage(image,{x:52+(491-dimensions.width)/2,y:y-175+(170-dimensions.height)/2,...dimensions}); y-=198;
    text('Imagen propuesta aportada para la búsqueda. No acredita titularidad.',9,false,muted);
  }
  heading('Lectura preliminar');
  const exact = hits.filter(h => fold(h.name) === fold(proposal.name) && fold(proposal.name));
  const sameClass = hits.filter(h => h.classes.some(c => proposal.coverage.some(p => p.nice_class === c.nice_class)));
  text(hits.length ? `La búsqueda recuperó ${result.results.length} solicitudes. Con el filtro elegido se incluyen ${hits.length} antecedentes para revisión profesional.` : `El filtro elegido no deja antecedentes visibles entre las ${result.results.length} solicitudes recuperadas. Esto no demuestra que la marca esté disponible.`,11);
  text(`${exact.length} denominaciones coincidentes al normalizar espacios y acentos. ${proposal.coverage.length ? `${sameClass.length} antecedentes comparten al menos una clase propuesta.` : 'No se especificaron clases: no se evaluó su coincidencia.'}`,10);
  text('Resultado orientativo: requiere revisión jurídica. La semejanza, una coincidencia de clase o la ausencia de resultados no determinan por sí solas la registrabilidad.',11,true);
  newPage(); heading('01  Alcance de la revisión');
  text(`Denominación consultada: ${name}`);
  text(`Estados incluidos: ${FEASIBILITY_STATUS_LABELS[status]}. ${result.results.length-hits.length} resultados quedan fuera por este filtro.`);
  text(`Fuente: INAPI a través de DeQuiénEs. Consulta completada: ${new Date(result.fetchedAt).toLocaleString('es-CL',{timeZone:'America/Santiago'})} (hora de Chile).`);
  text('La búsqueda recupera hasta 50 solicitudes: es una selección de semejanzas, no una búsqueda exhaustiva de todos los derechos existentes. El filtro de estado se aplica después de obtener esos resultados.');
  text(`Presentación en pantalla: ${proposal.grouped ? 'agrupada por titular' : 'solicitudes individuales'}. El informe enumera cada solicitud por separado para no ocultar antecedentes.`);
  heading('Productos y servicios propuestos');
  if (!proposal.coverage.length) text('Sin clases ni cobertura definidas. Precisar los productos o servicios antes de formular una recomendación.');
  for (const c of proposal.coverage) text(`Clase ${c.nice_class}: ${c.text.trim() || 'Sin descripción específica de productos o servicios.'}`);
  heading('02  Cómo interpretar los resultados');
  text('Los índices ordenan semejanzas según las señales del buscador. No son porcentajes de éxito ni de riesgo jurídico. Este informe no interpreta automáticamente prohibiciones de registro, notoriedad, coexistencia, conexidad de coberturas ni el alcance de un fallo.');
  text('Los estados son los informados por la fuente al consultar. VER INSTANCIA y estados desconocidos se señalan como por verificar, no como solicitudes necesariamente pendientes. Las correcciones verificadas se identifican con su respaldo oficial.');
  text('Antes de presentar o descartar una solicitud, el abogado debe verificar vigencia, titularidad, cobertura específica y actuaciones recientes en el expediente oficial. El estado diario de INAPI no debe confundirse con la publicación de la solicitud en el Diario Oficial.');
  if (result.warnings.length) { heading('Advertencias de la fuente'); for (const warning of result.warnings) text(warning,9); }
  newPage(); heading('03  Antecedentes destacados');
  text(`Se detallan los primeros ${Math.min(5,hits.length)} antecedentes del filtro seleccionado, respetando el orden del buscador. El listado posterior incluye los ${hits.length} resultados de este informe.`,10,false,muted);
  if (!hits.length) text('Sin antecedentes bajo el filtro elegido. Amplía a todos los estados y revisa el alcance de la búsqueda.');
  for (const [index,hit] of hits.slice(0,5).entries()) {
    ensure(120); rule(); text(`${index+1}. ${hit.name}`,14,true);
    text(`Solicitud ${hit.applicationId} | ${uncertainState(hit.status) ? 'Estado por verificar en INAPI' : hit.status} | Índice ${hit.score.toFixed(3)}`,10,true,accent);
    text(`Titular: ${hit.holders.map(h=>h.name).join('; ') || 'No informado'}`);
    text(`Publicación DO: ${date(hit.publishedAt)} | Registro: ${hit.registrationId || 'No informado'}`,9,false,muted);
    text(`Señales de recuperación: ${Object.keys(hit.channels).map(key=>channelNames[key] || 'Otra señal').join(', ') || 'No detalladas por la fuente'}.`,9);
    if (!hit.classes.length) text('Clases y coberturas no informadas.',9);
    for (const c of hit.classes) text(`Clase ${c.nice_class}: ${c.coverage_text || 'Cobertura no informada'}`,9);
    if (hit.officialDecision) { text(`Decisión firme desde ${date(hit.officialDecision.firmAt)}. Estado original de la fuente: ${hit.officialDecision.sourceStatus}.`,9,true); for (const source of hit.officialDecision.sources) {text(`${source.title} - ${date(source.date)}, Estado Diario INAPI, página ${source.page}.`,9);text(source.url,7,false,muted);} }
    if (uncertainState(hit.status)) text(`La fuente informa «${hit.status}». Verificar el desenlace y los recursos en INAPI.`,9,true);
    for (const warning of hit.dataWarnings ?? []) text(`Antecedente por verificar: ${warning}`,9,false,accent);
  }
  newPage(); heading('04  Listado de antecedentes incluidos');
  text('Número de orden / marca / solicitud / estado / clases / índice de semejanza',9,false,muted);
  for (const [index,hit] of hits.entries()) {
    ensure(72); text(`${index+1}. ${hit.name} - Solicitud ${hit.applicationId}`,10,true);
    text(`${uncertainState(hit.status) ? 'Por verificar en INAPI' : hit.status} | Clases ${hit.classes.map(c=>c.nice_class).join(', ') || 'no informadas'} | Índice ${hit.score.toFixed(3)}`,9,false,muted);
    if (hit.dataWarnings?.length || hit.officialDecision) text(hit.officialDecision ? 'Estado corregido con evidencia oficial; ver antecedentes adjuntos.' : 'Antecedentes incompletos o inconsistentes: revisar ficha.',8,false,accent);
  }
  heading('Siguientes pasos');
  text('1. Confirmar denominación, imagen y cobertura que efectivamente se solicitarán.');
  text('2. Comparar los antecedentes relevantes en conjunto: nombre, elementos gráficos, productos o servicios y estado del expediente.');
  text('3. Verificar los casos dudosos en INAPI y obtener una conclusión del abogado antes de decidir la presentación.');
  text('Consulta oficial: https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx',9,false,accent);
  text('Documento generado con reglas y datos de la consulta, sin un modelo de lenguaje. No es un dictamen jurídico ni garantiza la concesión del registro.',9,false,muted);
  if (replacedGlyph) text('Algunos caracteres no compatibles con la tipografía se representan con ?. Los datos originales se conservan en el archivo de antecedentes adjunto al PDF.',9,false,muted);
  // Portable evidence snapshot: no credentials, no remote assets and no arbitrary fetches.
  await pdf.attach(new TextEncoder().encode(JSON.stringify({version:1,proposal,filter:status,result},null,2)), 'antecedentes-consulta.json', {mimeType:'application/json',description:'Datos originales de la búsqueda y alcance del informe'});
  const pages = pdf.getPages();
  pages.forEach((p,i)=>{ p.drawLine({start:{x:52,y:48},end:{x:543,y:48},color:rgb(.86,.82,.89),thickness:.5}); p.drawText('BUHO MARC | Prefactibilidad preliminar',{x:52,y:32,size:8,font:regular,color:muted});p.drawText(`${i+1} / ${pages.length}`,{x:510,y:32,size:8,font:regular,color:muted}); });
  return pdf.save();
}
