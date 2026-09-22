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
const result = await searchSimilar({ ...proposal, limit: 50, include: ['coverage','label_description','protection'] }, new File([new Uint8Array(image)], '24033.png', { type: 'image/png' }));
await mkdir('output/pdf', { recursive: true });
await writeFile('output/pdf/prefactibilidad-skittles-sour-consulta.json', JSON.stringify(result,null,2));
const bytes = await createFeasibilityReport({ result, proposal, status: 'all', image, imageType: 'png', client: 'Ejemplo de presentación al cliente', author: 'Buho Marc' });
await writeFile('output/pdf/prefactibilidad-skittles-sour.pdf', bytes);
console.log(JSON.stringify({ results: result.results.length, fetchedAt: result.fetchedAt, output: 'output/pdf/prefactibilidad-skittles-sour.pdf' }));
