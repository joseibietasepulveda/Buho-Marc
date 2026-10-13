# Traspaso: detalles útiles de actuaciones y renovación

- Actualizado: 2026-10-12 23:06, America/Santiago.
- Estado: integrado y verificado en Dev y producción.
- Rama y base: `codex/notificaciones-detalle-util`; Dev `04fd3288948107f4d1e371333e14707dd11c0864`.
- Entrega: [PR #45](https://github.com/joseibietasepulveda/Buho-Marc/pull/45), Dev `5d2f87c`; promoción selectiva [PR #46](https://github.com/joseibietasepulveda/Buho-Marc/pull/46), Main `17f401b`.

## Objetivo y alcance
Usuario aprobó eliminar desplegables que sólo repiten título/fecha y destacar datos de renovación antes del historial. Implementar en Dev y promover inmediatamente a Main. Mostrar observaciones, referencias y datos adicionales reales cuando existan; no reconstruir documentos ni consultar fuentes externas para enriquecer visualmente.

## Cambios y archivos relevantes
`app/app/notification-center.tsx` y CSS: lector inline/ampliado con desplegables condicionales y bloque de renovación. `lib/notification-evidence.ts`: filtro/deduplicación sólo visual, conserva valores distintos de encabezado y referencias. `lib/notification-timeline.ts:notificationSourceHistory`: campos del evento guardado; `db/demo.ts` los proyecta para marcas propias cuando existe el array de eventos, conservando configuración anterior si falta. `tests/notification-evidence.test.mjs`: seis regresiones de información, campos vacíos, referencias, correcciones y unión por ID. Guías UX/renovación actualizadas.

## Decisiones y motivos
Usuario: Dev y Main, sin interferir con cambios existentes. Agente: promoción selectiva desde Dev actualizado; diferencias actuales Dev/Main sólo documentales. No cambiar estados, carteras, datos guardados ni claves. Conservar versiones anteriores e IDs de eventos. No se consultará OpenRouter ni INAPI/DeQuiénEs.

## Coordinación e integración
Reutiliza checkout aislado y limpio de este chat; original intacto. Componentes compartidos de Notificaciones y respuesta `/api/demo`. Sin migración. Consumidores de `sourceHistory` conservan `date`/`title` y reciben campos adicionales opcionales del historial real guardado.

## Verificación
37 pruebas dirigidas aprobadas (evidencia, timeline, renovación, prioridades, importación, paginación y contrato de snapshot). ESLint y `npm run build -- --webpack` aprobados con TypeScript. TypeScript y ESLint repetidos después de añadir la guardia de historial ausente, aprobados. Dev y producción comprobados en navegador. Las pruebas usan fixtures, sin revisiones reales nuevas.

## Pendientes y siguiente paso
Sin pendientes funcionales. No se importa ni se fabrica un documento completo; el contenido de resoluciones requiere una fuente documental adicional. Se mantienen sólo los datos reales guardados disponibles.

## Integración y QA de Dev · 2026-10-12 23:01

- Railway Dev `8fb90ee7-188a-44b1-a3bc-64c16bbb63a1`, SHA `5d2f87c818da562a5e6906e927168c08b561d943`: SUCCESS; salud 200/base conectada. QA autenticada sobre datos guardados de renovación: lector inline y ampliado muestran registro, solicitud y vencimiento antes del historial. Al abrir una actuación, la referencia ID/código real aparece sin repetir título/fecha.
- Evidencia visual `outputs/notificacion-detalle-util-dev.jpg`, no versionada. Pruebas con fixtures comprueban ausencia de panel cuando sólo existe título/fecha, descripciones con referencia adicional, observaciones distintas, deduplicación, versiones corregidas y unión de evento crudo/proyectado por ID.
- Cherry-pick selectivo a Main limpio, sin conflictos. Ningún archivo de diferencias documentales ajenas se promovió. Código de Main y Dev vuelve a coincidir en `app/`, `db/`, `lib/`, `scripts/` y `tests/`.
- Un clic de QA produjo timeout de la conexión de navegador, pero la acción sí abrió el aviso; se inspeccionó el nuevo estado antes de seguir. No se repitió una operación de datos.

## Cierre de producción

- Railway producción `38765f8b-7189-41c6-b2e6-864061f1b698`, SHA `17f401b660446a4d6b31b5ba4621431537ca0466`: SUCCESS; salud 200/base conectada. Main contiene exclusivamente el cherry-pick de esta entrega además de su base anterior.
- QA autenticada del mismo aviso SKY señalado por el usuario: renovación destacada con registro/solicitud/vencimiento; 14 hitos conservados en el historial. La actuación del 3 de junio de 2022 muestra observación y referencias reales guardadas, sin repetir descripción ni fecha. Lector inline/ampliado correcto. No se modificó su estado de revisión.
- Capturas privadas revisadas: `outputs/renovacion-sky-produccion.jpg` y `outputs/referencias-sky-produccion.jpg`. No se versionan las capturas ni los datos personales del expediente.
- Sin consultas nuevas de QA a INAPI, DeQuiénEs u OpenRouter, sin cambios en las bases alojadas, sin claves/accesos temporales nuevos ni procesos locales de esta entrega. Configuración OpenRouter de producción conservada.
- 37 pruebas dirigidas aprobadas; build/TypeScript/ESLint aprobados; `git diff --check` aprobado. No se ejecutó la suite general de HTML: se verificaron los consumidores y contratos afectados, datos de fixture y lector desplegado en ambos ambientes.
