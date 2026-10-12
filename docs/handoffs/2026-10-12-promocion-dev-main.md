# Traspaso: promoción de Dev a Main del 12 de octubre

- Actualizado: 2026-10-12, America/Santiago
- Estado: en preparación
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
- Pendiente: pruebas conjuntas de informes/plazos, comprobación del árbol promovido y despliegue exacto/salud de producción. Las pruebas locales usan fixtures y base descartable; no llaman a fuentes reales ni OpenRouter.

## Pendientes y siguiente paso
Conservar ancestros de Main, ejecutar verificaciones conjuntas, abrir y adjuntar PR hacia Main, integrar por autorización del usuario y comprobar Railway production. Actualizar esta nota con commit/PR y resultados reales. No certificar conservación fila por fila de la base sin un inventario específico; esta entrega promueve código sin sustituir la base.
