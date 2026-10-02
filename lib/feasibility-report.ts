import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { selectReportHits } from './report-selection';
import type { SimilarityResult } from './similarity-contract';
import { filterFeasibility, uncertainState, type FeasibilityStatus } from './feasibility-policy';
import { reportRecommendation, type ReportRecommendation } from './feasibility-recommendation';
import { applyVerifiedDecision } from './verified-decisions';
import type { ReportProfile } from './report-profile';
import type { ReportConclusion } from './feasibility-conclusion';
export type FeasibilityReportInput = {
  result: SimilarityResult; status: FeasibilityStatus;
  proposal: { name: string; coverage: { nice_class: number; text: string }[]; grouped: boolean };
  image?: Uint8Array; imageType?: 'png' | 'jpeg'; studioLogo?: Uint8Array;
  client?: string; author?: string; recommendation?: ReportRecommendation;
  studioProfile?: ReportProfile; conclusion?: ReportConclusion;
  explanation?: string; includeAppendix?: boolean; selectedIds?: string[]; resultImages?: Record<string,Uint8Array>;
};
const date = (value: string) => new Intl.DateTimeFormat('es-CL', { timeZone:'America/Santiago', dateStyle:'long' }).format(new Date(value.length===10 ? `${value}T12:00:00Z` : value));
// The writers receive one prepared conclusion; downloads never call the provider.
export async function createFeasibilityReport(input: FeasibilityReportInput): Promise<Uint8Array> {
  const {proposal,status,studioProfile:profile}=input;
  const result={...input.result,results:input.result.results.map(applyVerifiedDecision)};
  const allHits=filterFeasibility(result.results,status), hits=selectReportHits(allHits,input.selectedIds);
  const recommendation=reportRecommendation(result,input.recommendation,input.explanation,proposal.coverage.map(c=>c.nice_class));
  const author=input.author?.trim() || profile?.lawyerName.trim();
  const pdf=await PDFDocument.create();
  pdf.setTitle(`Informe de factibilidad - ${proposal.name || 'Marca sin nombre'}`);
  pdf.setAuthor(author || profile?.studioName || ''); pdf.setLanguage('es-CL');
  const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink=rgb(0,0,0),muted=rgb(.38,.40,.43);
  const logo=input.studioLogo ? await pdf.embedPng(input.studioLogo) : undefined;
  const left=58,right=554,width=right-left;
  let replacedGlyph=false;
  function safe(value:string) { return Array.from(value.normalize('NFC').replace(/[\u2010-\u2015]/g,'-').replace(/[\t\r\n]+/g,' ')).map(c=>{try{regular.encodeText(c);return c;}catch{replacedGlyph=true;return '?';}}).join(''); }
  function lines(value:string,font:PDFFont,size:number,maxWidth:number) {
    const rows:string[]=[];let current='';
    for(const word of safe(value).split(/\s+/)) {
      if(font.widthOfTextAtSize(`${current} ${word}`.trim(),size)<=maxWidth){current=`${current} ${word}`.trim();continue;}
      if(current){rows.push(current);current='';}
      for(const c of word){if(font.widthOfTextAtSize(current+c,size)>maxWidth){rows.push(current);current='';}current+=c;}
    }
    if(current)rows.push(current);return rows;
  }
  const footerTexts=[...(profile?.address.trim().split('\n').filter(Boolean)??[]),[profile?.website,profile?.email,profile?.phone].filter(Boolean).join(' · ')].filter(Boolean);
  const footerRows=footerTexts.flatMap(value=>lines(value,regular,8.5,width));
  const bottom=Math.max(58,29+footerRows.length*11+15);
  const headerText=profile?.headerText?.trim() || profile?.studioName.trim() || '';
  const headerRows=headerText.split('\n').flatMap(value=>lines(value,regular,8.5,265));
  const headerBottom=Math.min(716,760-Math.max(logo ? Math.min(78,logo.scaleToFit(130,78).height) : 0,headerRows.length*11));
  let page=pdf.addPage([612,792]),y=headerBottom-26;
  function drawHeader() {
    if(logo){const size=logo.scaleToFit(130,78);page.drawImage(logo,{x:42,y:760-size.height,...size});}
    headerRows.forEach((row,i)=>page.drawText(row,{x:right-regular.widthOfTextAtSize(row,8.5),y:748-i*11,size:8.5,font:regular,color:muted}));
  }
  drawHeader();
  function newPage(){page=pdf.addPage([612,792]);y=headerBottom-26;drawHeader();}
  function ensure(height:number){if(y-height<bottom)newPage();}
  type Run={text:string;strong?:boolean};
  function text(runs:string|Run[],size=11,options:{strong?:boolean;align?:'left'|'center'|'right';gap?:number;underline?:boolean;color?:ReturnType<typeof rgb>}={}) {
    const tokens:{value:string;font:PDFFont;width:number}[][]=[[]];let rowWidth=0;
    for(const run of typeof runs==='string' ? [{text:runs,strong:options.strong}] : runs) {
      const font=run.strong?bold:regular;
      for(const token of safe(run.text).match(/\S+\s*|\s+/g)??[]) {
        const tokenWidth=font.widthOfTextAtSize(token,size);
        if(rowWidth+tokenWidth>width && tokens.at(-1)!.length){tokens.push([]);rowWidth=0;}
        if(tokenWidth<=width){tokens.at(-1)!.push({value:token,font,width:tokenWidth});rowWidth+=tokenWidth;}
        else for(const c of token){const w=font.widthOfTextAtSize(c,size);if(rowWidth+w>width){tokens.push([]);rowWidth=0;}tokens.at(-1)!.push({value:c,font,width:w});rowWidth+=w;}
      }
    }
    const rows=tokens.filter(row=>row.length);
    ensure(Math.min(2,rows.length)*size*1.5);
    for(const row of rows){ensure(size*1.5);const rowWidth=row.reduce((sum,t)=>sum+t.width,0);let x=options.align==='right'?right-rowWidth:options.align==='center'?left+(width-rowWidth)/2:left;
      const start=x;for(const token of row){page.drawText(token.value,{x,y,size,font:token.font,color:options.color??ink});x+=token.width;}
      if(options.underline)page.drawLine({start:{x:start,y:y-2},end:{x,y:y-2},thickness:.6,color:ink});
      y-=size*1.5;
    }
    y-=options.gap??6;
  }
  const heading=(value:string)=>{ensure(62);y-=16;text(value,11,{strong:true,underline:true,gap:12});};
  const field=(label:string,value:string)=>text([{text:label+': ',strong:true},{text:value}],10.5,{gap:3});
  const name=proposal.name.trim() || 'Marca sin nombre';
  text(name,12,{strong:true,align:'right',gap:4});
  const classes=[...new Set(proposal.coverage.map(c=>c.nice_class))];
  if(classes.length)text(`Clase${classes.length===1?'':'s'} ${classes.join(' y ')}`,11,{strong:true,align:'right',gap:22});
  text('INFORME DE FACTIBILIDAD',12,{strong:true,align:'center',underline:true,gap:10});
  if(input.client?.trim())text(`Para: ${input.client.trim()}`,10,{gap:4});
  heading('I.     Marca objeto del análisis.');
  text(`La marca objeto del análisis es “${name}”${classes.length?`, para distinguir productos y/o servicios en las clases ${classes.join(' y ')} del Clasificador Internacional de Niza.`:'. Los productos o servicios todavía no están definidos.'}`);
  for(const coverage of proposal.coverage)if(coverage.text.trim())field(`Cobertura propuesta · Clase ${coverage.nice_class}`,coverage.text.trim());
  if(input.image){const image=input.imageType==='jpeg'?await pdf.embedJpg(input.image):await pdf.embedPng(input.image);const size=image.scaleToFit(180,110);ensure(size.height+22);page.drawImage(image,{x:left,y:y-size.height,...size});y-=size.height+18;}
  heading('II.    Antecedentes registrales relevantes.');
  text(`La búsqueda, efectuada conforme a los criterios seleccionados, arrojó ${result.results.length} resultados, de los cuales el presente informe analiza en detalle ${hits.length}.`);
  const {evidence}=recommendation;
  text(`Entre los registros vigentes y las solicitudes en trámite se identificaron ${evidence.high} marcas con similitud alta (índice entre 65% y 100%) y ${evidence.medium} con similitud media (índice entre 45% y 64%).${evidence.topScore==null?'':` El índice de similitud más alto obtenido es de ${Math.round(evidence.topScore*100)}%.`}`);
  const images=new Map<string,Awaited<ReturnType<typeof pdf.embedPng>>>();
  for(const hit of hits){const bytes=input.resultImages?.[hit.applicationId];if(bytes)try{images.set(hit.applicationId,await pdf.embedPng(bytes));}catch{/* Keep an explicit unavailable label. */}}
  function findingHeight(hit:typeof hits[number]){
    const values=[hit.name,`Factor de similitud: ${Math.round(hit.score*100)}%`,`Estado: ${hit.status}`,`Solicitud: ${hit.applicationId}`,...(hit.registrationId?[`Registro: ${hit.registrationId}`]:[]),`Titular: ${hit.holders.map(h=>h.name).join('; ')||'No informado'}`];
    const image=images.get(hit.applicationId),coverage=hit.classes[0]?.coverage_text||'Productos o servicios no informados';
    return Math.min(360,25+values.reduce((sum,value)=>sum+lines(value,regular,10.5,width).length*15.75+3,0)+(image?image.scaleToFit(140,75).height+31:22)+Math.min(2,lines(coverage,regular,10.5,width).length)*15.75+12);
  }
  if(hits.length)ensure(findingHeight(hits[0])+62);
  heading('III.   Resultados de la búsqueda.');
  if(!hits.length)text('No hay antecedentes con el filtro elegido. Este resultado no acredita la disponibilidad de la marca; conviene completar la revisión.');
  for(const [index,hit]of hits.entries()){
    ensure(findingHeight(hit));y-=12;text(`${index+1}. ${hit.name}`,11,{strong:true,underline:true,gap:5});
    field('Factor de similitud',`${Math.round(hit.score*100)}%`);field('Estado',uncertainState(hit.status)?'Estado por confirmar':hit.status);
    field('Solicitud',hit.applicationId);if(hit.registrationId)field('Registro',hit.registrationId);
    field('Titular',hit.holders.map(h=>h.name).join('; ')||'No informado');
    const image=images.get(hit.applicationId);
    if(image){const size=image.scaleToFit(140,75);ensure(size.height+32);text('Etiqueta:',10.5,{strong:true,gap:5});page.drawImage(image,{x:left,y:y-size.height,...size});y-=size.height+10;}
    else field('Etiqueta',hit.image?'Imagen no disponible':'No registra imagen en los antecedentes recuperados');
    if(hit.classes.length)for(const c of hit.classes)field(`Cobertura · Clase ${c.nice_class}`,c.coverage_text?.trim()||'Productos o servicios no informados');
    else field('Cobertura','Clase y productos o servicios no informados');
    if(hit.officialDecision)text(`Decisión firme desde el ${date(hit.officialDecision.firmAt)}.`,9,{color:muted});
    else if(uncertainState(hit.status)||hit.dataWarnings?.length)text('Hay datos de esta solicitud que deben confirmarse.',9,{color:muted});
  }
  if(input.includeAppendix){heading('Anexo de resultados.');for(const hit of allHits){ensure(48);text(`${hit.name} · Solicitud ${hit.applicationId} · ${Math.round(hit.score*100)}% · ${hit.status}`,10);for(const c of hit.classes)field(`Clase ${c.nice_class}`,c.coverage_text||'Productos o servicios no informados');}}
  const paragraphs=input.conclusion?.paragraphs??[recommendation.explanation];
  const note=`Nota: el análisis se basa en los antecedentes de INAPI entregados por DeQuiénEs, consultados el ${date(result.fetchedAt)}, y en hasta ${result.searchScope?.limit??50} candidatos recuperados. No garantiza el resultado del examen de INAPI ni excluye oposiciones de terceros. Los índices expresan semejanza, no probabilidad de registro.`;
  const hasWarnings=!!(result.warnings.length||hits.some(h=>h.dataWarnings?.length));
  const endingHeight=lines(note,regular,9,width).length*13.5+10+(hasWarnings?24:0)+(replacedGlyph?40:0)+(author?lines(author,regular,11,width).length*16.5+40:0);
  const totalHeight=80+endingHeight+paragraphs.reduce((sum,value)=>sum+lines(value,regular,11,width).length*16.5+10,0);
  if(totalHeight<headerBottom-26-bottom-15)ensure(totalHeight);
  heading('IV.    Conclusión.');
  text(input.conclusion?.title||recommendation.title,11,{strong:true,gap:10});
  for(const paragraph of paragraphs){const height=lines(paragraph,regular,11,width).length*16.5+10;if(height<350)ensure(height);text(paragraph,11,{gap:10});}
  ensure(endingHeight);
  text(note,9,{gap:10});
  if(hasWarnings)text('Los datos incompletos o inconsistentes deben confirmarse antes de presentar.',9,{color:muted});
  if(replacedGlyph)text('El respaldo adjunto conserva la escritura original de los caracteres que este PDF muestra como ?.',9,{color:muted});
  if(author){ensure(48);y-=10;text(author,11,{gap:0});text('Abogado',10);}
  await pdf.attach(new TextEncoder().encode(JSON.stringify({version:4,proposal,filter:status,selectedIds:hits.map(h=>h.applicationId),recommendation,conclusion:input.conclusion,studio:profile?{...profile,logo:undefined}:undefined,result:{...result,results:input.includeAppendix?allHits:hits,groups:[]}},null,2)),'antecedentes-consulta.json',{mimeType:'application/json',description:'Antecedentes, fuentes y alcance del informe'});
  const pages=pdf.getPages();pages.forEach((p,index)=>{
    footerRows.forEach((row,i)=>p.drawText(row,{x:left+(width-regular.widthOfTextAtSize(row,8.5))/2,y:29+(footerRows.length-1-i)*11,size:8.5,font:regular,color:ink}));
    p.drawText(`${index+1} / ${pages.length}`,{x:right-25,y:16,size:7,font:regular,color:muted});
  });
  return pdf.save();
}
