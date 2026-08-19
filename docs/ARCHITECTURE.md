# Arquitectura propuesta

## Alcance

La base actual ya implementa un BFF en Next.js, PostgreSQL, migraciones y aislamiento lógico por organización para la demo. El motor que encuentra y puntúa coincidencias se mantiene como una caja negra externa; Buho Marc solo prepara su entrada, reserva su cola de trabajos y documenta la salida esperada.

## Estado implementado

- Next.js 16, TypeScript y Route Handlers.
- PostgreSQL mediante Drizzle ORM y migraciones versionadas.
- Datos demo idempotentes y modo local sin base.
- Altas de marcas, casos y miembros; revisiones, conversiones, cambios de etapa y borradores persistentes.
- Auditoría básica de las mutaciones principales.
- Configuración de despliegue y health check para Railway.

Siguen pendientes identidad real, permisos efectivos, archivos, correo, recordatorios asíncronos y el motor externo.

## Capas recomendadas

### Frontend

- Next.js 16 con App Router y TypeScript.
- Componentes accesibles propios o Radix UI; estilos con Tailwind y variables del sistema visual existente.
- React Hook Form + Zod para formularios y validación compartida.
- TanStack Query para datos remotos, caché e invalidación.
- TanStack Table para listados densos; dnd-kit para kanban; FullCalendar para agenda; Recharts solo para indicadores que aporten decisión.
- Subidas directas a almacenamiento mediante URLs firmadas.
- Estados de carga con skeletons breves; errores recuperables con reintento; confirmación explícita para cambios irreversibles.

### Backend for Frontend

- Route Handlers o un servicio TypeScript separado cuando aumente la carga.
- API orientada a recursos con comandos explícitos para transiciones: revisar coincidencia, convertir en caso, mover caso, generar borrador.
- PostgreSQL administrado para datos transaccionales y auditoría.
- Almacenamiento S3/R2 para archivos; la base guarda metadatos, hashes y permisos.
- Cola administrada para trabajos asíncronos. El BFF crea trabajos, pero no ejecuta el motor de cruces.
- Scheduler para recordatorios, reintentos y vencimientos.

### Identidad y aislamiento

- Autenticación con proveedor OIDC.
- Membresía mediante `organization_members`.
- Toda consulta y mutación exige `organization_id` validado en servidor.
- Nunca se acepta un `organization_id` del cliente sin contrastarlo con la sesión.
- Políticas de base de datos o repositorios que obliguen a incluir el contexto organizacional.
- Todos los usuarios comparten permisos en el MVP, pero las operaciones quedan preparadas para roles futuros.

## Flujo de creación de marca

1. El cliente valida campos básicos y conserva el borrador.
2. `POST /api/brands` valida sesión, membresía, cupo, duplicados y archivos.
3. En una transacción crea `brand`, clases, archivos y un `monitoring_job` con clave idempotente.
4. La implementación demo responde con la foto actualizada y deja la marca en `Procesando` y el trabajo en `awaiting_engine`.
5. Publica el evento `brand.monitoring_requested`.
6. Un adaptador envía el trabajo al motor externo.
7. El frontend consulta `GET /api/monitoring-jobs/:id` o recibe actualizaciones por SSE.
8. Cada transición genera un `audit_event`.

## Revisión y conversión en caso

La revisión usa control optimista solo para comentarios y asignaciones de bajo riesgo. Descartar o convertir en caso espera confirmación del servidor. `POST /api/matches/:id/reviews` registra la evidencia visible, el usuario y la fecha. `POST /api/matches/:id/convert-to-case` crea el caso y conserva una referencia inmutable a la coincidencia original dentro de la misma transacción.

## Plazos y correos

- Los plazos guardan fecha legal, fecha interna, fuente, regla y estado de verificación.
- Cambiar un plazo crea una versión histórica y reprograma recordatorios de forma idempotente.
- El backend genera el borrador desde una plantilla versionada; el usuario lo edita y copia.
- Marcar como enviado registra una acción manual. El MVP no envía correos.

## Observabilidad y seguridad

- Logs estructurados con `request_id`, `organization_id`, `user_id` y objeto afectado.
- Métricas para latencia, fallos, profundidad de cola, trabajos atascados y tiempo de revisión.
- Rate limits por organización y usuario.
- Cifrado en tránsito y reposo; malware scanning para archivos.
- Backups con restauración probada y ambientes separados para desarrollo, staging y producción.
- Auditoría append-only para altas, decisiones, asignaciones, plazos, archivos y comunicaciones.
