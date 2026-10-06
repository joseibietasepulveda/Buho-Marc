# Traspaso: resúmenes, respuestas inmediatas y navegación de casos

- Actualizado: 2026-10-06 20:47, America/Santiago; ver registro final de integración abajo.
- Estado: listo para revisión; implementación y pruebas locales aprobadas, integración/publicación pendientes.
- Rama y base: `codex/ux-respuesta-inmediata`; `dev` en `8906e949eb7470c584d5f06f7b1c5f158639fc54`.
- PR y commit de entrega: pendientes.

## Objetivo y alcance
Pedido del usuario: resumen comparativo de vigilancias con enlace morado; loading de búsqueda y titular en Mis marcas; conservar carga de Vigilancia entre visitas y respuesta inmediata de seguir/avisar/convertir; acceso al caso vinculado; estilo claro y selector buscable al agregar casos; tareas con guardado/eliminación ágiles; retirar completar antecedentes y respaldo de plazos de la presentación de registros. Publicar en Railway Dev, sin producción. Los cambios anteriores de animación inicial y referencias internas ya están en la base y se conservan.

## Cambios y archivos relevantes
- `app/app/page.tsx`: tabla con nombre/logo/Niza de ambas marcas y enlace morado, columna Nombre titular, montaje conservado de WatchPanel, guardado optimista de tareas de caso, apertura del caso exacto y resumen de registros sin pendientes de antecedentes.
- `app/app/watch-panel.tsx`, `lib/watch-view-state.ts`: feedback inmediato; estado confirmado sin esperar una segunda carga; enlace verde al caso; pausa de consultas cuando el apartado está oculto y conservación de filtros. Invalidaciones de cartera/descarte recibidas aun cuando la vista está oculta.
- `app/app/brand-combobox.tsx`, `opposition.tsx`: control buscable/desplegable con selección exacta, acentos y teclado. `pilot.css`: pie claro dentro del formulario; `ux-polish.css`: comparación compacta y controles; `similarity-results.tsx`: opción no interactiva para las imágenes dentro de enlaces de comparación.
- `app/app/brand-search.tsx`: spinner pequeño en la búsqueda.
- `app/app/registrations.tsx`: tareas de solicitud optimistas, recuperación ante fallo y protección frente a lecturas previas; se retira la presentación del editor de evidencias. Los errores de escritura se muestran en el editor/lista afectados.
- `app/api/demo/route.ts`: respuestas compactas de tarea y conversión; el caso canónico permite abrir la ficha sin esperar el resumen; selección manual por `brandCode` opcional. Alta manual y conversión comparten bloqueo y contador `BM`.
- `db/demo.ts`: vista previa con imagen y Niza de ambas marcas. No se cambian tablas ni evidencias guardadas.
- `tests/watch-view-state.test.mjs`, `tests/watch-http.mjs`, `tests/ux-response-browser.mjs`: contadores, acceso a conversión, descarte, persistencia compacta y recorrido con demora/error/lectura antigua.
- Documentación funcional: [comportamiento vigente](../UX_RESPUESTA_INMEDIATA_2026-10-06.md), enlazado desde `UX_IMPLEMENTACION_OCTUBRE_2026.md`.

## Decisiones y motivos
- Usuario: cambios y destino Dev indicados en el objetivo; escritorio prioritario y acceso básico móvil/tablet.
- Agente: preservar reglas procesales, avisos, fuente y evidencia subyacente al retirar su editor; guardar estado solo en la instancia de la sesión, sin almacenamiento compartido del navegador.
- Agente: escritura de tareas inmediata en la vista, con confirmación del servidor antes de cerrar el editor y recuperación ante error. Versiones de lectura impiden que un resultado previo revierta cambios posteriores.
- Hallazgo verificado: el contador de alta manual extraía todos los dígitos de códigos de oposición/nulidad y podía desbordar `int` (reproducido localmente como HTTP 500). Ahora toma solamente `BM-[0-9]+` con `bigint` y el bloqueo usado por la conversión. La prueba HTTP incluye un código ajeno largo y alta manual por marca exacta.
- Se sustituye la presentación antigua de «Requiere completar antecedentes»; no se eliminan solicitudes, evidencia ni cómputos jurídicos. El cálculo y la API de antecedentes permanecen disponibles.

