# Presentación de la cuenta de prueba y piloto FA Abogados

Solicitud del 1 de octubre de 2026. Entrega autorizada **primero en Dev**, sin promoción a main/production.

## Cuenta de prueba · Estudio Ibieta IP

- Cambiar clave y Salir se ubican al final de la navegación, con botones delimitados y foco visible.
- Mis marcas ordena primero las fichas con menos datos faltantes en la tabla; después conserva el criterio de cantidad de coincidencias y nombre. Una marca denominativa no requiere imagen y una solicitud en trámite no requiere número de registro. No se completan datos ficticios.
- Se reconocen una sola vez las notificaciones existentes en este espacio. Se conservan los avisos y se registra la operación en auditoría. Una nueva notificación permanece pendiente: reiniciar el servicio no vuelve a marcarla automáticamente.
- Se muestran 50 avisos por página en ambas bandejas, manteniendo los totales reales y el acceso al historial completo. Evita bloquear el navegador al dibujar más de 32.000 avisos simultáneos.
- Las diez comparaciones de las capturas tienen prioridad en **Coincidencias destacadas** y en la vista previa del resumen. La configuración solo se aplica a este tenant. Las selecciones respetan búsquedas, fechas y decisiones de revisión, pero pueden incluir marcas registradas o índices inferiores al umbral general porque son ejemplos elegidos expresamente para esta cuenta de prueba.
- Se conservan los porcentajes del motor, estados, clases e historiales. Las estimaciones humanas de las capturas no sustituyen automáticamente los índices del motor. Fuera de esta selección, siguen vigentes los filtros normales de vigilancia.
- La Brioche se añade como **Ejemplo de prueba**, con evidencia pública consultada el 29 de septiembre de 2026 y un índice original de 75,23%. No se copia la cartera de Daniel ni se añade a Mis marcas, solicitudes propias o consultas automáticas. El ejemplo conserva imágenes, coberturas e historial público; no crea avisos retroactivos y respeta las decisiones posteriores de revisión.

Comparaciones, en el orden solicitado:

1. Club Del Mal Amor (1659715) → Chaparrita del amor (1683639) y Titanes del amor (1689486).
2. La Brioche Bakery Café (1638707) → LA BRIOCHE DOREE (997604).
3. Maison Dubai Niche (1644808) → M MAISON NICHE (1397032).
4. Bosques del Norte por un Mundo Sustentable (1675838) → bosquesdelnorte por un mundo sustentable (1245326).
5. ELQUI.CL (1670929) → Tv elqui.cl (1572142).
6. Mote con Huesillo El Copihue de Lonquén (1552147) → Copihue Mote con Huesillo El Original 1985 (1672680).
7. INIZZI (1652393) → inizzi tu primera ilusión (1290829).
8. MAÍTA (1630024) → MAITA PLAYA LAS MOSTAZAS (1665441).
9. ALMATEXTIL (1671216) → Almatex (1658314).

## FA Abogados

- Tenant separado con slug `fa-abogados`, nombre FA Abogados y usuario `FA_abogados` (normalizado a minúsculas al ingresar).
- Cartera, solicitudes, vigilancia, casos, clientes y notificaciones vacíos. No se copia la demo ni la cartera de otro estudio.
- Sin Administrador de fuente, Acerca de esta versión ni Cambiar clave. El acceso directo al administrador de fuente y al cambio de clave también se bloquea en el servidor; `/cambiar-clave` redirige a `/app`.
- Sin obligación de cambiar la clave inicial al primer acceso, conforme a la solicitud del usuario. La clave no se guarda en este documento ni en el código: se recibe durante la preparación desde una variable del ambiente y se almacena como hash.
- Se mantienen las funciones ordinarias del espacio y Salir. La creación es idempotente y no reemplaza credenciales ni vincula un usuario existente con otros espacios.

## Operación y verificación

`scripts/provision-pilot.ts` prepara FA y reconoce los avisos de prueba únicamente si recibe `FA_INITIAL_PASSWORD` y el identificador exacto del ambiente Dev. La variable se retira al completar la preparación; no debe copiarse a producción. La auditoría protege la operación única de notificaciones.

Pruebas: orden por completitud; selección exacta sin cambiar índices; filtros y decisiones de revisión; creación idempotente; avisos antiguos y futuros; inicio de sesión con usuario en mayúsculas; aislamiento del espacio; bloqueo de rutas; compilación y revisión visual.

## Promoción e incorporación autorizadas posteriormente

