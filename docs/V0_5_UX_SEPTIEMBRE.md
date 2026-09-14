# Ajustes de experiencia v0.5 · septiembre de 2026

- Tareas de casos y solicitudes: prioridad Alta, Media o Baja persistida, con Media para las anteriores; independiente del plazo legal y de la prioridad del caso.
- El filtro de Casos busca casos con tareas **pendientes** de la prioridad seleccionada. Las tarjetas conservan el contexto de todas sus tareas pendientes; la agenda filtra las tareas y conserva los plazos de esos casos.
- Resumen Vigilancia: tres tareas por página, columnas Tareas pendientes, Caso y Fecha, ordenadas por fecha (las sin fecha al final).
- Casos: marca propia y marca del tercero identificadas por separado, todas las tareas pendientes visibles y eliminación confirmada en un diálogo.
- Marcas registradas: clases de Niza con descripción compartida con Factibilidad y espacio mayor en el filtro; controles de búsqueda de igual altura.
- Vigilancia: explicación antes de la comparación, cliente en una línea e historial de la **marca del tercero**. No se asocia una marca real usando solamente un número de solicitud ficticio: deben coincidir número y nombre. Los ejemplos se identifican como demostración.
- Clientes: los nombres iniciales son marcas/clientes comerciales; las marcas vinculadas abren la ficha estándar. Los nombres personalizados se conservan.
- Solicitudes: Tarjetas por defecto; orden Tarjetas, Calendario, Listas.
- Resúmenes: encabezados homólogos comparten tamaño y peso; hoja de ruta con títulos en negrita y separación entre grupos.

## Datos y migración

`0004_task_priorities.sql` añade prioridad a `case_tasks` y `registration_tasks`, valida los tres valores y adapta los seis nombres originales de clientes de demostración. No modifica expedientes INAPI ni fechas legales.

## Verificación de los cambios

- Compilación de producción y comprobación TypeScript correctas.
- Seis pruebas unitarias de tareas/clientes y prueba de integración HTTP + PostgreSQL: crear, editar prioridad, rechazar prioridad inválida, recuperar y eliminar tareas de casos y solicitudes.
- Navegador local: paginación 3/2 sobre cinco pendientes; fichas de marcas desde clientes; selector de prioridad y confirmación de borrado; orden de información de vigilancia.
- Tamaños calculados en el navegador: ambos títulos de resumen 29,44 px / peso 750 y ambas etiquetas superiores 14 px / peso 700 en el viewport probado; controles de búsqueda de idéntica altura.
- Pruebas locales con base aislada por archivos de la base habitual pendientes de descarga de iCloud. La base original se conserva sin reemplazarla.

## Coordinación de la fuente

Víctor, creador de DeQuiénes, es socio del proyecto. Extrae diariamente PDF y Excel públicos de INAPI. La revisión de 20 solicitudes del 14/09/2026 devolvió 270 actuaciones, 51 observaciones con texto y cuatro referencias narrativas a fechas históricas de notificación. Los 270 campos `due_date` estaban vacíos. La API documentada excluye originales; las ampliaciones de búsqueda por titular/representante y antecedentes estructurados de notificación deben coordinarse con Víctor. No se han implementado ni supuesto disponibles en estos ajustes de interfaz.
