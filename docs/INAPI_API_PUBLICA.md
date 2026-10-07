# API del buscador público de INAPI

Actualizado: 7 de octubre de 2026. Implementación: `lib/inapi-official.ts`. Operación y límites: [recuperación de antecedentes](INAPI_RECUPERACION_ANTECEDENTES.md).

## Qué se comprobó

El [JavaScript publicado por INAPI](https://buscadormarcas.inapi.cl/Marca/js/BuscarMarca.js) describe las llamadas que realiza su buscador. Se verificaron el contexto, los parámetros y las respuestas con consultas puntuales el 7 de octubre. Es un contrato observado del sitio público; puede cambiar y no equivale a una API formal contratada. No se ha comprobado si DeQuiénEs utiliza internamente estos mismos endpoints.

Base: `https://buscadormarcas.inapi.cl/Marca/BuscarMarca.aspx`.

Una consulta de un expediente realiza como máximo tres peticiones, en este orden:

1. `GET` a la página base. Obtiene un contexto temporal propio: campos ocultos `hdnHash` y `hdnIDW`, más las cookies emitidas por esa página.
2. `POST /FindMarcas`, búsqueda exacta por número de solicitud.
3. `POST /FindMarcaByNumeroSolicitud`, detalle del único resultado que corresponde al número solicitado.

Las peticiones usan `Content-Type: application/json; charset=utf-8`, `Referer` de la página y sus propias cookies. Hash, contexto y cookies se mantienen solo en memoria. No se copian cookies del navegador del usuario, credenciales ni claves de DeQuiénEs.

## Búsqueda exacta

`FindMarcas` recibe:

| Campo | Valor |
| --- | --- |
| `LastNumSol` | `0` |
| `Hash`, `IDW` | Contexto obtenido de la página |
| `param1` | Número de solicitud como texto |
| `param2` a `param16` | Texto vacío |
| `param17` | `"1"`, modo exacto del sitio |
| `responseCaptcha` | Literal `"este texto no se validará"` usado por el JavaScript público observado |

El literal reproduce el contrato observado; no se resuelven ni evaden desafíos de acceso. Si INAPI vuelve a exigir CAPTCHA, login u otro contexto, la integración se detiene y requiere revisión.

Las respuestas tienen envoltorio ASP.NET `{ "d": "<JSON>" }`, o el objeto equivalente en `d`. Se rechazan errores `ErrorMessage`, respuestas mal formadas y búsquedas sin un resultado único.

`Marcas[].cell` contiene columnas visibles y referencias internas. Se comprueban los números de solicitud de `cell[0]` y `cell[8]`; del resultado se toman **sin inventarlos** `FileSeq = cell[6]`, `FileType = cell[7]`, `numeroSolicitud = cell[8]` y `numeroSerie = cell[9]`.

## Detalle

`FindMarcaByNumeroSolicitud` recibe esas cuatro referencias, `Hash` devuelto por la búsqueda e `IDW` inicial. La respuesta `Marca.NumeroSolicitud` debe coincidir nuevamente con lo solicitado.

Se usan `NumeroRegistro`, `Estado`, `EstadoDescripcion`, `FechaPresentacion`, `FechaPublicacion`, `FechaRegistro`, `FechaVencimiento` e `Instancias`. Cada instancia aporta `Numero`, `Fecha`, `EstadoCodigo`, `EstadoDescripcion`, `Observacion` y, cuando existe, `FechaVencimiento`.

Las fechas `dd/mm/aaaa` se validan como fechas civiles existentes antes de convertirlas a ISO. Un campo vacío permanece sin fecha. La adaptación conserva titulares, clases, representantes, anotaciones y evidencia jurídica del expediente guardado: sus contratos directos no se han validado en esta implementación.

Un ejemplo verificado es la solicitud **1110615**: el buscador informó `Caducado`, vencimiento 06/05/2025 y actuación 1046 del 06/11/2025, «No existe renovación en plazo». No corresponde mostrarla vigente por una concesión histórica. La prueba de implementación usa expedientes ficticios equivalentes.

## Lo que no garantiza

La respuesta pública puede recuperar una actuación o fecha de publicación ausente, y confirmar un estado actual. No garantiza constancia de depósito en casilla, destinatario, fecha jurídica de notificación ni ejecutoria. `Fecha` de una resolución no se convierte en notificación. Una consulta exitosa tampoco acredita que el historial contenga todos los documentos o actuaciones.

No se implementa acceso al portal autenticado de notificaciones. Ese acceso necesita un contrato y autorización adecuados para cada destinatario, o antecedentes documentados de DeQuiénEs/el equipo.

## Protección de la fuente

Todas las peticiones de esta consulta pasan por el bloqueo y reloj persistente de `db/inapi-recovery.ts`: **mínimo 3 segundos desde que termina una petición hasta que empieza la siguiente**, también ante errores, entre clientes y entre réplicas. No hay peticiones simultáneas ni reintentos dentro del adaptador. Se rechazan redirecciones; cada petición tiene límite de 20 segundos y respuesta máxima de 2 MB. Los cambios de contrato y desafíos detienen el intento.

Las imágenes existentes y los servicios de búsqueda de DeQuiénEs tienen sus flujos separados; esta cola controla las nuevas llamadas de datos al buscador oficial. Abrir fichas, filtrar, reproyectar datos guardados o generar informes no ejecuta estas llamadas.

Validación local y estado de integración: [traspaso](handoffs/2026-10-07-recuperacion-inapi-y-actuaciones.md).
