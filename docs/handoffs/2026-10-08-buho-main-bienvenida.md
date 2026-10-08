# Traspaso: cartera Búho Marc en producción y bienvenida

- Actualizado: 2026-10-08, America/Santiago.
- Estado: en curso.
- Rama y base: `codex/buho-main-bienvenida`; Dev `35537ed3b7d68360a07dff4cef47c1afa468fdaa`.
- PR: [#14](https://github.com/joseibietasepulveda/Buho-Marc/pull/14); commit funcional `7525d81`.

## Objetivo y alcance
El usuario autoriza copiar los datos del espacio Búho Marc de Dev a producción e incorporar la bienvenida de dos pasos propuesta en HTML. Solo se copia la organización `estudio-ibieta-ip`; conservar las demás carteras y credenciales/sesiones de producción. Implementar anuncio de novedades y expectativas futuras una vez por usuario/organización/versión; casillas de lectura y dos aceptaciones, con opción de posponer.

## Decisiones y motivos
- Usuario: traslado de datos Búho de Dev a Main y publicación de bienvenida.
- Agente: copia transaccional ensayada, respaldos privados cifrados, inventarios por clave/huella, conservación de usuarios y sesiones existentes. No copiar sesiones Dev ni activar otro trabajador INAPI independiente.
- La bienvenida ahora debe aparecer también en producción; reemplaza la restricción Dev-only de la maqueta del 07/10. Las mejoras futuras quedan identificadas como próximas, sin prometer entrenamiento individual ya operativo.

## Cambios y archivos relevantes
- `app/app/release-welcome.tsx/.css`, `lib/release-welcome.ts`, `app/api/release-welcome/route.ts`: dos pasos con casillas, posponer, reintento, recuperación del segundo paso y aceptación persistente. Integración mínima en `app/app/page.tsx`.
- `db/schema.ts`, `drizzle/0015_release_acknowledgements.sql` y journal: estado por usuario/organización/versión, sin modificar carteras.
- `lib/workspace-transfer.mjs`, `scripts/transfer-buho-workspace.mjs`: operación separada, alcance fijo Búho, preparación tipada, copia transaccional, comparación íntegra y huellas de información protegida. No se ejecuta en arranque ni al visitar pantallas.
- Seis contactos de semilla se concilian por código con UUID de Main; dos casos por la misma coincidencia conservan UUID/código Main y sus tareas. Tres marcas mock con código repetido conservan ambos registros; las importadas usan `BM-DEV-*`. Mapeo de UUID/códigos exactos también dentro de JSON; revisión del archivo confirma que esos códigos no identifican otras entidades.
- `tests/pilot-e2e.mjs`, `tests/release-welcome-browser.mjs`; capturas ficticias en `output/bienvenida-main-2026-10-08/`.

## Coordinación e integración
Nuevo estado de bienvenida independiente de carteras. Verificar numeración de migraciones. Relaciones de fuentes globales requieren detectar colisiones antes de copiar: no sobrescribir evidencia usada por otras organizaciones.

## Verificación
- Build optimizado/TypeScript y lint dirigido aprobados. Piloto PostgreSQL/HTTP aprobado: autenticación, aislamiento, estados/orden/casillas, origen, idempotencia y flujos previos de cartera/casos/logos/informes.
- Chromium escritorio 1440×1080 y móvil 390×844: ocho y tres casillas, controles visibles, guardado fallido/reintento, recarga, Escape/posponer y finalización persistente; sin errores JS. Capturas revisadas; se corrigió el pie móvil antes de repetir la prueba.
- Respaldo completo previo de producción restaurado en PostgreSQL 18.6 aislado; migraciones aplicadas. Exportación Dev 2026-10-08T14:38:05.756Z, 140.422.250 bytes comprimidos, SHA-256 `f65e69f7e3dcd5d794fcdc1c8a75ede0da97e539b8c52d03dec82eda8a31bfee`; cifrado y descifrado/huella comprobados. Respaldos/datos privados fuera de Git.
- Ensayo local completo (todos los INSERT/UPDATE y comprobaciones, rollback final) aprobado: 301 marcas, 100 solicitudes, 15 casos, 5 tareas, 42.828 coincidencias, 32.396 avisos y borradores, 1.070 trabajos, 1.147 intentos, 211 snapshots y 200 fuentes; sin cambios en otros estudios/usuarios/planes. Ensayos previos detectaron diferencias de IDs y orden FK; todos revirtieron y se corrigieron antes de operar remotamente.
- Inventarios completos por clave/huella antes de operación remota; solo cambió la actividad normal de sesiones desde el respaldo. No se hicieron consultas externas INAPI ni búsquedas de vigilancia para la QA.
- Ensayo transaccional en producción aprobado con reversión final: mismo recuento que el ensayo local, filas íntegras tras mapeo, otros estudios y credenciales sin cambios.
- Copia definitiva aplicada en producción: todas las filas importadas coinciden tras los mapeos documentados; otros estudios, usuarios/credenciales, planes y fuentes globales previas sin cambios, comprobados dentro de la transacción antes del commit.
- Inventario posterior al commit remoto (15:12:24 UTC): todas las filas de las otras tres organizaciones y sus tablas hijas coinciden por clave/huella; siete usuarios, 17 sesiones, planes, reloj INAPI y 432 fuentes globales previas íntegros. Se añadieron 200 fuentes. Búho conserva además 11 marcas y cinco tareas exclusivas de Main: resultado 312 marcas, 100 solicitudes, 15 casos y 10 tareas, con 32.396 avisos/borradores y 42.828 coincidencias. Las cinco tareas de Dev no coinciden por caso/título con las cinco previas de Main; no se fusionaron por suposición.
- Los 32.396 avisos incluyen historial: 32.382 gestionados, 15.014 con descarte y 200 invalidados según exportación. Se conservan sus indicadores; estos recuentos no significan nuevas prioridades pendientes.
- Se trasladaron las referencias figurativas disponibles (123 marcas con imagen guardada en Dev); no se descargaron en masa ni se certifica disponibilidad de cada CDN. Algunas marcas carecen de imagen en origen.
- Código integrado en Dev por PR #14, `46804a41f8f87f3f1d7754934c30a5c626569bd0`. Despliegue Dev `23c36670-f1c4-4194-8823-9d2e082719de` **SUCCESS**, SHA exacto comprobado. Salud HTTP 200/base conectada/motor DeQuiénEs; bienvenida 401 sin sesión. Migración 0015 comprobada por hash `68578c41ab5f1efab56db745f2787fd45abfe8c15d92d67b3a76cde012cadea6`, 16 migraciones totales; cuenta admin activa/con clave, bienvenida aún sin aceptar. Presupuesto 200, intervalo 3000 ms, recuperación directa solo Dev e importador inicial desactivado comprobados en runtime. Promoción [PR #15](https://github.com/joseibietasepulveda/Buho-Marc/pull/15) integrada en Main `420e438f840cf2c783bb3517a9f92ffdba569108`; despliegue en curso.
- Archivos temporales de transferencia retirados del contenedor de producción tras capturar el resultado aplicado. Pendientes: despliegues Dev/Main y retiro del acceso temporal.

## Pendientes
Completar implementación, pruebas y operación autorizada; actualizar esta nota y documentación funcional antes de entregar.

## Limitación del entorno de trabajo
Git compartido en iCloud presentó SIGBUS/lecturas bloqueadas de metadatos. Se conserva intacto y se usa un repositorio bare privado para publicar los archivos de este mismo worktree, con base remota Dev `35537ed`. No se retiraron locks ni se modificaron ramas/carpetas de otros trabajos.
