# Arquitectura propuesta

## Alcance

La base actual ya implementa un BFF en Next.js, PostgreSQL, migraciones y aislamiento lógico por organización para la demo. El motor que encuentra y puntúa coincidencias se mantiene como una caja negra externa; Buho Marc solo prepara su entrada, reserva su cola de trabajos y documenta la salida esperada.

## Estado implementado

- Next.js 16, TypeScript y Route Handlers.
- PostgreSQL mediante Drizzle ORM y migraciones versionadas.
- Datos demo idempotentes, PostgreSQL local independiente y respaldo de interfaz en el navegador; este respaldo no sustituye la persistencia del servidor.
- Altas simuladas de marcas por número de registro INAPI o por RUT, casos y miembros; revisiones, conversiones, desvinculación de coincidencias, cambios de etapa y notificaciones persistentes.
- Clientes editables y tareas de casos persistentes con estados `not-applicable`, `pending` y `completed`.
- Proveedor INAPI, registros de fuente, snapshots por expediente, revisiones programadas/manuales e historial de consultas. El Administrador de fuente es de solo lectura cuando el proveedor es INAPI.
- Seguimiento de registros con gestiones y hechos activadores diferenciados, plazos concurrentes y 22 escenarios ficticios separados de la cartera. Reglas de LPI/RLPI en un módulo compartido y calendario nacional LPI/LBPA limitado a 2026–2027.
- Revisor de factibilidad frontend con texto, vista previa de imagen, clases Niza acumulativas, resumen probabilístico y cuatro coincidencias mock explicables.
- Tablero de casos con `dnd-kit` para mover una tarjeta completa entre tres etapas sin recargar la pantalla.
- Auditoría básica de las mutaciones principales.
- Configuración de despliegue y health check para Railway.

Siguen pendientes identidad real, permisos efectivos, archivos, correo, recordatorios asíncronos y el motor externo.

El Canvas de registros combina solicitudes persistidas en PostgreSQL con antecedentes del proveedor y una vista separada de 22 escenarios ficticios. La proyección actual se guarda como JSONB y no debe confundirse con un historial jurídico normalizado: una versión de producto deberá almacenar cada transición como evento fechado e inmutable, junto con su fuente y antecedente activador. El respaldo de interfaz usa `localStorage`; los flujos persistentes siguen necesitando PostgreSQL.

El Revisor de factibilidad también es una simulación frontend. La imagen se mantiene sólo durante la sesión del navegador y no se sube al servidor. Los porcentajes, similitudes y explicaciones están curados para el caso “Cafeteras Mistral”; una implementación real deberá producirlos mediante servicios independientes de búsqueda denominativa/fonética, comparación visual, cruce de clases Niza y calibración de riesgo.

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
- API orientada a recursos con comandos explícitos para transiciones: revisar coincidencia, convertir en caso, mover caso y gestionar una notificación.
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

1. El cliente solicita un número de registro INAPI y valida su formato básico.
2. `POST /api/brands` valida sesión, membresía, cupo, duplicados y archivos.
3. En una transacción crea `brand`, clases, archivos y un `monitoring_job` con clave idempotente.
4. La implementación demo devuelve parámetros ficticios y presenta la marca en monitoreo; en persistencia deja un trabajo `awaiting_engine` listo para el motor externo.
5. Publica el evento `brand.monitoring_requested`.
6. Un adaptador envía el trabajo al motor externo.
7. El frontend consulta `GET /api/monitoring-jobs/:id` o recibe actualizaciones por SSE.
8. Cada transición genera un `audit_event`.

## Revisión y conversión en caso

La revisión usa control optimista solo para comentarios y asignaciones de bajo riesgo. Descartar o convertir en caso espera confirmación del servidor. `POST /api/matches/:id/reviews` registra la evidencia visible, el usuario y la fecha. `POST /api/matches/:id/convert-to-case` crea el caso y conserva una referencia inmutable a la coincidencia original dentro de la misma transacción.

## Plazos y notificaciones

- Los plazos guardan fecha legal, fecha interna, fuente, regla y estado de verificación.
- Cambiar un plazo crea una versión histórica y reprograma recordatorios de forma idempotente.
- La demo muestra notificaciones de publicación y vencimiento, con contenido de referencia copiable; no expone una etapa de borrador.
- Marcar una notificación como gestionada registra una acción manual. El MVP no envía correos.
- Las solicitudes de registro deben guardar la fecha fuente, regla aplicada, calendario de feriados utilizado y estado de verificación. Si falta la fecha fuente, el BFF debe devolver un vencimiento no confirmado en vez de estimarlo.
- Los estados sin plazo público fijo, como el examen de fondo INAPI, no generan cuenta regresiva. Las ventanas próximas a vencer y vencidas alimentan el centro de notificaciones.

