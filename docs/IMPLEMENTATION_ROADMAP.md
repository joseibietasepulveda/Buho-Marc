# Hoja de ruta de implementación

**Estado actualizado al 2 de octubre de 2026, ambiente Dev.** Las guías vigentes están en el [índice](README.md), [UI/UX de octubre](UX_OCTUBRE_2026.md) e [Informes de factibilidad](INFORMES_FACTIBILIDAD_2026-10-02.md). [V1_0_RELEASE.md](V1_0_RELEASE.md) conserva la entrega inicial. Las fases históricas siguientes no vuelven a abrir funcionalidades entregadas.

## Entregado en octubre

- [x] Buscador general sobre datos guardados con acceso al expediente por marca, cliente, RUT, solicitud, registro, representante y contraparte.
- [x] Búsqueda combinada para agregar marcas; carteras por titular/representante, candidatos explicados, confirmación de cliente y rol, deduplicación e incorporación por lotes.
- [x] Excel/CSV ampliado a solicitudes, RUT, razones sociales y representantes, sin atribuir clientes automáticamente.
- [x] Filtros de factibilidad, agrupación arriba activada inicialmente y seis modos de coincidencia donde corresponde; límites de recuperación explicados.
- [x] Mis marcas con solicitud primero, sin RUT visible ni filtro Real/Mock, estados en texto y pendientes «5+ por revisar».
- [x] Casos simple/detallado en tablero, lista y calendario; prioridad editable y expediente defendido organizado.
- [x] Cierre exterior de paneles, retirada/limpieza de notificaciones y eliminación de tareas desde listas/editor.
- [x] Informe de cliente Excel/Word/PDF con columnas seleccionables y datos completos guardados.
- [x] Informe de factibilidad PDF/Word según el ejemplo del cliente, coberturas completas y conclusión/firma al final.
- [x] Perfil opcional del estudio persistente y editable; precarga verificada en Dev para Zamora IP, Daniel/De Las Heras y FA.
- [x] OpenRouter preparado con contexto completo, registros de generación/uso/costo, deduplicación y respaldo determinista; pruebas con proveedor aislado.
- [x] Compilación, pruebas dirigidas, piloto descartable, revisión de seis variantes PDF/Word y publicación funcional `b42ae34` en Dev.

## Pendientes actuales relacionados

- [ ] Configurar una clave real de OpenRouter en Dev y verificar la llamada real; hoy la ausencia de credencial mantiene el respaldo determinista.
- [ ] Archivo completo de estudios, imágenes propuestas y almacenamiento general de adjuntos; los perfiles y contextos/resultados de conclusiones ya se guardan.
- [ ] Filtro de estados previo a recuperar candidatos en la fuente, catálogo de estados y mejora de exhaustividad/cargas tardías.
- [ ] Calibración de semejanza con revisión humana, operación a escala, respaldos/observabilidad, correo externo e invitaciones/permisos avanzados.
- [ ] Promoción de las mejoras de octubre a producción, solo cuando se solicite expresamente.

> Historial del 10 de septiembre de 2026: el alcance vigente y los pendientes de v0.4 están en [V0_4_RELEASE.md](V0_4_RELEASE.md). Este documento conserva el contexto anterior; las restricciones sobre calendarios, cartera, notificaciones y vigilancia quedan reemplazadas por las decisiones de v0.4.

## Base entregada en esta demo

- [x] Esquema PostgreSQL y migración inicial.
- [x] CRUD demostrativo de marcas, casos y miembros.
- [x] Revisión y conversión transaccional de coincidencias precargadas.
- [x] Tablero de casos con arrastre entre tres etapas, coincidencias desvinculables con confirmación, notificaciones gestionables y auditoría básica.
- [x] Tareas jurídicas persistentes por caso, con texto libre, tres estados y resumen de pendientes asociado al caso.
- [x] Directorio de clientes editable y Administrador de fuente con ficha legible e historial de consultas.
- [x] Seguimiento de inscripción para escritorio con gestiones y activadores diferenciados, concurrencia de oposición/fondo, estados basados en actuaciones y 22 ejemplos simulados separados de la cartera.
- [x] Revisor de factibilidad de escritorio con texto, imagen local, clases Niza acumulativas, resumen de riesgo y cuatro resultados mock explicables.
- [x] Despliegue preparado para Railway con modo local de respaldo.
- [x] Autenticación de cuentas piloto y aislamiento por organización.
- [ ] Archivos, email real, permisos avanzados, recordatorios y operación productiva.
- [x] Proveedor de expedientes INAPI, seguimiento, historial de consultas y novedades.
- [x] Comparación ampliable de logos e historial de actuaciones sin estados inexistentes.
- [x] Integración real de semejanza para vigilancia y prefactibilidad, con estados, evidencia y seguimiento.
- [ ] Filtro API por estado y catálogo exacto de estados: pendientes de la siguiente versión; un rechazo puede tener recursos o instancias posteriores.

