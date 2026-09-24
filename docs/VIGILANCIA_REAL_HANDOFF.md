# Traspaso al desarrollo: vigilancia real y prefactibilidad

> **Estado vigente al 24/09/2026:** consultar [Decisiones UX y operación](DECISIONES_UX_2026-09-24.md) y [Control de consumo](COST_CONTROL.md). Stock de 50, estados interpretados/filtrados en la aplicación, umbrales 65%/45%, informes PDF/Word y revisiones manuales desde el chat. Los cambios se publican en Dev. El filtro previo en la API de la fuente sigue pendiente; no interpretar rechazo como firmeza sin evidencia.
>
> Los apartados siguientes conservan la conversación y el diseño previo. Las cifras, restricciones y pendientes históricos no reemplazan las decisiones del documento vigente.

Actualizado el 21 de septiembre de 2026. Leer junto con [VIGILANCIA_REAL_PLAN.md](VIGILANCIA_REAL_PLAN.md) y [RESULTADOS.md](VIGILANCIA_BENCHMARK.md).

Este resumen recoge la conversación, sus correcciones y la prueba exploratoria. Las decisiones de producto confirmadas prevalecen sobre propuestas anteriores. Las recomendaciones técnicas de este documento orientan la implementación; no convierten cada detalle en una decisión expresamente aprobada por el usuario.

## 1. Objetivo y estado del trabajo

La prioridad es reemplazar la vigilancia simulada por vigilancia real usando los endpoints de DeQuiénEs. Es una función central del producto: importa la calidad, la claridad de la revisión y conservar la evidencia y las decisiones del abogado. La búsqueda de prefactibilidad también debe usar resultados reales, pero viene después del núcleo de vigilancia.

El usuario pidió conversar, diseñar y probar antes de implementar. Se preparó un plan, se revisó el código y se ejecutaron búsquedas reales para cuatro solicitudes de Daniel. Se construyó una interfaz local sencilla para revisar sus 50 resultados por marca. En esa fase exploratoria no se integró el motor ni se modificó la cartera. Después el usuario autorizó la implementación v1.0 en Dev, descrita en el documento de entrega. No se enviaron mensajes a Víctor.

No ampliar esta entrega a otras capacidades nuevas: dominios, patentes, TPI, onboarding completo o envío automático de correos. DeQuiénEs/Víctor es parte del mismo equipo y se pueden coordinar mejoras de contrato.

## 2. Comprobación de main y dev

Al inicio se actualizaron las referencias remotas. `main` y `origin/main` coincidían en `8f1d74c`; `dev` y `origin/dev`, en `6170e3f`. Main estaba dos commits detrás de dev y no tenía commits exclusivos:

- `6f10ca7`: oposiciones recibidas vinculadas al expediente propio.
- `6170e3f`: corrección de roles de Daniel y protección de la cartera frente a expedientes de terceros.

Después de esa revisión inicial, el usuario autorizó actualizar main y desarrollar en Dev. Main avanzó a `6170e3f`; los cambios nuevos de v1.0 se publican únicamente en Dev. Las modificaciones y archivos locales ajenos se conservaron.

## 3. Qué marcas se vigilan y qué se busca

**Decisión confirmada:** las marcas propias registradas y las solicitudes propias en trámite quedan vigiladas automáticamente al incorporarlas a la cartera. Un expediente de tercero no pasa a ser marca propia por consultarlo, seguirlo o tener una oposición asociada.

**Decisión confirmada:** detectar tanto el ingreso de una solicitud similar como su posterior publicación en el Diario Oficial, diferenciando los dos hitos. Ejemplo ficticio: aparece NOVA FUDS y se avisa que ingresó; más adelante se informa que fue publicada, sobre la misma coincidencia con NOVA FOODS.

Una activación debe mostrar que la primera revisión está pendiente hasta que termine una consulta real. Para la cartera existente, preparar una ejecución inicial controlada; no disparar búsquedas masivas cada vez que alguien abra una pantalla. Luego se prevén revisiones diarias. El horario debe coordinarse con la disponibilidad diaria de la fuente.

