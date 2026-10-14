# Traspaso: dashboard de administración, costos y comportamiento

- Actualizado: 14 de octubre de 2026, 12:47, America/Santiago.
- Estado: integrado y publicado exclusivamente en Dev; verificaciones locales y remotas aprobadas.
- Rama y base: `codex/admin-dashboard-analytics`; Dev `bd59c865d8aab1c9ea9056e22dedefaf33e2a92f`.
- PR y commit de entrega: [PR #82](https://github.com/joseibietasepulveda/Buho-Marc/pull/82), funcional `07a7c820594de2b960065a3a7728e0ea877d2fa2`; merge Dev `d0d2879d83efb9f4959fc93c2e050f076a8e05bb`. Railway `3131c88a-3e6f-4ea1-87e2-52abed8ab399` SUCCESS para ese SHA exacto.

## Objetivo y alcance

El usuario solicitó todas las métricas propuestas: usuarios/actividad, tareas creadas/asignadas/completadas, cartera/responsables, alertas/valoración humana/tiempos, plazos próximos, correos y acciones posteriores, costos y llamadas a cada API. Énfasis costos; interacciones semanales por usuario con vista gráfica; filtro por estudio/usuario/período y comparación con período anterior. Acceso de administrador en `/app/admin/dashboard`, login dedicado y usuario `admin`. Autorizó conexiones necesarias en Dev y pidió impacto mínimo sobre latencia. Solicitó un plan PostHog; no activación ni nueva cuenta externa. No hay autorización para nuevas llamadas OpenRouter; pruebas locales con proveedores simulados.

## Cambios y archivos relevantes

- Dashboard siete pestañas en `app/app/admin/dashboard/`, estilos propios `app/app/admin/analytics.css`, contrato `lib/admin-analytics.ts`, backend `db/admin-analytics.ts` y `/api/admin/dashboard`/`worker`.
- Costos confirmados desde ledgers nativos GLM/factibilidad; estimados/tarifas manuales/gastos fijos/presupuestos separados; llamadas físicas sin duplicar costo al enlazar telemetría con el ledger. Desconocido no equivale a cero. Períodos Chile.
- Migración `0017_admin_analytics.sql`: eventos/HTTP/correo/reglas/snapshots/responsables y columnas nullable creador/completador/fecha en tareas. Datos antiguos se conservan sin inventar autoría. Numeración requiere revalidar Dev al integrar.
- Telemetría permitida en `lib/analytics-capture.ts`, `lib/analytics-telemetry.ts` y `AnalyticsObserver`; lote cliente de15s, cola servidor limitada con conexión independiente máximo1 y registro posterior a la respuesta. No payloads, URLs, búsquedas, documentos, marcas, RUT, IP, claves ni contenido DOM. Auditoría financiera/operativa durable sigue siendo la fuente principal.
- Transportes DeQuiénEs/INAPI/imagenes/OpenRouter/Resend medidos en puntos físicos; no llamadas nuevas ni clonación de cuerpos. La duración termina al recibir cabeceras HTTP. Automatizaciones no se atribuyen como clics humanos.
- Login `/admin/login` dedicado fuera de layout autenticado; `/app/admin` protegido por administrador interno Búho (no basta ser admin de otro estudio). `proxy.ts` solo marca rutas admin para redirección, sin afectar APIs/otras rutas. Cuenta Dev `admin` provisionada solo con clave inicial y cambio obligatorio, nunca reemplaza credenciales existentes.
- Tareas registran creador/completador reales desde esta entrega y auditoría de transición; asignación explícita de responsable de marca desde dashboard. No confundir titular de marca con usuario.
- Webhook Resend con firma Svix sobre cuerpo original, ventana5min e idempotencia; cuenta entregas/bounces/clicks futuros sin IP/UA/URL. No se configura ni envía correo con esta entrega.
- Accesos identificados a resumen se registran en `GET /api/watch/digest` solo tras lectura autorizada dentro del mismo estudio; se separan de clics Resend. Gestiones auditadas del mismo usuario durante siete días se asocian temporalmente, sin presumir canal email ni causalidad. El navegador no acredita un run privado.
- [Plan PostHog](../PLAN_POSTHOG_2026-10-14.md): fuentes oficiales, identidad opaca, catálogo seguro, fases, rendimiento y costos; no SDK ni conexión.

## Decisiones y motivos

Confirmadas: dashboard completo, costos prioritarios, gráficos por usuario, APIs aparte, administrador y Dev, mínimo impacto, plan de comportamiento PostHog.
Técnicas: snapshots persistidos calculados por trabajador independiente; no agregaciones pesadas en procesos de usuario; cola acotada/best effort para clicks/HTTP y ledgers nativos durables para dinero. Historial incompleto se etiqueta, nunca se rellena con cero. No sesiones/replay ni autocapture externo. Login existente permanece `/ingresar`; el login comercial futuro `/app/login` no se implementa en esta tarea. Origen production sigue `rcirculo.com`, Dev Railway. No se modifica DNS, landing ni producción.

## Coordinación e integración

Trabajo en checkout aislado propio `/Users/rosariovial/.codex/worktrees/vigilancia-correo-semanal/Buho-Marc`; repositorio principal preservado por problemas Git/iCloud. Subtareas del mismo chat compartieron archivos con responsabilidades explícitas: frontend, backend/schema y plan PostHog; raíz integra instrumentación/auth. No se trabajó sobre carpetas de otros chats. Cambios compartidos: layouts/auth/login/clave, API de tareas/demo, scripts de provisión/supervisión, adaptadores de APIs, esquema/journal y firma opcional de `readDigestAgenda` para usar conexión independiente; llamadas existentes conservan parámetros por defecto.

Leídos `docs/COST_CONTROL.md`, README y decisiones UX. Acuerdo `DOMINIO_Y_ACCESO_2026-10-13.md` releído desde el repositorio principal; no está integrado en esta base Dev. No se copia ni altera el trabajo ajeno. Fetch Dev repetido: conserva `bd59c86`, sin colisión de migración0017. Publicación, migración y cuenta `admin` verificadas en Dev. Captura activa. Producción no autorizada ni modificada en esta entrega.

## Verificación

Paquete final de regresiones backend/frontend/captura/digest/proveedores/imagen/tareas/trámites: 123 aprobadas, cero fallos y una HTTP optativa omitida (`TASK_TEST_BASE_URL` no configurada); los endpoints vigentes de tareas se cubren en integración PostgreSQL descartable nueva. Autenticación/tareas nuevas: cinco aprobadas, incluido cambio obligatorio de contraseña, revocación de otras sesiones y aislamiento. Benchmark HTTP simulado de1000 muestras: wrapper p95 apagado0,0101ms/encendido0,0144ms; sobrecarga aproximada0,0043ms. No representa latencia real de clientes. TypeScript y ESLint de57 archivos aprobados. `npm run build -- --webpack` aprobado; configuración temporal sin caché por espacio local restaurada, sin cambios de dependencias. Primera compilación detectó dependencia Node que llegaba al cliente a través de `similarity-state`; se separó la proyección pura en `lib/inapi-procedure.ts` sin cambiar reglas y se conservó reexportación compatible desde `inapi-provider`. Se repitieron51 pruebas de trámites y el paquete final. QA de navegador pasó14 comprobaciones en siete pestañas, escritorio y390px; costos/agregar/eliminar, responsable, comparación, CSV y gráficos; cero errores JS. Capturas propias ignoradas en `outputs/admin-dashboard/`. Publicación y verificación Dev completadas; detalle debajo. Servidor3448 y PostgreSQL55472 propios cerrados; archivos Next autogenerados propios retirados sin alterar instrucciones del repositorio principal. No llamadas pagadas ni correos reales ejecutados.

Documentación funcional en [DASHBOARD_ADMIN_2026-10-14.md](../DASHBOARD_ADMIN_2026-10-14.md), enlazada desde README. Respaldo cifrado Dev14/10 antes de migrar:238.905.507 bytes; SHA-256 `e0961ec70b966c74cf5526e9c74d9b3e0cacc65b3ab6d669f427560294cb99b8`, transferencia y descifrado verificados; no ensayo de restauración. Archivo y clave privados separados fuera del repositorio; respaldo previo13/10 preservado. Captura Dev activa `true`; no se agregaron claves OpenRouter/Resend ni programación nueva de revisión de marcas. Clave SSH temporal propia retirada de Railway y copias locales eliminadas; cuenta de administrador usa clave privada y cambio obligatorio, sin variable temporal de contraseña en Railway.

## Verificación Dev y entrega

- Railway confirmó SUCCESS en `3131c88a-3e6f-4ea1-87e2-52abed8ab399`, commit exacto `d0d2879d83efb9f4959fc93c2e050f076a8e05bb`. Compilación/TypeScript remotos y arranque aprobados.
- Hash migración0017 verificado en `drizzle.__drizzle_migrations`; seis tablas disponibles. Cuenta nueva `admin` creada dentro de organización interna; no se alteraron credenciales existentes. Ninguna variable inicial de password quedó en Railway.
- HTTP real: API sin sesión401, página307→`/admin/login`, contraseña temporal→cambio obligatorio y API403, cambio de clave válido→página/API200. Chrome sobre Dev: siete pestañas con resumen real y cero errores JS. Solo se consultaron datos guardados; no se probaron botones de inferencia/envío.
- Worker sobre cinco organizaciones:1.936ms incluyendo consulta adicional de comprobación, ejecutado fuera del proceso de usuario. No es un benchmark de latencia bajo carga. Se conservan359 marcas; ledgers mantienen60 intentos GLM y17 conclusiones, idénticos al corte anterior a esta QA. No hubo llamadas pagadas ni correos de prueba.
- Sesiones de QA propias revocadas; cuenta `admin` devuelta a cambio obligatorio de clave. Credenciales y evidencia remota en archivos privados fuera de Git; no documentar valores ni adjuntar capturas con nombres de usuarios/clientes al PR. Las capturas versionables del diseño son de fixtures, en salida ignorada local.
- Secretos de Resend y PostHog no configurados. No se promovió a Main ni se modificaron producción, DNS o Google Workspace.

## Pendientes y siguiente paso

1. El usuario abre `/admin/login` en Dev con `admin` y la clave temporal privada entregada fuera del chat/Git, y elige su contraseña. La actividad nueva se acumula desde captura; no rellenar semanas anteriores con datos ficticios.
2. Ingresar tarifas/suscripciones reales en Costos cuando se conozcan; hasta entonces las cifras sin costo acreditado siguen parciales. No sincroniza facturas externas.
3. Cuando Resend esté disponible, configurar webhook/secretos y comprobar entrega firmada con un correo autorizado. Por ahora conserva ausencia de medición, no estima aperturas/lectura.
4. PostHog sigue como plan: proyecto/ambiente y límite de gasto, catálogo opaco permitido, integración gradual/outbox, embudos/cohortes y verificación de privacidad/rendimiento. Replay y grupos pagados permanecen pendientes de decisión.
5. Definir retención de eventos crudos antes de crecimiento significativo y medir carga real con/sin captura si aumenta el volumen. Solo snapshots tienen limpieza de14 días. Evaluar indicación de invitados sin ingreso y tiempo de atención con datos nuevos; historial anterior no permite reconstruirlos.
6. La cola de clics/timing es best effort; para dinero/acciones jurídicas conservar los ledgers y auditoría durables. Contadores de API incluyen intentos/reservas históricos, incluso interrupciones de red; no prueban que el proveedor haya recibido cada solicitud ni que cobró por ella.
