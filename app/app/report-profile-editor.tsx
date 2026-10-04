"use client";
import { useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { Buildings, UploadSimple, X } from '@phosphor-icons/react';
import { reportProfileSchema, type SavedReportProfile } from '@/lib/report-profile';
import { ReviewDialog } from './review-dialog';

export function ReportProfileLauncher({ saved, loading, error, onOpen }: { saved: SavedReportProfile | null; loading: boolean; error: string; onOpen: () => void }) {
  return <div className="report-profile-launcher">
    <button type="button" className="report-profile-open" onClick={onOpen} disabled={loading}>
      <span className="report-profile-launcher-icon"><Buildings size={24} aria-hidden /></span>
      <span><strong>Agregar la información de tu estudio</strong><small>{loading ? 'Cargando los datos guardados…' : saved?.profile.studioName ? `${saved.profile.studioName} · Editar datos y logo` : 'Personaliza tus informes. Datos opcionales que quedan guardados.'}</small></span>
    </button>
    {error && <span role="alert">{error}</span>}
  </div>;
}
export function ReportProfileEditor({ saved, onSaved, onClose }: { saved: SavedReportProfile; onSaved: (value: SavedReportProfile) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(saved.profile), [busy, setBusy] = useState(false), [logoBusy, setLogoBusy] = useState(false), [error, setError] = useState('');
  const logoInput = useRef<HTMLInputElement>(null);
  const working = busy || logoBusy;
  async function chooseLogo(file?: File) {
    if (!file) return;
    setError('');
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) { setError('Usa un archivo PNG, JPEG o WebP de hasta 4 MiB.'); return; }
    setLogoBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width * bitmap.height > 20000000) throw new Error('El logo es demasiado grande. Usa una imagen de hasta 20 megapíxeles.');
        const scale = Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width*scale); canvas.height = Math.round(bitmap.height*scale);
        const context = canvas.getContext('2d'); if (!context) throw new Error('No pudimos preparar el logo.');
        context.drawImage(bitmap,0,0,canvas.width,canvas.height);
        const logo = canvas.toDataURL('image/png');
        if (logo.length > 1400000) throw new Error('El logo tiene demasiado detalle. Prueba con una imagen más pequeña.');
        setDraft(current=>({...current,logo}));
      } finally { bitmap.close(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos abrir el logo.'); }
    finally { setLogoBusy(false); if (logoInput.current) logoInput.current.value=''; }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const parsed = reportProfileSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues.map(issue=>issue.message).join(' ')); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/report-profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:parsed.data,version:saved.version})});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message||'No pudimos guardar los datos del estudio.');
      onSaved(payload); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar los datos.'); }
    finally { setBusy(false); }
  }
  return <ReviewDialog title="Información de tu estudio" eyebrow="TUS INFORMES" className="report-profile-dialog" onClose={()=>{if(!working)onClose();}}>
    <form onSubmit={save}>
      <div className="report-profile-content"><p>Elige la información que quieres mostrar en PDF y Word. Puedes dejar cualquier campo vacío y volver a editarlo cuando quieras.</p>
        <fieldset disabled={working} className="report-profile-fields"><legend className="buho-sr-only">Datos opcionales del estudio</legend>
          <label className="report-profile-wide">Nombre del estudio<input value={draft.studioName} maxLength={180} placeholder="Nombre que aparecerá en el informe" onChange={e=>setDraft(current=>({...current,studioName:e.target.value}))}/></label>
          <label className="report-profile-wide">Dirección<textarea value={draft.address} maxLength={500} rows={2} placeholder="Calle, número, oficina y ciudad" onChange={e=>setDraft(current=>({...current,address:e.target.value}))}/></label>
          <label className="report-profile-wide">Nombre del abogado<input value={draft.lawyerName} maxLength={160} placeholder="Quien prepara el informe" onChange={e=>setDraft(current=>({...current,lawyerName:e.target.value}))}/></label>
          <label className="report-profile-wide">Información adicional del encabezado<textarea value={draft.headerText} maxLength={500} rows={3} placeholder="Por ejemplo, los nombres de los socios del estudio" onChange={e=>setDraft(current=>({...current,headerText:e.target.value}))}/></label>
          <label>Correo de contacto<input type="email" value={draft.email} maxLength={180} placeholder="correo@estudio.cl" onChange={e=>setDraft(current=>({...current,email:e.target.value}))}/></label>
          <label>Teléfono<input type="tel" value={draft.phone} maxLength={80} placeholder="+56 9…" onChange={e=>setDraft(current=>({...current,phone:e.target.value}))}/></label>
          <label className="report-profile-wide">Sitio web<input type="url" value={draft.website} maxLength={300} placeholder="https://tuestudio.cl" onChange={e=>setDraft(current=>({...current,website:e.target.value}))}/></label>
        </fieldset>
        <div className="report-profile-logo"><div className="report-profile-logo-preview">{draft.logo ? <Image unoptimized src={draft.logo} width={150} height={90} alt="Logo que aparecerá en el informe"/> : <Buildings size={34} aria-hidden/>}</div>
          <div><strong>Logo del estudio</strong><p>PNG, JPEG o WebP · hasta 4 MiB</p><input ref={logoInput} type="file" aria-label="Subir logo del estudio" accept="image/png,image/jpeg,image/webp" className="buho-sr-only" disabled={working} onChange={e=>void chooseLogo(e.target.files?.[0])}/><div className="report-profile-logo-actions"><button type="button" disabled={working} onClick={()=>logoInput.current?.click()}><UploadSimple size={18} aria-hidden/>{logoBusy ? 'Preparando logo…' : draft.logo ? 'Cambiar logo' : 'Subir logo'}</button>{draft.logo && <button type="button" disabled={working} onClick={()=>setDraft(current=>({...current,logo:''}))}><X size={16} aria-hidden/>Quitar logo</button>}</div></div>
        </div>
        {error && <p role="alert" className="similarity-error">{error}</p>}
        <p className="watch-help">Los datos se guardan para tu estudio y se reutilizan en sus próximos informes.</p>
      </div><footer><button type="button" disabled={working} onClick={onClose}>Cancelar</button><button type="submit" className="buho-primary" disabled={working}>{busy ? 'Guardando…' : 'Guardar información'}</button></footer>
    </form>
  </ReviewDialog>;
}
