import sharp from "sharp";
import { withSession } from "@/lib/auth";
export const runtime = "nodejs";
// Only the documented image host, never an arbitrary URL or a redirect.
export const GET = withSession(async request => {
  let url: URL;
  try { url = new URL(new URL(request.url).searchParams.get("url") ?? ""); }
  catch { return new Response(null,{status:400}); }
  if (url.protocol !== "https:" || url.hostname !== "marcas.dequienes.cl" || url.port || url.username || url.password) return new Response(null,{status:400});
  try {
    const response=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(12000),next:{revalidate:86400}});
    if (!response.ok || !/^image\/(png|jpeg|webp|gif)(;|$)/i.test(response.headers.get("content-type")??"")) throw new Error();
    const reader=response.body?.getReader(); if(!reader) throw new Error();
    const chunks:Uint8Array[]=[]; let size=0;
    for(;;) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8*1024*1024){await reader.cancel();throw new Error();}chunks.push(value);}
    const image=await sharp(Buffer.concat(chunks),{limitInputPixels:20000000}).resize({width:600,height:450,fit:"inside",withoutEnlargement:true}).png().toBuffer();
    return new Response(new Uint8Array(image),{headers:{"content-type":"image/png","cache-control":"private, max-age=3600","x-content-type-options":"nosniff"}});
  } catch { return new Response(null,{status:502,headers:{"cache-control":"no-store"}}); }
});
