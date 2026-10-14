# Dashboard de administración: uso, costos y comportamiento

Actualizado el 14 de octubre de 2026. Publicado exclusivamente en Dev mediante PR #82; publicación y evidencia en el [traspaso](handoffs/2026-10-14-dashboard-admin-uso-costos.md). Producción no se modifica con esta entrega.

## Acceso y alcance

- Dashboard: `/app/admin/dashboard`; entrada dedicada: `/admin/login`. `/admin` y `/app/admin` conducen al dashboard.
- Requiere sesión, rol `admin` y la capacidad interna `sourceAdmin` de la organización Búho `estudio-ibieta-ip`. Un administrador de otro estudio no obtiene acceso global.
- La cuenta Dev `admin` se crea con clave inicial privada y cambio obligatorio. Si existe, no se reemplaza ni modifica su contraseña.
- El ingreso habitual de los estudios conserva `/ingresar`. La decisión comercial de login futuro `/app/login` no se implementa en esta entrega. Producción conserva el dominio `rcirculo.com`; no se modifican DNS ni correo Google.
- Se filtra por fechas, estudio y usuario y se puede comparar con el período inmediatamente anterior de igual duración. Días y semanas usan `America/Santiago`; máximo 366 días por consulta. Se exporta la pestaña activa a CSV, con protección de fórmulas.

## Las ocho pestañas

| Pestaña | Indicadores y herramientas |
| --- | --- |
| **Costos** (entrada predeterminada) | Confirmados, estimados, reservas, suscripciones prorrateadas, presupuesto y proyección mensual; evolución diaria; desglose por proveedor, operación, modelo, estudio y usuario; tokens; costo por llamado, alerta y alerta relevante confirmada. Permite registrar tarifas por llamado, cargos fijos y presupuestos con vigencia. |
| **Usuarios y actividad** | Usuarios del alcance, activos a 7/30 días, última actividad, sesiones de navegación, interacción diaria y gráfica semanal por usuario; carga de tareas, cruces únicos/evaluaciones y casos. Señala cobertura histórica incompleta. |
| **Cartera y alertas** | Marcas incorporadas por usuario, vigilancia activa, responsables explícitos, cruces seleccionados por GLM, relevantes/descartados por abogados, pendientes, conversión a casos, tiempos de revisión y falsos negativos observados. Se puede asignar responsable de marca a un miembro del mismo estudio. |
| **Tareas y plazos** | Creadas, pendientes/asignadas/sin responsable, completadas, vencidas y dentro de plazo; desglose por autor, responsable y ejecutor. Agenda vigente de próximos 14 días y plazos manuales, separados para evitar sumar duplicados. |
| **Correos** | Resúmenes preparados, aceptación Resend, entrega, rebote, clics del proveedor, accesos identificados al resumen, gestiones posteriores y envíos fallidos/inciertos; serie diaria y detalle por resumen. Borradores marcados manualmente como enviados son otra señal. |
| **Llamados a APIs** | Solicitudes HTTP físicas, resultados, errores y resultados desconocidos, media/P95, tokens, costo y detalle reciente por DeQuiénEs, INAPI, OpenRouter, Resend e imágenes. |
| **Evaluaciones** | Cruces únicos y evaluaciones por abogado, decisiones formales y 👍/👎, cambios de opinión, comentarios anteriores/actuales e historial paginado. Vista independiente `/app/admin/evaluaciones`. [Contrato completo](EVALUACIONES_ABOGADOS_2026-10-14.md). |
| **Comportamiento** | Uso por módulo, acciones frecuentes y etapas de selección/revisión/gestión. Son agregaciones, no un embudo de conversión individual ni una prueba de causalidad. El [plan PostHog](PLAN_POSTHOG_2026-10-14.md) profundiza recorridos y retención. |

## Qué representa cada cifra

Una **interacción** es un clic de botón/enlace, cambio de selector o envío de formulario en la interfaz autenticada. Una visita a módulo y un ingreso son eventos distintos; no se cuentan como clics en la gráfica semanal. Polling, cargas automáticas, renderizados, búsquedas del supervisor y decisiones GLM no son interacciones humanas.

