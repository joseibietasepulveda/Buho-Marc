# Costos semanales y dinámica de uso · 15 de octubre de 2026

**Estimación, no factura ni medición de esta implementación.** Una semana ilustrativa con 100 marcas, 156 cruces nuevos evaluados y 10 informes costaría aproximadamente **US$0,19 de IA** bajo los supuestos siguientes. Se deben sumar fuente de datos, alojamiento/base y correo según los contratos reales. No se hicieron inferencias pagadas ni búsquedas masivas para este análisis.

## Qué se cobra y qué se reutiliza

| Operación | Consumo esperado |
| --- | --- |
| Ver listas, filtros, clases vinculadas, clientes y notificaciones | Lecturas locales; sin inferencia ni consulta nueva a INAPI |
| Pagado/Deshacer, auditoría y cuatro recordatorios | Escrituras/cálculo local; sin costo de IA |
| Buscar factibilidad | Una búsqueda de similitud y recuperación de expedientes del lote; expandir clases no multiplica búsquedas por cada clase |
| Preparar conclusión | Una generación por contexto, hasta un reintento controlado; cacheada por organización/contexto/modelo/prompt |
| Descargar PDF/Word o cambiar presentación | Reutiliza la conclusión; no vuelve a pagar IA |
| Vigilancia automática de fuente | La programación existente consulta novedades aunque no se abra la app; tiene consumo propio, independiente de la IA |
| Ordenar con IA | Máximo 50 marcas × 2 cruces = 100 nuevos por ejecución; positivos/negativos guardados se reutilizan mientras no cambie evidencia material |
| Descubrir solicitudes por representante | Una exploración diaria de metadatos paginada por organización, sin inferencia; recupera expedientes completos cuando la persona decide revisarlos |
| Correo semanal existente | Puede reutilizar decisiones; envío sujeto al plan de correo. Avisar nuevas marcas por correo sigue pendiente |

La revisión de IA en días sin nuevos antecedentes cuesta cero inferencia. Esto **no** significa cero consultas de fuente: para saber si existen novedades hay que consultar según la programación. Cada organización usa su cartera y sus decisiones; no se comparte contenido de clientes para ahorrar tokens.

## Tarifas y supuestos explícitos

Precios consultados en páginas públicas de OpenRouter el 15/10/2026, en USD por millón de tokens:

| Uso/modelo/proveedor | Entrada | Salida | Ejemplo por llamada |
| --- | ---: | ---: | --- |
| Factibilidad: GPT-4.1 mini | 0,40 | 1,60 | 20.000 entrada + 1.200 salida = US$0,00992 |
| Vigilancia: GLM 5.3 Flash, proveedor Z.ai fijado por la integración | 0,15 | 0,50 | 6.000 entrada + 600 salida para 2 cruces = US$0,00120 |

