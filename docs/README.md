# Documentación de Buho Marc

Actualizada el 5 de octubre de 2026. La ronda más reciente implementa las maquetas aprobadas, los tres pasos de factibilidad, .xls antiguo, feedback de vigilancia, Clientes, Usuarios y Bitácora. Se publicó **únicamente en Railway Dev**: despliegue `3857245e-4072-4785-b9f0-698bb3c8cd90`, estado `SUCCESS`, migraciones correctas y salud 200/base conectada. Producción conserva su despliegue anterior. La entrega de informes del día 2 cargó los perfiles de los tres estudios. El informe de protección registra ahora una copia puntual cifrada de Dev, creada y comprobada antes de publicar con acceso SSH temporal ya retirado; automatización, restauración de ensayo y protección de producción siguen pendientes.

## Guías vigentes

| Documento | Contenido |
| --- | --- |
| [README del proyecto](../README.md) | Funciones, inicio local, configuración y límites actuales. |
| [Implementación de maquetas · 4 de octubre](UX_IMPLEMENTACION_OCTUBRE_2026.md) | Alcance aprobado, tres pasos, Excel antiguo, feedback, directorios, auditoría y verificación local. |
| [Comparador e informe UI/UX](../output/implementacion-ux-2026-10-04/comparador-ui-ux.html) | A/B y pantalla anterior, recorridos, capturas, móvil y exportaciones reales de prueba. |
| [Pulido del 4 de octubre](UX_PULIDO_2026-10-04.md) | Distribución de factibilidad, letras, tareas, X, bandeja de Todas y limpieza de prioritarias sin retirar avisos. |
| [UI y UX de octubre](UX_OCTUBRE_2026.md) | Buscadores, filtros, importación por personas/representantes, Excel, informes de clientes, Casos, paneles, notificaciones y tareas. |
| [Informes de factibilidad](INFORMES_FACTIBILIDAD_2026-10-02.md) | Formato PDF/Word, datos del estudio, perfiles preparados, OpenRouter y respaldo determinista, API, pruebas y publicación. |
| [Arquitectura](ARCHITECTURE.md) | Componentes implementados, flujos y propuestas de evolución diferenciadas. |
| [Modelo de datos](DATA_MODEL.md) | Persistencia y migraciones, perfiles y generaciones de conclusiones; modelos propuestos identificados. |
| [Railway](RAILWAY_DEPLOYMENT.md) | Variables, migraciones, precarga en Dev, verificación y antecedentes de despliegue. |
| [Protección y recuperación de bases](PROTECCION_BASES_DE_DATOS_2026-10-05.md) | Informe transferible: evidencia de Dev y producción, respaldos pendientes, PITR, copia externa, restauraciones, alertas y criterios de aceptación. |
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

Las [decisiones del 24 de septiembre](DECISIONES_UX_2026-09-24.md) incorporan referencias a las entregas posteriores. Los documentos v0.4/v0.5, la entrega inicial [v1.0](V1_0_RELEASE.md), [UX_RELEASE_PLAN](UX_RELEASE_PLAN.md) y los recorridos anteriores conservan contexto histórico. Para el código local prevalece [Implementación de maquetas](UX_IMPLEMENTACION_OCTUBRE_2026.md); los registros de despliegue de las rondas anteriores describen el estado publicado en ese momento.

No confundir un informe generado con un estudio archivado completo: se persisten los datos del estudio y los contextos/resultados de conclusiones; las imágenes propuestas y los adjuntos generales aún no tienen almacenamiento duradero. OpenRouter está preparado y probado en aislamiento, pero requiere una clave real para activarse en Dev. El [archivo de ejemplo](../openrouter.example.txt) explica su configuración; los archivos privados y las credenciales no se publican.