Una **llamada** es una petición HTTP al proveedor; cada intento cuenta. Un cruce es una comparación entre dos marcas y puede compartir una llamada con otros cruces. Un resultado de caché no es otra llamada. Los ledgers históricos también conservan intentos/reservas e interrupciones de red; esos registros no prueban recepción por el proveedor ni un cargo y su cobertura se señala como parcial. La duración HTTP llega hasta recibir las cabeceras, no incluye consumo del cuerpo ni todo el proceso de negocio. Un fallo de transporte sin respuesta tiene resultado desconocido; los errores HTTP tienen estado observado.

Los **costos confirmados** proceden de cargos explícitos en `watch_glm_calls`, `feasibility_conclusions` o telemetría con cargo acreditado. No son una factura conciliada. La telemetría enlazada mediante `watch:<uuid>` o `feasibility:<uuid>` aporta tiempos sin duplicar el cargo del ledger. Las reservas pendientes se muestran aparte. No se llama a OpenRouter para medir ni completar valores.

Los **estimados** usan reglas manuales con vigencia. Para tarifas por llamada prevalece la regla específica del estudio y operación; después la vigencia más reciente. Fijos mensuales se prorratean por días calendario de cada mes. No se reparten fijos globales entre estudios o usuarios sin una asignación real. Configurar un presupuesto aquí no cambia límites contratados ni el presupuesto del proceso GLM. Altas y eliminaciones de reglas quedan auditadas. La proyección extrapola el ritmo variable del período y agrega fijos del mes; no predice demanda futura. La referencia de cuatro ejecuciones semanales necesita al menos dos corridas programadas enviadas por estudio, completas y con cargos confirmados; no se calcula para un filtro individual de usuario ni desde un piloto manual.

**Desconocido no equivale a cero.** Si faltan costos, el total conocido/estimado queda señalado como parcial. El dashboard no sincroniza facturas Railway, OpenRouter ni Resend. Las tarifas reales de servicios sin cargo por respuesta se ingresan en Costos.

La cartera, los cruces y los pendientes describen el **estado actual**. Fechas filtran interacciones, costos, correos, creación y cierre con fecha conocida; no reconstruyen una cartera histórica. Comparar períodos no inventa fotografías anteriores de pendientes.

La precisión de las alertas usa únicamente evaluaciones humanas concluyentes. Una alerta sin revisar no es un acierto ni un error. Se muestran descartes GLM luego confirmados relevantes cuando existe evidencia; no se calcula recuperación de toda la cartera sin revisar también lo descartado. Titular de una marca, quien la incorporó y responsable operativo son campos diferentes.

## Datos históricos y captura nueva

La migración `0017_admin_analytics.sql` crea seis tablas: `analytics_events`, `analytics_api_calls`, `analytics_email_events`, `analytics_cost_rules`, `analytics_brand_assignments` y `analytics_snapshots`; añade columnas nullable de autor/ejecutor/fecha de cierre en tareas e índices de consulta. Conserva los registros existentes.

Las nuevas tareas registran creador y completador desde la sesión que realiza la acción. Reabrir una tarea elimina su cierre vigente; guardar una tarea ya completada conserva fecha y ejecutor. Las tareas antiguas sin autoría/fecha permanecen desconocidas. Las tareas automáticas no reciben un autor humano inventado.

La actividad anterior utiliza auditoría y sesiones aún guardadas cuando permite atribución. Cerrar sesión borra el registro histórico de sesión, por lo que no demuestra quién nunca ingresó. Los nuevos inicios de sesión sí se capturan. El indicador histórico de invitados sin ingreso permanece sin medición cuando no hay evidencia suficiente. Tampoco se infiere tiempo de atención a partir de una pestaña abierta.

## Rendimiento y privacidad

