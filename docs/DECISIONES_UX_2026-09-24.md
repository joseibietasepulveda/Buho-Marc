# Decisiones vigentes de UX y operación · 24 de septiembre de 2026

Este documento consolida las decisiones de la conversación y las contrasta con el código actual. Prevalece sobre los textos históricos del 21 y 22 de septiembre cuando hay diferencias. No implica que se hayan repetido todas las pruebas de aquellas entregas.

## Vigilancia y revisiones desde el chat

- Se retiran de Vigilancia «Revisar esta marca», «Revisar seleccionada», el selector «Revisar una marca» y «Revisar toda la cartera». Las revisiones manuales de similitud se solicitan al asistente desde el chat.
- Se conserva la información de última actualización, el modo de revisión y el avance de trabajos. Abrir la pantalla, filtrar o ampliar resultados guardados no inicia una búsqueda remota.
- Esta decisión cambia la interfaz, no la programación por organización: Daniel mantiene la revisión diaria a las 12:30 de Santiago; Búho / `estudio-ibieta-ip` permanece a pedido. La sincronización de expedientes es una operación distinta. Véase [control de consumo](COST_CONTROL.md).
- El backend conserva `POST /api/watch`, acción `review`, con sesión y organización: un `id` de objetivo limita la revisión a esa marca; omitirlo solicita la cartera completa. Para atender una petición desde el chat, resolver primero ambiente, organización y marca, reutilizar la cola existente y comprobar su resultado. No lanzar una revisión de toda la cartera por una solicitud individual ni repetir búsquedas para probar una modificación visual.
- Se mantienen las acciones de comparar/historial, seguir, avisar publicación, convertir en caso y descartar. No se borran evidencias, decisiones ni trabajos al quitar los botones.

## Presentación de vigilancia

- Índices visibles como porcentajes, destacados en negrita. Umbrales iniciales: alta desde 65%, media desde 45% y hasta menos de 65%, baja por debajo de 45%. El control es amplio, con dos puntos en pasos de 5%, leyenda roja/amarilla/verde y explicación del extremo 100%. Los ajustes anteriores de cada organización se conservan.
- Por revisar muestra alta y media, con selección de niveles. Orden normal: marcas propias según su mayor índice de la categoría y coincidencias de mayor a menor. En seguimiento usa una tabla independiente, sin índice ni filtro de similitud.
- Excepción temporal existente: `lib/demo-watch-order.ts` prioriza ejemplos seleccionados únicamente en la cartera y ambiente indicados hasta el 24/09/2026 a las 23:00 de Santiago. Expira automáticamente; no cambia puntajes, estados ni evidencia. No convertirla en orden permanente.
- Por revisar incluye estados confirmados en trámite y concedidos/registrados. Los flags actuales en `lib/watch-policy.ts` son `showRegistered: true`, `showLapsed: false`, `showExpired: false`; estados terminales o ambiguos quedan fuera. La petición inicial de excluir registradas fue reemplazada por la posterior de incluir concedidas. Un seguimiento elegido por el abogado se conserva aunque cambie el estado del expediente.
- Clases de Niza, publicación y ventana de oposición se ven desde las tarjetas. Los plazos usan fechas y calendario disponibles; sin antecedente suficiente se informa la incertidumbre. No se hacen consultas adicionales por tarjeta para calcularlos.
- Los filtros de fecha de publicación DO son inclusivos y activan «Publicada en Diario Oficial». «INAPI · sin publicación informada» describe la información disponible: no acredita por sí solo ausencia de publicación.
- La carga muestra un indicador sobre las pestañas grandes Por revisar / En seguimiento. Convertir en caso muestra estado de guardado y conserva la creación idempotente.
- En la comparación se muestran las clases de ambas marcas y debajo sus coberturas. Las imágenes reales se amplían; la falta de imagen usa un marcador legible, sin comprimir el nombre dentro del recuadro.

## Casos, cartera y tareas

