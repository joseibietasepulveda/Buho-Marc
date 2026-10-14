# Evaluaciones de cruces por abogado

La pestaña **Evaluaciones** de `/app/admin/dashboard` incorpora decisiones formales, 👍/👎 y sus comentarios. La ruta `/app/admin/evaluaciones` abre esa vista directamente y muestra inicialmente todo el historial. Permisos: administrador interno Búho, iguales al dashboard. Publicación exclusivamente Dev; estado y evidencia en el [traspaso](handoffs/2026-10-14-evaluaciones-abogados-dashboard.md).

## Qué se cuenta

| Indicador | Definición |
| --- | --- |
| Evaluaciones guardadas | Decisiones formales y votos guardados, incluidas reconfirmaciones y cambios. Son registros, no una inferencia de cuántas veces pensó el abogado en el caso. |
| Cruces únicos evaluados | Cruces con una decisión concluyente positiva/negativa durante el período. Repetir la evaluación no agrega otro cruce. Una decisión sin conclusión queda en el historial, pero no agrega un cruce a este indicador. |
| Cambios de opinión | Inversión positiva/negativa respecto de la evaluación concluyente anterior del mismo abogado/cruce, incluso entre pulgar y decisión formal. Seguimiento → caso conserva opinión positiva y no cuenta como inversión. |
| Comentarios agregados/editados | Registros que añaden, modifican o eliminan comentario/motivo. Pueden acompañar una evaluación. |
| Ediciones solo de comentario | Se mantiene el voto/decisión y cambia únicamente el texto. Aparecen en el historial sin sumar otra evaluación. |
| Estados sin historial recuperable | Estado actual de `watch_feedback` sin bitácora disponible. Es parcial: no permite contar acciones anteriores perdidas. La fecha mostrada es la actualización guardada, que también puede cambiar por entrega al proveedor. |

Por abogado se cuentan cruces distintos dentro de su propio trabajo. El total global cuenta cada cruce una vez aunque lo evalúen varios abogados; por eso no necesariamente equivale a sumar la columna de todos los usuarios. Los registros sin autor se conservan sin asignarlos a un usuario actual.

Ejemplo sobre un único cruce: 👍, luego editar comentario, luego 👎 da **un cruce, dos evaluaciones, un cambio de opinión y una edición de comentario**. Un clic guardado que reconfirma el mismo voto es otra evaluación registrada; los reintentos automáticos de entrega a DeQuiénEs no lo son.

## Procedencia e historial

- `match_reviews`: filas de decisiones formales, con autor, fecha, motivo/comentario y snapshot disponibles.
- `audit_events` con acción `watch.feedback`: historial durable de votos/comentarios, con valores anteriores y posteriores. Se conserva el contexto anterior al período para identificar cambios sin sumarlo a sus totales.
- `watch_feedback`: solo se agrega como estado parcial si ese abogado/cruce no tiene eventos de bitácora; nunca se suma otra vez junto a su historial. Cambiar `updated_at` por una entrega/reintento no crea evaluaciones cuando hay bitácora.
- Los cambios comparan al mismo autor; no se interpreta el desacuerdo entre dos abogados como si uno hubiera cambiado de opinión. Cuando falta un evento previo, `before_data` puede acreditar el voto anterior, pero no se fabrica una fila ni su fecha. Empates de fecha sin orden acreditado no prueban una inversión entre esas filas.
- Se muestra el índice guardado al evaluar cuando existe; en caso contrario se indica que es el último índice disponible. Los nombres de marcas son los actualmente guardados. No se afirma reconstruir imágenes/coberturas históricas ausentes.

Las métricas de relevancia del dashboard conservan prioridad de decisión formal; si no existe, usan la última evaluación de pulgar. El historial de pulgares se ordena por la acción humana, no por la fecha de reintento de entrega. La primera revisión y el costo por alerta relevante también consideran pulgares con evidencia suficiente. Esta vista no convierte votos en estados de seguimiento, no resuelve desacuerdos por consenso ni cambia decisiones de GLM.

## Consulta independiente

Filtro superior por estudio, abogado y período. Dentro del historial se puede buscar marca/solicitud/comentario, elegir origen, positivo/negativo/sin conclusión, cambios de opinión o comentarios. La búsqueda incluye texto anterior, también cuando se eliminó un comentario. **Historial del cruce** limpia los filtros locales de texto/tipo y conserva el estudio/abogado seleccionados.

La casilla **Ver todo el historial, sin límite de fechas** amplía la tabla; los indicadores superiores siguen respetando el período seleccionado. La paginación permite recorrer todos los registros, sin el límite de 500 de otros detalles del dashboard. Son 40 por página, máximo 100 en API. Un corte `asOf` se conserva al paginar para evitar desplazamientos por evaluaciones nuevas; **Actualizar historial** incorpora los nuevos registros.

**Descargar esta página** exporta sus registros y textos anteriores, con protección de fórmulas CSV. **Exportar resumen** descarga los agregados por abogado del período. No se presenta una página como si fuera el historial completo descargado.

## Contratos, rendimiento y seguridad

`GET /api/admin/evaluations`: filtros `from`, `to`, `organizationId`, `userId`, `page`, `pageSize`, `search`, `source=all|formal|feedback`, `outcome=all|positive|negative|neutral`, `focus=all|changes|comments`, `matchId`, `allDates=true|false`, `asOf`. Fechas del período en Chile; corte ISO UTC. Respuesta: filas, conteo total, páginas y procedencia. Sin sesión 401; miembro/administrador externo 403. Filtros inválidos devuelven 400 y una indisponibilidad de lectura 503. Las búsquedas son parámetros SQL, no fragmentos ejecutables.

`AnalyticsUserRow.reviews` pasa de contar solo filas formales a evaluaciones guardadas de ambos canales; se añaden `reviewedCrosses`, `thumbsUp`, `thumbsDown`, `formalReviews`, `reviewOpinionChanges`, `reviewCommentUpdates`. El reporte añade `evaluations.metrics`; el prefijo de caché `v2-evaluations` impide servir snapshots con el contrato anterior. Consumidores actualizados: Actividad, Cartera/alertas, Evaluaciones y CSV.

No hay migraciones, tablas ni escrituras adicionales al guardar la valoración del abogado. Las lecturas utilizan la conexión analítica existente (máximo 1 y timeout SQL 8 s); los agregados siguen en el trabajador y el detalle solo se pide al abrir/filtrar/paginar. No hay polling permanente del historial. Los comentarios se leen únicamente desde el endpoint administrativo protegido y se renderizan como texto. Este módulo no los envía a telemetría, PostHog ni modelos externos; el envío previo de valoraciones a DeQuiénEs conserva su comportamiento existente.

No se importan evaluaciones de HTML/archivos locales ni se une la base de producción con Dev. Se muestran los registros efectivamente guardados en el ambiente consultado.

## Verificación

```sh
node --import ./tests/ts-loader.mjs --test tests/admin-evaluations.test.mjs tests/admin-analytics*.mjs tests/admin-dashboard-ui.test.mjs tests/analytics-capture*.mjs tests/watch-digest*.mjs tests/administrative-payment.test.mjs
```

El [traspaso](handoffs/2026-10-14-evaluaciones-abogados-dashboard.md) registra resultados reales, revisión visual, compilación, PR y despliegue. Las pruebas usan PostgreSQL descartable y datos ficticios; no llaman proveedores reales.
