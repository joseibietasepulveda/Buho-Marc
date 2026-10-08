/** A compact class list, with complete coverage grouped only when its text is identical. */
export function reportCoverage(classes:readonly {nice_class:number;coverage_text?:string|null}[]){
 const groups=new Map<string,number[]>();
 for(const item of classes){
  const text=item.coverage_text?.trim()||'Productos o servicios no informados';
  groups.set(text,[...new Set([...(groups.get(text)||[]),item.nice_class])]);
 }
 return [
  {label:'Clases de Niza',value:[...new Set(classes.map(c=>c.nice_class))].join(', ')||'No informadas'},
  ...Array.from(groups,([value,numbers])=>({label:`Cobertura · ${numbers.length===1?'Clase':'Clases'} ${numbers.join(', ')}`,value})),
 ];
}
