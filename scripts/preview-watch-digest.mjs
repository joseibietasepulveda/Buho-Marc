// Synthetic visual fixture: no providers, secrets, client data or database access.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {digestEmail} from '../lib/watch-digest-email.ts';
import {digestHash} from '../lib/watch-digest.ts';
import {payload} from '../tests/fixtures/watch-digest.mjs';
const directory=path.resolve('outputs/correo-semanal');await mkdir(directory,{recursive:true});
const images=[];
for(const variant of ['ALBA','alba']) {
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180"><rect width="360" height="180" fill="white"/><circle cx="62" cy="90" r="25" fill="#849ea1"/><path d="M43 91L61 64 80 91 61 115Z" fill="#e8f1ec"/><text x="106" y="107" font-size="48" font-weight="600" font-family="Arial" fill="#4a3c61">${variant}</text></svg>`;
 const content=(await sharp(Buffer.from(svg)).jpeg().toBuffer()).toString('base64');images.push({key:digestHash(content),content});
}
const data=payload();data.crosses=data.crosses.map((c,i)=>({...c,reference:{...c.reference,type:'Mixta'},candidate:{...c.candidate,type:'Mixta'},referenceImage:images[0].key,candidateImage:images[i%2].key}));
const note='<div style="padding:12px;text-align:center;font:13px Arial;background:#fff2ce;color:#72552c">Vista de prueba · marcas y tareas ficticias · no se envió ningún correo. <a href="/sin-alertas.html">Ver semana sin alertas</a></div>';
await writeFile(path.join(directory,'index.html'),digestEmail(data,'http://127.0.0.1:4341',images,true).html.replace(/(<body[^>]*>)/,`$1${note}`));
await writeFile(path.join(directory,'sin-alertas.html'),digestEmail(payload({crosses:[],agenda:[]}), 'http://127.0.0.1:4341',[],true).html.replace(/(<body[^>]*>)/,`$1${note}`));
console.info(`Vista de prueba guardada en ${directory}`);
