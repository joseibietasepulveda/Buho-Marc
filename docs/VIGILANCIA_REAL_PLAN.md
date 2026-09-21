# Vigilancia real y búsqueda de prefactibilidad

> **Actualización vinculante para v1.0:** el usuario autorizó actualizar main con la base de dev e implementar únicamente en **Dev**. El stock solicita **30 similitudes**, muestra cinco y **Buscar más** agrega cinco del lote guardado en cada clic. **No se filtran estados en esta versión.** Víctor incorporará ese filtro después; tanto el filtro como el catálogo exacto de estados quedan en próximas versiones. No interpretar un rechazo como término definitivo sin revisar recursos/instancias. Ver [entrega y pendientes vigentes](V1_0_RELEASE.md).
>
> Los apartados siguientes conservan la conversación y el diseño previo. Las restricciones anteriores a solicitudes de terceros en proceso, el tamaño exploratorio de 50 y el estado «implementación no iniciada» son antecedentes; quedan reemplazados por la decisión y el estado de entrega de v1.0.

Fecha: 21 de septiembre de 2026. Estado: plan actualizado con las decisiones de la conversación y la prueba de cuatro marcas. La integración en el producto no está implementada; existe únicamente un visor exploratorio local. Las decisiones de producto confirmadas se distinguen de las recomendaciones técnicas.

Leer junto con [el resumen de traspaso](VIGILANCIA_REAL_HANDOFF.md) y [los resultados medidos](../output/vigilancia-prueba-daniel/RESULTADOS.md). Este documento sustituye la versión inicial del plan, especialmente su ventana propuesta de 90 días y la presentación de vigilancia por grupos.

## Base comprobada

Se actualizaron las referencias remotas antes de revisar el producto. `main` y `origin/main` coinciden; `dev` y `origin/dev` coinciden. `origin/main` está dos commits detrás de `origin/dev`, sin commits exclusivos de main:

- `6f10ca7`: oposiciones recibidas vinculadas al expediente propio.
- `6170e3f`: corrección de roles de Daniel y protección de la cartera frente a expedientes de terceros.

No se fusionaron ramas ni se publicó nada. Hay cambios locales anteriores a esta planificación que deben conservarse. El usuario pidió comprobar el estado de las ramas, no promoverlas automáticamente.

Fuentes consultadas: conversaciones «Identificar mejoras de la plataforma», «Actualizar UX del revisor» y «Comparar funciones con Buho Marc»; código vigente de cartera, vigilancia, casos, fuente y prefactibilidad; documentación publicada en https://dequienes.cl/inapi/docs, leída en navegador el 21/09/2026. Después se ejecutaron cuatro búsquedas autenticadas de 50 resultados y cuatro consultas batch de estados, descritas en el informe de resultados. No se probó cada modalidad del contrato. El estado de las ramas corresponde a la revisión inicial y debe comprobarse nuevamente antes de desarrollar.

## Alcance

Prioridad: detectar coincidencias reales de las marcas de una organización, revisarlas y convertirlas en casos sin perder evidencia ni decisiones. Después, reutilizar la integración para consultas puntuales de prefactibilidad.

La búsqueda por titular/representante queda como posible entrada para elegir marcas que vigilar; no se propone ampliar el onboarding completo en esta entrega. No se incluyen dominios, patentes, TPI ni envío automático de correo.

DeQuiénEs es parte del mismo equipo. Las dudas de contrato se deben resolver con Víctor, sin suponer que una capacidad no documentada existe o es imposible de incorporar.

## Acuerdos anteriores que se conservan

