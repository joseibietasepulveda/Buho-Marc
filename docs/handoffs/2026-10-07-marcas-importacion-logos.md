# Traspaso: incorporación de marcas sin confirmación adicional y logos resilientes

- Actualizado: 2026-10-07 16:29, America/Santiago.
- Estado actual: integrado y publicado en Dev; salud y protección de rutas comprobadas. La prohibición anterior queda reemplazada.
- Rama y base: `codex/marcas-importacion-logos`; `origin/dev` en `18ffae9323a0eee081c1e6ff88d44d98a6600eb0`.
- PR: no creado. Entrega inicial: `5dee504`. Entrega de prioridad DeQuiénEs: `1c1ee7c` (`fix: prefer DeQuiénEs logos across the workspace and reports`). Ambos locales; no publicar ni integrar sin nueva autorización.

## Objetivo y alcance
Retirar la casilla de confirmación de clientes/roles/cartera en Agregar marcas y la restricción asociada. Aplicar el mismo comportamiento a Carga desde Excel. Investigar los logos rotos y mejorar recuperación/presentación. El alcance se amplió después por petición explícita del usuario: priorizar DeQuiénEs en todos los logos de expedientes, incluida Factibilidad e informes.

## Decisiones y motivos
Usuario: retirar casilla/restricción y no subir a Dev. Agente: cliente opcional con valor sin asignar, conservando asignaciones elegidas, deduplicación y separación por organización. Conservar el campo antiguo de API como opcional para compatibilidad, sin exigirlo.

## Diagnóstico inicial (antes de corregir la prioridad)
La normalización entrega `/api/inapi/logo/<solicitud>` para marcas mixtas/figurativas. Ese endpoint descarga de `buscadormarcas.inapi.cl/etiqueta/`, no desde el buscador DeQuiénEs. Las dos descargas correspondientes a la captura fallaron al conectar desde este Mac; no prueba por sí sola la causa exacta del fallo en Railway. CandidateReview no manejaba errores ni reintentos: mostraba el icono roto y el texto alternativo. No se consultó ninguna cartera remota ni se usaron credenciales reales.

## Coordinación e integración
Compartidos: BrandSearch, PortfolioImport, CandidateReview y `/api/portfolio/import`; todos requieren viajar juntos. El endpoint de logos también sirve marcas/solicitudes; conservar sesión y límites. Se reutiliza el worktree propio de este chat, manteniendo `output/` previo. La carpeta principal y otros worktrees no se editan.

## Cambios iniciales (commit `5dee504`)
- `app/app/brand-search.tsx`, `portfolio-import.tsx`: sin casilla ni estado `confirmed`; solo se requiere seleccionar resultados. Cliente por defecto sin asignar y elección opcional por fila/lote. Las asignaciones elegidas se conservan.
- `app/api/portfolio/import/route.ts`: retiro del rechazo por `ownPortfolioConfirmed`. El campo sigue admitido, opcional e ignorado, para clientes anteriores. Conserva sesión, origen, organización, validación de clientes, clasificación por fuente, deduplicación y tratamiento de oposiciones.
- `app/app/candidate-logo.tsx`, `candidate-review.tsx`, `ux-october.css`: carga diferida y hasta dos reintentos automáticos (1,2 y 2,4 segundos); sin icono roto durante fallos. Tras agotar reintentos, «Imagen no disponible» y acción manual Reintentar. «Sin logo» se reserva a registros sin URL.
- `app/api/inapi/logo/[id]/route.ts`: imágenes exitosas con caché privada de navegador de una hora y Vary Cookie; errores sin caché. Cuerpo no vacío y limitado a 8 MiB. Conserva descarga desde host fijo, sesión, cuatro solicitudes simultáneas y deduplicación por solicitud.
- `tests/pilot-e2e.mjs`: importación sin confirmación/cliente, compatibilidad con petición antigua y recuperación/caché/privacidad de logos. `tests/candidate-import-browser.mjs`: recorrido de ambos flujos con fallos de fuente controlados.
- `docs/UX_OCTUBRE_2026.md`: decisión vigente y enlace al traspaso.

