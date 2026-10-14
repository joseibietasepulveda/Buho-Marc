export function mark(id='9000101', name='ALBA', overrides={}) {
  return {applicationId:id,registrationId:null,name,type:'Denominativa',image:'',holders:[],classes:[{nice_class:9,coverage_text:'Programas informáticos descargables para gestión de inventario.'}],filedAt:'2026-10-01',publishedAt:null,registeredAt:null,status:'En trámite',statusCode:'P',...overrides};
}
export function cross(n=1, brandId='brand-1', overrides={}) {
  return {id:`CO-${n}`,matchId:`match-${n}`,brandId,reference:mark(),candidate:{...mark(String(9000200+n),`ALBA ${n}`),score:.95,channels:[],history:[]},score:.95,fetchedAt:'2026-10-12T11:00:00Z',...overrides};
}
export function payload(overrides={}) {
  return {runId:'10000000-0000-4000-8000-000000009001',organizationName:'Estudio de demostración',generatedAt:'2026-10-13T12:00:00Z',from:'2026-10-13',through:'2026-10-26',crosses:Array.from({length:10},(_,i)=>({...cross(i+1),reason:'ALBA coincide como núcleo distintivo y ambos cubren programas de gestión de inventario. Conviene revisar las coberturas y el conjunto.',insufficient:false})),agenda:Array.from({length:10},(_,i)=>({id:`task-${i}`,entityId:`CA-${i}`,entityType:'case',title:'Revisar antecedentes de la solicitud',context:`ALBA ${i+1} · Expediente de demostración`,date:`2026-10-${String(14+i).padStart(2,'0')}`,category:'task'})),evaluated:40,available:40,filteredLowScore:0,failures:0,limited:false,sourceReviewedAt:'2026-10-12T11:00:00Z',...overrides};
}
export function decision(id,show=true) {return {id,show,insufficient:false,sign_similarity:show?'relevant':'none',coverage_relation:'related',reason:show ? 'ALBA coincide; los programas de gestión se relacionan directamente.' : 'Los núcleos distintivos difieren y la composición no ofrece semejanza relevante.'};}
