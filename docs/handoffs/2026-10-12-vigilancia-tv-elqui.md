# Traspaso: Tv elqui.cl como marca vigilada

- Actualizado: 2026-10-12 20:50, America/Santiago
- Estado: integrado y verificado en Dev/producción
- Rama y base: `codex/vigilancia-tv-elqui`; Dev `08e24797417a105ccd549a8d3a73b62ac7dd3416`
- PR y commit de entrega: [#33 Dev](https://github.com/joseibietasepulveda/Buho-Marc/pull/33), entrega `5706683`; [#34 producción](https://github.com/joseibietasepulveda/Buho-Marc/pull/34), entrega `44c9d2f`.

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
- Las pruebas y el script de preparación no llaman a OpenRouter, INAPI ni DeQuiénEs. El supervisor habitual de B&E sí realizó después un stock real, registrado en la sección de producción. Acceso SSH temporal retirado al cierre.

## Pendientes y siguiente paso
Sin pendientes funcionales. B&E se ajustó en producción, su único ambiente existente. No crear un B&E Dev ni copiar credenciales sin un encargo específico. La revisión propia de TV en Ibieta permanece a pedido; no se ejecutó una búsqueda manual para esta entrega.

## Publicación y datos de Dev
- Integración `cec4ebf8750bf95a7680c05b107a55d0e65a8f1a`; Railway `5f1c2645-2dc1-45ed-9eb7-dab1272ea3cc`, SUCCESS.
- `node --import ./tests/ts-loader.mjs scripts/provision-elqui-watch.ts --apply` ejecutado por SSH en Dev: Ibieta aplicado, una nueva marca propia y un nuevo cruce; B&E ausente y omitido. No se creó cuenta ni se trasladaron credenciales.
- `watchPage(await watchSnapshot(true), new URLSearchParams())` comprobado contra la base real: TV/ELQUI primero, Copihue segundo. TV activa, `monitoringEnabled=true`, `watchOnly=false`; ELQUI pausada y `monitoringEnabled=false`. El cruce original permanece en base sin revisar ni eliminar.
- Chrome autenticado en Ibieta Dev: orden y datos de las dos primeras tarjetas confirmados. Mis marcas, búsqueda `1572142`: TV, registro 1449935, Niza 38, En monitoreo y un hallazgo por revisar. Se limpió la búsqueda y se dejó abierta Vigilancia. Captura local ignorada `outputs/ibieta-dev.jpg`. Cero errores de consola. La carga inicial tras el despliegue tardó alrededor de un minuto antes de mostrar cartera/vigilancia.
- Salud Dev: `ok=true`, base conectada, motor DeQuiénEs. No se ejecutó una revisión nueva.
- Main integra exclusivamente este cambio con `148ea8e25dd8d42e963f2c6f01521cddb82ed792`; el código funcional coincide con Dev (`git diff origin/dev origin/main -- db lib app scripts tests` vacío). Las diferencias anteriores eran documentales y no se trasladaron con esta promoción.

## Publicación y datos de producción
- Integración `148ea8e25dd8d42e963f2c6f01521cddb82ed792`; Railway `7168783d-c858-425d-951d-d0d6b9b35a20`, SUCCESS; salud correcta y base conectada.
- Preparación explícita aplicada a Ibieta y B&E, una marca TV y un cruce ELQUI nuevos en cada uno. Segunda ejecución: `alreadyApplied=true` en ambos, sin reescribir decisiones ni evidencia nueva.
- `watchPage`/`watchSnapshot` de producción confirman TV/ELQUI primero y Copihue segundo en Ibieta; TV/ELQUI como único grupo destacado de B&E. Ambas marcas TV activas, `watchOnly=false`, visibles en cartera; ELQUI propia sigue pausada en Ibieta.
- B&E mantiene la programación automática que ya tenía: el supervisor encoló un stock real para la nueva TV a las 20:47:40 de Santiago, terminado a las 20:48:03. La fuente devolvió 0,3394 y sustituyó la evidencia provisional, incluido `presentationReversedFrom`, por evidencia real de TV → ELQUI. El script no llamó a la fuente ni encoló trabajos, pero el supervisor sí consultó la marca al encontrarla activa sin stock anterior. No afirmar que todo el ambiente careció de consultas: se comprobó este trabajo automático exitoso. La auditoría del alta conserva 0,6841 como procedencia inicial. No se forzó de nuevo el porcentaje viejo.
- Chrome autenticado en B&E producción: primer cruce y nombres correctos; Mis marcas, búsqueda 1572142, devuelve TV, registro 1449935, Niza 38, En monitoreo y un hallazgo. La barra conserva 11 avisos pendientes antes/después. Se limpió la búsqueda y se dejó abierta Vigilancia. Capturas locales ignoradas: `outputs/barros-production.jpg`, `outputs/barros-mis-marcas.jpg`.
- El acceso SSH temporal de esta operación se retiró de Railway; claves propias eliminadas. No se tocaron claves ajenas ni procesos de otros chats.
- Cierre documental: este contenido actualiza la nota y el documento funcional; sin cambios de código ni necesidad de repetir build/pruebas funcionales.