### Corrección importante: no limitar la revisión inicial a solicitudes recientes

Primero se habló de publicaciones con oposición vigente y solicitudes recientes; se propusieron 90 días. El usuario observó que una solicitud antigua puede seguir detenida en alguna etapa. La conversación posterior descartó usar esa antigüedad como exclusión automática.

**Decisión final:** en la revisión inicial interesan solicitudes de terceros todavía en proceso, aunque lleven meses. También pueden interesar las que siguen en proceso aunque ya haya terminado su plazo de oposición; se debe informar esa condición, no confundirla con el término del expediente.

Ejemplo: una solicitud presentada hace ocho meses que continúa en trámite no debe desaparecer solo porque se aplicó un corte de presentación de 90 días.

Todavía falta acordar el catálogo exacto de estados elegibles. No asumir que toda etiqueta «rechazada» representa una decisión firme si hay recurso o instancia posterior. Los estados ambiguos, como «VER INSTANCIA», requieren antecedentes. Diferenciar siempre estado INAPI, plazo de oposición y decisión interna del usuario.

## 4. Experiencia de vigilancia acordada

El usuario mostró capturas del buscador de Víctor con la imagen de Micelio, resultados con logo, nombre, titular, clases y detalles desplegables. Quiere una presentación visual equivalente dentro del producto, usando su diseño existente.

Después de revisar una marca, mostrar un mensaje como **«Se encontraron coincidencias»** y un desplegable que permita verlas.

- Mostrar inicialmente **hasta cinco solicitudes individuales por marca propia**. El usuario aclaró expresamente «Solicitudes»: no cinco grupos.
- Cada resultado debe permitir reconocer la marca mediante logo disponible, nombre, titular, clases, estado real y fechas relevantes.
- Cada resultado tiene **«Pasar a seguimiento»**.
- Después de seleccionarlo, permanece visible con **«En seguimiento»** y acceso a su ficha existente. Repetir la acción no debe duplicar el seguimiento.
- Estado INAPI y seguimiento son cosas distintas. Ejemplo: **«En trámite · En seguimiento»**.
- Cinco es un límite de presentación inicial, no una instrucción para pedir solo cinco a la API ni para rellenar con resultados irrelevantes.
- No hay un umbral de semejanza aprobado. Revisar los ejemplos antes de inventar un mínimo o convertir puntajes en Alta/Media/Baja automáticos.
- Mostrar correctamente carga, consulta fallida, resultado vacío y revisión incompleta. Un error no se presenta como «sin coincidencias».

La agrupación por titular/marca puede ser útil en prefactibilidad, pero no sustituye las cinco solicitudes individuales de vigilancia. Tampoco establece una identidad permanente: la decisión de seguir pertenece a cada solicitud.

### Qué significa conservar la misma coincidencia

Ejemplo ficticio: NOVA FOODS detecta NOVA FUDS, solicitud 1234567. El abogado la pasa a seguimiento y escribe una nota. Cuando esa solicitud se publica, se actualiza su ficha y puede generarse el aviso de publicación; no aparece una copia vacía de la misma coincidencia ni desaparece la nota.

Técnicamente la identidad debe considerar organización, marca propia y solicitud contraria. Una solicitud contraria puede ser relevante para dos marcas propias distintas, conservando cada relación. No deduplicar globalmente entre clientes ni crear duplicados por usar una fuente o un hito diferente.

Se conserva el recorrido existente de descartar, seguir y convertir en caso. No crear un caso automáticamente por detectar semejanza. La política detallada de avisos frente a descartes anteriores debe preservar la decisión y evitar reabrirla silenciosamente.

## 5. Prefactibilidad

El usuario quiere una experiencia prácticamente igual a la mostrada en las capturas: consultar un nombre, una imagen o ambos; aportar clases y coberturas; ver resultados visuales ordenados y abrir detalles para compararlos.

En esta búsqueda sí interesa mostrar antecedentes en distintos estados. Una marca muy parecida rechazada o registrada puede ser información útil. No trasladar automáticamente el filtro de vigilancia a esta pantalla.