## Fase 0 — decisiones y diseño técnico

- Confirmar proveedor de identidad, PostgreSQL, almacenamiento y cola.
- Cerrar el contrato versionado con el motor de cruces.
- Completar la integración de constancias de notificación/ejecutoria y un calendario plurianual para automatizar las reglas documentadas en [REGISTRATION_PROCESS_REVIEW.md](REGISTRATION_PROCESS_REVIEW.md).
- Convertir el mockup en un pequeño sistema de componentes documentado.

Criterio de salida: contratos aprobados, ambientes definidos y datos sensibles clasificados.

## Fase 1 — plataforma base

- Autenticación y membresía por organización.
- Esquema inicial, migraciones, auditoría y aislamiento.
- CRUD de marcas, cupo de plan y archivos.
- Cola de trabajos y adaptador simulado del motor.
- Estados de loading, error, vacío y éxito conectados a API real.

Criterio de salida: una organización puede crear una marca, verla procesando y auditar toda la operación.

## Fase 2 — coincidencias

- Consumir resultados normalizados del motor.
- Extender el motor al flujo previo a la inscripción: búsqueda denominativa y fonética, similitud visual, cruce de clases Niza y explicación por candidato.
- Calibrar probabilidades de observación formal y de fondo con datos históricos revisados por especialistas.
- Bandeja, filtros persistentes, vistas guardadas y detalle lateral.
- Conversión transaccional a caso.
- Actualización en tiempo real por SSE o polling adaptativo.

Criterio de salida: un resultado se recibe una sola vez, se revisa y puede originar un caso sin perder la comparación.

## Fase 3 — casos, plazos y comunicación

- Completar la página integral de caso sobre la ficha lateral existente.
- Ampliar las tareas ya implementadas con vencimientos, responsables y recordatorios; agregar comentarios, actividad y documentos.
- Plazos versionados, recordatorios e historial.
- Plantillas de comunicación versionadas, copia y confirmación manual de envío, sin exponer borradores como estado de producto.
- Persistencia de solicitudes de registro, eventos inmutables de estado y vínculo con el expediente oficial.
- Completar calendario versionado de días hábiles y notificaciones idempotentes de próximos vencimientos. La sincronización de estados desde API ya está implementada.

Criterio de salida: el equipo puede gestionar una causa completa y demostrar quién cambió cada dato.

## Fase 4 — operación y lanzamiento

- Dashboard con consultas agregadas y métricas de producto.
- Observabilidad, alertas, rate limits, backups y restauración.
- Pruebas de aislamiento, accesibilidad, responsive y carga.
- Migración de datos, capacitación breve y runbooks de soporte.

Criterio de salida: pruebas críticas aprobadas, restauración ensayada y monitoreo operativo activo.

## Pruebas imprescindibles

- Una organización nunca puede leer o modificar datos de otra.
- Crear una marca dos veces con la misma clave no duplica trabajos.
- Repetir una consulta o reintentar un trabajo no duplica coincidencias.
- Convertir la misma coincidencia dos veces produce un solo caso.
- Un cambio de plazo cancela y recrea recordatorios correctamente.
- Cada modificación relevante aparece en auditoría con actor y fecha; no se exige al usuario documentar fundamentos de decisiones.
- Navegación completa por teclado, foco visible y etiquetas que no dependan solo del color.
- Formularios conservan borradores ante errores recuperables.
- Una transición recibida dos veces desde la API no duplica el historial ni las notificaciones de la solicitud.
- Un estado sin plazo legal fijo no genera fecha de vencimiento; una fecha fuente ausente se presenta como pendiente de confirmar.

## Priorización histórica — septiembre de 2026

[UX_RELEASE_PLAN.md](UX_RELEASE_PLAN.md) conserva el alcance de septiembre. El buscador general se implementó en octubre; su exclusión anterior dejó de aplicar. La priorización actual y las entregas verificadas están al comienzo de este documento.