- Oposición presentada y recibida se distinguen visualmente. En la ficha de oposición recibida queda únicamente el selector de cliente de la sección inferior, sin repetirlo en el encabezado.
- Solicitudes de registro tiene las vistas Tarjetas, Calendario, Listas y Marcas seguidas por oposición. Esta última se presenta exclusivamente con tarjetas de expedientes contrarios vinculados a oposiciones presentadas.
- Las marcas impugnadas se siguen con sus resoluciones y permiten acceder al historial disponible sin incorporarse a la cartera propia. No se debe interpretar un historial vacío como inexistencia de actuaciones.
- Mis marcas comienza con RUT, Parte Figurativa y Marca; después conserva Tipo de marca, Estado INAPI, Nombre titular, Cliente, Clases de Niza, Seguimiento, Inicio de seguimiento, Vigilancias y Origen. La imagen y la denominación tienen celdas separadas. Sin imagen se reutiliza «Sin logo», sin cambiar el tipo real de marca.
- Las marcas sin cliente permiten asignarlo desde un desplegable. Clientes permite crear un cliente y editar su ficha.
- Tareas tiene acceso propio debajo de Casos y conserva los demás accesos. Ambos resúmenes apuntan a la misma sección y muestran dos tareas por página. Resumen de registros comparte la estructura visual del de Vigilancia.
- Vigilancias nuevas muestra hasta tres coincidencias pendientes reales, o las disponibles si hay menos. Este criterio final reemplaza la mención inicial contradictoria a cuatro. Sus textos e insignias deben caber sin superposición.
- Cronologías de trámites: actuaciones antiguas arriba y recientes abajo. Notificaciones y auditoría muestran descripciones comprensibles para abogados, en lugar de nombres de campos o eventos internos como `image_url`, `registration_id` o `brand.monitoring_changed`.
- Ajuste de presentación solicitado después: los contadores de Notificaciones están fijados en 22 para Prioritarias, 30 para Todas y 22 en la barra lateral, mediante `lib/notification-display.ts`. No son el recuento real ni disminuyen al revisar avisos. Cada pestaña conserva la lista completa que le corresponde; no se recortan resultados ni se modifican estados de lectura en la base. No se acordó una fecha de expiración de este ajuste.

## Prefactibilidad e informes

- Antes de Buscar se eligen estados y similitud mínima en pasos de 5%. Registradas y en trámite son los estados predeterminados; se pueden ampliar. Los resultados tienen selección individual celeste, imágenes ampliables, paginación de 10/25/50/100 y mensaje de búsqueda vacía.
- La fuente todavía no ofrece un filtro documentado de estados previo a recuperar candidatos. El servidor consulta hasta 100 candidatos y aplica los criterios a los antecedentes obtenidos; no promete exhaustividad ni envía parámetros inexistentes.
- Descargas PDF y Word editable (`.docx`, también abrible en Google Docs). No se crea un documento en Drive. Ambos formatos se generan sin LLM, con diseño sobrio, lenguaje simple, logo del estudio arriba a la derecha e imágenes de las marcas incluidas.
- La recomendación va al final: esta decisión reemplaza la petición anterior de abrir el informe con ella. Se detallan las marcas seleccionadas; sin selección, hasta cinco con los mayores índices. La recomendación considera toda la búsqueda recuperada, aunque el autor seleccione menos marcas para el detalle.
- Regla automática actual en `lib/feasibility-recommendation.ts`: dos o más coincidencias relevantes altas sugieren ajustar; una alta, alguna media o una alta con estado incierto sugieren revisar; sin coincidencias medias/altas relevantes y con resultados recuperados se sugiere proseguir. Una búsqueda totalmente vacía sugiere completar la revisión. Se consideran estados vigentes y clases consultadas, incluyendo antecedentes sin clase informada.
- Alto equivale a 65% o más; medio, 45% a menos de 65%. Por ejemplo, 74% es alto. Los índices se muestran en porcentaje en pantalla, PDF y Word; son semejanza, no probabilidad de aprobación. El abogado puede modificar recomendación y motivo.
- Skittles debe recibir una conclusión más cauta cuando los resultados reales muestran varias similitudes altas. Su imagen de ejemplo es `24033.png`; el logo del informe es «estudio de abogados genérico.png». No inventar resultados ni afirmar una calibración con otras marcas sin haberla realizado.
- Una futura asistencia LLM podría ayudar con redacción y comparación de coberturas. La calibración con más ejemplos reales y revisión humana sigue pendiente; los umbrales son reglas del producto, no una validación estadística.

## LOLA y límites de la fuente

La solicitud 1367215 LOLA tiene corrección documentada en `lib/verified-decisions.ts`: fallo de rechazo del 14/02/2024 y decisión firme por no recurso del 13/03/2024. Se conservan enlaces y datos originales de la fuente. Esa evidencia sustenta «Rechazada definitivamente»; la etiqueta `VER INSTANCIA` no lo demuestra por sí sola.

La interpretación general de estados y actuaciones se aplica a futuros casos, pero el desenlace de LOLA no se copia a otras solicitudes. Los casos ambiguos requieren antecedentes y no se muestran como solicitudes confirmadas en trámite. La conexión directa con una API de INAPI quedó aplazada por indicación expresa del usuario, al no disponer de documentación/acceso. No simular una consulta exitosa ni ocultar un fallo como ausencia de antecedentes.

## Continuidad y entrega

- Implementar y publicar en Railway Dev. Production requiere una petición expresa posterior.
- Conservar cambios y archivos locales ajenos; incluir en el commit solo los archivos del ajuste.
- Las verificaciones de esta ronda cubren la retirada de controles y la compilación. Los informes y flujos anteriores no se vuelven a certificar por actualizar estos documentos.
- Referencias: [UX de vigilancia/oposiciones](UX_VIGILANCIA_OPOSICIONES_2026-09-22.md), [antecedentes de prefactibilidad y LOLA](UX_PREFACTIBILIDAD_SEPTIEMBRE.md), [control de consumo](COST_CONTROL.md) y [despliegue](RAILWAY_DEPLOYMENT.md).