La referencia incluye carga de coberturas desde otra solicitud, descripción opcional de imagen, selección de número de resultados, agrupación por titular e imagen, detalle de solicitudes del grupo y comparación. La preferencia visual está confirmada; no todos esos controles avanzados fueron aprobados individualmente. En particular, no tratar la descripción del signo como un requisito cerrado después de la simplificación previa del formulario.

Las 50 solicitudes se usaron para explorar el comportamiento del motor; no quedó fijado ese número como requisito definitivo de la pantalla de prefactibilidad. Una consulta de prefactibilidad no activa vigilancia ni incorpora sus resultados a cartera.

Retirar los resultados fijos del simulador. No prometer un modo exacto completo si el contrato solo permite recuperar candidatos similares. Si cambia la consulta, invalidar resultados anteriores y evitar que una respuesta atrasada sustituya la búsqueda actual.

## 6. Qué sabemos de la API

Documentación consultada: https://dequienes.cl/inapi/docs.

### Búsqueda por semejanza

`POST /inapi/trademarks/search` permite consultar una solicitud existente con `application_id` o una propuesta con nombre y/o imagen. El identificador es el número de solicitud, no el registro.

- Coberturas por clase mediante `coverage`; solicitar `include: ["coverage"]` para comparar textos reales.
- Las clases ayudan a recuperar resultados; no son necesariamente un filtro exclusivo.
- Fechas inclusivas `filed_after`, `published_after`, `registered_after`. No confundir fecha del hito con fecha de incorporación al índice.
- `exclude_same_holder` permite excluir al mismo titular; al consultar una propuesta requiere aportar `holders`.
- `grouped` permite presentación agrupada; preservar decisiones por solicitud.
- `limit` documentado hasta 100 y `per_channel` hasta 300. No hay paginación/exhaustividad inequívoca documentada para esta búsqueda.
- Hay puntajes, canales, advertencias y tiempo informado por el motor. No hay una probabilidad jurídica documentada.
- No se documenta filtro de estados. Las búsquedas probadas no trajeron estado: se consultó después mediante batch de expedientes.
- La documentación admite imágenes JPEG, PNG y WebP con límites de 8 MiB y 20 MP. La carga de una propuesta por imagen no se probó en este experimento.

La fonética **sí está comprobada** en respuestas reales: apareció `phonetic`. También aparecieron `name`, `distinctive_tokens`, `visual_base`, `visual_residual` y `coverage`.

No apareció un canal independiente llamado semántica. Eso no demuestra que el motor no use representaciones semánticas internas; falta aclarar con Víctor qué semejanza de significado del nombre detecta, separada de la comparación de coberturas.

«Canal» es una señal de búsqueda, por ejemplo parecido visual o fonético. «Miembro» era una solicitud dentro de un grupo. Son términos técnicos que no necesitan trasladarse tal cual a la interfaz.

**Fusión 1.000** es un valor del ordenamiento combinado, no 100 % de riesgo o probabilidad de conflicto, ni prueba suficiente de que se trata de la propia solicitud. Para verificar identidad hay que comparar identificadores. No inventar porcentajes ni interpretar como probabilidades los puntajes de cada señal.

### Búsqueda por titular/representante

`POST /inapi/trademarks/by-holder` permite buscar por RUT o nombre, distinguiendo titular y representante. El servidor usa el cuerpo del RUT e ignora el DV. Si se incorpora esta entrada, recomendar RUT y validar el DV aportado, manteniendo búsqueda por nombre. No convertir una búsqueda de representante en importación indiscriminada a cartera. Esta capacidad no autoriza a ampliar todo el onboarding en esta entrega.

## 7. Prueba real de cuatro marcas

Se usaron cuatro solicitudes del listado de Daniel, todas informadas como «En Trámite» por la fuente. La Brioche y TORO tienen oposición recibida según la aclaración de la conversación. No confundir esos expedientes propios con solicitudes de terceros contra las que Daniel presentó oposición.

Petición usada una vez por marca, secuencialmente:

