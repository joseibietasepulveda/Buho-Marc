# Guía de la demo

## Objetivo

La demo permite mostrar la experiencia de Buho Marc con datos ficticios persistentes en Railway o, sin configuración adicional, con respaldo local en el navegador. Está pensada para una conversación comercial o una validación de producto, no para operar información real.

## Accesos de demostración

- Landing comercial: [https://buho-marc.vercel.app/](https://buho-marc.vercel.app/).
- Web app navegable: [https://buho-marc-web-dev.up.railway.app/app](https://buho-marc-web-dev.up.railway.app/app).
- URL anterior de prueba: [https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js](https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js), que redirige a la landing principal.

El dashboard incluido dentro de las landings es una vista previa estática, pensada para explicar la herramienta antes de contratarla. La interacción completa está disponible únicamente en la web app.

## Recorrido sugerido

1. Abrir **Inicio** y explicar la jerarquía: atención inmediata separada por nivel de similitud, indicadores alineados, vigilancias y plazos. El KPI de Casos activos destaca los vencimientos dentro de 14 días.
2. Entrar a **Marcas**, revisar el cupo, agregar una marca por número de registro INAPI o usar la importación por RUT. Cualquier fila abre su ficha con el enlace a INAPI y los datos de tipo de marca.
3. Entrar a **Vigilancia**, buscar por nombre y aplicar uno o varios filtros de **Similitud** y **Estado**. El botón **Todas** o **Todos** limpia el grupo respectivo. La tabla comienza por **Similitud** y **Estado**, que se pueden cambiar directamente; cuando el ancho disponible no alcanza, usa sus barras horizontales en lugar de superponer columnas.
4. Agregar una vigilancia manual: elegir una marca en seguimiento, buscar un número de inscripción o solicitud y confirmar los campos completados, incluida la fecha de publicación en Diario Oficial.
5. Revisar la comparación y convertirla en caso.
6. Entrar a **Casos**, abrir el caso creado, revisar el calendario de plazos o arrastrarlo entre las cuatro etapas del tablero. Desde la ficha se puede superponer la vigilancia de origen o desvincularla con confirmación.
7. Entrar a **Notificaciones**, revisar el contexto y copiar el contenido de correo si se necesita.
8. Entrar a **Usuarios** y agregar una persona.

## Datos editables

- Marcas, casos y usuarios se pueden agregar.
- Las vigilancias se pueden clasificar como pendientes, en seguimiento, descartadas o pasadas a caso; la similitud también se puede ajustar manualmente.
- Los casos se pueden mover arrastrándolos o desde el detalle de caso; también se puede devolver su coincidencia de origen a revisión sin cerrar el caso.
- Las notificaciones se pueden marcar como gestionadas y su contenido de referencia se puede copiar. No existe una etapa de borrador visible.
- En Railway los cambios se guardan en PostgreSQL y son visibles para todos quienes abran la demo.
- En local, si no existe `DATABASE_URL`, se usa `localStorage` como respaldo sin configuración.

## Comportamientos simulados

- La búsqueda por número de registro INAPI rellena parámetros ficticios; no consulta aún la fuente oficial.
- Los niveles y explicaciones de vigilancia son datos ficticios; la interfaz muestra Alta, Media o Baja, sin porcentajes de similitud.
- El enlace a la fuente oficial abre INAPI como referencia, no una publicación específica.
- Cargar un archivo, exportar, vistas guardadas y filtros secundarios son controles visuales.
- Copiar un correo usa el portapapeles del navegador; nunca se envía automáticamente.

## Criterios UX aplicados

- Se conserva el contexto con paneles laterales para revisar vigilancias, casos y notificaciones.
- El color siempre se acompaña de texto.
- Las vigilancias combinan filtros acumulables y cada fila tiene cursor de mano, foco visible y apertura por teclado.
- Las acciones de mayor impacto se explicitan y muestran confirmación.
- Los formularios no borran datos hasta que el usuario confirma o cierra el panel.
- Las tablas pueden desplazarse horizontalmente cuando el ancho disponible no alcanza y el tablero conserva sus columnas. En escritorio se aplica una densidad visual equivalente al 90 % de zoom.
