# Buho Marc · v0.4

Demo funcional y navegable de la plataforma web para administrar marcas, revisar vigilancias precargadas y gestionar casos legales. La landing comercial publicada vive en `/` y la aplicación en `/app`.

La entrega v0.4 incorpora calendarios y tareas asignables, lista de solicitudes, notificaciones Prioritarias/Todas y correo comparativo para clientes. Alcance y pendientes concretos: [v0.4](docs/V0_4_RELEASE.md). Su destino autorizado es la rama `dev` y el ambiente Railway **Dev**; esta entrega no actualiza `main`, producción ni la landing independiente de Vercel.

## Accesos publicados

| Superficie | URL | Uso |
| --- | --- | --- |
| Landing comercial | [buho-marc.vercel.app](https://buho-marc.vercel.app/) | Presentación pública del servicio, sistema, dashboard de muestra y pricing. |
| Web app | [buho-marc-web-dev.up.railway.app/app](https://buho-marc-web-dev.up.railway.app/app) | Dashboard navegable de demostración. |
| URL anterior de prueba | [buho-marc-web-dev.up.railway.app/landing-de-prueba-js](https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js) | Redirige a la landing principal para mantener los enlaces existentes. |

La landing principal se publica en Vercel y la ruta anterior de prueba redirige a la raíz. Los enlaces de pricing dentro de la web app dirigen a `https://buho-marc.vercel.app/#pricing`.

## Ejecutar en local

Requisitos: Node.js 22.13 o superior.

### Inicio con doble clic

En macOS, haz doble clic en **ABRIR BUHO MARC.command**. El lanzador:

1. Cierra una instancia anterior de esta misma aplicación si está activa.
2. Prepara una base PostgreSQL local de demostración y aplica las migraciones. Los datos se conservan en `.buho-local/`.
3. Inicia una instancia nueva, sin conectarse a producción ni ejecutar revisiones automáticas.
4. Abre automáticamente `http://127.0.0.1:3000/app` en el navegador.

Nunca cierra una aplicación ajena que esté usando el mismo puerto; en ese caso muestra un aviso.

También puedes ejecutar `npm run dev:local`: usa el puerto 3000 y una base local en 55433. Cerrar el proceso detiene ambos servicios, pero no borra sus datos. No usa `DATABASE_URL` ni las credenciales de INAPI del ambiente publicado.

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

## Qué incluye la demo

- Navegación lateral organizada por trabajo: **Resumen Vigilancia**, cartera y vigilancia, Casos, registros, factibilidad, notificaciones, usuarios, clientes, fuente y auditoría.
- Dashboard con tareas jurídicas pendientes y su caso asociado, alerta por vigilancias separadas por nivel, KPI de casos con vencimiento en menos de 14 días, bandeja priorizada y agenda legal.
- Administración de marcas: búsqueda exacta por los atributos disponibles, consulta real por solicitud y consulta mock por atributos detrás de una flag; parámetros encontrados a la izquierda al agregar.
- Vigilancia con búsqueda por nombre, filtros acumulables por similitud y estado, edición directa de ambos valores, comparación visual lado a lado y desplazamiento horizontal seguro para tablas angostas.
- Alta manual de vigilancia: se elige una marca ya seguida, se busca un número de inscripción o solicitud y se completan datos ficticios, incluida la fecha de publicación en Diario Oficial.
- Conversión de una vigilancia en caso; calendarios de Casos y Solicitudes, con mes/semana, categorías INAPI/Diario Oficial/tareas y alertas globales.
- Tablero de casos por etapa, creación manual y arrastre entre Esperando confirmación de cliente, En seguimiento y Concluido.
- Ficha de caso con acceso superpuesto a la coincidencia de origen, tareas jurídicas persistentes —incluidas tareas escritas por el usuario, fecha y responsable— y opción confirmada para desvincular la coincidencia sin cerrar el caso.
- Notificaciones Prioritarias y Todas, sin configuraciones, detalles desplegables y aviso de emisión de título. Correo al cliente con cuadro comparativo copiable; PDF técnico interno.
- Revisor de factibilidad previo al registro: búsqueda aproximada predeterminada; acepta texto, imagen o descripción, permite acumular clases Niza opcionales, simula un análisis y presenta un resumen de riesgo junto con una tabla de coincidencias visuales, fonéticas y conceptuales.
- Seguimiento de registro con vistas de lista, tarjetas y calendario; gestiones y activadores diferenciados, plazos concurrentes, historial de actuaciones y 22 ejemplos del procedimiento separados de la cartera. El calendario LPI está acotado a 2026.
- Directorio de clientes con filas clickeables y edición en ficha lateral; lista y alta de usuarios.
- Administrador de fuente con expedientes INAPI, historial de consultas y ficha de solo lectura con cobertura, antecedentes y resoluciones completas.
- API persistente para crear marcas, casos, tareas y usuarios; revisar coincidencias; mover casos; desvincular coincidencias; editar clientes y gestionar notificaciones.
- Esquema PostgreSQL con migraciones, datos iniciales, auditoría y aislamiento por organización.
- Diseño optimizado prioritariamente para uso en computador. Tablet y móvil conservan compatibilidad básica, pero no son superficies principales del producto.

La cartera combina ejemplos identificados como simulados y expedientes importados mediante el proveedor INAPI configurado. En Railway se comparten mediante PostgreSQL. Las cantidades visibles cambian a medida que se clasifican vigilancias o se convierten en casos.

## Qué no está implementado

No hay autenticación real, almacenamiento persistente de archivos, envío de correo ni motor de cruces. Sí existe consulta de expedientes mediante un proveedor de datos de INAPI; su configuración y límites se describen en [docs/inapi-dev.md](docs/inapi-dev.md). La app no calcula similitudes ni probabilidades jurídicas reales: las coincidencias y porcentajes del Revisor de factibilidad son datos mock para la demostración. Las marcas nuevas crean un trabajo `awaiting_engine`, listo para que un servicio externo lo consuma en el futuro.

### Mejoras de UX entregadas

- Comparación de marcas al abrir una fila, con logos ampliables y clases compartidas.
- Historiales de inscripción y fuente ordenados de la actuación más antigua a la más reciente, con flechas, detalle íntegro desplegable y tratamiento de datos ausentes.
- Consulta de expedientes, origen de datos, sincronización y seguimiento de novedades INAPI; tabla principal resumida y ficha lateral accesible desde cada fila.
- Tareas de casos con estados No aplica, Pendiente y Completado; las pendientes aparecen en Resumen Vigilancia junto al caso correspondiente.

El alcance y los pendientes vigentes están en [v0.4](docs/V0_4_RELEASE.md). [UX_RELEASE_PLAN.md](docs/UX_RELEASE_PLAN.md) conserva las rondas anteriores como historial.

La lógica procesal contrastada con las Directrices INAPI 2026 y la Ley 19.039 se detalla en [docs/REGISTRATION_PROCESS_REVIEW.md](docs/REGISTRATION_PROCESS_REVIEW.md), incluidos activadores, límites de automatización y escenarios simulados.

### Backlog · Revisor de factibilidad

- Reemplazar los resultados, porcentajes y razones mock por un motor que combine búsqueda denominativa, fonética, visual y coincidencia de clases Niza.
- Conectar la búsqueda con datos oficiales o una fuente de marcas versionada, conservando fecha y procedencia de cada resultado.
- Guardar análisis, imágenes y clases seleccionadas por organización, con controles de acceso y retención.
- Calibrar los porcentajes con evidencia histórica y revisión experta; mantener siempre la distinción entre estimación orientativa y decisión oficial de INAPI.
- Incorporar estados de error, indisponibilidad de fuente y resultados parciales del motor antes de producción.

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
- `app/app/feasibility-review.tsx`: flujo interactivo y datos mock del Revisor de factibilidad.
- `app/app/source-admin.tsx` y `app/app/source-inspector.tsx`: administración de la fuente y ficha legible del expediente.
- `lib/registration-procedure.ts` y `lib/registration-scenarios.ts`: reglas compartidas del seguimiento y casos ficticios del proceso.
- `app/api/demo/route.ts`: lectura y mutaciones de la demo persistente.
- `db/schema.ts`: esquema PostgreSQL; `drizzle/`: migraciones versionadas.
- `db/demo.ts`: datos iniciales ficticios y consultas de la demo.
- `app/app/legal-agenda.tsx`, `case-tasks.tsx`, `notification-center.tsx` y `brand-search.tsx`: flujos compartidos de v0.4.
- `app/api/tasks/route.ts`: tareas persistentes de solicitudes y eliminación de tareas.
- `lib/release-notes.ts`: versión y pendientes mostrados en la app.
- `app/app/v04.css`: estilos de los nuevos flujos.
- `app/app/buho-app.css`: sistema visual de la aplicación.
- `app/app/layout.tsx`: metadatos de la ruta privada de demo.
- `docs/`: decisiones para el backend y la evolución funcional.

## Sistema visual

La app reutiliza los valores de la landing: tinta `#100d18`, fondo claro `#f3efe8`, violeta `#a855f7`, tipografías Geist y Geist Mono, radios pequeños y bordes translúcidos. En escritorio la superficie se presenta con la densidad equivalente a una visualización al 90 %, sin que el visitante deba cambiar el zoom de su navegador. El nombre Buho Marc es identificador visual, no un hipervínculo dentro de la app.