## Verificación
Ambiente: macOS, Node 24.14.0, Next 16.3.5, Chromium y PostgreSQL desechable. Proveedor ficticio interceptado; sin cartera ni credenciales remotas.
- `NODE_OPTIONS=--dns-result-order=ipv4first npm run build -- --webpack`: aprobado, incluida comprobación TypeScript. Última compilación incluye los defaults opcionales.
- `node --import ./tests/ts-loader.mjs --test tests/ux-october.test.mjs`: 5/5 aprobadas (búsqueda, paginación, contratos, importador, exportación).
- `npx eslint app/app/{brand-search,portfolio-import,candidate-review,candidate-logo}.tsx app/api/portfolio/import/route.ts 'app/api/inapi/logo/[id]/route.ts' tests/candidate-import-browser.mjs`: aprobado sin advertencias. `npx eslint tests/pilot-e2e.mjs` confirma un error previo `no-empty` en línea 57 (catch de espera del servidor sin contenido). No se amplió el cambio para corregirlo.
- `PILOT_KEEP_SERVER=1 PILOT_APP_PORT=3417 node --import ./tests/ts-loader.mjs tests/pilot-e2e.mjs`: todos los recorridos HTTP aprobados, incluida importación sin casilla ni cliente, clasificación, deduplicación, aislamiento, sesión, caché positiva y recuperación tras HTTP 503 de logos. Puerto de base asignado dinámicamente por el runner.
- `CANDIDATE_QA_BASE=http://127.0.0.1:3417 CANDIDATE_QA_FIXTURE=<carpeta temporal del runner>/source.json PLAYWRIGHT_MODULE=<runtime>/playwright/index.mjs CHROMIUM_EXECUTABLE=<Chromium> node tests/candidate-import-browser.mjs`: aprobado. Verifica logo tras fallo temporal, caída persistente con placeholder y recuperación manual, alta por búsqueda sin confirmación ni cliente, Excel con cliente/rol guardados, rechazo de cliente ajeno antes de importar y móvil sin desborde global. Cero errores de página. El script requiere una base piloto nueva, porque incorpora sus cinco solicitudes ficticias.
- Capturas revisadas visualmente: `output/candidate-import-2026-10-07/{logos-unavailable,selection-desktop,excel-desktop,selection-mobile}.png`, a 1440×1000 y 390×844. Solo datos ficticios. Archivos locales conservados fuera del commit.
- Los primeros intentos del script del navegador exigieron corregir el propio test: cookie Secure en peticiones HTTP de Playwright, selector de label y código de cliente único entre organizaciones. No fueron fallos del producto. La ejecución final completa pasó.
- No se probó el flujo autenticado en Railway ni se publicó. Las dos solicitudes oficiales de imagen de la captura fallaron desde el Mac (también con IPv4); no se confirma causa de red/TLS/redirección en Railway. Este cambio recupera fallos temporales y muestra el estado real, pero no garantiza disponibilidad de INAPI.


Servidor local `3417` y PostgreSQL de pruebas propios detenidos después de verificar. Otros agentes y sus procesos no se tocaron.

## Pendientes al cierre de la etapa inicial
Mantener local hasta autorización explícita de publicación. Antes de integrar, revisar si `dev` avanzó y repetir las verificaciones afectadas. No promover a producción. Si continúan los fallos de imagen en Railway, inspeccionar la respuesta del host oficial desde ese ambiente: no atribuir el fallo a DeQuiénEs ni inventar una imagen.

## Continuación: prioridad de imágenes (7 de octubre)
- Estado: listo y verificado, solo local en `codex/marcas-importacion-logos`, después de `5dee504`.
- Decisión explícita del usuario: todas las imágenes de expedientes deben probar DeQuiénEs primero; INAPI se usa únicamente como respaldo. Reemplaza la decisión técnica anterior de mantener la descarga directa de INAPI.
- Evidencia: documentación pública `https://dequienes.cl/inapi/docs`, revisada en navegador, declara `image_url` en los documentos individuales y batch. `normalizeDocument` conservaba el campo crudo pero ignoraba su URL al construir `logo`.
- Alcance: adaptadores de cartera/semejanza, ruta autenticada compartida, renderizadores y PDF/Word. Reutilizar evidencia guardada por organización para solicitudes antiguas; no migrar datos ni consultar masivamente vigilancia. Imágenes propuestas por usuarios y logos del estudio conservan su origen.
- Verificación de esta continuación: pendiente. No se confirma disponibilidad real de imágenes de DeQuiénEs a partir de su página raíz; se comprobará el orden con fuentes ficticias controladas.

