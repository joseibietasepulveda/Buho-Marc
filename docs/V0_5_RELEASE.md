# v0.5 — seguimiento procesal y ajustes de uso

Entrega publicada y verificada el 10 de septiembre de 2026 en [Railway Dev](https://buho-marc-web-dev.up.railway.app/app). `main` y producción se conservan sin cambios.

## Criterios tras investigar

- Publicación efectiva → 30 días hábiles para oposición; nunca tres días. El cierre temporal no equivale a concesión, ausencia de oposiciones ni resolución de INAPI.
- No existe un plazo especial general de N días desde la publicación para que INAPI observe o conceda. Los controles de demora administrativa requieren condiciones propias y no son plazos fatales del abogado.
- Se verificó el Estado Diario de 4 de septiembre de 2026: 19 aceptaciones a trámite permiten acreditar notificación por ese medio. Las 45 observaciones de fondo requieren constancia electrónica; su aparición en el diario no acredita el depósito en casilla.
- No sumar tres días a la casilla especial de INAPI. El régimen del domicilio digital único de la Ley 19.880 y sus transitorios se distingue de esa casilla.
- Evidencia asociada al acto preciso y no sólo a la solicitud: una fecha no se reutiliza para resoluciones posteriores.
- Cambiar únicamente vencimientos de demostración: fechas desde el 30 de septiembre de 2026. Nunca desplazar actuaciones o vencimientos reales de INAPI para mejorar la demo.

## Lista de entrega

- [x] Acceso desde Agenda Legal del resumen al calendario de Casos; equivalencia tipográfica con Bandeja de revisión.
- [x] Buscador de cartera por «contiene» y controles de igual altura.
- [x] Revisión diaria: 12:30 p. m., hora de Santiago; última consulta real y próxima ejecución, sin inventar fechas de consulta.
- [x] Más casos de demostración y vencimientos mock desde el 30 de septiembre; migración idempotente y persistencia local/Dev verificadas, preservando ediciones del usuario.
- [x] Plazos y seguimiento basados en investigación, evidencia de notificación y explicaciones de espera/falta de antecedentes.
- [x] Resumen de registros: enlace al calendario completo y tamaños equivalentes en Actividad del expediente.
- [x] Factibilidad: formulario compacto, búsqueda aproximada legible y botón de ejemplo con espacio interior.
- [x] Solicitudes: tarjetas predeterminadas, macrosecciones equivalentes; próximo a vencer rojo y vencido negro.
- [x] Calendario de solicitudes: un único botón principal morado para agregar tarea.
- [x] Prioritarias: panel lateral con notificación y cronología contextual; detalles de cada hito desplegables. Todas conserva su presentación.
- [x] Próximas versiones: separación clara entre grupos y corrección de plazos TDPI no generalizables.
- [x] Documento completo del proceso, fuentes, condiciones de cálculo y diferencias respecto del diagrama.
- [x] Versión v0.5; compilación y pruebas; verificación visual de los flujos.
- [x] Copia local actualizada y reiniciada con su base independiente.
- [x] Dev publicado y verificado; conteo final de los 64 expedientes originales con explicación de los pendientes.

## Verificación antes de publicar

- `npm run build`: compilación de producción y TypeScript correctos.
- Suite completa de 23 archivos: **130 pruebas aprobadas, cero fallos y cero omitidas**. Incluye HTTP de tareas/antecedentes e integración completa de fuente en una base local desechable. Los fixtures y la base temporal fueron retirados al finalizar.
- Lint de archivos modificados: cero errores; tres advertencias de optimización de imágenes en factibilidad.
- [QA visual](V0_5_QA.md): enlaces, medidas de encabezados/controles/tarjetas, búsqueda parcial, panel lateral y acordeón verificados en navegador.
- Renovación: conserva fecha intrínseca, mantiene la ventana posterior aunque la fuente indique `expired` y ajusta sólo su cierre inhábil. El cierre es un plazo legal; los otros hitos no se confunden con alertas fatales.

## Publicación y verificación remota

- Código: `a1cef3c6b9c0a0fc5b20612edecb50e4d8eb13c1`, rama `dev`.
- Despliegue Railway: `90f85558-9d2e-424d-a6df-45368ac4a076`, estado **SUCCESS**. La compilación remota y TypeScript también finalizaron correctamente.
- Navegador remoto: v0.5 visible; resumen con 100 expedientes reales, 19 plazos fechados y 45 pendientes; ficha RTsalud con respaldo público, regla de 20 días y vencimiento 05/10/2026.
- Notificación real de MOTE CON HUESILLO EL COPIHUE DE LONQUÉN: panel de alto completo, 49 hitos, fechas históricas y referencias desplegables; se comprobó el detalle con código 009, descripción y versiones de identificadores.
- Horario: última revisión completa realmente registrada el 10/09/2026 a las 13:14 de Santiago; próxima programada el 11/09/2026 a las 12:30 p. m. No se ejecutó una revisión externa para esta comprobación.
- Dev tiene 9 casos. Todas las fechas activas informadas son desde el 30/09/2026; se preservaron tareas/gestiones sin fecha y modificaciones del usuario. Local tiene 12 solicitudes simuladas, sin vencimientos legales anteriores al 30/09/2026; `/api/health` responde 200.

## Resultado de las 64 gestiones inicialmente sin fecha

| Grupo | Antes | Verificado después de desplegar |
| --- | ---: | --- |
| Aceptadas a trámite; requerir/pagar publicación | 19 sin fecha | 19 con notificación acreditada el 04/09/2026; plazo calculado al **05/10/2026**. |
| Observaciones de fondo | 45 sin fecha | 45 pendientes de acreditar notificación electrónica/personal por el medio aplicable. El Estado Diario no sustituye esa constancia. |
| Total del grupo original | 64 sin fecha | **19 fechadas, 45 pendientes, 0 fechas provisionales inventadas.** |

La cartera completa conserva otros 36 expedientes: 20 esperan constancia de ejecutoria y 16 siguen en apelación. No se inventa una cuenta regresiva de resolución para ellos ni se mezclan con las 45 respuestas pendientes. Los 19 controles administrativos visibles son distintos de los plazos legales y no elevan las alertas fatales.

Se compararon antes/después los 200 payloads `inapi` conservados por la fuente, ordenados por solicitud y serializados canónicamente: mismo SHA-256 `3189b487d6fd8c0f0e5fd7d319dc12c479c2ab27bf5ac0945ad89d4fd82ced5a`. También coinciden los identificadores, estados y fechas de presentación/publicación de las 100 solicitudes: `06cc255e58816df06393b63839d6fa5022ae6a7bbd1c830f6b20c754ab32b4c4`. Comprobación del 10/09/2026, 17:27 y 17:35 UTC. Las nuevas fechas son una proyección con evidencia, no una alteración del expediente de INAPI.

La investigación completa y sus fuentes están en [Proceso y plazos de marcas en Chile](PROCESO_Y_PLAZOS_MARCAS_CHILE.md). El calendario automático cubre 2026–2027 y no sustituye calendarios CPC, reglas regionales ni validación de años posteriores. Resend y los demás desarrollos futuros siguen identificados como pendientes; no se presentan como funciones de esta entrega.
