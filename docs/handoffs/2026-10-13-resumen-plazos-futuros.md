# Traspaso: completar atención con próximos plazos

- Actualizado: 2026-10-13, America/Santiago.
- Estado: integrado, desplegado y verificado en Dev.
- Rama y base: `codex/resumen-plazos-futuros`; inicio en Dev `aed6392ba5073eca7578eeae3cc30c16b937a61e` (PR #60, columnas del resumen), actualizado mediante rebase a `ced9eee` (PR #62, cierre documental). Commit funcional `f50d9260d5daac9c482d438d1c4ee7c95fb17c2d`.
- Carpeta aislada: `/tmp/buho-resumen-plazos-worktree-20261013`, worktree del clon `/tmp/buho-resumen-plazos-20261013`. La creación administrada desde el checkout original falló por lookup de Git; sus archivos dataless y cambios ajenos no se modifican. El intento de adjuntar la carpeta mediante Codex también fue rechazado porque no es un worktree administrado.
- PR de entrega: [#64](https://github.com/joseibietasepulveda/Buho-Marc/pull/64), integrado en Dev `4a4a8c3956a657df1dd862249aae8a0173443113` y adjunto al chat; commit funcional `f50d9260d5daac9c482d438d1c4ee7c95fb17c2d`. La petición posterior del usuario autoriza la actualización y publicación preservando los commits nuevos; ver la continuación al final.

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
- Servidor de fixtures local detenido al terminar la revisión; no queda una aplicación ni base de QA activa de este ajuste.

## Pendientes y siguiente paso

La implementación ya está publicada en Dev. Para que B&E la vea en su cartera de producción, falta una promoción a Main/producción explícitamente solicitada. No copiar carteras entre ambientes para probar la interfaz.

## Continuación: publicación preservando los nuevos commits de Dev

- Usuario: solicita subir el cambio resguardando los commits posteriores de otros chats, tras comprobar que el PR continuaba abierto. Se procede a actualizar e integrar en Dev; Main/producción no se promueven sin petición explícita.
- La carpeta temporal anterior ya no existe. Se recuperó la rama publicada `23d4884` en un worktree durable propio: `/Users/rosariovial/.codex/worktrees/resumen-plazos-integracion-20261013`, clon base `/Users/rosariovial/.codex/checkouts/buho-resumen-plazos-20261013`. Otro intento de creación administrada devolvió `Git ref lookup failed`; la carpeta original permanece intacta.
- Base vigente incorporada por merge sin conflictos: Dev `4929795e07758c0db6d57fd0e05f543aa8b1395b`, con PR #65/#67 (recuperación de conclusiones) y #69/#71 (flecha Niza y sus cierres documentales).
- Se comprobó que Dev es ancestro de la rama y que los archivos nuevos de factibilidad, Niza, estilos del selector y lógica de conclusiones son idénticos a Dev. La diferencia funcional pendiente sigue limitada a `RegistrationsSummary` y una regla CSS del panel.
- Verificación conjunta repetida sobre la versión combinada: `npm ci --no-audit --no-fund`; build con webpack, TypeScript y 36 páginas aprobado; ESLint de `app/app/page.tsx` y diff aprobados; 33 pruebas de procedimiento, renovación y conclusiones (`tests/registration-procedure.test.mjs`, `tests/registration-renewal.test.mjs`, `tests/feasibility-conclusion.test.mjs`) aprobadas, con proveedor de IA simulado y sin llamadas externas.
- `node --import ./tests/ts-loader.mjs outputs/verify-registration-summary.mjs`: comprobación de la selección extraída del componente vigente, con escenarios B&E, prioridad/relleno, límite de cinco, frontera cinco/seis días hábiles, exclusiones, vacío y datos intactos. Aprobada. `app/app/page.tsx` y `app/app/design-refresh.css` no tienen diferencias frente al commit probado visualmente `23d4884`; no se repite la QA visual anterior sin un cambio de esas superficies.
- PR #64 integrado en Dev el 13/10/2026, commit `4a4a8c3956a657df1dd862249aae8a0173443113`, después de verificar el HEAD exacto del PR `3f271b87a92b15c4436982f36fb7614eaebe9cec` y la base `4929795`. La rama se actualizó sin force-push.
- Se comprobó después del merge que `4929795` sigue siendo ancestro de Dev y que `app/`, `db/`, `lib/`, `scripts/` y `tests/` coinciden con la versión combinada probada localmente. El PR añade únicamente dos archivos funcionales y dos documentos frente al Dev vigente; conserva los cambios nuevos de los demás chats.
- Railway Dev: despliegue `d4993ea5-b2e9-4f66-9ca7-b4cb63940d0f`, commit exacto `4a4a8c3956a657df1dd862249aae8a0173443113`, rama `dev`, estado `SUCCESS`. Build remoto y control de salud aprobados; registros de arranque confirman servidor listo.
- HTTP remoto después de la publicación: `/api/health` 200, `ok: true`, base conectada y motor `dequienes`; `/api/registrations` 401 sin sesión; `/app` 307 a `/ingresar`. Sin consultas manuales a INAPI/OpenRouter ni operaciones sobre carteras reales para estas comprobaciones.
- La comprobación de despliegue no sustituye la QA visual autenticada: el render del panel con B&E se probó localmente; B&E permanece en producción y este chat sólo publicó Dev. Se conserva la separación de ambientes.
