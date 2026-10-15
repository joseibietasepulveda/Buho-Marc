import { RELATED_CLASSES_URL, RELATED_CLASSES_VERSION } from './nice-related';
export const TRADEMARK_LEGAL_CONTEXT = {
  version: 'cl-lpi-2026-10-15',
  law: 'Ley 19.039, texto refundido DFL 4 de 2022',
  source: 'https://www.bcn.cl/leychile/navegar?i=1179684',
  guidelines: 'https://www.inapi.cl/marcas/directrices',
  coverageSource: RELATED_CLASSES_URL, coverageVersion: RELATED_CLASSES_VERSION,
  rules: [
    { article: '19', summary: 'La marca debe distinguir productos o servicios. Considerar distintividad adquirida por uso en el mercado nacional solo si hay antecedentes que la respalden.' },
    { article: '20 a)', summary: 'Denominaciones, siglas, banderas y emblemas de Estados, organizaciones internacionales y servicios públicos.' },
    { article: '20 b)', summary: 'Denominaciones técnicas, científicas, variedades vegetales y denominaciones terapéuticas respecto de su objeto.' },
    { article: '20 c)', summary: 'Nombre, seudónimo o retrato de persona natural: comprobar consentimiento y excepciones legales.' },
    { article: '20 d)', summary: 'Signos oficiales de control y distinciones: comprobar autorización o legitimación.' },
    { article: '20 e)', summary: 'Signos genéricos, descriptivos, de uso común o sin distintividad para los productos o servicios propuestos. Chocolate para chocolate exige revisar esta causal; la misma palabra no es genérica para todo producto.' },
    { article: '20 f)', summary: 'Signos que puedan engañar sobre procedencia, cualidad o género, incluyendo coberturas relacionadas en clases diferentes.' },
    { article: '20 g)', summary: 'Marcas notorias: verificar prueba de notoriedad y los requisitos legales, sin presumir fama.' },
    { article: '20 h)', summary: 'Signos iguales o semejantes confundibles con derechos anteriores sobre productos o servicios idénticos o similares. Relación de coberturas y riesgo de confusión deben justificarse; número de clase o cantidad de coincidencias no bastan.' },
    { article: '20 i)', summary: 'Color del producto o envase y color en sí mismo: examinar el signo concreto y la distintividad pertinente.' },
    { article: '20 j)', summary: 'Signos que induzcan a confusión respecto de indicaciones geográficas o denominaciones de origen protegidas.' },
    { article: '20 k)', summary: 'Orden público, moral, buenas costumbres, competencia leal y ética mercantil: analizar el contexto del signo, sin equiparar automáticamente una palabra informal con una prohibición.' },
    { article: '23', summary: 'Principio de especialidad. Evaluar naturaleza, finalidad, consumidores, canales, competencia y complementariedad de las coberturas concretas. Misma clase no prueba relación; clases diferentes no la excluyen.' },
  ],
  instruction: 'Revisa las causales aun si no hay coincidencias. Expón las pertinentes con artículo/letra y hechos del caso; no conviertas la lista en un diagnóstico automático. No inventes evidencia, jurisprudencia ni excepciones. Si falta cobertura, explica qué dato impide evaluar genericidad. La conclusión distingue coincidencias en clases seleccionadas y vinculadas y condiciona cualquier recomendación a esa evaluación.',
};
