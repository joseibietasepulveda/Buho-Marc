# Traspaso: Tv elqui.cl como marca vigilada

- Actualizado: 2026-10-12, America/Santiago
- Estado: listo para publicación
- Rama y base: `codex/vigilancia-tv-elqui`; Dev `08e24797417a105ccd549a8d3a73b62ac7dd3416`
- PR y commit de entrega: pendiente

## Objetivo y alcance
Usuario: publicar en Dev y producción. Ibieta IP debe mostrar primero Tv elqui.cl (1572142) → ELQUI.CL (1670929), después Copihue (1552147 → 1672680). B&E debe mostrar primero el cruce Tv elqui.cl → ELQUI.CL y agregar Tv elqui.cl a Mis marcas.

## Cambios y archivos relevantes
`lib/featured-watch.ts` y `db/similarity.ts`: orden por slug de organización. `db/elqui-watch.ts` y `scripts/provision-elqui-watch.ts`: alta auditada e idempotente de TV en Mis marcas, cruce inverso y pausa de vigilancia propia ELQUI. No se crea una búsqueda exitosa ficticia. `tests/elqui-watch.test.mjs`: PostgreSQL aislado, aislamiento, duplicados, conservación y orden. Documentación funcional actualizada en `docs/PILOTO_FA_Y_PRESENTACION_2026-10-01.md`.

## Decisiones y motivos
El usuario invierte explícitamente la dirección del cruce anterior ELQUI.CL → Tv elqui.cl. Seguimiento de la marca propia no equivale a pulsar «Pasar a seguimiento» sobre la coincidencia: el cruce debe seguir destacado por revisar.

## Coordinación e integración
`lib/featured-watch.ts`, `db/similarity.ts` y datos de los dos estudios. Sin migraciones ni cambio de política general. Git del Escritorio falla por archivos iCloud dataless; falló create_worktree con «Git ref lookup failed». Copia aislada remota `/tmp/buho-vigilancia-elqui-recovery`, sin modificar checkout original. La instalación propia agotó disco y se retiró; se reutilizan por enlace las dependencias existentes de `/private/tmp/buho-vigilancia-cajas-20261012`.

## Verificación
- Node 24.14.0, PostgreSQL desechable y dependencias del lockfile.
- `node --import ./tests/ts-loader.mjs --test tests/elqui-watch.test.mjs tests/pilot-presentation.test.mjs tests/watch-page.test.mjs tests/watch-feedback.test.mjs`: 12/12 aprobadas. Una primera ejecución falló por compartir la conexión del migrador con JSON de postgres; separada la conexión siguiendo los tests existentes, aprobó. Se actualizó una expectativa obsoleta de `workspacePolicy.internalExamples`.
- `npx eslint db/elqui-watch.ts scripts/provision-elqui-watch.ts db/similarity.ts lib/featured-watch.ts`: aprobado.
- `npm run build -- --webpack`: aprobado después de corregir la serialización JSON para el tipo de postgres.
- `git diff --check`: aprobado.
- Ensayo sin escrituras en las bases Dev/producción con la misma función: TV 1572142 → ELQUI 1670929, índice 0,6841. B&E no existe en Dev; no se crea ni se copian credenciales. B&E producción sí existe.
- Sin llamadas OpenRouter, INAPI ni búsquedas masivas. Acceso SSH temporal para operación; retirar al cierre.

## Pendientes y siguiente paso
Publicar ambos ambientes, aplicar preparación explícita y verificar UI/persistencia. Dev y Main solo difieren antes de este trabajo en documentación; promover únicamente el commit de este cambio. B&E se ajusta en producción, su único ambiente existente.
