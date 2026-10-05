# Protección y recuperación de las bases de datos de Buho Marc

Informe de traspaso para implementación en otro chat. Investigación realizada el 5 de octubre de 2026, con referencia horaria America/Santiago.

**Conclusión:** PostgreSQL tiene almacenamiento persistente correctamente configurado en Dev y producción. Sin embargo, la consulta a Railway no mostró respaldos del volumen disponibles ni programados, y la recuperación a un momento específico estaba desactivada en ambos ambientes. La prioridad es crear una primera copia recuperable, automatizar su renovación y demostrar una restauración aislada antes de la siguiente publicación en producción.

Este documento describe trabajo pendiente. No acredita que las protecciones propuestas estén implementadas. La investigación fue de lectura: no modificó bases, volúmenes, respaldos ni despliegues. Tampoco se investigó la otra aplicación mencionada por el usuario; sus datos y configuración quedan fuera de este encargo.

## Encargo para el chat que implementará

Implementar protección y recuperación para las bases de Buho Marc, conservar los datos actuales y entregar evidencia de recuperación real. Revalidar el inventario y los estados de este informe antes de actuar, porque pueden cambiar entre chats. Mantener un registro de operaciones por ambiente, con fecha, resultado e identificadores de respaldo, sin secretos ni datos personales.

El usuario considera vital que este trabajo quede bien. No declarar terminado el encargo solo porque un respaldo figure como creado: debe existir una restauración probada, automatización comprobada, alertas y un procedimiento que otra persona pueda ejecutar.

La entrega de UI/UX pendiente no forma parte de esta implementación. No publicar esa entrega, copiar producción sobre Dev, sustituir la base activa ni restablecer contraseñas para probar respaldos. Las restauraciones de ensayo deben usar destinos nuevos y aislados. Una recuperación que sustituya producción necesita una decisión explícita sobre el punto de recuperación y las escrituras que se perderían.

## Evidencia verificada y límites

| Comprobación del 5 de octubre | Producción | Dev |
| --- | --- | --- |
| Volumen conectado a Postgres | postgres-volume | postgres-volume |
| Estado del volumen | Ready | Ready |
| Ruta de montaje | /var/lib/postgresql/data | /var/lib/postgresql/data |
| PGDATA configurado | /var/lib/postgresql/data/pgdata | /var/lib/postgresql/data/pgdata |
| Volumen pendiente de eliminación | No | No |
| Respaldos del volumen listados por Railway | Lista vacía | Lista vacía |
| Programaciones de respaldos listadas por Railway | Lista vacía | Lista vacía |
| PITR habilitado | false | false |
| Bucket de PITR conectado | false | false |

Se verificó que la ruta configurada para los datos queda dentro del volumen montado. Esto acredita la configuración de persistencia; no es una prueba de restauración ni una garantía frente a fallos futuros.

Las listas vacías corresponden a los respaldos nativos consultados en Railway. No demuestran que nadie haya generado antes una copia externa o local: eso no fue inventariado. No se ha verificado una restauración de estas bases alojadas en Railway.

### Restricción del plan comprobada al preparar la publicación de Dev

El 5 de octubre, después de renovar correctamente el acceso de la CLI con la cuenta del propietario, crear un respaldo manual de Dev siguió devolviendo `OAUTH_INSUFFICIENT_GRANT`. La revisión del panel **Postgres → Backups**, con Dev seleccionado, mostró la causa: **crear respaldos nativos y habilitar PITR requiere el plan Pro**. El panel permite restaurar respaldos previos, si existen, aunque no permita crear otros con el plan actual. No asumir que volver a iniciar sesión resuelve esta limitación ni que el error de la CLI identifica por sí solo la causa.

El chat que implemente la protección debe comprobar el plan vigente y presentar el costo antes de contratar o ampliar servicios. Si se mantiene el plan actual, una exportación lógica con `pg_dump`, almacenamiento independiente y pruebas de restauración puede proporcionar una primera copia; no habilita por sí sola PITR ni cumple el objetivo propuesto de 15 minutos. La copia puntual previa a la publicación de Dev, si se realiza en este chat, debe documentarse por separado: no sustituye la automatización ni la protección de producción solicitadas aquí.

