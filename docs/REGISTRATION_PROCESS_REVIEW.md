# Revisión del procedimiento de registro de marcas

Fecha de revisión: 7 de septiembre de 2026.

Este documento registra las reglas contrastadas con fuentes oficiales y el alcance de la corrección del seguimiento de inscripciones. El bosquejo aportado por el usuario sirve de referencia funcional; las reglas se contrastaron con las Directrices de Marcas INAPI 2026 y la Ley 19.039, cuyo texto refundido está contenido en el DFL 4 de 2022.

## Corrección de la explicación anterior

La afirmación de que antes de la publicación no hay un plazo activo era demasiado amplia. Deben distinguirse dos gestiones: desde la notificación de la aceptación a trámite existen 20 días hábiles para requerir y pagar la publicación; desde la publicación efectiva del extracto existen 30 días hábiles para deducir oposición. Requerir y pagar no equivale a publicar. Si ya se cumplió aquella gestión y la publicación sigue pendiente, todavía no comienza la ventana de oposición. [Publicación, Directrices 2026][publicacion]

Por ello, una solicitud aceptada a trámite puede tener una gestión aplicable cuyo vencimiento aún no pueda determinarse por falta de la fecha de notificación. La presentación de ese caso debe identificar la gestión y el antecedente que falta, en lugar de mostrar una fecha genérica por confirmar o afirmar que no existe plazo alguno.

## Matriz de reglas verificadas

Los días de esta tabla corresponden a las reglas de la LPI/RLPI: lunes a viernes, excluidos los festivos. Las reglas supletorias del Código de Procedimiento Civil pueden tener un cómputo distinto. [Plazos, Directrices 2026][plazos]

| Etapa o gestión | Hecho que activa el plazo | Regla general | Implicación para el seguimiento |
| --- | --- | --- | --- |
| Presentación y examen de forma | No hay por el mero ingreso un requerimiento de respuesta | Sin cuenta regresiva de respuesta por defecto | Esperar actuación de INAPI; no abrir oposición ni anticipar aceptación. |
| Subsanar observación de forma | Notificación de la observación | 30 días hábiles | La presentación de un escrito no acredita subsanación. La falta de corrección o su cumplimiento incompleto puede originar declaración de abandono. [Fuente][forma] |
| Requerir y pagar publicación | Notificación de aceptación a trámite | 20 días hábiles | Se exige encargar/pagar dentro del plazo; no que el Diario Oficial publique efectivamente dentro de esos 20 días. [Fuente][publicacion] |
| Esperar publicación | Requerimiento y pago ya efectuados | No es todavía plazo de oposición | Conservar por separado requerimiento/pago y publicación efectiva. [Fuente][publicacion] |
| Deducir oposición | Publicación efectiva del extracto | 30 días hábiles | Su transcurso no acredita ausencia de oposiciones ni concede el registro. [Fuente][oposicion] |
| Contestar oposición | Notificación del traslado | 30 días hábiles, improrrogables | Comparecencia con abogado. No contestar no supone allanamiento, abandono ni rechazo automático. [Fuente][oposicion] |
| Término probatorio | Notificación de la resolución que recibe la causa a prueba | 30 días hábiles; hasta 30 adicionales en casos calificados | Requiere hechos sustanciales, pertinentes y controvertidos. La prórroga debe pedirse oportunamente y ser concedida; no se agrega automáticamente. [Fuente][oposicion] |
| Examen de fondo | Vencimiento del período para deducir oposición y actuación de INAPI | Sin fecha automática de resolución | Comprende prohibiciones de registro y cobertura; puede coexistir con una oposición. [Fuente][fondo] |
| Responder observación de fondo | Notificación electrónica de la observación | 30 días hábiles | La falta de respuesta no produce por sí sola abandono o desistimiento; corresponde posterior pronunciamiento. [Fuente][fondo] |
| Apelar resolución recurrible | Notificación de la resolución | Regla general de 15 días hábiles | La apelación se presenta ante INAPI para conocimiento del TDPI. Concedida en ambos efectos, suspende la continuación del asunto ante INAPI mientras se resuelve. [Fuente][apelacion] |
| Pagar y acreditar derechos finales | Ejecutoria de la resolución que autoriza la inscripción | 60 días hábiles | La aceptación, la ejecutoria, el pago/acreditación y el registro son hitos distintos. La falta de acreditación oportuna produce abandono y archivo. [Fuente][resolucion] |
| Registro y vigencia | Inscripción en el registro | 10 años desde la inscripción | No contar desde solicitud, aceptación, publicación o pago. Renovación entre los seis meses anteriores y los seis posteriores al vencimiento, con las tasas y recargos aplicables. [Ley, art. 24][ley] |

