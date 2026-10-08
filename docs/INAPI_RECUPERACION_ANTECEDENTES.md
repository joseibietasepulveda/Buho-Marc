# Recuperación de antecedentes y reconocimiento de actuaciones

Actualizado: 8 de octubre de 2026. Integración inicial en `dev` mediante [PR #6](https://github.com/joseibietasepulveda/Buho-Marc/pull/6) y publicada en Railway Dev. Migración, salud y configuración comprobadas. [Traspaso y verificaciones](handoffs/2026-10-07-recuperacion-inapi-y-actuaciones.md).

El 8 de octubre el código y la migración se publicaron también en producción mediante [PR #11](https://github.com/joseibietasepulveda/Buho-Marc/pull/11). **La recuperación directa queda desactivada en producción** (`INAPI_DIRECT_RECOVERY_ENABLED=false`); el único trabajador público habilitado está en Dev, con 200 expedientes diarios y mínimo 3 segundos. El bloqueo/reloj se comparte entre réplicas de una misma base, no entre las bases independientes de Dev y producción. Antes de habilitar ambas se necesita coordinación global, o mantener un único trabajador. La consulta habitual por DeQuiénEs continúa activa. [Registro de promoción](handoffs/2026-10-08-promocion-produccion.md).

En Dev se ejecutaron la vista previa y `--apply --queue`: 222 registros guardados reproyectados y 56 recuperaciones preparadas, sin solicitudes externas desde el script. La primera consulta del supervisor falló al conectarse con INAPI (`fetch failed`); quedaron 55 trabajos pendientes y una pausa global hasta el 07/10 a las 15:39:51 America/Santiago. DNS resolvió el dominio desde Railway, pero la conexión TLS no se completó en 20 segundos; Desde el equipo local la conexión también falló (`ENETUNREACH`); no se obtuvo una respuesta HTTP oficial ni se acredita información nueva recuperada. El intento fallido no se repite automáticamente. La publicación no demuestra disponibilidad de INAPI ni completitud del historial. [Registro operativo](RAILWAY_DEPLOYMENT.md).

## Funcionamiento

La consulta habitual sigue usando DeQuiénEs. Después de incorporar o revisar una solicitud propia, Buho Marc reinterpreta el historial y sus pruebas guardadas. Si una obligación reconocida necesita una fecha de notificación, publicación o ejecutoria que aún no tiene, prepara una recuperación puntual desde el [buscador público de INAPI](INAPI_API_PUBLICA.md). Los casos con expediente propio de seguimiento pueden preparar la misma recuperación, sin cambiar el rol del cliente.

El supervisor procesa **un expediente por turno**, normalmente cada 30 segundos. El trabajo queda guardado en `inapi_recovery_jobs`; se identifica por solicitud y antecedente concreto pendiente. Dos carteras que siguen el mismo expediente comparten la consulta pública. Un antecedente ya consultado, fallido o todavía no resuelto no vuelve a consultarse por abrir la ficha ni por recibir la misma respuesta de DeQuiénEs. Si aparece una nueva actuación que necesita otro antecedente, puede prepararse un nuevo intento. Completar una de varias obligaciones no repite la consulta de las restantes ya intentadas.

El límite es **200 expedientes por día de Santiago**, actualizado por petición explícita del usuario el 07/10, como máximo 600 peticiones HTTP para consultas completas. `INAPI_DIRECT_RECOVERY_DAILY_LIMIT` tiene valor predeterminado 200 y permite reducirlo a cero o ajustarlo, con tope de 200; nunca reduce el intervalo. `INAPI_DIRECT_RECOVERY_ENABLED=false` desactiva la cola. La recuperación opera únicamente con `SOURCE_PROVIDER=inapi`, y permanece desactivada en la demo local.

Cada petición espera **al menos tres segundos después de la finalización de la anterior**. PostgreSQL comparte el bloqueo y reloj entre procesos y réplicas; un reinicio no reinicia el intervalo. Se cuentan también las peticiones fallidas. No se hacen reintentos automáticos del mismo antecedente. Un fallo deja los datos válidos intactos y pausa toda la cola una hora. Una interrupción conserva el intento como fallido; no lo repite silenciosamente. El presupuesto diario se mide por intentos comenzados, incluidos los fallidos.

Antes de enviar una petición se confirma en la base una reserva conservadora de 23 segundos (20 de timeout más 3 de intervalo, con margen de milisegundos). Al terminar se reemplaza por la hora efectiva de finalización. Si el proceso muere en plena petición, la reserva permanece y evita que otra réplica consulte inmediatamente mientras la llamada anterior podría seguir activa.

Si el proveedor completa el antecedente antes de procesar su trabajo, se cancela la consulta que ya no es necesaria. Calendarios fuera de cobertura, roles desconocidos e incidentes sin regla determinada requieren revisión; no provocan búsquedas para inventar una cuenta regresiva.

La fecha de publicación faltante también se busca cuando una etapa reconocida acredita que la publicación ya ocurrió. Ese antecedente se identifica una sola vez por solicitud, aunque cambie la etapa; una solicitud todavía pendiente de publicación no genera búsquedas por una fecha que aún no existe.

## Conservación de evidencia

Se combinan actuaciones por identificador, conservando las fechas y documentos jurídicos que ya estén en los datos de DeQuiénEs. Las fechas resumen oficiales completan las ausentes. Un estado directo puede prevalecer cuando su historial es posterior o identifica las mismas últimas actuaciones; los datos oficiales antiguos no sustituyen actuaciones posteriores del proveedor.

`officialEvidence` conserva el resultado normalizado, la fecha de la comprobación y el registro normalizado recibido de DeQuiénEs por separado (`providerRecord`). Las consultas habituales reutilizan esa evidencia para evitar que una respuesta guardada incompleta borre lo recuperado. Una nueva extracción de DeQuiénEs que declare historial completo y lectura posterior a la comprobación reemplaza esa evidencia complementaria. Los campos originales, la fuente de las fechas y los antecedentes manuales permanecen diferenciados. No se sobrescriben cliente, rol, tareas ni decisiones del equipo.

La recuperación actualiza las proyecciones vinculadas. Las fotografías de comparación anteriores se mantienen: la siguiente revisión habitual puede avisar las novedades comprobadas una sola vez. La recuperación no envía correos ni inventa avisos históricos de una corrección de reglas.

Una constancia del equipo mantiene su efecto cuando la obligación de su acto pasa a ser concurrente. Se vuelve a validar el vínculo exacto, medio y fecha; no se traslada a la nueva obligación principal ni a una actuación distinta.

La ficha del administrador distingue `retrieval.lastSuccessfulQueryAt`, `lastChangeDetectedAt`, `sourceReadAt`, `historyCheckedAt`, `historyComplete` y `officialCheckedAt`. Consulta exitosa significa respuesta recibida; cambio detectado significa diferencia de negocio; lectura y completitud solo se muestran cuando hay un dato explícito que lo respalde. `updated_at`, `json_fetched_at` y el orden de filas no acreditan notificación ni completitud y no producen novedades jurídicas.

## Reglas incorporadas

| Antecedente | Interpretación |
| --- | --- |
| Solicita abrir término probatorio | Petición; no abre prueba ni activa su plazo. |
| Resolución de apertura/recepción de causa a prueba | Período probatorio; falta su notificación si no se acredita. |
| Por contestado/no contestado el traslado **con recepción a prueba** | Reconoce la apertura; no abre otra contestación. |
| Contestación del traslado de demanda de oposición | Respuesta presentada; no declara ganada la oposición. |
| Traslado de oposición y observaciones de fondo | Conserva ambas obligaciones y sus actos/pruebas por separado. |
| Alega abandono | Petición; no declara abandonada la solicitud. |
| Devolución a examen de fondo por abandono contencioso | Continúa el examen; no abandona la solicitud. |
| No presentado un escrito / rechazo de pago | No equivale a no presentada/rechazada toda la solicitud. |
| Solicitud de desistimiento, desistimiento parcial o de oposición | No termina toda la solicitud. Resolución de desistimiento total o estado explícito `Desistida` sí se reconoce. |
| Pago final / constatación de pago completo | Pago acreditado; no concede registro. Exigir acreditación no acredita pago. |
| Nulidad, incidente o anotación | Separa su objeto. No aplica automáticamente el plazo de contestación de oposición ni cambia el rol del cliente. |
| Oposición presentada | Informa que consta oposición; espera traslado/notificación. No inventa una fecha de contestación. |
| Fin de plazo sin objeto | No permite reconstruir una notificación ni declarar respuesta presentada. |
| Estado oficial `Caducado` | Prevalece sobre una concesión histórica; no presenta una renovación antigua como obligación activa. |

Calendario LPI/LBPA ampliado a **2023–2027**, con tablas nacionales revisadas. Sigue separado del calendario CPC y de años no revisados. Véase [calendario y fuentes](CALENDARIO_LEGAL_CHILE_2026_2027.md).

## Contrato preparado para DeQuiénEs / Víctor

Los campos siguientes son una **propuesta versionada admitida por el adaptador**, no una afirmación de que el servicio ya los entrega. Los campos actuales siguen funcionando. Los campos desconocidos se conservan como evidencia; los nuevos campos incompletos o inválidos no activan plazos.

En `source`: `read_at` (fecha/hora ISO de lectura efectiva del origen), `history_checked_at` (fecha/hora de comprobación), `history_complete` (booleano explícito). Estas fechas se distinguen de la recepción de Buho Marc y de la fecha en que se guardó un JSON.

En cada evento puede agregarse `classification`:

```json
{"version":1,"type":"decision","object":"opposition","outcome":"opens-evidence"}
```

Tipos admitidos: `petition`, `decision`, `response`, `payment`, `notification`. Objetos: `application`, `opposition`, `substantive-examination`, `nullity`, `incident`, `annotation`, `final-payment`. Resultados: `opens-evidence`, `answer-filed`, `withdrawn`, `not-filed`, `abandoned`, `accepted`, `partially-accepted`, `rejected`, `granted`, `paid`, `pending`. Solo combinaciones interpretadas y compatibles modifican la etapa. Una clasificación válida de petición impide que palabras de su título la conviertan en resolución.

En cada evento puede agregarse `legal_facts`, con constancias vinculadas al acto:

```json
{
  "version": 1,
  "act_id": "ACTO_FICTICIO_1",
  "kind": "notification",
  "date": "2026-09-08",
  "object": "substantive-examination",
  "recipient_role": "applicant",
  "method": "inapi-inbox",
  "reference": "Constancia del depósito en casilla, documento y sección",
  "document_url": "https://example.org/constancia"
}
```

`kind`: `notification` o `finality`; `date`: fecha jurídica civil ISO, no extracción. `object`: `application`, `opposition`, `substantive-examination`, `nullity` o `incident`. `recipient_role`: `applicant`, `registrant`, `opponent` o `respondent`. `method`: `daily-state`, `inapi-inbox`, `personal` u `official-document`.

Para usar una fecha se exige identificación del acto, documento HTTPS y referencia, objeto/destinatario compatibles, canal correspondiente y fecha válida, igual o posterior al acto y no futura. Las constancias dirigidas al oponente no se convierten en plazos del solicitante. La fecha de ejecutoria necesita `official-document`. Las obligaciones concurrentes reciben únicamente sus constancias respectivas. Las pruebas públicas comprobadas y las entradas del equipo conservan su tratamiento; no se eliminan al incorporar la información del servicio.

Nulidades, múltiples oponentes, incidentes y efectos parciales necesitan resolver destinatarios y alcance de cada actuación. Se conserva la información, pero no se afirma haber implementado sus plazos específicos CPC. Antes de poner nuevos códigos en producción, incorporar ejemplos y revisar su equivalencia; no deducir un código jurídico de una etiqueta aislada.

## Integración y reproyección

1. Integrar código y documentación juntos; revisar si colisiona `0014_inapi_recovery.sql` con nuevas migraciones de `dev`.
2. Aplicar las migraciones antes de habilitar el nuevo servidor/trabajador.
3. Ejecutar una vista previa **sin solicitudes externas**:

```sh
node --import ./tests/ts-loader.mjs scripts/reproject-inapi-records.ts
```

4. Con el ambiente y base correctos, aplicar la proyección guardada con `--apply`. No crea avisos históricos ni fechas ficticias de consulta. `--apply --queue` prepara la recuperación de solicitudes propias; no hace las consultas desde el script. La cola será atendida por el supervisor y su presupuesto.
5. Verificar cartera, fechas pendientes, cola y límites en Dev antes de cualquier promoción autorizada a producción.

La reproyección de lecturas de la aplicación usa las mismas reglas aunque todavía no se ejecute el script. El script permite dejar persistidas las proyecciones y baselines sin depender de consultas nuevas. Los casos conservan los roles confirmados y las fuentes compartidas.

Pruebas reproducibles, ambiente utilizado, publicación y pendientes de operación: [nota de traspaso](handoffs/2026-10-07-recuperacion-inapi-y-actuaciones.md).