```json
{
  "application_id": 1638707,
  "limit": 50,
  "grouped": false,
  "exclude_same_holder": true,
  "include": ["coverage"]
}
```

Se cambió el identificador para cada marca. No hubo filtro de fecha, filtro de estado ni ajustes explícitos de `per_channel` o umbrales. Después se consultaron los estados de cada lote de 50.

| Marca | Solicitud | API de búsqueda | Consulta de estados | Total | Tiempo informado por el motor | Etiqueta literal En Trámite |
|---|---:|---:|---:|---:|---:|---:|
| La Brioche Bakery Café | 1638707 | 23,95 s | 0,75 s | 24,70 s | 23,70 s | 1/50 |
| TORO automóviles | 1617903 | 17,87 s | 0,49 s | 18,37 s | 17,64 s | 6/50 |
| Vicentica | 1686458 | 15,61 s | 0,32 s | 15,94 s | 15,39 s | 2/50 |
| Barrio Lola | 1651042 | 12,15 s | 0,37 s | 12,52 s | 11,91 s | 3/50 |

Total de las cuatro búsquedas y estados: **71,53 segundos**; promedio aproximado **17,88 segundos por marca**. Las fichas iniciales tomaron unos 0,39 segundos adicionales, fuera de la tabla.

### Cómo interpretar los tiempos

La columna de búsqueda mide el tiempo desde enviar la petición hasta recibir su cuerpo, incluida la red. No es un «criterio» de parecido. El tiempo informado por el motor es el dato que devuelve la propia API.

**El motor se ejecutó en DeQuiénEs, no en la CPU del Mac.** El Mac Apple M2 de ocho núcleos ejecutó el cliente, preparó los datos y sirvió el visor. Railway no procesó estas búsquedas; su configuración existente se utilizó solo para obtener la credencial de forma segura, sin guardarla en los resultados.

No conocemos el hardware, carga ni caché del motor. Solo hay una muestra por marca. No se midió descarga de logos/renderizado ni se comparó controladamente pedir cinco frente a cincuenta. No extrapolar como benchmark del Mac o del futuro despliegue en Railway.

### Hallazgos que afectan al diseño

Las cuatro búsquedas y los cuatro lotes de estados respondieron correctamente: 200 resultados, 50 identificadores únicos por búsqueda, sin la propia solicitud consultada y con estado resuelto para todos.

Los resultados con etiqueta literal «En Trámite» aparecieron en estas posiciones:

- La Brioche: **46**.
- TORO: **6, 8, 20, 38, 41 y 42**.
- Vicentica: **44 y 48**.
- Barrio Lola: **11, 43 y 48**.

Ejemplos: Bucare en posición 46 para La Brioche; TROCARS y TORO NEGRO AUTO CARE en 6 y 8 para TORO; Agentica y Venerdi en 44 y 48 para Vicentica; By Lola / productos caseros en 11 para Barrio Lola.

Esto no prueba relevancia jurídica. Sí prueba que **no hay que recortar primero a cinco o diez y recién después filtrar estados**. La hipótesis de que todo lo posterior al décimo será inútil no quedó demostrada. Falta la revisión humana de nombres, imágenes y coberturas para calibrar calidad.

Todas las respuestas advirtieron que la exclusión del mismo titular se aplica sobre un conjunto acotado de candidatos y sugirieron aumentar `per_channel` si quedan pocos. Obtener 50 y filtrar localmente no garantiza recuperar todas las solicitudes en proceso que podrían interesar.

## 8. Filtro local o filtro de Víctor

El usuario propuso traer 50 y filtrar en nuestra aplicación si era rápido y suficiente; si demoraba demasiado, pedir el filtro al backend. La prueba permite precisar esa idea:

- Obtener estados añadió solo 0,32–0,75 segundos por marca. El filtrado posterior es técnicamente viable para el piloto.
- La búsqueda remota tomó 12–24 segundos. Filtrar localmente no elimina esa demora.
- El problema no es solo velocidad: resultados registrados o terminados pueden ocupar los primeros 50 y dejar fuera solicitudes pendientes que estarían más abajo.

