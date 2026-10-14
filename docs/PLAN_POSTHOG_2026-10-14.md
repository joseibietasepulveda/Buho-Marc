# Plan de integración PostHog · Buho Marc

- Actualizado: 14 de octubre de 2026, America/Santiago.
- Estado: propuesta documentada; PostHog no está instalado ni conectado con esta entrega.
- Alcance confirmado: entender uso y comportamiento de los usuarios, con medición por estudio y usuario; priorizar costos y llamadas a proveedores en el dashboard interno de Administración.
- La entrega del dashboard registra y consulta información propia. Este plan añade análisis de recorridos, adopción y retención; no sustituye los registros financieros de PostgreSQL.

## 1. Qué resolvería PostHog

El dashboard interno debe responder cuánto se usa Búho, cuántas tareas y alertas se gestionan, qué cuesta cada servicio y cuántas peticiones se hicieron. PostHog permitiría explorar el recorrido entre esas acciones: dónde se abandona una búsqueda, qué módulos preceden a la revisión de una alerta, qué usuarios regresan la semana siguiente y qué acciones siguen al correo semanal.

Separar tres unidades para evitar interpretar actividad automática como trabajo del abogado:

| Unidad | Definición | Fuente principal |
| --- | --- | --- |
| Interacción de interfaz | Acción explícita de una persona: entrar a un módulo, abrir una comparación o cambiar un filtro. No cuenta el polling, renderizado, precarga ni actualización automática. | Eventos permitidos de la aplicación; PostHog para recorridos. |
| Acción de negocio | Escritura confirmada: crear una tarea, completarla, descartar o seguir un cruce, convertirlo en caso, incorporar una marca. | Persistencia y bitácora del servidor. |
| Petición al proveedor | Una solicitud HTTP física saliente, incluidos intentos fallidos o reintentos. Una búsqueda puede producir varias peticiones. | Telemetría de APIs y registros de consumo en PostgreSQL. |

Los correos generados por el supervisor y las decisiones de GLM llevan `actor_kind=system`. No se atribuyen como interacciones personales al administrador ni al propietario de la marca. Una cuenta sin eventos recientes tampoco equivale por sí sola a abandono: la cartera puede tener poca actividad jurídica en ese período.

## 2. Identidad, organizaciones y acceso

Usar el UUID interno del usuario autenticado como `distinct_id`; nunca correo, nombre, RUT o teléfono. Asociar cada evento al UUID de la organización obtenido de la sesión del servidor, no aceptado libremente del navegador. Son identificadores seudónimos, no datos anónimos: la correspondencia con las personas permanece dentro de Búho.

El cliente recibe identidad autorizada desde el contrato autenticado de la aplicación, llama a `identify(userUuid)` una vez por sesión y envía únicamente el rol normalizado. Si ese contrato aún no entrega el UUID, añadir una respuesta mínima protegida; no inventar una ruta de sesión ya disponible. Al salir, reinicia la identidad y limpia las propiedades de organización para impedir que un navegador compartido mezcle cuentas. La identidad del servidor debe ser idéntica a la del cliente; los eventos anteriores al inicio de sesión no se mezclan con navegación comercial.

