# Integración con el motor de cruces

## Límite de responsabilidad

El motor de cruces no forma parte de este repositorio ni del alcance del frontend. Se trata como un servicio externo y versionado. Buho Marc prepara una marca, solicita el procesamiento, recibe resultados normalizados y los presenta al usuario. No conoce ni replica el algoritmo de similitud.

## Contrato de entrada

El backend de Buho Marc envía un trabajo con:

- `job_id`, `brand_id` y `organization_id` opaco.
- Representación denominativa y referencias firmadas a imágenes.
- Clases de Niza, productos o servicios y jurisdicción.
- Fuentes habilitadas y ventana temporal.
- Versión del esquema y clave de idempotencia.
- URL de callback firmada o tópico de respuesta.

No se deben incluir secretos de sesión del usuario. Las URLs a archivos expiran y tienen permisos de solo lectura.

## Contrato de salida

Cada lote de resultados contiene:

- `job_id`, versión del motor y fecha de procesamiento.
- Identificador estable de la publicación fuente.
- Link oficial, fechas, solicitante, número y clases.
- Puntaje total y nivel `high | medium | low`.
- Componentes denominativo, fonético, visual, conceptual y de rubro.
- Explicación breve generada por el motor.
- Estado final del lote y cursor para procesamiento parcial.

El backend valida el esquema, limita valores de puntaje a 0–100, deduplica por fuente e identificador oficial y guarda el payload original para trazabilidad. El frontend nunca consume el motor directamente.

## Estados del trabajo

`queued → dispatched → processing → partial → completed`

La implementación actual crea cada trabajo como `awaiting_engine`. El futuro adaptador debe tomarlo de forma idempotente y cambiarlo a `queued` solo cuando exista una entrega real al sistema de colas; la demo no simula ese avance.

Estados terminales de error: `failed_recoverable`, `failed_permanent`, `cancelled`.

- `queued`: marca aceptada y trabajo creado.
- `dispatched`: solicitud entregada al adaptador.
- `processing`: confirmación del motor.
- `partial`: llegaron resultados utilizables, pero faltan fuentes o lotes.
- `completed`: el motor cerró el procesamiento.
- `failed_recoverable`: reintento automático permitido.
- `failed_permanent`: requiere intervención o corrección de datos.

## Idempotencia y duplicados

- Una creación de marca genera una clave idempotente por organización, marca y versión de configuración.
- Reintentar un callback con el mismo `event_id` no vuelve a insertar resultados.
- Una restricción única combina `organization_id`, `source`, `source_record_id` y `brand_id`.
- El motor debe aceptar el mismo `job_id` sin iniciar un segundo procesamiento.
- Un trabajo atascado se reanuda desde el último cursor confirmado.

## Entrega y seguridad

- Preferencia: cola o webhook firmado con HMAC y timestamp.
- Rechazar mensajes fuera de ventana, firmas inválidas y versiones de esquema desconocidas.
- Responder al callback rápidamente; normalizar y persistir en un consumidor asíncrono.
- Usar dead-letter queue después del máximo de reintentos.
- Rotar credenciales sin interrumpir trabajos activos.

## Actualización del frontend

El frontend consulta exclusivamente al BFF:

- `GET /api/brands/:id` para el estado visible.
- `GET /api/monitoring-jobs/:id` para progreso y errores.
- `GET /api/matches?brand_id=...` para resultados ordenados.
- SSE opcional en `/api/organizations/:id/events` para actualizar contadores y bandejas.

Mientras espera muestra el estado, fuentes pendientes, última actualización y acción de reintento cuando corresponda. Un resultado parcial puede revisarse, pero debe indicar qué fuentes continúan pendientes.

## Eventos de dominio

- `brand.monitoring_requested`
- `monitoring_job.dispatched`
- `monitoring_job.partial_results_received`
- `monitoring_job.completed`
- `monitoring_job.failed`
- `match.created`
- `match.reviewed`
- `match.converted_to_case`

Cada evento lleva un ID único, versión, timestamp, organización y correlación. El payload de auditoría nunca depende de que el motor siga disponible.
