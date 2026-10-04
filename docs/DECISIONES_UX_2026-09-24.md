# Decisiones vigentes de UX y operación · 24 de septiembre de 2026

> Continuidad: [correcciones del 29/09](UX_IMPORTACIONES_2026-09-29.md), [UI/UX del 02/10](UX_OCTUBRE_2026.md) e [informes del 02/10](INFORMES_FACTIBILIDAD_2026-10-02.md). Los puntos siguientes incorporan las actualizaciones de octubre; los registros de entrega antiguos conservan su fecha.

Este documento consolida las decisiones de la conversación y las contrasta con el código actual. Prevalece sobre los textos históricos del 21 y 22 de septiembre cuando hay diferencias. No implica que se hayan repetido todas las pruebas de aquellas entregas.

## Vigilancia y revisiones desde el chat

- Se retiran de Vigilancia «Revisar esta marca», «Revisar seleccionada», el selector «Revisar una marca» y «Revisar toda la cartera». Las revisiones manuales de similitud se solicitan al asistente desde el chat.
- Se conserva la información de última actualización, el modo de revisión y el avance de trabajos. Abrir la pantalla, filtrar o ampliar resultados guardados no inicia una búsqueda remota.
- Esta decisión cambia la interfaz, no la programación por organización: Daniel mantiene la revisión diaria a las 12:30 de Santiago; Búho / `estudio-ibieta-ip` permanece a pedido. La sincronización de expedientes es una operación distinta. Véase [control de consumo](COST_CONTROL.md).
- El backend conserva `POST /api/watch`, acción `review`, con sesión y organización: un `id` de objetivo limita la revisión a esa marca; omitirlo solicita la cartera completa. Para atender una petición desde el chat, resolver primero ambiente, organización y marca, reutilizar la cola existente y comprobar su resultado. No lanzar una revisión de toda la cartera por una solicitud individual ni repetir búsquedas para probar una modificación visual.
- Se mantienen las acciones de comparar/historial, seguir, avisar publicación, convertir en caso y descartar. No se borran evidencias, decisiones ni trabajos al quitar los botones.

## Presentación de vigilancia

- Índices visibles como porcentajes, destacados en negrita. Los umbrales iniciales de Vigilancia vigentes son 70%/55%, según `DEFAULT_WATCH_SETTINGS`; las preferencias anteriores de cada organización se conservan. Los valores 65%/45% siguen perteneciendo a la evaluación de factibilidad, no a la configuración inicial de Vigilancia. El control es amplio, con dos puntos en pasos de 5%, leyenda roja/amarilla/verde y explicación del extremo 100%. Los ajustes anteriores de cada organización se conservan.
- Por revisar muestra alta y media, con selección de niveles. Orden normal: marcas propias según su mayor índice de la categoría y coincidencias de mayor a menor. En seguimiento usa una tabla independiente, sin índice ni filtro de similitud.
- Actualización posterior: Vigilancia excluye concedidas/registradas de sus pestañas y contadores. Los flags vigentes en `lib/watch-policy.ts` son `showRegistered: false`, `showLapsed: false`, `showExpired: false`; estados terminales o ambiguos quedan fuera de novedades/antecedentes. Un seguimiento elegido se conserva en la base aunque su estado deje de ser visible. Factibilidad mantiene su selección independiente de estados.
- Clases de Niza, publicación y ventana de oposición se ven desde las tarjetas. Los plazos usan fechas y calendario disponibles; sin antecedente suficiente se informa la incertidumbre. No se hacen consultas adicionales por tarjeta para calcularlos.
- Los filtros de fecha de publicación DO son inclusivos y activan «Publicada en Diario Oficial». «INAPI · sin publicación informada» describe la información disponible: no acredita por sí solo ausencia de publicación.
- La carga muestra un indicador sobre las pestañas grandes Por revisar / En seguimiento. Convertir en caso muestra estado de guardado y conserva la creación idempotente.
- En la comparación se muestran las clases de ambas marcas y debajo sus coberturas. Las imágenes reales se amplían; la falta de imagen usa un marcador legible, sin comprimir el nombre dentro del recuadro.

