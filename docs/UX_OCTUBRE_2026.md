# Mejoras de UI y UX · 2 de octubre de 2026

Esta ronda actualiza las decisiones de septiembre sobre las columnas de Mis marcas, el alta de cartera, los informes de clientes y la presentación de Casos. El resto de las reglas de vigilancia, clasificación jurídica y operación se conserva. Destino autorizado: Railway Dev.

## Búsqueda y carga asistida

- El buscador general consulta los datos guardados por marca, cliente, RUT, solicitud, registro, representante y contraparte. Sus resultados abren las fichas relacionadas; no inicia búsquedas remotas al escribir.
- Agregar marcas ofrece criterios a la izquierda y candidatos seleccionables a la derecha. Permite combinar marca, solicitud, nombre/razón social, RUT, rol de titular o representante, clase y estado.
- Los nombres y RUT de representantes permiten recuperar carteras sin Excel. Cada candidato explica la parte que coincidió. Se confirma cliente y rol por expediente, con opción explícita de dejarlo sin cliente. Incorporar requiere confirmar que corresponde a la cartera propia; los expedientes contrarios siguen ingresando desde Casos.
- Excel/CSV admite solicitudes, RUT, razones sociales y representantes, incluso en hojas combinadas. Las búsquedas por personas requieren revisión del rol y una acción explícita de búsqueda. Los clientes escritos en el archivo son sugerencias; no crean vínculos automáticamente.
- Filas repetidas y candidatos repetidos se reúnen por solicitud. Los expedientes existentes conservan sus vínculos; una importación repetida no sobrescribe clientes ni roles. Cada expediente se clasifica según los antecedentes de INAPI. Las consultas e incorporaciones usan lotes acotados, conservan lo ya incorporado ante un error y permiten continuar la revisión.

## Alcance de la fuente

