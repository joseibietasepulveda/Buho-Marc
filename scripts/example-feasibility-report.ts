// Generates the same PDF as the app from one real, bounded proposal search.
// Usage: SOURCE_PROVIDER=inapi INAPI_API_KEY=... node --import ./tests/ts-loader.mjs scripts/example-feasibility-report.ts /path/image.png
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { searchSimilar } from '../lib/similarity-provider';
import { createFeasibilityReport } from '../lib/feasibility-report';
import sharp from 'sharp';
const imagePath = process.argv[2];
if (!imagePath) throw new Error('Indica la imagen de ejemplo.');
const image = await sharp(await readFile(imagePath)).png().toBuffer();
const proposal = { name: 'Skittles Sour', coverage: [{ nice_class: 30, text: 'Caramelos y productos de confitería.' }], grouped: false };
// --cached regenerates the presentation without querying or paying the source again.
const result = process.argv.includes('--cached')
  ? JSON.parse(await readFile('output/pdf/prefactibilidad-skittles-sour-consulta.json','utf8'))
  : await searchSimilar({ ...proposal, limit: 50, include: ['coverage','label_description','protection'] }, new File([new Uint8Array(image)], '24033.png', { type: 'image/png' }));
await mkdir('output/pdf', { recursive: true });
if (!process.argv.includes('--cached')) await writeFile('output/pdf/prefactibilidad-skittles-sour-consulta.json', JSON.stringify(result,null,2));
const studioLogo = await readFile('public/reports/studio-logo.png');
const bytes = await createFeasibilityReport({ result, proposal, status: 'all', image, imageType: 'png', studioLogo, author: 'Estudio Jurídico', recommendation: 'review', explanation: 'La búsqueda muestra marcas SKITTLES informadas como registradas para caramelos y confitería, los mismos productos de esta propuesta. Antes de avanzar, conviene confirmar su situación actual y revisar si corresponde mantener el nombre o buscar una alternativa.' });
await writeFile('output/pdf/prefactibilidad-skittles-sour.pdf', bytes);
console.log(JSON.stringify({ results: result.results.length, fetchedAt: result.fetchedAt, output: 'output/pdf/prefactibilidad-skittles-sour.pdf' }));
