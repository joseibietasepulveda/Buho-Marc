> Estado actualizado: la aplicación combina expedientes importados y ejemplos simulados. Ver [UX_RELEASE_PLAN.md](UX_RELEASE_PLAN.md) y [inapi-dev.md](inapi-dev.md) para distinguir funciones disponibles y limitaciones.

# Guía de la demo

## Objetivo

La demo permite mostrar la experiencia de Buho Marc con datos ficticios persistentes en Railway o, sin configuración adicional, con respaldo local en el navegador. Está pensada para una conversación comercial o una validación de producto, no para operar información real.

## Accesos de demostración

- Landing comercial: [https://buho-marc.vercel.app/](https://buho-marc.vercel.app/).
- Web app navegable: [https://buho-marc-web-dev.up.railway.app/app](https://buho-marc-web-dev.up.railway.app/app).
- URL anterior de prueba: [https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js](https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js), que redirige a la landing principal.

El dashboard incluido dentro de las landings es una vista previa estática, pensada para explicar la herramienta antes de contratarla. La interacción completa está disponible únicamente en la web app.

## Recorrido sugerido

1. Abrir **Resumen Vigilancia** y explicar la jerarquía: tareas jurídicas pendientes con su caso asociado, atención inmediata separada por nivel de similitud, indicadores, vigilancias y plazos. El KPI de Casos activos destaca los vencimientos dentro de 14 días.
2. Entrar a **Revisor de factibilidad**. El caso demo viene preparado como “Cafeteras Mistral”, con logo y clases Niza 11, 30 y 43.
3. Mostrar que las clases son opcionales y acumulativas: el desplegable explica el significado completo y, al seleccionar, agrega sólo el número como etiqueta. Presionar **Ver comparación de ejemplo**.
4. Revisar el aviso de demostración antes de abrir los ejemplos. La probabilidad de oposición de terceros (35 %) y los porcentajes de cada coincidencia son datos mock; no constituyen un pronóstico de concesión ni una evaluación oficial. Cambiar el nombre, imagen, tipo de coincidencia o clases invalida la vista anterior.
5. Revisar la tabla: “Cafeteras Las Delicias” destaca por similitud visual, “Hotel Mistral” por fonética, “Pisco Mistral” por coincidencia baja y “Museo Gabriela Mistral” por coincidencia muy baja. Abrir una fila para comparar ambos logos, ampliar cada imagen y revisar las clases compartidas y la razón.
6. Entrar a **Inscripción de marcas**. Revisar el Canvas de escritorio, separado en **INAPI: Ingreso y publicación** y **Diario Oficial: Oposición, fondo y resolución**, y comparar ejemplos de plazo normal, próximo a vencer, vencido y estado terminal.
7. Buscar una solicitud por marca, número, titular o cliente; filtrar por fase, estado o atención; abrir una tarjeta y revisar que el estado aparezca primero, seguido por los antecedentes y el historial de más antiguo a más reciente, con flechas.
8. En expedientes importados, revisar el estado recibido de la fuente y el historial de actuaciones, con fechas y detalle desplegable. Los datos oficiales no se cambian mediante el selector de la demo.
9. Entrar a **Marcas registradas**, revisar el cupo, agregar una marca por número de registro INAPI o usar la importación por RUT. Cualquier fila abre su ficha con el enlace a INAPI y los datos de tipo de marca.
10. Entrar a **Vigilancia**, buscar por nombre y aplicar uno o varios filtros de **Similitud** y **Estado**. El botón **Todas** o **Todos** limpia el grupo respectivo. La tabla comienza por **Similitud** y **Estado**, que se pueden cambiar directamente; cuando el ancho disponible no alcanza, usa sus barras horizontales en lugar de superponer columnas.
11. Agregar una vigilancia manual: elegir una marca en seguimiento, buscar un número de inscripción o solicitud y confirmar los campos completados, incluida la fecha de publicación en Diario Oficial.
12. Revisar la comparación y convertirla en caso.
13. Entrar a **Casos**, abrir el caso creado, revisar el calendario de plazos o arrastrarlo entre las tres etapas del tablero. En la ficha se pueden activar sugerencias jurídicas, escribir una tarea y marcarla como No aplica, Pendiente o Completado. Las pendientes aparecen en Resumen Vigilancia. También se puede superponer la vigilancia de origen o desvincularla con confirmación.
14. Entrar a **Notificaciones**, revisar los avisos de inscripción próximos a vencer o vencidos y copiar el contenido de correo si se necesita.
15. Entrar a **Clientes**, abrir una fila y editar la ficha lateral. Luego revisar **Administrador de fuente**: abrir ALIMENTOS WINKLER para mostrar estado, datos, cobertura y actuaciones ascendentes con resoluciones desplegables. Entrar a **Usuarios** y agregar una persona.

## Datos editables

- Marcas, casos y usuarios se pueden agregar.
- Las vigilancias se pueden clasificar como pendientes, en seguimiento, descartadas o pasadas a caso; la similitud también se puede ajustar manualmente.
- Los casos se pueden mover arrastrándolos o desde el detalle de caso; también se puede devolver su coincidencia de origen a revisión sin cerrar el caso.
- Las tareas de un caso aceptan texto libre y estados No aplica, Pendiente o Completado. En Railway se guardan en PostgreSQL; Resumen Vigilancia muestra únicamente las pendientes.
- Las notificaciones se pueden marcar como gestionadas y su contenido de referencia se puede copiar. No existe una etapa de borrador visible.
- Los estados de inscripciones provienen de las actuaciones. «Explorar ejemplos del proceso» abre 22 expedientes ficticios sin editar estados ni incorporarlos a la cartera.
- El Revisor de factibilidad permite cambiar el texto, subir una imagen local y acumular clases; al analizar devuelve el conjunto curado de cuatro coincidencias de la demo.
- En Railway los cambios se guardan en PostgreSQL y son visibles para todos quienes abran la demo.
- En local, si no existe `DATABASE_URL`, se usa `localStorage` como respaldo sin configuración.

## Comportamientos simulados

- La búsqueda por número de registro INAPI rellena parámetros ficticios; no consulta aún la fuente oficial.
- Los niveles y explicaciones de vigilancia son datos ficticios; la interfaz muestra Alta, Media o Baja, sin porcentajes de similitud.
- El enlace a la fuente oficial abre INAPI como referencia, no una publicación específica.
- El seguimiento identifica cada gestión, su activador y la procedencia de su fecha. Si falta el antecedente que activa el plazo, informa qué dato falta y evita inventar un vencimiento. El cálculo LPI cubre 2026 y no fecha la resolución de etapas sin plazo fijo.
- Los porcentajes de factibilidad y similitud son mock. La interfaz lo indica expresamente y no los presenta como búsqueda, pronóstico o resolución oficial.
- El transcurso del plazo no modifica automáticamente el estado, acredita ausencia de oposición ni concede la marca; se espera la actuación correspondiente.
- Cargar un archivo, exportar, vistas guardadas y filtros secundarios son controles visuales.
- Copiar un correo usa el portapapeles del navegador; nunca se envía automáticamente.

## Criterios UX aplicados

- Se conserva el contexto con paneles laterales para revisar vigilancias, casos y notificaciones.
- El color siempre se acompaña de texto.
- Las vigilancias combinan filtros acumulables y cada fila tiene cursor de mano, foco visible y apertura por teclado.
- Las acciones de mayor impacto se explicitan y muestran confirmación.
- Los formularios no borran datos hasta que el usuario confirma o cierra el panel.
- Las tablas pueden desplazarse horizontalmente cuando el ancho disponible no alcanza y el tablero conserva sus columnas. En escritorio se aplica una densidad visual equivalente al 90 % de zoom.
- La experiencia está optimizada para computador. Tablet y móvil ofrecen acceso básico, pero no condicionan la densidad ni la distribución principal del Canvas.

## Ronda UX de septiembre

El resumen abre la agenda en el mes actual y muestra una tabla de tareas pendientes, con las columnas «Tareas pendientes» y «Caso». La prioridad interna y el estado temporal se presentan por separado. Inscripciones explica la gestión y el antecedente faltante cuando no puede calcular un vencimiento. Las notificaciones de plazo nunca usan etiquetas de similitud. El administrador distingue expedientes e historial de consultas, muestra la última consulta completada y abre una ficha de solo lectura desde cada fila.

## Recorrido del procedimiento para abogados

En **Inscripción de marcas → Explorar ejemplos del proceso**, todos los expedientes son ficticios y usan como referencia el 7 de septiembre de 2026. Recorrer UMBRAL (DEMO-004, requerir publicación), PÁGINA (DEMO-005, esperando publicación), NEXO (DEMO-014, oposición y fondo concurrentes), FRONDA (DEMO-016, aceptación parcial), PRISMA (DEMO-017, apelación), CIMA (DEMO-018, ejecutoria y pago), HUELLA (DEMO-019, pago acreditado) y RAÍZ (DEMO-020, registro). Los filtros permiten revisar los demás supuestos: forma, prueba, prórroga y cierres por resolución. Ninguno genera avisos ni cambios en la cartera. Las reglas y límites están en [REGISTRATION_PROCESS_REVIEW.md](REGISTRATION_PROCESS_REVIEW.md).
