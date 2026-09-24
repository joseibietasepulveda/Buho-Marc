# Buho Marc 1.0 · vigilancia y prefactibilidad reales

Ambiente de entrega: **Railway Dev**. La actualización previa de main incorporó únicamente los dos commits que ya estaban en dev (`6170e3f`). La versión 1.0 se desarrolla en dev y no se promueve a producción.

## Comportamiento de esta versión

- Se incorporan automáticamente a vigilancia los expedientes propios importados, incluidas solicitudes en trámite. Las solicitudes propias se mantienen en su sección y no se convierten en marcas registradas por vigilarlas. Las oposiciones presentadas contra terceros quedan fuera de la cartera propia.
- Cada consulta al stock solicita **50 similitudes**, individuales y excluyendo al mismo titular. La API no recibe filtro de estados; se conserva su respuesta y la UI oculta Denegada, Desistida y Abandonada por etiqueta exacta, sin concluir firmeza procesal. Registrada aparece después del resto dentro de cada grupo.
- La navegación se divide entre **Mis marcas** (registradas y solicitudes propias) y **Vigilancia**, con pestañas Por revisar y En seguimiento. Por revisar organiza alta y media similitud según índices configurables (0,60 y 0,30 por defecto), persistentes por organización. Una marca puede aparecer en ambos grupos; los resultados aparecen debajo con sangría, sin exigir desplegar la marca. Los límites reorganizan la vista localmente, sin borrar revisiones ni cancelar seguimientos. La UI oculta los tres estados indicados, pero conserva sus antecedentes y decisiones.
- El desplegable muestra cinco solicitudes. **Buscar más** agrega cinco del lote guardado cada vez, hasta agotar las disponibles; no llama nuevamente a la fuente ni promete resultados ilimitados.
- Las revisiones siguientes consultan además ingresos y publicaciones desde la última revisión, con dos días de solapamiento y hasta 50 resultados por llamada. Sus novedades se agregan sin duplicar solicitudes; por eso un lote posterior puede contener más de 50 solicitudes distintas.
- La primera revisión genera un resumen por marca; no envía un aviso por cada antecedente histórico. Las novedades posteriores generan avisos por ingreso y publicación, sin envío externo de correo.
- Seguir una solicitud conserva una sola ficha y permite abrirla. El seguimiento se distingue del estado INAPI. La publicación posterior actualiza esa ficha y genera su aviso sin borrar decisiones ni duplicar casos.
- Las coincidencias seguidas se actualizan aunque dejen de aparecer en los primeros resultados. Pausar detiene nuevas revisiones y conserva antecedentes; reanudar pone una revisión en cola.
- La búsqueda de prefactibilidad admite nombre, imagen o ambos, clases y coberturas concretas, 50 resultados y agrupación opcional. Usa estados e historiales reales, sin porcentajes de riesgo. Las imágenes se validan (JPEG/PNG/WebP, 8 MiB, 20 MP) y no se almacenan como estudios permanentes.
- La lectura de coincidencias conserva fechas y estados informados aunque falte un número de registro o haya una inconsistencia entre fechas. Esos antecedentes se advierten en el resultado y no se usan para calcular un plazo automáticamente. La importación de cartera conserva sus validaciones estrictas. El lote completo ya no se rechaza por esa inconsistencia de un tercero.
- Se oculta el PDF demo en fichas y comunicaciones de coincidencias reales. El PDF específico sigue pendiente.

## Operación

`/api/watch` consulta la vigilancia, encola revisiones, pausa/reanuda y registra seguimiento. `/api/watch/[id]` permite abrir una coincidencia de la propia organización, incluso antes de seguirla. `/api/similarity` consulta prefactibilidad. Todas requieren sesión; las escrituras verifican origen.

El supervisor existente llama también a `/api/watch/worker` con un secreto interno. La cola está en PostgreSQL; solo se procesa un trabajo de vigilancia a la vez entre las réplicas. Los HTTP 403 de búsqueda o antecedentes tienen **10 reintentos después del intento inicial**, separados por una espera persistente de **20 segundos**. Durante esa espera se detienen las nuevas búsquedas de vigilancia entre réplicas; luego se prioriza la revisión rechazada. Cada reintento ejecuta nuevamente la revisión completa. El supervisor programa el siguiente intento al vencer la espera; si está detenido, se retoma cuando vuelve. Los demás errores recuperables conservan hasta tres intentos y esperas crecientes. Se recuperan trabajos iniciales interrumpidos tras tres minutos (diez minutos para revisiones posteriores con varias consultas); un token de ejecución impide guardar respuestas de una ejecución vencida. Una búsqueda fallida conserva el último resultado exitoso. La actualización de expedientes tiene su indicador independiente.

