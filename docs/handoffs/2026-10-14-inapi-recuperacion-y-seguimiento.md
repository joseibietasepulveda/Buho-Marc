# Traspaso: consulta directa INAPI y explicación de fechas pendientes

- Actualizado: 2026-10-14, America/Santiago
- Estado: en curso
- Rama y base: `codex/inapi-recuperacion-y-seguimiento`; base actualizada `2f1538ee674f29f4b6d3a0750a71ba312fec6d2d`, incluidos los PR #88/#89 publicados por el usuario durante esta entrega; incorporados sin conflictos.
- PR y commit de entrega: pendientes.

## Objetivo y alcance

El usuario solicita corregir la consulta pública directa a INAPI, revisar los casos restantes de todas las cuentas y sustituir mensajes genéricos de plazo indeterminado por el antecedente faltante y la próxima revisión. Publicar solo en Dev. Antes de modificar, pidió comprobar las carteras de FA y Juan Pablo en producción.

## Cambios y archivos relevantes

Implementado local: `officialContext` en `lib/inapi-official.ts`, `lib/registration-follow-up.ts`, botón/estado en `app/app/registrations.tsx`, `POST /api/registrations/review`, comprobación persistente en `db/inapi-official-check.ts` y migración0018; presupuesto común en `db/inapi-recovery.ts`. `lib/inapi-provider.ts` reconoce el rechazo confirmado por el historial, sin aplicar una fecha legal ficticia. No cambiar las reglas de aceptación administrativa/executoria confirmadas el 14/10 ni promover producción.

## Decisiones y motivos

- Usuario: consulta/revisión de todas las cuentas y entrega exclusivamente Dev.
- Hecho verificado: lectura de producción del 14/10, usando exactamente la proyección de GET registros: FA 76 y Juan Pablo 65 solicitudes propias; cero obligaciones marcadas `attention=pending` y cero fichas con ese indicador. Se identifican seis y una decisiones `decision-review`, respectivamente, que no permiten afirmar la existencia de una obligación nueva sin revisar su resultado.
- Hecho verificado: carteras restantes tienen un procedimiento de nulidad pendiente en producción; Dev además tiene un incidente pendiente. No se registran clientes, marcas, expedientes, datos personales ni respuestas completas en este documento.
- Usuario (respuesta posterior): opción3, conservar programación actual y revisión a pedido; botón como máximo una vez al día, «Cargando…» y mensaje sin novedades/mañana. Se descarta crear tareas o nuevos horarios automáticos. Agente: límite por expediente/día civil de Santiago compartido entre carteras; incluye fallos y comparte el presupuesto de200 con recuperación.
- No inventar fecha de ejecutoria ni próxima consulta automática. Distinguir seguimiento del equipo y programación real del proveedor. Mantener presupuestos, reloj compartido y separación entre Dev y producción.

## Coordinación e integración

Reutiliza el worktree limpio `/tmp/buho-regla-pago-20261014.FmbU9C/worktree`, con rama nueva propia desde Dev. La raíz original sigue con Git dañado; no se altera. `registration-procedure`, proyección de fuente y API de solicitudes tienen consumidores en agenda/resumen/recuperación; verificar contratos compartidos. No copiar carteras de producción a Dev para pruebas.

## Verificación

Lecturas SQL `read only` en Dev y producción:128 y246 solicitudes. Nueva proyección offline mantiene una nulidad pendiente en producción y nulidad/incidente en Dev; identifica44 y29 expedientes en espera/seguimiento respectivamente, sin duplicar miembros de una misma organización. Los siete casos `decision-review` coinciden en «Denegada», rechazo previo recurrido, fallo convalidante y firmeza el mismo día; la nueva regla conserva los eventos y reconoce rechazo final, pendiente de contraste oficial puntual.

Cierre sobre base2f1538:100/100 pruebas aprobadas (87 de procedimiento/contexto/evidencia/recuperación/limitación/renovación/calendario y evaluación administrativa;13 adicionales de pago administrativo y programación). Ambas integraciones usan PostgreSQL aislado. Build/TypeScript y ESLint dirigido aprobados. Se corrigió una propiedad de constructor incompatible con la ejecución TypeScript en modo strip; se repitió la integración y pasó.

Comandos reproducibles: `node --import ./tests/ts-loader.mjs --test tests/inapi.test.mjs tests/inapi-context.test.mjs tests/inapi-procedure.test.mjs tests/inapi-recovery.test.mjs tests/inapi-recovery-integration.test.mjs tests/inapi-official-check-integration.test.mjs tests/registration-procedure.test.mjs tests/registration-follow-up.test.mjs tests/registration-evidence.test.mjs tests/registration-activity.test.mjs tests/registration-renewal.test.mjs tests/legal-calendar.test.mjs tests/admin-evaluations.test.mjs`; `node --import ./tests/ts-loader.mjs --test tests/administrative-payment.test.mjs tests/source-schedule.test.mjs`; `npm run build`; `npx eslint` sobre los doce archivos TypeScript/TSX modificados.

QA autenticada aislada:puertos3115/55715, fuentes ficticias y sin salida a proveedores. Se observó «Cargando…», mensaje exacto sin novedades, bloqueo tras recargar, aceptación nueva y pago con vencimiento11/01/2027. Dos consultas con tres peticiones cada una; repetir la primera por API devuelve429, sin sesión401, origen ajeno403, expediente fuera de cartera404; ninguna añade peticiones. Sin tareas nuevas. Se corrigió diferencia artificial de campos vacíos en eventos y se repitieron pruebas.

Consulta puntual de página base desde Railway Dev mediante el reloj compartido:HTTP200 y contexto literal presente. No se consulta un expediente ni se modifica fuente en ese diagnóstico.

Lecturas SQL `read only` en Dev y producción. Producción recuperación directa desactivada, conforme política de trabajador único. Archivos de auditoría privados temporales y clave SSH temporal; retirar al cerrar. Sin llamadas OpenRouter ni cambios de producción.

## Pendientes y siguiente paso

Publicar únicamente Dev, verificar migración/contratos y realizar diez consultas oficiales puntuales bajo el mismo presupuesto y reloj para los antecedentes restantes. Registrar resultados y límites sin copiar carteras de producción a Dev. No habilitar recuperación de producción ni tocar su información.