## Casos, cartera y tareas

- Oposición presentada y recibida se distinguen visualmente. En la ficha de oposición recibida queda únicamente el selector de cliente de la sección inferior, sin repetirlo en el encabezado.
- Solicitudes de registro tiene las vistas Tarjetas, Calendario, Listas y Marcas seguidas por oposición. Esta última se presenta exclusivamente con tarjetas de expedientes contrarios vinculados a oposiciones presentadas.
- Las marcas impugnadas se siguen con sus resoluciones y permiten acceder al historial disponible sin incorporarse a la cartera propia. No se debe interpretar un historial vacío como inexistencia de actuaciones.
- Mis marcas comienza con Número de solicitud, Parte Figurativa y Marca. El RUT se mantiene en ficha/búsqueda, sin columna visible; se retira el filtro Real/Mock. Estado INAPI y pendientes usan texto normal, y más de cinco pendientes se muestra como «5+ por revisar». La imagen y la denominación tienen celdas separadas; se usa «Sin logo» cuando falta, sin cambiar el tipo real de marca.
- Las marcas sin cliente permiten asignarlo desde un desplegable. Clientes permite crear/editar su ficha y preparar un informe de las marcas vinculadas, con selección de columnas y formato Excel (inicial), Word o PDF. El alta de cartera acepta titular/representante y confirma cliente/rol; Excel/CSV también admite RUT y razones sociales.
- Tareas tiene acceso propio debajo de Casos y conserva los demás accesos. Ambos resúmenes apuntan a la misma sección y muestran dos tareas por página. Resumen de registros comparte la estructura visual del de Vigilancia.
- Vigilancias nuevas muestra hasta tres coincidencias pendientes reales, o las disponibles si hay menos. Este criterio final reemplaza la mención inicial contradictoria a cuatro. Sus textos e insignias deben caber sin superposición.
- Cronologías de trámites: actuaciones antiguas arriba y recientes abajo. Notificaciones y auditoría muestran descripciones comprensibles para abogados, en lugar de nombres de campos o eventos internos como `image_url`, `registration_id` o `brand.monitoring_changed`.
- Actualización del 28/09: se retiraron los valores de presentación fijos 22/30. Prioritarias y Todas muestran el total real de sus listas; la barra lateral muestra las prioritarias pendientes y disminuye al revisarlas. Con cero pendientes no aparece el indicador lateral.

## Factibilidad e informes

Actualización del 02/10: [Informes de factibilidad](INFORMES_FACTIBILIDAD_2026-10-02.md) reemplaza las decisiones históricas de generación sin LLM y logo genérico de esta sección. Agrega perfiles persistentes opcionales, conclusión asistida con respaldo determinista y formato basado en el informe SEMASK revisado por el cliente.

