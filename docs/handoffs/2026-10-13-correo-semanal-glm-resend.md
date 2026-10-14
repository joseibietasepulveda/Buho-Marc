# Traspaso: correo semanal de vigilancia con GLM directo y Resend

Actualizado el 14 de octubre de 2026, America/Santiago. Configuración y piloto expresamente aprobados; implementación y QA completas. Publicación e importación del piloto en Dev en preparación; sin correos reales y sin cambios en producción. Rama `codex/vigilancia-correo-semanal`, base Dev `e36ca4f9e05a1d2263fba4b0448bac4ebdd5727d`. PR/commit de entrega se registrarán después de integrar.

## Acuerdos del usuario

Resumen semanal desde GLM directo, sin Luna previa, los lunes a las 08:30 de Chile. Administrador interno con selector de estudio y botón de hasta 150 cruces nuevos totales. Máximo cinco por marca y similitud original DeQuiénEs ≥25%; ambos aprobados junto al piloto de hasta US$0,10. Solo stock guardado sin decisión; no nuevas búsquedas de DeQuiénEs ni expedientes INAPI. Cada llamada comparte una referencia y hasta cinco candidatas, con decisiones independientes. El correo se envía también sin alertas y resume los próximos 14 días, hasta ocho cruces y ocho tareas/plazos, con resto y enlaces autenticados. Destinatario, remitente y respuesta fijos en `hola@rcirculo.com`.

Resend aún no tiene cuenta/configuración del usuario. La clave exclusiva de GLM de Dev también falta. El código se puede publicar con `RESEND_DELIVERY_ENABLED=false` y `WATCH_DIGEST_ENABLED=false`; el botón queda desactivado e informa qué falta. No activar semanal ni afirmar entrega real antes de verificar un correo en Gmail.

## Implementación

`lib/watch-digest*.ts`, `lib/resend-email.ts`, `db/watch-digest*.ts`, migración `0016_watch_digest.sql`, journal y schema; APIs Admin/trabajador/resumen/imágenes, componente Admin en SourceAdmin y `/app/resumen-semanal`. Supervisor drena por lotes; `start-local` desactiva proveedores reales. La pauta resumida INAPI envía nombres, imágenes, clases y coberturas completas, nunca porcentaje motor, etiquetas de evaluación ni titulares. Guarda respuestas positivas y negativas, imágenes, reservas/cargos y un correo normalizado por JSONB antes del primer envío. Identidad/coherencia inválida permite un segundo intento acotado; un fallo de proveedor detiene la cola. Idempotencia Resend y bloqueo de aceptación incierta después de 23 h evitan duplicados fuera de su ventana de 24 h.

Estado `prepared` para importar el piloto real sin enviar correo. Sus positivos no notificados se recuperan en el próximo resumen y sus decisiones canónicas evitan repetir evaluación. El importador Dev `scripts/import-watch-digest-pilot.mjs` valida organización, selección, presupuesto, pertenencia e imágenes; no llama OpenRouter ni Resend. Guarda el historial de cada intento con hash separado e incluye el hash original como evidencia. Las APIs de lectura conservan sesión y organización; solo admin interno puede consultar otra organización.

## Piloto real y límites

Muestra congelada: 30 marcas del stock actual de Dev, hasta cinco elegibles cada una; resultaron 141 cruces. Organización `10000000-0000-4000-8000-000000000001`. Semilla `digest-approved-2026-10-13`. Run `b9f3ab88-21cf-4d37-b0cd-19522f2028f9`; modelo `z-ai/glm-5.3-flash`, prompt versión 1, proveedor Z.ai sin fallback. Estados reales, sin simular En trámite. Datos privados en salida ignorada `outputs/watch-digest-pilot-2026-10-13` con selección, manifest, ledger, resultados e imágenes; ninguna clave ni información privada se publica en Git.

Resultado: 30 grupos intentados, 28 válidos; 131 cruces con decisión, 16 positivos y 115 negativos. Diez cruces en dos grupos siguen sin decisión por incertidumbre declarada sin `insufficient=true`, incluso después del intento correctivo. No clasificarlos como negativos. 60 intentos físicos incluyendo fallos de transporte/reintentos; costo total US$0,02870619, reserva sin confirmar cero. Consumo acumulado de la clave conciliado tras pausa con todos los cargos; solo entonces se liberaron reservas de llamadas sin consumo. Resultados válidos recuperados sin repetición. No correos enviados.

