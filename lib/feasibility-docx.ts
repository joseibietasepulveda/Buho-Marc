import { requireReviewedConclusion } from './feasibility-study';
import { reportCoverage } from './report-coverage';
import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, VerticalAlign, PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { FeasibilityReportInput } from './feasibility-report';
import { selectReportHits, reportMarkGroups, conclusionText } from './report-selection';
import { filterFeasibility, uncertainState } from './feasibility-policy';
import { reportRecommendation } from './feasibility-recommendation';
import { applyVerifiedDecision } from './verified-decisions';
const date=(value:string)=>new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'long'}).format(new Date(value.length===10?`${value}T12:00:00Z`:value));
const pngSize=(bytes:Uint8Array,maxWidth:number,maxHeight:number)=>{const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),width=view.getUint32(16),height=view.getUint32(20),scale=Math.min(maxWidth/width,maxHeight/height);return{width:Math.round(width*scale),height:Math.round(height*scale)};};
export async function createFeasibilityDocx(input:FeasibilityReportInput):Promise<Blob>{
  const{proposal,status,studioProfile:profile}=input;
  const result={...input.result,results:input.result.results.map(applyVerifiedDecision)};
  const analyses=input.analyses?.map(analysis=>({...analysis,conclusion:requireReviewedConclusion(analysis.conclusion)}))??[{proposal,result,selectedIds:input.selectedIds,conclusion:input.conclusion}];
  const detailed=analyses.map(analysis=>{const hits=selectReportHits(filterFeasibility(analysis.result.results,status),analysis.selectedIds);return {...analysis,hits,marks:reportMarkGroups(hits)};});
  const recommendation=reportRecommendation(result,input.recommendation,input.explanation,proposal.coverage.map(c=>c.nice_class));
  const author=input.author?.trim()||profile?.lawyerName.trim();
  const body:(Paragraph|Table)[]=[];
  const paragraph=(value:string,options:{bold?:boolean;small?:boolean;size?:number;color?:string;after?:number;keepNext?:boolean;align?:typeof AlignmentType[keyof typeof AlignmentType];underline?:boolean}={})=>new Paragraph({children:[new TextRun({text:value,bold:options.bold,font:'Arial',size:options.size??(options.small?18:22),color:options.color??(options.small?'66737D':'242E38'),underline:options.underline?{}:undefined})],alignment:options.align,spacing:{after:options.after??120,line:310},keepNext:options.keepNext,widowControl:true});
  const heading=(value:string)=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:value,bold:true,font:'Arial',size:22,color:'1F384A'})],border:{top:{style:BorderStyle.SINGLE,size:4,color:'CCD6DB',space:10}},spacing:{before:360,after:180},keepNext:true});
  const field=(label:string,value:string,keepNext=false)=>new Paragraph({children:[new TextRun({text:label+': ',bold:true,font:'Arial',size:22}),new TextRun({text:value,font:'Arial',size:22})],spacing:{after:65,line:300},keepNext,widowControl:true});
  const picture=(bytes:Uint8Array,width:number,height:number,keepNext=false)=>new Paragraph({children:[new ImageRun({type:'png',data:bytes,transformation:pngSize(bytes,width,height),altText:{name:'Etiqueta de la marca',title:'Etiqueta de la marca',description:'Imagen de los antecedentes examinados'}})],spacing:{after:140},keepNext});
  const name=proposal.name.trim()||'Marca sin nombre',classes=[...new Set(proposal.coverage.map(c=>c.nice_class))];
  body.push(paragraph('INFORME DE FACTIBILIDAD',{bold:true,small:true,after:100,keepNext:true}));
  body.push(paragraph(name,{bold:true,size:46,color:'1F384A',after:90,keepNext:true}));
  if(classes.length)body.push(paragraph(`Clase${classes.length===1?'':'s'} de Niza ${classes.join(' · ')}`,{small:true,size:20,after:240,keepNext:true}));
  if(input.client?.trim())body.push(paragraph(`Para: ${input.client.trim()}`,{small:true}));
  body.push(heading('I.     Marca objeto del análisis.'));
  body.push(paragraph(`La marca objeto del análisis es “${name}”${classes.length?`, para distinguir productos y/o servicios en las clases ${classes.join(', ')} del Clasificador Internacional de Niza.`:'. Los productos o servicios todavía no están definidos.'}`));
  for(const c of proposal.coverage)if(c.text.trim())body.push(field(`Cobertura propuesta · Clase ${c.nice_class}`,c.text.trim()));
  if(input.image)body.push(picture(input.image,210,140));
  body.push(heading('II.    Antecedentes registrales relevantes.'));
  for(const analysis of detailed){body.push(paragraph(`Clase${analysis.proposal.coverage.length===1?'':'s'} ${analysis.proposal.coverage.map(c=>c.nice_class).join(', ')||'sin definir'}: ${analysis.marks.length} ${analysis.marks.length===1?'antecedente relevante':'antecedentes relevantes'}.`));if(analysis.conclusion)body.push(paragraph(analysis.conclusion.title,{bold:true}));}
  body.push(heading('III.   Antecedentes relevantes.'));
  for(const analysis of detailed) {
  if(detailed.length>1)body.push(heading(`Clase ${analysis.proposal.coverage[0].nice_class}`));
  if(!analysis.hits.length)body.push(paragraph('No se incluyeron antecedentes relevantes para esta clase.'));
  if(input.layout==='table') {
    const widths=[6000,2800],borders=Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{style:BorderStyle.SINGLE,size:4,color:'D9D9D9'}]));
    const cell=(children:Paragraph[],index:number,fill:string)=>new TableCell({width:{size:widths[index],type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,shading:{fill},margins:{top:200,bottom:200,left:220,right:220},borders,children});
    const header=new TableRow({tableHeader:true,cantSplit:true,children:['Marca','Logo'].map((value,index)=>cell([paragraph(value,{bold:true,size:20,color:'FFFFFF',after:0,keepNext:true,align:AlignmentType.CENTER})],index,'1F384A'))});
    const rows=analysis.marks.map((mark,index)=>{
      const keepNext=analysis.marks.length<=4&&index<analysis.marks.length-1;
      const fill=index%2?'F7FAFB':'FFFFFF',bytes=mark.members.map(member=>input.resultImages?.[member.applicationId]).find(Boolean);
      const logo=bytes?new Paragraph({children:[new ImageRun({type:'png',data:bytes,transformation:pngSize(bytes,102,65),altText:{name:mark.hit.name,title:mark.hit.name,description:`Logo de ${mark.hit.name}`}})],alignment:AlignmentType.CENTER,keepNext,spacing:{after:0}}):paragraph('Sin imagen disponible',{small:true,after:0,keepNext,align:AlignmentType.CENTER});
      return new TableRow({cantSplit:true,children:[cell([paragraph(mark.hit.name,{bold:true,after:0,keepNext,align:AlignmentType.CENTER})],0,fill),cell([logo],1,fill)]});
    });
    if(rows.length){body.push(new Table({alignment:AlignmentType.CENTER,width:{size:8800,type:WidthType.DXA},columnWidths:widths,rows:[header,...rows]}));body.push(paragraph('',{after:180}));}
  } else for(const[index,mark]of analysis.marks.entries()){
    const hit=mark.hit;
    body.push(new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:`${index+1}. ${hit.name}`,bold:true,font:'Arial',size:22,color:'1F384A'})],spacing:{before:260,after:120},keepNext:true}));
    body.push(field('Estado',[...new Set(mark.members.map(member=>uncertainState(member.status)?'Estado por confirmar':member.status))].join(' · '),true));
    body.push(field(mark.members.length===1?'Solicitud':'Solicitudes asociadas',mark.members.map(member=>member.applicationId).join(' · '),true));const registrations=[...new Set(mark.members.map(member=>member.registrationId).filter(Boolean))];if(registrations.length)body.push(field('Registro',registrations.join(' · '),true));
    body.push(field('Titular',hit.holders.map(h=>h.name).join('; ')||'No informado',true));
    const bytes=mark.members.map(member=>input.resultImages?.[member.applicationId]).find(Boolean);
    if(bytes){body.push(paragraph('Etiqueta:',{bold:true,after:50,keepNext:true}));body.push(picture(bytes,180,115,true));}
    else body.push(field('Etiqueta',hit.image?'Imagen no disponible':'No registra imagen en los antecedentes recuperados',true));
    const coverageRows=reportCoverage([...new Map(mark.members.flatMap(member=>member.classes).map(row=>[JSON.stringify(row),row])).values()]);
    for(const[index,row]of coverageRows.entries())body.push(field(row.label,row.value,index<coverageRows.length-1));
    if(hit.officialDecision)body.push(paragraph(`Decisión firme desde el ${date(hit.officialDecision.firmAt)}.`,{small:true}));
    else if(uncertainState(hit.status)||hit.dataWarnings?.length)body.push(paragraph('Hay datos de esta solicitud que deben confirmarse.',{small:true}));
  }
  if(input.includeAppendix && !input.analyses){body.push(heading('Anexo de resultados.'));for(const hit of analysis.result.results){body.push(paragraph(`${hit.name} · Solicitud ${hit.applicationId} · ${hit.status}`,{keepNext:!!hit.classes.length}));for(const row of reportCoverage(hit.classes))body.push(field(row.label,row.value));}}
  }
  body.push(heading('IV.    Conclusión.'));
  for(const analysis of detailed) {
  if(detailed.length>1)body.push(paragraph(`Clase ${analysis.proposal.coverage[0].nice_class}`,{bold:true,keepNext:true}));
  body.push(paragraph(analysis.conclusion?.title||recommendation.title,{bold:true,keepNext:true}));
  const conclusionParagraphs=analysis.conclusion?.paragraphs??[recommendation.explanation.replace(/\d+(?:[.,]\d+)?%/g,'semejanza relevante')],shortConclusion=conclusionParagraphs.join(' ').length<1600;
  for(const[index,value]of conclusionParagraphs.entries())body.push(paragraph(conclusionText(value),{keepNext:shortConclusion&&index<conclusionParagraphs.length-1,after:180}));
  }
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