El 1 de octubre el usuario autorizó pasar Dev a Main y después incorporar los 272 expedientes encontrados por el RUT del representante **76.229.620-9** a FA Abogados en producción. La búsqueda por nombre devuelve 310 candidatos aproximados y no se usa para importar: incluye otras personas y RUT que requieren revisión. La búsqueda exacta también recupera variantes antiguas como Flores y Asociados Abogados.

La promoción del código no copia la base de Dev. `db/fa-production.ts` prepara únicamente el tenant `fa-abogados` y el usuario `fa_abogados`, con guardia del identificador exacto de producción y comprobación de pertenencia exclusiva. Recibe la contraseña administrativa mediante `FA_PRODUCTION_PASSWORD`, la almacena como hash y revoca sesiones de ese usuario. Una auditoría impide volver a cambiar la clave en los reinicios. La variable se retira después de verificar el acceso; la contraseña no se guarda en archivos. Se conserva la política de interfaz restringida y no se obliga a cambiar la clave.

La carga reutiliza `/api/portfolio/import` autenticada como FA: los expedientes con registro acreditado se incorporan a Mis marcas y los restantes a Solicitudes de registro, preservando datos, actuaciones y estados normalizados. Los estados ambiguos no se convierten en activos por suposición. Se mantienen los expedientes cerrados como antecedentes; no se importa la cartera de otros representantes ni se inventan clientes. Las oposiciones recibidas identificadas pueden generar sus casos y tareas iniciales según el comportamiento existente, sin crear avisos por actuaciones históricas. La deduplicación por solicitud permite reintentar lotes sin duplicar expedientes.

Resultado de la incorporación: 272 solicitudes únicas, distribuidas en **196 expedientes con registro acreditado y 76 solicitudes**, con 19 casos de oposición recibida. Las 76 solicitudes también tienen un objetivo técnico `watchOnly` para seguimiento: no son 76 expedientes adicionales y deben excluirse de los conteos de importación únicos. Se conservaron los titulares reales, los historiales y los estados de la fuente; tener número de registro no implica que el derecho siga vigente.

La primera actualización identificó 89 avisos falsos: los mismos representantes venían en distinto orden. La normalización ahora ordena las partes consistentemente al consultar y al proyectar evidencia guardada, incluyendo el titular principal y su país/RUT. Las diferencias reales siguen generando avisos. La reparación administrativa está restringida a FA, a producción y a la corrida `6b4aacaa-bb3d-431d-8a24-69cbd8820710`; valida que los 89 avisos sean exclusivamente cambios de orden antes de invalidarlos. Conserva su evidencia y registra auditoría; completa únicamente las tareas generadas por esos avisos y conserva las tareas iniciales de revisión. La variable temporal `FA_REPAIR_PARTY_ORDER_RUN` se retira después de verificar el resultado. Pruebas en base aislada cubren rechazo de cambios reales, aislamiento, conservación de tareas legítimas e idempotencia.

## Perfiles de informes preparados en Dev · 2 de octubre

La entrega funcional `b42ae34` cargó los datos de estudio de `fa-abogados`, `daniel-morales` y `juan-pablo-zamora`, confirmados en los registros de arranque del despliegue Dev `f02635e3-bd50-4342-9931-710d648b36a4` (`SUCCESS`). No creó cuentas ni cambió claves, carteras, roles o la configuración de producción.

- FA: Flores Acevedo Abogados, oficinas/telefonía de Santiago y Concepción, correo y web del [sitio oficial](https://fa.cl/). Logo restaurado con ImageGen a partir de la imagen suministrada, conservando texto y colores, en [PNG transparente](../public/reports/studios/fa-abogados.png). El abogado individual queda vacío.
- Zamora IP: Juan Pablo Zamora Iturra, correo/teléfono/web y [logo original](../public/reports/studios/zamora-ip.png) del [sitio oficial](https://zamoraip.cl/). Se deja vacía la dirección no publicada.
- Daniel: De Las Heras Abogados, con la información y el [logo](../public/reports/studios/de-las-heras.png) de su ejemplo SEMASK revisado. No se inventa un correo ni se reutiliza aquella conclusión jurídica.

Los datos se editan desde **Agrega la información de tu estudio** y se reutilizan en los informes PDF/Word. Todos son opcionales. La precarga inicial no sobrescribe una edición posterior ni vuelve a llenar un formulario vaciado. Los tres perfiles y el caso sin perfil pasaron la revisión visual de documentos; [formato, OpenRouter y verificación](INFORMES_FACTIBILIDAD_2026-10-02.md).
