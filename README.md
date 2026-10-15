# Buho Marc · v1.0

**Publicado en Dev · 15/10/2026:** [factibilidad, cartera propia/terceros, pagos y vigilancia](docs/FACTIBILIDAD_CARTERA_VIGILANCIA_2026-10-15.md), [costos semanales con ejemplos diarios](docs/COSTOS_SEMANALES_2026-10-15.md) y [traspaso/verificación](docs/handoffs/2026-10-15-factibilidad-cartera-vigilancia.md). Integrada por [PR #92](https://github.com/joseibietasepulveda/Buho-Marc/pull/92), Railway `SUCCESS`, migración 0019 y conservación de registros comprobadas. Producción conserva su versión. Esta especificación sustituye los límites/categorías y etiquetas históricas indicados abajo.

**OpenRouter en Dev · 15/10/2026:** vigilancia puede utilizar la clave existente de factibilidad mediante una referencia de Railway; comparte su saldo/tope y conserva controles propios de gasto. IA diaria y correos siguen desactivados. [Configuración y ubicación de claves](docs/handoffs/2026-10-15-openrouter-compartido-dev.md).

**INAPI a pedido · Dev 14/10:** contexto público corregido, seguimiento con antecedente faltante/programación real y botón «Consultar INAPI» limitado a una consulta diaria por expediente. [Regla y alcance](docs/CONSULTA_INAPI_A_PEDIDO_2026-10-14.md).

**Pago final · regla del 14/10/2026:** las aceptaciones administrativas calculan 60 días hábiles desde la aceptación, asumiendo notificación ese día; las aceptaciones con oposición usan la ejecutoria. El cálculo compartido se aplica a todas las carteras desde los antecedentes guardados, sin inventar pruebas ni nuevas consultas a la fuente. [Regla y límites](docs/PAGO_ACEPTACION_ADMINISTRATIVA_2026-10-14.md), [verificación y publicación](docs/handoffs/2026-10-14-pago-aceptacion-administrativa.md).

**Factibilidad y cierre · 12/10/2026:** [flujo vigente y acuerdos](docs/FACTIBILIDAD_MULTINFORME_2026-10-09.md), [cierre documental y «Ver más» aplazado](docs/handoffs/2026-10-12-cierre-factibilidad.md). La promoción del código a Main desde otro chat quedó registrada en [PR #30](https://github.com/joseibietasepulveda/Buho-Marc/pull/30) y [PR #31](https://github.com/joseibietasepulveda/Buho-Marc/pull/31); esta actualización de documentación se integra solo a Dev.

**Plazos publicados en Dev · 12/10/2026:** cuando falta la fecha de notificación, el proyecto asume que ocurrió el mismo día de la actuación que origina cada obligación (`events[].event_date`). Una fecha acreditada tiene prioridad; publicación y ejecutoria conservan sus activadores. Integración [PR #24](https://github.com/joseibietasepulveda/Buho-Marc/pull/24), Railway Dev `SUCCESS`; esta entrega no se promovió a Main. [Regla, alcance y procedencia](docs/NOTIFICACION_MISMO_DIA_EVENTO_2026-10-12.md). [Estado de implementación y publicación](docs/handoffs/2026-10-12-notificacion-mismo-dia-evento.md).

**Producción actualizada · 8 de octubre:** Dev se promovió a Main mediante [PR #11](https://github.com/joseibietasepulveda/Buho-Marc/pull/11); Railway confirmó SUCCESS. Las 33 tablas preexistentes de producción coinciden fila por fila antes/después. Se conserva cada base y cartera en su ambiente. Respaldo cifrado con restauración ensayada y [evidencia de publicación y conservación](docs/handoffs/2026-10-08-promocion-produccion.md). La bienvenida de dos pasos se incorpora a la aplicación; véase [experiencia y traslado puntual de la cartera Búho Marc](docs/BIENVENIDA_Y_CARTERA_BUHO_2026-10-08.md) y su [estado de entrega](docs/handoffs/2026-10-08-buho-main-bienvenida.md).

**Búho Marc en Main:** la cartera de Dev se trasladó mediante una operación separada y verificada, conservando los registros exclusivos de Main y las demás cuentas. La bienvenida «¡Buenas noticias!» ya está publicada: dos pasos con casillas de lectura y aceptación una vez por usuario. [Entrega y comprobaciones](docs/handoffs/2026-10-08-buho-main-bienvenida.md).

Vigilancia, búsqueda de cartera e informes de factibilidad conectados a INAPI / DeQuiénEs. La nueva [implementación de las maquetas aprobadas](docs/UX_IMPLEMENTACION_OCTUBRE_2026.md) se publicó en **Railway Dev el 5 de octubre de 2026**. El **7 de octubre** se integraron y publicaron las [reglas de actuaciones y recuperación puntual de antecedentes](docs/INAPI_RECUPERACION_ANTECEDENTES.md), con migración y salud comprobadas y presupuesto de 200 expedientes diarios. El historial guardado de Dev ya fue reproyectado; la primera conexión directa a INAPI falló y activó la pausa protectora de la cola. El 8 de octubre estas mejoras se publicaron también en producción. Allí la recuperación pública directa permanece desactivada para evitar dos trabajadores con cuotas/relojes independientes; DeQuiénEs sigue activo. El [registro de Railway](docs/RAILWAY_DEPLOYMENT.md) y el [índice de documentación](docs/README.md) distinguen publicación, pruebas y antecedentes históricos.

La ronda nueva incluye nueve secciones, Clientes, Usuarios y Bitácora; factibilidad en tres pasos, Excel antiguo y valoraciones de vigilancia persistentes. El [comparador e informe UI/UX](output/implementacion-ux-2026-10-04/comparador-ui-ux.html) permite alternar propuesta original, implementación ajustada y pantalla anterior, con capturas de escritorio/móvil y ejemplos realmente exportados. Su [guía de evidencia](output/implementacion-ux-2026-10-04/README.md) describe las comprobaciones y sus límites.

Las mejoras de búsqueda, importación asistida, informes de clientes y simplificación de pantallas están en [Mejoras UX de octubre](docs/UX_OCTUBRE_2026.md). Los perfiles de estudio y las conclusiones mediante OpenRouter, con respaldo determinista, están en [Informes de factibilidad](docs/INFORMES_FACTIBILIDAD_2026-10-02.md). Estas entregas actualizan las [decisiones de septiembre](docs/DECISIONES_UX_2026-09-24.md). El [pulido del 4 de octubre](docs/UX_PULIDO_2026-10-04.md) reorganiza factibilidad, amplía letras, centra las X y convierte Todas en una bandeja con detalle lateral. Limpiar prioritarias conserva los avisos y limpia el indicador lateral. Estas rondas se validaron en Dev y se incluyeron en la promoción a producción del 8 de octubre.

La [ronda de valoraciones y comparación del 5 de octubre](docs/UX_VALORACIONES_COMPARACION_2026-10-05.md) incorpora respuesta inmediata del pulgar, comentario abierto con Enviar, logos en resultados de factibilidad y el panel comparativo compartido con Vigilancia. PDF y Word muestran las clases separadas por comas y conservan las coberturas completas.

## Vigilancia real

Las marcas y solicitudes propias importadas se incorporan automáticamente. Cada búsqueda de stock pide **50 similitudes**. La respuesta se conserva completa; Vigilancia excluye las coincidencias registradas o concedidas en todas sus pestañas y contadores. Novedades por revisar admite estados confirmados en trámite y excluyen estados terminales o ambiguos. «Mis marcas» reúne marcas registradas y solicitudes propias, con columnas iniciales Número de solicitud, Parte Figurativa y Marca; el RUT sigue disponible en la ficha y las búsquedas. En la nueva tabla, la ausencia de parte figurativa se presenta como «Denominativa».

«Vigilancia» tiene dos pestañas: «Novedades por revisar» y «En seguimiento». Los hallazgos de la revisión inicial y los posteriores comparten pendientes, conservando su procedencia. [Bandejas, gestiones próximas y avisos de renovación](docs/VIGILANCIA_BANDEJAS_Y_RENOVACION_2026-10-12.md). Por defecto se muestran productos y servicios relacionados o por confirmar; el selector permite consultar también los no relacionados. Los hallazgos se organizan en alta y media similitud, con umbrales iniciales de **70% y 55%**, ajustables de 5 en 5 y persistentes por organización. Ordena de mayor a menor índice y muestra inicialmente cinco coincidencias por marca/categoría; **Buscar más** añade cinco del lote guardado. En seguimiento usa una tabla sin niveles de similitud y conserva las decisiones guardadas incluso si cambia el estado del expediente; las coincidencias registradas quedan ocultas. Cada resultado permite comparar marcas, consultar historial, seguir o convertir en caso.

Los botones de revisión manual se retiraron de Vigilancia: las actualizaciones a pedido se solicitan desde el chat con el asistente. Daniel conserva su revisión automática diaria; Búho permanece a pedido. Abrir la pantalla no inicia una búsqueda. Véase [control de consumo](docs/COST_CONTROL.md).

Las similitudes no generan notificaciones hasta que el usuario elige expresamente seguirlas. «Avísame si se publica en el Diario Oficial» guarda el seguimiento y genera un aviso interno cuando la fuente informa la publicación. El sistema sigue consultando esos expedientes aunque salgan de los primeros resultados.

La revisión diaria combina stock con búsquedas separadas de ingresos y publicaciones. Las novedades se agregan sin duplicar solicitudes; el lote posterior puede superar 50 por incluir ventanas adicionales. La publicación posterior conserva la revisión anterior. Hay cola persistente, reintentos, pausa/reanudación e indicadores separados de la sincronización de expedientes.

Ante un HTTP 403 de la fuente, la vigilancia espera 20 segundos y reintenta hasta 10 veces después del intento inicial. La espera y el contador persisten entre reinicios; durante la espera no inicia otra búsqueda de vigilancia. Si se agotan los reintentos, conserva el último resultado exitoso e informa el fallo.

Las decisiones y los pendientes de esta revisión están en [Vigilancia · 28 de septiembre](docs/VIGILANCIA_REVISION_2026-09-28.md).

## Factibilidad e informes

Contrato vigente en Dev al 12 de octubre: [Informe y Multinforme por clase Niza](docs/FACTIBILIDAD_MULTINFORME_2026-10-09.md), con el [pulido de interfaz, informes y notificaciones](docs/handoffs/2026-10-12-interfaz-informes-notificaciones.md) integrado por [PR #27](https://github.com/joseibietasepulveda/Buho-Marc/pull/27). Cada búsqueda requiere una única clase; Multinforme reúne análisis independientes de la misma marca. El combobox muestra las 45 clases al enfocar o pulsar el campo y filtra por número o significado (2 muestra 2 y 20–29). Los pasos son Buscar, Revisar resultados y Preparar informe; **Siguiente** lleva desde la selección a la preparación. El contador agrupa una misma marca del mismo titular como un antecedente, aunque tenga varios expedientes.

La generación **IA - Buho Marc** usa OpenRouter internamente para redactar la conclusión de la clase activa, con textos de los antecedentes relevantes incluidos en el detalle y sin imágenes. Llena el recuadro del abogado y la vista previa, ambos editables directamente con peso normal. Cada clase recibe su propia recomendación; sin antecedentes relevantes incluidos se recomienda presentar para la cobertura propuesta. No se permiten porcentajes en conclusiones ni informes. Las descargas requieren una conclusión válida generada o escrita por el abogado, sin casilla adicional de revisión. Si falla la IA se conserva el estudio para reintentar; no se sustituye su conclusión por un respaldo automático.

Antes de descargar se elige **Informe para cliente** (inicial) o **Informe para estudio**, con selector de dos líneas de altura estable; después tabla comparativa o fichas con imágenes, y PDF o Word editable. La tabla contiene únicamente **Marca** y **Parte Figurativa**, centradas. Word usa Times New Roman; PDF usa Times-Roman/Times-Bold estándar compatible. El cuerpo está justificado. Encabezado: Informe de factibilidad, Inscripción marca, Inscripción en clase/clases y Para. La denominación aparece en mayúsculas en todo el informe y el logo del estudio se reduce un 20%. Cliente omite números de solicitud/registro y coberturas; estudio los conserva en fichas. Ambos omiten el factor de similitud, el anexo opcional y las notas finales retiradas. El cliente ve antecedentes relevantes incluidos, no totales recuperados. Cambiar destinatario, presentación o formato reutiliza la conclusión y no vuelve a llamar al modelo.

Estados e índice mínimo se aplican al lote de hasta 100 candidatos; el filtro por clase puede dejar menos resultados. La paginación 10/25/50/100 recorre ese lote. **«Ver más» para traer nuevos lotes queda aplazado por acuerdo del usuario el 12 de octubre**: el contrato actual del buscador no documenta continuación. [Decisión y requisito de integración](docs/handoffs/2026-10-12-cierre-factibilidad.md). Las imágenes propuestas se envían a la fuente para búsquedas visuales; el borrador completo aún vive en memoria del navegador.

**Agregar la información de tu estudio**, en la tarjeta derecha sobre el logo de la marca, abre un formulario con nombre del estudio, dirección, abogado, texto del encabezado, correo, teléfono, web y logo. Todos son opcionales; se guardan por organización, sobreviven a la recarga y se pueden editar. En Dev quedaron precargados **Zamora IP**, **De Las Heras Abogados para Daniel Morales** y **Flores Acevedo Abogados**, sin cambiar cuentas ni claves. El logo de FA se restauró desde la imagen entregada por el usuario.

OpenRouter está configurado en Dev y producción con una clave de inferencia exclusiva de factibilidad, sin expiración y con tope US$1 autorizado. Se comprobaron generaciones reales con antecedentes ficticios locales. Cada generación persiste contexto, resultado e identificador, además del uso y costo cuando el proveedor los entrega. Las credenciales quedan fuera de Git y del navegador; la configuración local no se publica automáticamente en Railway.

Para uso local, copia [openrouter.example.txt](openrouter.example.txt) a `openrouter.private.txt` y completa `OPENROUTER_API_KEY`. El archivo privado queda fuera de Git. Modelo predeterminado: `openai/gpt-4.1-mini`, modificable con `OPENROUTER_MODEL`. En Railway, esas variables privadas se configuran por ambiente en el servicio `buho-marc-web`: el archivo local no se publica. Dev y producción tienen configurada la misma clave de inferencia por petición del usuario; [ubicación y operación](docs/handoffs/2026-10-12-openrouter-produccion.md). Las variables del servidor tienen prioridad.

Las fichas de clientes ofrecen informes de cartera en Excel (formato inicial), Word y PDF con columnas seleccionables y los datos guardados disponibles, sin iniciar otra consulta a INAPI.

## Dominios · vista de prueba para Búho Marc

El administrador de Búho Marc dispone de Dominios entre Solicitudes de registro y Notificaciones, asociación opcional desde la ficha de marca, alta independiente, tabla y Factibilidad dominio con búsqueda Exacta/Contenga. El resumen muestra Dominios vigilados y Avisos de dominios junto a los KPIs existentes. Todo es simulado y se reinicia al recargar; titular y nuevas fechas de creación quedan pendientes de API. Miembros y otros estudios conservan su interfaz. [Contrato y límites](docs/DOMINIOS_PREVIEW_2026-10-13.md), [entrega y verificación](docs/handoffs/2026-10-13-revision-dominios-admin.md). Publicado exclusivamente en Railway Dev mediante [PR #78](https://github.com/joseibietasepulveda/Buho-Marc/pull/78), con permisos y flujos autenticados verificados; producción conserva su versión.

## Preparación de presentación B&E

Vigilancia usa una escala local más compacta en escritorio. Sus bandejas comparten datos ya cargados. Las opciones Administrador de fuente, Acerca de esta versión y Cambiar clave sólo están habilitadas para el administrador de Búho Marc; la API aplica la misma autorización por organización y rol.

El dashboard interno `/app/admin/dashboard`, con ingreso en `/admin/login`, reúne Costos, Usuarios y actividad, Cartera y alertas, Tareas y plazos, Correos, Llamados a APIs, Evaluaciones y Comportamiento. Prioriza costos confirmados/estimados/reservados, tarifas y fijos configurables, presupuestos, tokens y desglose por proveedor/estudio/usuario; incluye gráfico semanal de interacciones por usuario. Acceso exclusivo a administración Búho, snapshots en segundo plano y telemetría posterior a la respuesta. Historial incompleto se señala sin inventar autoría, entregas o cargos. [Contrato y operación](docs/DASHBOARD_ADMIN_2026-10-14.md), [traspaso y verificaciones](docs/handoffs/2026-10-14-dashboard-admin-uso-costos.md) y [plan PostHog](docs/PLAN_POSTHOG_2026-10-14.md); PostHog aún no está conectado. La [vista de evaluaciones por abogado](docs/EVALUACIONES_ABOGADOS_2026-10-14.md) incorpora 👍/👎, decisiones formales, cruces únicos, cambios de opinión y comentarios, con historial completo paginado en `/app/admin/evaluaciones`.

En factibilidad, cambiar la recomendación borra la conclusión anterior. Al generar nuevamente, IA - Buho Marc redacta argumentos coherentes y termina con la decisión elegida por el abogado. Generada por IA permite que la IA decida. Los cambios de formato y las descargas siguen reutilizando la conclusión preparada.

B&E incorpora BRANDON METRICS, Boretek y BRUMA con sus registros y cruces reales. El resumen prioriza TV ELQUI, BRANDON METRICS y Boretek; BRUMA también queda destacada en Vigilancia. [Alcance, evidencia y pruebas](docs/handoffs/2026-10-12-presentacion-barros-errazuriz.md).

## Ambiente y documentos

- [Aplicación producción](https://buho-marc-web-production.up.railway.app/app).
- [Aplicación Dev](https://buho-marc-web-dev.up.railway.app/app).
- [Índice y vigencia de la documentación](docs/README.md).
- [Cierre de factibilidad y decisión sobre «Ver más» · 12/10/2026](docs/handoffs/2026-10-12-cierre-factibilidad.md).
- [Pulido visual y notificaciones · 04/10/2026](docs/UX_PULIDO_2026-10-04.md).
- [UI, búsqueda e importaciones · 02/10/2026](docs/UX_OCTUBRE_2026.md).
- [Perfiles de estudio, PDF/Word y OpenRouter · 02/10/2026](docs/INFORMES_FACTIBILIDAD_2026-10-02.md).
- [Decisiones UX y operación de septiembre, con actualización de octubre](docs/DECISIONES_UX_2026-09-24.md).
- [Entrega, verificación y próximas versiones](docs/V1_0_RELEASE.md).
- [Plan actualizado](docs/VIGILANCIA_REAL_PLAN.md) y [resumen de decisiones](docs/VIGILANCIA_REAL_HANDOFF.md).
- [Acceso e importación de cartera](docs/PILOTO_DANIEL.md).
- [Landing comercial independiente](https://buho-marc.vercel.app/).

La promoción y carga de FA en producción del 1 de octubre están registradas en [Piloto FA](docs/PILOTO_FA_Y_PRESENTACION_2026-10-01.md). Las mejoras de UI e informes del 2 de octubre se publicaron inicialmente en Dev; la promoción del 8 de octubre las incorporó a Main/producción. Los documentos v0.4/v0.5/v0.6 y la entrega inicial v1.0 conservan su historia; las guías de octubre describen el alcance nuevo.

## Ejecutar en local

Los ajustes de septiembre incorporan prioridades por tarea (Alta/Media/Baja), paginación de pendientes, tarjetas con ambas marcas y tareas, enlaces desde clientes a sus marcas y un historial de la marca vigilada. La migración `0004_task_priorities` asigna prioridad Media a las tareas anteriores y renombra únicamente los clientes mock que conservan sus nombres originales. Véase [detalle de los ajustes](docs/V0_5_UX_SEPTIEMBRE.md).

Requisitos: Node.js 22.13 o superior.

### Inicio con doble clic

En macOS, haz doble clic en **ABRIR BUHO MARC.command**. El lanzador:

1. Cierra una instancia anterior de esta misma aplicación si está activa.
2. Prepara una base PostgreSQL local de demostración y aplica las migraciones. Los datos se conservan en `.buho-local/`.
3. Inicia una instancia nueva, sin conectarse a producción ni ejecutar revisiones automáticas.
4. Abre automáticamente `http://127.0.0.1:3000/app` en el navegador.

Nunca cierra una aplicación ajena que esté usando el mismo puerto; en ese caso muestra un aviso.

También puedes ejecutar `npm run dev:local`: usa el puerto 3000 y una base local en 55433. Cerrar el proceso detiene ambos servicios, pero no borra sus datos. No usa `DATABASE_URL` ni las credenciales de INAPI del ambiente publicado.

Para una prueba aislada puedes indicar `BUHO_LOCAL_DATA_DIR` (otra carpeta de datos) y `BUHO_LOCAL_DB_PORT` (otro puerto). Esto no copia ni reemplaza la base local habitual. Es útil si iCloud mantiene archivos de la carpeta de trabajo pendientes de descarga.

### Inicio desde Terminal con una base configurada

```bash
npm ci
# Configurar DATABASE_URL en .env.local (ver .env.example)
npm run db:migrate
npm run dev
```

Abre [http://localhost:3000/app](http://localhost:3000/app). Para verificar una versión optimizada:

```bash
npm run build
npm run start
```

La aplicación actual requiere PostgreSQL mediante `DATABASE_URL` para cargar la cartera y las solicitudes. Una vista con respuestas simuladas sirve para verificar la interfaz, pero no valida persistencia ni sincronización.

## Funciones conservadas del producto y antecedentes de la demo

- Navegación lateral organizada por trabajo: **Resumen Vigilancia**, cartera y vigilancia, Casos, registros, factibilidad, notificaciones, usuarios, clientes, fuente y auditoría.
- Dashboard con tareas jurídicas pendientes y su caso asociado, alerta por vigilancias separadas por nivel, KPI de casos con vencimiento en menos de 14 días, bandeja priorizada y agenda legal.
- Administración de marcas: búsqueda local por marca, cliente, RUT, solicitud, registro, representante y contraparte, con resultados enlazados a sus fichas. El alta real combina campos y muestra candidatos seleccionables; permite recuperar carteras por titular o representante y confirmar cliente/rol antes de incorporarlas. Excel/CSV admite también personas y razones sociales, con revisión y deduplicación por solicitud.
- Estado de actualización basado en revisiones completas registradas: última revisión exitosa y próxima ejecución diaria a las **12:30 p. m., hora de Santiago de Chile**. Si la programación está desactivada o falla una consulta, se informa sin inventar una fecha de actualización.
- Vigilancia con búsqueda por nombre, filtros acumulables por similitud y estado, edición directa de ambos valores, comparación visual lado a lado y desplazamiento horizontal seguro para tablas angostas.
- Vigilancia real desde los expedientes propios, con resultados agrupados por marca, estados de INAPI y selección individual para seguimiento. El alta ficticia queda limitada a la demo.
- Conversión de una vigilancia en caso; acceso directo desde cada resumen al calendario completo de Casos o Solicitudes, con mes/semana, categorías INAPI/Diario Oficial/tareas y alertas globales. Los fixtures de v0.5 amplían la agenda con cinco casos y tareas adicionales y vencimientos activos desde el 30 de septiembre de 2026, sin desplazar fechas reales.
- Casos ofrece tablero, lista y calendario, con modo simple inicial y modo detallado. El simple oculta tareas pendientes en tarjetas y compacta el calendario. La prioridad se edita desde su píldora en la ficha; el expediente defendido tiene una tabla legible. Se conserva la creación manual y el arrastre entre las tres etapas.
- Ficha de caso con acceso superpuesto a la coincidencia de origen, tareas jurídicas persistentes —incluidas tareas escritas por el usuario, fecha y responsable— y opción confirmada para desvincular la coincidencia sin cerrar el caso.
- Notificaciones Prioritarias y Todas, con retirada individual y limpieza de cada bandeja sin borrar la evidencia subyacente. Los paneles laterales se cierran al pulsar fuera. Las tareas admiten eliminación desde las listas bajo los calendarios y desde su editor, sin eliminar plazos legales. Se conserva la historia cronológica, el aviso de título y el correo comparativo copiable, sin envío automático.
- Factibilidad real por nombre, imagen o ambos, una clase por análisis y multinforme con conclusiones independientes en Dev. Selección y comparación visual con agrupación por marca/titular; informes sin factores de similitud ni porcentajes.
- Seguimiento de registro con tarjetas predeterminadas y vistas de lista y calendario; gestiones y activadores diferenciados, plazos concurrentes, historial de actuaciones y 22 ejemplos del procedimiento separados de la cartera. El calendario nacional LPI/LBPA está versionado para **2026–2027**, no es un calendario procesal universal y no estima años sin cobertura.
- Antecedentes manuales auditados de notificación, ejecutoria y otros hechos habilitantes, asociados a la actuación exacta. Un manifiesto público verifica 19 aceptaciones a trámite del Estado Diario del 4 de septiembre de 2026; no convierte las 45 observaciones de fondo en notificaciones electrónicas acreditadas. Los controles administrativos de INAPI y los hitos informativos se distinguen de los plazos fatales del abogado.
- Directorio de clientes con filas clickeables y edición en ficha lateral; lista y alta de usuarios.
- Administrador de fuente con expedientes INAPI, historial de consultas y ficha de solo lectura con cobertura, antecedentes y resoluciones completas.
- API persistente para crear marcas, casos, tareas y usuarios; revisar coincidencias; mover casos; desvincular coincidencias; editar clientes y gestionar notificaciones.
- Esquema PostgreSQL con migraciones, datos iniciales, auditoría y aislamiento por organización.
- Diseño optimizado prioritariamente para uso en computador. Tablet y móvil conservan compatibilidad básica, pero no son superficies principales del producto.

Las cuentas piloto mantienen sus datos separados por organización en PostgreSQL. Los ejemplos de demostración permanecen en el espacio de prueba y en el explorador del proceso; no se ofrecen como resultados reales en el alta de cartera. Las cantidades visibles cambian al incorporar expedientes, clasificar hallazgos o crear casos.

## Qué no está implementado

**Integración del mismo equipo:** DeQuiénEs (`dequienes.cl`), el servicio que obtiene los datos de INAPI para Buho Marc, es parte del equipo, según aclaración del usuario del 16 de septiembre de 2026. Sus mejoras se coordinan como desarrollo interno, no como dependencia de un proveedor externo ajeno. Véase [responsabilidad y coordinación de la integración](docs/inapi-dev.md#responsabilidad-de-la-integración-y-coordinación-interna).

Hay autenticación de cuentas piloto, consulta y sincronización INAPI, vigilancia real, búsqueda e importación asistida, informes de cliente y de factibilidad. Se guardan perfiles de estudio y contextos/resultados de conclusiones, pero sigue pendiente un archivo completo de estudios con sus imágenes propuestas, almacenamiento general de adjuntos, envío de correos e informe técnico específico de vigilancia. El PDF demo no se ofrece en coincidencias reales.

El filtro de estados aún no existe en la llamada de Víctor. Se interpretan y filtran los estados en la aplicación con los antecedentes disponibles, conservando la respuesta original. **Falta acordar el catálogo completo con la fuente. No asumir que una etiqueta de rechazo siempre significa que el proceso terminó definitivamente: podría haber recursos o instancias posteriores.** LOLA 1367215 tiene una corrección individual respaldada por resoluciones oficiales; no se extrapola a otros expedientes. El 07/10 se publicó en Dev la recuperación puntual desde el buscador público de INAPI: [API y contrato observado](docs/INAPI_API_PUBLICA.md), [cola, límites y contrato preparado para DeQuiénEs](docs/INAPI_RECUPERACION_ANTECEDENTES.md). Esta autorización sustituye el aplazamiento anterior; la disponibilidad de la conexión oficial se registra por separado del despliegue.

### Mejoras de UX entregadas

- Comparación de marcas al abrir una fila, con logos ampliables y clases compartidas.
- Historiales de inscripción y fuente ordenados de la actuación más antigua a la más reciente, con flechas, detalle íntegro desplegable y tratamiento de datos ausentes.
- Consulta de expedientes, origen de datos, sincronización y seguimiento de novedades INAPI; tabla principal resumida y ficha lateral accesible desde cada fila.
- Tareas de casos con estados No aplica, Pendiente y Completado; las pendientes aparecen en Resumen Vigilancia junto al caso correspondiente.

El alcance, la verificación y los pendientes de la entrega están en [v0.5](docs/V0_5_RELEASE.md). [UX_RELEASE_PLAN.md](docs/UX_RELEASE_PLAN.md) conserva las rondas anteriores como historial.

La lógica procesal contrastada con las Directrices INAPI 2026 y la Ley 19.039 se detalla en [docs/REGISTRATION_PROCESS_REVIEW.md](docs/REGISTRATION_PROCESS_REVIEW.md), incluidos activadores, límites de automatización y escenarios simulados.

La revisión ampliada de v0.5 está en [Proceso y plazos de marcas en Chile](docs/PROCESO_Y_PLAZOS_MARCAS_CHILE.md), y la cobertura y límites de los feriados en [Calendario legal Chile 2023–2027](docs/CALENDARIO_LEGAL_CHILE_2026_2027.md). Registrar un antecedente del equipo no modifica el expediente original de INAPI ni sustituye la revisión del documento oficial.

### Pendientes de próximas versiones

- Poner el sistema en un servidor dedicado para poder revisar más solicitudes; medir capacidad, costo, respaldos y límites de DeQuiénEs.
- [Control de consumo y programación por cartera](docs/COST_CONTROL.md): Daniel automático, Búho a pedido.


La lista vigente se interpreta junto con [las entregas de octubre](docs/README.md) y [v1.0](docs/V1_0_RELEASE.md#próximas-versiones). Incluye filtro y catálogo de estados en la fuente, calibración, cargas tardías y exhaustividad, operación a escala, adjuntos y archivo completo de estudios. Los informes PDF/Word, el buscador general y la importación por titular/representante ya están implementados. OpenRouter quedó activado en Dev con una clave de inferencia exclusiva; producción reutiliza esa clave desde el 12 de octubre por autorización explícita, conservando el modelo y presupuesto compartido.

### Backlog · Registro de marcas

> Criterio de producto: esta sección está pensada para escritorio. La adaptación móvil es secundaria y sólo debe asegurar acceso básico, sin condicionar la densidad ni la distribución del Canvas en computador.

- Registrar cada cambio de estado como un evento inmutable de historial, conservando fecha y fuente.
- Mantener y versionar el calendario de feriados chilenos, incluidos los feriados electorales o regionales que correspondan al expediente.
- Generar notificaciones persistentes cuando un plazo pase a “próximo a vencer” o “vencido / requiere revisión”.

## Despliegue en Railway

El repositorio incluye `railway.json`, migraciones y un health check en `/api/health`. El servicio web necesita una instancia PostgreSQL y la variable `DATABASE_URL`. Al iniciar, aplica las migraciones; la primera carga crea los datos ficticios de forma idempotente.

Railway publica la web app en `/app` y sirve la landing principal en `/`. La URL anterior `/landing-de-prueba-js` redirige a esa landing. La landing comercial se despliega por separado en Vercel, también en `/`.

Los cambios de la aplicación se validan y publican primero en el ambiente Railway **Dev** (`buho-marc-web-dev.up.railway.app`). El ambiente `production` sólo se actualiza mediante una solicitud explícita posterior.

La integración INAPI se verificó en Dev el 4 de septiembre de 2026; véase [el registro de verificación](docs/inapi-dev.md). La promoción de ramas y los cambios de UX de septiembre se documentan en [docs/UX_RELEASE_PLAN.md](docs/UX_RELEASE_PLAN.md).

La guía completa está en [docs/RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md).

## Documentación para convertirlo en producto

- [Guía de la demo](docs/DEMO_GUIDE.md)
- [Entrega v0.5 verificada en Dev](docs/V0_5_RELEASE.md)
- [Verificación de v0.5](docs/V0_5_QA.md)
- [Proceso y plazos de marcas en Chile](docs/PROCESO_Y_PLAZOS_MARCAS_CHILE.md)
- [Calendario legal Chile 2023–2027](docs/CALENDARIO_LEGAL_CHILE_2026_2027.md)
- [Arquitectura implementada y evolución](docs/ARCHITECTURE.md)
- [Contrato con el motor de cruces](docs/MATCHING_ENGINE_INTEGRATION.md)
- [Modelo de datos y migraciones actuales](docs/DATA_MODEL.md)
- [Hoja de ruta de implementación](docs/IMPLEMENTATION_ROADMAP.md)
- [Operación y despliegue en Railway](docs/RAILWAY_DEPLOYMENT.md)

## Estructura relevante

- `app/portada-3/`: componentes compartidos de la landing y del dashboard promocional estático.
- `app/page.tsx`: ruta principal de la landing comercial.
- `app/Landing/page.tsx` y `app/landing-de-prueba-js/page.tsx`: rutas anteriores que redirigen a la landing principal.
- `app/app/page.tsx`: interfaz y modo de respaldo local.
- `app/app/feasibility-review.tsx`: búsqueda de factibilidad, selección de antecedentes y preparación/descarga del informe.
- `app/app/report-profile-editor.tsx` y `app/api/report-profile/route.ts`: formulario del estudio, persistencia y control de versiones.
- `lib/feasibility-conclusion.ts`, `lib/openrouter-conclusion.ts`, `db/feasibility-conclusions.ts` y `app/api/feasibility/conclusions/`: contexto completo, conclusión asistida/determinista y registro de generaciones.
- `lib/feasibility-report.ts` y `lib/feasibility-docx.ts`: informes PDF y Word; `public/reports/studios/`: logos preparados.
- `lib/report-profile-presets.ts` y `db/report-profile-provision.ts`: precarga idempotente en Dev, sin sobrescribir ediciones.
- `app/api/inapi/search/route.ts` y `app/api/portfolio/import/route.ts`: candidatos e incorporación asistida de cartera.
- `app/api/clients/report/route.ts`: informe de cliente por columnas y formato.
- `scripts/verify-feasibility-layout.ts`: seis variantes de PDF/Word desde una búsqueda guardada, sin iniciar otra búsqueda ni llamar al LLM.
- `app/app/source-admin.tsx` y `app/app/source-inspector.tsx`: administración de la fuente y ficha legible del expediente.
- `lib/registration-procedure.ts` y `lib/registration-scenarios.ts`: reglas compartidas del seguimiento y casos ficticios del proceso.
- `lib/legal-calendar.ts`: calendario nacional LPI/LBPA versionado para 2023–2027.
- `lib/registration-evidence.ts`, `lib/inapi-daily-evidence.ts` y `app/api/registrations/evidence/route.ts`: asociación estricta del antecedente a su actuación, manifiesto público verificado y registro/revocación auditados.
- `lib/notification-timeline.ts`: composición de cronologías, deduplicación y protección ante expedientes homónimos.
- `app/api/source/status/route.ts` y `lib/source-schedule.ts`: consulta ligera de metadatos de revisión y próxima ejecución en `America/Santiago`.
- `app/api/demo/route.ts`: lectura y mutaciones de la demo persistente.
- `db/schema.ts`: esquema PostgreSQL; `drizzle/`: migraciones versionadas.
- `db/demo.ts`: datos iniciales ficticios y consultas de la demo.
- `db/demo-v05.ts` y `lib/demo-v05-data.ts`: actualización idempotente de fixtures, separada de los expedientes reales.
- `app/app/legal-agenda.tsx`, `case-tasks.tsx`, `notification-center.tsx` y `brand-search.tsx`: flujos compartidos de v0.4.
- `app/api/tasks/route.ts`: tareas persistentes de solicitudes y eliminación de tareas.
- `lib/release-notes.ts`: versión y pendientes mostrados en la app.
- `app/app/v04.css`: estilos de los nuevos flujos.
- `app/app/v05.css` y `registration-v05.css`: ajustes visuales de v0.5.
- `app/app/ux-polish.css` y `notification-center.css`: pulido del revisor, tareas, X centradas y bandeja de notificaciones de octubre.
- `app/app/buho-app.css`: sistema visual de la aplicación.
- `app/app/layout.tsx`: metadatos de la ruta privada de demo.
- `docs/`: decisiones para el backend y la evolución funcional.

## Sistema visual

La app reutiliza los valores de la landing: tinta `#100d18`, fondo claro `#f3efe8`, violeta `#a855f7`, tipografías Geist y Geist Mono, radios pequeños y bordes translúcidos. En escritorio la superficie se presenta con la densidad equivalente a una visualización al 90 %, sin que el visitante deba cambiar el zoom de su navegador. El nombre Buho Marc es identificador visual, no un hipervínculo dentro de la app.

### Ajustes de experiencia de v1.0

Resumen con tareas compactas junto al saludo e iconos de color en los KPIs; dos tarjetas por fila en la columna En seguimiento de Casos, con adaptación móvil. La ficha de vigilancia vuelve a comparar ambas marcas lado a lado con datos reales. Factibilidad conserva el formulario amplio con clases, tarjeta de agrupación a su derecha, datos del estudio sobre el logo lateral, botón para quitar la imagen y estados coloreados (Registrada verde; Denegada, Abandonada y Desistida rojo).

## Verificación de las mejoras de octubre

La última ronda se comprobó en una base PostgreSQL descartable, con proveedores controlados: compilación/TypeScript, ESLint de 37 archivos, 39 pruebas dirigidas, cinco comprobaciones estructurales y dos recorridos amplios por las rutas reales. Se compararon once referencias y capturas a 1280 × 720, controles abiertos y las nueve secciones a 390 × 844. PDF/Word descargados desde la nueva interfaz contienen las mismas dos solicitudes y conclusión; se renderizaron y revisaron sus cuatro páginas. [Evidencia](output/implementacion-ux-2026-10-04/README.md). No hubo despliegue ni llamadas nuevas con credenciales reales en esta ronda.

La compilación, TypeScript y los componentes modificados pasaron las comprobaciones. Las pruebas dirigidas y el piloto aislado con PostgreSQL verificaron importaciones, duplicados, cliente/rol, informes, persistencia, aislamiento, retirada de avisos, eliminación de tareas y conclusión asistida con sus fallos. PDF y Word se renderizaron y se revisaron completos en seis variantes: sin estudio, estudio de ejemplo, texto largo y los tres perfiles preparados. Los resultados y límites están en [QA visual](design-qa.md), [UX de octubre](docs/UX_OCTUBRE_2026.md) e [Informes de factibilidad](docs/INFORMES_FACTIBILIDAD_2026-10-02.md).

Actualizar esta documentación no ejecuta búsquedas de vigilancia ni vuelve a certificar funciones ajenas a la ronda.

Mis marcas recupera automáticamente cargas fallidas de su parte figurativa, sin botón adicional. Las miniaturas conservan sus proporciones y los errores no deforman la tabla; una imagen no disponible se distingue de una marca denominativa. [Detalle y validación](docs/UX_VALORACIONES_COMPARACION_2026-10-05.md#parte-figurativa-en-mis-marcas).

## Antecedentes faltantes · 7 de octubre de 2026

La revisión habitual mantiene a DeQuiénEs como servicio de datos. Una importación/revisión con fechas jurídicas faltantes puede preparar **un intento por antecedente** en una cola persistente, compartida por solicitud entre carteras. El supervisor consulta un expediente por turno, con **mínimo tres segundos después de cada petición HTTP**, bloqueo global entre réplicas y un presupuesto global de **200 expedientes/día**, actualizado por petición del usuario. Una consulta completa requiere como máximo tres peticiones. Fallar pausa la cola una hora; el mismo antecedente no se reintenta automáticamente.

La API pública aporta estado e historial, pero no garantiza constancia de notificación ni ejecutoria. Desde el 12/10, una actuación reconocida y fechada permite calcular los plazos de notificación bajo la convención del proyecto; se indica la suposición sin fabricar pruebas. Si falta la fecha del acto, la publicación o la ejecutoria necesaria, se muestra el antecedente pendiente. Las nuevas reglas distinguen petición/resolución/escrito, conservan oposición y fondo concurrentes, separan incidentes y nulidad, reconocen desistimiento total y pago final y utilizan el calendario nacional revisado 2023–2027. La ficha del administrador distingue consulta exitosa, cambio detectado, lectura oficial informada y completitud declarada.

- [Endpoints y adaptación de la API pública](docs/INAPI_API_PUBLICA.md).
- [Funcionamiento, variables, evidencia y campos preparados para Víctor](docs/INAPI_RECUPERACION_ANTECEDENTES.md).
- [Traspaso: archivos, migración, pruebas y estado de integración](docs/handoffs/2026-10-07-recuperacion-inapi-y-actuaciones.md).

Migración: `0014_inapi_recovery.sql`, antes de activar el trabajador. `scripts/reproject-inapi-records.ts` revisa/aplica las nuevas reglas a los datos guardados sin consultas externas; `--apply --queue` prepara recuperaciones acotadas. Las vistas también reproyectan al leer, sin extraer de nuevo. `INAPI_DIRECT_RECOVERY_ENABLED=false` desactiva el trabajador; `INAPI_DIRECT_RECOVERY_DAILY_LIMIT` controla el presupuesto diario y admite cero. Nunca se configura un intervalo inferior a tres segundos.


### Correo semanal de vigilancia con GLM y Resend · 14 de octubre de 2026

Resumen de cruces nuevos seleccionados por GLM directo, tareas y plazos de los próximos 14 días, con tablas pastel y ocho filas por sección. Lunes 08:30 Chile; botón de Admin de hasta 150 cruces. Configuración aprobada: máximo cinco nuevos por marca y prefiltro DeQuiénEs ≥25%. Decisiones y envíos persistentes; piloto fijo `hola@rcirculo.com`, claves exclusivas y envío desactivado por defecto. [Contrato, análisis del corte y pasos para conectar Resend](docs/CORREO_SEMANAL_GLM_RESEND_2026-10-13.md), [estado y verificación](docs/handoffs/2026-10-13-correo-semanal-glm-resend.md). Piloto autorizado: 141 cruces seleccionados, 131 decisiones válidas, 16 para revisar y diez pendientes; costo US$0,02870619. Verificación local aprobada; publicado solo en Dev por PR #80, migración aplicada y salud verificada. No se enviaron correos reales: falta crear/verificar Resend y añadir las claves exclusivas.
