# Traspaso: fallo de conclusión en la segunda clase

- Actualizado: 2026-10-13 00:37, America/Santiago.
- Estado: integrado y publicado en Dev y producción.
- Rama y base: `codex/conclusiones-segunda-clase`; Dev `ced9eeef82d991c34ce9a300a8eea2a392dc81c6`.
- PR y commits: [#65 Dev](https://github.com/joseibietasepulveda/Buho-Marc/pull/65), entrega `3cd94de` + `c794a28`, integración `e0809759b4d41405cb9666ed33f74d5e65d2a2c7`; [#66 Main](https://github.com/joseibietasepulveda/Buho-Marc/pull/66), promoción `506bc4ae14c972d5291aeb16d28ce64b08b4e89e`.

## Objetivo y alcance
El usuario informa una conclusión exitosa seguida de fallo al generar clase 29 en Multinforme. Autoriza corregirlo y llamar a OpenRouter. Identificar la causa guardada, corregir el flujo y probar clases independientes sin consultas nuevas a INAPI. Posteriormente autoriza integrar en Dev y desplegar en producción y pide aplicar la corrección ya ofrecida, dejando la mayor confiabilidad como pendiente del administrador de Búho Marc.

## Cambios y archivos relevantes
- `lib/openrouter-conclusion.ts`: prompt v10, máximo dos intentos por clase dentro de los mismos 45 s, corrección específica por motivo seguro sin reenviar el texto inválido, recuperación transitoria de red/HTTP y respeto de `Retry-After`. No reintenta falta de clave, HTTP 400/401/402/403 ni timeout. Esquema restringe referencias a los antecedentes enviados, límites de párrafos y recomendación elegida; `provider.require_parameters` exige soporte estructurado.
- `lib/feasibility-conclusion.ts`: `ConclusionValidationError` clasifica el rechazo sin guardar respuestas completas; se mantienen todas las validaciones y se añaden metadatos opcionales `generationAttempts`, `failureCode`, `providerStatus` al JSON de salida.
- `lib/conclusion-failure.ts` y `app/app/feasibility-review.tsx`: mensajes diferenciados; el fallo conserva las otras conclusiones y bloquea la exportación de la clase pendiente.
- `tests/feasibility-conclusion.test.mjs`, `scripts/verify-feasibility-study.mjs` y `scripts/verify-conclusion-recovery.mjs`: recuperación de la segunda clase, máximo dos peticiones, integridad de primera clase/selección, decisiones/evidencia, fallo definitivo, costo desconocido y proveedor permanente. El script de persistencia requiere `BUHO_CONCLUSION_QA_DATABASE_URL` explícito y rechaza hosts remotos o bases distintas de `buho_local`; nunca llama al proveedor real.
- Documentos funcionales `docs/FACTIBILIDAD_MULTINFORME_2026-10-09.md` y `docs/COST_CONTROL.md` distinguen implementación local de integración.
- `lib/release-notes.ts`: grupo «Mayor continuidad de las conclusiones con IA» en Próximas versiones de Acerca de esta versión, sección disponible únicamente para admin Búho Marc según `workspacePolicy`. Registra formato independiente de redacción, alternativa ante fallos, estudios recuperables y medición/avisos de gasto. Son pendientes, no funcionalidades implementadas.

## Decisiones y motivos
- Usuario: el diagnóstico anterior se implementó desde otro chat; ahora permite reparación e inferencias.
- Verificado: producción tiene clave/modelo y despliegue SUCCESS `17d752ad-2b88-4875-9960-78f730c92e1e`, Main `04fc92a712c61b09b76b58dcea0c983242ae21d5`. Ya no corresponde atribuir este episodio a falta de clave.
- Contexto vigente: configuración en `2026-10-12-openrouter-produccion.md`; decisión explícita del abogado y prompt v9 en `2026-10-12-presentacion-barros-errazuriz.md`.
- Verificado en producción por lectura PostgreSQL: clase 30 exitosa a las 03:04 UTC, clase 29 fallida a las 03:06 UTC del 13/10; esta última guarda `reason=invalid_response`, identificador del proveedor y cuatro expedientes seleccionados, decisión expresa `moderate/review`. El código anterior descartaba toda respuesta inválida al primer intento y sólo informaba un aviso genérico. El texto rechazado y la validación exacta no estaban guardados: no atribuir retrospectivamente el episodio a una regla concreta. El usuario confirmó que reintentar luego funcionó.
- Decisión técnica: recuperar sin rebajar controles ni cambiar automáticamente la recomendación del abogado. Un segundo fallo continúa bloqueando descarga; esto reduce intermitencia por respuestas inválidas, sin prometer disponibilidad absoluta de un servicio externo.
- Fuentes técnicas: [salidas estructuradas y require_parameters](https://openrouter.ai/docs/guides/features/structured-outputs), [errores y Retry-After](https://openrouter.ai/docs/api_reference/errors-and-debugging).

## Coordinación e integración
La herramienta `create_worktree` falló con `Git ref lookup failed`; la carpeta original tiene archivos iCloud sin contenido local. Clon independiente en `.codex/workspaces/buho-conclusiones-segunda-clase-base` y worktree Git separado; `attach_worktree` rechazó el checkout como no administrado. No se modificaron otros checkouts. Contrato de conclusión compartido con informes PDF/Word y consumidores anteriores. Sin migraciones previstas.

Persistencia existente `prepareConclusion` guarda automáticamente los nuevos metadatos de salida. `usage.attempts` conserva identificadores, uso y costos de ambas respuestas; la suma total sólo se informa cuando ambos costos constan. El consumidor histórico sin `proposal.niceClass` mantiene una petición. La versión 10 cambia la identidad de caché sin borrar generaciones históricas. Sin dependencias ni migraciones nuevas. Dev volvió a comprobarse en `ced9eee` antes del cierre, sin avance. Los archivos AGENTS/CLAUDE generados por Next no forman parte de la entrega.

## Verificación
- Node 24.14.0; dependencias enlazadas desde un checkout accesible con `package-lock.json` idéntico. Guía local vigente de Next sobre componentes cliente/servidor leída; clave exclusivamente en servidor.
- `node --import ./tests/ts-loader.mjs --test tests/feasibility-conclusion.test.mjs tests/feasibility-study.test.mjs tests/feasibility-report.test.mjs`: 33/33 aprobadas, incluido rechazo de porcentajes, evidencia ajena, decisión cambiada y límite de reintento. El primer ensayo falló por una propiedad de constructor no admitida por el loader de Node; se reemplazó por asignación explícita y se repitió con éxito.
- ESLint de los siete archivos de código modificados y `tsc --noEmit --incremental false`: aprobados. `npm run build -- --webpack`: aprobado, compilación/TypeScript y 36 páginas.
- `BUHO_LOCAL_PORT=3149 BUHO_LOCAL_DB_PORT=55489 BUHO_LOCAL_DATA_DIR="$PWD/.buho-local/conclusion-qa" npm run dev:local`: instancia y PostgreSQL propios, sin fuente real/supervisor. Servidor/base detenidos al cerrar.
- `BUHO_QA_ORIGIN=http://127.0.0.1:3149 BUHO_PLAYWRIGHT_MODULE=<runtime>/playwright/index.mjs BUHO_BROWSER_EXECUTABLE=<Chrome> node scripts/verify-feasibility-study.mjs`: aprobado, clases 30/43 con fallo simulado de segunda clase que conserva primera, reintento exitoso, navegación/edición y ocho descargas PDF/Word sin nuevas generaciones. Sin errores de navegador. Capturas de escritorio/móvil inspeccionadas; una recaptura falló por seleccionar también el anuncio accesible de Next, se restringió el selector al mensaje y la QA final pasó; evidencia ignorada en `work/study-qa/`. La API de IA y búsqueda se interceptan en esta QA visual.
- `BUHO_CONCLUSION_QA_DATABASE_URL=postgresql://postgres:buho-local-only@127.0.0.1:55489/buho_local node --import ./tests/ts-loader.mjs scripts/verify-conclusion-recovery.mjs`: aprobado. PostgreSQL real local, clases 30/29, primera conclusión intacta, segunda recuperada con tres llamadas simuladas totales, metadatos/costo de ambos intentos y caché sin nuevas llamadas. Ejecutar sobre la instancia preparada con `dev:local` y demo cargada; no usar datos de otro chat.
- Tres inferencias reales autorizadas sobre el contexto seleccionado guardado de clase 29: reproducción con v9, comprobación del nuevo esquema v10 y recuperación v10 después de un primer rechazo simulado. Todas las respuestas reales válidas. Costos informados: US$0,0079664 + US$0,0081772 + US$0,0081612 = US$0,0243048. Ninguna búsqueda nueva a INAPI; no se regeneraron ni escribieron conclusiones remotas.
- Acceso SSH temporal propio revocado; agente y archivos privados temporales retirados. Sin cambios de claves/límites OpenRouter, variables Railway ni datos remotos. La sesión QA pertenece sólo a la base local.
- Después de registrar el pendiente administrativo: ESLint de `lib/release-notes.ts`, `git diff --check` y `npm run build -- --webpack` aprobados. Se comprobó el consumidor `AboutVersionView` y su autorización exclusiva de admin Búho; no se cambió la política ni se habilitó esta vista en otras organizaciones.

## Pendientes y siguiente paso
Entrega funcional terminada. Las mejoras adicionales de continuidad quedan aplazadas en Acerca de esta versión → Próximas versiones del administrador Búho Marc. No prometer disponibilidad absoluta ni aceptar una respuesta inválida como conclusión. No repetir búsquedas ni inferencias reales sólo para verificar documentos. Conservar los borradores de usuario en memoria: recargar su navegador borra el borrador completo según el contrato actual.


## Integración y publicación comprobadas
- Dev: PR #65; Railway `71202b57-74b6-4bed-b4df-dd81dfae537b`, SHA exacto `e0809759b4d41405cb9666ed33f74d5e65d2a2c7`, SUCCESS. Build/TypeScript y 36 páginas aprobados; salud 200, base conectada, motor DeQuiénEs; conclusiones 401 sin sesión.
- Producción: PR #66; Railway `ab7d1d36-f65a-4a2c-af25-2f60bd979062`, SHA exacto `506bc4ae14c972d5291aeb16d28ce64b08b4e89e`, SUCCESS. Build/TypeScript y 36 páginas aprobados; salud 200, base conectada, motor DeQuiénEs; conclusiones 401 y `/app` 307 a ingresar sin sesión.
- Comparación `git diff origin/main origin/dev -- app db lib scripts tests` vacía después de promover: mismo código probado, conservando documentación histórica de Main. Sin migraciones nuevas, variables ni traslados de datos entre ambientes.
- La QA autenticada completa y la recuperación real del modelo corresponden a las comprobaciones locales descritas arriba. La verificación de publicación no generó nuevos informes ni consultó INAPI/OpenRouter. El cierre siguiente modifica documentación solamente.
