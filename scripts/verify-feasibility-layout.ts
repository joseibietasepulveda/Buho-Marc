// Regenerates both formats from a saved search. Never starts a new search or LLM call.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createFeasibilityReport } from '../lib/feasibility-report';
import { createFeasibilityDocx } from '../lib/feasibility-docx';
import { conclusionInputSchema, deterministicConclusion } from '../lib/feasibility-conclusion';
import { EMPTY_REPORT_PROFILE } from '../lib/report-profile';
import { REPORT_PROFILE_PRESETS } from '../lib/report-profile-presets';
import { selectReportHits } from '../lib/report-selection';
import { filterFeasibility } from '../lib/feasibility-policy';
import type { SimilarityResult } from '../lib/similarity-contract';
import sharp from 'sharp';
const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) throw new Error('Indica la consulta JSON guardada y la carpeta de salida.');
const result: SimilarityResult = JSON.parse(await readFile(sourcePath,'utf8'));
result.results=filterFeasibility(result.results,'registered');
const proposal={name:'Skittles Sour',coverage:[{nice_class:30,text:'Caramelos y productos de confitería.'}],grouped:true};
const input=conclusionInputSchema.parse({proposal,result});
const conclusion=deterministicConclusion(input);
const logo=await readFile('public/reports/studio-logo.png');
await mkdir(outputPath+'/images',{recursive:true});
const images:Record<string,Uint8Array>={};
for (const hit of selectReportHits(result.results)) {
  try {images[hit.applicationId]=await readFile(outputPath+'/images/'+hit.applicationId+'.png');continue;} catch { /* Fetch the source only when it is not cached. */ }
  if(!hit.image.startsWith('https://marcas.dequienes.cl/'))continue;
  try {
    const response=await fetch(hit.image,{redirect:'error',signal:AbortSignal.timeout(12000)});
    if(response.ok)images[hit.applicationId]=await sharp(Buffer.from(await response.arrayBuffer()),{limitInputPixels:20000000}).resize({width:600,height:400,fit:'inside'}).png().toBuffer();
    if(images[hit.applicationId])await writeFile(outputPath+'/images/'+hit.applicationId+'.png',images[hit.applicationId]);
  } catch { console.log('Imagen no disponible: '+hit.applicationId); }
}
await mkdir(outputPath,{recursive:true});
const profile={...EMPTY_REPORT_PROFILE,studioName:'Estudio Jurídico de Ejemplo',address:'Av. Providencia 1234, oficina 505, Santiago',lawyerName:'Abogada de Ejemplo',email:'contacto@ejemplo.cl',phone:'+56 9 1234 5678',website:'https://ejemplo.cl'};
const variants=[
  {id:'con-estudio',studioProfile:profile,studioLogo:logo,conclusion},
  {id:'sin-estudio',studioProfile:EMPTY_REPORT_PROFILE,conclusion},
  {id:'texto-extenso',studioProfile:{...profile,studioName:'Estudio Jurídico de Ejemplo con una denominación extensa para revisar el espacio disponible en el documento',address:'Av. Providencia 1234, oficina 505, piso 5, edificio de oficinas, comuna de Providencia, Región Metropolitana, Chile. Atención presencial con cita previa y correspondencia en la recepción del edificio.'},studioLogo:logo,conclusion:{...conclusion,paragraphs:Array.from({length:6},()=>conclusion.paragraphs.join(' '))}},
];
for(const preset of REPORT_PROFILE_PRESETS)variants.push({id:preset.slug,studioProfile:preset.profile,studioLogo:preset.logoPath ? await readFile(preset.logoPath) : undefined,conclusion});
for(const variant of variants){
  const options={...variant,result,proposal,status:'all' as const,resultImages:images,client:'Cliente de Ejemplo'};
  await writeFile(`${outputPath}/${variant.id}.pdf`,await createFeasibilityReport(options));
  await writeFile(`${outputPath}/${variant.id}.docx`,new Uint8Array(await (await createFeasibilityDocx(options)).arrayBuffer()));
}
console.log(JSON.stringify({outputPath,variants:variants.map(value=>value.id),results:result.results.length,images:Object.keys(images).length}));
