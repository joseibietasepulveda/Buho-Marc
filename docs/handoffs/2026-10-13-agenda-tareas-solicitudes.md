# Traspaso: tareas de solicitudes en agenda de vigilancia

- Actualizado: 2026-10-13 09:25, America/Santiago.
- Estado: integrado, publicado y verificado en Dev y Main/producción.
- Rama y base: Dev `codex/agenda-tareas-solicitudes`, base `7db36ad1e3fa8269096db1d67bfa522a3e5b53d6`; Main `codex/agenda-tareas-solicitudes-main`, base `a40352adb07efd34d35f99b3a7fb9a380b6c1d49`.
- PR y commit de entrega: [Dev #74](https://github.com/joseibietasepulveda/Buho-Marc/pull/74), funcional `07a8a50a2dd323b27f91038340b80634bdca872a`, integrado en `8bccfe07e5b61a72283e7c2f1362869c43380fa2`. Main: traslado funcional `e3e2adf`, [PR #75](https://github.com/joseibietasepulveda/Buho-Marc/pull/75), HEAD `6ff0ee2c4752540b60298fd780a03cb8643f1523`, integrado en `05ec751493ce8685bd738ee311981794869de9a9`.

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
- Sin consultas reales INAPI/OpenRouter, cambios de carteras alojadas ni variables. QA autenticada local y comprobación de lectura autenticada remota posteriores; ver cierre.

## Pendientes y siguiente paso

Sin pendientes de este ajuste. Las tareas sin fecha siguen en Tareas y en la lista del calendario; no se les inventa fecha. Conservar el máximo de tres filas y el aislamiento de datos entre ambientes. Los servidores/PG de fixtures de este chat quedaron detenidos; worktrees propios conservados para continuidad.

## Integración y verificación de Main

- PR #74 integrado en Dev con HEAD exacto y base sin avances posteriores; se preserva el Dev anterior `7db36ad`. Su publicación automática Railway quedó confirmada posteriormente como SUCCESS.
- Main recibe únicamente el commit del ajuste por cherry-pick sin conflictos sobre `a40352a`. Su `RegistrationsSummary` se conserva idéntico a su base; no se incorpora el relleno de cinco plazos de otra entrega Dev.
- Worktree propio Main: `/Users/rosariovial/.codex/worktrees/agenda-tareas-solicitudes-main-20261013`. `package-lock.json` idéntico; reutiliza dependencias instaladas sin modificación mediante enlace de `node_modules`, con `.next` independiente.
- Sobre Main: 23/23 pruebas de tareas/procedimiento/renovación, ESLint y build/TypeScript/36 páginas aprobados. Diff y consumidores compartidos (`lib/agenda.ts`, `legal-agenda.tsx`, `registrations.tsx`) comprobados. Dashboard/callbacks y esos consumidores coinciden con Dev probado en navegador; las diferencias restantes de `page.tsx` están exclusivamente en el resumen de registros no afectado. No se repite el recorrido visual sin diferencias de su superficie.
- Sin migraciones, variables o cambios de base; se conservan los ambientes y carteras propios. Ambos SHA desplegados y salud remota confirmados en el cierre siguiente.

## Cierre: publicación y comprobación remota

- Dev: [PR #74](https://github.com/joseibietasepulveda/Buho-Marc/pull/74) integrado, SHA `8bccfe07e5b61a72283e7c2f1362869c43380fa2`; despliegue Railway `438702f2-029a-46b5-bce3-edfa079221a9`, rama `dev`, estado **SUCCESS** y healthcheck remoto aprobado.
- Main/producción: [PR #75](https://github.com/joseibietasepulveda/Buho-Marc/pull/75) integrado, SHA `05ec751493ce8685bd738ee311981794869de9a9`; despliegue Railway `3e6f5f36-3b11-4040-8aeb-2d69e650c65c`, rama `main`, estado **SUCCESS**. Las bases anteriores (`7db36ad`/`a40352a`) permanecen como ancestros; sin sobrescribir otros commits.
- En ambos ambientes: `GET /api/health` 200, `ok: true`, base conectada, motor DeQuiénEs; `/api/registrations` 401 sin sesión; `/app` 307 a `/ingresar`. No se ejecutaron consultas manuales a fuentes ni operaciones remotas de escritura de tareas para la verificación.
- CUA sobre sesiones existentes: Dev recargado y resumen con nuevas etiquetas/contextos/KPI; producción recargada en la sesión B&E y resumen muestra las dos tareas de solicitudes fechadas, el siguiente plazo legal como tercera fila y KPI Gestiones por vencer **2**, conservando el caso sin fecha. Sólo lectura/navegación, sin completar, borrar o editar tareas, cambiar credenciales ni copiar sesiones.
- El componente `Dashboard` es idéntico en ambas entregas. El resto de diferencias de `page.tsx` corresponde al resumen de registros de otra entrega Dev, que no se promueve por este ajuste.
- Este cierre sólo actualiza esta nota en ambas ramas mediante PR; no modifica código, datos, migraciones o configuración. Las referencias SUCCESS anteriores identifican la entrega funcional comprobada, sin afirmar que el despliegue de un eventual commit documental posterior ya terminó.