### Implementación de la continuación
- `lib/trademark-image.ts`: URL segura, construcción de proxy y reintentos que conservan el parámetro de origen. `lib/trademark-image-server.ts`: cargador común DeQuiénEs → etiqueta oficial INAPI → HTTP 503 sin imagen; validación de bytes, tamaño y decodificación. Máximo cuatro descargas concurrentes y deduplicación en vuelo por organización/solicitud/URL.
- `lib/inapi-provider.ts`: declara y usa `image_url` al normalizar/reproyectar; conserva el documento original. `lib/similarity-provider.ts`: usa imágenes de la búsqueda o expediente enriquecido. `lib/similarity-contract.ts` comparte validación segura. `lib/source-contract.ts`: longitud de logo hasta 6000 para contener URLs codificadas, sin cambiar esquema de base.
- `db/trademark-image.ts`: obtiene `inapi.image_url` guardada solo si la solicitud tiene un `source_snapshot` de la organización de la sesión. Si falta, consulta únicamente ese número al batch DeQuiénEs con límite de cuatro segundos; descarga de cada imagen con seis segundos. No se ejecuta búsqueda de semejanza ni revisión de cartera para cargar logos.
- `app/api/inapi/logo/[id]/route.ts` y `app/api/similarity/image/route.ts`: sesión requerida, mismo cargador. Éxito DeQuiénEs: `private, max-age=3600`, `Vary: Cookie`; respaldo INAPI: `private, no-store`; fallo: 503 `no-store`. No se guardan caídas de la primera fuente ni se vuelve permanente el respaldo.
- Renderizadores y consumidores: `candidate-logo`, `candidate-review`, `portfolio-logo`, `registration-logo`, `similarity-results`, `trademark-comparison`, `watch-panel`, `feasibility-review`, `opposition-following`, `page` y `client-provider`, bajo `app/app/`. Solicitudes/casos antiguos mantienen compatible su URL guardada. Logos de estudio y propuestas cargadas por el usuario conservan su origen.
- `app/app/report-images.ts`: PDF/Word usa la misma ruta, con ID de solicitud para respaldo. No hay descargas directas del CDN en esos informes. `docs/inapi-dev.md` y `docs/UX_OCTUBRE_2026.md`: comportamiento vigente y operación.

### Verificación de la continuación
Ambiente: macOS, Node 24.14.0, PostgreSQL desechable, proveedor e imágenes ficticias interceptadas; sin consultas autenticadas remotas.
- `node --import ./tests/ts-loader.mjs --test tests/trademark-image.test.mjs tests/similarity.test.mjs tests/ux-october.test.mjs tests/source.test.mjs`: 23 pruebas aprobadas en esos cuatro archivos. Prioridad, evidencia/reproyección, fuente guardada, consulta puntual antigua, fuentes rechazadas, HTML/bytes inválidos/HTTP/red fallidos, fallback no cacheado, recuperación y deduplicación aislada.
- `PILOT_KEEP_SERVER=1 PILOT_APP_PORT=3417 node --import ./tests/ts-loader.mjs tests/pilot-e2e.mjs`: recorridos HTTP aprobados. La imagen primaria exitosa no llama a INAPI; fallo primario seguido de INAPI en orden; recuperación vuelve a DeQuiénEs. Sesión, URLs rechazadas, caché, importación, clasificación y aislamiento siguen funcionando.
- `tests/candidate-import-browser.mjs`, con las variables locales documentadas antes: aprobado; carga DeQuiénEs sin consultar INAPI, ambos fallos con reintentos y recuperación manual, búsqueda/Excel sin casilla, cliente opcional o asignado, aislamiento y móvil sin errores/desborde.
- `tests/trademark-image-browser.mjs`, con esas mismas variables y después del test anterior: aprobado; imágenes/comparación en Factibilidad, descarga real PDF y Word con PNGs incorporados, orden de fallback y cero errores de página. Su primer intento esperaba tres archivos PNG distintos; DOCX deduplica imágenes idénticas del fixture. Se corrigió la prueba para comprobar cuatro dibujos y archivos PNG, y el recorrido completo pasó después.
- Revisión visual de `output/candidate-import-2026-10-07/feasibility-comparison.png`, además de las capturas actualizadas de importación. Artefactos PDF/Word de prueba en esa carpeta; no versionados.
- `git diff --check`: aprobado.
- ESLint específico de todos los archivos TS/TSX y nuevos tests afectados: aprobado sin advertencias. La revisión de React comprueba claves al cambiar origen, actualización funcional de reintentos, timers con limpieza y conservación de la ampliación de imágenes por teclado.
- `NODE_OPTIONS=--dns-result-order=ipv4first npm run build -- --webpack`: compilación final y TypeScript aprobados (incluye las últimas conexiones de imágenes de Clientes y Mis marcas). `node --import ./tests/ts-loader.mjs --test tests/feasibility-report.test.mjs`: 9/9 aprobadas, PDF/Word e imágenes.
- Servidor propio `3417` y PostgreSQL desechable detenidos. No se tocaron procesos de otros agentes.

