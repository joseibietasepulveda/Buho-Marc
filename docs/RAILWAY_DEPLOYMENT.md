# Despliegue y operación en Railway

## Rutas publicadas

| Ruta | URL | Propósito |
| --- | --- | --- |
| Web app | [https://buho-marc-web-dev.up.railway.app/app](https://buho-marc-web-dev.up.railway.app/app) | Dashboard navegable de demostración. |
| Web app de producción | [https://buho-marc-web-production.up.railway.app/app](https://buho-marc-web-production.up.railway.app/app) | Versión estable compartible. |
| Landing principal | [https://buho-marc-web-dev.up.railway.app/](https://buho-marc-web-dev.up.railway.app/) | Landing comercial con escáner multimodal y dashboard promocional estático. |
| URL anterior de prueba | [https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js](https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js) | Redirige a la landing principal. |

La landing comercial se publica separadamente en Vercel: [https://buho-marc.vercel.app/](https://buho-marc.vercel.app/). Los enlaces de pricing de la web app deben apuntar a `https://buho-marc.vercel.app/#pricing`.

## Ambientes

Railway mantiene ambientes separados de **Dev** y **production**. Cada uno debe tener su propio servicio PostgreSQL y, por lo tanto, una base de datos independiente. Los cambios de esta demo se prueban y verifican primero en Dev; Production solo se actualiza cuando se aprueba expresamente.

La publicación de cambios de la aplicación se dirige primero al ambiente **Dev**, servicio `buho-marc-web`. No debe promoverse a `production` sin una solicitud posterior y explícita.

Base verificada antes de v0.4, el 10 de septiembre de 2026: Dev `906f8244-c5b6-4759-832c-ae82d79b1975`, commit `c5a6be2`, estado `SUCCESS`. Production conserva `c5a6be2` mediante el despliegue `02bbc781-9146-4771-8ccb-a0f5d38b6758` (puede aparecer `SLEEPING` por suspensión automática). La entrega [v0.4](V0_4_RELEASE.md) tiene autorización para **Dev únicamente**, sin actualizar `main` ni production.

## Entrega v0.4 a Dev

- Publicar la rama `dev` en GitHub; el servicio `buho-marc-web` del ambiente **Dev** sigue esa rama. Production sigue `main`.
- Comprobar que el despliegue corresponda al commit enviado y termine en `SUCCESS`, y que `/api/health` responda correctamente. Subir el commit no equivale por sí solo a completar el despliegue.
- La migración `0003_huge_blazing_skull.sql` agrega `registration_tasks` sin borrar las tareas ni los expedientes existentes. Se aplica mediante el inicio habitual de Railway.
- No ejecutar `dev:local` en Railway: es exclusivamente para una base simulada en el computador. `.buho-local/` queda fuera de Git y de las cargas de Railway.
- `NEXT_PUBLIC_MOCK_ATTRIBUTE_SEARCH=false` desactiva al compilar la consulta simulada por atributos. La consulta real continúa limitada a los campos que admite la fuente, y no se incorporan resultados ficticios a una cartera con proveedor real.
- Verificar v0.4 en `/app`: Solicitudes con lista/tarjetas/calendario, agenda y tareas asignables en Casos y Solicitudes, avisos globales, Prioritarias/Todas sin configuraciones, detalles desplegables y correo comparativo copiable. La búsqueda aproximada y el envío por Resend no están conectados a servicios reales; Resend permanece en los pendientes.

## Servicios necesarios

El proyecto de Railway debe contener:

1. Un servicio web conectado al repositorio GitHub `joseibietasepulveda/Buho-Marc`.
2. Un servicio PostgreSQL administrado.
3. Una referencia `DATABASE_URL` del PostgreSQL disponible en el servicio web.

No se requiere Redis ni un worker para esta demo. Cuando se implemente el motor de cruces, conviene añadir una cola y un worker separados; no deben ejecutarse dentro del proceso web.

## Inicio y migraciones

Railway lee `railway.json`:

- Construcción: `npm run build`.
- Inicio: `npm run railway:start`.
- El inicio ejecuta `drizzle-kit migrate` antes de levantar Next.js.
- Health check: `GET /api/health`.

La primera petición a `GET /api/demo` inserta el dataset ficticio con operaciones idempotentes. Reiniciar o volver a desplegar no duplica esos registros. La acción **Restaurar datos demo** borra únicamente la organización de demostración y vuelve a crearla.

## Variables

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sí en Railway | Conexión PostgreSQL del servicio web |
| `PORT` | Automática | Puerto entregado por Railway |
| `NODE_ENV` | Automática | Activa el comportamiento de producción |

No guardar credenciales en GitHub. Railway debe inyectar la URL como referencia al servicio PostgreSQL.

## Verificación

Después de desplegar:

1. `/api/health` debe responder `ok: true`, `database: connected` y `engine: not-connected`.
2. `/app` debe cargar el dashboard navegable con sus datos demo.
3. Crear una marca, recargar y comprobar que permanece.
4. La búsqueda simulada por número de registro debe mostrar RUT, marca, titular, Clases de Niza y estado antes de permitir agregar al seguimiento. En base queda un trabajo `awaiting_engine`; no debe aparecer una coincidencia inventada.
5. Convertir una coincidencia ficticia en caso dos veces debe conservar un solo caso.
6. Los accesos de pricing deben abrir `https://buho-marc.vercel.app/#pricing`.
7. Confirmar que Resumen Vigilancia muestre la tabla de tareas pendientes con las columnas Tareas pendientes y Caso, sin contador interno; que las vigilancias se separen por nivel, las cuatro métricas estén alineadas y Casos activos indique los vencimientos dentro de 14 días.
8. Revisar Vigilancia a ancho de escritorio y angosto: las insignias y controles de Similitud y Estado no deben superponerse, los filtros acumulables deben limpiarse con Todas o Todos y la tabla debe ofrecer desplazamiento horizontal cuando sea necesario.
9. Confirmar el orden lateral actual desde **Resumen Vigilancia** hasta **Acerca de esta versión**, incluidos Clientes y Administrador de fuente.
10. En **Revisor de factibilidad**, verificar el caso Cafeteras Mistral, la carga local de imagen, las clases Niza acumulativas, la probabilidad mock de oposición de terceros y las cuatro coincidencias explicables.
11. En **Solicitudes de registro**, verificar lista, tarjetas y calendario, las dos macrofases, los 22 ejemplos separados, los plazos normal/próximo/vencido, las gestiones cuyo antecedente activador falta y los estados terminales.
12. Abrir una tarjeta y comprobar estado primero, datos completos, referencia a INAPI e historial ascendente con flechas. En Administrador de fuente, abrir una fila y comprobar cobertura, actuaciones, resoluciones desplegables y cierre fijo.
13. Confirmar que las notificaciones distingan Prioritarias y Todas, los avisos de seguimiento interno y los hitos emitidos por la fuente; que la concesión no se confunda con la emisión del título y que los cambios administrativos secundarios permanezcan en Todas.

## Antes de producción real

- Añadir autenticación OIDC y derivar la organización desde la sesión.
- Cambiar la organización fija de demo por un tenant real y aplicar autorización en todas las rutas.
- Mover la siembra demo fuera del tráfico normal.
- Configurar backups, alertas, entorno staging y rotación de credenciales.
- Añadir almacenamiento de archivos con URLs firmadas y escaneo.
- Añadir rate limiting y pruebas automáticas de aislamiento.
- Conectar el motor únicamente mediante el contrato documentado en `MATCHING_ENGINE_INTEGRATION.md`.

## Promoción del 6 de septiembre de 2026

Base `60ea09c` promovida desde Dev a main por solicitud expresa del usuario. Railway completó production (`153c9c2a-f07b-474e-a72d-78351ad079a3`) y Dev (`1dc66f23-ed9b-46d4-b8dd-6418df762a80`) con estado SUCCESS. La segunda ronda de UX continúa únicamente en Dev. Las comprobaciones de interfaz antiguas de esta guía se complementan con [UX_RELEASE_PLAN.md](UX_RELEASE_PLAN.md); el porcentaje global de factibilidad y el selector manual de expedientes importados ya no forman parte de la versión nueva.
