# Verificación v0.5

Fecha: 10 de septiembre de 2026. Revisión local en `http://127.0.0.1:3000/app`, navegador integrado, viewport de 1280 × 720. Se inspeccionaron capturas, el DOM accesible y medidas de elementos renderizados. La escala existente del sitio es 0,8 × 0,9 dentro del contenido; se distingue tamaño CSS de tamaño físico.

## Resultado visual e interactivo local

| Puntos | Resultado observado |
| --- | --- |
| 1 | «Ir a calendario completo» en Vigilancia abre Seguimiento de casos con Calendario seleccionado; destino `#cases?view=calendar`. |
| 2 | Agenda Legal/Bandeja de revisión: ambos 14 px CSS; mes/Vigilancias nuevas: ambos 29,44 px CSS a este ancho, misma altura de línea. |
| 3 | Escribir `nub` con «Contiene» devuelve CASA NUBE, 1 de 100 marcas. Los cuatro controles tienen 52 px CSS y 37,44 px físicos de alto. |
| 4 | Local informa que aún no hay revisión completa exitosa y que la actualización automática está desactivada. No inventa una última revisión ni una próxima ejecución local. El horario programado y su zona se prueban además en `source-schedule.test.mjs`. |
| 5–6 | Resumen local muestra 9 casos activos, 5 tareas pendientes, primera fecha el 30 de septiembre y ninguna alerta de vencimiento próximo. Los tests comprueban migración idempotente y protección de datos reales. |
| 7 | La ficha distingue gestión, regla, fecha activadora y procedencia. Si falta identificar el acto, el editor bloquea añadir una fecha. No presenta una estimación como fecha oficial. El resultado de los 64 reales se acredita por separado en la entrega de Dev. |
| 8 | «Ir a calendario completo» en Registros abre Solicitudes/Calendario. Agenda de registros/Actividad del expediente: 14 px CSS; mes/Últimas actuaciones: 29,44 px. |
| 9 | Captura del revisor: «Búsqueda aproximada» completa, logo separado del campo y botón «Ver comparación de ejemplo» legible y con espacio interior. No hay texto recortado. |
| 10 | Entrar desde navegación abre Tarjetas. INAPI/Diario Oficial: ancho 484,29/484,30 px y altura 2088,65 px en ambos, encabezados 136,80 px. Leyenda próximo: `rgb(166,38,53)`; vencido: `rgb(23,19,27)`. |
| 11 | Solicitudes/Calendario tiene un único botón principal «Agregar tarea +», fondo `rgb(36,22,45)`. Los `+` de cada día son atajos contextualizados, no un segundo botón principal. |
| 12 | Prioritarias abre un panel derecho de alto completo, con aviso y cronología. ALBA muestra los dos actos y el aviso; se abrió un detalle individual. Cierre devuelve a la bandeja. Todas conserva su acordeón: se abrió NOVA FOODS y se mostraron texto, enlace a vigilancia y acción de revisión. |
| 13 | Grupos de Próximas versiones con 28 px de margen superior, 24 px de relleno y separador; primer grupo con 24 px y sin separador redundante. |

## Persistencia y pruebas

- El test HTTP local de antecedentes comprueba origen, fecha, acto vigente, medio correcto, identidad del servidor, guardado, lectura persistida, reemplazo, auditoría y revocación. Los fixtures propios se retiran al terminar.
- Las pruebas de calendario cubren 2026–2027; las de renovación conservan el vencimiento original y ajustan únicamente el cierre inhábil.
- La revisión de lint de los archivos de implementación no tiene errores; persisten tres advertencias de optimización de imágenes en el revisor, sin bloquear la ejecución.
- La aprobación visual anterior no afirma cobertura de todos los dispositivos. Tampoco acredita por sí sola un despliegue: compilación, suite y comprobación remota se registran en [la entrega v0.5](V0_5_RELEASE.md).

No se pulsó «Revisar» ni se solicitó una sincronización externa durante el recorrido visual. Las fechas y estados reales no se modificaron para mejorar la demo.

## Comprobación remota

En Dev se verificaron v0.5, 19 plazos fechados/45 pendientes, la ficha y respaldo de RTsalud y la cronología real de 49 hitos de MOTE CON HUESILLO EL COPIHUE DE LONQUÉN. Se abrió un detalle con ID de actuación, código 009, descripción completa y la referencia de una versión anterior. El aviso ya no muestra el párrafo masivo como primera lectura. La actualización muestra fecha/hora real y la próxima ejecución a las 12:30 p. m. de Santiago. El despliegue y la comparación de integridad están documentados en [V0_5_RELEASE.md](V0_5_RELEASE.md).
