# Modelo de datos inicial

## Convenciones

- Identificadores UUIDv7: únicos, ordenables por tiempo y seguros fuera de la base.
- Todas las tablas de negocio incluyen `organization_id`, `created_at` y `updated_at`.
- Borrado lógico para marcas, coincidencias y casos; archivos físicos se eliminan mediante una política de retención.
- Fechas legales en `date`; eventos y auditoría en `timestamptz` UTC.
- Restricciones e índices siempre incluyen el límite organizacional cuando corresponda.

## Núcleo organizacional

- `organizations(id, name, slug, status)`; `slug` único.
- `users(id, external_auth_id, email, name)`; email normalizado con índice único.
- `organization_members(id, organization_id, user_id, created_at)`; único por organización y usuario.
- `plans(id, code, name, brand_limit)`.
- `subscriptions(id, organization_id, plan_id, status, period_start, period_end)`; una activa por organización.

## Marcas y procesamiento

- `brands(id, organization_id, owner_name, name, word_mark, registration_number, jurisdiction, registration_date, description, status, monitoring_config, created_by, last_reviewed_at, archived_at)`.
- `brand_classes(brand_id, nice_class, description)`; PK compuesta.
- `brand_files(id, organization_id, brand_id, file_id, role)`.
- `monitoring_jobs(id, organization_id, brand_id, status, idempotency_key, engine_version, requested_by, started_at, completed_at, last_cursor, error_code)`.
- `monitoring_job_attempts(id, monitoring_job_id, attempt_no, status, started_at, completed_at, error_payload)`.

Índices: marcas por organización/estado; trabajos por estado/fecha; clave idempotente única por organización.

## Coincidencias y revisión

- `matches(id, organization_id, brand_id, monitoring_job_id, source, source_record_id, official_url, published_at, found_name, applicant, application_number, level, total_score, explanation, review_status, legal_deadline, case_id)`. La interfaz de la demo usa `level` (Alta, Media o Baja) y no muestra el puntaje porcentual.
- `match_scores(match_id, score_type, score, engine_version, evidence)`; único por coincidencia y tipo.
- `match_reviews(id, organization_id, match_id, reviewer_id, decision, reason, comment, comparison_snapshot, created_at)`; append-only.

Restricciones: puntajes entre 0 y 100; una coincidencia solo puede apuntar a un caso; deduplicación única por organización, marca, fuente y registro fuente. Índices para nivel/puntaje, estado, marca, fecha, plazo y caso.

## Casos y plazos

- `cases(id, organization_id, source_match_id, brand_id, client_name, title, description, status, stage, priority, created_by, owner_id, strategy, result, closed_at, close_reason)`.
- `case_members(case_id, user_id)`; PK compuesta.
- `case_tasks(id, organization_id, case_id, title, status, assignee_id, due_at, completed_at)`.

La demo ya persiste `title`, `status`, `assignee_id` y `due_at`. Los estados de interfaz son No aplica (`not-applicable`), Pendiente (`pending`) y Completado (`completed`); al completar se conserva `completed_at`. La fecha interna de la tarea no cambia la fecha de un plazo legal.
- `legal_deadlines(id, organization_id, case_id, match_id, brand_id, legal_date, internal_date, source, rule_code, verification_status, status)`.

`source_match_id` se conserva mientras la coincidencia forme parte del caso. La acción explícita **Sacar de caso** puede dejarlo en `NULL`, libera `matches.case_id`, devuelve la coincidencia a estado `Pendiente` y registra el cambio en `audit_events`; cerrar un caso por sí solo no desvincula la comparación.

## Solicitudes de registro marcario

La demo ya usa `registration_applications` con una proyección JSONB por organización. La normalización siguiente sigue siendo el modelo objetivo para reemplazar esa proyección:

