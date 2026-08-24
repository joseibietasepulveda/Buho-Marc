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
- `legal_deadlines(id, organization_id, case_id, match_id, brand_id, legal_date, internal_date, source, rule_code, verification_status, status)`.

`source_match_id` se conserva mientras la coincidencia forme parte del caso. La acción explícita **Sacar de caso** puede dejarlo en `NULL`, libera `matches.case_id`, devuelve la coincidencia a estado `Pendiente` y registra el cambio en `audit_events`; cerrar un caso por sí solo no desvincula la comparación.

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
