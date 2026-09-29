# Corrección de tarjetas e importación de Excel · 29/09/2026

## Problemas y cambios

- Las acciones de las tarjetas de oposición/nulidad heredaban del `footer` global de la landing el fondo negro, la altura mínima y el relleno lateral. El pie de estas tarjetas ahora define su propia superficie transparente, altura de contenido, borde suave y botones alineados. La landing conserva su presentación.
- Los importadores de cartera (Mis marcas y Solicitudes) y de oposiciones/nulidades comparten `ImportFilePicker`: zona delimitada, icono de Excel, botón Elegir/Cambiar archivo, formatos/tamaño admitidos y nombre del archivo seleccionado.
- El selector usa el input nativo de archivos con etiqueta accesible y foco visible por teclado. Permite volver a elegir el mismo archivo tras un error. No anuncia arrastrar archivos porque esa interacción no se implementa.
- Las casillas de confirmación vuelven a tener control nativo visible, con etiqueta amplia. Botones de cierre, acción principal y acciones deshabilitadas se distinguen visualmente. El enlace de plantilla tiene borde propio.
- Los estilos de importación se aplican al diálogo directamente: estos diálogos se montan bajo `body`, fuera de `.buho-app`. Se evita depender de ese contenedor para dar apariencia a los controles.
- El título enfocado al abrir conserva el foco inicial accesible sin dibujar una caja de selección alrededor del encabezado; los controles interactivos mantienen el indicador de foco.

La corrección es visual y de selección de archivo. Conserva las validaciones, consultas previas, confirmaciones, roles y guardado existentes. Las pruebas visuales deben usar una base local aislada; abrir un importador en Dev no autoriza cargar expedientes de prueba en la cartera real.

## Verificación

- Compilación de producción y TypeScript correctos; ESLint sin errores en los tres componentes de importación.
- Pruebas HTTP de vigilancia e importación de oposiciones/nulidades correctas, con PostgreSQL y proveedor ficticio aislados.
- Revisión visual en navegador: tarjetas sin fondo negro y acciones alineadas; ambos importadores con selector delimitado, nombre del CSV seleccionado, vista previa y casillas visibles que habilitan la confirmación. Se cerraron sin incorporar los archivos de la prueba visual.
- La compilación se ejecutó desde una copia temporal limpia porque la lectura de dependencias/caché del directorio original se bloqueaba. No se modificaron dependencias ni datos alojados para resolverlo.
