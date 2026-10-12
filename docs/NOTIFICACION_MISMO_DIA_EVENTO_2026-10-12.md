# Notificación asumida el mismo día del evento

Decisión de producto confirmada por el usuario el **12 de octubre de 2026**. Esta convención reemplaza la política anterior de dejar indeterminado todo plazo de notificación sin constancia. No cambia las reglas normativas de referencia ni declara que exista una constancia oficial.

## Regla de cálculo

**El proyecto asumirá que la notificación ocurrió el mismo día del cambio de estado cuando falta una fecha de notificación informada.** Se utiliza `procedure.sourceActDate`, derivada de `events[].event_date` de la actuación reconocida que origina esa obligación. No se utiliza el cambio del estado resumen, `last_changed_at`, `updated_at`, la detección del cambio ni la fecha de consulta/importación.

Prioridad: vencimiento explícito válido de la fuente; para calcular, fecha de notificación acreditada de esa actuación; en su ausencia, fecha de la actuación según la convención. Una fecha informada pero inválida necesita revisión y no se reemplaza silenciosamente. Cada obligación concurrente utiliza su propia actuación y sus propias pruebas.

| Obligación implementada | Estado de proyección | Días hábiles |
| --- | --- | --- |
| Subsanar observación formal | `form-observation` | 30 |
| Requerir y pagar publicación | `accepted-publication` | 20 |
| Contestar traslado de oposición | `opposition-answer` | 30 |
| Período probatorio | `evidence-period` | 30; sólo suma prórroga expresamente informada |
| Responder observación de fondo | `substantive-objection` | 30 |
| Apelar rechazo o resolución parcial | `rejected-appeal`, `partial-appeal` | 15 |

El contador comienza al día hábil siguiente del activador y excluye sábados, domingos y feriados nacionales del [calendario implementado 2023–2027](CALENDARIO_LEGAL_CHILE_2026_2027.md). Por ejemplo: actuación ficticia de fondo del 05/10/2026, sin notificación informada, vence el 17/11/2026 bajo esta convención; una notificación acreditada del 06/10 cambia el vencimiento al 18/11.

## Procedencia y límites

`lib/registration-procedure.ts` devuelve `notificationDateAssumed: true`, la fecha base en `sourceDate` y una explicación expresa. La ficha muestra «Notificación asumida el día de la actuación». No se escribe `procedure.notifiedAt`, `notificationProof` ni un hecho `legal_facts` ficticio; `events`, snapshots y constancias originales se conservan. Una constancia posterior tiene prioridad al recalcular y puede cambiar el vencimiento.

La convención sólo completa el activador de notificación de las obligaciones reconocidas. Una petición de apertura a prueba no equivale a la resolución que la dispone; una oposición presentada no equivale a su traslado; un incidente o una nulidad no adquiere los plazos del solicitante por compartir palabras. Los roles del cliente y los objetos conservan sus reglas.

La publicación efectiva y la ejecutoria permanecen como hechos distintos. No se presume publicación con su pago ni ejecutoria con aceptación o notificación. Los 60 días de derechos finales siguen requiriendo ejecutoria. Una fecha de actuación ausente, imposible, futura, anterior a la solicitud o fuera de la cobertura del calendario puede seguir sin vencimiento. Suspensiones, recursos y extensiones necesitan sus antecedentes. El vencimiento transcurrido indica revisar cumplimiento; no declara por sí solo abandono, rechazo ni concesión.

## Aplicación a carteras y recuperación

La API de registros reproyecta `source_records` guardados mediante `updatedApplication` y aplica pruebas vigentes. Fichas, resumen y agenda consumen `registrationDeadlines`; no requieren una nueva extracción ni una migración de datos para adoptar el cálculo. Las tareas manuales conservan sus fechas y los avisos históricos no se reescriben.

`recoveryNeeds` usa el mismo cálculo: una fecha de notificación ausente ya no prepara una consulta oficial si el acto fechado permite determinar el vencimiento. Una necesidad anterior que ya está resuelta por la regla se cancela antes de llamar a la fuente. Sigue siendo posible recuperar una fecha de acto/publicación/ejecutoria realmente ausente. Se mantienen los límites de **200 expedientes diarios**, un único trabajador habilitado entre ambientes y **mínimo tres segundos** entre llamadas.

## Verificación y publicación

Pruebas específicas: `tests/notification-event-assumption.test.mjs`, `tests/registration-procedure.test.mjs`, `tests/registration-evidence.test.mjs`, `tests/inapi-procedure.test.mjs`, `tests/inapi-recovery.test.mjs` y `tests/inapi-recovery-integration.test.mjs`. Cubren prioridades, obligaciones concurrentes, separación de pruebas, fechas incompatibles, cumplimiento y ausencia de consultas innecesarias. Resultado y estado real de integración/despliegue: [nota de traspaso](handoffs/2026-10-12-notificacion-mismo-dia-evento.md).

Las auditorías y los informes anteriores conservan su fecha de corte y describen la política que existía entonces; no representan la política actual. Los recálculos de carteras reales son evidencia privada en `output/`, no fixtures ni documentación versionada con datos de clientes.
