# Consulta directa INAPI a pedido y seguimiento de antecedentes

## Decisiones confirmadas

El 14/10 el usuario solicita corregir la consulta pública, revisar antecedentes pendientes de todas las cuentas y publicar únicamente Dev. Posteriormente elige conservar la programación actual y mostrar «a pedido» donde no haya próxima consulta; agrega un botón limitado a una vez al día, «Cargando…» durante la consulta y el mensaje «Sigue sin haber información nueva, podrás consultar de nuevo mañana» cuando no haya novedades. No se crean tareas del equipo ni una programación automática nueva.

## Flujo y límites

`POST /api/registrations/review` exige sesión, origen permitido y un expediente propio vinculado a la organización actual. Recibe solo `applicationId`; el servidor resuelve el registro fuente. Solicitudes ajenas o de seguimiento de terceros no permiten acceder a esa consulta. No devuelve cuerpos oficiales completos, usuarios de otras organizaciones, cookies o hashes.

`checkRegistrationOfficial` reinterpreta la fuente y confirma que hay un antecedente o actuación pendiente de seguimiento. `checkOfficialInapi` reserva una única consulta por número de solicitud y **día civil de America/Santiago**. La reserva se comparte entre organizaciones y sesiones que siguen el mismo expediente; cambiar de navegador, recargar o llamar directamente al endpoint no evita el límite. Un error también consume el intento de ese día; el siguiente intento manual puede hacerse a partir del próximo día civil, no después de 24 horas móviles.

La nueva tabla `inapi_official_checks`, migración `0018`, registra solo identidad del expediente, fecha, estado y momentos de la consulta. Su índice único impide duplicados; un disparador invalida las vistas de registros vinculadas, también ante fallos sin cambios de cartera. Se conserva el reloj persistente, bloqueo de trabajador y separación mínima de tres segundos entre peticiones. Consultas manuales y recuperación automática comparten el presupuesto máximo de **200 intentos de expediente/día**, incluidos fallos (hasta tres peticiones por expediente). La cola automática mantiene su deduplicación anterior; no se reactivan los 67 intentos fallidos históricos por este cambio.

Durante otra consulta en curso, el servidor responde ocupado sin emitir otra petición ni mantener una conexión esperando un bloqueo: evita agotar el pool de conexiones. El cliente bloquea pulsaciones repetidas mientras muestra «Cargando…». Si el límite diario global se agotó o la fuente está en pausa, se informa la causa y se mantiene la cartera anterior. Los errores no se presentan como ausencia de información nueva.

Si hay cambios, se combinan los antecedentes oficiales conservando pruebas, fechas jurídicas y actos posteriores del proveedor, y se actualizan las proyecciones vinculadas. No se generan correos ni avisos históricos por esta consulta. Campos opcionales vacíos añadidos a un acto existente no son novedades. Si no hay cambios, el mensaje solicitado persiste al recargar y se muestra la fecha exacta desde la que se puede volver a consultar.

## Presentación

`registrationFollowUp` explica el antecedente que falta (ejecutoria, resultado del fallo, destinatario/obligación de una nulidad o incidente, fecha activadora o calendario) y distingue las esperas de examen, traslado, publicación, registro o recurso. Una fecha de revisión no se incorpora como vencimiento jurídico. Tarjetas, listas y detalle muestran esa explicación.

La próxima revisión de cartera usa la programación existente de `nextSourceReview` y la política de cada organización, igual que `/api/source/status`. En modo manual se informa «Revisión a pedido · no hay una consulta automática programada». La disponibilidad del botón es distinta de una consulta programada: indica cuándo el usuario puede solicitarla, sin prometer que se realizará automáticamente.

Se conserva la regla de pago confirmada el mismo día: [aceptación administrativa/executoria](PAGO_ACEPTACION_ADMINISTRATIVA_2026-10-14.md). Una resolución genérica de recurso o una aceptación con oposición sin ejecutoria se muestran expresamente pendientes, sin inventar una fecha de pago.

## Contexto del buscador y reconocimiento de rechazo confirmado

El sitio público entrega actualmente inputs iniciales vacíos y una llamada literal `setHash(hash,id)` en un script de la página. `officialContext` admite esa inicialización y los campos ocultos completos anteriores. No ejecuta JavaScript remoto. Expresiones dinámicas, valores incompletos o contextos contradictorios detienen la integración; los valores temporales no se registran.

El historial puede confirmar el desenlace de un recurso: se reconoce rechazo final únicamente cuando el estado general es «Denegada», la decisión anterior recurrida fue un rechazo, la actuación principal dispone cumplir un fallo TPI que **convalida** esa resolución y hay «Decisión quedó firme» el mismo día. Una devolución genérica, una aceptación previa, falta de firmeza o discrepancia de fechas conserva la revisión del resultado. No se presume firmeza por tiempo transcurrido.

## Reproducción y entrega

Pruebas: `tests/inapi-context.test.mjs`, `tests/registration-follow-up.test.mjs`, `tests/inapi-official-check-integration.test.mjs` y suites existentes de procedimiento, recuperación, evidencia, calendario, renovación y aceptación administrativa. La verificación de UI usa exclusivamente PostgreSQL y fuentes ficticias locales. La revisión de carteras reales distingue lecturas guardadas, consultas oficiales puntuales y cambios de datos realizados solamente en Dev.

Estado, base Dev actualizada, resultados y limitaciones: [traspaso](handoffs/2026-10-14-inapi-recuperacion-y-seguimiento.md).
