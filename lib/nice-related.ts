/** INAPI 2026, Marcas previas en Chile, §§ 8–15, pp. 12–14.
 * Search expansion only: these examples are conditional and not exhaustive. */
export const RELATED_CLASSES_VERSION = 'inapi-2026-10-15';
export const RELATED_CLASSES_URL = 'https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/aspectos-sustantivos/42---tercera-parte---aspectos-sustantivos---marcas-previas-en-chile-docx.pdf?sfvrsn=b9267d1c_2#page=12';
export const RELATED_CLASS_RULES = [
  { a: 1, b: 5, reason: 'Químicos agrícolas, fertilizantes y productos para controlar plagas.' },
  { a: 3, b: 21, reason: 'Higiene bucal y utensilios complementarios de higiene personal.' },
  { a: 5, b: 10, reason: 'Productos sanitarios y aparatos médicos u odontológicos.' },
  { a: 5, b: 44, reason: 'Productos y servicios médicos, veterinarios o de salud; revisar su especialidad.' },
  { a: 6, b: 19, reason: 'Materiales y construcciones metálicos y no metálicos.' },
  { a: 7, b: 8, reason: 'Máquinas herramientas y herramientas manuales con finalidad común.' },
  { a: 9, b: 12, reason: 'Cascos, seguridad o tecnología para vehículos y los vehículos correspondientes.' },
  { a: 9, b: 41, reason: 'Contenidos digitales o educativos y servicios de formación o entretenimiento.' },
  { a: 9, b: 42, reason: 'Software y servicios de desarrollo, mantenimiento o provisión de software.' },
  { a: 41, b: 42, reason: 'Capacitación e ingeniería vinculadas al software; caso PUENTE FULCRUM.' },
  { a: 32, b: 33, reason: 'Bebidas con canales de venta, consumidores y ocasiones de consumo relacionados.' },
  ...Array.from({ length: 34 }, (_, index) => ({ a: index + 1, b: 35, reason: 'Comercialización de los productos específicos de esta clase; no de todo tipo de productos.' })),
];
export function relatedClassOptions(selected: number[]) {
  const found = new Map<number, string[]>();
  for (const rule of RELATED_CLASS_RULES) {
    const number = selected.includes(rule.a) ? rule.b : selected.includes(rule.b) ? rule.a : undefined;
    if (number === undefined || selected.includes(number)) continue;
    found.set(number, [...(found.get(number) ?? []), rule.reason]);
  }
  return [...found].sort(([a], [b]) => a - b).map(([number, reasons]) => ({ number, reason: [...new Set(reasons)].join(' ') }));
}
export type SearchClassScope = { coverage: { nice_class: number }[]; includeRelatedClasses?: boolean; relatedClasses?: number[] };
export function searchClasses(proposal: SearchClassScope) {
  const primary = proposal.coverage.map(c => c.nice_class);
  if (!primary.length) return [];
  const allowed = new Set(relatedClassOptions(primary).map(c => c.number));
  return [...new Set([...primary, ...(proposal.includeRelatedClasses ? (proposal.relatedClasses ?? []).filter(c => allowed.has(c)) : [])])].sort((a, b) => a - b);
}
export function classScopeText(proposal: SearchClassScope) {
  const primary = proposal.coverage.map(c => c.nice_class);
  if (!primary.length) return 'Búsqueda sin restricción por clase de Niza.';
  const related = searchClasses(proposal).filter(c => !primary.includes(c));
  return `Clases seleccionadas: ${primary.join(', ')}. ${related.length ? `Clases vinculadas incluidas: ${related.join(', ')}. La relación se evalúa según los productos o servicios concretos.` : 'No se incluyeron clases vinculadas.'}`;
}