- `trademark_applications(id, organization_id, application_number, brand_name, brand_type, filed_at, holder_rut, holder_name, client_name, logo_file_id, official_url, published_at, registration_number, registration_date, current_status_code, current_phase, created_at, updated_at)`.
- `trademark_application_classes(application_id, nice_class, description)`; PK compuesta.
- `trademark_status_events(id, organization_id, application_id, status_code, occurred_at, source, source_reference, detail, raw_payload)`; append-only y ordenado por fecha.
- `trademark_deadlines(id, organization_id, application_id, status_event_id, rule_code, source_date, due_date, business_days, calendar_version, verification_status, status)`.

`current_status_code` es una proyección para lectura rápida; la fuente de verdad es `trademark_status_events`. Una actualización de la API agrega un evento y recalcula la proyección de forma idempotente. Nunca se persiste una fecha estimada como oficial y los estados sin regla pública fija dejan `due_date` en `NULL`.

## Fuente y sincronización

- `source_records`: copia reemplazable del expediente consultado, identificada por solicitud y registro, con payload y versión.
- `source_snapshots`: antecedente guardado por la organización para una marca o solicitud; permite comparar la siguiente consulta sin alterar la fuente.
- `source_sync_runs`: ejecución inicial, manual o programada, con cantidades solicitadas/recibidas, cambios, avisos, errores y detalle.
- `client_contacts`: ficha editable del cliente como JSONB versionado dentro de la organización.

La fuente INAPI es de solo lectura desde el Administrador. Una revisión actualiza la proyección de cartera y el snapshot de forma idempotente; sólo una diferencia material genera un aviso. La interfaz conserva los códigos originales y presenta etiquetas, fechas y actuaciones en formato legible.

## Revisiones de factibilidad

Modelo propuesto para sustituir la demostración frontend:

- `feasibility_reviews`: organización, usuario, denominación consultada, estado del análisis, probabilidad formal, probabilidad de fondo, versión del modelo y advertencia mostrada.
- `feasibility_review_classes`: relación acumulativa entre revisión y clase Niza.
- `feasibility_review_assets`: referencia privada al logo, huella del archivo, tipo y política de retención; el binario debe vivir fuera de PostgreSQL.
- `feasibility_candidates`: marca encontrada, solicitante, solicitud, estado, clases, fuente, puntaje visual, fonético, conceptual, puntaje combinado y explicación versionada.

Los porcentajes deben conservar la versión del modelo y los insumos utilizados para que una revisión posterior pueda reproducir el resultado. Nunca deben almacenarse como si fueran una actuación oficial de INAPI.

## Colaboración, archivos y comunicación

- `files(id, organization_id, storage_key, original_name, mime_type, size, sha256, uploaded_by, scan_status)`.
- `comments(id, organization_id, entity_type, entity_id, author_id, body, created_at, edited_at)`.
- `notifications(id, organization_id, user_id, entity_type, entity_id, type, urgency, read_at, managed_at)`.
- `email_drafts(id, organization_id, notification_id, template_version, recipient, subject, body, generated_by, generated_at, copied_at, marked_sent_at)`. Es soporte técnico del contenido copiable de una notificación; la demo no expone un flujo ni aviso de borradores.
- `saved_views(id, organization_id, user_id, module, name, filters, sort, is_default)`.
- `audit_events(id, organization_id, actor_user_id, action, entity_type, entity_id, before_data, after_data, request_id, occurred_at)`; append-only y particionable por fecha.

## Integridad y aislamiento

- Las claves foráneas compuestas o validaciones del repositorio impiden cruzar organizaciones.
- No se elimina en cascada desde organización en producción; se usa un proceso controlado de exportación y purga.
- Archivar una marca pausa trabajos futuros, pero no elimina coincidencias ni casos.
- Cerrar un caso no elimina plazos ni actividad.
- La auditoría y los snapshots conservan decisiones aunque cambien datos descriptivos posteriores.

## v0.4: tareas de solicitudes