Referencia revisada: [documentación INAPI de DeQuiénEs](https://dequienes.cl/inapi/docs).

`POST /inapi/trademarks/by-holder` acepta RUT exacto, nombre por semejanza y rol `holder`, `representative` o `any`. Permite nombre y RUT juntos, hasta 100 resultados por página y desplazamiento máximo de 10.000. Los expedientes completos se obtienen con `/batch`. La interfaz informa cuando el límite de recorrido impide recuperar más candidatos.

La consulta por nombre de marca recupera hasta 100 candidatos mediante `/search`. Contiene, Similar, Contiene palabra completa, Empieza con, Termina con y Exacto están disponibles donde corresponde. Los modos textuales, clases estrictas y estados se aplican al lote recuperado; no constituyen una búsqueda exhaustiva en el registro completo. El número de solicitud usa consulta exacta. La fuente no documenta consulta directa por número de registro; ese número sí se puede buscar entre los expedientes guardados.

En factibilidad, Solicitud desde, Publicación DO desde y Registro desde se envían a la fuente para limitar los canales antes de recuperar candidatos. Las clases orientan la recuperación y no son filtros exclusivos. Se incorporan descripción de etiqueta, titular de la propuesta, exclusión de ese titular y selección del modelo visual. La agrupación está arriba y activada inicialmente. Los filtros de estado y similitud mínima siguen aplicándose a los antecedentes recuperados. Los informes PDF/Word ahora se llaman **Informe de factibilidad**.

## Clientes e informes

La ficha de cliente reúne marcas y solicitudes asociadas mediante su identificador. Junto a Marcas vinculadas aparece Descargar informe de cliente. La pestaña de preparación ofrece selección individual de columnas, selección completa y formatos Excel (inicial), Word y PDF. El botón de descarga permanece abajo a la derecha.

Se ofrecen identificación, estado, fechas, titular, representante, rol del cliente, coberturas, seguimiento, casos y tareas, hallazgos, comentarios, metadatos de archivos y todos los campos guardados de la fuente y del seguimiento. No se vuelve a consultar INAPI para preparar el informe. Las celdas que exceden el máximo de Excel conservan su contenido en una hoja complementaria. El PDF lleva los datos seleccionados completos como adjunto JSON UTF-8, además de la presentación legible. Cada informe se limita al cliente y a la organización de la sesión.

## Pantallas y acciones

- Mis marcas comienza con número de solicitud. El RUT se retira de las columnas visibles y se mantiene en la ficha y las búsquedas. Estado INAPI y pendientes de vigilancia usan texto; más de cinco pendientes se presenta como «5+ por revisar». Se retira el filtro Real/Mock y el párrafo explicativo solicitado.
- Casos tiene modo simple inicial y modo detallado en tablero, lista y calendario. El simple oculta tareas pendientes en las tarjetas y compacta el calendario. Los códigos BM se retiran de las vistas generales; la ficha conserva el detalle. La prioridad se presenta como Prioridad alta/media/baja y se modifica desde su píldora en la ficha.
- El expediente de la marca defendida se presenta en tabla, con acciones e historial separados de los datos.
- Los paneles laterales se cierran al pulsar fuera; los diálogos compartidos también admiten Escape y devuelven el foco al control de origen.
- Las notificaciones admiten retirada individual y limpieza de Prioritarias o Todas. La retirada se guarda por organización, conserva el registro subyacente y no impide recibir nuevas actuaciones. Limpiar Prioritarias conserva los avisos administrativos de Todas.
- Las tareas tienen una X en las listas bajo los calendarios y un botón rojo de eliminación en su editor. Se mantienen los plazos legales y los hitos derivados del expediente.

## Validación

- Compilación de producción y revisión de TypeScript; revisión de los componentes modificados con ESLint.
- 30 pruebas dirigidas: modos textuales, formato de RUT, archivos mixtos, duplicados, fórmulas, contratos de búsqueda, paginación y generación de informes.
- Flujo aislado con PostgreSQL y proveedor de prueba: sesión, separación entre organizaciones, clasificación de cartera, oposiciones presentadas/recibidas, sincronización, cambios de prioridad, eliminación de tareas, confirmación de cliente/rol para marcas y solicitudes, informes Excel/Word/PDF y retirada persistente de notificaciones.
- Verificación visual e interacción en navegador: tablero simple/detallado, tabla del expediente defendido, búsqueda de cartera, selector de columnas, agrupación inicial y fechas de factibilidad, cierre exterior y tamaño angosto.

Las pruebas aisladas no utilizan expedientes ni claves alojadas. La publicación se completa únicamente al verificar el commit desplegado en Dev y su estado de salud.

## Informes de factibilidad y perfiles del estudio

La ronda posterior reemplazó la generación sin LLM y el logo genérico: **Agrega la información de tu estudio** abre un formulario encima de los criterios, con campos opcionales persistentes por organización. PDF y Word siguen el ejemplo del cliente, con coberturas completas, conclusión y firma al final. OpenRouter está preparado con todos los antecedentes textuales de la búsqueda, deduplicación y respaldo determinista ante falta de clave o fallo. Se precargaron Zamora IP, De Las Heras para Daniel y FA en sus espacios existentes de Dev; no se cambiaron claves ni datos de producción. [Formato, configuración y QA](INFORMES_FACTIBILIDAD_2026-10-02.md).

## Publicación comprobada

La ronda de búsqueda/clientes/acciones corresponde a `5a2010e`, seguida por ajustes de paneles/móvil `d4a5272` y los nuevos informes `b42ae34`. El despliegue funcional Dev `f02635e3-bd50-4342-9931-710d648b36a4` terminó en `SUCCESS` el 2 de octubre, con migraciones aplicadas y `/api/health` 200 (base conectada y `engine: dequienes`). La precarga de los tres perfiles se confirmó en los registros de ese despliegue. [Evidencia de operación](RAILWAY_DEPLOYMENT.md). Esta ronda permanece en Dev.
