# v0.5 — seguimiento procesal y ajustes de uso

Entrega en preparación, 10 de septiembre de 2026. Destino autorizado: Dev; no promover a `main` ni producción.

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
- [x] Más casos de demostración y vencimientos mock desde el 30 de septiembre; migración idempotente y persistencia local verificadas. La comprobación remota se registra al publicar.
- [x] Plazos y seguimiento basados en investigación, evidencia de notificación y explicaciones de espera/falta de antecedentes.
- [x] Resumen de registros: enlace al calendario completo y tamaños equivalentes en Actividad del expediente.
- [x] Factibilidad: formulario compacto, búsqueda aproximada legible y botón de ejemplo con espacio interior.
- [x] Solicitudes: tarjetas predeterminadas, macrosecciones equivalentes; próximo a vencer rojo y vencido negro.
- [x] Calendario de solicitudes: un único botón principal morado para agregar tarea.
- [x] Prioritarias: panel lateral con notificación y cronología contextual; detalles de cada hito desplegables. Todas conserva su presentación.
- [x] Próximas versiones: separación clara entre grupos y corrección de plazos TDPI no generalizables.
- [x] Documento completo del proceso, fuentes, condiciones de cálculo y diferencias respecto del diagrama.
- [x] Versión v0.5; compilación y pruebas; verificación visual de los flujos.
- [ ] Copia local actualizada y reiniciada con su base independiente.
- [ ] Dev publicado y verificado; conteo final de los 64 expedientes originales con explicación de los pendientes.

## Verificación antes de publicar

- `npm run build`: compilación de producción y TypeScript correctos.
- Suite completa de 23 archivos: **130 pruebas aprobadas, cero fallos y cero omitidas**. Incluye HTTP de tareas/antecedentes e integración completa de fuente en una base local desechable. Los fixtures y la base temporal fueron retirados al finalizar.
- Lint de archivos modificados: cero errores; tres advertencias de optimización de imágenes en factibilidad.
- [QA visual](V0_5_QA.md): enlaces, medidas de encabezados/controles/tarjetas, búsqueda parcial, panel lateral y acordeón verificados en navegador.
- Renovación: conserva fecha intrínseca, mantiene la ventana posterior aunque la fuente indique `expired` y ajusta sólo su cierre inhábil. El cierre es un plazo legal; los otros hitos no se confunden con alertas fatales.

La investigación se documenta en [Proceso y plazos de marcas en Chile](PROCESO_Y_PLAZOS_MARCAS_CHILE.md). El resultado remoto y el conteo de los 64 se completarán tras comprobar el despliegue de Dev.
