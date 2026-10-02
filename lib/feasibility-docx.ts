import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { FeasibilityReportInput } from './feasibility-report';
import { selectReportHits } from './report-selection';
import { filterFeasibility, uncertainState } from './feasibility-policy';
import { reportRecommendation } from './feasibility-recommendation';
import { applyVerifiedDecision } from './verified-decisions';
const date=(value:string)=>new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'long'}).format(new Date(value.length===10?`${value}T12:00:00Z`:value));
const pngSize=(bytes:Uint8Array,maxWidth:number,maxHeight:number)=>{const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),width=view.getUint32(16),height=view.getUint32(20),scale=Math.min(maxWidth/width,maxHeight/height);return{width:Math.round(width*scale),height:Math.round(height*scale)};};
export async function createFeasibilityDocx(input:FeasibilityReportInput):Promise<Blob>{
  const{proposal,status,studioProfile:profile}=input;
  const result={...input.result,results:input.result.results.map(applyVerifiedDecision)};
  const allHits=filterFeasibility(result.results,status),hits=selectReportHits(allHits,input.selectedIds);
  const recommendation=reportRecommendation(result,input.recommendation,input.explanation,proposal.coverage.map(c=>c.nice_class));
  const author=input.author?.trim()||profile?.lawyerName.trim();
  const body:(Paragraph|Table)[]=[];
  const paragraph=(value:string,options:{bold?:boolean;small?:boolean;after?:number;keepNext?:boolean;align?:typeof AlignmentType[keyof typeof AlignmentType];underline?:boolean}={})=>new Paragraph({children:[new TextRun({text:value,bold:options.bold,font:'Arial',size:options.small?18:22,color:options.small?'60666B':'000000',underline:options.underline?{}:undefined})],alignment:options.align,spacing:{after:options.after??120,line:310},keepNext:options.keepNext,widowControl:true});
  const heading=(value:string)=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:value,bold:true,underline:{},font:'Arial',size:22,color:'000000'})],spacing:{before:340,after:160},keepNext:true});
  const field=(label:string,value:string,keepNext=false)=>new Paragraph({children:[new TextRun({text:label+': ',bold:true,font:'Arial',size:22}),new TextRun({text:value,font:'Arial',size:22})],spacing:{after:65,line:300},keepNext,widowControl:true});
  const picture=(bytes:Uint8Array,width:number,height:number,keepNext=false)=>new Paragraph({children:[new ImageRun({type:'png',data:bytes,transformation:pngSize(bytes,width,height),altText:{name:'Etiqueta de la marca',title:'Etiqueta de la marca',description:'Imagen de los antecedentes examinados'}})],spacing:{after:140},keepNext});
  const name=proposal.name.trim()||'Marca sin nombre',classes=[...new Set(proposal.coverage.map(c=>c.nice_class))];
  body.push(paragraph(name,{bold:true,align:AlignmentType.RIGHT,after:80,keepNext:true}));
  if(classes.length)body.push(paragraph(`Clase${classes.length===1?'':'s'} ${classes.join(' y ')}`,{bold:true,align:AlignmentType.RIGHT,after:380,keepNext:true}));
  body.push(paragraph('INFORME DE FACTIBILIDAD',{bold:true,underline:true,align:AlignmentType.CENTER,after:120,keepNext:true}));
  if(input.client?.trim())body.push(paragraph(`Para: ${input.client.trim()}`,{small:true}));
  body.push(heading('I.     Marca objeto del análisis.'));
  body.push(paragraph(`La marca objeto del análisis es “${name}”${classes.length?`, para distinguir productos y/o servicios en las clases ${classes.join(' y ')} del Clasificador Internacional de Niza.`:'. Los productos o servicios todavía no están definidos.'}`));
  for(const c of proposal.coverage)if(c.text.trim())body.push(field(`Cobertura propuesta · Clase ${c.nice_class}`,c.text.trim()));
  if(input.image)body.push(picture(input.image,210,140));
  body.push(heading('II.    Antecedentes registrales relevantes.'));
  body.push(paragraph(`La búsqueda, efectuada conforme a los criterios seleccionados, arrojó ${result.results.length} resultados, de los cuales el presente informe analiza en detalle ${hits.length}.`));
  const{evidence}=recommendation;
  body.push(paragraph(`Entre los registros vigentes y las solicitudes en trámite se identificaron ${evidence.high} marcas con similitud alta (índice entre 65% y 100%) y ${evidence.medium} con similitud media (índice entre 45% y 64%).${evidence.topScore==null?'':` El índice de similitud más alto obtenido es de ${Math.round(evidence.topScore*100)}%.`}`));
  body.push(heading('III.   Resultados de la búsqueda.'));
  if(!hits.length)body.push(paragraph('No hay antecedentes con el filtro elegido. Este resultado no acredita la disponibilidad de la marca; conviene completar la revisión.'));
  for(const[index,hit]of hits.entries()){
    body.push(new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:`${index+1}. ${hit.name}`,bold:true,underline:{},font:'Arial',size:22,color:'000000'})],spacing:{before:260,after:100},keepNext:true}));
    body.push(field('Factor de similitud',`${Math.round(hit.score*100)}%`,true));
    body.push(field('Estado',uncertainState(hit.status)?'Estado por confirmar':hit.status,true));
    body.push(field('Solicitud',hit.applicationId,true));if(hit.registrationId)body.push(field('Registro',hit.registrationId,true));
    body.push(field('Titular',hit.holders.map(h=>h.name).join('; ')||'No informado',true));
    const bytes=input.resultImages?.[hit.applicationId];
    if(bytes){body.push(paragraph('Etiqueta:',{bold:true,after:50,keepNext:true}));body.push(picture(bytes,180,115,true));}
    else body.push(field('Etiqueta',hit.image?'Imagen no disponible':'No registra imagen en los antecedentes recuperados',true));
    if(hit.classes.length)for(const c of hit.classes)body.push(field(`Cobertura · Clase ${c.nice_class}`,c.coverage_text?.trim()||'Productos o servicios no informados'));
    else body.push(field('Cobertura','Clase y productos o servicios no informados'));
    if(hit.officialDecision)body.push(paragraph(`Decisión firme desde el ${date(hit.officialDecision.firmAt)}.`,{small:true}));
    else if(uncertainState(hit.status)||hit.dataWarnings?.length)body.push(paragraph('Hay datos de esta solicitud que deben confirmarse.',{small:true}));
  }
  if(input.includeAppendix){body.push(heading('Anexo de resultados.'));for(const hit of allHits){body.push(paragraph(`${hit.name} · Solicitud ${hit.applicationId} · ${Math.round(hit.score*100)}% · ${hit.status}`,{keepNext:!!hit.classes.length}));for(const c of hit.classes)body.push(field(`Clase ${c.nice_class}`,c.coverage_text||'Productos o servicios no informados'));}}
  body.push(heading('IV.    Conclusión.'));
  body.push(paragraph(input.conclusion?.title||recommendation.title,{bold:true,keepNext:true}));
  const conclusionParagraphs=input.conclusion?.paragraphs??[recommendation.explanation],shortConclusion=conclusionParagraphs.join(' ').length<1600;
  for(const[index,value]of conclusionParagraphs.entries())body.push(paragraph(value,{keepNext:shortConclusion&&index<conclusionParagraphs.length-1,after:180}));
  body.push(paragraph(`Nota: el análisis se basa en los antecedentes de INAPI entregados por DeQuiénEs, consultados el ${date(result.fetchedAt)}, y en hasta ${result.searchScope?.limit??50} candidatos recuperados. No garantiza el resultado del examen de INAPI ni excluye oposiciones de terceros. Los índices expresan semejanza, no probabilidad de registro.`,{small:true}));
  if(result.warnings.length||hits.some(h=>h.dataWarnings?.length))body.push(paragraph('Los datos incompletos o inconsistentes deben confirmarse antes de presentar.',{small:true}));
  if(author){body.push(paragraph(author,{after:0,keepNext:true}));body.push(paragraph('Abogado',{after:0}));}
  const headerText=profile?.headerText?.trim()||profile?.studioName.trim()||'';
  const headerRows=headerText.split('\n').filter(Boolean);
  const logo=input.studioLogo?new ImageRun({type:'png',data:input.studioLogo,transformation:pngSize(input.studioLogo,130,85),altText:{name:'Logo del estudio',title:'Logo del estudio',description:profile?.studioName||'Estudio jurídico'}}):undefined;
  const none={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
  const header=(logo||headerText)?new Header({children:[new Table({width:{size:9940,type:WidthType.DXA},columnWidths:[3800,6140],borders:{top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none},rows:[new TableRow({cantSplit:true,children:[new TableCell({width:{size:3800,type:WidthType.DXA},margins:{top:0,bottom:0,left:0,right:0},children:[new Paragraph({children:logo?[logo]:[],spacing:{after:0}})]}),new TableCell({width:{size:6140,type:WidthType.DXA},margins:{top:0,bottom:0,left:0,right:0},children:headerRows.length?headerRows.map(value=>new Paragraph({children:[new TextRun({text:value,font:'Arial',size:17,color:'60666B'})],alignment:AlignmentType.RIGHT,spacing:{after:20,line:220}})):[new Paragraph({})]})]})]})]}):undefined;
  const footerTexts=[...(profile?.address.trim().split('\n').filter(Boolean)??[]),[profile?.website,profile?.email,profile?.phone].filter(Boolean).join(' · ')].filter(Boolean);
  const footerLineCount=footerTexts.reduce((sum,value)=>sum+Math.ceil(value.length/100),0);
  const doc=new Document({creator:author||profile?.studioName||'',title:`Informe de factibilidad de marca ${name}`,styles:{default:{document:{run:{font:'Arial',size:22},paragraph:{spacing:{line:310}}}},paragraphStyles:[{id:'ReportFooter',name:'Pie del informe',basedOn:'Normal',run:{font:'Arial',size:17,color:'000000'},paragraph:{alignment:AlignmentType.CENTER,spacing:{after:0,line:220}}}]},sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:Math.max(1200,logo?2200:0,headerRows.reduce((sum,value)=>sum+Math.ceil(value.length/65),0)*220+550),right:1150,left:1150,bottom:Math.max(1000,footerLineCount*220+500),header:380,footer:300}}},headers:header?{default:header}:undefined,footers:{default:new Footer({children:[...footerTexts.map(value=>new Paragraph({style:'ReportFooter',children:[new TextRun(value)]})),new Paragraph({style:'ReportFooter',alignment:AlignmentType.RIGHT,children:[new TextRun({size:14,children:[PageNumber.CURRENT,' / ',PageNumber.TOTAL_PAGES]})]})]})},children:body}]});
  return Packer.toBlob(doc);
}
