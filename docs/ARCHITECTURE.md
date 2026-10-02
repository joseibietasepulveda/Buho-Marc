# Arquitectura · v1.0

## Alcance

La aplicación implementa un BFF en Next.js, PostgreSQL, sesiones y aislamiento por organización. En v1.0, Dev consulta el motor externo INAPI / DeQuiénEs, guarda resultados y revisiones y ejecuta vigilancia mediante una cola persistente supervisada. El contrato vigente está en `lib/similarity-contract.ts` y `lib/similarity-provider.ts`; el despliegue y sus límites se documentan en [Railway](RAILWAY_DEPLOYMENT.md) y en las [entregas de octubre](README.md). DeQuiénEs pertenece al mismo equipo; «proveedor» describe su función técnica.

## Estado implementado

- Next.js 16, TypeScript y Route Handlers.
- PostgreSQL mediante Drizzle ORM y migraciones versionadas.
- Datos demo idempotentes, PostgreSQL local independiente y respaldo de interfaz en el navegador; este respaldo no sustituye la persistencia del servidor.
- Alta real de cartera por solicitud, marca, titular o representante; búsqueda combinada de candidatos y carga asistida Excel/CSV con confirmación de cliente/rol y deduplicación. Casos, miembros, conversiones, desvinculación, etapas y notificaciones persistentes; los fixtures se mantienen separados de la cartera real.
- Clientes editables y tareas de casos persistentes con estados `not-applicable`, `pending` y `completed`.
- Proveedor INAPI, registros de fuente, snapshots por expediente, revisiones programadas/manuales e historial de consultas. El Administrador de fuente es de solo lectura cuando el proveedor es INAPI.
- Seguimiento de registros con gestiones y hechos activadores diferenciados, plazos concurrentes y 22 escenarios ficticios separados de la cartera. Reglas de LPI/RLPI en un módulo compartido y calendario nacional LPI/LBPA limitado a 2026–2027.
- Factibilidad real por nombre, imagen y coberturas, hasta 100 candidatos, filtros de fecha enviados a la fuente y filtros sobre el lote recuperado. Agrupación inicial activa. Informes PDF/Word con perfil de estudio persistente y conclusión asistida o determinista, sin probabilidades jurídicas derivadas del ranking.
- Informes de cliente Excel/Word/PDF por columnas elegidas, usando datos guardados y respetando organización/cliente. Buscador general sobre datos locales con vínculos a fichas.
- Vigilancia real: 50 resultados de stock, cinco visibles y ampliación de cinco; búsquedas separadas de ingresos y publicaciones, persistencia de decisiones, reintentos y recuperación por token de ejecución.
- Tablero de casos con `dnd-kit` para mover una tarjeta completa entre tres etapas sin recargar la pantalla.
- Auditoría básica de las mutaciones principales.
- Configuración de despliegue y health check para Railway.

Sesiones, aislamiento entre organizaciones y conexión con el motor externo ya están implementados. Quedan pendientes permisos granulares adicionales, archivos permanentes, correo externo y los puntos de la siguiente versión indicados en `V1_0_RELEASE.md`.

El Canvas de registros combina solicitudes persistidas en PostgreSQL con antecedentes del proveedor y una vista separada de 22 escenarios ficticios. La proyección actual se guarda como JSONB y no debe confundirse con un historial jurídico normalizado: una versión de producto deberá almacenar cada transición como evento fechado e inmutable, junto con su fuente y antecedente activador. El respaldo de interfaz usa `localStorage`; los flujos persistentes siguen necesitando PostgreSQL.

El Revisor de factibilidad envía la propuesta a `/api/similarity`, que valida el archivo y consulta la API externa desde el servidor. La imagen viaja como multipart (`options` e `image`) y no se guarda como estudio permanente. El servidor completa estados e historiales por lote. El puntaje de fusión ordena resultados; calibrar relevancia y acordar filtros por estado siguen pendientes.

## Perfil del estudio y generación del informe · octubre

`GET/PUT /api/report-profile` lee y guarda el perfil opcional de la organización. La versión evita sobrescribir una edición concurrente; el servidor valida y normaliza el logo y registra auditoría sin repetir su binario. La precarga de los tres estudios solo se ejecuta en el Dev identificado y con perfil vacío/versionado en cero.

`POST /api/feasibility/conclusions` valida el contexto de hasta 100 resultados y obtiene el perfil desde la sesión. `db/feasibility-conclusions.ts` asigna UUID y persiste el contexto antes de llamar al proveedor, serializa la reclamación de trabajo por organización y libera la transacción antes de la llamada externa. Una solicitud concurrente recibe 202 y consulta `GET /api/feasibility/conclusions/[id]`; otras organizaciones reciben 404.

`lib/openrouter-conclusion.ts` envía los antecedentes textuales completos a OpenRouter desde el servidor. Valida la respuesta, las solicitudes citadas y la decisión expresa del autor; sin clave o ante fallo usa `lib/feasibility-conclusion.ts`. Las respuestas equivalentes se reutilizan y los intentos abandonados se conservan. PDF/Word consumen la misma conclusión, sin repetir la búsqueda. Un motivo escrito por el abogado se utiliza directamente.

`lib/feasibility-report.ts` (`pdf-lib`) y `lib/feasibility-docx.ts` (`docx`) generan los documentos en el navegador, con coberturas completas y datos opcionales del estudio. Guardar un contexto textual de conclusión no archiva el binario de la imagen propuesta ni el documento exportado. Contratos, límites y pruebas en [Informes de factibilidad](INFORMES_FACTIBILIDAD_2026-10-02.md).

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

## Flujo implementado de incorporación de cartera

1. El usuario combina criterios en Agregar marcas o carga un Excel/CSV. `POST /api/inapi/search` recupera candidatos desde la fuente; `POST /api/portfolio/import` resuelve los pasos de la carga asistida.
2. La interfaz explica coincidencias por titular/representante, reúne solicitudes duplicadas y pide confirmar cartera propia, cliente y rol por expediente, o dejarlo expresamente sin cliente.
3. La incorporación autenticada valida organización e identidades, consulta el expediente y clasifica registro acreditado o solicitud según antecedentes de INAPI. Los expedientes existentes conservan vínculos; los errores de un lote no borran lo ya incorporado.
4. La cartera y sus snapshots quedan en PostgreSQL. Las novedades de expediente y la vigilancia de similitudes mantienen sus flujos independientes. Expedientes contrarios se incorporan desde Casos con su rol de terceros.

Los modelos de archivos/cola administrada y las capas recomendadas de este documento son propuestas de evolución; no describen endpoints adicionales publicados.

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
