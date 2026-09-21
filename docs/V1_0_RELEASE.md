# Buho Marc 1.0 · vigilancia y prefactibilidad reales

Ambiente de entrega: **Railway Dev**. La actualización previa de main incorporó únicamente los dos commits que ya estaban en dev (`6170e3f`). La versión 1.0 se desarrolla en dev y no se promueve a producción.

## Comportamiento de esta versión

- Se incorporan automáticamente a vigilancia los expedientes propios importados, incluidas solicitudes en trámite. Las solicitudes propias se mantienen en su sección y no se convierten en marcas registradas por vigilarlas. Las oposiciones presentadas contra terceros quedan fuera de la cartera propia.
- Cada consulta al stock solicita **30 similitudes**, individuales y excluyendo al mismo titular. **No se filtran estados**. Cada resultado muestra el estado informado por la fuente.
- Cada marca propia ocupa una fila en la tabla, debajo de los filtros; sus coincidencias se despliegan dentro de esa misma tabla. La búsqueda y los filtros de revisión se aplican a ese listado. No hay una segunda tabla vacía reservada al seguimiento.
- El desplegable muestra cinco solicitudes. **Buscar más** agrega cinco del lote guardado cada vez, hasta agotar las disponibles; no llama nuevamente a la fuente ni promete resultados ilimitados.
- Las revisiones siguientes consultan además ingresos y publicaciones desde la última revisión, con dos días de solapamiento y hasta 30 resultados por llamada. Sus novedades se agregan sin duplicar solicitudes; por eso un lote posterior puede contener más de 30 solicitudes distintas.
- La primera revisión genera un resumen por marca; no envía un aviso por cada antecedente histórico. Las novedades posteriores generan avisos por ingreso y publicación, sin envío externo de correo.
- Seguir una solicitud conserva una sola ficha y permite abrirla. El seguimiento se distingue del estado INAPI. La publicación posterior actualiza esa ficha y genera su aviso sin borrar decisiones ni duplicar casos.
- Las coincidencias seguidas se actualizan aunque dejen de aparecer en los primeros resultados. Pausar detiene nuevas revisiones y conserva antecedentes; reanudar pone una revisión en cola.
- La búsqueda de prefactibilidad admite nombre, imagen o ambos, clases y coberturas concretas, 50 resultados y agrupación opcional. Usa estados e historiales reales, sin porcentajes de riesgo. Las imágenes se validan (JPEG/PNG/WebP, 8 MiB, 20 MP) y no se almacenan como estudios permanentes.
- Se oculta el PDF demo en fichas y comunicaciones de coincidencias reales. El PDF específico sigue pendiente.

## Operación

`/api/watch` consulta la vigilancia, encola revisiones, pausa/reanuda y registra seguimiento. `/api/watch/[id]` permite abrir una coincidencia de la propia organización, incluso antes de seguirla. `/api/similarity` consulta prefactibilidad. Todas requieren sesión; las escrituras verifican origen.

El supervisor existente llama también a `/api/watch/worker` con un secreto interno. La cola está en PostgreSQL; solo se procesa un trabajo de vigilancia a la vez entre las réplicas. Hay hasta tres intentos, esperas crecientes y recuperación de trabajos interrumpidos tras diez minutos; un token de ejecución impide guardar respuestas de una ejecución vencida. Una búsqueda fallida conserva el último resultado exitoso. La actualización de expedientes tiene su indicador independiente.

La próxima revisión diaria usa las 12:30 de `America/Santiago` según la fecha; no se promete una ejecución automática si el scheduler está deshabilitado. Las revisiones se atienden en cola, por lo que esa hora no garantiza terminación simultánea de toda la cartera. Con el scheduler desactivado se puede revisar por marca si el supervisor está activo y la fuente configurada. Al terminar un trabajo se procesa el siguiente de forma secuencial, sin esperar un intervalo vacío de 30 segundos entre marcas. Los registros de operación identifican la solicitud y el avance de cada cartera.

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
