# Traspaso: detalles útiles de actuaciones y renovación

- Actualizado: 2026-10-12 22:52, America/Santiago.
- Estado: implementado y verificado localmente; pendiente integración y QA desplegada.
- Rama y base: `codex/notificaciones-detalle-util`; Dev `04fd3288948107f4d1e371333e14707dd11c0864`.
- PR y commit de entrega: pendiente.

## Objetivo y alcance
Usuario aprobó eliminar desplegables que sólo repiten título/fecha y destacar datos de renovación antes del historial. Implementar en Dev y promover inmediatamente a Main. Mostrar observaciones, referencias y datos adicionales reales cuando existan; no reconstruir documentos ni consultar fuentes externas para enriquecer visualmente.

## Cambios y archivos relevantes
`app/app/notification-center.tsx` y CSS: lector inline/ampliado con desplegables condicionales y bloque de renovación. `lib/notification-evidence.ts`: filtro/deduplicación sólo visual, conserva valores distintos de encabezado y referencias. `lib/notification-timeline.ts:notificationSourceHistory`: campos del evento guardado; `db/demo.ts` los proyecta para marcas propias cuando existe el array de eventos, conservando configuración anterior si falta. `tests/notification-evidence.test.mjs`: seis regresiones de información, campos vacíos, referencias, correcciones y unión por ID. Guías UX/renovación actualizadas.

## Decisiones y motivos
Usuario: Dev y Main, sin interferir con cambios existentes. Agente: promoción selectiva desde Dev actualizado; diferencias actuales Dev/Main sólo documentales. No cambiar estados, carteras, datos guardados ni claves. Conservar versiones anteriores e IDs de eventos. No se consultará OpenRouter ni INAPI/DeQuiénEs.

## Coordinación e integración
Reutiliza checkout aislado y limpio de este chat; original intacto. Componentes compartidos de Notificaciones y respuesta `/api/demo`. Sin migración. Consumidores de `sourceHistory` conservan `date`/`title` y reciben campos adicionales opcionales del historial real guardado.

## Verificación
37 pruebas dirigidas aprobadas (evidencia, timeline, renovación, prioridades, importación, paginación y contrato de snapshot). ESLint y `npm run build -- --webpack` aprobados con TypeScript. TypeScript y ESLint repetidos después de añadir la guardia de historial ausente, aprobados. Pendiente QA en ambientes desplegados. Las pruebas usan fixtures, sin revisiones reales nuevas.

## Pendientes y siguiente paso
Integrar a Dev, comprobar lector en el despliegue y promover enseguida a Main; registrar despliegues, QA y cierre. No se importa ni se fabrica un documento completo.