- Escritorio como superficie principal, con lectura densa y clara.
- Distinguir marca propia y marca del tercero.
- Ficha: cliente en una línea con enlace; «Por qué se detectó» antes de ambas marcas; historial de la marca del tercero debajo, con detalles desplegables.
- Acciones de revisión existentes: descartar, mantener en seguimiento y convertir en caso.
- Separar nivel de similitud, prioridad de tareas y urgencia de los plazos.
- Conservar las valoraciones manuales Alta/Media/Baja existentes; cualquier clasificación automática necesita calibración. No mostrar porcentajes que parezcan una probabilidad jurídica.
- Para prefactibilidad prevalece la referencia posterior de las capturas de Víctor: formulario de nombre y/o imagen, clases/coberturas y resultados visuales comparables. Mantener claridad y evitar paneles redundantes. No se aprobaron individualmente todos los controles avanzados de las capturas; la descripción opcional del signo sigue siendo una propuesta, no una exigencia confirmada.
- PDF de uso interno; correo comparativo copiable para el cliente. El envío sigue fuera del alcance.
- No incorporar expedientes contrarios a la cartera propia ni deducir roles jurídicos por la presencia de una oposición.

## Contrato que ya habilita la integración

### Búsqueda por semejanza

`POST /inapi/trademarks/search` admite dos entradas excluyentes: `application_id`, o datos de una propuesta. El identificador es número de solicitud, no de registro.

- Propuesta: nombre y/o imagen; coberturas por clase en `coverage`.
- Imagen mediante multipart: JPEG, PNG o WebP, hasta 8 MiB y 20 MP según la documentación.
- Cortes inclusivos: `filed_after`, `published_after`, `registered_after`. Se aplican antes de combinar los canales de recuperación.
- `grouped: true` agrega grupos que referencian los resultados mediante `member_ids`.
- `exclude_same_holder: true` permite excluir al mismo titular. En propuestas necesita titulares aportados mediante `holders`.
- Las clases ayudan a recuperar resultados; no constituyen un filtro exclusivo.
- Pedir `include: ["coverage"]` para disponer del texto de cobertura en la comparación.
- Hay puntaje, canales, advertencias y metadatos de ejecución. No hay una probabilidad jurídica documentada ni una explicación narrativa garantizada.
- `limit` llega a 100 y `per_channel` a 300. No se documentan cursor, offset, límite superior de fecha ni indicador inequívoco de agotamiento para este endpoint.
- El historial debe obtenerse de los endpoints de expedientes ya existentes.
- No se documenta filtro por estado y las respuestas de búsqueda probadas no incluyen el estado: se obtuvo mediante batch de expedientes. Pedir a Víctor filtro previo a seleccionar los mejores resultados y estado en cada resultado.
- Canales confirmados en la prueba: `phonetic`, `name`, `distinctive_tokens`, `visual_base`, `visual_residual` y `coverage`. No apareció un canal independiente de semántica; esto no permite descartar procesamiento semántico interno.

### Búsqueda por titular o representante

`POST /inapi/trademarks/by-holder`: rol explícito `holder` o `representative` en la interfaz; la API permite también `any`. Búsqueda por RUT exacto o nombre aproximado, con `limit`, `offset` y `total_count`. Obtener luego fichas completas por batch.

Si esta entrada se incluye: RUT recomendado, normalización de puntos/guion y DV validado cuando se proporciona; permitir búsqueda por nombre. Distinguir un cuerpo sin DV de un RUT completo validado. Mostrar resultados para selección explícita y señalar los ya incorporados; nunca importar automáticamente todo lo asociado a un representante.

## Diseño propuesto del flujo de vigilancia