La migración `0003_huge_blazing_skull.sql` agrega `registration_tasks`, vinculada por organización y solicitud, con fecha civil, responsable del equipo y estado. Las tareas de casos reutilizan `case_tasks.due_at` y `assignee_id`. La fecha interna de una tarea no modifica ningún plazo legal. Las lecturas exponen fechas ISO sin conversión al huso local. Contratos y decisiones en [V0_4_RELEASE.md](V0_4_RELEASE.md).

## v0.5: antecedentes jurídicos y proyecciones de lectura

La implementación utiliza el JSONB existente `registration_applications.data`, sin agregar una tabla de evidencias normalizada:

- `legalEvidence[]` conserva `id`, `kind`, `method`, `date`, `reference`, enlace opcional `sourceUrl`, vínculo exacto `actId`/`actDate`/`actDescription`, `recordedAt`, `recordedBy` y `revokedAt` opcional.
- Los tipos son notificación (`notification`), ejecutoria (`finality`), expediente en estado de resolver (`ready-to-resolve`) y pago del certificado (`certificate-payment`). Cada tipo admite sólo los medios y etapas implementados en `evidenceKindAllowed`.
- La fecha no puede ser futura ni anterior al acto acreditado. Una actuación posterior invalida la aplicabilidad del antecedente anterior; no se reutiliza una fecha sólo porque la solicitud o etapa coincida.
- La revocación conserva el registro con `revokedAt`. Reemplazar un antecedente del mismo tipo y acto revoca el anterior antes de guardar el nuevo. Ambas acciones generan `audit_events` con antes/después en la misma transacción.
- `procedure` es una proyección derivada. Sus pruebas de notificación, ejecutoria y otros habilitantes distinguen verificación por documento público, equipo o fuente; no sustituyen los eventos ni los snapshots crudos de INAPI.

`POST /api/registrations/evidence` admite `save` y `revoke`, valida origen y esquema estricto, resuelve organización/actor de la identidad demo en el servidor, comprueba membresía y bloquea la solicitud durante la escritura. No acepta actor u organización aportados por el navegador; esto no equivale a autenticación productiva. El endpoint impide reemplazar mediante una fecha manual una notificación ya acreditada por el manifiesto público verificado.

El manifiesto `lib/inapi-daily-evidence.ts` identifica 19 actos exactos de aceptación a trámite: solicitud, identificador/código/descripción del acto, fecha, sección/página, URL y huella del documento. Es evidencia versionada en código, no una marca genérica de que cualquier actuación de esa solicitud esté notificada. `GET /api/registrations` reproyecta los antecedentes existentes y aplica sólo evidencia vigente; una lectura no consulta nuevamente INAPI.

Las fechas calculadas se clasifican como plazo legal (`legal`), control administrativo (`institutional`) o hito informativo (`milestone`). Controles e hitos no incrementan las alertas de plazos vencidos del abogado. El calendario de cómputo está identificado como `CL-LPI-LBPA-NATIONAL-2026-2027-v1`; sus límites están en [Calendario legal Chile 2026–2027](CALENDARIO_LEGAL_CHILE_2026_2027.md).

Las cronologías de notificaciones reutilizan historiales disponibles y deltas antes/después de `change_detail`; conservan IDs y versiones en detalles desplegables. Se deduplican por ID de actuación y, cuando falta, por fecha/descripción. Si una denominación corresponde a expedientes ambiguos, no se incorpora la historia de otro expediente sólo por tener el mismo nombre.

`GET /api/source/status` devuelve únicamente metadatos de revisiones manuales/programadas, hora de consulta, última revisión completa exitosa y próxima ejecución. No expone payloads de expedientes, listas de solicitudes ni errores internos. Una incorporación aislada o carga inicial no se presenta como actualización completa de la cartera.

La actualización de fixtures `db/demo-v05.ts` es transaccional y se marca una sola vez mediante auditoría. Cambia fechas activas de ejemplos conocidos y añade cinco casos/tareas; no desplaza actos reales ni reescribe continuamente fechas según el reloj. El fallback del navegador tiene su actualización local separada. Estado de entrega: [v0.5 verificada en Dev](V0_5_RELEASE.md).
