# Seguimiento INAPI en Dev

## Datos y origen

- Inscripción: 100 solicitudes reales seleccionadas en `data/inapi-cohort.json`.
- Marcas registradas: 100 registros reales más las marcas mock existentes. El origen se muestra en la última columna y en la ficha.
- Vigilancias, casos y notificaciones mock existentes se conservan. El motor de nuevas coincidencias de similitud todavía no está conectado.
- Los expedientes reales se consultan exclusivamente desde el servidor a `https://dequienes.cl/inapi/trademarks/batch`, usando `x-api-key`. Lotes de hasta 100 solicitudes según el contrato consultado del proveedor.
- Los IDs se extrajeron del estado diario ED_MD_2026-09-04.pdf. El archivo de selección conserva sección y página. La carga inicial no crea avisos históricos.

## Ejecución

`SOURCE_PROVIDER=inapi` activa el proveedor real. `INAPI_API_KEY` es solo del servidor. `RAILWAY_PUBLIC_DOMAIN` o `APP_PUBLIC_ORIGIN` define el origen permitido para acciones del navegador detrás del proxy.

`INAPI_IMPORT_COHORT=true` ejecuta la carga inicial al iniciar, una sola vez por base. El importador rechaza cualquier entorno distinto del ID de Dev verificado. No archiva ni elimina mocks. Incluye una reparación idempotente de los registros archivados por la primera versión de la importación y de avisos de prueba cuya única diferencia era el orden de claves JSONB; estos avisos quedan conservados e invalidados para auditoría.

`MONITORING_SCHEDULER_ENABLED=true` habilita la revisión a las 12:30 `America/Santiago`. El proceso supervisor comprueba cada 30 segundos; si el servicio estaba caído, realiza la revisión pendiente al recuperarse. El servicio debe permanecer activo (Serverless/suspensión desactivado). El secreto de las llamadas internas se genera al iniciar si no hay uno configurado.

Los bloqueos de PostgreSQL evitan revisiones simultáneas. Se permiten hasta tres intentos automáticos por día con cinco minutos entre fallos; el botón Revisar permite reintentar manualmente. Una respuesta incompleta, inválida o fallida no sustituye datos válidos ni genera avisos. Portafolio, fotografías, avisos y corrida exitosa se confirman juntos en una transacción.

## Interpretación

Se comparan todos los antecedentes de negocio devueltos, incluyendo actuaciones, anotaciones, cobertura, titulares y representantes. Metadatos de extracción y orden de claves no son cambios jurídicos. La primera incorporación de fecha de vencimiento o registro se guarda sin aviso aislado. Los avisos agrupan las novedades por expediente usando la denominación de la marca.

Un número y fecha de registro, junto con las actuaciones, pueden acreditar una concesión aunque el estado general siga diciendo En Trámite. La ficha y el administrador conservan ambos datos. Los plazos reales solo se muestran cuando vienen informados por la fuente; no se calculan fechas jurídicas ficticias.

La Gran base real es de solo lectura: no permite generar seis cambios ni editar antecedentes que se presentan como oficiales. Las corridas y sus errores son visibles en la segunda pestaña del administrador.

## Verificación

```sh
npm run build
node --import ./tests/ts-loader.mjs --test tests/source.test.mjs tests/inapi.test.mjs tests/source-origin.test.mjs tests/rendered-html.test.mjs
```

Pruebas: estados, cambios de actuaciones, fechas complementarias, orden JSONB, lotes, respuestas inválidas, horario chileno y validación del origen público. La verificación visual se realiza contra Dev. Producción no se modifica ni se despliega como parte de esta integración.

### Resultado verificado el 4 de septiembre de 2026

- Despliegue Dev: `a9142b03-0059-464b-ad70-51ed79ead2ca` (SUCCESS).
- Build y 17 pruebas aprobadas.
- Navegador: 100 celdas Real, 100 celdas Mock y 100 solicitudes reales; 11 vigilancias y 6 casos conservados.
- Revisar manual completado: 200/200 expedientes, 0 cambios, 0 avisos. Reintento automático posterior completado con el mismo resultado.
- Las incidencias de verificación y un rechazo HTTP 403 del proveedor permanecen en Corridas de la API; no alteraron los datos válidos.
- La suspensión de Dev está deshabilitada. La ejecución automática de esta jornada se recuperó después de iniciar el servicio; el horario habitual es 12:30 de Chile.
- Producción conserva el despliegue `d4bbaa9e-cb2e-4183-ba0c-157dcaaaebf3`.
