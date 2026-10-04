# Documentación de Buho Marc

Actualizada el 4 de octubre de 2026. Las guías de octubre describen las funciones implementadas y sus comprobaciones. El pulido más reciente reorganiza el revisor y las notificaciones, amplía letras y centra las acciones de eliminación. Destino: Railway Dev. La entrega de informes del día 2 terminó en `SUCCESS` y cargó los perfiles de los tres estudios.

## Guías vigentes

| Documento | Contenido |
| --- | --- |
| [README del proyecto](../README.md) | Funciones, inicio local, configuración y límites actuales. |
| [Pulido del 4 de octubre](UX_PULIDO_2026-10-04.md) | Distribución de factibilidad, letras, tareas, X, bandeja de Todas y limpieza de prioritarias sin retirar avisos. |
| [UI y UX de octubre](UX_OCTUBRE_2026.md) | Buscadores, filtros, importación por personas/representantes, Excel, informes de clientes, Casos, paneles, notificaciones y tareas. |
| [Informes de factibilidad](INFORMES_FACTIBILIDAD_2026-10-02.md) | Formato PDF/Word, datos del estudio, perfiles preparados, OpenRouter y respaldo determinista, API, pruebas y publicación. |
| [Arquitectura](ARCHITECTURE.md) | Componentes implementados, flujos y propuestas de evolución diferenciadas. |
| [Modelo de datos](DATA_MODEL.md) | Persistencia y migraciones, perfiles y generaciones de conclusiones; modelos propuestos identificados. |
| [Railway](RAILWAY_DEPLOYMENT.md) | Variables, migraciones, precarga en Dev, verificación y antecedentes de despliegue. |
| [Control de consumo](COST_CONTROL.md) | Programación por cartera, lecturas y reutilización de conclusiones. |
| [Integración INAPI](inapi-dev.md) | Contrato utilizado, capacidades nuevas y límites de recuperación. |
| [Guía de recorrido](DEMO_GUIDE.md) | Demostración de las funciones actuales y uso de ejemplos aislados. |
| [Hoja de ruta](IMPLEMENTATION_ROADMAP.md) | Entregado, pendiente e historial. |
| [QA visual](../design-qa.md) | Evidencia de pantalla y revisión completa de PDF/Word. |

## Pilotos y operación

- [Daniel Morales](PILOTO_DANIEL.md): acceso, importación, oposiciones y perfil De Las Heras.
- [FA y cuenta de prueba](PILOTO_FA_Y_PRESENTACION_2026-10-01.md): configuración de cuentas, carga de producción autorizada el 1 de octubre y perfiles de informes preparados en Dev el día 2.
- [Vigilancia · revisión del 28 de septiembre](VIGILANCIA_REVISION_2026-09-28.md), [plan](VIGILANCIA_REAL_PLAN.md) y [handoff](VIGILANCIA_REAL_HANDOFF.md): reglas y decisiones de vigilancia. Los cambios de octubre no modifican su programación.
- [Proceso y plazos](PROCESO_Y_PLAZOS_MARCAS_CHILE.md), [revisión procesal](REGISTRATION_PROCESS_REVIEW.md) y [calendario 2026–2027](CALENDARIO_LEGAL_CHILE_2026_2027.md): antecedentes jurídicos, reglas implementadas y límites de cómputo.

## Vigencia e historial

Las [decisiones del 24 de septiembre](DECISIONES_UX_2026-09-24.md) incorporan referencias a las entregas posteriores. Los documentos v0.4/v0.5, la entrega inicial [v1.0](V1_0_RELEASE.md), [UX_RELEASE_PLAN](UX_RELEASE_PLAN.md) y los recorridos anteriores conservan contexto histórico. Ante diferencias de búsqueda, columnas, Casos o informes, prevalecen las guías del 2 y 4 de octubre y el código vigente.

No confundir un informe generado con un estudio archivado completo: se persisten los datos del estudio y los contextos/resultados de conclusiones; las imágenes propuestas y los adjuntos generales aún no tienen almacenamiento duradero. OpenRouter está preparado y probado en aislamiento, pero requiere una clave real para activarse en Dev. El [archivo de ejemplo](../openrouter.example.txt) explica su configuración; los archivos privados y las credenciales no se publican.
