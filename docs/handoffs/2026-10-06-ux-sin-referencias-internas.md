# Traspaso: referencias internas fuera de la interfaz

- Actualizado: 2026-10-06 20:20, America/Santiago.
- Estado: integrado y desplegado en Railway Dev.
- Rama y base: `codex/ux-sin-referencias-internas`, desde `dev` en `a11218e43f0c14a0e7719e75513ceddcdc68a951`.
- PR: [#4](https://github.com/joseibietasepulveda/Buho-Marc/pull/4). Commit funcional: `b2b3d628b8b15afb13e1fdef0cab872d2545e4e2`. Integración en `dev`: `ec7ecbdc0aab09375781b8e13c2e189e2d3d6b8b`, PR integrado el 6 de octubre a las 20:17 America/Santiago.

## Objetivo y alcance

Pedido del usuario: quitar las alusiones visibles a «Referencia: CO-cionaodblcphjegblicame» y códigos internos equivalentes de la presentación general. La petición previa de subir las mejoras de UX a `dev` determina el destino; producción no está incluida.

## Cambios y archivos relevantes

- `app/app/page.tsx`: encabezados de fichas de marca, vigilancia, caso, contacto y correo sin códigos; mensajes de cambio de etapa/descarte con título del caso; «Vigilancia de origen» indica si está vinculada y conserva el botón de acceso. Los textos de avisos simulados usan nombres de marcas y casos.
- `app/app/notification-center.tsx`: detalles de aviso sin ID interno ni código de vigilancia; la historia omite «Referencia del aviso». Conserva datos y referencias oficiales de las actuaciones.
- `lib/client-email.ts`: `oppositionEmail(watched, requested, lawyer, origin)` pasa de cinco a cuatro argumentos y omite el párrafo de referencia en HTML y texto. Se actualizan el consumidor en `page.tsx` y el test existente en `tests/v04-workflows.test.mjs`.
- `docs/DECISIONES_UX_2026-09-24.md`: regla vigente de presentación y enlace a esta nota.

## Decisiones y motivos

- Usuario: retirar referencias internas visibles y publicar mejoras en `dev`.
- Agente: mostrar nombres y etiquetas legibles; conservar IDs persistentes, relaciones, navegación y bitácora de auditoría. Los números oficiales de solicitud, registro y actuaciones de INAPI siguen identificando los expedientes.
- No se migran registros ni se reescriben correos editados por usuarios. La nueva plantilla omite referencias automáticamente; los avisos simulados conocidos se presentan con textos actualizados.

## Coordinación e integración

`app/app/page.tsx` es compartido con Casos, Vigilancia, Mis marcas, Notificaciones y contacto. El diff se mantiene localizado. No hay cambios de API, esquema, organización, decisiones de seguimiento o calendario. Otro consumidor futuro de `oppositionEmail` debe usar su firma de cuatro argumentos. La auditoría y el contrato interno de `notification-timeline.ts` conservan identificadores. Los cambios ajenos del checkout principal no se incorporan.

## Verificación

Ambiente: worktree aislado; Node 24.14.0. Comandos con Node disponible en PATH:

- `node --import ./tests/ts-loader.mjs --test tests/v04-workflows.test.mjs tests/notification-timeline.test.mjs`: 19 pruebas aprobadas, incluida exclusión de referencias en correo y conservación de IDs de actuaciones oficiales.
- `node node_modules/eslint/bin/eslint.js app/app/page.tsx app/app/notification-center.tsx lib/client-email.ts tests/v04-workflows.test.mjs`: aprobado.
- `NODE_OPTIONS=--dns-result-order=ipv4first npm run build -- --webpack`: compilación y TypeScript aprobados; se repite después del último ajuste visual.
- `git diff --check`: aprobado antes de publicar.

Revisión visual y funcional con `npm run dev:local`, `BUHO_LOCAL_PORT=4331`, `BUHO_LOCAL_DB_PORT=55461`, `BUHO_LOCAL_DATA_DIR=.buho-local/qa-referencias`, fuente simulada y programación desactivada. Base y sesión exclusivamente de demostración. No se consultó INAPI ni se copiaron credenciales.

Pasos comprobados en navegador real: abrir NOVA FUDS desde Vigilancia, verificar ficha sin código y solicitud oficial 1570234 conservada; abrir contacto, revisar vista previa y descargar HTML sin «Referencia:»; abrir caso vinculado, comprobar todo el contenido sin CO-/BM-, mover etapa (POST `/api/demo`, HTTP 200 y mensaje con nombre); abrir notificación y expandir detalles sin IDs internos. Sin errores JavaScript. Se sustituyó el código de una vigilancia local por el ejemplo exacto del usuario para detectar filtraciones; la primera revisión visual detectó el campo «Vigilancia de origen», que se corrigió y volvió a comprobar. Capturas locales en `output/ux-sin-referencias-internas/` (no versionadas).

## Integración y despliegue

PR #4 publicado, adjunto al chat e integrado en `dev` mediante `ec7ecbdc0aab09375781b8e13c2e189e2d3d6b8b`. Railway Dev: despliegue `ccd33df2-583a-4ae4-8fdb-cabe57f6a226`, estado exitoso confirmado el 6 de octubre a las 20:19:43 America/Santiago. GitHub deployment `6897542363` acredita SHA exacto, ambiente `heartfelt-magic / Dev` y estado `success`. Compilación remota aprobada. Comprobación en navegador autenticado de Dev, solo lectura: comparador desde una vigilancia guardada con encabezado sin CO-, números oficiales conservados y contacto al cliente con vista previa sin «Referencia:» ni CO-. No se enviaron correos ni se cambiaron valoraciones. `/api/health`: HTTP 200, base conectada, fuente configurada y `engine: dequienes`.

## Pendientes y siguiente paso

Continuar las próximas mejoras de UX desde `dev` actualizado. No hay pendientes de código para esta retirada. La prueba exhaustiva de fichas/correos se realizó con fixtures locales; la salud, publicación y una ficha/correo guardados se comprobaron en Railway Dev. Sin promoción a `main` ni cambios de datos reales.
