# Traspaso: completar atención con próximos plazos

- Actualizado: 2026-10-13, America/Santiago.
- Estado: listo para revisión; implementación y QA locales completas.
- Rama y base: `codex/resumen-plazos-futuros`; inicio en Dev `aed6392ba5073eca7578eeae3cc30c16b937a61e` (PR #60, columnas del resumen), actualizado mediante rebase a `ced9eee` (PR #62, cierre documental). Commit funcional `f50d9260d5daac9c482d438d1c4ee7c95fb17c2d`.
- Carpeta aislada: `/tmp/buho-resumen-plazos-worktree-20261013`, worktree del clon `/tmp/buho-resumen-plazos-20261013`. La creación administrada desde el checkout original falló por lookup de Git; sus archivos dataless y cambios ajenos no se modifican. El intento de adjuntar la carpeta mediante Codex también fue rechazado porque no es un worktree administrado.
- PR y commit de entrega: pendientes. El usuario confirmó que terminó el otro agente; se prepara la subida y PR hacia Dev, con merge pendiente de revisión.

## Objetivo y alcance

Usuario: cuando «Atención de tus solicitudes» tenga menos de cinco eventos en el umbral de cinco días hábiles, completar hasta cinco con los siguientes plazos futuros. Ejemplos: Tutti Frutti y Chilecontainer. Usar la nueva versión de Dev.

## Cambios y archivos relevantes

- `app/app/page.tsx`, `RegistrationsSummary`: antes mostraba máximo dos plazos próximos/vencidos. Ahora ordena plazos legales con fecha, prioriza vencidos/próximos y completa hasta cinco con futuros normales; usa una misma fecha de Santiago para el cálculo y la agenda.
- `app/app/design-refresh.css`: etiqueta violeta «Próximo plazo» para fechas posteriores al umbral, limitada al resumen de registros.
- `docs/UX_RESPUESTA_INMEDIATA_2026-10-06.md`: regla vigente y vínculo a este traspaso.

## Decisiones y motivos

- Confirmado por usuario: rellenar hasta cinco con vencimientos posteriores a cinco días hábiles. Inicialmente pidió esperar al otro agente; su aviso posterior de que terminó permite continuar la coordinación y subida. No hay autorización de promoción a Main ni producción.
- Agente: conservar los vencidos como primera prioridad, luego próximos, después futuros; cada grupo por fecha e identificadores estables en empates. No presentar plazos lejanos como urgencias ni inventar eventos para completar cinco.
- Actualiza la restricción visual del 06/10 de incluir únicamente próximos/vencidos. No modifica calendario procesal, antecedentes, activadores ni estado oficial.

## Coordinación e integración

Archivos compartidos: `app/app/page.tsx` y `app/app/design-refresh.css`. Cambios limitados a `RegistrationsSummary` y una regla CSS local; preservar columnas del PR #60 y cambios de otros chats. Sin API, contratos persistentes, migraciones ni dependencias nuevas. La agenda de octubre conserva su filtro mensual; el panel Atención admite próximos meses. Dev `ced9eee` incorporado por rebase sin conflictos: únicamente avanzó `docs/handoffs/2026-10-12-resumen-registros-columnas.md`. No hay cambios funcionales adicionales que justifiquen repetir build/QA; `git diff --check origin/dev` aprobado después del rebase. Producción no está autorizada.

## Verificación

Ambiente: macOS, Node 24.14.0, Next 16.3.5, dependencias instaladas con `npm ci --no-audit --no-fund` en el worktree propio.

- `node --import ./tests/ts-loader.mjs --test tests/registration-procedure.test.mjs tests/registration-renewal.test.mjs`: 20 pruebas aprobadas; activadores, calendarios, vencidos y renovación conservados.
- `npx eslint app/app/page.tsx`: aprobado. `git diff --check`: aprobado.
- `NODE_OPTIONS=--dns-result-order=ipv4first npm run build -- --webpack`: compilación/TypeScript y 36 páginas aprobados.
- `node --import ./tests/ts-loader.mjs outputs/registration-summary-qa.mjs`: siete escenarios aprobados sobre el JSX real de `RegistrationsSummary` y `registrationDeadlines`, con hooks de datos sustituidos por fixtures locales. Incluyen cero urgencias (Tutti Frutti y Chilecontainer), mezcla de vencidos/próximos/futuros, cinco y siete urgencias, frontera de cinco/seis días hábiles, exclusión de fechas ausentes/controles/hitos y cartera vacía. Se comprueba que los datos originales permanecen intactos.
- Primer fixture de vacío falló porque incluía un cierre de renovación legal futuro válido; se corrigió la expectativa del fixture usando una renovación fuera del calendario cubierto, sin cambiar las reglas de producto para ocultar plazos legales válidos.
- Revisión visual con CUA del render local y CSS real a 1280×900 y 390×844: etiquetas violetas para futuros, urgentes conservadas, nombres/fechas legibles y página sin desbordamiento horizontal. Cinco filas verificadas en el render; los elementos inferiores siguen disponibles mediante desplazamiento. Evidencia local ignorada en `outputs/resumen-plazos-*.png` y `outputs/registration-summary-qa.json`.
- QA visual sirve un render estático del componente con datos simulados; no acredita persistencia, navegación de botones ni consultas HTTP de la aplicación completa. Esas interfaces no cambiaron. No hubo consultas INAPI, OpenRouter, escrituras en carteras reales ni despliegues.

## Pendientes y siguiente paso

Incorporar el cierre documental de Dev, subir la rama y abrir PR. Merge pendiente de revisión; después de integrarlo verificar Railway Dev y documentar la integración. No promover a Main ni desplegar producción.