## Coordinación e integración
Compartidos: `page.tsx`, WatchPanel, RegistrationProvider, imágenes, estilos y `/api/demo`; afectan resúmenes, casos, tareas, solicitudes y vigilancia. Las respuestas completas históricas se conservan cuando no se solicita `compact`. `brandCode` es opcional para mantener consumidores anteriores. Los nuevos campos de `watchSummary.preview` son adicionales.

Integrar API y componentes juntos. Sin dependencias nuevas ni migraciones. Conservar la limpieza previa de referencias internas. Notas locales de interpretación de actuaciones y ventana de oposición son diagnósticos pendientes, no implementación integrada. La carpeta principal en `dev` y sus archivos ajenos se mantuvieron intactos.

## Verificación
Ambiente: macOS, Node 24.14.0, Next 16.3.5, PostgreSQL desechable, fixture de fuente local. No se hicieron consultas nuevas a INAPI ni se operó sobre carteras reales.

- `NODE_OPTIONS=--dns-result-order=ipv4first npm run build -- --webpack`: aprobado, incluida comprobación TypeScript.
- `node --import ./tests/ts-loader.mjs --test tests/watch-view-state.test.mjs tests/watch-page.test.mjs tests/watch-list.test.mjs tests/watch-discovery.test.mjs tests/snapshot-client.test.mjs tests/case-tasks.test.mjs`: 21/21 aprobadas.
- `node --import ./tests/ts-loader.mjs tests/watch-http.mjs`: aprobado en base desechable y puerto independiente (última ejecución `51921`), incluyendo creación manual con código de oposición largo, conversión idempotente, ficha compacta, escritura de tarea, autorización y rechazo entre organizaciones. También pasan los recorridos existentes de clientes, fuente y oposición/nulidad.
- ESLint de todos los TS/TSX y tests modificados: aprobado, sin advertencias. Lista reproducible: `npx eslint app/app/{brand-combobox,brand-search,opposition,page,registrations,watch-panel,similarity-results}.tsx app/api/demo/route.ts db/demo.ts lib/watch-view-state.ts tests/{watch-view-state.test,ux-response-browser,watch-http}.mjs`.
- `npm run lint`: no aprobado por 5 errores y 4 advertencias previos en archivos sin cambios: `.qa-registration/main.tsx`, `app/app/registration-logo.tsx`, `tests/inapi-procedure.test.mjs`, `tests/pilot-e2e.mjs`; advertencias de imágenes también en landing-mixta/portada-3. No se amplió el encargo para corregirlos.
- Recorrido Chromium final: aprobado sin errores de página a 1440×1000, 820×1100 y 390×844. Confirmó filtros y pestaña sin recarga al volver, feedback inmediato y color verde, ficha del caso exacto, tareas de caso/solicitud antes de la respuesta, rollback de eliminación, borrador preservado al fallar edición, protección contra una lectura antigua, pie claro, selección buscable por teclado y alta real del caso manual, spinner, simplificación de registros, invalidación oculta tras descartar el caso y desaparición inmediata del hallazgo descartado. Capturas inspeccionadas visualmente. Servidor aislado propio en `3411`, mantenido con `WATCH_QA_KEEP=true WATCH_QA_PORT=3411 node --import ./tests/ts-loader.mjs tests/watch-http.mjs`. Comando del navegador y variables de runtime en el documento funcional. Capturas locales: `output/ux-response-2026-10-06/`; no contienen clientes reales.

## Pendientes y siguiente paso
Publicar el PR a `dev`, integrar bajo autorización «súbelos a dev» y comprobar Railway Dev para el SHA exacto. Registrar abajo PR/commit y despliegue. Mantener pendientes de lint separados; no promover a `main` ni producción.