1. Vigilar automáticamente marcas propias registradas y solicitudes propias en trámite al incorporarlas a cartera. Permitir pausar según el diseño existente. Mostrar qué marca y solicitud se vigilan; la activación no acredita que ya se haya completado una revisión.
2. Revisión inicial de solicitudes de terceros todavía en proceso, aunque su presentación sea antigua. No usar la ventana propuesta de 90 días. Incluir las que continúen en trámite aunque su plazo de oposición haya terminado, mostrando esa circunstancia. Después, revisiones diarias en segundo plano; coordinar horario con la disponibilidad de DeQuiénEs.
3. Detectar ingreso y publicación. Como propuesta técnica, consultar por cada hito y unir por solicitud; no enviar ambos cortes en una misma petición suponiendo una unión no documentada. Resolver también datos incorporados tarde y cambios de estado.
4. Mantener una coincidencia por organización, marca propia y solicitud de tercero. Ejemplo ficticio: NOVA FOODS detecta la solicitud NOVA FUDS en enero; al publicarse en febrero se actualiza la misma ficha y se avisa del nuevo hito, conservando notas, revisión y caso. No crear una segunda coincidencia por la publicación.
5. Separar estado INAPI de decisión interna: «En trámite · En seguimiento». Los filtros de bandeja por marca/cliente, revisión, publicación y fecha son propuestas de implementación; la antigüedad no sustituye el estado. La selección exacta de estados requiere catálogo y tratamiento de recursos/instancias.
6. En cada marca propia, mostrar «Se encontraron coincidencias» con desplegable de hasta cinco solicitudes individuales, no cinco grupos. Cada una muestra imagen disponible, nombre, titular, clases, estado y fechas relevantes, con «Pasar a seguimiento». Tras seleccionarla permanece visible como «En seguimiento» y permite abrir la ficha existente. Cinco es el límite inicial de presentación, no el límite de recuperación ni una obligación de rellenar con semejanzas irrelevantes. No recortar antes de aplicar los criterios pertinentes. Agrupación opcional en prefactibilidad; no reemplaza esta decisión de vigilancia.
7. Mantener la ficha y las acciones conocidas, con logos reales y explicación basada únicamente en canales efectivamente informados. La ausencia de imagen o historial se muestra como ausencia o consulta pendiente.
8. Convertir en caso conserva una fotografía de lo revisado y el vínculo con la coincidencia. Las ejecuciones posteriores no duplican casos ni reabren decisiones cerradas.

En la cabecera: última revisión completa de similitudes, próxima revisión y marcas pendientes. Estados claros: preparando primera revisión, revisando, al día respecto de la búsqueda configurada, revisión incompleta, error y pausada. «Sin coincidencias» solo corresponde a una consulta válida, sin convertirla en garantía de exhaustividad del universo INAPI.

La actualización de expedientes y la búsqueda de similitudes tendrán indicadores independientes. Una no acredita la ejecución de la otra.

## Integración y persistencia

- Cliente del motor exclusivamente en servidor con la credencial actual; validación de petición y respuesta, límites, tiempos de espera y tratamiento explícito de 404, 413, 415, 422, 429, 500 y 503.
- Reutilizar la base de `monitoring_jobs`, intentos, coincidencias, revisiones y auditoría. Adaptar el contrato histórico de cola/callback al endpoint HTTP disponible; no construir callbacks sin necesidad.
- Trabajos persistentes y reanudables, con concurrencia limitada, bloqueo por objetivo, reintentos y recuperación después de reiniciar el servicio. El procesamiento no depende de que haya un navegador abierto ni de una única petición larga que recorra toda la cartera.
- Guardar solicitud consultada, configuración y versión, ventana, respuesta original sin secretos, advertencias, canales, fechas de ejecución y metadatos del motor que realmente existan.
- Avance de revisión por objetivo e hito solo después de guardar el resultado válido. Una falla parcial conserva los éxitos de otras marcas, pero no presenta toda la cartera como revisada.
- Volver a revisar una ventana solapada y hacer conciliaciones más amplias para datos incorporados tarde. El tamaño del solapamiento depende del retraso de ingestión confirmado por Víctor; ningún solapamiento finito garantiza recuperar retrasos arbitrarios.
- Unicidad persistente por organización, objetivo propio y solicitud contraria, independiente del hito de detección o del grupo de presentación.
- Separar puntaje bruto/canales del motor, nivel calculado y eventual nivel manual. Actualizar el motor no sobrescribe la decisión del abogado.
- Guardar avisos con identidad del evento para que reintentos no dupliquen notificaciones. Publicación posterior y nueva detección son hitos diferentes.
- Representar correctamente una marca propia que pase de solicitud a registro, conservando identidad de vigilancia, coincidencias y casos.
- Pausar detiene nuevas ejecuciones; reanudar recupera el período pendiente. Archivar no elimina historia ni casos.
- Aplicar aislamiento por organización tanto en trabajos como en fichas, imágenes y resultados.

## Cambios concretos que requiere la base actual

