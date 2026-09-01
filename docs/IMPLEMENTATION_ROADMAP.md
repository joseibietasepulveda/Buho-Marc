# Hoja de ruta de implementación

## Base entregada en esta demo

- [x] Esquema PostgreSQL y migración inicial.
- [x] CRUD demostrativo de marcas, casos y miembros.
- [x] Revisión y conversión transaccional de coincidencias precargadas.
- [x] Tablero de casos con arrastre entre cuatro etapas, coincidencias desvinculables con confirmación, notificaciones gestionables y auditoría básica.
- [x] Despliegue preparado para Railway con modo local de respaldo.
- [ ] Autenticación, archivos, email real, permisos, recordatorios y operación productiva.
- [ ] Motor de cruces y fuentes oficiales, deliberadamente fuera de alcance.

## Fase 0 — decisiones y diseño técnico

- Confirmar proveedor de identidad, PostgreSQL, almacenamiento y cola.
- Cerrar el contrato versionado con el motor de cruces.
- Definir fuentes oficiales y responsabilidades legales sobre plazos.
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
- Bandeja, filtros persistentes, vistas guardadas y detalle lateral.
- Registro inmutable de decisiones.
- Conversión transaccional a caso.
- Actualización en tiempo real por SSE o polling adaptativo.

Criterio de salida: un resultado se recibe una sola vez, se revisa y puede originar un caso sin perder la comparación.

## Fase 3 — casos, plazos y comunicación

- Tablero y página completa de caso.
- Tareas, comentarios, responsables, actividad y documentos.
- Plazos versionados, recordatorios e historial.
- Plantillas de comunicación versionadas, copia y confirmación manual de envío, sin exponer borradores como estado de producto.

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
- Repetir un callback no duplica coincidencias.
- Convertir la misma coincidencia dos veces produce un solo caso.
- Un cambio de plazo cancela y recrea recordatorios correctamente.
- Cada decisión relevante aparece en auditoría con actor, fecha y evidencia.
- Navegación completa por teclado, foco visible y etiquetas que no dependan solo del color.
- Formularios conservan borradores ante errores recuperables.