Recuperación del incidente de Dev: `node --import ./tests/ts-loader.mjs scripts/recover-watch-403.ts` muestra cuántas marcas son elegibles; `--apply` las encola. Requiere el ID de Dev verificado y su base. El inicio de Dev ejecuta esta recuperación idempotente. Solo recupera marcas activas cuyo último trabajo falló por 403, sin trabajo pendiente ni stock de 50 completado. Mantiene el historial de fallos y usa una clave por marca para que repetir el comando no duplique trabajos ni reinicie indefinidamente los diez reintentos. Los registros del worker incluyen HTTP de la fuente, intento y próxima espera, sin credenciales.

La próxima revisión diaria usa las 12:30 de `America/Santiago` según la fecha; no se promete una ejecución automática si el scheduler está deshabilitado. Las revisiones se atienden en cola, por lo que esa hora no garantiza terminación simultánea de toda la cartera. Con el scheduler desactivado se puede revisar por marca si el supervisor está activo y la fuente configurada. Al terminar un trabajo se procesa el siguiente de forma secuencial, sin esperar un intervalo vacío de 30 segundos entre marcas. La clave actual de la cola es `v1-stock50`. Las carteras revisadas con el límite anterior reciben automáticamente una revisión de stock de 50, sin esperar al día siguiente y conservando historial y decisiones. La cola alterna carteras para que una importación grande no monopolice las consultas. Los registros de operación identifican la solicitud y el avance de cada cartera.

La migración `0006_real_surveillance.sql` permite fecha de publicación ausente y añade evidencia, configuración, intentos, disponibilidad y token de ejecución a la cola. También protege de búsquedas simultáneas de prefactibilidad dentro de la misma organización. No borra datos existentes.

Configuración: `DATABASE_URL`, `SOURCE_PROVIDER=inapi`, `INAPI_API_KEY`, `MONITORING_SCHEDULER_ENABLED=true`, `MONITORING_CRON_SECRET` (el supervisor puede generarlo), y origen público del ambiente. Ninguna credencial se envía al navegador.

## Verificación

- Compilación de Next.js y comprobación de TypeScript.
- Pruebas de adaptador: estados, identificadores nuevos/anteriores, fechas ausentes, respuestas incompletas, duplicados y errores recuperables.
- Base PostgreSQL aislada: migraciones, vigilancia de solicitudes propias, 30 resultados, exclusión de terceros, repetición sin duplicados, concurrencia, publicación, decisiones conservadas, reintentos, pausa/reanudación, aislamiento y transición a registro.
- HTTP aislado: sesión, origen, secreto del worker, seguimiento, conversión repetida a un único caso y prefactibilidad.
- Regresiones de INAPI, procedimiento, oposición y horarios.
- Ajuste de tabla: búsqueda por marca/titular, filtros por revisión y similitud manual, expansión 5 → 10, seguimiento desde la misma fila y conservación de coincidencias seguidas fuera del stock actual.
- API real: stock de La Brioche con 30 resultados; propuesta por nombre con cobertura y agrupación; propuesta por imagen. El multipart requiere `options` (JSON) e `image`.

Verificación visual local: cuatro marcas reales de la muestra de Daniel reproducidas en una base aislada; ampliación 5 → 10 → 30, seguimiento y ficha real comprobados. Railway Dev desplegó el código `9bdba28` con estado **SUCCESS** (despliegue `1b56b0f4-973b-4748-893d-539a474df9f5`). La migración se aplicó correctamente; `/api/health` responde 200, versión 1.0, base conectada, fuente DeQuiénEs y programación activa. `/api/watch` devuelve 401 sin sesión. La revisión visual autenticada se realizó en la base local aislada; no se alteraron las claves de las cuentas de Dev. El experimento anterior con 50 resultados y sus tiempos está resumido en [VIGILANCIA_BENCHMARK.md](VIGILANCIA_BENCHMARK.md); no representa un benchmark local del motor.

