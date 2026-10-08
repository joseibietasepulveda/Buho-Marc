# Resúmenes y respuesta inmediata · 6 de octubre de 2026

Estado: integrado mediante [PR #5](https://github.com/joseibietasepulveda/Buho-Marc/pull/5) y publicado únicamente en Railway Dev el 6 de octubre de 2026. SHA funcional `2cad7ab674c4e135dfe003f8838efb9f09d9305c`; despliegue confirmado como `success` y salud HTTP 200. Véase el [registro operativo](RAILWAY_DEPLOYMENT.md). Esta decisión explícita del usuario actualiza la presentación descrita en [implementación de octubre](UX_IMPLEMENTACION_OCTUBRE_2026.md). El alcance y la evidencia de entrega se mantienen en el [traspaso](handoffs/2026-10-06-ux-respuesta-inmediata.md).

## Comportamiento vigente

- Resumen Vigilancia: «Lo que requiere atención» contiene hasta tres comparaciones, con nombre, logo y Niza de la marca protegida y la detectada. Ambas celdas permiten abrir el hallazgo. «Ver toda la vigilancia» usa el mismo estilo morado de «Ver calendario» y abre Vigilancia. El detalle conserva publicación, índice y antecedentes.
- Mis marcas: «Nombre titular» muestra el titular informado por la fuente. Los vínculos de cliente siguen disponibles en la ficha. La búsqueda al agregar marcas muestra un spinner pequeño y «Consultando…» mientras la fuente responde.
- Vigilancia: la vista se monta la primera vez y conserva búsqueda, filtros y pestaña al visitar otros apartados. No vuelve a solicitar la cartera por el mero cambio de sección. La consulta periódica existente se detiene cuando el apartado está oculto; al estar visible mantiene su intervalo de 30 segundos y sus actualizaciones por cambios de fuente. Las modificaciones de cartera, revisión y descarte de casos invalidan la vista aunque esté oculta; la visita siguiente incorpora esos cambios. No se inicia una búsqueda remota al entrar ni se escribe una cartera en almacenamiento compartido del navegador.
- Seguir y activar aviso muestran inmediatamente el estado de la solicitud. Al confirmar el servidor, la tarjeta cambia a «En seguimiento» o «Aviso de publicación activado» sin esperar la recarga del resumen. Un fallo deja los controles originales y muestra un error.
- Convertir muestra «Creando caso» y, tras la confirmación, un botón verde «Ir al caso». Abre Casos y la ficha exacta del caso vinculado. El acceso permanece durante las actualizaciones periódicas con los mismos filtros mientras el servidor mantenga la conversión; cambiar filtros o invalidar la cartera devuelve la selección ordinaria de resultados. No modifica la condición de envío de avisos ni la clasificación jurídica.
- Casos: el pie del formulario de oposición/nulidad usa fondo claro. El selector de marca del caso y el de fundamento de oposición permiten escribir y desplegar opciones, con búsqueda sin distinguir acentos, flechas, Enter y Escape. Muestran la solicitud oficial cuando está disponible. En el caso manual el valor enviado identifica la marca exacta, incluso si hay nombres repetidos.
- Tareas: guardar y eliminar actualizan la lista local al pulsar. El servidor sigue validando y persistiendo el cambio; un fallo restaura la tarea y conserva el borrador del editor. El formulario termina al recibir la confirmación de escritura, sin una segunda carga de toda la cartera. Las respuestas de lectura iniciadas antes de la escritura no revierten los cambios nuevos. Se aplica a tareas de casos y solicitudes, y por ello a sus calendarios y resúmenes.
- Resumen de registros: se retira el indicador de antecedentes por completar y la lista sin fecha de «Requiere completar antecedentes». Atención contiene únicamente plazos legales próximos o vencidos con fecha. Las solicitudes, la agenda y la tabla de movimientos se conservan.
- Ficha de solicitud: se retira el editor «Respaldo de los plazos». No se eliminan evidencias almacenadas, fechas ni reglas de cómputo; la API de antecedentes sigue existiendo para consumidores autorizados.

## Interfaces compartidas

`GET /api/demo` amplía cada elemento de `watchSummary.preview` con `brandImage`, `brandClasses` y `foundClasses`. Los campos son adicionales; el panel conserva alternativa para datos anteriores.

`POST /api/demo` conserva las respuestas históricas cuando no se pide `compact`. `saveCaseTask` acepta `compact: true` y devuelve `{ saved: true }` después de la escritura. `reviewMatch` con `compact: true` conserva `caseId` y añade `case`, con los datos de la ficha y sus tareas, limitado a la organización de la sesión. `createCase` admite `brandCode` opcional para elegir la marca exacta; los consumidores anteriores pueden seguir enviando `brand` por nombre. Un identificador de otra cartera no encuentra marca válida. El alta manual comparte el bloqueo y contador `BM` de la conversión: ignora códigos de oposición/nulidad al asignar el siguiente número, evitando desbordamiento de entero y colisiones entre ambos flujos.

`lib/watch-view-state.ts` actualiza los resultados confirmados, los contadores y las filas de seguimiento sin duplicar coincidencias. `BrandCombobox` se comparte entre los dos formularios. `SimilarityImage` conserva ampliación por defecto; en la comparación del resumen usa `zoomable={false}` para que el logo forme parte del enlace al hallazgo sin introducir un control interactivo dentro de otro.

No hay dependencias nuevas ni migraciones. El orden de entrega es API y componentes en el mismo commit/PR. Se conservan las reglas de seguimiento, autorización, origen y aislamiento por organización.

## Verificación reproducible

Ambiente: macOS, Node 24.14.0, Next 16.3.5; PostgreSQL desechable y fuente simulada por `tests/watch-fixture-hook.mjs`. Ninguna comprobación de UI consulta una cartera real.

```sh
NODE_OPTIONS=--dns-result-order=ipv4first npm run build -- --webpack
node --import ./tests/ts-loader.mjs --test tests/watch-view-state.test.mjs tests/watch-page.test.mjs tests/watch-list.test.mjs tests/watch-discovery.test.mjs tests/snapshot-client.test.mjs tests/case-tasks.test.mjs
node --import ./tests/ts-loader.mjs tests/watch-http.mjs
```

Para el recorrido de navegador, mantener un segundo servidor aislado y elegir un puerto propio:

```sh
WATCH_QA_KEEP=true WATCH_QA_PORT=3411 node --import ./tests/ts-loader.mjs tests/watch-http.mjs
UX_QA_BASE=http://127.0.0.1:3411 PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs CHROMIUM_EXECUTABLE=/ruta/a/chromium node tests/ux-response-browser.mjs
```

El script de navegador rechaza hosts externos; comprueba navegación sin otra carga, feedback de acciones, caso exacto, guardado compacto, eliminación inmediata, recuperación ante error, protección frente a lecturas antiguas, selectores, loading y registros. Incluye capturas de escritorio, tablet y móvil en `output/ux-response-2026-10-06/` (evidencia local). Los resultados y límites finales se registran en el traspaso.
