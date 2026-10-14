# Pago final según el tipo de aceptación

Decisión expresa del usuario del **14 de octubre de 2026**: para aceptaciones administrativas a registro, calcular 60 días hábiles desde la aceptación asumiendo notificación ese día; para las aceptaciones con oposición, contar desde la ejecutoria. Aplicar la regla a todas las cuentas. Sustituye la exigencia universal de ejecutoria del pago final en la [convención del 12/10](NOTIFICACION_MISMO_DIA_EVENTO_2026-10-12.md).

## Activadores y cálculo

| Tipo | Activador del pago | Resultado |
|---|---|---|
| Aceptación administrativa identificada | Fecha de la resolución de aceptación | 60 días hábiles; `notificationDateAssumed=true`, `paymentBasis=administrative-acceptance` |
| Aceptación con oposición o fallo contencioso | Ejecutoria acreditada | 60 días hábiles; `paymentBasis=executoria` |
| Aceptación administrativa sin fecha válida | Antecedente por revisar | No inventar un vencimiento ni sustituirla por la fecha de consulta |
| Oposición sin ejecutoria acreditada | Firmeza por confirmar | Mantener pendiente su activador |

`administrativeAcceptanceDate` exige proveedor INAPI, una etapa compatible con pago/aceptación y un acto administrativo de aceptación reconocido por código `029` o descripción equivalente de resolución. Las actuaciones de oposición/contenciosas y los fallos `484` impiden usar esa convención. La simple ventana de oposición del Diario Oficial no equivale a una oposición presentada. Si una certificación posterior pasa a ser la actuación principal, se conserva la fecha de la aceptación administrativa identificada en el historial.

El reconocimiento distingue título de actuación y observación: el texto habitual «vencido el plazo para deducir oposiciones» no prueba una oposición, aunque otro párrafo mencione una «solicitud presentada». Las referencias concretas a demanda, traslado, contestación o resultado de oposición sí se conservan. El historial también se incluye al evaluar recuperación directamente desde un `SourceRecord`, para no perder una oposición anterior.

El calendario LPI/LBPA nacional implementado cubre 2023–2027; el contador empieza el día hábil siguiente, excluye sábados, domingos y feriados. Ejemplos de fechas de actuación: 02/10/2026 → 30/12/2026; 08/10/2026 → 06/01/2027; 23/09/2026 → 18/12/2026; 06/10/2026 → 04/01/2027. No se estima un calendario fuera de cobertura.

Un vencimiento explícito válido de pago conserva prioridad. El nuevo cálculo administrativo usa la aceptación aun cuando haya otra fecha de notificación o ejecutoria informada; ambas pruebas se conservan como antecedentes, sin reescribirlas. Para las otras obligaciones se mantiene su política previa de fechas acreditadas y notificación asumida.

La aceptación administrativa parcial conserva su plazo de apelación y añade una gestión separada de pago de la parte aceptada, sin reutilizar un vencimiento propio de apelación. Una apelación ya en trámite no activa este supuesto de pago; tampoco lo hacen rechazos, abandonos, concesiones o estados de pago ya acreditado. Una fecha de pago anterior al activador no se toma como cumplimiento.

## Evidencia e interfaces

La fecha asumida es una convención de cálculo confirmada por el usuario. **No se escribe una notificación ni una ejecutoria ficticia**, ni se cambia la fecha o el texto de los eventos de INAPI. No modifica el marco normativo citado en las revisiones jurídicas. El transcurso del plazo no concede el registro ni declara abandono.

`registrationDeadlines` conserva el estado fuente y proyecta la gestión `accepted-payment` para las aceptaciones administrativas que antes estaban en `finality-pending`. `registrationProgress` informa «Aceptación administrativa a registro · pagar derechos finales». Las fichas y el resumen muestran el origen asumido; Solicitudes, agendas, controles y recuperación consumen la misma regla para todas las organizaciones.

No se requiere una migración ni una consulta nueva a INAPI/DeQuiénEs para adoptar el cálculo: se usan los antecedentes guardados. `recoveryNeeds` deja de pedir ejecutoria en aceptaciones administrativas identificadas; conserva la necesidad en aceptaciones con oposición y en casos no clasificados. No se cambian tareas manuales ni avisos históricos.

## Verificación y publicación

Pruebas específicas: `tests/administrative-payment.test.mjs`, reglas de procedimiento/notificación, evidencia, proyección INAPI, recuperación y agenda. Estado real, PR, commits, despliegues y comprobación de todas las cuentas: [nota de traspaso](handoffs/2026-10-14-pago-aceptacion-administrativa.md).