- Antes de Buscar se eligen estados y similitud mínima en pasos de 5%. Registradas y en trámite son los estados predeterminados; se pueden ampliar. Los resultados tienen selección individual celeste, imágenes ampliables, paginación de 10/25/50/100 y mensaje de búsqueda vacía.
- La fuente todavía no ofrece un filtro documentado de estados previo a recuperar candidatos. El servidor consulta hasta 100 candidatos y aplica los criterios a los antecedentes obtenidos; no promete exhaustividad ni envía parámetros inexistentes.
- Descargas PDF y Word editable (`.docx`, también abrible en Google Docs), sin crear un documento en Drive. El informe sigue el ejemplo del cliente: tamaño Carta, logo a la izquierda, encabezado institucional, cuatro secciones, imágenes y coberturas completas. El perfil del estudio se guarda por organización y todos sus campos son opcionales. La conclusión puede usar OpenRouter; sin clave o ante fallo se usa el respaldo determinista.
- La recomendación va al final: esta decisión reemplaza la petición anterior de abrir el informe con ella. Se detallan las marcas seleccionadas; sin selección, hasta cinco con los mayores índices. La recomendación considera toda la búsqueda recuperada, aunque el autor seleccione menos marcas para el detalle.
- Regla automática actual en `lib/feasibility-recommendation.ts`: dos o más coincidencias relevantes altas sugieren ajustar; una alta, alguna media o una alta con estado incierto sugieren revisar; sin coincidencias medias/altas relevantes y con resultados recuperados se sugiere proseguir. Una búsqueda totalmente vacía sugiere completar la revisión. Se consideran estados vigentes y clases consultadas, incluyendo antecedentes sin clase informada.
- Alto equivale a 65% o más; medio, 45% a menos de 65%. Por ejemplo, 74% es alto. Los índices se muestran en porcentaje en pantalla, PDF y Word; son semejanza, no probabilidad de aprobación. El abogado puede modificar recomendación y motivo.
- Skittles debe recibir una conclusión más cauta cuando los resultados reales muestran varias similitudes altas. La imagen de ejemplo `24033.png` se conserva para QA, pero el logo genérico ya no se inserta por defecto en los informes: se usa el perfil del estudio o se omite. No inventar resultados ni afirmar una calibración no realizada.
- OpenRouter ya está preparado para redactar y comparar coberturas con todos los antecedentes textuales de la búsqueda. Se conserva la decisión explícita del abogado y un motivo escrito se utiliza directamente. La generación guarda contexto/resultado/uso/costo, se deduplica y se reutiliza entre formatos; requiere una clave real para activarse en Dev. La calibración con ejemplos y revisión humana sigue pendiente; los umbrales no son una validación estadística.

## Casos, paneles y acciones · actualización de octubre

Casos inicia en modo simple, con modo detallado disponible en tablero, lista y calendario. Las vistas generales omiten códigos BM; la ficha conserva el detalle, permite cambiar la prioridad desde la píldora y organiza el expediente defendido en tabla. Paneles laterales se cierran al pulsar fuera; los diálogos compartidos admiten Escape y restauran el foco. Desde el 4 de octubre, Notificaciones permite retirar una o todas sin borrar evidencia y limpiar el indicador de Prioritarias marcándolas como revisadas, conservándolas en ambas bandejas; tareas admite X en las listas bajo calendarios y botón rojo en el editor, sin eliminar plazos legales.

El buscador general consulta datos guardados por marca, cliente, RUT, solicitud, registro, representante y contraparte, con acceso a las fichas. Es una búsqueda local, no una consulta remota al escribir.

## LOLA y límites de la fuente

La solicitud 1367215 LOLA tiene corrección documentada en `lib/verified-decisions.ts`: fallo de rechazo del 14/02/2024 y decisión firme por no recurso del 13/03/2024. Se conservan enlaces y datos originales de la fuente. Esa evidencia sustenta «Rechazada definitivamente»; la etiqueta `VER INSTANCIA` no lo demuestra por sí sola.

La interpretación general de estados y actuaciones se aplica a futuros casos, pero el desenlace de LOLA no se copia a otras solicitudes. Los casos ambiguos requieren antecedentes y no se muestran como solicitudes confirmadas en trámite. La conexión directa con una API de INAPI quedó aplazada por indicación expresa del usuario, al no disponer de documentación/acceso. No simular una consulta exitosa ni ocultar un fallo como ausencia de antecedentes.

## Continuidad y entrega

- Implementar y publicar en Railway Dev. Production requiere una petición expresa posterior.
- Conservar cambios y archivos locales ajenos; incluir en el commit solo los archivos del ajuste.
- Las comprobaciones del 24/09 cubrieron la retirada de controles y compilación. La ronda del 02/10 agregó pruebas dirigidas, piloto aislado y revisión completa de PDF/Word; sus resultados están en las guías de octubre. Editar documentación no vuelve a certificar otros flujos.
- Referencias: [UX de vigilancia/oposiciones](UX_VIGILANCIA_OPOSICIONES_2026-09-22.md), [antecedentes de prefactibilidad y LOLA](UX_PREFACTIBILIDAD_SEPTIEMBRE.md), [control de consumo](COST_CONTROL.md) y [despliegue](RAILWAY_DEPLOYMENT.md).
