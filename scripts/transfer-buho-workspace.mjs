import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import postgres from 'postgres';
import { importWorkspace } from '../lib/workspace-transfer.mjs';

const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--'));
if(!file || args.some(a=>a.startsWith('--')&&!['--apply','--local-test'].includes(a)))throw Error('Uso: transfer-buho-workspace.mjs archivo.ndjson.gz [--apply] [--local-test]');
const local=args.includes('--local-test');
if(local && !['127.0.0.1','localhost'].includes(new URL(process.env.DATABASE_URL).hostname))throw Error('El ensayo requiere base local');
const sql=postgres(process.env.DATABASE_URL,{max:1,prepare:false});
async function* records(){
  const stream=createInterface({input:createReadStream(file).pipe(createGunzip()),crlfDelay:Infinity});
  try{for await(const line of stream)yield JSON.parse(line);}finally{stream.close();}
}
try{
  const result=await importWorkspace(sql,records(),local?'local-test':process.env.RAILWAY_ENVIRONMENT_ID,{apply:args.includes('--apply'),progress:row=>console.log(JSON.stringify({progress:row}))});
  console.log('RESULT_START'+JSON.stringify(result)+'RESULT_END');
}finally{await sql.end();}
