"use client";
import { useEffect, useState } from 'react';
import { ReviewDialog } from './review-dialog';

/** Handles brand images even inside existing cards and table buttons. */
export function ImageLightbox() {
  const [image,setImage] = useState<{src:string;name:string} | null>(null);
  useEffect(()=>{
    function open(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && !['Enter',' '].includes(event.key)) return;
      const target = event.target;
      if (!(target instanceof HTMLImageElement) || target.closest('[data-no-zoom]') || !target.naturalWidth) return;
      event.preventDefault(); event.stopPropagation();
      setImage({src:target.currentSrc || target.src,name:target.alt || 'Imagen de la marca'});
    }
    document.addEventListener('click',open,true); document.addEventListener('keydown',open,true);
    return ()=>{ document.removeEventListener('click',open,true); document.removeEventListener('keydown',open,true); };
  },[]);
  // Full-resolution, already-loaded user/source image; no optimization request is needed.
  // eslint-disable-next-line @next/next/no-img-element
  return image && <ReviewDialog title={image.name} className="brand-image-dialog" onClose={()=>setImage(null)}><div data-no-zoom className="brand-image-full"><img src={image.src} alt={image.name}/></div><footer><button type="button" onClick={()=>setImage(null)}>Cerrar imagen</button></footer></ReviewDialog>;
}
