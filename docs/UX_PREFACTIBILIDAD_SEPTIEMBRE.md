# Ajustes del 22 de septiembre de 2026

## Resúmenes y cronologías

Los dos resúmenes comparten el encabezado de tareas (dos por página), con tareas de casos y solicitudes y acceso a la misma sección Tareas. Registros reutiliza la jerarquía de indicadores, agenda y actividad de Vigilancia. Los detalles legales adicionales se conservan, sin desplazar la agenda.

La ficha de marca muestra actuaciones de antiguo a reciente, consistente con Solicitudes, oposiciones, notificaciones e historial de coincidencias. Abrir este último reutiliza la evidencia guardada: no hace una nueva consulta al proveedor. Se indica la fecha de consulta y se conservan las observaciones.

## Vigilancia

Filtros de fecha de publicación inclusivos, desde/hasta. Una fecha activa automáticamente «Publicada en Diario Oficial». Elegir INAPI sin publicación o Todas elimina las fechas para evitar contradicciones. La ausencia de fecha significa que el proveedor no la informa, no prueba que no se haya publicado.

`WATCH_VISIBILITY` en `lib/watch-policy.ts` contiene los flags `showRegistered`, `showLapsed` y `showExpired`, inicialmente falsos. Activar uno permite cambiar esa regla sin borrar ni reconstruir antecedentes. Son flags de código, compartidos con los conteos SQL, no preferencias del abogado. Denegada, Rechazada, Rechazada definitivamente, Desistida y Abandonada siguen excluidas. Los recursos no se excluyen por contener la palabra denegación.

## LOLA y datos incompletos

`lib/verified-decisions.ts` contiene una corrección únicamente para solicitud 1367215. Estado Diario INAPI del 14/02/2024, página 66: fallo de rechazo. Estado Diario del 13/03/2024, página 55: decisión firme por no recurso. Se conserva el estado del proveedor y se agregan los antecedentes oficiales con sus enlaces. Aplica a nuevas consultas y a evidencia ya guardada, sin sobrescribir la fuente original. Cualquier cambio posterior exige evidencia oficial nueva y revisión del registro de correcciones.

VER INSTANCIA, estados desconocidos y no disponibles se muestran por verificar; no se convierten automáticamente en En trámite ni se calcula un plazo de oposición sobre ellos. No se generaliza el resultado de LOLA a otros expedientes. La consulta directa a INAPI queda fuera de esta entrega por indicación del usuario, al no contar con un acceso documentado. No hay un botón que simule una verificación ni reintentos contra una API inexistente.

## Informe descargable

El PDF se genera localmente en el navegador, al pulsar Descargar informe PDF. La librería se carga únicamente al descargar; no hay LLM, llamada extra al proveedor ni nuevo envío de la imagen. Personalización opcional de cliente y autor. Imagen original convertida a PNG para incluir también JPEG/WebP, sin modificar la propuesta de búsqueda.

Incluye alcance, fecha/hora de consulta, clases y coberturas propuestas, filtro aplicado, cinco primeros antecedentes detallados, listado de todos los antecedentes del filtro (hasta 50), advertencias y próximos pasos. Adjunta la respuesta original en JSON para trazabilidad. Se explicita que el filtro opera sobre la selección recuperada, no sobre toda la base de INAPI. No hay probabilidades jurídicas, semáforo automático ni dictamen de registrabilidad.

El ejemplo Skittles Sour usa la imagen 24033.png del usuario (su contenido es WebP a pesar del nombre), nombre y clase 30 / caramelos como propuesta ilustrativa. Se consultaron 50 resultados reales; el archivo y su respuesta original quedan en output/pdf, no en el repositorio ni públicamente publicados.

Un LLM podría ayudar en una versión posterior a redactar y resumir comparaciones de cobertura. No resolvería por sí solo los datos ausentes ni sustituiría las fuentes oficiales o la revisión del abogado.
