# Valoraciones de vigilancia y comparación de factibilidad

## Cambios del 5 de octubre de 2026

- El pulgar refleja la elección inmediatamente. La escritura y el botón Enviar aparecen en la misma tarjeta, bajo la etiqueta «Explícanos por qué», de mayor tamaño. El comentario es opcional.
- La respuesta de guardado confirma la transacción local. El envío a DeQuiénEs se ejecuta después de responder, con `after`; la cola persistente y el trabajador existente conservan los reintentos, las versiones y el control de concurrencia. Un envío externo fallido no deshace la valoración guardada.
- Si falla el guardado local se informa «Valoración sin guardar», se conserva el borrador y se ofrece reintentar. Los controles evitan escrituras simultáneas desde la misma tarjeta. La selección optimista no se presenta como confirmación de persistencia.
- Factibilidad muestra una columna Logo, con ampliación y alternativa «Sin imagen». Comparar abre directamente el panel lateral compartido con Vigilancia. Permite revisar logos, denominación, clases, cobertura, titular e historial, y añadir o quitar el antecedente del informe. La propuesta no muestra números de solicitud ni titulares inventados.
- PDF y Word enumeran las clases con comas. Las coberturas idénticas se agrupan bajo sus clases; las coberturas distintas se conservan completas, también en el anexo.
- El encabezado de comparación distribuye el enlace a INAPI en una fila propia en pantallas estrechas.

## Validación

Compilación de producción y revisión de código. Doce pruebas unitarias de feedback, informes y agrupación de coberturas; integración con PostgreSQL descartable y proveedores simulados. La integración verifica que una demora externa de 2,5 segundos no retrasa la respuesta local, que la indisponibilidad mantiene el envío pendiente, que una edición durante un envío no queda marcada como enviada por la versión anterior y que el trabajador entrega la versión más reciente. Se conservan las comprobaciones de identidad del actor, par de solicitudes, score y aislamiento por organización.

Comprobación visual de escritorio y móvil, apertura de coberturas y selección desde el panel. PDF y Word de prueba renderizados e inspeccionados con tres clases, incluyendo cobertura informada y ausente. Evidencias locales en `output/ui-fixes-2026-10-05/`.

No hay migraciones nuevas, borrado de registros ni cambios en la configuración de respaldos. El destino de esta ronda sigue siendo Dev; la publicación debe verificarse en Railway por el commit correspondiente.

## Parte figurativa en Mis marcas

La tabla y las fichas reutilizan `PortfolioLogo`: la imagen conserva sus proporciones dentro de un recuadro y, ante un error de carga, se reintenta automáticamente dos veces (tras 1 y 3 segundos). No se añade ningún botón de reintento. Si la fuente continúa fallando se muestra «Imagen no disponible», sin iconos rotos ni texto alternativo que ensanche la fila. Una marca figurativa sin archivo no se etiqueta como denominativa.

La captura del usuario muestra imágenes fallidas; en una consulta posterior a Dev las mismas solicitudes respondieron correctamente. Esto confirma la falta de recuperación en la interfaz, pero no permite atribuir con certeza el fallo inicial a INAPI o a la red. El cambio no altera la base de datos ni la autenticación del proxy de imágenes.

Verificación: compilación/TypeScript y ESLint; piloto aislado con PostgreSQL; navegador con una respuesta 503 seguida de imagen válida (recuperación en el segundo intento), fallo persistente (exactamente tres intentos, aviso estable), marca figurativa sin archivo y marca denominativa. Ampliar la imagen recuperada continúa funcionando. Evidencia: `output/portfolio-logos-2026-10-05/fallos-controlados.png`.
