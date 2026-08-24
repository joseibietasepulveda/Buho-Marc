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
7. Confirmar que el dashboard muestre las coincidencias pendientes por nivel, que Casos activos indique los vencimientos dentro de 14 días y que Notificaciones no contenga avisos de borradores.
8. Revisar Coincidencias a ancho de escritorio y angosto: las insignias de Similitud y Estado no deben superponerse y la tabla debe ofrecer desplazamiento horizontal cuando sea necesario.

## Antes de producción real

- Añadir autenticación OIDC y derivar la organización desde la sesión.
- Cambiar la organización fija de demo por un tenant real y aplicar autorización en todas las rutas.
- Mover la siembra demo fuera del tráfico normal.
- Configurar backups, alertas, entorno staging y rotación de credenciales.
- Añadir almacenamiento de archivos con URLs firmadas y escaneo.
- Añadir rate limiting y pruebas automáticas de aislamiento.
- Conectar el motor únicamente mediante el contrato documentado en `MATCHING_ENGINE_INTEGRATION.md`.
