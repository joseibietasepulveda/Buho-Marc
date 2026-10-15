# Traspaso: clave OpenRouter compartida en Dev

- Actualizado: 2026-10-15 20:46, America/Santiago.
- Estado: configurado y verificado en el proceso desplegado de Dev.
- Rama y base: `codex/factibilidad-cartera-vigilancia`, Dev `46132562a06601c07415932d5546ee4aceff0700`.
- PR/commit documental: esta nota viaja con la entrega de configuración en la rama indicada. Redeploy de configuración: `335337b3-72b5-42d6-af77-05e574883e91` SUCCESS, SHA `46132562a06601c07415932d5546ee4aceff0700`.

## Objetivo y alcance

El usuario pide reutilizar la clave existente y conocer su ubicación en Railway. Se sustituye para Dev la decisión anterior de exigir una credencial distinta para vigilancia. No cambia el código, los modelos, el esquema ni producción. No se autoriza ni se realiza una inferencia de prueba.

## Cambios y archivos relevantes

En proyecto `heartfelt-magic`, ambiente Dev `9e2891f0-7281-4872-a992-2c48866a782d`, servicio `buho-marc-web`, se configura `OPENROUTER_WATCH_API_KEY` con la referencia `${{ OPENROUTER_API_KEY }}`. La API/CLI de variables confirma que ambas resuelven al mismo valor; nunca se imprime ni se copia el secreto al repositorio.

Ruta para el usuario: Railway → heartfelt-magic → Dev → buho-marc-web → Variables. `OPENROUTER_API_KEY` contiene la clave ya existente; `OPENROUTER_WATCH_API_KEY` la referencia. Elegir production muestra las variables propias de ese ambiente.

La aplicación mantiene variables y contabilidad por función; la credencial, saldo y tope configurado en OpenRouter se comparten. Se conservan US$0,10 por ejecución y US$10 mensual del subsistema de vigilancia, sin elevar límites ni consultar/modificar el límite de la cuenta. Factibilidad conserva su modelo. La IA diaria y los correos siguen desactivados; la revisión manual puede usar la clave configurada.

## Decisiones y motivos

Reutilización solicitada por el usuario. La separación era una decisión de gasto/operación, no una exigencia de OpenRouter. Referenciar la variable mantiene un solo valor que rotar. La biblioteca no recibe un fallback global: sólo este ambiente establece el vínculo explícito.

Fuentes: [referencias y ubicación de Variables en Railway](https://docs.railway.com/variables), [autenticación/límites por clave de OpenRouter](https://openrouter.ai/docs/api_reference/authentication). Sustituye la restricción de clave exclusiva de la [entrega anterior](2026-10-15-factibilidad-cartera-vigilancia.md) en Dev.

## Coordinación e integración

Se actualizan `.env.example`, README, contrato funcional, costos y documentación del correo para no exigir otra credencial. El código ya lee la variable de vigilancia; no requiere migración. El cambio de configuración se aplica sólo al servicio web de Dev. Las evidencias previas de ausencia de clave se conservan como históricas.

## Verificación

- Consulta previa de sólo lectura: un digest preparado, cero trabajos activos y 60 intentos GLM históricos; evita reactivar trabajos pendientes durante la configuración.
- Referencia creada con `railway variable set --skip-deploys`; lectura posterior comparó ambas variables en memoria y confirmó igualdad, sin exponerlas.
- Redeploy Dev SUCCESS. Comprobación dentro del contenedor: `digestConfig().glmKey` presente e igual a `OPENROUTER_API_KEY`, presupuesto 0,10/10, `automatic=false`, `digest=false`, `sending=false`. Ledger sigue con 60 llamadas y cero trabajos activos.
- Salud 200/base conectada; rutas privadas 401, descubrimiento 403 sin secreto e ingreso protegido. Sin cambios de código/esquema; no se repitió la batería de UI/pruebas de la entrega funcional.
- No se llamó a la API de OpenRouter, ni siquiera para probar el saldo o la validez de la clave. Una inferencia real queda para uso autorizado; disponibilidad del modelo/crédito no se declara comprobada.

## Pendientes y siguiente paso

Verificación de configuración completada; el usuario puede usar la revisión manual. Clave SSH temporal revocada y archivos propios retirados. Activación diaria o de correos requiere su configuración específica. Registrar cualquier rechazo real del proveedor sin confundir presencia de credencial con crédito/modelo probado.
