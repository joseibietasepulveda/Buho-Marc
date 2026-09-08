# Ajustes de presentación y tareas — 7 de septiembre de 2026

Implementación inicial en Dev; Administrador de fuente permaneció sin cambios en esta ronda. Su mejora posterior, autorizada el 8 de septiembre, se detalla abajo.

- Se retira Mi día. Resumen Vigilancia muestra las tareas pendientes de los casos, con asunto, marca y abogado responsable, y acceso al caso.
- Ajuste visual del 8 de septiembre: la caja de tareas usa el borde lila de las cajas contiguas y no tiene título ni contador propios. La tabla lleva los encabezados «Tareas pendientes» y «Caso»; conserva el acceso al caso desde cada fila.
- Casos permite escribir tareas libres de hasta 255 caracteres y activar sugerencias jurídicas. Estados: No aplica (predeterminado), Pendiente y Completado. Se guardan en case_tasks y sobreviven a la recarga; el resumen sólo incluye Pendiente.
- Clientes abre la ficha lateral al pulsar una fila o usar Enter/Espacio. La edición permanece en la ficha, con el guardado y control de versiones existentes.
- Macrofases: INAPI: Ingreso y publicación; Diario Oficial: Oposición, fondo y resolución. El subtítulo conserva las autoridades de cada etapa.
- Las gestiones sin fecha muestran acción, fecha de actuación disponible y antecedente faltante. El detalle conserva la explicación y regla del cómputo; no se inventan notificaciones ni vencimientos.
- Marcas denominativas: símbolo Aa y denominación del tipo junto al nombre. No se comprime el texto dentro del cuadro del logo.
- Logos: carga diferida, reintentos limitados y solicitudes simultáneas limitadas a cuatro hacia la fuente; errores temporales no se almacenan como imágenes ausentes. Tarjeta y ficha comparten componente.
- Factibilidad: probabilidad de oposición de terceros de 35 %, rotulada Dato mock y fija para Cafeteras Mistral. No es resultado de un algoritmo ni cambia con los datos de otra marca. Las dos tarjetas siguen icono, título y contenido.

## Pendiente de producto

Calibrar la probabilidad con el algoritmo y datos de validación antes de ofrecerla como resultado real. Se conservan los pendientes de UX_RELEASE_PLAN; este ajuste no agrega búsqueda global, decisiones documentadas ni ficha integral.

## Administrador de fuente — 8 de septiembre de 2026

- Tabla INAPI con siete columnas principales y filas que abren la ficha mediante clic, Enter o Espacio. El resto de los antecedentes se consulta dentro de la ficha.
- Ficha lateral con cabecera y cierre fijos, desplazamiento interno, estado, datos del expediente, cobertura y antecedentes agrupados. Fechas legibles y etiquetas en español; los códigos de la fuente conservan su valor original.
- Actuaciones de más antigua a más reciente, con flechas. Las resoluciones extensas se despliegan bajo cada actuación y conservan su texto completo.
- Aumento discreto de textos, principalmente de 14 a 15 px, con estilos limitados a esta sección. Se conserva el tamaño de los títulos principales.
- Filtros, pestañas, contraste de botones y paginación revisados. Se conserva la separación entre consulta INAPI y edición de fuente simulada; no se cambian datos ni reglas procesales.

Validación: compilación y análisis estático aprobados; 11 pruebas existentes de actuaciones, fuente y procedencia aprobadas. Comprobación en navegador con el expediente ALIMENTOS WINKLER: ficha a altura completa, fechas ascendentes, flechas, resoluciones desplegables y ausencia de desbordamiento horizontal.
