# Correo semanal de vigilancia · GLM directo y Resend

**Actualización publicada en Dev · 15/10/2026 (PR #92, Railway SUCCESS):** consultar el [contrato vigente de esta entrega](FACTIBILIDAD_CARTERA_VIGILANCIA_2026-10-15.md) y su [análisis de costos](COSTOS_SEMANALES_2026-10-15.md). Sustituye donde corresponda clase obligatoria, etiquetas antiguas del informe, categorías alta/media, cinco cruces por marca/150 totales, pausa individual y aviso único de renovación; agrega pago manual auditado y descubrimiento por representante. El texto histórico siguiente conserva evidencia de entregas anteriores; el contrato enlazado y su traspaso registran el comportamiento vigente y los límites de esta publicación.

Actualizado el 14 de octubre de 2026. Configuración y piloto autorizados por el usuario: cinco nuevos por marca, corte DeQuiénEs ≥25% y máximo US$0,10. Implementación y verificación local completas; publicado solo en Dev por [PR #80](https://github.com/joseibietasepulveda/Buho-Marc/pull/80), SHA `4a11daf4dd54feddb1aa68992a3e828575f0086c`, despliegue `8396add3-1044-4886-9c7b-4c801411b7e7` en `SUCCESS`, migración aplicada y salud 200/base conectada. El piloto sí usó OpenRouter; todavía no se envió ningún correo real. Resend y el envío automático permanecen desactivados hasta configurar la cuenta.

## Comportamiento

- El proceso semanal comienza los lunes a las 08:30 `America/Santiago`; respeta horario de verano/invierno. El correo sale cuando termina la evaluación. Al reactivar un servidor se recupera una única ejecución de la última semana pendiente, sin repetir semanas guardadas.
- Trabaja con coincidencias persistidas por vigilancia. No llama `queueWatch`, al buscador DeQuiénEs ni a fichas INAPI para generar nuevas coincidencias. Las programaciones de consulta existentes no cambian.
- Solicitud del usuario: máximo **cinco cruces nuevos por marca**. Un cruce es referencia contra una candidata. Primer uso incluye stock guardado aún sin decisión; no representa que todo se haya descubierto esa semana.
- Configuración aprobada: solo similitud DeQuiénEs **≥25%**, aplicada antes de GLM y antes del máximo cinco. Conservar el valor original `evidence.hit.score`, escala 0–1; respaldo `total_score/100` si falta. No es probabilidad jurídica. Los cruces por debajo siguen en la base, sin cargo LLM; podrían volverse elegibles si cambia su puntuación.
- Excluye la misma solicitud, estados registrados/concedidos/terminales, descartados, en seguimiento/convertidos y ventanas de oposición terminadas. Usa estados y fechas reales; no sustituye marcas registradas por En trámite.
- El botón en Administración selecciona estudio y prepara como máximo **150 cruces nuevos en total**, además del máximo cinco por marca. Distribuye la selección entre marcas antes de agrupar llamadas. Cada llamada comparte una referencia y hasta cinco candidatas; devuelve cinco booleanos y motivos independientes. No usa Luna.
- Guarda decisiones positivas y negativas por organización/cruce. Cambiar el prompt no vuelve a evaluar los casos existentes. Los cruces sin decisión válida tras un fallo siguen pendientes para otra ejecución.
- Guarda el resumen y el correo antes de enviarlo. Envía únicamente de `Buho Marc <hola@rcirculo.com>` a `hola@rcirculo.com`; respuesta a esa dirección. No usa correos reales de clientes todavía.
- El correo se envía aun sin alertas. Tabla comparativa de hasta ocho cruces y hasta ocho tareas/plazos de hoy hasta hoy+13 inclusive: 14 días calendario. Conserva el cálculo y procedencia de la agenda vigente; excluye hitos informativos y controles institucionales que no son obligación del abogado. Los enlaces muestran todo el resumen autenticado.
- El proceso selecciona el correo y la página de resumen; conserva los estados de seguimiento de Vigilancia. No convierte automáticamente coincidencias en casos.

## Corte analizado sin inferencias nuevas

Se leyeron 19.630 filas de `review-similarities/classifications.json` y cinco revisiones de `user-decisions.json`. SHA256 del archivo de clasificaciones: `fb830e29049d14050e9c826fc1cdef61f7497a05da1f45b7dab08f4aa9f9016e`. Se usó `initialDecision` más correcciones guardadas; no se modificaron las etiquetas. Son referencias del experimento, no decisiones jurídicas validadas por abogados.

| Corte DeQuiénEs | Pasan a GLM antes del máximo cinco | Excluidos | Positivos excluidos | Recuperación del prefiltro |
| --- | ---: | ---: | ---: | ---: |
| ≥20% | 19.603 | 27 | 0 | 100% |
| ≥25% | 19.598 | 32 | 0 | 100% |
| ≥30% | 19.586 | 44 | 1 | 99,99% |
| ≥35% | 18.856 | 774 | 325 | 96,83% |
| ≥40% | 17.274 | 2.356 | 741 | 92,76% |
| ≥50% | 12.474 | 7.156 | 2.307 | 77,46% |

Había 10.237 positivos y 9.393 negativos. AROBA & CO / AROBAS aparece como positivo con 28,92%; un corte de 30% lo perdería. En el conjunto aleatorio independiente previo de 60 marcas/600 cruces, 25% conserva sus 172 positivos. Sus primeros cinco tienen 119 positivos de 300 cruces y el menor positivo es 34,58%. No presentar el 100% del prefiltro como efectividad de GLM ni del sistema completo. El máximo cinco deja para futuras ejecuciones otros candidatos elegibles; limitar la cola puede retrasar avisos. Si el objetivo requiere más descarte sin pérdida, hace falta mejorar el orden/puntuación de DeQuiénEs o calibrar otro filtro con revisión experta.

El corte de 25% filtra solo 0,16% de esta base; no promete gran ahorro. El ahorro principal viene de cinco por marca y de no repetir inferencias. No se eligió un umbral alto para fabricar una reducción de costo perdiendo positivos conocidos.

## Texto y respuestas de GLM

`lib/watch-digest-glm.ts`, prompt versión 1, envía nombres/tipos, imágenes disponibles, clases con coberturas literales completas y estado real. No envía porcentaje del algoritmo, etiquetas históricas ni instrucciones contenidas en marcas/coberturas. Separa semejanza distintiva visual/fonética/conceptual del vínculo entre productos/servicios: naturaleza, finalidad, consumidores, canales, competencia y complementariedad. Misma clase no basta; clases distintas pueden relacionarse. No atribuye una clase completa a una cobertura restringida ni inventa notoriedad.

Es una pauta operacional adaptada por el agente, no una transcripción de todas las directrices. Fuentes: [INAPI, Directrices de Marcas 2026](https://www.inapi.cl/centro-de-documentacion/directrices/marcas), [principio de especialidad](https://www.inapi.cl/portal/institucional/600/w3-article-629.html). Requiere validación jurídica y evaluación de precisión con el prompt actual; los resultados del experimento anterior no certifican esta nueva versión.

Contrato: `{decisions:[{id,show,insufficient,sign_similarity,coverage_relation,reason}]}`. Rechaza IDs faltantes/duplicados y contradicciones estructurales, incluida incertidumbre sin `insufficient=true`; máximo un segundo intento, 60 segundos totales. Conserva cargos de respuestas inválidas. No infiere que una respuesta inválida signifique cero alertas. Una caída del proveedor detiene la ejecución, sin consumir a ciegas la cola ni enviar un correo vacío; quedan guardadas las decisiones previas. Un fallo DNS anterior a HTTP tiene costo cero. Otros cargos desconocidos mantienen su reserva hasta conciliar con el proveedor.

## Piloto aprobado y costos

La corrida anterior de GLM 5.3 Flash directo sobre 200 cruces costó US$0,03385781: media US$0,00016928905 por cruce. Se reutiliza únicamente como referencia de costo, no como inferencia nueva ni garantía de tarifa o tamaño del prompt.

- Piloto aprobado: selección congelada de 30 marcas del stock real de Dev, hasta cinco elegibles por marca. Resultaron **141 cruces**, porque algunas marcas tenían menos de cinco. Se procesaron sus 30 grupos: **131 decisiones válidas, 16 para revisar y 115 descartes; 10 cruces quedaron sin decisión válida** en dos grupos con respuestas incoherentes sobre incertidumbre. No cuentan como negativos. Costo total reportado y conciliado con el consumo de la clave: **US$0,02870619**, por debajo de US$0,10. No se envió ningún correo. Los resultados válidos se importaron en Dev como piloto preparado para conservarlos sin otra inferencia; las diez pendientes podrán evaluarse en una ejecución posterior.
- 200 marcas × máximo cinco nuevos: hasta 1.000 cruces semanales. Extrapolando el costo total de este piloto sobre los 141 seleccionados: **US$0,204 por semana y US$0,814 con cuatro lunes**; un margen del doble da aproximadamente **US$1,63 mensual**. Son costos del modelo, sin Resend ni alojamiento. Puede variar con coberturas, imágenes, reintentos y proveedor; normalmente habrá menos de cinco nuevos por marca. Esta extrapolación incluye intentos fallidos, pero no promete completar siempre todos los cruces al primer intento. El botón distribuye hasta 150 cruces entre las marcas; puede agrupar menos candidatas por llamada que este piloto de 30 marcas, aumentando el costo por cruce.
- El código tiene reservas transaccionales antes de llamar, presupuestos configurables por corrida/global mensual y contabiliza cargos sin confirmar con reserva conservadora. Presupuestos de ejemplo US$1 por corrida/US$10 mensual, no autorización para ejecutar pruebas. Para el piloto aprobado configurar US$0,10 antes de comenzar.

Usa `z-ai/glm-5.3-flash`, proveedor Z.ai sin fallback, topes US$0,15/US$0,50 por millón de entrada/salida. Lee `OPENROUTER_WATCH_API_KEY`, sin fallback implícito. Desde el 15/10/2026 Dev referencia expresamente `OPENROUTER_API_KEY` por petición del usuario; ambas funciones comparten el límite de esa clave. Se puede asignar otra credencial para separar el gasto. [Decisión y configuración vigente](handoffs/2026-10-15-openrouter-compartido-dev.md).

## Resend: pasos del usuario

1. Crear cuenta en [Resend](https://resend.com/signup), usando `hola@rcirculo.com` si se desea.
2. Ir a Domains → Add Domain, añadir `rcirculo.com` para enviar desde `hola@rcirculo.com`. Elegir una región ofrecida y activar envío. La recepción sigue en Google Workspace.
3. En el administrador DNS donde está el dominio, copiar exactamente los registros de envío que muestre Resend: DKIM y SPF/MX del Return-Path. Por defecto, ese Return-Path usa `send.rcirculo.com`. **Conservar MX/TXT de Google y registros de la web**; no reemplazar MX de `rcirculo.com` ni activar recepción Resend. No crear un segundo SPF para el mismo nombre. Usar valores reales del panel, no ejemplos inventados. [Guía de dominio](https://resend.com/docs/add-a-domain), [Return-Path](https://resend.com/changelog/custom-return-path).
4. Esperar estado Verified. Conservar DMARC existente y comprobar compatibilidad antes de endurecerlo.
5. Crear API Key con Sending access limitada a `rcirculo.com`. Guardar `RESEND_API_KEY` solo en servidor.
6. En Railway **Dev**, servicio `buho-marc-web`, añadir `RESEND_API_KEY`, `OPENROUTER_WATCH_API_KEY` (propia o referencia autorizada), `APP_PUBLIC_ORIGIN=https://buho-marc-web-dev.up.railway.app`, `RESEND_DELIVERY_ENABLED=true`. Mantener `WATCH_DIGEST_ENABLED=false` durante el primer piloto. Durante pruebas, fijar `WATCH_GLM_RUN_BUDGET_USD=0.10` y `WATCH_GLM_MONTHLY_BUDGET_USD=0.10`; el historial importado ya contabiliza US$0,02870619 y deja US$0,07129381 dentro del total de prueba. Reiniciar/desplegar variables según Railway. Revisar el presupuesto operativo mensual antes de activar el envío semanal.
7. Entrar como administrador Búho en Administración, seleccionar estudio y iniciar una ejecución manual para comprobar el primer envío. Reutiliza los 131 cruces del piloto y recupera sus 16 positivos sin inferirlos de nuevo; el botón puede analizar hasta 150 cruces nuevos adicionales dentro del presupuesto configurado. Ver progreso/costo y referencia Resend; comprobar mensaje real en Gmail. Después de aprobar esa entrega activar `WATCH_DIGEST_ENABLED=true` para los lunes.

El usuario deberá ingresar las claves directamente; no pegarlas en chats, README, variables `NEXT_PUBLIC_*` ni commits. Localmente Next puede leer `.env.local`; `npm run dev:local` desactiva deliberadamente inferencias/envíos con datos simulados.

## Resultado visible en Dev

[Resumen real del piloto](https://buho-marc-web-dev.up.railway.app/app/resumen-semanal?run=b9f3ab88-21cf-4d37-b0cd-19522f2028f9), con sesión del estudio o administrador interno. Conserva **16 coincidencias y 53 tareas/plazos** del período del 14 al 27 de octubre; la agenda es una fotografía de los antecedentes al preparar el resumen. Un correo de ese contenido mostraría ocho coincidencias y ocho gestiones, con ocho coincidencias y 45 gestiones adicionales enlazadas. La primera ejecución de envío recalcula la agenda y vuelve a comprobar elegibilidad. Estado `prepared`, correo sin enviar, cero positivos marcados como notificados. No toma este estado como prueba de entrega en Gmail.

## Calidad y límites del piloto

No se etiquetaron estos 141 cruces por abogados ni se calculó una matriz VP/VN/FP/FN; **16 seleccionados no demuestra 16 aciertos**. El prompt prioriza conservar casos plausibles cuando faltan antecedentes y eso puede añadir ruido. Por ejemplo, INFLU TV / SUENA TV fue retenido por semejanza visual y cobertura: la diferencia del nombre merece revisión antes de aceptar el criterio. Los dos grupos inválidos también muestran una oportunidad de mejorar el contrato de incertidumbre. No se modificó el texto durante el piloto ni se cambiaron estados para mejorar cifras. La versión 1 queda identificada en cada decisión.

La conexión local se interrumpió varias veces. Se guardó cada intento, conservando respuestas ya válidas. Tras cada pausa se contrastó el consumo acumulado de la clave con la suma de cargos reportados; solo se liberaron reservas cuando coincidieron. El cierre no tiene cargos desconocidos. Las llamadas fallidas de transporte no se consideran inferencias correctas.

El piloto usa stock de 42.476 cruces reales: 32.373 superaban filtros de estado/ventana y 14.014 de ellos quedaron bajo 25%. Ese 43,3% del stock elegible tiene una distribución distinta de la base histórica de 19.630, que contenía candidatos ya preseleccionados. No es una medición de recuperación del nuevo stock: no conocemos las etiquetas de todos esos descartes.

## Dominio y coordinación

Se releyó la nota local `docs/DOMINIO_Y_ACCESO_2026-10-13.md` en la carpeta principal, aún sin commit en Dev al corte `e36ca4f`. Acuerdo confirmado: `rcirculo.com/` landing; login previsto `/app/login`; plataforma `/app`; Crear cuenta lleva a contacto. Correos utilizan `/app/resumen-semanal` y una base por ambiente: production `https://rcirculo.com`, Dev su dominio Railway, local puerto propio. `APP_PUBLIC_ORIGIN` no incluye `/app`. El login `/app/login` sigue pendiente en otro trabajo; este cambio conserva el acceso actual y no modifica DNS ni autenticación.

## Operación y persistencia

Antes de publicar se creó una copia lógica cifrada de Dev, se comprobó el tamaño, SHA256 y descifrado. No se hizo restauración de ensayo. El archivo y la clave de recuperación permanecen fuera del repositorio en una carpeta privada; no se tocó producción.

Migración `0016_watch_digest.sql` y esquema Drizzle: `watch_digest_runs`, `watch_glm_decisions`, `watch_glm_calls`, `watch_digest_images`. Son tablas nuevas; no modifica expedientes existentes. Revisar numeración/journal antes de integrar Dev.

APIs: administración `/api/watch/digest/admin` (capacidad interna `sourceAdmin` y admin, CSRF), trabajador `/api/watch/digest/worker` (secreto de cron), resumen `/api/watch/digest` e imágenes `/api/watch/digest/image/[key]` (sesión y organización). Solo admin interno puede consultar otra organización para una vista de prueba. Resumen en `/app/resumen-semanal?run=<uuid>`; no URLs públicas con datos de clientes.

Supervisor `scripts/start-monitored.mjs` consulta trabajador cada 30 s; drena la cola tras cada lote. Una ejecución activa por organización y un consumidor global con lease recuperable. Conserva entradas e imágenes del lote antes de la inferencia, respuestas y reservas; recupera sin volver a cobrar una llamada válida guardada. Correo normalizado por PostgreSQL antes del primer envío para repetir el mismo cuerpo tras reinicio. Estado `prepared`: piloto importado sin correo enviado; el próximo resumen recupera sus positivos no notificados y evita repetir sus decisiones negativas/positivas. `scripts/import-watch-digest-pilot.mjs` solo admite Dev y `--apply`, comprueba selección, pertenencia, presupuesto y esquema; nunca llama a modelos ni Resend.

Resend acepta el mismo cuerpo/clave durante [24 horas](https://resend.com/docs/dashboard/emails/idempotency-keys). Se marca posible aceptación antes de HTTP; tres intentos acotados. A partir de 23 horas una aceptación incierta queda para comprobación manual, evitando duplicar fuera de la ventana. El botón Reintentar correo reutiliza el resumen sin GLM; no fuerza reenvíos inciertos antiguos. Aceptación API no confirma llegada a bandeja; webhooks de entrega/rebote quedan para una fase posterior.

## Verificación local

Las pruebas automatizadas y visuales usan fixtures ficticios y proveedores simulados, sin cargos ni correo real. El piloto real autorizado está separado de estas pruebas. Las pruebas cubren zona horaria/14 días, estados, corte 25%, máximo cinco/150, identidad de JSON, costos desconocidos, presupuesto concurrente, persistencia y reintento byte a byte, stock ya decidido, sesión/CSRF/aislamiento y rutas del resumen.

```sh
node --import ./tests/ts-loader.mjs --test tests/watch-digest.test.mjs tests/watch-digest-integration.test.mjs
node --import ./tests/ts-loader.mjs scripts/preview-watch-digest.mjs
```

La vista generada queda en `outputs/correo-semanal/`, ignorada por Git. Se aprobaron 34 pruebas dirigidas (14 del resumen, incluidas persistencia e importación de piloto con PostgreSQL efímero), TypeScript, ESLint y build Next webpack. QA en navegador: ocho filas por sección, cero desbordamiento de página a 390 px, variante sin alertas, diez filas de cada sección en plataforma, imágenes protegidas y botón de Admin desactivado mientras faltan claves. Capturas locales en `outputs/correo-semanal/`. Consultar [traspaso](handoffs/2026-10-13-correo-semanal-glm-resend.md) para ambiente, comprobaciones exactas y siguiente paso.
