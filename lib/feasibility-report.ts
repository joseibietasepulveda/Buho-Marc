import { requireReviewedConclusion, type FeasibilityClassAnalysis } from './feasibility-study';
import { reportCoverage } from './report-coverage';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { selectReportHits, reportMarkGroups, conclusionText } from './report-selection';
import type { SimilarityResult } from './similarity-contract';
import { filterFeasibility, uncertainState, type FeasibilityStatus } from './feasibility-policy';
import { reportRecommendation, type ReportRecommendation } from './feasibility-recommendation';
import { applyVerifiedDecision } from './verified-decisions';
import type { ReportProfile } from './report-profile';
import type { ReportConclusion } from './feasibility-conclusion';
export type FeasibilityReportInput = {
  result: SimilarityResult; status: FeasibilityStatus; analyses?: FeasibilityClassAnalysis[]; layout?: 'table'|'cards';
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
  const analyses = input.analyses?.map(analysis=>({...analysis, conclusion:requireReviewedConclusion(analysis.conclusion)})) ?? [{proposal, result, selectedIds:input.selectedIds, conclusion:input.conclusion}];
  const detailed = analyses.map(analysis=>{const hits=selectReportHits(filterFeasibility(analysis.result.results,status),analysis.selectedIds);return {...analysis,hits,marks:reportMarkGroups(hits)};});
  const recommendation=reportRecommendation(result,input.recommendation,input.explanation,proposal.coverage.map(c=>c.nice_class));
  const author=input.author?.trim() || profile?.lawyerName.trim();
  const pdf=await PDFDocument.create();
  pdf.setTitle(`Informe de factibilidad - ${proposal.name || 'Marca sin nombre'}`);
  pdf.setAuthor(author || profile?.studioName || ''); pdf.setLanguage('es-CL');
  const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink=rgb(.14,.18,.22),muted=rgb(.40,.45,.49),accent=rgb(.12,.22,.29),rule=rgb(.80,.84,.86);
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
  const heading=(value:string)=>{ensure(70);y-=18;page.drawLine({start:{x:left,y:y+11},end:{x:right,y:y+11},thickness:.6,color:rule});text(value,11,{strong:true,color:accent,gap:13});};
  const field=(label:string,value:string)=>text([{text:label+': ',strong:true},{text:value}],10.5,{gap:3});
  const name=proposal.name.trim() || 'Marca sin nombre';
  text('INFORME DE FACTIBILIDAD',9,{strong:true,color:muted,gap:9});
  text(name,23,{strong:true,color:accent,gap:5});
  const classes=[...new Set(proposal.coverage.map(c=>c.nice_class))];
  if(classes.length)text(`Clase${classes.length===1?'':'s'} de Niza ${classes.join(' · ')}`,10,{color:muted,gap:16});
  if(input.client?.trim())text(`Para: ${input.client.trim()}`,10,{gap:4});
  heading('I.     Marca objeto del análisis.');
  text(`La marca objeto del análisis es “${name}”${classes.length?`, para distinguir productos y/o servicios en las clases ${classes.join(', ')} del Clasificador Internacional de Niza.`:'. Los productos o servicios todavía no están definidos.'}`);
  for(const coverage of proposal.coverage)if(coverage.text.trim())field(`Cobertura propuesta · Clase ${coverage.nice_class}`,coverage.text.trim());
  if(input.image){const image=input.imageType==='jpeg'?await pdf.embedJpg(input.image):await pdf.embedPng(input.image);const size=image.scaleToFit(180,110);ensure(size.height+22);page.drawImage(image,{x:left,y:y-size.height,...size});y-=size.height+18;}
  heading('II.    Antecedentes registrales relevantes.');
  for(const analysis of detailed) {
    text(`Clase${analysis.proposal.coverage.length===1?'':'s'} ${analysis.proposal.coverage.map(c=>c.nice_class).join(', ') || 'sin definir'}: ${analysis.marks.length} ${analysis.marks.length===1?'antecedente relevante':'antecedentes relevantes'}.`);
    if(analysis.conclusion)text(analysis.conclusion.title,10.5,{strong:true});
  }
  const images=new Map<string,Awaited<ReturnType<typeof pdf.embedPng>>>();
  for(const hit of detailed.flatMap(analysis=>analysis.hits)){const bytes=input.resultImages?.[hit.applicationId];if(bytes)try{images.set(hit.applicationId,await pdf.embedPng(bytes));}catch{/* Keep an explicit unavailable label. */}}
  function findingHeight(hit:typeof hits[number],members:typeof hits=[hit]){
    const values=[hit.name,`Estado: ${hit.status}`,`Solicitud: ${hit.applicationId}`,...(hit.registrationId?[`Registro: ${hit.registrationId}`]:[]),`Titular: ${hit.holders.map(h=>h.name).join('; ')||'No informado'}`];
    const image=members.map(member=>images.get(member.applicationId)).find(Boolean);
    const coverageRows=reportCoverage([...new Map(members.flatMap(member=>member.classes).map(row=>[JSON.stringify(row),row])).values()]);
    return Math.min(360,25+values.reduce((sum,value)=>sum+lines(value,regular,10.5,width).length*15.75+3,0)+(image?image.scaleToFit(140,75).height+31:22)+coverageRows.reduce((sum,row)=>sum+lines(`${row.label}: ${row.value}`,regular,10.5,width).length*15.75+3,0)+12);
  }
  const firstTableHeight=detailed[0].marks.reduce((sum,mark)=>sum+Math.max(90,lines(mark.hit.name,bold,11,264).length*16+32),0)+130;
  const usableHeight=headerBottom-26-bottom;
  const firstMark=detailed[0].marks[0];
  ensure(input.layout==='table'?(firstTableHeight<usableHeight?firstTableHeight:120):(firstMark?Math.min(usableHeight,105+findingHeight(firstMark.hit,firstMark.members)):120));heading('III.   Antecedentes relevantes.');
  function table(analysis: typeof detailed[number]) {
    const widths=[300,140],tableWidth=440,tableLeft=left+(width-tableWidth)/2;
    const border=rgb(.85,.85,.85);
    function header() {
      ensure(125);let x=tableLeft;
      ['Marca','Logo'].forEach((label,index)=>{
        page.drawRectangle({x,y:y-30,width:widths[index],height:30,borderColor:border,borderWidth:.5,color:accent});
        page.drawText(label,{x:x+(widths[index]-bold.widthOfTextAtSize(label,10))/2,y:y-19,size:10,font:bold,color:rgb(1,1,1)});x+=widths[index];
      });y-=30;
    }
    if(!analysis.marks.length)return;
    header();
    for(const [index,mark] of analysis.marks.entries()) {
      const rows=lines(mark.hit.name,bold,11,widths[0]-36),height=Math.max(90,rows.length*16+32);
      if(y-height<bottom){newPage();header();}
      let x=tableLeft;
      for(const column of widths){page.drawRectangle({x,y:y-height,width:column,height,borderColor:border,borderWidth:.5,color:index%2?rgb(.97,.98,.985):rgb(1,1,1)});x+=column;}
      rows.forEach((row,i)=>page.drawText(row,{x:tableLeft+(widths[0]-bold.widthOfTextAtSize(row,11))/2,y:y-height/2+(rows.length-1)*8-i*16-4,size:11,font:bold,color:ink}));
      const image=mark.members.map(member=>images.get(member.applicationId)).find(Boolean);
      if(image){const size=image.scaleToFit(102,65);page.drawImage(image,{x:tableLeft+widths[0]+(widths[1]-size.width)/2,y:y-height/2-size.height/2,...size});}
      else {const label='Sin imagen disponible';page.drawText(label,{x:tableLeft+widths[0]+(widths[1]-regular.widthOfTextAtSize(label,8))/2,y:y-height/2-3,size:8,font:regular,color:muted});}
      y-=height;
    }
    y-=18;
  }
  for(const analysis of detailed) {
    if(detailed.length>1){ensure(!analysis.marks.length?60:input.layout==='table'?120:Math.min(420,65+findingHeight(analysis.marks[0].hit,analysis.marks[0].members)));text(`Clase ${analysis.proposal.coverage[0].nice_class}`,12,{strong:true});}
    if(!analysis.hits.length)text('No se incluyeron antecedentes relevantes para esta clase.');
    if(input.layout==='table')table(analysis);
    else for(const [index,mark]of analysis.marks.entries()){
      const hit=mark.hit;
      ensure(findingHeight(hit,mark.members));y-=12;text(`${index+1}. ${hit.name}`,11,{strong:true,color:accent,gap:7});
      field('Estado',[...new Set(mark.members.map(member=>uncertainState(member.status)?'Estado por confirmar':member.status))].join(' · '));
      field(mark.members.length===1?'Solicitud':'Solicitudes asociadas',mark.members.map(member=>member.applicationId).join(' · '));const registrations=[...new Set(mark.members.map(member=>member.registrationId).filter(Boolean))];if(registrations.length)field('Registro',registrations.join(' · '));
      field('Titular',hit.holders.map(h=>h.name).join('; ')||'No informado');
      const image=mark.members.map(member=>images.get(member.applicationId)).find(Boolean);
      if(image){const size=image.scaleToFit(140,75);ensure(size.height+32);text('Etiqueta:',10.5,{strong:true,gap:5});page.drawImage(image,{x:left,y:y-size.height,...size});y-=size.height+10;}
      else field('Etiqueta',hit.image?'Imagen no disponible':'No registra imagen en los antecedentes recuperados');
      for(const row of reportCoverage([...new Map(mark.members.flatMap(member=>member.classes).map(row=>[JSON.stringify(row),row])).values()]))field(row.label,row.value);
      if(hit.officialDecision)text(`Decisión firme desde el ${date(hit.officialDecision.firmAt)}.`,9,{color:muted});
      else if(uncertainState(hit.status)||hit.dataWarnings?.length)text('Hay datos de esta solicitud que deben confirmarse.',9,{color:muted});
      y-=12;
    }
    if(input.includeAppendix && !input.analyses){heading(`Anexo de resultados · Clase ${analysis.proposal.coverage.map(c=>c.nice_class).join(', ')}.`);for(const hit of analysis.result.results){ensure(48);text(`${hit.name} · Solicitud ${hit.applicationId} · ${hit.status}`,10);for(const row of reportCoverage(hit.classes))field(row.label,row.value);}}
  }
  const paragraphs=detailed.flatMap(analysis=>analysis.conclusion?.paragraphs??[recommendation.explanation.replace(/\d+(?:[.,]\d+)?%/g,'semejanza relevante')]);
  const endingHeight=(replacedGlyph?40:0)+(author?lines(author,regular,11,width).length*16.5+40:0);
  const conclusionHeight=(analysis:typeof detailed[number])=>(detailed.length>1?23:0)+35+(analysis.conclusion?.paragraphs??paragraphs).reduce((sum,value)=>sum+lines(conclusionText(value),regular,11,width).length*16.5+10,0)+20;
  const totalHeight=65+endingHeight+detailed.reduce((sum,analysis)=>sum+conclusionHeight(analysis),0);
  if(totalHeight<usableHeight)ensure(totalHeight);
  else ensure(Math.min(usableHeight,65+conclusionHeight(detailed[0])));
  heading('IV.    Conclusión.');
  for(const analysis of detailed) {
    const classHeight=conclusionHeight(analysis);
    ensure(classHeight<usableHeight?classHeight:70+Math.min(260,lines(analysis.conclusion?.paragraphs[0]??'',regular,11,width).length*16.5));
    if(detailed.length>1)text(`Clase ${analysis.proposal.coverage[0].nice_class}`,11,{strong:true});
    text(analysis.conclusion?.title||recommendation.title,11,{strong:true,gap:10});
    for(const paragraph of analysis.conclusion?.paragraphs??paragraphs){const height=lines(paragraph,regular,11,width).length*16.5+10;if(height<350)ensure(height);text(conclusionText(paragraph),11,{gap:10});}
    y-=8;
  }
  ensure(endingHeight);
  if(replacedGlyph)text('El respaldo adjunto conserva la escritura original de los caracteres que este PDF muestra como ?.',9,{color:muted});
  if(author){ensure(48);y-=10;text(author,11,{gap:0});text('Abogado',10);}
  const evidence=input.analyses ? {
    version:6,layout:input.layout,proposal,studio:profile?{...profile,logo:undefined}:undefined,
    analyses:detailed.map(analysis=>({proposal:analysis.proposal,conclusion:analysis.conclusion,queriedAt:analysis.result.fetchedAt,
      selectedIds:analysis.hits.map(hit=>hit.applicationId),
      relevantMarks:analysis.marks.map(mark=>({name:mark.hit.name,applicationIds:mark.members.map(member=>member.applicationId)})),
      records:analysis.hits.map(hit=>Object.fromEntries(Object.entries(hit).filter(([key])=>!['score','channels','sourceEvidence'].includes(key)))),
    })),
  } : {version:5,layout:input.layout,proposal,filter:status,selectedIds:hits.map(h=>h.applicationId),recommendation,conclusion:input.conclusion,studio:profile?{...profile,logo:undefined}:undefined,result:{...result,results:input.includeAppendix?allHits:hits,groups:[]}};
  await pdf.attach(new TextEncoder().encode(JSON.stringify(evidence,null,2)),'antecedentes-consulta.json',{mimeType:'application/json',description:'Antecedentes relevantes incluidos en el informe'});
  const pages=pdf.getPages();pages.forEach((p,index)=>{
    p.drawLine({start:{x:left,y:bottom-14},end:{x:right,y:bottom-14},thickness:.5,color:rule});
    footerRows.forEach((row,i)=>p.drawText(row,{x:left+(width-regular.widthOfTextAtSize(row,8.5))/2,y:29+(footerRows.length-1-i)*11,size:8.5,font:regular,color:ink}));
    p.drawText(`${index+1} / ${pages.length}`,{x:right-25,y:16,size:7,font:regular,color:muted});
  });
  return pdf.save();
}
