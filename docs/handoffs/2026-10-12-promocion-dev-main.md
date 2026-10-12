# Traspaso: promoción de Dev a Main del 12 de octubre

- Actualizado: 2026-10-12, America/Santiago
- Estado: listo para integrar en Main; promoción autorizada
- Rama y base: `codex/promocion-dev-main-octubre12`, desde Dev `e346a2620ee7b5461f3e3cd30a18b1dc5f525fc8`.
- Main inicial: `59d3c7ae5ffb61a50ed5c0c990db96dc416fa272`.
- PR y commit de entrega: pendientes.

## Objetivo y alcance
El usuario autoriza expresamente «sube dev a main» tras aprobar las cajas de Vigilancia. Promover toda la versión vigente de Dev y comprobar su publicación en producción, conservando la base y la configuración existentes.

## Cambios y archivos relevantes
Incluye las entregas ya integradas de multinforme/factibilidad, informes para cliente/estudio, convención de notificación desde la actuación, lectura de notificaciones, combobox Niza, desplazamiento y cajas compactas de Vigilancia. Referencias: PR #18–29 y notas específicas en `docs/handoffs/`.

No hay diferencias de migraciones, esquema ni dependencias entre Main y Dev. Los tres commits exclusivos de Main son merges de promociones anteriores; `git diff origin/dev...origin/main` está vacío. La rama de promoción conserva esos ancestros. No se implementa funcionalidad adicional.

## Decisiones y motivos
- Usuario: promoción de Dev a Main/producción.
- Agente: conservar datos, variables y credenciales de producción; no copiar bases ni activar proveedores para probar estilos. La autorización de promoción no constituye una petición de llamada a OpenRouter.
- Agente: usar el checkout aislado ya verificado; Git de la carpeta original del Escritorio falla por archivos pendientes de iCloud. Sin modificar recursos de otros chats.

## Coordinación e integración
La promoción afecta componentes compartidos de `app/app/`, informes en `lib/`, lectura de similitudes y cálculo de plazos. Cada contrato ya fue integrado y comprobado en Dev; no hay migraciones nuevas ni orden de aplicación especial. La nota de las cajas conserva el contexto de su entrega inicial a Dev y queda complementada por esta promoción.

## Verificación
- Dev funcional de Vigilancia: despliegue `6ab613a4-9253-4446-9b05-efbbb52cceed`, SHA `f1d8c12`, SUCCESS. El cierre documental de Dev `e346a26` estaba en construcción al iniciar esta promoción.
- Producción inicial: despliegue `94718a9f-e979-4501-8cd3-980c162be484`, SHA exacto Main `59d3c7a`, SUCCESS.
- Build/TypeScript, lint, 11 pruebas de vigilancia y QA HTTP/Chrome de las cajas aprobados en este mismo checkout, antes de la promoción. Ver [traspaso de Vigilancia](2026-10-12-vigilancia-cajas-compactas.md).
- `node --import ./tests/ts-loader.mjs --test tests/feasibility-study.test.mjs tests/feasibility-conclusion.test.mjs tests/feasibility-report.test.mjs tests/similarity.test.mjs tests/notification-event-assumption.test.mjs tests/registration-procedure.test.mjs tests/registration-evidence.test.mjs tests/inapi-procedure.test.mjs tests/inapi-recovery.test.mjs tests/inapi-recovery-integration.test.mjs tests/watch-view-state.test.mjs tests/watch-page.test.mjs tests/watch-feedback.test.mjs`: **99/99 aprobadas**, incluyendo PostgreSQL aislado, PDF/Word, clases, destinatarios, evidencia, fechas confirmadas/asumidas y seguimiento. macOS, Node 24.14.0. Proveedores simulados, sin llamadas reales a fuentes u OpenRouter.
- Main se incorporó como ancestro sin conflictos (`3a1ab5718c0b0be11c2b0df190a18aae82cd6f49`). `git diff origin/dev HEAD -- app lib db scripts drizzle package.json package-lock.json` vacío: el código promovido es idéntico al Dev compilado y revisado visualmente en la entrega previa. No se repite una compilación de ese mismo árbol por el único documento nuevo.
- `git diff --check`: aprobado. No hay diferencias de migraciones, dependencias ni arranque entre los ambientes; la promoción no añade scripts de provisión.
- Pendiente únicamente integración y despliegue exacto/salud de producción.

## Pendientes y siguiente paso
Conservar ancestros de Main, ejecutar verificaciones conjuntas, abrir y adjuntar PR hacia Main, integrar por autorización del usuario y comprobar Railway production. Actualizar esta nota con commit/PR y resultados reales. No certificar conservación fila por fila de la base sin un inventario específico; esta entrega promueve código sin sustituir la base.
