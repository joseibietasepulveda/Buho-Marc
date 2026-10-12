# Traspaso: notificación asumida el mismo día de la actuación

- Actualizado: 2026-10-12, America/Santiago.
- Estado: listo para revisión; no integrado ni publicado.
- Rama y base: `codex/notificaciones-fecha-evento`; `origin/dev` actualizado, base `b8495b6`.
- Carpeta: `/Users/rosariovial/.codex/worktrees/notificaciones-fecha-evento/Monitoreador Logos`.
- PR: [#24 hacia Dev](https://github.com/joseibietasepulveda/Buho-Marc/pull/24). Commit funcional y documental: `af0af7c`. No integrado ni publicado.

## Objetivo y alcance

Decisión explícita del usuario del 12/10: el proyecto asumirá que las notificaciones ocurren el mismo día que el cambio de estado; calcular los plazos actualmente indeterminados con esa regla y actualizar documentación vigente. El cambio de estado se identifica con la actuación procedimental que origina cada obligación (`event_date`), no con la fecha de detección, consulta o guardado del proveedor.

## Decisiones y motivos

- Usuario: convención de notificación el mismo día del evento para completar cálculos.
- Agente: conservar prioridad de una fecha de notificación acreditada y de un vencimiento explícito válido. Marcar cada cálculo que usa la convención; no alterar el historial original ni fabricar constancias.
- Agente: la convención corresponde a notificación. Publicación efectiva, ejecutoria, renovación, cumplimiento, suspensión y rol siguen sus reglas; no se presume ejecutoria con la aceptación.

## Coordinación e integración

La herramienta de creación administrada falló en la búsqueda de referencia del repositorio compartido. Se creó un worktree Git aislado desde el repositorio privado de publicación ya usado por este chat y se actualizó por avance rápido a `origin/dev`, preservando otros trabajos. `attach_worktree` rechazó este checkout por no ser administrado; el aislamiento Git está comprobado. No se modificó el checkout compartido ni el trabajo documental anterior.

## Cambios y archivos relevantes

Implementado: `lib/registration-procedure.ts` aplica la convención por obligación y devuelve `notificationDateAssumed`; `app/app/registrations.tsx` y `app/app/page.tsx` muestran la procedencia; `app/app/registration-evidence-editor.tsx` explica la prioridad de la fecha acreditada. `recoveryNeeds` hereda el cálculo compartido y deja de preparar consultas de notificación cuando basta la actuación fechada. No se cambian esquemas, datos crudos, pruebas ni tareas/avisos históricos.

La documentación canónica es [notificación el día del evento](../NOTIFICACION_MISMO_DIA_EVENTO_2026-10-12.md); README, proceso, revisión, integración/API, modelo, arquitectura, calendario, consumo y decisiones apuntan a ella. Los informes anteriores conservan su contexto fechado.

## Verificación

- 55/55 pruebas aprobadas con `node --import ./tests/ts-loader.mjs --test tests/notification-event-assumption.test.mjs tests/registration-procedure.test.mjs tests/registration-evidence.test.mjs tests/inapi-procedure.test.mjs tests/inapi-recovery.test.mjs tests/inapi-recovery-integration.test.mjs`. PostgreSQL de integración aislado: cancelación/ausencia de consultas innecesarias, deduplicación y separación persistente mínima de 3 segundos.
- 19 pruebas adicionales aprobadas (renovación, adaptador INAPI y contratos fuente); la integración HTTP optativa se omitió porque está fijada a los puertos 3000/55433 y este chat usa 3147/5647. No se reutilizó la instancia de otro chat.
- `npm run build` aprobado con Next/Turbopack y TypeScript. El primer intento falló por un enlace de dependencias fuera de la raíz; se reemplazó por copia local mediante clonefile y se repitió con éxito. Sin cambios de versiones.
- ESLint de los cuatro archivos de producción modificados: sin errores ni advertencias. `git diff --check` sin errores.
- QA visual de tarjetas y detalle con fixtures ficticios: fecha asumida visible, prioridad de fecha acreditada, obligaciones concurrentes y ejecutoria pendiente. Base local propia, scheduler desactivado y respuestas de registros simuladas en el navegador. Revisión React: propiedades derivadas, sin nuevas solicitudes, hooks ni dependencias. Servidor propio detenido.
- Lecturas SQL en transacciones de sólo lectura de Main (16:50:42 UTC) y Dev (16:50:52 UTC), 12/10/2026. Reproyección idéntica a `GET /api/registrations`, comparación de la política anterior/nueva sobre los mismos registros y pruebas. Main: 71 de 75 obligaciones legales pendientes recuperan fecha; Dev: 55 de 57. No sumar ambientes como expedientes únicos. Quedan 3 cálculos anteriores al calendario validado y procedimientos de nulidad/incidente que necesitan reglas específicas.
- Cero consultas nuevas a INAPI/DeQuiénEs y cero escrituras en bases alojadas. Acceso SSH temporal registrado y retirado; claves eliminadas. Evidencia privada y listado por cartera en `output/notificacion-fecha-evento-2026-10-12/`, excluidos de Git; no se versionan datos personales ni respuestas completas.

## Pendientes y siguiente paso

Revisar e integrar este cambio en Dev. No requiere reproyección persistente, migraciones, `--apply --queue` ni nuevas extracciones: las lecturas/fichas/agenda derivan los plazos del historial guardado. Confirmar estado de publicación antes de decir que los clientes ya ven las nuevas fechas. Promoción a Main pendiente de autorización para esta entrega, según la sección 2 de las instrucciones del repositorio aportadas por el usuario. Al publicar, conservar cada base y verificar salud/commit; no trasladar carteras ni regenerar avisos históricos. Ampliar calendario 2020–2022 y mapear incidentes/nulidad son trabajo posterior, con sus antecedentes y reglas propias.