La captura de esta comprobación se conserva localmente en `output/deploy-dev-2026-10-05/railway-respaldo-plan.png`. Esta observación del panel autenticado complementa las [guías oficiales de respaldos](https://docs.railway.com/volumes/backups), que deben revalidarse junto al plan contratado.

También se revisaron las variables temporales del servicio web. No se observaron valores activos para DANIEL_INITIAL_PASSWORD, BUHO_INITIAL_PASSWORD, FA_INITIAL_PASSWORD, FA_PRODUCTION_PASSWORD ni FA_REPAIR_PARTY_ORDER_RUN en ninguno de los dos ambientes. Repetir esta comprobación mostrando únicamente presencia o ausencia; nunca imprimir las contraseñas.

La revisión local encontró una migración nueva, drizzle/0013_watch_feedback.sql, que crea la tabla watch_feedback, índices y un disparador. No contiene una orden para vaciar o eliminar tablas existentes. Sus relaciones con eliminación en cascada definen el comportamiento ante futuras eliminaciones de registros padres; crear esas relaciones no borra la cartera. La revisión de esta migración no reemplaza revisar todas las que estén pendientes en cada base al momento de publicar.

El comando railway:start ejecuta db:migrate, account:provision y el servidor. Por ello un despliegue no es necesariamente una operación exclusivamente visual: puede modificar el esquema y ejecutar preparación de cuentas. La provisión de perfiles de estudio está limitada a Dev y completa perfiles vacíos; también debe conservarse y verificarse esa protección.

## Identificación precisa del proyecto

Estos identificadores se obtuvieron de la CLI autenticada. Son referencias operativas, no credenciales. Confirmar que siguen correspondiendo a Buho Marc antes de cualquier cambio.

| Recurso | Identificador |
| --- | --- |
| Proyecto Railway | heartfelt-magic |
| Project ID | 11a69a90-ad16-40c8-bb92-cc406866c5c8 |
| Servicio web | buho-marc-web |
| Service ID web | 3c48aadd-c695-4c4a-ae9c-1ae24e1f1217 |
| Servicio de base de datos | Postgres |
| Service ID Postgres | fa832f1c-d429-43f7-bc80-18612597fe9b |
| Environment ID producción | 01262643-e6b7-499c-ae75-e83254e1c697 |
| Environment ID Dev | 9e2891f0-7281-4872-a992-2c48866a782d |

La misma definición de servicio aparece en distintos ambientes. Siempre identificar proyecto, ambiente y servicio juntos; no interpretar un identificador compartido de definición de volumen como prueba de que Dev y producción usan el mismo almacenamiento físico.

El código revisado está en `/Users/rosariovial/.codex/worktrees/mejoras-ux-octubre/Monitoreador Logos`, rama `codex/mejoras-ux-octubre`. HEAD al preparar este informe: `a6562485b2e9b4ea1f2cf7118f60384d40c5c53a`. Hay numerosos cambios locales sin confirmar, incluida la migración 0013; el commit por sí solo no describe esa entrega. Preservar esos cambios y no hacer reset, limpieza o publicación masiva del directorio.

Al cerrar el informe, un chequeo de Git dejó de encontrar los metadatos del worktree en el repositorio original. Se comprobó que el informe y las guías seguían guardados y legibles. No se investigó ni reparó esa condición: confirmar la ubicación vigente del repositorio y su enlace antes de trabajar con Git, conservando los archivos locales.

La documentación histórica relaciona producción con main y Dev con dev. Revalidar las conexiones actuales de despliegue. El worktree no estaba enlazado mediante railway status; las consultas funcionaron indicando los identificadores explícitamente. No es necesario reenlazar el proyecto para investigar.

## Protección que se debe implementar

Las siguientes capas cubren fallos diferentes y deben funcionar juntas.

| Capa | Resultado esperado | Límite relevante |
| --- | --- | --- |
| Volumen persistente | Los datos permanecen entre despliegues | Conserva también borrados o modificaciones equivocadas |
| Respaldos nativos programados | Recuperar estados anteriores del volumen | Dependen del proyecto y del almacenamiento de Railway |
| PITR | Recuperar un momento anterior a una operación dañina | Requiere una ventana de archivo continua y comprobada |
| Exportación externa cifrada | Recuperar fuera del proyecto o proveedor | Su antigüedad determina lo que podría perderse |
| Restauraciones ensayadas | Acreditar integridad y tiempo de recuperación | Deben repetirse después de cambios relevantes |

La guía de Railway describe respaldos de volumen, PITR y exportaciones lógicas como capas complementarias. También advierte que vaciar un volumen elimina sus respaldos. Por eso una copia independiente es necesaria para cubrir la pérdida del proyecto o del volumen. [Guía de Railway](https://docs.railway.com/guides/postgres-backups-restores).

## Objetivos iniciales propuestos

Estos son objetivos de diseño para orientar la implementación, no garantías existentes ni promesas de Railway.

| Objetivo | Propuesta inicial | Cómo se acredita |
| --- | --- | --- |
| Datos que podrían perderse ante un incidente recuperable por PITR | Como máximo 15 minutos de escrituras | Medir antigüedad del último punto recuperable y hacer un ensayo |
| Tiempo para restablecer el servicio | Como máximo 4 horas desde la decisión de recuperación | Cronometrar restauración, validación y preparación de la conexión |
| Copia externa | Una diaria y otra antes de cambios relevantes | Objeto finalizado, verificable y con fecha del estado respaldado |
| Pérdida máxima usando solo la copia externa diaria | Aproximadamente hasta 24 horas en operación normal | Medir antigüedad real; una ejecución fallida puede ampliar ese intervalo |
| Ensayo inicial | Obligatorio antes de dar el trabajo por terminado | Base aislada restaurada y comprobaciones registradas |
| Ensayos posteriores | Mensuales y después de cambios importantes de esquema, versión o respaldo | Registro de resultados y correcciones |

Si la estrategia o las capacidades reales no permiten cumplir un objetivo, explicarlo y proponer una alternativa. Un respaldo diario por sí solo no cumple el objetivo de 15 minutos. Mantener inicialmente el mismo nivel de protección en Dev mientras contenga cuentas piloto o información real que no sea reproducible.

## Secuencia de implementación

### Confirmar el inventario antes de modificar servicios

Comprobar proyecto, ambientes, bases existentes dentro de cada servicio, versión principal e imagen de PostgreSQL, extensiones, tamaño, capacidad disponible, rutas, conexiones del servicio web y todas las migraciones pendientes. Inventariar también programaciones y copias que pudieran haberse creado desde esta investigación.

Verificar dónde se guarda cada clase de información: organizaciones, usuarios, membresías y roles, clientes, expedientes, marcas, relaciones, casos, tareas, notificaciones, vigilancia, auditoría, perfiles de estudio y conclusiones de informes. Incluir las colas y estados de trabajo persistidos en PostgreSQL.

La documentación local indica que las imágenes propuestas y los adjuntos generales todavía no tienen almacenamiento duradero completo. Revisar el código vigente: una copia de PostgreSQL no protege archivos que solo estén en el navegador o en un disco temporal. Registrar esos límites y definir protección independiente si ya existen archivos persistentes fuera de la base.

El volumen existente está configurado correctamente. No mover PGDATA, cambiar el montaje, recrear el servicio ni actualizar la versión de PostgreSQL como parte rutinaria de activar respaldos.

### Crear una primera copia recuperable

Crear un respaldo manual nativo en cada ambiente y esperar su finalización correcta. Comprobar capacidad y límites vigentes antes de iniciarlo. Registrar ambiente, servicio, ID, estado, fecha UTC y tamaño si Railway lo informa. Que la solicitud haya sido aceptada no basta.

Crear además una exportación lógica completa de cada base necesaria, con herramientas compatibles con su versión y sin filtros que omitan datos de organizaciones. Usar un formato restaurable, por ejemplo el formato custom de pg_dump. Revisar advertencias y códigos de salida. Cifrar la copia y guardarla en un destino privado; cualquier archivo temporal local debe quedar fuera del repositorio y con acceso restringido.

pg_dump obtiene una copia consistente de una base, pero no incluye por sí solo todos los objetos globales del servidor, como roles. Inventariar roles, permisos y extensiones necesarios y documentar su recreación o un respaldo complementario protegido. No asumir que una exportación parcial o ejecutada con permisos insuficientes contiene todas las organizaciones. [Documentación de pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).

Antes de activar una función que reinicie la base, restaurar esta primera exportación en un destino aislado y ejecutar las comprobaciones descritas más adelante. Así existe una recuperación ensayada durante los siguientes cambios.

### Programar respaldos nativos

Activar las frecuencias diaria, semanal y mensual para las bases con información real. Verificar la retención efectiva ofrecida por el plan y registrar los horarios en UTC y America/Santiago. No suponer que configurar una frecuencia genera inmediatamente la primera copia: conservar el respaldo manual inicial hasta comprobar la nueva programación.

Consultar la configuración después de guardarla, comprobar un respaldo exitoso y verificar una ejecución automática. Si aún no ha llegado su hora, dejar la prueba de automatización marcada como pendiente y retomar cuando exista evidencia. Registrar también cómo se avisa si falla. [Respaldos de volúmenes de Railway](https://docs.railway.com/volumes/backups).

### Habilitar y comprobar PITR

PITR significa recuperación a un momento específico. Confirmar que la imagen, versión, servicio y plan actuales admiten el mecanismo de Railway. Revisar el impacto y ejecutar primero en Dev, que también puede contener información real. Activarlo en producción después de comprobar Dev y contar con la primera copia restaurada.

Según la documentación actual, la activación configura almacenamiento y variables de archivado y redespliega el servicio de base de datos. Preparar una ventana de intervención, observar conexiones y errores de la aplicación y evitar coincidir con importaciones o tareas extensas. No tratarlo como un interruptor sin efecto operativo. [PITR de Railway](https://docs.railway.com/volumes/point-in-time-recovery).

Esperar al primer respaldo base correcto y al archivado saludable. Registrar inicio y fin de la ventana recuperable y verificar que avanza. Un estado enabled=true no demuestra por sí solo que haya datos recuperables.

Hacer una restauración por fecha a un servicio nuevo y comprobar su contenido. No redirigir la aplicación activa para ensayarla. La documentación de PITR describe restauraciones a un servicio separado y exige que exista historia archivada; activarlo hoy no permite recuperar un momento anterior a su primera copia válida. [Funcionamiento y restauración de PITR](https://docs.railway.com/volumes/point-in-time-recovery).

### Mantener una copia fuera de Railway

Seleccionar un almacenamiento privado fuera del proyecto y, preferentemente, fuera de Railway, con credenciales independientes. Un bucket dentro de la misma cuenta ofrece menos independencia frente a pérdida de acceso o eliminación de la cuenta. El computador del usuario no debe ser el único destino.

Automatizar exportación, cifrado, carga, verificación y retención. Propuesta inicial para acordar según sensibilidad y costo: conservar 30 copias diarias, 8 semanales y 6 mensuales. Es una política propuesta para la copia externa, no la retención nativa de Railway.

Cada ejecución debe producir un objeto identificable por ambiente y fecha, y un manifiesto sin datos personales con estado, versión de herramientas, fechas, tamaño y comprobación de integridad. Detectar errores en cualquiera de las etapas; no registrar éxito por la mera existencia de un archivo ni permitir que una carga parcial sustituya la última copia válida. Evitar ejecuciones superpuestas.

Guardar las claves de cifrado en un gestor de secretos independiente del archivo respaldado y ensayar el acceso de recuperación. Limitar los permisos de las credenciales; si es posible, separar la escritura de copias de su eliminación y aplicar versionado o retención protegida. Documentar el procedimiento cuando una clave cambie.

La automatización debe funcionar sin el Mac y sin un chat abierto. Si se ejecuta dentro de Railway, las copias ya almacenadas fuera deben seguir disponibles aunque el proyecto deje de existir. Si faltan proveedor, credenciales o presupuesto, preparar una alternativa concreta y registrar esa dependencia; no marcar la capa externa como terminada.

### Supervisar las protecciones

Registrar el último respaldo correcto y alertar por fallo, ausencia de la copia esperada, pérdida de cobertura PITR, agotamiento de espacio y ensayo vencido. Umbrales iniciales propuestos: copia diaria con más de 26 horas, punto recuperable que exceda 15 minutos y uso de volumen que supere 80 por ciento. Ajustarlos con mediciones para evitar avisos inútiles sin ocultar fallos.

Comprobar también que la programación sigue activa. Asignar responsable y canal para recibir avisos; la entrega al canal debe probarse conforme a la autorización del usuario. No asumir que los registros internos de un proceso son una alerta atendida. Vigilar costos y crecimiento del archivo de recuperación.

## Pruebas de restauración y de integridad

La restauración completa debe realizarse en una base nueva, con conexión y credenciales diferentes. El destino debe identificarse de forma inequívoca y su contenido real conservar el mismo nivel de privacidad que producción. No usar Dev como destino si sobrescribiría su cartera actual.

Antes de levantar una aplicación contra la copia, desactivar programadores, trabajadores, correos, webhooks, llamadas a INAPI y otros efectos externos. Revisar las colas restauradas: pueden contener trabajos pendientes que volverían a ejecutarse. Usar acceso restringido y sesiones de prueba controladas; no restablecer claves reales para ingresar.

Aplicar estas comprobaciones y guardar sus resultados sin volcar datos personales al informe:

1. Restauración finalizada sin errores ignorados y esquema, extensiones, índices, restricciones, secuencias, funciones y disparadores presentes según el inventario.
2. Historial de migraciones consistente con el respaldo. Abrir la copia primero con una versión compatible de la aplicación; no ejecutar automáticamente migraciones pendientes durante la prueba inicial.
3. Conteos por tabla y organización, relaciones válidas y muestras representativas de usuarios, clientes, marcas, casos, tareas, notificaciones, auditoría y contenido de informes.
4. Aislamiento entre organizaciones y permisos comprobados en la copia. Si existen políticas de seguridad por fila, validar que se restauraron y que el respaldo no omitió registros.
5. Recuperación de una fila de prueba y sus relaciones, con comparación de campos, en un entorno descartable. Las eliminaciones de prueba ocurren únicamente allí.
6. Acceso funcional a expedientes, búsqueda y lectura de informes en la copia, sin disparar operaciones externas.
7. Tiempo total medido, antigüedad del estado recuperado y evidencia de que producción siguió apuntando a su base original.

Una comparación con producción consultada horas después no sirve como igualdad estricta si hubo escrituras legítimas. Para controles exactos, obtener referencias consistentes con el mismo snapshot lógico del respaldo; si no se implementa ese mecanismo, declarar la limitación y combinar estructura, relaciones y muestras estables.

pg_restore permite revisar y restaurar archivos de exportación. Listar su contenido es una comprobación preliminar, no un ensayo de recuperación. Configurar el proceso de ensayo para fallar ante errores; no continuar y declarar éxito con tablas omitidas. [Documentación de pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).

Probar al menos una restauración desde la copia externa y otra desde PITR. Documentar además el procedimiento nativo de recuperación de volumen. Si no existe una forma segura de ensayarlo sin sustituir una base activa, probarlo con un servicio descartable y señalar expresamente qué parte se validó. No presentar la prueba de pg_dump como prueba del mecanismo de snapshots.

## Reglas para desplegar cambios de aplicación

Antes de cada entrega con cambios de datos o esquema, identificar el commit y las migraciones exactas pendientes en el ambiente, obtener un respaldo previo correcto y verificar la salud de PITR. Comprobar que el código viejo y el nuevo puedan convivir con el esquema durante la transición; preferir cambios aditivos y dejar la eliminación de estructuras para una entrega posterior evaluada.

Revisar especialmente borrados, eliminación en cascada, cambios de tipo, restricciones nuevas, renombrados, actualizaciones masivas y scripts de provisión. Un cambio sin DELETE también puede perder información o provocar una indisponibilidad. Evitar que dos instancias apliquen migraciones simultáneamente sin coordinación.

No usar comandos de reinicio de esquema, herramientas de migración de desarrollo, seeds destructivos ni restauraciones sobre la conexión de producción como parte de un deploy normal. Los comandos de prueba deben rechazar destinos que correspondan a bases activas. Mantener desactivadas las variables de reparación o provisión extraordinaria cuando no se estén usando deliberadamente.

Después de la entrega, verificar salud, migraciones, lectura de registros existentes, aislamiento y operaciones relevantes. Las escrituras de prueba deben hacerse en un espacio de prueba identificado y controlado. Un health check 200 solo demuestra una parte de la operación.

Volver al código anterior no deshace escrituras ni revierte automáticamente una migración. Documentar por separado el retorno del código y el procedimiento de recuperación de datos. Revisar como mejora posterior si conviene separar la provisión extraordinaria del arranque habitual; implementarlo con pruebas y sin introducirlo incidentalmente durante la activación inicial de copias.

## Procedimiento ante una pérdida real

1. Confirmar ambiente, organización, registro afectado y hora aproximada en UTC. Distinguir un filtro o permiso incorrecto de una ausencia real en la base. Registrar evidencia y conservar logs.
2. Identificar y detener de forma controlada la operación que siga dañando datos. Preservar la base afectada y tomar una copia de su estado antes de intentar repararla.
3. Seleccionar el último punto sano con evidencia. Registrar cuánto trabajo posterior podría perderse si se sustituyera toda la base.
4. Recuperar primero a un destino separado y validar integridad. Para una fila o una organización, preparar una recuperación selectiva con claves, relaciones y conflictos revisados.
5. Conservar los cambios legítimos posteriores. Si es necesaria una sustitución completa, coordinar pausa de escrituras, conciliación y cambio de conexión con un plan concreto de retorno.
6. Revisar colas, leases, tareas, notificaciones y entregas externas antes de reactivar trabajadores; un respaldo anterior puede hacer aparecer como pendientes acciones ya ejecutadas.
7. Verificar el servicio después de recuperar, conservar evidencia y registrar causa, impacto y prevención. No eliminar la copia del estado afectado hasta concluir la revisión y aplicar la política de retención.

La restauración selectiva debe respetar los límites entre organizaciones. Restaurar toda la base para recuperar una fila puede eliminar trabajo válido de otros clientes y no debe ser la opción automática.

## Controles de acceso y costos

Revisar quién puede eliminar servicios, volúmenes y respaldos, y restringir esos permisos a los responsables necesarios. Inventariar credenciales de base, automatización y almacenamiento externo. La aplicación debería tener los permisos operativos necesarios; las migraciones y el respaldo pueden requerir identidades distintas. Diseñar y probar cualquier separación antes de retirar permisos existentes.

No adjuntar dumps al chat, al repositorio ni a informes públicos. Mantener TLS, almacenamiento privado, cifrado y procedimientos de acceso durante una emergencia. Registrar también quién puede recuperar las claves si la persona que configuró el sistema no está disponible.

Medir costo de snapshots, almacenamiento y tráfico de PITR, copias externas, ejecuciones y destinos de ensayo. No inventar una cifra mensual sin conocer volumen y frecuencia de escrituras. Presentar una estimación basada en precios vigentes y mediciones; evitar límites de gasto que eliminen automáticamente la única copia recuperable. Una réplica o alta disponibilidad puede reducir caídas, pero no sustituye las copias frente a borrados lógicos.

## Criterios para dar por terminado el trabajo

| Entregable | Evidencia mínima |
| --- | --- |
| Inventario actualizado | Proyecto, ambientes, servicios, versiones, rutas y clases de datos |
| Primera protección | Respaldo correcto por ambiente con ID y fecha |
| Automatización nativa | Programación leída después del cambio y ejecución automática correcta |
| PITR | Archivado saludable, ventana comprobada y restauración por fecha validada |
| Copia independiente | Archivo cifrado externo descargado, verificado y restaurado |
| Recuperación íntegra | Pruebas de estructura, datos, organizaciones, permisos y aplicación |
| Recuperación selectiva | Ensayo de una fila y sus relaciones en entorno descartable |
| Alertas | Fallo simulado de forma segura y aviso verificado por el canal autorizado |
| Operación documentada | Responsable, frecuencia, retención, costos, claves recuperables y procedimiento |
| Conservación de datos | Sin sustitución accidental de bases activas ni cambios de conexión no previstos |

El informe final del chat ejecutor debe distinguir claramente entre configurado, comprobado y pendiente. Incluir tiempos medidos y limitaciones, especialmente si algún método de restauración o la ejecución automática todavía no se ha probado. No prometer riesgo cero.

## Consultas de diagnóstico ya utilizadas

Estos ejemplos son de lectura. Se ejecutaron con la CLI autenticada en este Mac; no contienen credenciales. Revalidar la ayuda de la versión instalada. Los comandos de activación y restauración deben prepararse aparte, con el destino y sus efectos revisados.

```sh
# Contexto explícito de producción. Para Dev, sustituir solo el ID del ambiente.
BM_PROJECT_ID='11a69a90-ad16-40c8-bb92-cc406866c5c8'
BM_ENVIRONMENT_ID='01262643-e6b7-499c-ae75-e83254e1c697'
BM_POSTGRES_ID='fa832f1c-d429-43f7-bc80-18612597fe9b'
BM_RAILWAY_CLI='/Users/rosariovial/.railway/bin/railway'

"$BM_RAILWAY_CLI" volume --project "$BM_PROJECT_ID" \
  --environment "$BM_ENVIRONMENT_ID" list --json

"$BM_RAILWAY_CLI" postgres pitr status --project "$BM_PROJECT_ID" \
  --environment "$BM_ENVIRONMENT_ID" --service "$BM_POSTGRES_ID" --json

"$BM_RAILWAY_CLI" postgres pitr schedule list --project "$BM_PROJECT_ID" \
  --environment "$BM_ENVIRONMENT_ID" --service "$BM_POSTGRES_ID" --json

"$BM_RAILWAY_CLI" postgres pitr backup list --project "$BM_PROJECT_ID" \
  --environment "$BM_ENVIRONMENT_ID" --service "$BM_POSTGRES_ID" --json

# ID de Dev para repetir las mismas consultas:
# 9e2891f0-7281-4872-a992-2c48866a782d
```

railway variable list --json expone valores de variables. Si se necesita comprobar configuración, filtrar en memoria antes de mostrar resultados y limitar la salida a rutas no secretas o presencia de variables. No incluir DATABASE_URL, contraseñas, tokens ni claves de cifrado en capturas o evidencias.

## Incidentes revisados y su alcance

En julio de 2026 un usuario reportó pérdida de todas las filas después de actualizar Postgres. La respuesta automática de Railway indicó que faltaba un volumen persistente al momento del redeploy. Es evidencia de un caso reportado y de una explicación automática, no un postmortem independiente de un fallo de la plataforma. [Caso de julio](https://station.railway.com/questions/postgres-auto-update-wiped-all-productio-eaef0fc1).

Otro usuario reportó pérdida de datos el 16 de julio de 2026 después de ejecutar prisma migrate dev en producción y producirse un reinicio del esquema. El caso ilustra el riesgo de las herramientas y comandos elegidos para una migración. [Caso de migración](https://station.railway.com/questions/data-lost-d04f46fa).

En un incidente situado por el usuario alrededor del 27 de abril de 2026, un empleado de Railway indicó que no existía una vía de recuperación sin respaldos configurados. La capacidad de la plataforma ha evolucionado: no debe extrapolarse aquella respuesta para afirmar que actualmente Railway no ofrece PITR. [Caso sin respaldo](https://station.railway.com/questions/production-postgre-sql-data-loss-need-re-f0684652).

Railway también publicó una caída de infraestructura del 1 de diciembre de 2023 y señaló que recuperó los servicios sin pérdida de datos reportada. Caída del servicio y pérdida permanente son fenómenos distintos. Las fuentes revisadas no justifican afirmar que cualquier despliegue normal de Railway borre una base correctamente persistida, ni permiten garantizar que nunca habrá incidentes. [Informe de infraestructura](https://blog.railway.com/p/2023-12-01-incident-report).

## Documentación local para continuar

- `docs/RAILWAY_DEPLOYMENT.md`: ambientes, arranque y antecedentes de publicación.
- `package.json` y `railway.json`: comandos actuales de construcción y arranque.
- `scripts/provision-pilot.ts`, `db/report-profile-provision.ts` y `db/demo.ts`: preparación y límites de datos piloto.
- `db/index.ts`, `db/schema.ts`, `drizzle/` y su historial: conexión y estructura persistida.
- `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md` y `docs/COST_CONTROL.md`: relaciones, componentes y trabajos automáticos.
- `docs/UX_IMPLEMENTACION_OCTUBRE_2026.md`: entrega local pendiente, que debe conservarse separada de esta intervención.

Las rutas son relativas al worktree indicado en este informe. Leer las instrucciones AGENTS.md aplicables antes de editar código. Mantener las evidencias operativas privadas y actualizar la documentación al terminar con la configuración realmente aplicada, sus resultados de restauración y cualquier pendiente.
