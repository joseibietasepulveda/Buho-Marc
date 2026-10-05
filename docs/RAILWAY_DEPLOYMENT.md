# Despliegue y operación en Railway

Actualizado el 2 de octubre de 2026. Las mejoras de UI e informes de esta ronda se publican únicamente en **Dev** desde la rama `dev`. Production sigue `main` y requiere autorización expresa para una promoción posterior.

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
