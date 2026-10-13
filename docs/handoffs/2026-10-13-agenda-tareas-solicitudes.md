# Traspaso: tareas de solicitudes en agenda de vigilancia

- Actualizado: 2026-10-13, America/Santiago.
- Estado: listo para integración; verificación local aprobada.
- Rama y base: `codex/agenda-tareas-solicitudes`; Dev `7db36ad1e3fa8269096db1d67bfa522a3e5b53d6`.
- PR y commit de entrega: pendiente.

## Objetivo y alcance

Usuario: corregir «Tareas - Agenda próxima» para incluir también tareas de solicitudes, como el resumen de registros; publicar en Dev y Main. Las capturas muestran tareas fechadas de solicitudes ausentes del resumen, mientras la tarea del caso no tiene fecha.

## Cambios y archivos relevantes

- `app/app/page.tsx`, `Dashboard`: combina `caseAgenda(cases)` y `registrationAgenda(applications, tasks)`. Las tres primeras actividades fechadas incluyen tareas de ambas entidades y plazos legales; controles/hitos se reservan al calendario completo y no suman Gestiones por vencer. Cada fila añade su marca/caso/solicitud y responsable.
- El resumen usa los hooks de `RegistrationProvider`: guardar/completar/eliminar en Tareas actualiza la agenda por el mismo estado, sin otra carga de cartera. La X de una solicitud llama a `save(applicationId, task, true)`; la de un caso conserva `deleteCaseTask`. Un fallo mantiene/restaura la tarea mediante el flujo existente.
- El callback `onApplication` abre la solicitud exacta; casos conservan su ficha. `Ver calendario` y el KPI abren un `ReviewDialog` con `LegalAgenda` de ambas fuentes. Las tareas sin fecha se conservan en su lista. Se retira el antiguo callback exclusivo del calendario de Casos, ahora sin consumidores.
- `app/app/design-refresh.css`: ancho de `.dashboard-calendar-dialog`, con scroll del calendario compartido para móvil. Sin remaquetar otros paneles.
- `tests/dashboard-agenda-browser.mjs`: regresión de UI/API/base contra fixtures locales exclusivamente.
- `docs/UX_RESPUESTA_INMEDIATA_2026-10-06.md`: comportamiento vigente y enlace a esta nota. Sin migraciones ni cambios de datos/API.

## Decisiones y motivos

- Usuario: incluir las otras tareas y subir a Dev y Main; autoriza ambas integraciones/publicaciones.
- Agente: conservar pendientes con fecha, orden cronológico y máximo tres filas; tareas sin fecha siguen en Tareas. Reservar controles/hitos a las categorías ya diferenciadas del calendario completo, sin ocupar filas de tareas/plazos del abogado ni sumarlos al KPI.
- Main recibirá el ajuste específico desde su propia base, sin arrastrar otros cambios pendientes de Dev.

## Coordinación e integración

Carpeta propia `/Users/rosariovial/.codex/worktrees/agenda-tareas-solicitudes-20261013`, clon `/Users/rosariovial/.codex/checkouts/buho-agenda-tareas-20261013`. La creación administrada falló con `Git ref lookup failed`; se crea un worktree Git aislado sin modificar la carpeta original ni worktrees ajenos. Revisadas instrucciones aportadas, README, decisiones UX, guía Railway, generadores de agenda, proveedor de tareas y traspaso de próximos plazos. Archivos compartidos: Dashboard en `app/app/page.tsx` y estilos específicos del calendario. Reutilizar `RegistrationProvider`, aislamiento y rollback existentes; no consultar INAPI/OpenRouter para QA.

## Verificación

Ambiente: macOS, Node 24.14.0, Next 16.3.5, Chromium 1243/Playwright del runtime. `npm ci --no-audit --no-fund` en el worktree aislado.

- `node --import ./tests/ts-loader.mjs --test tests/case-tasks.test.mjs tests/registration-procedure.test.mjs tests/registration-renewal.test.mjs`: 23/23 aprobadas.
- `npx eslint app/app/page.tsx tests/dashboard-agenda-browser.mjs` y `git diff --check`: aprobados.
- `NODE_OPTIONS=--dns-result-order=ipv4first npm run build -- --webpack`: compilación, TypeScript y 36 páginas aprobados sobre la versión final.
- `WATCH_QA_KEEP=true WATCH_QA_PORT=3437 node --import ./tests/ts-loader.mjs tests/watch-http.mjs`: PostgreSQL desechable/puerto propio y fuente simulada. Pasaron autenticación/CSRF, capacidades, revisión con fixture, evidencia, seguimiento y oposición/nulidad; mantiene servidor para QA. No declara ejecutadas las ramas omitidas por KEEP.
- `PLAYWRIGHT_MODULE=/Users/rosariovial/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs CHROMIUM_EXECUTABLE='/Users/rosariovial/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' node --import ./tests/ts-loader.mjs tests/dashboard-agenda-browser.mjs`: aprobado sobre el build final. Verifica orden/máximo tres/KPI, dos solicitudes y un caso, excluye completadas/no aplica/caso concluido, tareas sin fecha sólo en listas, calendario conjunto, apertura de ambas fichas, eliminación confirmada en API/base, rollback ante 500, carga/error sin falso vacío, estado vacío y móvil.
- Revisión visual de cuatro capturas propias: escritorio 1440×1000 y móvil 390×844, resumen y calendario; fechas/contextos legibles, diálogo dentro del viewport y calendario móvil desplazable. Evidencia ignorada en `outputs/agenda-qa/`.
- Los primeros intentos del nuevo harness requirieron adaptar cookie Secure para HTTP local, esperar bienvenida, usar el cierre real de la ficha y esperar confirmación de escritura antes de consultar persistencia. Corregido el harness; la corrida final pasa completa.
- Sin consultas reales INAPI/OpenRouter, cambios de carteras alojadas ni variables. QA autenticada local, publicación pendiente.

## Pendientes y siguiente paso

Abrir/adjuntar PR a Dev e integrar; trasladar el mismo ajuste a la base actual de Main, verificar versión combinada y publicar; comprobar SHA/estado Railway y salud de ambos ambientes. Actualizar esta nota con las referencias definitivas.
