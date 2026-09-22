// Generates the same PDF as the app from one real, bounded proposal search.
// Usage: SOURCE_PROVIDER=inapi INAPI_API_KEY=... node --import ./tests/ts-loader.mjs scripts/example-feasibility-report.ts /path/image.png
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { searchSimilar } from '../lib/similarity-provider';
import { createFeasibilityReport } from '../lib/feasibility-report';
import sharp from 'sharp';
import type {SimilarityResult} from "../lib/similarity-contract";
import {feasibilityStatus} from "../lib/feasibility-policy";
import {selectReportHits} from '../lib/report-selection';
const imagePath = process.argv[2];
if (!imagePath) throw new Error('Indica la imagen de ejemplo.');
const image = await sharp(await readFile(imagePath)).png().toBuffer();
const proposal = { name: 'Skittles Sour', coverage: [{ nice_class: 30, text: 'Caramelos y productos de confitería.' }], grouped: false };
// --cached regenerates the presentation without querying or paying the source again.
const result:SimilarityResult = process.argv.includes('--cached')
  ? JSON.parse(await readFile('output/pdf/prefactibilidad-skittles-sour-consulta.json','utf8'))
  : await searchSimilar({ ...proposal, limit: 50, include: ['coverage','label_description','protection'] }, new File([new Uint8Array(image)], '24033.png', { type: 'image/png' }));
await mkdir('output/pdf', { recursive: true });
if (!process.argv.includes('--cached')) await writeFile('output/pdf/prefactibilidad-skittles-sour-consulta.json', JSON.stringify(result,null,2));
result.searchScope={retrieved:result.results.length,limit:50,states:['registered','pending'],minSimilarity:0};
result.results=result.results.filter(hit=>['registered','pending'].includes(feasibilityStatus(hit)));
const studioLogo = await readFile('public/reports/studio-logo.png');
const resultImages:Record<string,Uint8Array>={};
await Promise.all(selectReportHits(result.results).map(async hit=>{
  if(!hit.image?.startsWith('https://marcas.dequienes.cl/'))return;
  try {
    const response=await fetch(hit.image,{redirect:'error',signal:AbortSignal.timeout(12000)});
    if(response.ok) resultImages[hit.applicationId]=await sharp(Buffer.from(await response.arrayBuffer()),{limitInputPixels:20000000}).resize({width:600,height:450,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  } catch {console.log('Imagen no disponible: '+hit.name);}
}));
const bytes = await createFeasibilityReport({ result, resultImages, proposal, status: 'all', image, imageType: 'png', studioLogo, author: 'Estudio Jurídico', recommendation: 'review', explanation: 'La búsqueda muestra marcas SKITTLES informadas como registradas para caramelos y confitería, los mismos productos de esta propuesta. Antes de avanzar, conviene confirmar su situación actual y revisar si corresponde mantener el nombre o buscar una alternativa.' });
await writeFile('output/pdf/prefactibilidad-skittles-sour.pdf', bytes);
console.log(JSON.stringify({ results: result.results.length, fetchedAt: result.fetchedAt, output: 'output/pdf/prefactibilidad-skittles-sour.pdf' }));
