# Vigilancia, oposiciones e informes — 22/09/2026

## Comportamiento

- Solicitudes de registro tiene una cuarta vista, «Marcas seguidas por oposición», exclusivamente con tarjetas. Lee los casos con rol oponente, sin incorporar esas marcas a la cartera propia. Sus enlaces abren el historial disponible y el caso.
- Se reutiliza el seguimiento diario de expedientes contrarios y sus tareas/avisos existentes. No se repiten consultas al abrir las tarjetas. Los historiales vacíos se identifican como falta de antecedentes de la fuente, no ausencia de actuaciones.
- Oposiciones presentadas y recibidas usan distintivos diferentes. El encabezado del caso muestra la marca del expediente, incluso sin una marca propia de fundamento.
- Vigilancia: umbrales porcentuales ajustables de 5 en 5; nuevos valores 65%/45%. La migración conserva ajustes existentes del usuario. Por revisar muestra alta/media, ordenando marcas por su mayor índice y luego cada coincidencia en orden descendente.
- Por revisar admite estados positivamente identificados como en trámite o concedidos. Descarta estados terminales o ambiguos; la interpretación incorpora actuaciones disponibles y la corrección documentada de LOLA. Los expedientes seleccionados para seguimiento se conservan aunque posteriormente terminen.
- Los flags de visibilidad permanecen en lib/watch-policy.ts. El resumen y los contadores aplican el mismo criterio que la lista.
- Las tarjetas muestran índice, clases y plazo de oposición. Se usa el calendario nacional ya incorporado, sin nuevas consultas; fuera de cobertura, fechas ausentes o datos inconsistentes producen avisos de confirmación, no plazos inventados.
- Crear caso devuelve una confirmación compacta, muestra estado de guardado y actualiza el resumen en segundo plano. Conserva bloqueo transaccional e idempotencia; los códigos de oposiciones no se convierten en números correlativos.
- En seguimiento usa tabla, sin niveles ni filtros de similitud. Las imágenes reales se amplían sin activar acciones de la fila; los controles de teclado y el cierre/restauración de foco se conservan.

## Factibilidad y PDF

- Criterios visibles antes de Buscar: estados (registradas/en trámite por defecto) y similitud mínima en pasos de 5%. Paginación de 10/25/50/100.
- El proveedor no documenta filtros de estado previos a la recuperación. No se envían parámetros inventados: se recuperan hasta 100 candidatos, se evita consultar detalles debajo del mínimo y se filtran estados normalizados en el servidor. La interfaz declara ese alcance; no promete recorrer toda la base.
- Selección manual entre páginas en celeste. Sin selección se incluyen los cinco mayores índices. PDF con logo del estudio, imágenes de las marcas y recomendación al final, sin LLM.
- El respaldo adjunto al PDF incluye solo las marcas seleccionadas, salvo que el autor solicite expresamente el anexo completo. No se filtran inadvertidamente resultados descartados al cliente.
- Las imágenes del informe se descargan con cuatro solicitudes simultáneas y un máximo global de 45 segundos; fallos se muestran explícitamente y permiten reintentar. El intermediario de imágenes requiere sesión y restringe host, protocolo, puerto, redirecciones, tamaño y dimensiones.
- Ejemplo: output/pdf/prefactibilidad-skittles-sour.pdf, regenerado desde la consulta guardada, sin repetir la búsqueda.

## Verificación

- Compilación de producción y revisión TypeScript.
- 150 pruebas unitarias aprobadas, cuatro pruebas opcionales omitidas por sus condiciones de entorno.
- Integración PostgreSQL: migraciones, tenant isolation, cola, reintentos y conservación del seguimiento.
- Integración HTTP: autenticación, CSRF, creación idempotente compacta, códigos de oposición no correlativos, contadores y restricciones del intermediario de imágenes.
- Navegador aislado: carga, tabla de seguimiento, caso, oposición presentada, acceso al historial, selección entre páginas y ampliación de imagen sin perder selección.
- PDF de ejemplo: dos páginas revisadas visualmente; cinco resultados y cinco antecedentes adjuntos; conclusión al final.