- `matches.published_at` es obligatorio: debe admitir ausencia para detectar antes de la publicación. Separar fecha de detección, solicitud, publicación y registro.
- El estado de marca hoy puede indicar «En monitoreo» aunque solo haya un trabajo `awaiting_engine`: deberá derivarse de la activación y de ejecuciones reales.
- `db/demo.ts` construye RUT y otros datos de respaldo para coincidencias: retirar esos respaldos del recorrido real. No convertir identificadores de fuente en registros oficiales ficticios.
- `MatchHistory` hoy busca el expediente entre solicitudes de cartera o muestra un hito demo: deberá consultar/persistir la ficha del tercero sin incorporarlo como cliente.
- La comparación usa logos y explicación de demostración: sustituirlos por evidencia real o ausencia explícita.
- El PDF actual es estático de demostración: antes de dar por terminado el recorrido real, reemplazarlo por un informe de la coincidencia real o retirar su acceso de ese recorrido. Nunca entregar un informe demo desde una vigilancia real.
- Verificar que el correo copiable use titulares, clases, imágenes y abogado autenticado reales.
- El adaptador existente exige `registration_number`; la documentación actual muestra `registration_id`. Validar con una respuesta real y cubrir compatibilidad para que consultar el historial no rompa la integración anterior.

## Prefactibilidad, después del núcleo

Reutilizar cliente, normalización, comparación y agrupación. Formulario de nombre y/o imagen; clases opcionales y cobertura específica por clase cuando el usuario quiera precisarla. No rellenar cobertura con la definición genérica de toda la clase.

Cambiar «Buscar (ejemplo)» por «Buscar». Quitar resultados y porcentajes fijos. Conservar invalidación cuando cambia la consulta y descartar respuestas viejas que lleguen después de una búsqueda más reciente.

Mantener búsqueda aproximada como flujo principal. El modo exacto actual no tiene contrato equivalente documentado: no simularlo filtrando solo los primeros resultados y prometiendo exhaustividad. Ocultarlo hasta contar con una implementación definida.

Mostrar únicamente tipos de semejanza respaldados por los canales recibidos. La fonética está confirmada por el canal `phonetic` en respuestas reales; la semántica independiente no está confirmada. La calibración define Alta/Media/Baja antes de presentarlos como niveles automáticos. Un puntaje de ranking no equivale a probabilidad de registro, rechazo u oposición; `1.0` tampoco demuestra por sí solo que sea la misma solicitud.

No aplicar por defecto la restricción de vigilancia a solicitudes en proceso: una marca registrada o rechazada puede servir como antecedente. Mostrar su estado y permitir compararla. Las 50 respuestas por marca fueron el tamaño de la prueba, no una decisión definitiva sobre el número de resultados de prefactibilidad. Las consultas propuestas con imagen y multipart requieren validación adicional: las cuatro pruebas se hicieron con solicitudes existentes.

Las consultas de prefactibilidad no activan vigilancia ni incorporan resultados a la cartera. Historial de estudios y almacenamiento duradero de imágenes no se agregan silenciosamente a esta entrega; definirlos solo si son necesarios para el alcance aprobado.

## Condiciones que hay que confirmar con Víctor

1. Prioridad: permitir estados deseados en la búsqueda, aplicados antes de seleccionar los mejores resultados. Filtrar los primeros 50 después puede dejar fuera solicitudes relevantes. Incluir código y descripción del estado en cada resultado y entregar catálogo, incluyendo recursos, oposición e instancias ambiguas.
2. Rendimiento: medir si pedir 5 frente a 50 cambia el tiempo y cuánto influye filtrar estados antes. La prueba actual tardó 12–24 segundos por búsqueda; no hay comparación controlada entre límites. Confirmar concurrencia/cuotas y 429/503.
3. Incrementalidad: hora de disponibilidad diaria, retrasos de carga, correcciones retroactivas y posibilidad de cursor de actualización/ingestión. Cortar por fecha de publicación no equivale a cortar por fecha de incorporación al índice.
4. Exhaustividad operativa: significado de `candidate_count`, truncamiento, recuperación adicional, interacción entre exclusión de titular y `per_channel`. Menos de 100 resultados no prueba que no hubo truncamiento previo. Todas las búsquedas de prueba advirtieron que la exclusión se hace sobre un conjunto acotado.
5. Ranking: significado, escala y estabilidad de `score` y canales; alcance de `minimum_cosine`; posible semejanza semántica del nombre; calibración con casos revisados. La existencia del canal fonético ya está comprobada.
6. Agrupación y exclusión: criterio con cotitulares, titulares sin RUT y nombres ambiguos; persistencia de miembros y límite por grupos. Los grupos son presentación, no identidad estable de negocio. Confirmar también imágenes e identificadores compatibles.

