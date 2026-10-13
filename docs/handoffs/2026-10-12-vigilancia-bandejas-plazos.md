# Traspaso: bandejas de vigilancia, gestiones próximas y renovación

- Actualizado: 2026-10-12 21:16, America/Santiago.
- Estado: integrado y verificado en Dev y producción.
- Rama y base: `codex/vigilancia-bandejas-plazos`; Dev `99fa7f7`.
- Carpeta aislada: `/tmp/buho-vigilancia-elqui-recovery`; se reutiliza el clon privado de este chat tras comprobar que estaba limpio. El checkout original tiene packs de Git dataless y la creación administrada ya falló; no se modifica.
- Entrega principal: PR [37](https://github.com/joseibietasepulveda/Buho-Marc/pull/37), Dev `cf41218`; promoción PR [38](https://github.com/joseibietasepulveda/Buho-Marc/pull/38), Main `7fb9723`.
- Ajuste de cierre: PR [39](https://github.com/joseibietasepulveda/Buho-Marc/pull/39), Dev `b385f36`; promoción PR [40](https://github.com/joseibietasepulveda/Buho-Marc/pull/40), Main `390c672`.

## Objetivo y alcance

Usuario: cambiar el KPI a Gestiones por vencer y contar próximas; unir los hallazgos iniciales y posteriores en Novedades por revisar, con En seguimiento como segunda bandeja. Revisar los dos plazos de publicación señalados en Estudio Ibieta IP y agregar un aviso real de un registro que venza en menos de un año, reutilizando la cartera existente o incorporando una marca real si no existe. Alcance Dev y producción autorizado en este chat.

## Decisiones y motivos

Confirmadas por usuario: eliminar la pestaña Antecedentes, conservar búsqueda inicial retrospectiva y vigilancia posterior; revisar fuente para plazos extraños; notificación interna de renovación. Sin llamadas a OpenRouter. No inferir cumplimiento ni fechas oficiales. El aviso de anticipación no equivale al inicio de la ventana legal de renovación.

## Cambios y archivos relevantes

`lib/watch-list.ts`, `lib/watch-page.ts`, `lib/watch-view-state.ts` y `app/app/watch-panel.tsx`: bandeja y contadores unificados. `app/app/page.tsx`: gestiones próximas y vencimiento propio de notificaciones. `lib/renewal-reminder.ts`, `db/renewal-notices.ts`, `db/source-sync.ts` y supervisor: avisos internos idempotentes. `scripts/provision-renewal-example.ts`: incorporación puntual real, con modo seco por defecto. Documentación funcional en `docs/VIGILANCIA_BANDEJAS_Y_RENOVACION_2026-10-12.md`.

## Coordinación e integración

Contratos compartidos de vigilancia, resumen y notificaciones; preservar seguimiento, valoraciones, procedencia y aislamiento por organización. No cambios de esquema previstos. Integrar a Dev y promover sólo archivos de esta entrega a Main.

## Verificación

Se inspeccionaron README, decisiones UX, vigilancia, consumo, plazos, notificación el día de actuación y Railway. Evidencia real privada en `outputs/` (ignorado); no versionar datos personales de clientes ni respuestas completas. Pruebas y despliegues detallados abajo.

## Pendientes y siguiente paso

No queda trabajo funcional pendiente. La cuenta B&E existe sólo en producción. No repetir revisiones reales para QA; los avisos nuevos se generan sobre evidencia guardada en el supervisor existente.

## Avance de implementación y verificación

- Bandeja inicial/posterior unificada; procedencia y decisiones conservadas. `scope` antiguo se normaliza; `baselineCount=0` temporal. Contadores incluyen destacadas una vez. Pausadas conservan hallazgos iniciales.
- KPI de gestiones usa `workDeadline(...).tone === 'soon'`: hoy y 14 días inclusive; no contar vencidas.
- Avisos de renovación idempotentes en `db/renewal-notices.ts`, derivados de datos guardados. Supervisor revisa también carteras a pedido, sin llamar a fuente ni cambiar su programación. `db/source-sync.ts` emite al completar una revisión. Cambio de expiración/estado invalida sin borrar. Política de prioritarias y UI reconocen recordatorio sin cambios oficiales ficticios.
- CLI puntual `scripts/provision-renewal-example.ts`, fuera del arranque, limitada por IDs exactos Dev/producción y slugs Ibieta/B&E. Sólo añade un registro real en Ibieta si su cartera no tiene una expiración próxima. No copia clientes, decisiones, contraseñas ni avisos entre cuentas.
- 27 pruebas unitarias de bandejas/procedencia/paginación/contadores/fechas/recordatorios aprobadas y 53 de integración aislada/INAPI/renovación/notificaciones/caché, total 80. PostgreSQL de avisos prueba concurrencia, aislamiento, decisiones conservadas, deduplicación y expiración renovada. Dependencias existentes enlazadas desde el checkout privado anterior de este chat; Node >=22.13.
- ESLint de archivos modificados aprobado. Primer build falló por autorreferencia de tipo del parámetro `groups`; corregido a `bands`. `npm run build -- --webpack` aprobado con TypeScript y 36 páginas. Revisión React: contadores derivados; sin nuevas consultas UI ni efectos; pestañas con `aria-pressed`; eliminado `tab` de dependencias del URL constante. `git diff --check` aprobado.
- Consulta real acotada confirmó las actuaciones posteriores de las dos solicitudes señaladas. Posteriormente se revisó toda la cartera de expedientes Ibieta mediante `syncSource('manual')`, una vez por ambiente: 201 solicitados/recibidos, 7 cambios, 6 avisos de fuente. Dev corrida `082f6254-ac7a-4413-a5b3-d0957cb21b1e`; producción `e27060ef-9777-4e6a-932b-a3acd756f691`. Esto es la revisión real solicitada, no una prueba visual ni búsqueda masiva de semejanzas. Sin OpenRouter. Consulta de cinco vigencias existentes B&E confirmó expiraciones guardadas próximas; no se modificaron para provocar alertas.
- QA autenticada de Dev confirma que las dos solicitudes dejaron la lista de pagos vencidos. Otros pagos pendientes permanecen según la evidencia actual: no se ocultan sólo por parecer antiguos. QA final y operación puntual realizadas, detalladas al cierre.

- Integración adicional de sincronización aprobada en PostgreSQL aislado: revisión atómica, bloqueo, rollback y programación diaria. El primer ensayo no habilitó el supervisor en su ambiente; se corrigió sólo el runner privado y pasó. La integración de vigilancia ajustó sus expectativas al contador unificado (antes omitía hallazgos iniciales); aprobó cola, reintentos, aislamiento y decisiones.

## Integración y operación verificadas

- Railway Dev `0b5cd1dc-04b3-4e05-90bd-74b4c38525c8`, commit `cf41218`: SUCCESS. Producción `063c3f7f-367e-43f9-b3f3-f201d2a6215c`, commit `7fb9723`: SUCCESS. Compilación/TypeScript y healthchecks de despliegue aprobados; `/api/health` de producción devuelve 200 y base conectada.
- Las dos solicitudes señaladas dejaron el pago vencido: fuente actual confirma publicación el 2 de octubre y proyección de oposición hasta el 16 de noviembre de 2026. No se desplazaron fechas manualmente.
- Ibieta no tenía registro próximo en ninguno de los ambientes. CLI puntual incorporó solicitud real `1204333`, respetando titular y evidencia originales; vencimiento `2026-10-28`. Se añadió una marca y un recordatorio por ambiente. B&E producción tenía cinco expiraciones próximas y obtuvo cinco avisos, sin añadir marcas. B&E no existe en Dev.
- La generación de recordatorios hace cero consultas externas; la incorporación puntual sí consultó una ficha por ambiente. La salida anterior del CLI imprimía el cero del generador encima del contador del importador; el ajuste de cierre corrige ese informe. No altera ni repite las fichas.
- QA en producción confirmó dos pestañas, el KPI próximo y TV ELQUI.CL propia → ELQUI.CL detectada primero en B&E. Verificación de datos: contador/resumen 47 B&E y 420 Ibieta, `baselineCount=0`; las selecciones destacadas previas conservadas. El registro añadido puede aumentar el contador si la cola genera coincidencias nuevas.
- La revisión visual encontró que el adaptador antiguo de `NotificationCenter` reemplazaba el vencimiento del recordatorio con `undefined`. El ajuste conserva el vencimiento propio y lo usa también en el drawer. Diez pruebas dirigidas de renovación/prioridades aprobadas nuevamente, ESLint y `npm run build -- --webpack` aprobados. Comprobado desplegado en ambos ambientes, detallado al cierre.

- Reejecución del CLI en ambos ambientes: Ibieta `upcoming=1`, B&E producción `upcoming=5`; `added=false`, `created=0`, `externalRequests=0`. No duplica marcas ni avisos y no consulta a la fuente cuando ya existen registros próximos.

## Cierre de verificación

- Corrección desplegada: Railway Dev `5c465fa9-ea5c-4ac0-b081-521a8fc6353b`, `b385f36`; producción `f0d92c7d-dc22-4c3d-a38a-1d0d3fa93c75`, `390c672`; ambos SUCCESS. `/api/health` 200 en ambos, base conectada y fuente configurada. Compilación y TypeScript aprobados en Dev; producción compiló y pasó healthcheck.
- QA autenticada final: recordatorio BCI muestra «Vence el 28 oct 2026» en lista de Dev y producción. Detalle se identifica como Recordatorio de renovación. Dev conserva dos pestañas y la revisión real ya no presenta las dos solicitudes como pago vencido. Producción conserva TV ELQUI.CL propia → ELQUI.CL detectada primero y KPI Gestiones por vencer. Evidencia visual guardada en `outputs/renovacion-production.jpg`, `outputs/vigilancia-bandejas-production.jpg` y `outputs/gestiones-por-vencer-production.jpg`, sin versionar datos de cartera.
- 81 pruebas dirigidas aprobadas más integración de vigilancia. No se ejecutó `npm test` completo: usa comprobaciones generales de HTML; se verificaron específicamente bandejas, renovación, notificaciones, procedimientos INAPI y sincronización aislada, junto con build/TypeScript y ESLint.
- Retirado de Railway el acceso SSH temporal y eliminados sus dos archivos locales; no se conservan credenciales en este traspaso. No quedan procesos locales de prueba de esta entrega.
- Sin migraciones nuevas. Código funcional de Main y Dev idéntico en `app/`, `db/`, `lib/`, `scripts/` y `tests/` después de la promoción selectiva. Diferencias documentales previas de ramas no se promovieron por accidente.
