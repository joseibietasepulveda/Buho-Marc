// Local transport fallback only. API keys go through stdin, never command arguments/files.
import {spawn} from 'node:child_process';import {writeFile,unlink} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import path from 'node:path';
export function pilotCurlFetcher(directory) {
 return async (url,init={}) => {
  if(!['https://openrouter.ai/api/v1/key','https://openrouter.ai/api/v1/chat/completions'].includes(String(url)))throw new Error('Solo API OpenRouter autorizada');
  const bodyFile=init.body ? path.join(directory,`request-${randomUUID()}.private.json`) : null;
  if(bodyFile)await writeFile(bodyFile,String(init.body),{mode:0o600});
  const quoted=s=>`"${String(s).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('\n','')}"`;
  const config=[`url = ${quoted(url)}`,`request = ${quoted(init.method||'GET')}`,...Object.entries(init.headers||{}).map(([k,v])=>`header = ${quoted(`${k}: ${v}`)}`),...(bodyFile?[`data-binary = ${quoted('@'+bodyFile)}`]:[])].join('\n')+'\n';
  try {
   const result=await new Promise((resolve,reject)=>{
    const child=spawn('/usr/bin/curl',['--ipv4','--http1.1','--connect-timeout','5','--config','-','--silent','--show-error','--max-time','60','--write-out','\n%{http_code}'],{stdio:['pipe','pipe','pipe']});
    const parts=[];let bytes=0;child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>2*1024*1024)child.kill('SIGTERM');else parts.push(chunk);});child.stderr.on('data',()=>{});
    const abort=()=>child.kill('SIGTERM');init.signal?.addEventListener('abort',abort,{once:true});
    child.on('error',reject);child.on('close',code=>{init.signal?.removeEventListener('abort',abort);resolve({code,output:Buffer.concat(parts).toString()});});child.stdin.end(config);
   });
   if(result.code!==0)throw new TypeError('No se confirmó la respuesta de OpenRouter',{cause:{code:result.code===6?'ENOTFOUND':'CURL_TRANSPORT'}});
   const end=result.output.lastIndexOf('\n'),status=Number(result.output.slice(end+1));if(!status)throw new TypeError('No se confirmó HTTP',{cause:{code:'CURL_TRANSPORT'}});
   return new Response(result.output.slice(0,end),{status,headers:{'content-type':'application/json'}});
  } finally {if(bodyFile)await unlink(bodyFile).catch(()=>{});}
 };
}