Las dos primeras revisiones automáticas verificadas en Dev terminaron con 30 resultados de stock y una búsqueda por trabajo: 18.510 ms y 15.227 ms. Son tiempos completos del trabajador (preparación, búsqueda remota, antecedentes y persistencia), no tiempos exclusivos de CPU ni del motor. La cartera inicial se procesa en cola.

## Próximas versiones

- [ ] **Filtro por estado en la llamada a la API.** Víctor confirmó que lo incorporará, pero todavía no está realizado. Aplicarlo antes de seleccionar los mejores resultados cuando esté disponible. No simularlo recortando localmente esta versión.
- [ ] **Falta acordar el catálogo exacto de estados. No asumir que una etiqueta de rechazo siempre significa que el proceso terminó definitivamente: podría haber recursos o instancias posteriores.**
- [ ] Calibrar relevancia y niveles con revisión humana. El puntaje de fusión no es una probabilidad jurídica. Confirmar alcance semántico sin confundirlo con fonética, que ya está integrada.
- [ ] Cursor por incorporación/actualización, recuperación adicional y conciliación para cargas tardías. Dos días de solapamiento y resultados acotados no garantizan exhaustividad ante retrasos arbitrarios.
- [ ] Confirmar hora de disponibilidad diaria, cuotas, concurrencia y comparación de rendimiento 5/30/50 con Víctor.
- [ ] Informe PDF específico, almacenamiento de archivos y estudios de prefactibilidad, con políticas de acceso/retención.
- [ ] Búsqueda e importación ampliada por titular/representante, RUT con DV validado y selección paginada. No ampliar el onboarding en esta entrega.
- [ ] Migrar la configuración de Railway al formato vigente, según el aviso de obsolescencia emitido por su CLI durante esta entrega.
- [ ] Correos con Resend, TPI, patentes, colaboración avanzada y calendario plurianual: se mantienen fuera de esta entrega.

Ya no son pendientes generales: conectar la búsqueda real, mostrar señales visuales/fonéticas, retirar resultados simulados de prefactibilidad, obtener estados por lote, guardar seguimiento, ampliar resultados de cinco en cinco y recuperar trabajos de vigilancia. Esto no da por terminadas la calibración ni la exhaustividad de la búsqueda.

## Ajuste UX de septiembre: dos secciones y stock de 50

- «Mis marcas» incorpora también las solicitudes propias y permite abrir sus hallazgos desde el contador.
- Los límites de cercanía se guardan por organización con validación y auditoría; el medio debe ser menor que el alto. No son probabilidades jurídicas. Las marcas con resultados en ambos rangos se repiten con sus coincidencias correspondientes.
- Los resultados de vigilancia se muestran de cinco en cinco. El buscador de factibilidad conserva todos los estados.
- Pasar a seguimiento, crear caso y esperar publicación son acciones persistentes. La opción de publicación genera un aviso en Notificaciones; no implica envío de correo externo. Los expedientes seguidos se actualizan incluso fuera del stock. Descartar cancela esa preferencia.
- Comparación lado a lado recuperada, sin textos mock ni datos inventados. Las coberturas largas se pueden abrir dentro de la ficha.
- Factibilidad recupera el formulario anterior: nombre, clases con etiquetas removibles, logo lateral y × para quitarlo. El criterio se identifica como «Por similitud», porque es lo que consulta el endpoint. Coberturas y agrupación siguen disponibles en opciones. Registrada se muestra verde; Denegada/Abandonada/Desistida, rojo.
- Resumen: tareas compactas arriba a la derecha, indicadores con iconos de color. Casos: columna En seguimiento más amplia, dos tarjetas por fila en escritorio; una en móvil.
- Migración `0007_watch_preferences`: preferencias de organización. El aviso de publicación se conserva en la evidencia existente, sin duplicar la coincidencia.

Validación: pruebas de rangos y sus límites, exclusión exacta de estados, orden de registradas, persistencia e independencia entre organizaciones, aviso de publicación sin duplicados, actualización de stock 30 → 50 y conservación del seguimiento. Revisión visual con muestra real reproducida en una base local aislada; despliegue reservado a Dev.

## Control de consumo · 24 de septiembre de 2026

Daniel conserva las revisiones diarias; Búho pasa a pedido. La interfaz evita descargas completas repetidas, pagina Vigilancia y pausa las consultas en pestañas ocultas. Véase [control de consumo y validación](COST_CONTROL.md).

Pendiente: poner el sistema en un servidor dedicado para revisar más solicitudes, con capacidad y cuotas de la fuente verificadas.