### Limitaciones y entrega de la etapa local
La prioridad está implementada y verificada con fixtures; no se ha probado la descarga autenticada del CDN real desde Railway ni se garantiza su disponibilidad. Se mantienen solo las dos fuentes comprobadas del código: DeQuiénEs e INAPI. No se inventaron rutas ni fuentes adicionales. No requiere migraciones. Cambios locales, sin push/PR/merge/despliegue. Antes de publicar, integrar avances pertinentes de `dev` y verificar los consumidores compartidos; la prohibición del usuario sigue vigente hasta nueva autorización.

## Continuación: alta rápida y publicación autorizada
- Actualizado: 2026-10-07 16:09, America/Santiago.
- Estado: en curso. El usuario autoriza ahora subir la entrega a Dev; reemplaza expresamente la prohibición anterior. Producción no está autorizada.
- Objetivo: retirar «Confirma el cliente de cada selección…» y empezar cada búsqueda/archivo/candidato nuevo con «Sin cliente asignado», evitando heredar vínculos de un lote anterior. Las elecciones explícitas siguen disponibles de forma opcional; no modificar expedientes previamente guardados.
- Integración: incluir los commits locales de retirada de confirmación y prioridad de logos DeQuiénEs. Base remota revisada: `origin/dev` avanzó a `0958928` (PR #7 de documentación de recuperación de antecedentes); incorporar antes de publicar, preservando ese trabajo.
- Cambio adicional: `BrandSearch.search(false)` reinicia asignaciones y defaults; cada candidato nuevo/paginado usa `unassigned`, preservando ajustes explícitos de filas anteriores al cargar más. `PortfolioImport.read` reinicia defaults y `merge` inicializa cada candidato nuevo sin cliente. Seleccionar filas no aplica clientes de forma implícita. Retiradas instrucciones de progreso que exigían revisar clientes/roles antes de incorporar.
- El error citado por el usuario ya no existe en estos cambios locales, pero sí en `origin/dev` anterior. Publicar también `5dee504` retira ese bloqueo y la casilla del frontend/API.
- Verificación actual: build/TypeScript y 32 pruebas dirigidas aprobados tras incorporar `0958928`; ESLint dirigido aprobado y diff sin errores. Integración HTTP/PostgreSQL y navegador aprobados en el piloto desechable `3417`: nuevo Excel y búsqueda repetida empiezan sin cliente, se puede agregar inmediatamente, cliente explícito sigue guardándose, cliente ajeno se rechaza y logos mantienen prioridad/respaldo/recuperación. Captura de escritorio revisada; móvil sin desborde ni errores. Proveedores ficticios, sin consultas a carteras remotas.
- Entrega adicional: `6240b34c05dedde8d01117a1172457455c302917`. PR [#8](https://github.com/joseibietasepulveda/Buho-Marc/pull/8), integrado en `dev` mediante `26dfd3551b7a6795f4ec731df406f00e0a9696f4` el 7 de octubre a las 16:19 America/Santiago.
- GitHub deployment `6918702406`, ambiente `heartfelt-magic / Dev`, SHA exacto de integración: `success` a las 16:21:45 America/Santiago. Comprobación posterior `/api/health`: HTTP 200, `ok: true`, base conectada y `engine: dequienes`. `/api/watch`, `/api/registrations` y ambos proxies de imágenes: 401 sin sesión, sin descargar logos ni consultar expedientes remotos.
- `main` permanece en `3e0426526079188626682956a53bff9fdb3a8332`; no se promovió a producción. No se cambiaron cuentas, claves, carteras ni configuración del supervisor.
- Las pruebas autenticadas y de imágenes son las del piloto local. La lectura del panel Railway mediante navegador falló por timeout de control CDP; no se examinaron logs privados de arranque en esa comprobación. La evidencia remota del despliegue proviene de GitHub/Railway para el SHA exacto y de salud/rutas HTTP; no acredita disponibilidad de cada logo real del CDN.
- Git en Escritorio/iCloud presentó una lectura SIGBUS y demoras de varios minutos. Se conservaron archivos y commits; el commit y push funcional terminaron. El fetch terminó y se incorporó el SHA integrado mediante fast-forward. El cierre documental usa la misma rama; no se modificó Git interno ni worktrees de otros chats.

Registro de cierre actualizado: 2026-10-07 16:28, America/Santiago. Servidor y base de prueba propios detenidos; capturas locales conservadas en `output/`.
