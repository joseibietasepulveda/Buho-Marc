# Ajustes de presentación y tareas — 7 de septiembre de 2026

Implementación en Dev; Administrador de fuente permanece sin cambios.

- Se retira Mi día. Resumen Vigilancia muestra las tareas pendientes de los casos, con asunto, marca y abogado responsable, y acceso al caso.
- Casos permite escribir tareas libres de hasta 255 caracteres y activar sugerencias jurídicas. Estados: No aplica (predeterminado), Pendiente y Completado. Se guardan en case_tasks y sobreviven a la recarga; el resumen sólo incluye Pendiente.
- Clientes abre la ficha lateral al pulsar una fila o usar Enter/Espacio. La edición permanece en la ficha, con el guardado y control de versiones existentes.
- Macrofases: INAPI: Ingreso y publicación; Diario Oficial: Oposición, fondo y resolución. El subtítulo conserva las autoridades de cada etapa.
- Las gestiones sin fecha muestran acción, fecha de actuación disponible y antecedente faltante. El detalle conserva la explicación y regla del cómputo; no se inventan notificaciones ni vencimientos.
- Marcas denominativas: símbolo Aa y denominación del tipo junto al nombre. No se comprime el texto dentro del cuadro del logo.
- Logos: carga diferida, reintentos limitados y solicitudes simultáneas limitadas a cuatro hacia la fuente; errores temporales no se almacenan como imágenes ausentes. Tarjeta y ficha comparten componente.
- Factibilidad: probabilidad de oposición de terceros de 35 %, rotulada Dato mock y fija para Cafeteras Mistral. No es resultado de un algoritmo ni cambia con los datos de otra marca. Las dos tarjetas siguen icono, título y contenido.

## Pendiente de producto

Calibrar la probabilidad con el algoritmo y datos de validación antes de ofrecerla como resultado real. Se conservan los pendientes de UX_RELEASE_PLAN; este ajuste no agrega búsqueda global, decisiones documentadas ni ficha integral.
