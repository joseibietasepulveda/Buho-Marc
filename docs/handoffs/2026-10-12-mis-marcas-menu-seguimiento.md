# Traspaso: selector de seguimiento en Mis marcas

- Actualizado: 2026-10-12, America/Santiago.
- Estado: listo para integración.
- Rama y base: `codex/mis-marcas-menu-seguimiento`; Dev `6a0b96e75ef49c410df1d0697cded7061039e7d8`.
- PR y commit de entrega: pendiente.

## Objetivo y alcance
Corregir el menú recortado al cambiar En monitoreo en Mis marcas. Usuario autoriza probar, integrar en Dev y promover a Main/producción.

## Cambios y archivos relevantes
`app/app/page.tsx`: se reemplaza el menú absoluto dentro de la celda por select nativo; conservar los estados y `toggleBrandMonitoring`, persistencia, actualización optimista y recuperación ante error. La celda tiene overflow hidden; cambiar sólo z-index no resuelve el recorte y la última fila también limita el menú.

## Decisiones y motivos
Usuario: reparar el error mostrado y publicar Dev/Main. Agente: menú del navegador fuera del recorte de la tabla, sin dependencias, reposicionamiento ni consultas nuevas. Detalle de marca por teclado sólo cuando la propia fila tiene foco, preservando select y controles internos.

## Coordinación e integración
`app/app/design-refresh.css` conserva la píldora verde/gris frente al estilo general de select; `app/app/buho-app.css` retira el popover sin consumidores. Sin cambios de API, base ni migraciones. Carpeta aislada ya disponible `/Users/rosariovial/.codex/buho-presentacion-recovery-20261012`, checkout original conservado; rama propia desde Dev actualizado, sin otro trabajo en esta carpeta.

## Verificación
- Node v24.14.0, dependencias del mismo lockfile enlazadas; `npm run build -- --webpack`: compilación, TypeScript y 36 rutas aprobadas, después del último ajuste CSS.
- `npx eslint app/app/page.tsx` y `git diff --check`: aprobados.
- `node --import ./tests/ts-loader.mjs --test tests/brand-filters.test.mjs tests/portfolio-import.test.mjs`: 10 pruebas aprobadas.
- `WATCH_QA_PORT=3467 WATCH_QA_KEEP=true node --import ./tests/ts-loader.mjs tests/watch-http.mjs`: PostgreSQL/HTTP aislado, autenticación, permisos, CSRF, cola y evidencia, seguimiento/casos idempotentes e importación de oposiciones aprobados. KEEP omite la sección de clientes y conserva datos sólo para el navegador; no se declara esa sección verificada en esta ronda.
- `node outputs/monitoring-ui-qa.mjs`: Chrome local, pausa/reactivación mediante API real aislada y persistencia tras recarga; fallo 503 simulado restaura estado anterior; teclado no abre ficha. Primera/última fila de seis filas de fixture UI, anchuras 1440/820/390, selector dentro de su celda y cero errores de página. Capturas revisadas `outputs/monitoring-menu-1440.png` y `outputs/monitoring-390.png`, evidencia ignorada.
- Primera comprobación visual detectó radio 8px por especificidad del estilo general; regla trasladada al estilo vigente de tabla y repetición aprobó radio 99px, fondo verde y texto legible. Los menús nativos los pinta el navegador fuera del recorte; las capturas de Playwright no incluyen ventanas del sistema.
- Sin consultas reales de fuente ni OpenRouter, sin cambios a marcas remotas.

## Pendientes y siguiente paso
Crear PR Dev, comprobar despliegue y salud; promover a Main y comprobar publicación. Registrar referencias y resultados.