## Invariantes corregidos

- **La publicación tiene sus propios hitos.** Una gestión de requerimiento o pago no activa la oposición. La publicación efectiva puede recuperarse de una actuación que la identifique cuando el campo resumen de la fuente esté vacío.
- **La fecha del acto no se presume como notificación.** Se conserva el acto que sustenta la etapa. Un vencimiento calculado necesita su fecha base específica; los vencimientos explícitos y válidos aportados por la fuente conservan su procedencia.
- **El hecho de que pase una fecha no dicta una resolución.** Un plazo transcurrido se presenta para revisar su cumplimiento o la actuación posterior. No convierte automáticamente la solicitud en abandonada, rechazada, inscrita o firme.
- **Las respuestas no conceden la marca.** Un cumplimiento o contestación presentado permite identificar la gestión realizada y esperar el pronunciamiento correspondiente.
- **Oposición y fondo pueden coexistir.** El seguimiento conserva gestiones concurrentes en lugar de forzar una única rama excluyente.
- **La aceptación parcial conserva su carácter parcial.** La limitación puede afectar productos o servicios dentro de una clase. No equivale a aceptación total.
- **Aceptación, ejecutoria, pago y registro permanecen separados.** El plazo calculado de derechos finales usa la ejecutoria; el pago acreditado no se presenta como registro concedido. Una sentencia del TDPI tampoco prueba por sí sola la firmeza.
- **Las actuaciones posteriores importan.** Un registro previo no oculta una apelación o actuación posterior identificada; una fila administrativa incidental no reemplaza el acto que sustenta la etapa ni aporta su plazo.
- **Las fechas incompatibles no generan cuentas regresivas.** Se comprueban fechas inválidas, hechos activadores futuros o anteriores a la solicitud y vencimientos anteriores a su hecho base. Un vencimiento pasado en fin de semana no se presenta como “Vence hoy”.

La implementación se concentra en `lib/registration-procedure.ts`, `lib/inapi-provider.ts` y el contrato de `lib/registration-data.ts`. La presentación y el resumen de inscripciones consumen las reglas compartidas; Resumen Vigilancia muestra las tareas pendientes de los casos y no proyecta plazos jurídicos adicionales. Las pruebas de regresión de estas reglas están en `tests/registration-procedure.test.mjs` y `tests/inapi-procedure.test.mjs`; los resultados de ejecución deben consultarse en la validación de la entrega.

## Casos de demostración

`lib/registration-scenarios.ts` contiene 22 expedientes completamente ficticios, identificados como `DEMO-001` a `DEMO-022`, con fecha de referencia fija del 7 de septiembre de 2026. Se exploran desde una vista separada y no se incorporan a la cartera ni generan avisos.

Los supuestos cubren presentación, observación formal, respuesta pendiente de pronunciamiento, requerimiento de publicación, espera de publicación, solicitud tenida por no presentada, oposición, contestación, prueba y prórroga, examen de fondo, observación sin respuesta, oposición y fondo concurrentes, aceptación pendiente de ejecutoria, aceptación parcial, apelación, pago final, acreditación pendiente de registro, inscripción, rechazo firme y abandono por falta de pago final.

Las fechas, actuaciones, titulares y números de estos ejemplos son simulados. La vigencia de diez años aparece en un registro ficticio con fechas expresas; no constituye una integración de renovación ni una automatización de vencimientos de cartera.

## Límites actuales y pendientes

