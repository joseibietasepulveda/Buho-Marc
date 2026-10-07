# Despliegue y operación en Railway

Actualizado el 7 de octubre de 2026. Las mejoras se publican únicamente en **Dev** desde la rama `dev`. Production sigue `main` y requiere autorización expresa para una promoción posterior.

## Actuaciones y recuperación puntual INAPI · 7 de octubre

- [PR #6](https://github.com/joseibietasepulveda/Buho-Marc/pull/6), integrado en `dev`: `18ffae9323a0eee081c1e6ff88d44d98a6600eb0`; commit funcional `e0dd67b943b7ffeee5fa3fc8e32658c6cb658c4d`.
- Despliegue `ad376c61-3bc6-4986-b406-0414966c7c8a`, **SUCCESS**, SHA exacto de integración y ambiente Dev `9e2891f0-7281-4872-a992-2c48866a782d` verificados mediante Railway CLI. Compilación y TypeScript remotos aprobados; arranque con migraciones correctas y servidor listo.
- Migración `0014_inapi_recovery.sql` comprobada también en `drizzle.__drizzle_migrations`: SHA-256 `c6c0f60da593ee446e128135d635d0338d42f08582e5eab22bf94b1e7e7a08e9`, idéntico al archivo entregado.
- `/api/health`: 200, base conectada, `engine: dequienes`, fuente configurada y programación activa. Solicitudes: 401 sin sesión. Recuperación: 403 sin secreto, sin efectuar llamadas oficiales desde esa comprobación.
- Variables explícitas del servicio web **Dev**: `SOURCE_PROVIDER=inapi`, `INAPI_DIRECT_RECOVERY_ENABLED=true`, `INAPI_DIRECT_RECOVERY_DAILY_LIMIT=200`. Comprobación del runtime: habilitada, presupuesto 200 e intervalo 3000 ms. El reloj/bloqueo PostgreSQL compartido y la deduplicación persistente conservan sus reglas entre despliegues.
- Operación autorizada sobre el historial existente: vista previa y `scripts/reproject-inapi-records.ts --apply --queue`, 222 registros reproyectados y 56 recuperaciones preparadas. Ambos comandos informaron `externalRequests: 0`; el supervisor atiende la cola posteriormente, dentro del presupuesto. La QA local usó datos ficticios y no consultó INAPI.
- Límite operativo observado: primera consulta del supervisor fallida (`fetch failed`), 55 trabajos pendientes y pausa global hasta `2026-10-07T18:39:51.418Z` (15:39:51 Santiago). DNS resolvió `buscadormarcas.inapi.cl`; una comprobación TLS sin petición HTTP no completó la conexión en 20 segundos. La conexión local también falló (`ENETUNREACH`). No hubo una respuesta HTTP que permita atribuir rechazo al proveedor, ni se certifica recuperación de fechas nuevas. No se omitió la pausa ni se reintentó el expediente fallido.
- Node local 24.19, 91 pruebas dirigidas/integración PostgreSQL, lint del cambio, compilación y piloto completo aprobados. [Operación y contrato](INAPI_RECUPERACION_ANTECEDENTES.md) y [traspaso con verificaciones](handoffs/2026-10-07-recuperacion-inapi-y-actuaciones.md).
- `main` comprobado en `3e0426526079188626682956a53bff9fdb3a8332`; sin promoción ni cambios de variables en producción. El registro posterior de esta entrega solo cambia documentación.

## Alta rápida y logos DeQuiénEs — 7 de octubre

- [PR #8](https://github.com/joseibietasepulveda/Buho-Marc/pull/8), integrado en `dev`: `26dfd3551b7a6795f4ec731df406f00e0a9696f4`; último commit funcional `6240b34c05dedde8d01117a1172457455c302917`.
- GitHub deployment `6918702406`, ambiente `heartfelt-magic / Dev`, SHA exacto de integración; estado `success` el 7 de octubre a las 16:21:45 America/Santiago.
- Alta sin casilla ni aviso de confirmar clientes. Cada búsqueda, archivo y candidato nuevo comienza «Sin cliente asignado», sin heredar elecciones anteriores. Asignación explícita opcional; datos existentes conservados.
- Logos de expedientes: DeQuiénEs primero en todas las pantallas y PDF/Word; etiqueta oficial INAPI solo como respaldo. Evidencia guardada reutilizada, proxies con sesión, fallos y respaldo sin caché. Sin migraciones.
- Build/TypeScript, ESLint dirigido, 32 pruebas, PostgreSQL/HTTP y Chromium aprobados con datos/proveedores ficticios. Nuevo Excel y búsqueda repetida sin herencia de cliente; incorporación directa, aislamiento, recuperación de logos y móvil comprobados.
- Salud posterior 200/base conectada/`engine: dequienes`; vigilancia, solicitudes y ambos proxies de imagen responden 401 sin sesión. No se hicieron operaciones sobre datos remotos ni búsquedas adicionales de INAPI. El panel de logs no se leyó por timeout del navegador; no se afirma disponibilidad de cada imagen real del CDN.
- `main` conserva `3e0426526079188626682956a53bff9fdb3a8332`, sin promoción a producción. [Comportamiento](UX_OCTUBRE_2026.md) y [traspaso](handoffs/2026-10-07-marcas-importacion-logos.md).

## Resúmenes y respuesta inmediata · 6 de octubre

- [PR #5](https://github.com/joseibietasepulveda/Buho-Marc/pull/5), integrado en `dev`: `2cad7ab674c4e135dfe003f8838efb9f09d9305c`; commit funcional `238a98a12df708d4068be874f1759791a3d6189e`.
- GitHub deployment `6897977391`, ambiente `heartfelt-magic / Dev`, SHA exacto de integración; estado `success` el 6 de octubre a las 20:49:29 America/Santiago.
- Salud posterior HTTP 200, base conectada, `engine: dequienes`; Vigilancia y cartera responden 401 sin sesión. No se hicieron acciones sobre datos remotos ni consultas nuevas a INAPI.
- Tabla comparativa y titular; loading y selectores buscables; Vigilancia conservada entre visitas, feedback inmediato y apertura del caso exacto; tareas optimistas con recuperación; registros simplificados y corrección del contador de casos. Sin dependencias ni migraciones nuevas.
- Compilación/TypeScript, 21 pruebas dirigidas, integración HTTP/PostgreSQL y recorrido Chromium con latencia/fallo/lectura antigua aprobados. ESLint de archivos modificados aprobado; lint global conserva problemas ajenos documentados. [Comportamiento vigente](UX_RESPUESTA_INMEDIATA_2026-10-06.md) y [traspaso con límites y evidencia](handoffs/2026-10-06-ux-respuesta-inmediata.md).
- `main` permanece en `3e0426526079188626682956a53bff9fdb3a8332`; sin promoción a producción. El registro posterior solo modifica documentación.

## Referencias internas de la interfaz · 6 de octubre

- PR [#4](https://github.com/joseibietasepulveda/Buho-Marc/pull/4), integrado en `dev`: `ec7ecbdc0aab09375781b8e13c2e189e2d3d6b8b`.
- Despliegue Dev `ccd33df2-583a-4ae4-8fdb-cabe57f6a226`: exitoso el 6 de octubre a las 20:19:43 America/Santiago; SHA y ambiente confirmados mediante GitHub deployment `6897542363`. Compilación remota aprobada. Salud HTTP 200, base conectada y `engine: dequienes`.
- Cabeceras, notificaciones y correo al cliente sin referencias internas; relaciones e identificadores oficiales conservados. Sin migraciones ni cambios de API. 19 pruebas dirigidas, lint, compilación local y revisión visual con fixtures aprobados. [Alcance y traspaso](handoffs/2026-10-06-ux-sin-referencias-internas.md).

## Implementación de las maquetas aprobadas · 5 de octubre

- Commit funcional de UI/UX: `865f535e6699192af6e2ac3699e7c8af96b87c2b`; publicado junto con la documentación de protección en `d6fb8182ddcd4452996ad516a7adcf9f0ccfac4c`.
- Despliegue de la entrega funcional: `3857245e-4072-4785-b9f0-698bb3c8cd90`, **SUCCESS**, desde GitHub y rama `dev`. Railway procesó esta entrega durante el incidente de retrasos de GitHub; no fue necesario cambiar de vía ni duplicar despliegues para sortearlo.
- Compilación y TypeScript aprobados. Los registros del arranque confirman migraciones correctas, cuenta existente conservada, perfiles sin sobrescribir, importación inicial ya realizada y servidor listo. La entrega incluye `0013_watch_feedback.sql`.
- `/api/health`: 200, `ok: true`, `database: connected`, `engine: dequienes`, fuente configurada y programación activa.
- Auditoría, feedback y perfil del estudio: 401 sin sesión. `/app` redirige al ingreso. `/ui/caret-down.svg`: 200 y hash idéntico al archivo de esta entrega.
- Respaldo previo: copia lógica cifrada de Dev de 109.679.639 bytes sin cifrar, lectura completa y transferencia/descifrado comprobados; acceso SSH temporal retirado. No se probó una restauración en una base ni se automatizaron respaldos.
- Producción conserva el despliegue `ec692224-cb76-4180-8db1-db78e60fd82d`, de `main`, commit `3e04265`. No hubo promoción de esta UI/UX.

La revisión autenticada de los flujos y la QA visual permanecen en el piloto local aislado. La comprobación de esta publicación no hizo operaciones sobre carteras reales ni consultas nuevas de INAPI. Véase [implementación y límites](UX_IMPLEMENTACION_OCTUBRE_2026.md); comprobaciones HTTP y capturas se conservan en `output/deploy-dev-2026-10-05/`. El commit posterior que actualiza estos registros solo cambia documentación.

## Entrega funcional verificada · 2 de octubre

- Commit de UI e informes: `b42ae34c4bc15bb8224206cb4b4db5b8452452f8`, posterior a las mejoras de cartera/clientes `5a2010e` y de paneles/móvil `d4a5272`.
- Despliegue Dev: `f02635e3-bd50-4342-9931-710d648b36a4`, estado **SUCCESS**.
- Compilación y TypeScript aprobados, migraciones aplicadas correctamente y arranque completado.
- El arranque confirmó la precarga en `juan-pablo-zamora`, `fa-abogados` y `daniel-morales`.
- `/api/health`: 200, `ok: true`, `database: connected`, `engine: dequienes`, fuente configurada y programación activa.
- `/api/report-profile`: 401 sin sesión. Los tres logos publicados respondieron 200 como PNG.
- `main` permaneció en `3e04265`; la entrega de octubre no se promovió a producción. La promoción y carga FA del día 1 tienen su [registro separado](PILOTO_FA_Y_PRESENTACION_2026-10-01.md).

Esta es la evidencia del despliegue funcional, no un indicador de que toda revisión de vigilancia haya terminado ni una llamada real a OpenRouter. La revisión autenticada y de formatos se realizó en un piloto local aislado. Véanse [UI/UX](UX_OCTUBRE_2026.md) e [informes](INFORMES_FACTIBILIDAD_2026-10-02.md).

## Rutas y ambientes

| Ruta | URL | Propósito |
| --- | --- | --- |
| Web app Dev | [Aplicación Dev](https://buho-marc-web-dev.up.railway.app/app) | Funciones nuevas y cuentas piloto, con sesión. |
| Web app production | [Aplicación production](https://buho-marc-web-production.up.railway.app/app) | Entrega estable promovida por separado. |
| Landing en Dev | [Landing](https://buho-marc-web-dev.up.railway.app/) | Presentación comercial y dashboard estático. |
| URL anterior | [Landing de prueba](https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js) | Redirige a la landing principal. |

La landing comercial se publica separadamente en [Vercel](https://buho-marc.vercel.app/). Los enlaces de pricing apuntan a `https://buho-marc.vercel.app/#pricing`.

Cada ambiente tiene PostgreSQL independiente. Publicar código no copia carteras, usuarios, claves, perfiles ni conclusiones entre bases. La precarga de perfiles está protegida por el ID exacto de Dev: `9e2891f0-7281-4872-a992-2c48866a782d`.

## Servicios e inicio

El proyecto tiene un servicio web conectado a `joseibietasepulveda/Buho-Marc` y PostgreSQL, con `DATABASE_URL` referenciada desde la base al servicio web. La cola durable usa PostgreSQL; no requiere Redis.

`railway.json` configura `npm run build`, `npm run railway:start` y el health check `/api/health`. El arranque ejecuta, en orden:

1. `npm run db:migrate`.
2. `npm run account:provision`: mantiene las cuentas existentes y ejecuta las preparaciones autorizadas para su ambiente.
3. `npm run start`: Next.js y el supervisor de sincronización/vigilancia.

Las migraciones actuales incluyen `0011_notification_dismissal.sql` y `0012_feasibility_report_settings.sql`. La segunda guarda el perfil del estudio y el historial de conclusiones, sin borrar expedientes. `provisionReportProfiles` solo completa perfiles vacíos/versionados en cero; no sobrescribe ediciones ni restaura datos que un usuario haya borrado.

`dev:local` y `.buho-local/` son exclusivamente para el computador y no se usan en Railway. Los fixtures permanecen separados de las cuentas reales. La variable `NEXT_PUBLIC_MOCK_ATTRIBUTE_SEARCH=false` evita ofrecer búsquedas ficticias en el alta del piloto real.

## Variables del servicio web

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Referencia privada al PostgreSQL del mismo ambiente. |
| `SOURCE_PROVIDER=inapi` | Activa la fuente real. |
| `INAPI_API_KEY` | Credencial privada para DeQuiénEs, únicamente en servidor. |
| `APP_PUBLIC_ORIGIN` o `RAILWAY_PUBLIC_DOMAIN` | Origen validado para acciones del navegador. |
| `MONITORING_SCHEDULER_ENABLED` | Habilita el supervisor; respeta el modo automático/a pedido de cada organización. |
| `MONITORING_CRON_SECRET` | Credencial interna del worker; el supervisor puede generarla. |
| `OPENROUTER_API_KEY` | Opcional: activa la redacción asistida de conclusiones. Sin ella funciona el respaldo determinista. |
| `OPENROUTER_MODEL` | Opcional, predeterminado `openai/gpt-4.1-mini`. |
| `PORT`, `NODE_ENV` | Configurados por el entorno de ejecución. |

En local, [openrouter.example.txt](../openrouter.example.txt) se copia como `openrouter.private.txt`. Ese archivo está ignorado por Git y no se publica en Railway. Las variables del servidor tienen prioridad. No incluir valores reales de claves en documentación, commits, navegador o registros de generaciones.

Las variables temporales de provisión de cuentas/correcciones solo se utilizan cuando la operación y el ambiente fueron autorizados; se retiran después de verificarla. Sus contraseñas no se documentan. Los perfiles de los tres estudios no necesitan una contraseña nueva.

## Verificar una entrega

1. Comprobar el commit exacto de la rama esperada, el ambiente y el estado `SUCCESS`. Un push o una compilación local no acreditan el despliegue.
2. Consultar `/api/health`: con fuente real se espera `engine: dequienes`, base conectada y fuente configurada. La ausencia de clave OpenRouter no altera este indicador de INAPI.
3. Confirmar migraciones y arranque en los registros del despliegue exacto; no confundirlos con los de una entrega anterior.
4. Comprobar 401 en rutas privadas sin sesión y el aislamiento en el piloto descartable. No cambiar claves de usuarios para verificar una entrega visual.
5. Verificar los nuevos flujos en una base aislada: candidatos, cliente/rol, duplicados, informes de cliente, Casos simple/detallado, retirada de avisos y eliminación de tareas.
6. Para informes de factibilidad, comprobar guardado/recarga del perfil, conflicto de edición, éxito/error del proveedor aislado, reutilización de la conclusión y descarga de ambos formatos. Renderizar y revisar las páginas completas.

No disparar búsquedas remotas, revisiones de cartera ni llamadas facturables solo para comprobar documentación o maquetación. `scripts/verify-feasibility-layout.ts` usa una consulta guardada; puede descargar imágenes de origen si no están en la caché local.

## Operación y pendientes

La consulta de lectura del 5 de octubre de 2026 confirmó volúmenes persistentes y PGDATA dentro del montaje en Dev y producción, pero listas vacías de respaldos y programaciones nativas, y PITR desactivado en ambos. La protección y sus pruebas **siguen pendientes**. El [informe de protección de bases](PROTECCION_BASES_DE_DATOS_2026-10-05.md) contiene los identificadores, la evidencia y la secuencia para implementarla en otro chat. No se modificaron servicios durante esa investigación.

Al preparar la nueva publicación de Dev, el panel autenticado de Postgres confirmó que **crear respaldos nativos y habilitar PITR requiere Pro** con el plan actual. Renovar la autorización de la CLI no resolvió su error `OAUTH_INSUFFICIENT_GRANT`. Revalidar el plan antes de intentar configurar estas protecciones; no ampliar la suscripción sin aprobación. Una copia lógica puntual de Dev, si se registra antes de publicar, no acredita la automatización ni la protección de producción.

El usuario autorizó un acceso SSH temporal para una primera copia lógica de Dev. El 5 de octubre, a las 16:10 UTC, se comprobó el archivo de `pg_dump 18.6` (109.679.639 bytes, 35 entradas de datos de tablas), su transferencia y su cifrado/descifrado. La clave SSH y los archivos temporales se retiraron. La copia privada, sus límites y el procedimiento están registrados en el [informe de protección](PROTECCION_BASES_DE_DATOS_2026-10-05.md). No hubo restauración sobre una base de ensayo ni protección de producción en esta operación.

Daniel conserva la revisión diaria a las 12:30 de `America/Santiago`; `estudio-ibieta-ip` permanece a pedido. Consultar [control de consumo](COST_CONTROL.md) y la cola para conocer el progreso. Un health check exitoso no acredita la finalización de trabajos.

Quedan pendientes activar OpenRouter con una credencial real y comprobar ese llamado; permisos/invitaciones avanzados, almacenamiento general de adjuntos y estudios completos, envío de correos, métricas, respaldos con restauración probada y capacidad a escala. Autenticación piloto, aislamiento, motor de similitud e informes PDF/Word ya están implementados.

La CLI de Railway advirtió durante esta entrega que `railway.json`/`railway.toml` quedarán obsoletos el 1 de diciembre de 2026. La migración de configuración se mantiene como tarea independiente; no se realizó en esta ronda.

## Antecedentes

Los despliegues y comprobaciones anteriores están en [UX_RELEASE_PLAN](UX_RELEASE_PLAN.md), [v0.4](V0_4_RELEASE.md), [v0.5](V0_5_RELEASE.md), [v1.0 inicial](V1_0_RELEASE.md) y [piloto FA](PILOTO_FA_Y_PRESENTACION_2026-10-01.md). Sus recorridos simulados y commits no sustituyen la verificación de una entrega actual.

## Pulido visual · 4 de octubre de 2026

La entrega funcional `83386dc` se publicó únicamente en Dev. Despliegue `dc2db98a-0f70-486b-8ab8-2d020a41bfab`: `SUCCESS`, compilación/TypeScript correctos y salud 200/base conectada con `engine: dequienes`. La acción `PATCH /api/notifications` necesita sesión; la limpieza de Prioritarias utiliza campos existentes y no agrega migraciones. Detalle de cambios, contratos y QA en [Pulido del 4 de octubre](UX_PULIDO_2026-10-04.md).