Primera etapa: `organization_id` es una propiedad permitida para filtrar y desglosar; las agregaciones por estudio continúan disponibles en el dashboard propio. La fase opcional de Group Analytics usaría `group('organization', organizationUuid)` en el navegador y `groups: {organization: organizationUuid}` en el servidor. Group Analytics es un complemento pagado: al activarlo, su facturación alcanza todos los eventos identificados del proyecto, aunque no incluyan grupos. No se habilita por accidente para obtener filtros por organización. [Documentación oficial de grupos](https://posthog.com/docs/product-analytics/group-analytics).

El panel con todos los estudios mantiene el permiso de administrador interno de Búho. No publicar enlaces de dashboards que expongan actividad de otras organizaciones. El acceso a PostHog debe limitarse al equipo responsable de producto/operación, revisando las capacidades y el costo del plan elegido para permisos por proyecto. El administrador de un estudio no obtiene acceso global por tener el rol `admin` en su organización.

## 3. Contrato de eventos permitido

Versionar un catálogo y una validación compartida. Los nombres siguientes son una propuesta para la conexión futura; mapearlos a los eventos reales del dashboard al implementarla. El contrato interno de esta entrega contempla `analytics_events`, `analytics_api_calls`, `analytics_email_events` y snapshots agregados `analytics_snapshots`, mediante migración `0017`. Los eventos de interfaz son `login_succeeded`, `interaction`, `module_viewed` y `digest_viewed`; no son todavía eventos enviados a PostHog. Las escrituras jurídicas conservan su bitácora original. Ningún handler podrá enviar objetos de negocio completos mediante un `...record`.

Propiedades comunes permitidas: `schema_version`, `environment`, `organization_id`, `role`, `actor_kind`, `module`, `result`, `source=ui|server`, `app_version`. El evento lleva UUID y fecha originales. Los UUID de tareas, alertas o corridas sólo se incluyen cuando sea necesario correlacionar acciones; los números de solicitud y registro no se exportan.

| Evento propuesto | Emisor y momento | Propiedades específicas permitidas | Pregunta que ayuda a responder |
| --- | --- | --- | --- |
| `session_started` | Servidor, después de autenticar correctamente. | Método de acceso normalizado. | ¿Quién entra y vuelve? |
| `module_viewed` | Cliente, al entrar a una sección visible. | Módulo enumerado, vía de entrada enumerada. | ¿Qué apartados se usan y en qué orden? |
| `filter_applied` | Cliente, tras aplicar un filtro. | Tipo de filtro, cantidad de resultados por rango. | ¿Se llega a resultados útiles? |
| `comparison_opened` | Cliente, tras abrir efectivamente el comparador. | UUID de cruce, procedencia `watch|digest|feasibility`. | ¿Cuántas alertas se inspeccionan? |
| `watch_decision_saved` | Servidor, después de guardar la decisión. | UUID de cruce, decisión `follow|discard|case`, procedencia. | ¿La revisión se convierte en gestión? |
| `case_created` | Servidor, después de crear el caso. | UUID de caso, origen enumerado. | ¿Qué flujo termina en una acción jurídica? |
| `task_created` / `task_assigned` / `task_completed` | Servidor, después de confirmar la escritura. | UUID de tarea, prioridad, origen y estado enumerados. | ¿Quién genera trabajo y quién lo resuelve? |
| `brand_added` / `watch_enabled` | Servidor, tras guardar. | Método de incorporación enumerado, cantidad agregada. | ¿La cartera llega a estar vigilada? |
| `feasibility_search_requested` / `feasibility_search_completed` | Servidor, al aceptar la acción y al guardar su resultado. | Modo enumerado, clase Niza si se aprueba conservarla, conteo por rango, resultado normalizado. | ¿Dónde se pierde la búsqueda? |
| `conclusion_requested` / `conclusion_completed` | Servidor, tras aceptar y persistir la generación. | Fuente `model|cached|manual`, resultado normalizado; sin contenido. | ¿La IA ayuda a finalizar informes? |
| `report_export_completed` | Servidor o cliente según punto de confirmación real. | Formato `pdf|docx|xlsx`, destinatario `client|firm`, presentación enumerada. | ¿Cuántos estudios llegan a un informe descargable? |
| `digest_opened` | Cliente, resumen autenticado renderizado y visible. | UUID de corrida, vía `email|admin|app` verificada cuando exista. | ¿El correo lleva al trabajo dentro de Búho? |
| `analytics_preference_changed` | Servidor, después de cambiar la preferencia. | Sólo elección habilitado/deshabilitado. | ¿Se respeta la preferencia de medición? |

Excluir por defecto todos los textos libres: marcas y denominaciones, coberturas, observaciones, títulos de tareas, nombres de titulares y clientes, búsquedas, documentos, imágenes, explicaciones de IA, asuntos y destinatarios de correos, headers, cookies, claves, tokens y cuerpos de peticiones/respuestas. No enviar URLs completas, parámetros ni hashes: la aplicación utiliza rutas y filtros que podrían identificar expedientes. `module` sustituye a la URL.

No habilitar AI Observability ni captura automática de prompts/respuestas para medir GLM. El consumo y los costos se consultan en los registros propios; PostHog recibe, si se decide necesario, sólo un resultado operativo agregado sin contenido jurídico.

## 4. Captura controlada y privacidad

La implementación futura usará los SDK oficiales para Next.js/React y Node; fijar versiones revisadas y probarlas contra Next 16.3.5 antes de integrarlas. La documentación oficial cubre cliente, identificación y vinculación con eventos del servidor. [Guía Next.js](https://posthog.com/docs/libraries/next-js).

Configuración explícita, sin depender de nuevos valores predeterminados del SDK:

- `autocapture: false`, `capture_pageview: false` y `capture_pageleave: false`.
- `disable_session_recording: true`; grabación de consola, red, cuerpos HTTP, logs y errores automáticos desactivados.
- Encuestas, flags remotos, experimentos y productos distintos de Product Analytics desactivados si no se usan.
- `before_send` devuelve sólo nombres y propiedades presentes en el catálogo. Rechaza todo evento desconocido; limpia también superpropiedades, `$set`, URLs y propiedades añadidas automáticamente por el SDK.
- No registrar la URL actual por la comodidad de un `$pageview`. Emitir `module_viewed` con módulo enumerado.
- Configurar descarte de IP del cliente en el proyecto y como valor organizacional para proyectos futuros. Evitar geolocalización y no reenviar la IP del usuario desde el servidor. El proveedor sigue recibiendo información de transporte al recibir conexiones; no describir esta arquitectura como ausencia absoluta de tratamiento de datos personales.

PostHog ofrece controles de filtrado antes del envío y de descarte de IP. Validar el tráfico real además de la configuración: ocultar un campo en un gráfico no lo elimina de la captura. [Configuración JavaScript](https://posthog.com/docs/libraries/js/config), [privacidad de Product Analytics](https://posthog.com/docs/product-analytics/privacy).

Antes de activarlo con clientes, acordar la finalidad y preferencia de medición en la política del producto. Si el régimen aplicable exige consentimiento, el SDK no se descarga ni captura antes de obtenerlo; permitir desactivar la analítica y comprobar que también se suspende la exportación correspondiente del servidor. Esta propuesta no determina una obligación legal específica para cada estudio. La bitácora necesaria para operación y seguridad permanece separada de la analítica opcional.

## 5. Arquitectura con impacto mínimo en latencia

### Cliente

La aplicación debe funcionar completamente sin PostHog. Cargarlo con importación diferida sólo después de autenticación, preferencia válida y disponibilidad del navegador. No añadir el SDK al camino crítico de login, búsqueda, guardado, carga de cartera ni generación del correo. Si el usuario interactúa antes de que el SDK cargue, conservar como máximo una cola pequeña de eventos permitidos durante esa sesión; nunca almacenar borradores, consultas ni documentos.

La captura propia actual acredita `digest_viewed` desde `GET /api/watch/digest` después de validar el resumen y la pertenencia al estudio. Mantener esa procedencia al exportar a PostHog: un ID enviado por el navegador no acredita acceso a un resumen privado. Se cuenta como acceso identificado; no prueba que provenga del correo. La vista administrativa de otro estudio no cuenta como acceso de su destinatario.

Emitir una visita al cambiar de módulo, no por cada renderizado. Las interacciones se envían en lotes; no emitir eventos por cada tecla, movimiento de mouse o polling. Una caída de PostHog no presenta errores al abogado ni reintenta acciones de negocio.

### Servidor

Propuesta: proyectar `analytics_events` y las acciones confirmadas de la bitácora a un outbox limitado. Guardar el identificador de origen y su proyección permitida; un consumidor independiente envía lotes y registra el avance. `analytics_api_calls` y los ledgers nativos de `watch_glm_calls`/`feasibility_conclusions` mantienen la verdad de consumo y costos; no duplicar ese costo al exportar eventos. No esperar una petición HTTP a PostHog dentro de la transacción jurídica ni antes de responder una escritura al usuario.

El consumidor tiene su propio reloj, timeout, reintentos con espera y bloqueo para evitar dos réplicas exportando simultáneamente. Procesar inicialmente hasta 100 eventos por lote cada 30 segundos, con límite de trabajo y memoria. Cargar por índice/cursor, sin escanear toda la bitácora ni releer prompts. Una indisponibilidad de PostHog no frena GLM, DeQuiénEs, INAPI ni Resend.

Los procesos de corta duración necesitan confirmar el vaciado de la cola; el ejemplo oficial de Next.js usa `shutdown()`. En Railway se hará esa espera dentro del consumidor aislado, no en la respuesta del flujo principal. No confiar en promesas sin esperar después del cierre del proceso. [SDK Node](https://posthog.com/docs/libraries/node), [integración Next.js](https://posthog.com/docs/libraries/next-js).

Conservar `uuid`, nombre, `timestamp` y `distinct_id` originales en cada reintento. PostHog deduplica eventualmente según esos cuatro valores; no cambiar la fecha para que parezca un evento nuevo. Mantener además unicidad propia del evento de origen, porque una deduplicación eventual no sirve como mecanismo financiero ni como garantía inmediata de conteos exactos. [Contrato de eventos y deduplicación](https://posthog.com/docs/data/events).

Protección de recursos propuesta: limitar el outbox a siete días de antigüedad y a 50.000 eventos pendientes, con contador de omitidos y aviso interno de cobertura. Las acciones de negocio y registros de consumo originales no se eliminan al omitir su copia analítica. Al recuperar el servicio, enviar primero los eventos recientes de negocio y limitar navegación de alta frecuencia. Evitar reintentos ilimitados, vaciados masivos durante horario de uso y consultas con el mismo pool saturando la aplicación.

### Presupuestos de rendimiento a verificar

Son criterios propuestos, no mediciones ya logradas:

| Control | Criterio inicial |
| --- | --- |
| Dependencias críticas | Cero llamadas a PostHog necesarias para login, búsquedas, guardados o envíos. |
| Latencia API p95 | Incremento menor que el mayor de 5 ms o 2%, comparando mismos fixtures/carga con flag apagado y encendido. |
| INP y carga inicial | Sin aumento repetible mayor a 10 ms de INP; sin nuevo recurso analítico bloqueando el contenido inicial. |
| Escrituras de telemetría | Lotes indexados y acotados; no una transacción/remota por cada clic. |
| Fallo del proveedor | Simular caída durante 30 minutos: los flujos principales completan y el consumidor respeta sus límites. |
| Integridad | Cien acciones confirmadas se corresponden con cien eventos de negocio propios; reintentos no duplican esas acciones. |
| Cobertura exportada | Mostrar enviados, pendientes y omitidos; no presentar una muestra parcial como uso completo. |

## 6. Vistas de comportamiento que construir

1. **Adopción:** usuarios que ingresaron y completaron una acción de negocio; activación de vigilancia; última actividad; nuevos usuarios que no llegaron a usar un módulo. Separar inicio de sesión de trabajo efectivo.
2. **Actividad semanal:** columnas por semana de Santiago y por usuario, con desglose de navegación y acciones confirmadas. Semanas incompletas señaladas; excluir automatización. Al cambiar usuario, conservar escala y período para comparar. No llamar a este gráfico uso de tokens: son interacciones.
3. **Embudo de vigilancia:** correo entregado → resumen abierto autenticado → comparación abierta → decisión guardada → caso/tarea. Medir conversión y tiempo mediano/p90. El clic del correo es una señal separada del acceso autenticado, pues un scanner puede visitarlo.
4. **Embudo de factibilidad:** búsqueda aceptada → resultados guardados → revisión → conclusión preparada → exportación. Incluir fallos normalizados y abandono por etapa; no enviar el contenido de la búsqueda.
5. **Retención:** primera acción útil → nueva acción útil a la semana 1, 2 y 4. Cohortes por primera semana de uso y rol; no confundir actividad del supervisor con retorno de personas.
6. **Carga y seguimiento:** tareas creadas/asignadas/completadas, acciones por usuario y marcas vigiladas. La carga y los plazos siguen calculándose con datos propios; PostHog complementa recorridos, no determina cumplimiento jurídico.
7. **Calidad de alertas:** decisión GLM → revisión humana → seguimiento/descarte/caso. Mostrar siempre el porcentaje todavía sin revisar. No contar pendiente como error ni una conversión en caso como resultado jurídico ganado.

Ventanas propuestas: actividad semanal lunes–domingo en `America/Santiago`; usuarios activos semanales/mensuales según eventos permitidos; embudos de alertas a siete días y factibilidad a un día inicialmente. Documentar cada denominador y permitir cambiar la ventana. Un uso bajo no se utiliza automáticamente para evaluar desempeño profesional.

## 7. Correos y atribución

La respuesta de `/emails` acredita aceptación por Resend; no entrega al destinatario. Los webhooks firmados alimentan el registro propio de entregados, rebotados, demorados, fallidos y quejas. `email.delivered` acredita entrega al servidor receptor, no lectura ni aparición en la bandeja principal. Relacionar `data.email_id` con el ID Resend guardado en la corrida y mantener la fecha superior `created_at` como fecha del evento. [Eventos Resend](https://resend.com/docs/webhooks/event-types), [evento de entrega](https://resend.com/docs/webhooks/emails/delivered).

La verificación usa el cuerpo original y los headers `svix-id`, `svix-timestamp`, `svix-signature`; deduplicar por mensaje antes de contabilizar. La implementación debe verificar antes de procesar o guardar metadatos y rechazar firmas inválidas/fechas fuera de tolerancia. [Verificación Resend](https://resend.com/docs/webhooks/verify-webhooks-requests), [verificación manual Svix](https://docs.svix.com/receiving/verifying-payloads/how-manual).

La conexión a PostHog sólo exportaría el tipo de evento, UUID de corrida y conteos por estudio, sin destinatarios, asunto, URL, IP ni user agent. Resend puede incluir IP, URL y agente del cliente en `email.clicked`; no copiar ese objeto completo. Las aperturas son una señal secundaria expresamente inexacta según Resend. La señal de mayor utilidad es una revisión o tarea posterior dentro de una sesión autenticada. [Clics](https://resend.com/docs/webhooks/emails/clicked), [aperturas y sus límites](https://resend.com/docs/webhooks/emails/opened).

No activar seguimiento de aperturas/clics ni incorporar pixeles como parte automática de este plan. Si se habilita luego, comprobar configuración del dominio y preferencia de medición; señalar su cobertura. Para medir origen de acceso se puede añadir un marcador enumerado no sensible al enlace del resumen; el servidor debe verificar que la corrida pertenece a la organización. No asignar automáticamente cada visita o acción siguiente a la persona destinataria de un correo reenviado.

## 8. Costos, cuotas y retención

Precios consultados en fuentes oficiales el 14/10/2026; volver a verificarlos al contratar. Product Analytics publica un millón de eventos gratis por mes y una primera tarifa de US$0,0000500 por evento adicional hasta el siguiente tramo. El precio decrece con volumen. Los ejemplos son estimaciones de Product Analytics, excluyen impuestos, complementos, otras herramientas y duplicados de captura. [Precios Product Analytics](https://posthog.com/product-analytics/pricing).

| Volumen mensual propuesto | Cálculo | Costo estimado de Product Analytics |
| --- | --- | --- |
| Piloto de 20 usuarios, 22 días y 100 eventos por usuario/día | 44.000 eventos | US$0 si la cuenta mantiene la cuota publicada disponible. |
| 200 usuarios, 22 días y 100 eventos por usuario/día | 440.000 eventos | US$0 bajo la misma condición. |
| 1.200.000 eventos totales del proyecto | 200.000 × US$0,0000500 sobre la cuota | US$10, sin complementos. |

Estos escenarios hablan de usuarios, no de marcas: las 200 marcas de un cliente no equivalen a 200 personas ni a 200 eventos diarios. El control de costos cuenta también eventos de identificación, visitas y otros eventos del SDK; no sólo la lista visible de acciones de negocio.

La oferta gratuita actual permite un proyecto y retiene eventos durante un año. PAYG ofrece más proyectos y otra retención. La cuota/límite puede descartar permanentemente eventos al agotarse; por eso la contabilidad y bitácora propia siguen siendo obligatorias. Configurar límite de facturación de US$0 durante validación y comprobar el comportamiento de la cuenta; no prometer gratuidad perpetua ni cobertura completa después de un descarte. [Planes, retención y límites oficiales](https://posthog.com/pricing).

Dev y producción no compartirán token/proyecto. Empezar sólo con un proyecto Dev gratuito, sin datos de clientes. Para producción, elegir luego proyectos separados dentro de un plan que los permita y confirmar costo/permisos; no mezclar ambientes en el único proyecto gratuito para ahorrar ni crear cuentas para eludir condiciones del proveedor.

Retención operativa propuesta: outbox máximo siete días; informes agregados propios según política de Búho; analítica externa sólo durante el período necesario para producto, con proceso de eliminación de identidad al cerrar cuentas cuando corresponda. La retención comercial del proveedor es un límite del plan, no una decisión de conservar todos los datos ese tiempo. El SDK y los eventos deben respetar un `analytics_opt_out` persistido; definir cómo cancelar los pendientes al revocar la preferencia.

## 9. Etapas de integración

| Etapa | Trabajo concreto | Criterio para avanzar |
| --- | --- | --- |
| 0. Dashboard propio | Publicar telemetría interna, costos/API/acciones y documentar su cobertura histórica. | Totales y permisos verificados; no depender de un tercero para consultar costos. |
| 1. Preparación | Crear proyecto Dev, elegir región, fijar catálogo y preferencia, revisar acceso/retención, presupuesto US$0 y flags apagados. | Tokens de ingestión por ambiente; ningún token personal de administración en el navegador. |
| 2. Instrumentación Dev | SDK diferido y catálogo; exportador independiente de acciones confirmadas; fixtures de dos estudios y dos usuarios. | Revisar payloads reales: sólo campos permitidos, aislamiento e identidad coherentes. |
| 3. Verificación | Comparar cien acciones controladas, remounts, doble clic, refresh, cierre de sesión, rechazo de medición, caída de red y reintentos. | Sin duplicaciones de negocio; cobertura/pérdidas observables; presupuestos de latencia cumplidos. |
| 4. Análisis útil | Construir actividad semanal, embudos, cohortes y retención; fijar ventanas/denominadores y recoger dos semanas de evidencia. | Responder preguntas concretas sin exportar textos jurídicos; costos observados dentro del límite. |
| 5. Producción futura | Entrega independiente, proyecto/token de producción y activación gradual autorizada. | Dev aprobado, configuración separada y reversión ensayada. No se promueve con este documento. |
| 6. Replay opcional | Sólo con aprobación futura específica, un flujo acotado y previamente revisado; empezar con fixtures y pequeña muestra. | Todos los textos/inputs/imágenes sensibles bloqueados, URL/red/consola excluidos y muestreo demostrado. |

Replay permanece apagado: una máscara de inputs no oculta automáticamente marcas, coberturas y documentos presentes en texto o imagen. Si se justifica después, usar bloqueo de zonas sensibles y máscara total de texto, no capturar pantallas jurídicas completas. Revisar cada pantalla nueva antes de incluirla. [Controles oficiales de Session Replay](https://posthog.com/docs/session-replay/privacy).

## 10. Reversión y pruebas pendientes

Flags propuestos, aún no implementados: `PRODUCT_ANALYTICS_ENABLED=false` en servidor y `NEXT_PUBLIC_PRODUCT_ANALYTICS_ENABLED=false` para el cliente. Además, un interruptor operativo de exportación permite detener el consumidor sin redeploy del frontend. Al desactivar, no cargar SDK, no exportar y no vaciar automáticamente los pendientes después de reactivar; respetar fecha máxima y preferencias.

La reversión conserva dashboard, marcas, tareas, decisiones, correos y costos. No elimina la bitácora jurídica ni cambia las cuotas de INAPI/OpenRouter. Si una medición añade latencia fuera del presupuesto, se apaga su captura/exportación antes de aumentar recursos o relajar límites.

Comprobaciones pendientes de esa integración: configuración efectiva del SDK elegido, payloads en el navegador, entrega de outbox con caída/reintento, deduplicación eventual en PostHog, tiempo p95/INP con y sin captura, cuota real y preferencia por usuario. Las referencias se investigaron; no se creó cuenta, no se instalaron SDK, no se conectaron claves ni se enviaron eventos a PostHog.
