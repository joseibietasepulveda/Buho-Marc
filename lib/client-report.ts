import ExcelJS from "exceljs";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ClientReportField = { key: string; label: string; group: string; default?: boolean };
export type ClientReportRow = { title: string; values: Record<string, unknown> };
export type ClientReport = { client: { name: string; rut?: string }; fields: ClientReportField[]; rows: ClientReportRow[] };
export const REPORT_FIELDS: ClientReportField[] = [
  { key:"applicationNumber", label:"Número de solicitud", group:"Identificación", default:true },
  { key:"name", label:"Nombre de la marca", group:"Identificación", default:true },
  { key:"registrationNumber", label:"Número de registro", group:"Identificación", default:true },
  { key:"type", label:"Tipo de marca", group:"Identificación", default:true },
  { key:"classes", label:"Clases Niza", group:"Identificación", default:true },
  { key:"coverage", label:"Cobertura de productos y servicios", group:"Identificación" },
  { key:"logo", label:"Enlace a la imagen de la marca", group:"Identificación" },
  { key:"status", label:"Estado INAPI", group:"Estado y fechas", default:true },
  { key:"filingDate", label:"Fecha de presentación", group:"Estado y fechas", default:true },
  { key:"publicationDate", label:"Fecha de publicación", group:"Estado y fechas" },
  { key:"registrationDate", label:"Fecha de registro", group:"Estado y fechas" },
  { key:"expirationDate", label:"Fecha de vencimiento", group:"Estado y fechas" },
  { key:"owner", label:"Titular / solicitante", group:"Personas y cliente", default:true },
  { key:"ownerRut", label:"RUT del titular", group:"Personas y cliente" },
  { key:"ownerCountry", label:"País del titular", group:"Personas y cliente" },
  { key:"representativeName", label:"Representante", group:"Personas y cliente", default:true },
  { key:"representativeCountry", label:"País del representante", group:"Personas y cliente" },
  { key:"clientRole", label:"Rol confirmado del cliente", group:"Personas y cliente", default:true },
  { key:"client", label:"Datos del cliente", group:"Personas y cliente" },
  { key:"monitoring", label:"Estado del seguimiento", group:"Gestión del estudio", default:true },
  { key:"updatedAt", label:"Última actualización", group:"Gestión del estudio" },
  { key:"sourceUrl", label:"Enlace al expediente", group:"Gestión del estudio" },
  { key:"tasks", label:"Tareas del expediente", group:"Gestión del estudio" },
  { key:"cases", label:"Casos vinculados y sus tareas", group:"Gestión del estudio" },
  { key:"findings", label:"Hallazgos de vigilancia", group:"Gestión del estudio" },
];
const labels: Record<string,string> = {
  ...Object.fromEntries(REPORT_FIELDS.map(field=>[field.key,field.label])),
  inapi:"INAPI", events:"Actuaciones del expediente", annotations:"Anotaciones", holders:"Titulares",
  representatives:"Representantes", protection:"Protección", label_description:"Descripción de etiqueta",
  history:"Historial", procedure:"Procedimiento y antecedentes legales", legalEvidence:"Evidencia legal",
  application_id:"Número de solicitud en la fuente", registration_id:"Número de registro en la fuente",
  applicationNumber:"Número de solicitud", registrationNumber:"Número de registro", nice_class:"Clase Niza",
  coverage_text:"Cobertura", clientId:"Cliente vinculado", clientRole:"Rol del cliente",
  owner:"Titular",ownerRut:"RUT del titular",ownerCountry:"País del titular",holder:"Titular",holderRut:"RUT del titular",
  classes:"Clases de Niza y coberturas",niceClasses:"Clases de Niza",dates:"Fechas",trademark:"Características de la marca",
  registrationState:"Estado de registro",sourceStatus:"Estado informado por la fuente",statusId:"Etapa del expediente",
  name:"Nombre",rut:"RUT",dv:"Dígito verificador",country:"País",commune:"Comuna",type:"Tipo",sign_type:"Tipo de marca",subtype:"Subtipo",translation:"Traducción",
  description:"Descripción",code:"Código de estado",logo:"Imagen de la marca",image_url:"Imagen de la marca",wordMark:"Denominación",
  filingDate:"Fecha de presentación",filedAt:"Fecha de presentación",filed_at:"Fecha de presentación",
  publicationDate:"Fecha de publicación",publishedAt:"Fecha de publicación",published_at:"Fecha de publicación",
  registered_at:"Fecha de registro",expires_at:"Fecha de vencimiento",last_changed_at:"Última modificación",
  related_records:"Expedientes relacionados",renews_application_id:"Solicitud que renueva",applies_phrase_to_registration:"Registro al que aplica la frase",
  representativeName:"Nombre del representante",representativeCountry:"País del representante",officialUrl:"Enlace al expediente",inapiUrl:"Enlace a INAPI",fileUrl:"Enlace al expediente",
  provider:"Origen de los antecedentes",statusDate:"Fecha del estado",sourceHistory:"Historial del expediente",source:"Fuente",
  createdAt:"Fecha de incorporación",lastReviewedAt:"Última revisión",comments:"Comentarios",attachments:"Archivos adjuntos",
  monitoringEnabled:"Seguimiento activado",startMonitoring:"Inicio de seguimiento",watchOnly:"Seguimiento de expediente contrario",foundingBrandId:"Marca de fundamento vinculada",
  client:"Cliente",recentEvent:"Última actuación",recentEventDate:"Fecha de la última actuación",recentEventDescription:"Descripción de la última actuación",
  monitoringMode:"Modo de seguimiento",followedSince:"Inicio del seguimiento",followedAt:"Fecha de seguimiento",baselineAt:"Fecha de antecedentes iniciales",trackingMode:"Modo de seguimiento",
  sourceActId:"Referencia de la actuación",sourceActDate:"Fecha de la actuación",sourceActDescription:"Actuación de origen",concurrent:"Gestiones concurrentes",
  trigger:"Antecedente necesario",triggerDate:"Fecha del antecedente",deadline:"Plazo",dueDate:"Vencimiento",due_date:"Vencimiento informado",dueAt:"Vencimiento",
  evidence:"Antecedentes",basis:"Fundamento",documents:"Documentos",notifiedAt:"Fecha de notificación",notificationDate:"Fecha de notificación",effectiveDate:"Fecha de efecto",finalityDate:"Fecha de ejecutoria",
  updated_at:"Última actualización",json_fetched_at:"Fecha de consulta a la fuente",seq:"Orden",event_id:"Referencia de la actuación",event_date:"Fecha de la actuación",status_code:"Código de actuación",status_description:"Descripción de la actuación",observation:"Observación",
  protection_description:"Descripción de protección",outcome:"Resultado de la clase",
};
export function reportFieldLabel(path: string) {
  return path.split(".").map(key => labels[key] ?? key.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/_/g," ")).join(" · ");
}
// Arrays retain all entries in a single selectable column. No source field is dropped.
export function flattenReportData(data: unknown, prefix: string, target: Record<string,unknown>) {
  if (data && typeof data === "object" && !Array.isArray(data) && !(data instanceof Date)) {
    const entries = Object.entries(data);
    if (!entries.length) target[prefix] = {};
    for (const [key,value] of entries) flattenReportData(value, `${prefix}.${key}`, target);
  } else target[prefix] = data;
}
export function completeReportFields(rows: ClientReportRow[]) {
  const keys = new Set(rows.flatMap(row => Object.keys(row.values)));
  const base = REPORT_FIELDS.filter(field => keys.has(field.key));
  const existing = new Set(base.map(field => field.key));
  return [...base,...[...keys].filter(key => !existing.has(key)).sort().map(key => ({
    key, label:reportFieldLabel(key.replace(/^(source|portfolio)\./,"")),
    group:key.startsWith("source.") ? "Información completa de INAPI" : "Información completa del seguimiento",
  }))];
}
export function reportValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") return JSON.stringify(value,null,2);
  return String(value);
}
export const CLIENT_REPORT_FORMATS = {
  xlsx: { extension:"xlsx", contentType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  docx: { extension:"docx", contentType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  pdf: { extension:"pdf", contentType:"application/pdf" },
} as const;
export type ClientReportFormat = keyof typeof CLIENT_REPORT_FORMATS;
export async function createClientReport(report: ClientReport, selected: string[], format: ClientReportFormat): Promise<Uint8Array> {
  const wanted = new Set(selected), fields = report.fields.filter(field => wanted.has(field.key));
  if (!fields.length || fields.length !== wanted.size) throw new Error("Selecciona columnas disponibles para este cliente.");
  const date = new Intl.DateTimeFormat("es-CL",{dateStyle:"long",timeZone:"America/Santiago"}).format(new Date());
  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook(); workbook.creator="Buho Marc"; workbook.created=new Date();
    const sheet = workbook.addWorksheet("Marcas del cliente",{views:[{state:"frozen",ySplit:1}]});
    sheet.columns = fields.map(field => ({header:field.label,key:field.key,width:field.key==="name"?32:26}));
    let details: ExcelJS.Worksheet | undefined;
    for (const [index,row] of report.rows.entries()) {
      const values:Record<string,string> = {};
      for (const field of fields) {
        const value = reportValue(row.values[field.key]);
        if (value.length <= 32767) values[field.key]=value;
        else {
          if (!details) { details=workbook.addWorksheet("Contenido extenso"); details.columns=[{header:"Fila de marca",key:"row",width:18},{header:"Columna",key:"field",width:35},{header:"Parte",key:"part",width:10},{header:"Contenido",key:"value",width:100}]; }
          const chunks = Math.ceil(value.length/32000);
          for (let part=0;part<chunks;part++) details.addRow({row:index+2,field:field.label,part:part+1,value:value.slice(part*32000,(part+1)*32000)});
          values[field.key]=`Ver hoja «Contenido extenso», fila de marca ${index+2}, ${chunks} partes.`;
        }
      }
      const added = sheet.addRow(values); added.alignment={vertical:"top",wrapText:true};
      if (index%2===0) added.eachCell(cell => {cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F2FA"}};});
    }
    sheet.getRow(1).height=34; sheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"},size:11};
    sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF553367"}};
    sheet.getRow(1).alignment={vertical:"middle",wrapText:true};
    if(report.rows.length) sheet.autoFilter={from:{row:1,column:1},to:{row:report.rows.length+1,column:fields.length}};
    return new Uint8Array(await workbook.xlsx.writeBuffer());
  }
  if (format === "docx") {
    const body: Paragraph[] = [
      new Paragraph({text:"Informe de cliente",heading:HeadingLevel.TITLE}),
      new Paragraph({text:report.client.name,heading:HeadingLevel.HEADING_1}),
      new Paragraph({text:`${date} · ${report.rows.length} expedientes`,spacing:{after:280}}),
    ];
    for (const [index,row] of report.rows.entries()) {
      body.push(new Paragraph({text:`${index+1}. ${row.title}`,heading:HeadingLevel.HEADING_2,keepNext:true}));
      for(const field of fields) {
        body.push(new Paragraph({children:[new TextRun({text:field.label,bold:true,color:"674078"})],keepNext:true,spacing:{before:120,after:50}}));
        for(const line of (reportValue(row.values[field.key]) || "No informado").split("\n")) body.push(new Paragraph({text:line,spacing:{after:80}}));
      }
    }
    return new Uint8Array(await Packer.toBuffer(new Document({title:`Informe de cliente · ${report.client.name}`,creator:"Buho Marc",sections:[{children:body}]})));
  }
  const pdf=await PDFDocument.create(); pdf.setTitle(`Informe de cliente · ${report.client.name}`); pdf.setAuthor("Buho Marc"); pdf.setLanguage("es-CL");
  const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let page=pdf.addPage([595.28,841.89]),y=786,unknownGlyph=false;
  const safe=(s:string)=>Array.from(s.replace(/\t/g,"    ")).map(c=>{try{regular.encodeText(c);return c;}catch{unknownGlyph=true;return "?";}}).join("");
  function line(text:string,size=10,strong=false) {
    if(y<62){page=pdf.addPage([595.28,841.89]);y=786;}
    page.drawText(text,{x:48,y,size,font:strong?bold:regular,color:strong?rgb(.35,.20,.43):rgb(.20,.15,.23)});y-=size*1.5;
  }
  function paragraph(value:string,size=10,strong=false) {
    const font=strong?bold:regular;
    for(const original of safe(value).split("\n")) {
      let current="";
      for(const char of original){if(font.widthOfTextAtSize(current+char,size)>499){line(current,size,strong);current="";}current+=char;}
      line(current,size,strong);
    }
    y-=6;
  }
  paragraph("Informe de cliente",22,true);paragraph(report.client.name,17,true);paragraph(`${date} · ${report.rows.length} expedientes`);y-=14;
  for(const [index,row] of report.rows.entries()) {paragraph(`${index+1}. ${row.title}`,14,true);for(const field of fields){paragraph(field.label,10,true);paragraph(reportValue(row.values[field.key]) || "No informado");}y-=18;}
  const originals=report.rows.map(row=>Object.fromEntries(fields.map(field=>[field.label,row.values[field.key]??null])));
  // Preserve the exact Unicode contents, including scripts outside the standard PDF font.
  await pdf.attach(new TextEncoder().encode(JSON.stringify({cliente:report.client.name,columnas:fields.map(f=>f.label),expedientes:originals},null,2)),"datos-del-informe.json",{mimeType:"application/json",description:"Datos completos de las columnas seleccionadas"});
  if(unknownGlyph) paragraph("Algunos caracteres requieren otra tipografía. Su escritura original está en el archivo de datos adjunto al PDF.",9);
  const pages=pdf.getPages();for(const [index,p] of pages.entries())p.drawText(`${index+1} / ${pages.length}`,{x:500,y:30,size:8,font:regular,color:rgb(.6,.5,.65)});
  return pdf.save();
}
