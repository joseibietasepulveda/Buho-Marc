# Vigilancia: bandejas, gestiones próximas y renovación

Decisión del usuario del 12 de octubre de 2026, posterior a las reglas de septiembre.

## Bandejas y búsqueda inicial

Vigilancia tiene solamente **Novedades por revisar** y **En seguimiento**. Al comenzar revisa también solicitudes anteriores; esos hallazgos pendientes se muestran junto con los ingresos, publicaciones y cambios posteriores. No existe una pestaña Antecedentes. Se conserva `discoveryKind` como procedencia, con etiqueta «Hallazgo de la revisión inicial», sin cambiar fechas ni presentar un hallazgo antiguo como ingreso reciente.

Los contadores del resumen, la cartera y la bandeja incluyen los pendientes iniciales y posteriores, con los mismos filtros de estado, relación comercial, umbrales y paginación. Las selecciones destacadas de prueba se cuentan una vez, aunque estén fuera de umbrales. Las decisiones, valoraciones y seguimientos guardados no se reescriben. Una marca pausada conserva sus hallazgos iniciales accesibles; no añade pendientes posteriores hasta reanudar. `scope=new` y `scope=baseline` de clientes antiguos son alias de la bandeja unificada; `baselineCount=0` se conserva temporalmente por compatibilidad.

La consulta inicial de stock y las revisiones posteriores mantienen las colas y los modos diarios/a pedido. Abrir pantallas no llama a la fuente. No se inicia una revisión masiva para validar este cambio visual.

## Resumen de vigilancia

**Gestiones por vencer** cuenta tareas y plazos pendientes de casos activos que vencen hoy o en los siguientes 14 días naturales, inclusive. Las fechas pasadas, casos concluidos, tareas completadas y filas sin fecha quedan fuera. El botón abre el calendario existente. El cálculo reutiliza `caseAgenda` y `workDeadline`; no desplaza vencimientos pasados ni inventa gestiones.

## Avisos de renovación

`lib/renewal-reminder.ts` y `db/renewal-notices.ts` crean un recordatorio interno para marcas propias registradas con menos de un año natural hasta su vencimiento. Se prioriza la fecha de expiración guardada de la fuente; si falta, puede calcularse diez años naturales desde la fecha válida del registro. Nunca desde presentación, pago o importación. Un valor de fuente inválido no se sustituye silenciosamente. Una expiración de renovación informada tiene prioridad sobre la primera inscripción.

El recordatorio incluye solicitud, registro, vencimiento y procedencia del cálculo. La lista y el detalle conservan ese vencimiento propio; no lo sustituyen por el plazo de un caso de oposición. Se distingue la anticipación de un año de la ventana de renovación de seis meses. No afirma caducidad automática ni constituye notificación legal. Fundamento: [INAPI, renovación de marcas, Directrices 2026](https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/marcas-registradas/23---segunda-parte---procedimientos---renovaci%C3%B3n-reg-de-marca-docx.pdf?sfvrsn=c2984d68_2).

Se usa únicamente evidencia guardada: no se consulta al proveedor para emitir el aviso. Se evalúa en el supervisor existente (también en carteras a pedido, sin activar su sincronización externa) y al finalizar una revisión de expedientes. Abrir Notificaciones no escribe avisos ni inicia búsquedas. Se deduplica por organización/solicitud/registro/vencimiento, con bloqueo transaccional y código determinista. Revisar o retirar el aviso no lo vuelve a crear. Un nuevo vencimiento/estado de fuente invalida el aviso anterior sin borrarlo. El mero paso del día de expiración conserva el recordatorio para revisar el expediente.

La bandeja Prioritarias reconoce este tipo de recordatorio con `changes: []`: no se simula una actuación de INAPI ni un cambio de fuente. La infraestructura guarda un texto/borrador asociado para la lectura, pero no envía correo.

## Revisión real solicitada

Los avisos de publicación señalados en Estudio Ibieta IP eran una proyección del historial antiguo, que terminaba en aceptación a trámite. La revisión puntual confirmó pago y publicación posteriores; se ejecutó además una revisión manual de su cartera de expedientes, autorizada por el usuario. Su resultado y la operación de avisos reales se registran en [el traspaso](handoffs/2026-10-12-vigilancia-bandejas-plazos.md). No se trasladan cuentas, clientes o decisiones entre ambientes.