Por eso conviene pedir a Víctor seleccionar estados **antes de elegir los mejores resultados**. Ejemplo: queremos los cinco mejores resultados dentro de las solicitudes pertinentes para vigilancia, no pedir cinco generales y acabar con cero después de descartar los terminados.

No se ha probado que el cambio de filtro reduzca por sí mismo la latencia: debe medirse. Tampoco está decidido que haya que pedir siempre exactamente 50 en producción.

## 9. Qué pedir o preguntar a Víctor

Estas son propuestas de coordinación; no se enviaron automáticamente ni consta respuesta o implementación.

1. **Filtro de estados en la petición, previo a la selección final de resultados.** Permitir elegir los estados de vigilancia y mantener búsqueda amplia en prefactibilidad. El nombre final del parámetro no está acordado.
2. **Estado en cada resultado.** Idealmente código estable y descripción, más catálogo y explicación de recursos, oposición e instancias ambiguas. Evitar depender de comparar textos libres.
3. **Rendimiento.** Comparar límites 5 y 50, medir efecto del filtro, aclarar coste principal y concurrencia/cuotas toleradas. No aumentar paralelismo masivamente sin esa información.
4. **Cambios e incorporación tardía de datos.** Hora diaria de disponibilidad y forma de pedir registros nuevos/actualizados desde la última revisión. Un registro publicado ayer pero incorporado mañana no debe perderse porque la búsqueda solo mire la fecha de publicación de mañana.
5. **Cobertura de la recuperación.** Qué significa `candidate_count`, dónde se truncan resultados, interacción con `per_channel`, exclusión del mismo titular y forma de recuperar adicionales.
6. **Interpretación del ranking.** Significado de puntajes, alcance de los umbrales, semántica del nombre y recomendaciones para calibrar, sin cambiar algoritmos a ciegas.

Las cuatro primeras son la coordinación inmediata más útil. Se puede avanzar en adaptador, UX y piloto con el contrato actual, mostrando sus límites. No presentar la vigilancia como un control exhaustivo mientras esos límites no estén resueltos.

## 10. Recomendaciones de implementación y riesgos del código actual

Estos puntos provienen de la inspección técnica y complementan las decisiones de producto:

- Reutilizar trabajos, intentos, coincidencias, revisiones y casos existentes. El endpoint actual es HTTP síncrono; no implementar una cola/callback externa imaginaria por seguir documentos antiguos.
- Ejecutar trabajos persistentes en servidor, con reintentos, concurrencia limitada y recuperación tras reinicios. La vigilancia no debe depender de un navegador abierto.
- Credencial solo en servidor. Guardar evidencia, configuración, fechas y advertencias sin secretos. Separar datos por organización.
- No usar la última sincronización del expediente como prueba de que terminó una búsqueda de semejanza. Son dos operaciones distintas.
- `matches.published_at` actualmente obligatorio debe admitir ausencia: la detección también ocurre antes de publicación.
- Asegurar unicidad por organización, marca propia y solicitud contraria, independiente del hito/fuente. Reintentos y procesos concurrentes no duplican coincidencias, avisos o casos.
- Conservar decisiones manuales y notas cuando cambian puntajes o se actualiza un expediente. Conservar identidad al pasar una solicitud propia a registro.
- Consultar historial real del tercero sin importarlo a cartera. No reutilizar indiscriminadamente una búsqueda que solo mira expedientes propios.
- Sustituir logos, explicaciones, RUT, fechas e identificadores de demostración por datos reales o ausencia explícita. Retirar los respaldos ficticios del recorrido real.
- El PDF actual de vigilancia es demo: reemplazarlo por datos reales o retirar su acceso de este recorrido hasta que esté listo. El correo copiable también debe usar datos reales; envío fuera de alcance.
- Revisar compatibilidad de `registration_number` del adaptador existente con `registration_id` documentado. No introducir una regresión en consultas de expedientes.
- La prefactibilidad actual usa resultados fijos y una espera simulada: reemplazarlos y manejar búsquedas simultáneas/respuestas tardías.
- Plazos desde publicación efectiva y reglas/calendario existentes, nunca desde detección o aceptación a trámite. No inventar fechas faltantes.
- Diseñar recuperación de datos tardíos: ventanas solapadas y conciliaciones son alternativas, pero el tamaño depende de lo que Víctor confirme. Un solapamiento finito no cubre retrasos arbitrarios.

