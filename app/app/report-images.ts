import { safeImage, type SimilarityHit } from "@/lib/similarity-contract";
export async function reportImages(hits:SimilarityHit[]) {
  const images:Record<string,Uint8Array>={}, missing:string[]=[];
  let index=0; const deadline=Date.now()+45000;
  await Promise.all(Array.from({length:Math.min(4,hits.length)},async()=>{
    for(;;){
      const hit=hits[index++]; if(!hit) return;
      const src=safeImage(hit.image); if(!src) continue;
      if(Date.now()>=deadline){missing.push(hit.name);continue;}
      try {
        const response=await fetch(src.startsWith("/") ? src : `/api/similarity/image?url=${encodeURIComponent(src)}`,{signal:AbortSignal.timeout(Math.min(16000,Math.max(1,deadline-Date.now())))});
        if(!response.ok) throw new Error();
        const bitmap=await createImageBitmap(await response.blob());
        try {
          const scale=Math.min(1,600/Math.max(bitmap.width,bitmap.height));
          const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
          const context=canvas.getContext("2d");if(!context)throw new Error();
          context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
          const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error()),"image/png"));
          images[hit.applicationId]=new Uint8Array(await blob.arrayBuffer());
        } finally {bitmap.close();}
      } catch {missing.push(hit.name);}
    }
  }));
  return {images,missing};
}
