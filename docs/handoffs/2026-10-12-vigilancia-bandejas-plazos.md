# Traspaso: bandejas de vigilancia, gestiones próximas y renovación

- Actualizado: 2026-10-12, America/Santiago.
- Estado: listo para integración; operaciones de revisión real completadas.
- Rama y base: `codex/vigilancia-bandejas-plazos`; Dev `99fa7f7`.
- Carpeta aislada: `/tmp/buho-vigilancia-elqui-recovery`; se reutiliza el clon privado de este chat tras comprobar que estaba limpio. El checkout original tiene packs de Git dataless y la creación administrada ya falló; no se modifica.
- PR y commit de entrega: pendiente.

## Objetivo y alcance

Usuario: cambiar el KPI a Gestiones por vencer y contar próximas; unir los hallazgos iniciales y posteriores en Novedades por revisar, con En seguimiento como segunda bandeja. Revisar los dos plazos de publicación señalados en Estudio Ibieta IP y agregar un aviso real de un registro que venza en menos de un año, reutilizando la cartera existente o incorporando una marca real si no existe. Alcance Dev y producción autorizado en este chat.

## Decisiones y motivos

Confirmadas por usuario: eliminar la pestaña Antecedentes, conservar búsqueda inicial retrospectiva y vigilancia posterior; revisar fuente para plazos extraños; notificación interna de renovación. Sin llamadas a OpenRouter. No inferir cumplimiento ni fechas oficiales. El aviso de anticipación no equivale al inicio de la ventana legal de renovación.

## Cambios y archivos relevantes

Pendiente tras inspección de `lib/watch-list.ts`, `lib/watch-page.ts`, `lib/watch-view-state.ts`, `app/app/watch-panel.tsx`, `app/app/page.tsx` y proyección INAPI/avisos.

## Coordinación e integración

Contratos compartidos de vigilancia, resumen y notificaciones; preservar seguimiento, valoraciones, procedencia y aislamiento por organización. No cambios de esquema previstos. Integrar a Dev y promover sólo archivos de esta entrega a Main.

## Verificación

Inspección de README, decisiones UX, vigilancia, consumo, plazos, notificación el día de actuación y Railway. Pendiente pruebas/QA/publicación. Evidencia real privada en outputs (ignorado); no versionar datos de clientes ni respuestas completas.

## Pendientes y siguiente paso

Leer historial real guardado y realizar actualización puntual autorizada de los dos expedientes antes de decidir correcciones; revisar fechas de vencimiento guardadas. Implementar bandeja unificada, KPI y aviso idempotente, verificar e integrar.

## Avance de implementación y verificación

- Bandeja inicial/posterior unificada; procedencia y decisiones conservadas. `scope` antiguo se normaliza; `baselineCount=0` temporal. Contadores incluyen destacadas una vez. Pausadas conservan hallazgos iniciales.
- KPI de gestiones usa `workDeadline(...).tone === 'soon'`: hoy y 14 días inclusive; no contar vencidas.
- Avisos de renovación idempotentes en `db/renewal-notices.ts`, derivados de datos guardados. Supervisor revisa también carteras a pedido, sin llamar a fuente ni cambiar su programación. `db/source-sync.ts` emite al completar una revisión. Cambio de expiración/estado invalida sin borrar. Política de prioritarias y UI reconocen recordatorio sin cambios oficiales ficticios.
- CLI puntual `scripts/provision-renewal-example.ts`, fuera del arranque, limitada por IDs exactos Dev/producción y slugs Ibieta/B&E. Sólo añade un registro real en Ibieta si su cartera no tiene una expiración próxima. No copia clientes, decisiones, contraseñas ni avisos entre cuentas.
- 27 pruebas unitarias de bandejas/procedencia/paginación/contadores/fechas/recordatorios aprobadas y 53 de integración aislada/INAPI/renovación/notificaciones/caché, total 80. PostgreSQL de avisos prueba concurrencia, aislamiento, decisiones conservadas, deduplicación y expiración renovada. Dependencias existentes enlazadas desde el checkout privado anterior de este chat; Node >=22.13.
- ESLint de archivos modificados aprobado. Primer build falló por autorreferencia de tipo del parámetro `groups`; corregido a `bands`. `npm run build -- --webpack` aprobado con TypeScript y 36 páginas. Revisión React: contadores derivados; sin nuevas consultas UI ni efectos; pestañas con `aria-pressed`; eliminado `tab` de dependencias del URL constante. `git diff --check` aprobado.
- Consulta real acotada confirmó las actuaciones posteriores de las dos solicitudes señaladas. Posteriormente se revisó toda la cartera de expedientes Ibieta mediante `syncSource('manual')`, una vez por ambiente: 201 solicitados/recibidos, 7 cambios, 6 avisos de fuente. Dev corrida `082f6254-ac7a-4413-a5b3-d0957cb21b1e`; producción `e27060ef-9777-4e6a-932b-a3acd756f691`. Esto es la revisión real solicitada, no una prueba visual ni búsqueda masiva de semejanzas. Sin OpenRouter. Consulta de cinco vigencias existentes B&E confirmó expiraciones guardadas próximas; no se modificaron para provocar alertas.
- QA autenticada de Dev confirma que las dos solicitudes dejaron la lista de pagos vencidos. Otros pagos pendientes permanecen según la evidencia actual: no se ocultan sólo por parecer antiguos. Falta QA final de código desplegado, operación puntual de ejemplo/avisos y retirar acceso temporal.

- Integración adicional de sincronización aprobada en PostgreSQL aislado: revisión atómica, bloqueo, rollback y programación diaria. El primer ensayo no habilitó el supervisor en su ambiente; se corrigió sólo el runner privado y pasó. La integración de vigilancia ajustó sus expectativas al contador unificado (antes omitía hallazgos iniciales); aprobó cola, reintentos, aislamiento y decisiones.