Archivos a revisar: `db/schema.ts`, `db/demo.ts`, `app/app/page.tsx`, `app/app/match-history.tsx`, `app/app/feasibility-review.tsx`, `lib/inapi-provider.ts` y `scripts/start-monitored.mjs`. Validar que sigan representando el estado actual del proyecto.

## 11. Orden de trabajo sugerido

1. Leer ambos documentos, revisar ramas y conservar cambios ajenos.
2. Confirmar contrato vigente y catálogo de estados; reutilizar la prueba guardada y completar únicamente modalidades todavía no verificadas.
3. Implementar adaptador y migraciones compatibles, con pruebas de persistencia, aislamiento y errores.
4. Completar vigilancia manual real para una marca: búsqueda, guardado, desplegable, seguimiento, ficha, historial y caso.
5. Implementar revisiones diarias, ingreso/publicación, recuperación y estado real de cada ejecución.
6. Completar entregables y retirar mocks del recorrido real.
7. Conectar prefactibilidad al mismo adaptador, con su presentación y criterios propios.
8. Validar en Dev con la cartera piloto y revisión visual; documentar límites. Este resumen no autoriza despliegue ni merge a producción.

Validación imprescindible: ejecución repetida sin duplicados; publicación sobre coincidencia existente; fallo parcial/reintento; reinicio y concurrencia; aislamiento entre organizaciones; preservación de decisiones; caso único; fechas ausentes; datos tardíos/truncamiento; imágenes inválidas; respuestas fuera de orden; terceros fuera de cartera; transición de solicitud a registro; ausencia de datos demo.

## 12. Qué sigue abierto y qué no hay que volver a preguntar

**Ya decidido:** prioridad de vigilancia, marcas propias registradas y pendientes, ingreso y publicación, no excluir por mera antigüedad, cinco solicitudes individuales, selección manual para seguimiento, conservar resultado seguido, prefactibilidad con referencia visual y estados amplios.

**Pendiente:** listado/códigos de estados y situaciones ambiguas; respuesta de Víctor sobre filtro y metadatos; umbral de calidad tras revisión humana; configuración operativa según límites reales; detalles avanzados de prefactibilidad y política fina de avisos ante descartes previos. No reabrir la propuesta de 90 días ni el debate de cinco grupos.

No inventar que las 200 coincidencias fueron validadas como útiles por el usuario. No dar por aprobados niveles automáticos ni afirmar que el motor no tiene semántica. No confundir el visor de prueba con una funcionalidad terminada.

## 13. Evidencia y visor

Directorio: `output/vigilancia-prueba-daniel/`.

- `RESULTADOS.md`: informe de resultados y límites.
- `raw-results.json`: respuestas completas y tiempos, sin credenciales.
- `baseline.json`: fichas originales de las cuatro marcas.
- `summary.json`: resumen medido.
- `run-probe.mjs`: consulta exploratoria; no repetirla sin necesidad.
- `prepare-view.mjs`: preparación del visor.
- `dist/index.html` y `dist/data.json`: visor y datos reducidos, sin RUT ni actuaciones completas.

El visor se abrió en http://127.0.0.1:8767/. Es local, depende de su servidor y no constituye una publicación. Para volver a servir los datos guardados, desde la raíz del proyecto:

```sh
python3 -m http.server 8767 --bind 127.0.0.1 --directory output/vigilancia-prueba-daniel/dist
```

No hace falta volver a llamar la API para ver la muestra existente. El visor conserva las 50 solicitudes por marca en su orden original, imágenes disponibles, estados, fechas, coberturas y detalles de señales. No tiene integración de seguimiento con el producto.