Fuentes: [GPT-4.1 mini](https://openrouter.ai/openai/gpt-4.1-mini), [GLM 5.3 Flash y proveedores](https://openrouter.ai/z-ai/glm-5.3-flash), [tarifas por endpoint](https://openrouter.ai/api/v1/models/z-ai/glm-5.3-flash/endpoints). La tarifa destacada del modelo puede pertenecer a otro proveedor: se usa Z.ai, que es el fijado en el código. No se aplican descuentos hipotéticos por caché del proveedor, impuestos, cambio a CLP ni cargos por compra de créditos.

Los tamaños de 20.000/1.200 y 6.000/600 tokens son supuestos prudentes de planificación; las coberturas, cantidad de antecedentes, razonamiento y respuestas reales cambian el costo. Un lote de un solo cruce puede costar más por cruce por compartir menos contexto. La integración registra costos cuando el proveedor los devuelve y reserva presupuesto cuando no los conoce; un costo desconocido no se cuenta como cero.

Como referencia histórica separada, un piloto anterior registró **US$0,02870619** por 141 cruces seleccionados, 131 respuestas válidas y diez pendientes. Era otra selección, de hasta cinco por marca: no demuestra el costo ni la calidad jurídica de esta versión. Véase [registro del piloto](CORREO_SEMANAL_GLM_RESEND_2026-10-13.md).

## Semana de ejemplo, día a día

Escenario ficticio pero operativo: estudio con **100 marcas monitoreadas** (80 propias y 20 de terceros), representante predominante inequívoco entre las propias, una página diaria de hasta 100 resultados por ese RUT, revisión de fuente diaria ya habilitada y revisión IA diaria activada. Diez informes en la semana. Lunes incorpora una cartera con pendientes; la IA clasifica 100 cruces y los siguientes días procesa solo los nuevos. Los nombres del ejemplo no corresponden a clientes reales.

| Día | Dinámica observable | Cruces nuevos enviados a IA | Informes | IA estimada USD |
| --- | --- | ---: | ---: | ---: |
| Lunes | Se consultan las 100 marcas y se ordenan los primeros 100 cruces de hasta 50 marcas. Preparas dos informes; uno amplía clase 7 a 8 por herramientas. | 100 | 2 | 0,07984 |
| Martes | Reaparecen cruces del lunes: se reutilizan. Se evalúan 20 nuevos. Un hallazgo por representante aparece en Notificaciones para revisarlo antes de agregarlo. | 20 | 2 | 0,03184 |
| Miércoles | Se analizan 12 cruces nuevos o con cambios materiales. Preparas tres informes; «Chocolate» para chocolates exige revisar genericidad aunque no haya coincidencias. | 12 | 3 | 0,03696 |
| Jueves | No hay cruces nuevos. Informas Pagado desde la tarjeta; se guarda auditoría y queda pendiente de INAPI. Un informe nuevo; descargarlo además en Word reutiliza la conclusión. | 0 | 1 | 0,00992 |
| Viernes | Se evalúan 18 cruces nuevos y preparas dos informes. Un registro llega a su hito de seis meses: se crea un aviso interno único. | 18 | 2 | 0,03064 |
| Sábado | El backend sigue operando sin pestañas abiertas y evalúa seis cruces nuevos. Los ya revisados conservan la decisión. | 6 | 0 | 0,00360 |
| Domingo | Sin novedades para IA: se reutiliza lo guardado. El backend comprueba fuente, descubrimiento y fechas según programación. | 0 | 0 | 0,00000 |
| **Total** | **156 cruces y 10 informes** | **156** | **10** | **0,19280** |

Cálculo: 156 × US$0,00060 + 10 × US$0,00992. Si la siguiente semana solo tiene los 56 cruces posteriores a la carga inicial y los mismos diez informes, serían **US$0,13280**. No garantiza que semanas futuras traigan esa cantidad de novedades.

El día del correo semanal se pueden recuperar recomendaciones positivas guardadas sin inferirlas otra vez. Si el correo incluye otros cruces pendientes no evaluados, esas llamadas también consumen presupuesto y deben sumarse: no son gratis por producirse dentro de un correo.

## Escalas comparables

| Volumen semanal supuesto | IA vigilancia | IA informes | Total IA |
| --- | ---: | ---: | ---: |
| Pequeño: 20 cruces, 3 informes | US$0,01200 | US$0,02976 | **US$0,04176** |
| Ejemplo primera semana: 156 cruces, 10 informes | US$0,09360 | US$0,09920 | **US$0,19280** |
| Ejemplo recurrente: 56 cruces, 10 informes | US$0,03360 | US$0,09920 | **US$0,13280** |
| Alto: 700 cruces, 50 informes | US$0,42000 | US$0,49600 | **US$0,91600** |

La última fila supone 100 cruces diarios, siete días, sin otros trabajos manuales/digest. El tope de 100 es **por ejecución**, no una cuota absoluta por semana. Varias ejecuciones comparten presupuesto mensual. Si todas las llamadas necesitaran un segundo intento de costo comparable, el componente de IA podría aproximadamente duplicarse, sujeto a los límites que detienen/posponen trabajos.

## Fuente de datos, infraestructura y total completo

No hay en el repositorio una tarifa contratada vigente de DeQuiénEs ni una factura representativa del alojamiento/base. Por eso no es posible afirmar honestamente un total facturado exacto. Fórmula para completar con esas cifras:

**Total semanal = IA + búsquedas de similitud × tarifa + páginas por representante × tarifa + expedientes/lotes × tarifa + correo + costo semanal de infraestructura/base/almacenamiento.**

Si existe un abono con consultas incluidas, usar el abono semanal más excedentes en vez de cobrar cada llamada nuevamente. Un costo fijo mensual se convierte en semanal multiplicando por 12/52, no dividiendo siempre por cuatro.

Para las 100 marcas del ejemplo, sin reintentos y sin incorporar nuevas durante la semana:

- Cartera que parte sin revisión inicial: 100 búsquedas de stock el lunes + 6 × 3 × 100 búsquedas posteriores = **1.900 búsquedas de vigilancia**.
- Cartera ya inicializada: 7 × 3 × 100 = **2.100 búsquedas de vigilancia**. Se mantienen las consultas por ingreso/publicación/cambio del motor actual.
- Diez factibilidades: **10 búsquedas adicionales**. Las vinculadas van en esa misma consulta.
- Descubrimiento: **7 páginas** si el RUT arroja hasta 100 resultados; con 550 resultados serían seis páginas por día, 42 semanales. El volumen depende del representante, no del número de marcas propias que ya tienes.
- Se deben agregar los lotes/expedientes recuperados, actualizaciones de cartera y consultas puntuales que correspondan. No se los equipara artificialmente a siete llamadas ni se presume tarifa cero.

Por ejemplo, para una semana recurrente de la tabla: **US$0,13280 + 2.110 × tarifa de búsqueda + 7 × tarifa de página + expedientes + infraestructura + correo**. Si todas las consultas están incluidas en un contrato y la infraestructura ya contratada absorbe la carga, esos US$0,13 pueden aproximar el costo marginal de IA de la semana; siguen sin representar el costo total de operar el producto.

## Controles implementados y medición pendiente

- Vigilancia: presupuesto predeterminado **US$0,10 por ejecución** y **US$10 mensuales globales** del subsistema; reservas y cargos confirmados comparten límite. Variables `WATCH_GLM_RUN_BUDGET_USD` y `WATCH_GLM_MONTHLY_BUDGET_USD` permiten configurar; no se modificaron variables remotas en esta entrega.
- Factibilidad: precios máximos de proveedor, 90 KB de contexto, 2.200 tokens de salida y dos intentos como máximo. Con el modelo/tarifas indicados, incluso un cálculo conservador de hasta un token por byte más instrucciones mantiene una generación normal acotada por debajo de US$0,10. No se garantiza el gasto de regeneraciones sucesivas o un Multinforme de muchas clases como si fueran una única generación.
- No hay inferencia al volver a abrir una pantalla, descargar un segundo formato o reevaluar el mismo cruce sin cambios materiales.
- No se añadió un nuevo cargo fijo ni se contrató infraestructura. La migración y los avisos emplean la base existente.
- Para sustituir supuestos por un total real: recopilar siete días de tokens/costos y reservas, distinguir primera carga de flujo habitual, contar peticiones por endpoint y reintentos, aplicar contrato de la fuente y factura de hosting/correo. Esta medición requiere operación autorizada; no se simuló como si ya existiera.
