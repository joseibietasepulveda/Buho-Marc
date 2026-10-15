// Visual QA only: fictitious evidence and an explicitly authored conclusion; no source/model requests.
import { mkdir,writeFile } from 'node:fs/promises';
import { createFeasibilityReport } from '../lib/feasibility-report.ts';
import { createFeasibilityDocx } from '../lib/feasibility-docx.ts';
const output=process.env.BUHO_REPORT_OUTPUT||'output/mejoras-2026-10-15';await mkdir(output,{recursive:true});
const mark={applicationId:'7700888',registrationId:null,name:'NUBE TALLER',type:'Denominativa',image:'',holders:[{name:'Titular ficticio'}],classes:[{nice_class:8,coverage_text:'Herramientas manuales para talleres'}],filedAt:'2026-10-01',publishedAt:null,registeredAt:null,status:'En trámite',statusCode:'ET',score:.81,channels:{},history:[]};
const proposal={name:'NUBE',niceClass:7,coverage:[{nice_class:7,text:'Máquinas herramientas para talleres'}],includeRelatedClasses:true,relatedClasses:[8],grouped:true};
const result={query:{...mark,applicationId:'',name:'NUBE'},results:[mark],groups:[],candidateCount:1,elapsedSeconds:0,fetchedAt:'2026-10-15T12:00:00Z',warnings:[]};
const conclusion={source:'author',decision:'moderate',recommendation:'review',title:'Se recomienda presentar con riesgo moderado de oposición',evidenceApplicationIds:['7700888'],paragraphs:[
 'Ejemplo ficticio para revisión visual. La coincidencia detectada corresponde a la clase vinculada 8, frente a las máquinas herramientas propuestas en clase 7. Debe revisarse si los productos comparten finalidad, consumidores y canales de comercialización.',
 'El artículo 20 letra h) de la Ley de Propiedad Industrial exige examinar la semejanza de los signos y la relación entre sus productos. La coincidencia en NUBE justifica revisar las coberturas; pertenecer a clases distintas no elimina por sí solo el riesgo de confusión.',
 'También corresponde examinar la distintividad conforme a los artículos 19 y 20 letra e). Con la cobertura ficticia indicada no se identifica una descripción directa del producto. Se recomienda presentar con riesgo moderado de oposición.'
]};
const input={proposal,result,status:'all',audience:'study',layout:'table',selectedIds:['7700888'],analyses:[{proposal,result,selectedIds:['7700888'],conclusion}],client:'Cliente ficticio · revisión visual',author:'Ejemplo redactado para QA'};
await writeFile(`${output}/informe-ejemplo.pdf`,await createFeasibilityReport(input));await writeFile(`${output}/informe-ejemplo.docx`,Buffer.from(await(await createFeasibilityDocx(input)).arrayBuffer()));console.log('Fictitious PDF/Word exported without inference.');
