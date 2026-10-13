# Traspaso: configuración de OpenRouter en producción

- Actualizado: 2026-10-12 21:18, America/Santiago.
- Estado: configuración aplicada y verificada; documentación entregada en PRs.
- Rama y base: `codex/openrouter-production-config`; Dev `ead0de1f4c88cd8f5773b4ee0895ea0d8640ff15`.
- Documentación: [PR #43](https://github.com/joseibietasepulveda/Buho-Marc/pull/43) hacia Dev, entrega `a26bf86`; [PR #44](https://github.com/joseibietasepulveda/Buho-Marc/pull/44) hacia Main, entrega `45082a3`. La configuración externa ya está aplicada y verificada.

## Objetivo y alcance
El usuario reporta un fallo al preparar la conclusión de factibilidad en producción y autoriza reutilizar la clave actualmente configurada en Dev. Copiar únicamente `OPENROUTER_API_KEY` y `OPENROUTER_MODEL` al servicio `buho-marc-web` del ambiente `production` en Railway; indicar la ubicación de edición. No modificar claves ni límites en OpenRouter, carteras o datos de clientes.

## Decisiones y motivos
Usuario: reutilizar la clave Dev si está disponible. Agente: traslado en memoria por entrada estándar, sin exponer el valor en argumentos, archivos, chat o documentación. Se conserva el modelo Dev y el límite compartido existente. No se ejecutará una inferencia sobre expedientes para verificar una configuración.

## Cambios y archivos relevantes
Configuración externa de Railway y documentación operativa. `lib/openrouter-conclusion.ts:openRouterConfig` prioriza variables del servidor; no requiere cambio de código ni migración. Actualizar `README.md` y `docs/RAILWAY_DEPLOYMENT.md` para retirar el pendiente de configuración de producción.

## Coordinación e integración
Sin cambios de contratos de aplicación. Rama documental desde Dev actualizado; promover solamente estos documentos a Main. Checkout original intacto; carpeta privada reutilizada de este chat.

## Verificación
Lectura privada Railway: Dev tiene clave legible y modelo `openai/gpt-4.1-mini`; producción carece de ambas variables. Los valores secretos no se imprimieron. La documentación histórica de Dev registra una clave de inferencia exclusiva sin vencimiento y tope US$1; esa configuración no se cambia ni se vuelve a consultar al proveedor en este encargo.

## Pendientes y siguiente paso
El usuario debe reintentar la conclusión en su estudio conservado; no fue regenerado durante la configuración.

## Operación y cierre · 2026-10-12 21:21

- Se aplicó modelo Dev primero con `--skip-deploys` y luego la clave por stdin al ambiente exacto `production`, servicio `buho-marc-web`. Ambas variables coinciden con Dev; no se imprimieron valores ni huellas. No se copiaron otras variables.
- Railway despliegue `452c99c2-d9d2-4d98-b6e4-2aa75ac65248`, commit `e8d72cdd9fd2006b7f6af187650872bdc6622b1b`: SUCCESS. `/api/health` 200, base conectada. El healthcheck comprueba aplicación/INAPI, no autentica OpenRouter.
- No se llamó a OpenRouter ni se generó una conclusión real. La verificación acredita configuración e inicio; autenticación vigente, saldo y respuesta de inferencia no se probaron en este encargo. No se cambió el límite de la clave compartida ni su vencimiento.
- `db/feasibility-conclusions.ts` incluye la credencial en el hash de caché: una conclusión antigua `not_configured` no bloquea el nuevo intento con clave configurada. No se borraron intentos ni datos.
- Lugar de edición: Railway → `heartfelt-magic` → `production` → `buho-marc-web` → Variables → `OPENROUTER_API_KEY`. Modelo: `OPENROUTER_MODEL`.
- Documentación: README y guía Railway enlazan esta nota y retiran el pendiente de activar producción. Referencias locales y `git diff --check` aprobados. Sin cambios de aplicación/esquema; no corresponde repetir pruebas generales por configuración/documentación.

- Promoción documental: conflicto en README resuelto conservando el párrafo histórico de Main; se incorporó exclusivamente la ubicación/estado de configuración actual. Sin promover otras diferencias documentales de Dev.
