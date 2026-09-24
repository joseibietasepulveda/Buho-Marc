# Buho Marc · v1.0

Vigilancia y prefactibilidad conectadas a la búsqueda real de INAPI / DeQuiénEs. Esta entrega se implementa y valida en **Railway Dev**. El estado de publicación y las pruebas se documentan en [la entrega v1.0](docs/V1_0_RELEASE.md).

Las decisiones vigentes, incluidas las revisiones manuales desde el chat y los informes PDF/Word, están consolidadas en [Decisiones UX del 24 de septiembre de 2026](docs/DECISIONES_UX_2026-09-24.md). Ese documento prevalece sobre las descripciones históricas de versiones anteriores.

## Vigilancia real

Las marcas y solicitudes propias importadas se incorporan automáticamente. Cada búsqueda de stock pide **50 similitudes**. La respuesta se conserva completa; Por revisar admite estados confirmados en trámite o concedidos/registrados y excluye estados terminales o ambiguos mediante la política compartida con los contadores. «Mis marcas» reúne marcas registradas y solicitudes propias, con columnas iniciales RUT, Parte Figurativa y Marca; el logo tiene su propia celda y usa «Sin logo» cuando falta.

«Vigilancia» tiene dos pestañas: «Por revisar» y «En seguimiento». Por revisar organiza los hallazgos en alta y media similitud, con umbrales iniciales de **65% y 45%**, ajustables de 5 en 5 y persistentes por organización. Ordena de mayor a menor índice y muestra inicialmente cinco coincidencias por marca/categoría; **Buscar más** añade cinco del lote guardado. En seguimiento usa una tabla sin niveles de similitud y conserva las decisiones incluso si cambia el estado del expediente. Cada resultado permite comparar marcas, consultar historial, seguir o convertir en caso.

Los botones de revisión manual se retiraron de Vigilancia: las actualizaciones a pedido se solicitan desde el chat con el asistente. Daniel conserva su revisión automática diaria; Búho permanece a pedido. Abrir la pantalla no inicia una búsqueda. Véase [control de consumo](docs/COST_CONTROL.md).

«Avísame si se publica en el Diario Oficial» guarda el seguimiento y genera un aviso interno cuando la fuente informa la publicación. El sistema sigue consultando esos expedientes aunque salgan de los primeros resultados.

La revisión diaria combina stock con búsquedas separadas de ingresos y publicaciones. Las novedades se agregan sin duplicar solicitudes; el lote posterior puede superar 50 por incluir ventanas adicionales. La publicación posterior conserva la revisión anterior. Hay cola persistente, reintentos, pausa/reanudación e indicadores separados de la sincronización de expedientes.

Ante un HTTP 403 de la fuente, la vigilancia espera 20 segundos y reintenta hasta 10 veces después del intento inicial. La espera y el contador persisten entre reinicios; durante la espera no inicia otra búsqueda de vigilancia. Si se agotan los reintentos, conserva el último resultado exitoso e informa el fallo.

## Prefactibilidad

Nombre, imagen o ambos; clases y coberturas opcionales; estados y porcentaje mínimo elegidos antes de Buscar. Se recuperan hasta 100 candidatos y se aplican los filtros sobre los antecedentes obtenidos, con paginación de 10/25/50/100. Por defecto se consideran registradas y en trámite. El índice se muestra en porcentaje y **no expresa probabilidad de conflicto ni de registro**. Las imágenes se transmiten a la fuente para la consulta y no se guardan como estudios permanentes en esta versión.

Informes descargables en PDF y Word editable, con logo del estudio, imágenes y lenguaje simple, sin LLM. El usuario selecciona marcas para el informe; sin selección se incluyen hasta cinco de mayor índice. La recomendación aparece al final y se sugiere según las coincidencias de toda la búsqueda, con mayor cautela ante similitudes altas. El abogado puede editarla.

## Ambiente y documentos