- `ADMIN_ANALYTICS_CAPTURE_ENABLED=true` activa captura propia; por defecto está apagada. No instala PostHog.
- Cliente: lotes de hasta 50 eventos cada 15 segundos, cola máxima 100, sin eventos por tecla ni movimiento de mouse. El endpoint verifica sesión, origen, esquema, tamaño, antigüedad y tasa; identidad/estudio se derivan en servidor.
- Servidor: cola máxima 500 y lotes de hasta 100 registros por tipo. Persistencia posterior a la respuesta con conexión independiente de máximo uno, timeout SQL de un segundo. No se espera SQL al hacer una llamada externa; no se clonan ni leen respuestas para medirlas.
- Clics y tiempos son telemetría de mejor esfuerzo: una caída del proceso o cola llena puede perderlos. Los registros financieros y las acciones jurídicas conservan sus mecanismos durables existentes. No se usa esta cola para garantizar facturación.
- Agregación: snapshots persistidos, vigencia de cinco minutos, trabajo independiente con una conexión, timeout SQL de ocho segundos y presupuesto de trabajo de 50 segundos revisado entre fases. La solicitud del dashboard consulta el resumen o encola su preparación; no ejecuta búsquedas externas. El supervisor atiende `/api/admin/dashboard/worker` con `MONITORING_CRON_SECRET` cada minuto y drena pendientes. La interfaz consulta cada cinco segundos solamente mientras se prepara, durante un máximo de tres minutos.
- Detalle y CSV de APIs/marcas/plazos limitado a 500 filas; agregados usan el alcance completo. Directorio limitado a 500 estudios/5.000 membresías. Se eliminan solamente snapshots inactivos mayores a 14 días; esta entrega no elimina registros de negocio ni instala una política de borrado de eventos crudos. Definir retención de telemetría antes de crecimiento significativo.
- No se capturan contenidos de formularios, términos buscados, documentos, prompts/respuestas, DOM, URLs completas, IP, agentes de navegador ni credenciales. El panel muestra nombres de usuarios y marcas ya autorizados para administración; esos nombres no se envían en eventos de comportamiento. No hay grabación de sesiones.
- Benchmark de wrappers HTTP simulados: p95 aproximado 0,0101 ms apagado y 0,0144 ms encendido (sobrecarga 0,0043 ms). Es evidencia local del wrapper, no una medida de latencia de clientes ni del consumo de PostgreSQL real.

## Operación Dev y Resend

Después de migrar y publicar, activar captura únicamente en el ambiente Dev autorizado. La cuenta inicial se puede provisionar con `ANALYTICS_ADMIN_INITIAL_PASSWORD` mediante `npm run account:provision`; `provisionAnalyticsAdmin` comprueba el UUID del ambiente Dev. Retirar la variable temporal tras crear/verificar la cuenta. La clave no se guarda en Git, documentación ni mensajes.

`POST /api/resend/webhook` requiere `RESEND_WEBHOOK_SECRET`. En Resend configurar el endpoint HTTPS del ambiente elegido y eventos `email.delivered`, `email.bounced`, `email.failed`, `email.complained`, `email.opened`, `email.clicked`. Esta entrega prepara la recepción; configurar la cuenta/secretos de Resend es una operación posterior, no implica enviar correo.

Se verifica HMAC Svix sobre cuerpo original, timestamp dentro de cinco minutos y deduplicación por `svix-id`. `data.email_id` se relaciona con un resumen ya guardado; organización no se acepta del remitente del webhook. Eventos desconocidos se ignoran. Se conserva tipo y hora, sin copiar IP/URL/user agent. Aceptación API no prueba entrega; entrega no prueba lectura. Aperturas son señal secundaria inexacta y clics pueden proceder de escáneres.

Los accesos identificados se registran en servidor después de validar la lectura de un resumen dentro del mismo estudio del usuario. Un ID enviado por el navegador o la vista administrativa de otro estudio no acredita un acceso del destinatario. Para un resumen ya enviado se pueden asociar gestiones auditadas del mismo usuario y estudio durante los siete días posteriores. No demuestra que el acceso provenga del correo ni causalidad; se mantiene separado de los clics del proveedor.

## Verificación reproducible y continuación

```sh
node --import ./tests/ts-loader.mjs --test tests/admin-analytics*.mjs tests/admin-dashboard-ui.test.mjs tests/analytics-capture*.mjs tests/watch-digest*.mjs
npx tsc --noEmit
npm run build
```

Las pruebas usan PostgreSQL descartable y proveedores simulados. El [traspaso](handoffs/2026-10-14-dashboard-admin-uso-costos.md) registra las comprobaciones realmente realizadas, QA visual, PR, publicación Dev y límites. El [plan PostHog](PLAN_POSTHOG_2026-10-14.md) incluye catálogo, identidad opaca, fases, costos, restricciones del plan gratuito y rollback; aún no hay SDK ni conexión a PostHog.
