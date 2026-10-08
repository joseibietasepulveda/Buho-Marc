# Traspaso: promoción de Dev a producción conservando datos

- Actualizado: 2026-10-08, America/Santiago.
- Estado: preparación y ensayo aprobados; producción todavía sin promover.
- Rama: `codex/promocion-produccion-octubre`; base Dev `345cba5bc36a3b73a1e0f7ab15f8ea4aa7032211`.
- Producción inicial: Main `3e0426526079188626682956a53bff9fdb3a8332`, despliegue `ec692224-cb76-4180-8db1-db78e60fd82d`.
- PR/commit de entrega: pendiente.

## Objetivo y autorización
El 08/10 el usuario autoriza expresamente pasar Dev a Main y pide conservar tareas, clientes, notificaciones, vigilancias avisadas y demás datos antes/después. Se promueve código sobre la base existente de producción. No se sustituyen bases ni se trasladan carteras entre ambientes. La maqueta de bienvenida sigue separada; se consultó si debía incorporarse, con opción predeterminada de promover la versión ya publicada en Dev.

## Preparación y evidencia inicial
- Dev remoto y desplegado: `345cba5`, despliegue `12ca4823-7852-46fb-a056-e49a260be4ae`, SUCCESS; Main/producción continúan en `3e04265`.
- 33 commits comparados. Migraciones nuevas 0011–0014: descarte de notificaciones, perfiles/conclusiones, feedback y cola INAPI. Son aditivas; no borran filas existentes.
- Producción: importación inicial false; ninguna variable temporal de provisión/corrección activa. Perfiles precargados y reparaciones automáticas de Daniel están protegidos por UUID exacto de Dev.
- PostgreSQL producción 18.6, tamaño inicial aproximado 992 MB. Conexión por SSH temporal propia; credenciales no se imprimen ni versionan.
- Respaldo y manifiestos privados se conservan fuera del repositorio, en `.codex/private-backups/buho-marc/production/2026-10-08-promotion/`. No incluir datos ni claves en commits.

## Decisiones técnicas y coordinación
Worktree nuevo para conservar auditorías/maquetas del worktree anterior y otros chats. Antes de promover: copia lógica cifrada, restauración local aislada, comparación de huellas por fila sobre columnas preexistentes, migración y arranque ensayados. Conservar esquema/variables/identidad de la base activa. Los controles de clientes, asignaciones, roles, tareas y decisiones no se deducen solo de conteos.

La API pública INAPI requiere una separación mínima de tres segundos; su reloj actual es por base de datos. No activar accidentalmente un segundo trabajador independiente en producción sin resolver la coordinación con Dev. La nueva variable está ausente en producción y su default sería habilitado: revisar antes de promover.

## Verificación
- Inventarios de ambos ambientes mediante transacciones repetibles de solo lectura; comparación por clave y huella de todas las filas, no solo conteos.
- Respaldo custom completo de producción con pg_dump 18.6: 357.946.080 bytes sin cifrar, transferencia y descifrado comprobados. SHA-256 `6ac8ec04a44cdc02002d4fccdb39676f08cf78a1ce18dab9c68b088f57bf3f2b`. Copia cifrada con AES-256-CBC/PBKDF2 SHA-256, 600.000 iteraciones, contraseña privada separada del archivo.
- Restauración en PostgreSQL 18 local, base nueva enlazada solo a 127.0.0.1, sin sobrescribir ambientes remotos. Las 33 tablas restauradas coinciden íntegramente con la captura remota. Se restauran sin propietarios/ACL específicos de Railway; el respaldo lógico no incluye roles globales del clúster.
- Ensayo de las migraciones 0011–0014 y `scripts/provision-pilot.ts` con identidad de producción: 33 tablas previas sin filas eliminadas/añadidas/modificadas; cuatro tablas nuevas. Los hashes excluyen solo las columnas añadidas por estas migraciones para comparar el contenido preexistente.
- `npm run build -- --webpack`: compilación y TypeScript aprobados en la base exacta Dev.
- `node --import ./tests/ts-loader.mjs --test tests/watch-view-state.test.mjs tests/watch-feedback.test.mjs tests/portfolio-import.test.mjs tests/registration-procedure.test.mjs tests/registration-evidence.test.mjs tests/case-tasks.test.mjs tests/ux-october.test.mjs tests/trademark-image.test.mjs`: 47 pruebas aprobadas.
- `node --import ./tests/ts-loader.mjs tests/pilot-e2e.mjs`: aprobado con PostgreSQL descartable y proveedores simulados. Conservación de prioridades/avisos/evidencia, tareas, aislamiento, importaciones, estados cerrados, informes/perfiles y recuperación de logos.
- Sobre la restauración se ejecutaron `getDemoSnapshot()` y `watchSnapshot(true)` usando primero código Main y después código Dev. Comparación idéntica de identidades de marcas, casos con tareas/estado/responsables, avisos completos, coincidencias revisadas, miembros y todos los resultados guardados con `reviewStatus`/`watchPublication` en las dos carteras de producción con actividad real. `fetch` bloqueado durante esa prueba; sin consultas INAPI.
- No se certifica una nueva sesión visual autenticada sobre clientes de producción; la interfaz corresponde a la versión ya comprobada y publicada en Dev. La maqueta de bienvenida no forma parte del código promovido.

## Configuración de recuperación directa
Antes de promover, producción se configura con `INAPI_DIRECT_RECOVERY_ENABLED=false` y presupuesto `INAPI_DIRECT_RECOVERY_DAILY_LIMIT=200`, sin despliegue anticipado. DeQuiénEs y su programación vigente permanecen activos. Dev mantiene el único trabajador público habilitado, 200 expedientes/día y mínimo 3 segundos; el 08/10 seguía fallando por conectividad y conservaba su pausa de una hora. No activar otro trabajador sobre una base independiente mientras el límite global no esté coordinado. Esta limitación debe comunicarse y no declararse como recuperación operativa en producción.

## Pendientes
1. Integrar documentación de preparación a Dev y crear/adjuntar PR Dev→Main. Solo cambian documentos frente al código ensayado.
2. Integrar versión verificada, esperar SUCCESS y verificar migraciones/salud y huellas de ambos ambientes.
3. Actualizar README y operación con evidencia, retirar acceso SSH temporal y procesos propios.
4. Coordinar una única cuota/reloj para recuperación pública entre ambientes antes de habilitarla en producción. La protección periódica de bases y PITR siguen como encargo separado; esta promoción incluye respaldo puntual con restauración comprobada.