- [Aplicación Dev](https://buho-marc-web-dev.up.railway.app/app).
- [Decisiones UX y operación vigentes · 24/09/2026](docs/DECISIONES_UX_2026-09-24.md).
- [Entrega, verificación y próximas versiones](docs/V1_0_RELEASE.md).
- [Plan actualizado](docs/VIGILANCIA_REAL_PLAN.md) y [resumen de decisiones](docs/VIGILANCIA_REAL_HANDOFF.md).
- [Acceso e importación de cartera](docs/PILOTO_DANIEL.md).
- [Landing comercial independiente](https://buho-marc.vercel.app/).

Main se actualizó con los cambios que ya estaban en dev (`6170e3f`) antes de comenzar esta entrega. La nueva v1.0 permanece en dev; no se promueve a producción. Los documentos v0.4/v0.5/v0.6 son antecedentes históricos.

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
- Administración de marcas: búsqueda **«contiene»** en la cartera por los atributos disponibles, sin distinguir mayúsculas, acentos ni formato del RUT. El alta conserva la consulta exacta: real por solicitud y mock por atributos detrás de una flag, con parámetros encontrados a la izquierda.
- Estado de actualización basado en revisiones completas registradas: última revisión exitosa y próxima ejecución diaria a las **12:30 p. m., hora de Santiago de Chile**. Si la programación está desactivada o falla una consulta, se informa sin inventar una fecha de actualización.
- Vigilancia con búsqueda por nombre, filtros acumulables por similitud y estado, edición directa de ambos valores, comparación visual lado a lado y desplazamiento horizontal seguro para tablas angostas.
- Vigilancia real desde los expedientes propios, con resultados agrupados por marca, estados de INAPI y selección individual para seguimiento. El alta ficticia queda limitada a la demo.
- Conversión de una vigilancia en caso; acceso directo desde cada resumen al calendario completo de Casos o Solicitudes, con mes/semana, categorías INAPI/Diario Oficial/tareas y alertas globales. Los fixtures de v0.5 amplían la agenda con cinco casos y tareas adicionales y vencimientos activos desde el 30 de septiembre de 2026, sin desplazar fechas reales.
- Tablero de casos por etapa, creación manual y arrastre entre Esperando confirmación de cliente, En seguimiento y Concluido.
- Ficha de caso con acceso superpuesto a la coincidencia de origen, tareas jurídicas persistentes —incluidas tareas escritas por el usuario, fecha y responsable— y opción confirmada para desvincular la coincidencia sin cerrar el caso.
- Notificaciones Prioritarias y Todas, sin configuraciones. Prioritarias abre una ficha lateral con el aviso y la historia cronológica disponible; cada hito despliega sus detalles e identificadores. Todas conserva su presentación desplegable y existe aviso de emisión de título. Correo al cliente con cuadro comparativo copiable; PDF técnico interno.
- Prefactibilidad real por nombre, imagen o ambos, clases/coberturas opcionales y resultados visuales, con agrupación opcional. No presenta porcentajes de probabilidad jurídica.
- Seguimiento de registro con tarjetas predeterminadas y vistas de lista y calendario; gestiones y activadores diferenciados, plazos concurrentes, historial de actuaciones y 22 ejemplos del procedimiento separados de la cartera. El calendario nacional LPI/LBPA está versionado para **2026–2027**, no es un calendario procesal universal y no estima años sin cobertura.
- Antecedentes manuales auditados de notificación, ejecutoria y otros hechos habilitantes, asociados a la actuación exacta. Un manifiesto público verifica 19 aceptaciones a trámite del Estado Diario del 4 de septiembre de 2026; no convierte las 45 observaciones de fondo en notificaciones electrónicas acreditadas. Los controles administrativos de INAPI y los hitos informativos se distinguen de los plazos fatales del abogado.
- Directorio de clientes con filas clickeables y edición en ficha lateral; lista y alta de usuarios.
- Administrador de fuente con expedientes INAPI, historial de consultas y ficha de solo lectura con cobertura, antecedentes y resoluciones completas.
- API persistente para crear marcas, casos, tareas y usuarios; revisar coincidencias; mover casos; desvincular coincidencias; editar clientes y gestionar notificaciones.
- Esquema PostgreSQL con migraciones, datos iniciales, auditoría y aislamiento por organización.
- Diseño optimizado prioritariamente para uso en computador. Tablet y móvil conservan compatibilidad básica, pero no son superficies principales del producto.

La cartera combina ejemplos identificados como simulados y expedientes importados mediante el proveedor INAPI configurado. En Railway se comparten mediante PostgreSQL. Las cantidades visibles cambian a medida que se clasifican vigilancias o se convierten en casos.

## Qué no está implementado

**Integración del mismo equipo:** DeQuiénEs (`dequienes.cl`), el servicio que obtiene los datos de INAPI para Buho Marc, es parte del equipo, según aclaración del usuario del 16 de septiembre de 2026. Sus mejoras se coordinan como desarrollo interno, no como dependencia de un proveedor externo ajeno. Véase [responsabilidad y coordinación de la integración](docs/inapi-dev.md#responsabilidad-de-la-integración-y-coordinación-interna).

Hay autenticación de cuentas piloto, consulta y sincronización INAPI, vigilancia real y prefactibilidad real. Todavía faltan almacenamiento duradero de archivos/estudios, envío de correos e informe PDF técnico específico. El PDF demo no se ofrece en coincidencias reales.

El filtro de estados aún no existe en la llamada de Víctor. Se interpretan y filtran los estados en la aplicación con los antecedentes disponibles, conservando la respuesta original. **Falta acordar el catálogo completo con la fuente. No asumir que una etiqueta de rechazo siempre significa que el proceso terminó definitivamente: podría haber recursos o instancias posteriores.** LOLA 1367215 tiene una corrección individual respaldada por resoluciones oficiales; no se extrapola a otros expedientes. La API directa de INAPI quedó aplazada hasta contar con acceso documentado.

### Mejoras de UX entregadas

- Comparación de marcas al abrir una fila, con logos ampliables y clases compartidas.
- Historiales de inscripción y fuente ordenados de la actuación más antigua a la más reciente, con flechas, detalle íntegro desplegable y tratamiento de datos ausentes.
- Consulta de expedientes, origen de datos, sincronización y seguimiento de novedades INAPI; tabla principal resumida y ficha lateral accesible desde cada fila.
- Tareas de casos con estados No aplica, Pendiente y Completado; las pendientes aparecen en Resumen Vigilancia junto al caso correspondiente.

El alcance, la verificación y los pendientes de la entrega están en [v0.5](docs/V0_5_RELEASE.md). [UX_RELEASE_PLAN.md](docs/UX_RELEASE_PLAN.md) conserva las rondas anteriores como historial.

La lógica procesal contrastada con las Directrices INAPI 2026 y la Ley 19.039 se detalla en [docs/REGISTRATION_PROCESS_REVIEW.md](docs/REGISTRATION_PROCESS_REVIEW.md), incluidos activadores, límites de automatización y escenarios simulados.

La revisión ampliada de v0.5 está en [Proceso y plazos de marcas en Chile](docs/PROCESO_Y_PLAZOS_MARCAS_CHILE.md), y la cobertura y límites de los feriados en [Calendario legal Chile 2026–2027](docs/CALENDARIO_LEGAL_CHILE_2026_2027.md). Registrar un antecedente del equipo no modifica el expediente original de INAPI ni sustituye la revisión del documento oficial.

### Pendientes de próximas versiones

- Poner el sistema en un servidor dedicado para poder revisar más solicitudes; medir capacidad, costo, respaldos y límites de DeQuiénEs.
- [Control de consumo y programación por cartera](docs/COST_CONTROL.md): Daniel automático, Búho a pedido.


La lista vigente está en [v1.0](docs/V1_0_RELEASE.md#próximas-versiones) y en «Acerca de esta versión» dentro de la app. Incluye filtro y catálogo de estados, calibración de semejanza, cargas tardías/paginación, operación a escala, PDF, archivos y estudios guardados. La conexión real visual/fonética y la búsqueda de prefactibilidad ya no se mantienen como tareas pendientes.

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
- [Calendario legal Chile 2026–2027](docs/CALENDARIO_LEGAL_CHILE_2026_2027.md)
- [Arquitectura propuesta](docs/ARCHITECTURE.md)
- [Contrato con el motor de cruces](docs/MATCHING_ENGINE_INTEGRATION.md)
- [Modelo de datos inicial](docs/DATA_MODEL.md)
- [Hoja de ruta de implementación](docs/IMPLEMENTATION_ROADMAP.md)
- [Operación y despliegue en Railway](docs/RAILWAY_DEPLOYMENT.md)

## Estructura relevante

- `app/portada-3/`: componentes compartidos de la landing y del dashboard promocional estático.
- `app/page.tsx`: ruta principal de la landing comercial.
- `app/Landing/page.tsx` y `app/landing-de-prueba-js/page.tsx`: rutas anteriores que redirigen a la landing principal.
- `app/app/page.tsx`: interfaz y modo de respaldo local.
- `app/app/feasibility-review.tsx`: búsqueda real de prefactibilidad por nombre/imagen y coberturas.
- `app/app/source-admin.tsx` y `app/app/source-inspector.tsx`: administración de la fuente y ficha legible del expediente.
- `lib/registration-procedure.ts` y `lib/registration-scenarios.ts`: reglas compartidas del seguimiento y casos ficticios del proceso.
- `lib/legal-calendar.ts`: calendario nacional LPI/LBPA versionado para 2026–2027.
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
- `app/app/v05.css`, `registration-v05.css` y `notification-center.css`: ajustes visuales de v0.5.
- `app/app/buho-app.css`: sistema visual de la aplicación.
- `app/app/layout.tsx`: metadatos de la ruta privada de demo.
- `docs/`: decisiones para el backend y la evolución funcional.

## Sistema visual

La app reutiliza los valores de la landing: tinta `#100d18`, fondo claro `#f3efe8`, violeta `#a855f7`, tipografías Geist y Geist Mono, radios pequeños y bordes translúcidos. En escritorio la superficie se presenta con la densidad equivalente a una visualización al 90 %, sin que el visitante deba cambiar el zoom de su navegador. El nombre Buho Marc es identificador visual, no un hipervínculo dentro de la app.

### Ajustes de experiencia de v1.0

Resumen con tareas compactas junto al saludo e iconos de color en los KPIs; dos tarjetas por fila en la columna En seguimiento de Casos, con adaptación móvil. La ficha de vigilancia vuelve a comparar ambas marcas lado a lado con datos reales. Factibilidad conserva el formulario amplio con clases, logo lateral, botón para quitar la imagen y estados coloreados (Registrada verde; Denegada, Abandonada y Desistida rojo).