## Observabilidad y seguridad

- Logs estructurados con `request_id`, `organization_id`, `user_id` y objeto afectado.
- Métricas para latencia, fallos, profundidad de cola, trabajos atascados y tiempo de revisión.
- Rate limits por organización y usuario.
- Cifrado en tránsito y reposo; malware scanning para archivos.
- Backups con restauración probada y ambientes separados para desarrollo, staging y producción.
- Auditoría append-only para altas, decisiones, asignaciones, plazos, archivos y comunicaciones.

## v0.4: agenda y notificaciones compartidas

`RegistrationProvider` comparte solicitudes y tareas entre resumen, lista y calendario. `lib/agenda.ts` unifica eventos de casos y solicitudes; `LegalAgenda` conserva las tres categorías y `DeadlineAlerts` muestra urgencias globales. `notification-policy.ts` clasifica hitos relevantes y distingue título emitido de concesión; `source-contract.ts` conserva el cambio auditable. `client-email.ts` produce HTML escapado y texto para copia manual, sin envío. Alcance, flags y API de tareas en [V0_4_RELEASE.md](V0_4_RELEASE.md).

## v0.5: evidencia, cronologías y actualización legible

La entrega está [publicada y verificada en Dev](V0_5_RELEASE.md). El documento de entrega registra compilación, pruebas, recorrido visual y diagnóstico de los 64 expedientes; `main` y producción no se modificaron.

### Separación entre fuente y antecedente del equipo

`inapi-provider.ts` proyecta actuaciones reconocidas, conservando la identidad del acto habilitante; una resolución no es automáticamente una notificación ni una ejecutoria. `registration-evidence.ts` aplica evidencia sólo cuando coincide el ID, la fecha y la descripción del acto vigente, y valida etapa, medio y fecha. El manifiesto `inapi-daily-evidence.ts` acredita 19 aceptaciones a trámite del Estado Diario verificado, sin extender esa prueba a las observaciones de fondo que necesitan constancia electrónica.

`POST /api/registrations/evidence` guarda o revoca antecedentes en el JSONB de la solicitud y registra antes/después en auditoría, dentro de una transacción con bloqueo de fila. Los eventos y snapshots originales no se modifican. Organización y actor se resuelven con la identidad demo del servidor; origen, membresía, esquema y acto vigente se verifican antes de escribir. Una evidencia retirada sigue conservada y una fecha manual no reemplaza la constancia pública verificada.

`GET /api/registrations` reproyecta las copias ya disponibles y aplica evidencia vigente, sin una nueva consulta a INAPI. `registration-procedure.ts` separa plazos legales de controles administrativos e hitos; sólo los plazos y tareas operativos alimentan urgencias. `legal-calendar.ts` usa una versión nacional LPI/LBPA 2026–2027 y devuelve falta de cobertura fuera del período, sin extrapolar feriados. Los límites jurídicos están en [Proceso y plazos](PROCESO_Y_PLAZOS_MARCAS_CHILE.md) y [Calendario legal](CALENDARIO_LEGAL_CHILE_2026_2027.md).

### Interfaz compartida

- Los enlaces de ambos resúmenes seleccionan directamente el calendario correspondiente; Solicitudes abre en tarjetas cuando no hay una selección explícita. La búsqueda «contiene» filtra la cartera local; el alta mantiene la consulta exacta disponible en su fuente.
- `notification-timeline.ts` reúne historiales y deltas disponibles, preserva detalles y versiones anteriores y deduplica por identidad de actuación, con fecha/descripción como respaldo. Evita incorporar historiales de solicitudes homónimas cuando el vínculo es ambiguo. Prioritarias presenta esa información en un panel lateral; Todas mantiene sus desplegables.
- `GET /api/source/status` es una lectura ligera, sin payloads de expedientes ni errores internos. Distingue última corrida y última revisión completa exitosa; las incorporaciones y cargas iniciales no cuentan como actualización de toda la cartera. `source-schedule.ts` calcula las 12:30 p. m. en `America/Santiago` para la fecha correspondiente, incluyendo el cambio de horario. Si el scheduler está deshabilitado, no promete una ejecución próxima.
- `db/demo-v05.ts` y `demo-v05-data.ts` actualizan fixtures conocidos de forma idempotente, con fechas activas desde el 30 de septiembre. El navegador migra sus ejemplos por separado y no aplica esa política a las proyecciones reales. No se envían correos ni se recalculan fechas reales para mejorar la apariencia de la demo.