Estas son solicitudes propuestas; no se enviaron automáticamente a Víctor ni consta que estén implementadas.

Estas cuestiones no impiden preparar la integración ni un piloto. La recuperación completa de resultados y datos tardíos sí debe quedar resuelta antes de presentar la vigilancia como un control exhaustivo.

## Secuencia de implementación y validación

1. Leer el resumen de traspaso y este plan actualizado. Revalidar ramas y cambios locales; no fusionar main automáticamente. Conservar las decisiones confirmadas y definir el catálogo de estados con Víctor.
2. Reutilizar la prueba ya hecha de cuatro solicitudes reales y sus 200 resultados. Completar pruebas específicas que falten, en particular propuesta por nombre/imagen, cobertura, errores y cualquier nuevo filtro. No repetir consultas costosas sin necesidad.
3. Adaptador y migraciones compatibles; conservar datos, decisiones y casos existentes. Identificar mocks sin borrarlos ni hacerlos pasar por resultados reales.
4. Ejecución manual de vigilancia por marca, persistencia y recorrido de revisión completo.
5. Automatización diaria, recuperación, avisos y estado de cobertura por marca.
6. Desplegable de cinco solicitudes, seguimiento, filtros, ficha, historial y entregables reales.
7. Prefactibilidad sobre el mismo contrato.
8. Validación con cartera piloto en Dev y revisión visual de escritorio; documentar límites y resultados. Producción requiere instrucción posterior.

Pruebas de aceptación imprescindibles: repetición sin duplicados; publicación posterior sobre la misma coincidencia; fallo parcial y reintento; recuperación tras caída; dos procesos concurrentes; dos organizaciones; cambios manuales preservados; caso creado una sola vez; fechas nulas; miembro nuevo de un grupo revisado; resultados truncados; advertencias de un canal no disponible; imagen inválida; consulta modificada durante una búsqueda; importación contraria que no contamina cartera; transición de solicitud propia a registro; ningún dato demo en los recorridos reales.

La verificación de plazos reutiliza las reglas y evidencia existentes; valida fuente efectiva, calendario y fechas límite. No crear vencimientos a partir de la fecha de detección o de aceptación a trámite.

## Decisiones confirmadas por el usuario

Respuestas recibidas el 21/09/2026 durante la planificación:

- Detectar desde el ingreso y volver a avisar al publicarse en Diario Oficial, diferenciando ambos hitos.
- Vigilar automáticamente marcas propias registradas y solicitudes propias en trámite al incorporarlas a la cartera.
- Revisión inicial de solicitudes de terceros todavía en proceso, sin descartarlas solo por antigüedad; después, búsqueda diaria de novedades. Mostrar por separado si el plazo de oposición sigue vigente.
- Desplegable de hasta cinco solicitudes individuales por marca vigilada, con estado y acción de seguimiento; conservar visibles las ya seguidas y abrir su ficha.
- Prefactibilidad visual semejante a las capturas de Víctor, con antecedentes de distintos estados.
- Probar antes de integrar: prueba y visor local ya realizados, sin cambios a la cartera ni integración productiva.

La propuesta inicial de limitar ingresos a 90 días quedó descartada en esta conversación. No debe aparecer como decisión pendiente ni implementarse por defecto. El listado exacto de estados elegibles y los umbrales de semejanza siguen sin estar cerrados; no inventarlos a partir de esta prueba.

La activación inicial sobre una cartera existente requiere una ejecución explícita de migración/controlada, no una búsqueda masiva disparada por abrir la pantalla. El alcance ya aprobado incluye ambos tipos de objetivos propios, conservando exclusión de expedientes de terceros.