No existe etiquetado jurídico de esta muestra ni matriz VP/VN/FP/FN. No presentar 16 selecciones como 16 aciertos. Se observó posible ruido en INFLU TV / SUENA TV; revisar criterio con abogados. El 25% mantiene todos los positivos de la base histórica de 19.630 y de la anterior muestra aleatoria, pero no demuestra recuperación del stock nuevo. El máximo cinco puede retrasar candidatos relevantes más abajo en el orden. [Contrato, costo mensual y configuración Resend](../CORREO_SEMANAL_GLM_RESEND_2026-10-13.md).

## Ambiente y coordinación

El repositorio original tiene objetos Git pendientes/defectuosos de iCloud; se preservó íntegro. Trabajo aislado en `/Users/rosariovial/.codex/worktrees/vigilancia-correo-semanal/Buho-Marc`, con clon local propio. No se modificaron ramas/checkouts ajenos. Dev sigue en e36ca4f antes de esta entrega y numeración 0016 libre.

Proyecto Railway `heartfelt-magic`; entorno Dev `9e2891f0-7281-4872-a992-2c48866a782d`, servicio web `buho-marc-web`. URL `https://buho-marc-web-dev.up.railway.app`. Claves/banderas de correo ausentes/desactivadas. Origen de correos configurable: producción futura `https://rcirculo.com`, Dev su URL Railway, sin `/app` en `APP_PUBLIC_ORIGIN`. Acuerdo de dominio leído de la nota local del 13/10: raíz landing, app `/app`, login futuro `/app/login`; este cambio conserva `/ingresar` y no modifica DNS ni login del otro trabajo.

Copia lógica de Dev cifrada antes de publicar, comprobada por tamaño, SHA256 y descifrado: `/Users/rosariovial/.codex/private-backups/buho-marc/dev/2026-10-13-watch-digest/`. PG18.6, 236.638.091 bytes; no restauración de ensayo. Clave de recuperación privada fuera de Git. Acceso SSH temporal propio utilizado para lecturas/copia/importación; retirar de Railway y de las carpetas locales al cerrar, preservando la clave de recuperación del respaldo.

## Evidencia de verificación

- 34 pruebas dirigidas aprobadas: 14 del resumen (13 unitarias más integración PostgreSQL efímero), agenda procesal, horario y vigilancia. La integración adicional prueba importación Dev/idempotencia/rechazo de producción y recuperación posterior sin otra llamada GLM.
- TypeScript sin errores, ESLint dirigido sin errores ni advertencias, build Next webpack aprobado. No nuevas dependencias.
- Navegador Chrome local con datos ficticios: correo ocho+ocho, variante sin alertas, 390 px sin desbordamiento de página; resumen diez+diez filas, imágenes autenticadas, Admin desactivado sin claves y cero errores JS. Capturas en `outputs/correo-semanal/`. Dos fallos iniciales del arnés fueron corregidos: imágenes lazy aún no vistas y diálogo de bienvenida previo al botón. No cambios de producto por esos fallos.
- Proveedores en tests simulados: cuerpo de correo byte-idéntico tras JSONB/reinicio, no inferencia al reintentar Resend, costos desconocidos reservados, presupuesto global concurrente, estados cerrados excluidos, CSRF/roles/aislamiento, corte25/five/150 y fallo DNS antes de HTTP cost0/cursor conservado.

## Siguiente paso

1. Crear commit/PR hacia Dev, comprobar numeración y última base, integrar y verificar Railway `SUCCESS`, migración/salud y rutas protegidas. No tocar Main/producción.
2. Importar el piloto como `prepared`, verificar 131 decisiones/16 positivos/10 pendientes y ledger conciliado, sin modelo ni correo; mostrar el enlace en Admin.
3. Retirar SSH temporal propio y actualizar este registro con PR/SHA/despliegue/resultado real.
4. Usuario crea Resend/verifica dominio preservando Google Workspace, añade `RESEND_API_KEY` y `OPENROUTER_WATCH_API_KEY` exclusiva a Railway Dev. Guía de siete pasos en el contrato. Primer correo/Gmail y activación de lunes quedan pendientes de esa configuración.
5. Mejorar contrato de incertidumbre/validación jurídica, webhooks de entrega/rebote y revisión de falsos positivos en una fase posterior; no ampliar pruebas pagadas con cargo al piloto ya cerrado.
