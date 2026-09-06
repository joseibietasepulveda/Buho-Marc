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
