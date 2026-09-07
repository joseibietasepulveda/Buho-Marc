# UX: promoción de la base y siguiente ronda

## Secuencia autorizada

1. Actualizar la documentación y consolidar la base actual de Dev, incluida la integración INAPI y la primera ronda de UX.
2. Promover esa base a `main` antes de modificar la interfaz para la siguiente ronda.
3. Implementar y verificar los cambios siguientes en `dev`. No promover esta segunda ronda a `main` automáticamente.

## Base promovida a main

Commit `60ea09c`: documentación, integración INAPI y primera ronda de UX. Promoción realizada antes de editar la segunda ronda. Railway verificó esa base en Dev y production con estado SUCCESS el 6 de septiembre de 2026.

## Ya realizado (retirado del backlog)

- Consulta de expedientes INAPI, estados y antecedentes importados, origen visible, historial de consultas y detección de novedades.
- Comparación de logos desde las filas de factibilidad, ampliación independiente y clases compartidas.
- Historial de actuaciones con fechas, orden reciente primero y detalle completo; no muestra `undefined`.

## Segunda ronda implementada en Dev

- Resumen de vigilancia: período actual en agenda y bandeja «Mi día» que priorice trabajo ya existente, sin nuevas tareas administrativas para el usuario.
- Casos: distinguir prioridad interna y situación temporal; presentar con claridad plazos vencidos, próximos y fechas sin definir.
- Notificaciones: etiquetas según tipo de evento y situación del plazo; una alerta de plazo nunca se presenta como similitud.
- Clientes: lectura íntegra de RUT y correos sin cortes arbitrarios.
- Resumen de inscripciones: diferenciar falta de datos de ausencia de pendientes y mostrar procedencia correctamente.
- Factibilidad: resultado simulado explícito y significado inequívoco de los indicadores; cambios en criterios invalidan el resultado anterior.
- Fuente: vocabulario de trabajo para abogados especialistas en marcas; conservar conceptos como expediente, actuación, INAPI y sincronización, con última consulta visible.

## Pendientes para una próxima versión

- Vigilancia: simplificar comparación en tabla, diferenciar las dos marcas y unificar sus atributos entre filas. No cambiar en esta ronda.
- Ficha integral del cliente **(opcional)**: cartera, expedientes, contactos y próximas actuaciones reunidos.
- Motor de búsqueda y similitud real, calibración de resultados y tratamiento de respuestas parciales.
- Persistencia de análisis y archivos con permisos, retención y trazabilidad.
- Autenticación y permisos efectivos, correo real y endurecimiento operativo.
- Calendario de plazos versionado y recordatorios persistentes con fechas fuente verificables.

## Fuera de esta ronda por decisión del usuario

- Cartera/«Marcas registradas»: mantener sección y denominación.
- Tabla y ficha de vigilancia: sin cambios.
- Canvas de inscripciones: conservar su organización actual.
- Navegación, bitácora y adaptación móvil: sin cambios.
- Búsqueda global y decisiones documentadas: no implementar. Evitar carga administrativa adicional.
- Revisión consecutiva de coincidencias: no incluida en la selección aprobada.

## Validación

Compilación local aprobada. 32 pruebas aprobadas (27 de lógica y 5 verificaciones existentes). Revisión automática de los componentes sin errores; permanecen advertencias conocidas sobre imágenes nativas. Pruebas de navegador en escritorio: filtro de Mi día y apertura de caso, fechas pendientes y actuaciones, etiquetas de notificaciones, criterios que invalidan el resultado, contactos y última consulta de INAPI. Las verificaciones usan lectura de datos de Dev sin modificar expedientes ni enviar comunicaciones.


Comprobar casos sin fecha, vencidos y próximos; notificaciones con y sin coincidencia; origen importado y simulado; resultado invalidado al modificar criterios; contactos largos. «Mi día» reutiliza datos existentes y no genera avisos, casos ni obligaciones nuevos por sí sola.

La sección «Acerca de esta versión» también retira la actualización diaria de INAPI de los pendientes y añade la mejora de vigilancia y la ficha integral opcional.

## Revisión de lógica procesal — 7 de septiembre

Ampliación autorizada en Dev: revisar el procedimiento completo con el bosquejo aportado y corregir las incongruencias, incluyendo ejemplos para presentación a abogados. Se mantienen las dos columnas del seguimiento y se precisan sus nombres: ingreso/publicación y oposición/fondo/resolución.

- Gestiones y hechos activadores compartidos entre fichas, resumen, agenda y Mi día; oposición sólo desde publicación efectiva, pago final desde ejecutoria.
- Actuación vigente como origen del vencimiento; la fecha de resolución no se presume notificación. Se admite oposición y observación de fondo concurrentes.
- Estados distintos para aceptación, firmeza, pago/acreditación, registro, recurso pendiente y desenlaces informados. Vencer un plazo no dicta un desenlace automático.
- Casos: la etapa interna no determina qué gestión jurídica corresponde a una fecha. Corregidas las opciones de publicación y pago final.
- Historial: conserva el título del acto y su detalle. Las solicitudes sin registro no muestran un vencimiento registral genérico.
- 22 escenarios separados, identificados como ficticios y con fecha de referencia fija, accesibles desde «Explorar ejemplos del proceso».
- Las lecturas de Fuente, Cartera e Inscripciones usan la misma interpretación de la evidencia guardada; actualizar reglas no debe generar avisos de novedades inexistentes.

Reglas, fuentes oficiales y límites en [REGISTRATION_PROCESS_REVIEW.md](REGISTRATION_PROCESS_REVIEW.md). Permanecen pendientes calendario plurianual/regional, constancias estructuradas de notificación y ejecutoria, respaldo automatizado de prórrogas, renovaciones e incidencias especiales. Esta revisión no implementa decisiones documentadas ni búsqueda global y se publica sólo en Dev.

Validación de esta revisión: 55 pruebas de lógica y 5 verificaciones existentes aprobadas, compilación aprobada y componentes sin errores de análisis estático. Se contrastaron 200 registros reales y 100 solicitudes con la nueva proyección, sin errores y sin forzar consultas ni modificar expedientes. Pruebas de navegador: grupos de gestiones, filtros, 22 ejemplos separados, obligaciones concurrentes, pago desde ejecutoria, historial y acceso a detalle. La reclasificación de reglas no se notifica como novedad de la fuente.