1. **Calendario acotado a 2026.** El calendario `CL-LPI-2026` calcula las reglas de días de LPI/RLPI, excluyendo fines de semana y los feriados nacionales incluidos. Si el cálculo cruza a un año no cubierto, no estima el vencimiento. Un vencimiento explícito de la fuente puede mostrarse sin simular el calendario faltante. Quedan pendientes el calendario plurianual, feriados regionales y reglas excepcionales.
2. **No es un motor general del CPC.** Los plazos supletorios contenciosos pueden incluir sábados, mientras los de la LPI los excluyen. Reposición, apelación subsidiaria y otras incidencias necesitan reglas específicas antes de automatizarse. [Plazos][plazos] y [apelación][apelacion].
3. **La fuente todavía necesita antecedentes jurídicos estructurados.** La proyección reconoce actuaciones por su descripción y conserva su procedencia; no garantiza que cada denominación posible quede clasificada. Falta automatizar la obtención y validación de constancias de notificación, depósito en casilla, ejecutoria, cumplimiento y documentación de respaldo. No se debe convertir una fecha de resolución o un correo de cortesía en fecha jurídica confirmada. [Examen de fondo, notificación electrónica][fondo].
4. **Prórroga probatoria.** El modelo admite días adicionales expresamente informados, entre 0 y 30. La demostración incluye una prórroga concedida; falta extracción y validación automatizada de la resolución que la concede y de la oportunidad de la petición. El campo no reemplaza esa comprobación documental. [Oposición][oposicion].
5. **Renovación y vigencia.** Se explica que la vigencia es de diez años desde inscripción y se conservan las fechas informadas. Queda pendiente el flujo de renovación, cómputo de sus ventanas, recargos y tratamiento de caducidad. No se presenta esa capacidad como implementada. [Ley, art. 24][ley].
6. **Incidencias y recursos posteriores.** Republicación, suspensión, división, nulidad, caducidad y casación requieren reglas y antecedentes propios. Reconocer determinados estados o explicarlos no implica tramitar esas actuaciones ni calcular todos sus plazos.

## Criterio de fuentes y diferencias con textos anteriores

La página oficial de INAPI declara que las Directrices 2026 reemplazan las versiones de 2010 y 2017. Se priorizaron esas directrices y el texto legal vigente sobre preguntas frecuentes que conservan explicaciones anteriores. [Índice oficial][directrices].

En particular, la directriz vigente sobre publicación recoge la consecuencia de tener la solicitud por **no presentada** si no se cumple el requerimiento oportuno; no se equipara genéricamente con abandono. Para el pago final, el artículo 18 bis E fija el inicio en la **ejecutoria** de la resolución que autoriza la inscripción. Estas diferencias justifican conservar estados y hechos activadores específicos. [Publicación][publicacion], [resolución final][resolucion] y [Ley, art. 18 bis E][ley].

[directrices]: https://www.inapi.cl/centro-de-documentacion/directrices/marcas
[ley]: https://www.bcn.cl/leychile/navegar?i=1179684
[forma]: https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/examen-de-forma/17---segunda-parte---procedimientos---examen-de-forma-docx.pdf?sfvrsn=c31f18d7_2
[publicacion]: https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/examen-de-forma/18---segunda-parte---procedimientos---publicaci%C3%B3n-de-la-solicitud-docx.pdf?sfvrsn=599880b0_2
[oposicion]: https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/contencioso/28---segunda-parte---procedimientos---procedimiento-de-oposici%C3%B3n-docx.pdf?sfvrsn=3aab7699_2
[fondo]: https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/examen-de-fondo/19---segunda-parte---procedimientos---examen-de-fondo-docx.pdf?sfvrsn=c0cb89b1_2
[resolucion]: https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/marcas-registradas/20---segunda-parte---procedimientos---resoluci%C3%B3n-final-y-registro-docx.pdf?sfvrsn=4b03fda_2
[plazos]: https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/segunda-parte-procedimeintos/12---segunda-parte---procedimientos---plazos-docx.pdf?sfvrsn=8dfc60c4_2
[apelacion]: https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/segunda-parte-procedimeintos/35---segunda-parte---procedimientos---recurso-de-apelaci%C3%B3n-lpi-docx.pdf?sfvrsn=4b72c5cb_2
