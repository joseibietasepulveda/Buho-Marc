# Buho Marc

Demo funcional y navegable de la plataforma web para administrar marcas, revisar coincidencias precargadas y gestionar casos legales. La landing comercial publicada vive en `/Landing` y la aplicación en `/app`.

## Accesos publicados

| Superficie | URL | Uso |
| --- | --- | --- |
| Landing comercial | [buho-marc.vercel.app/Landing](https://buho-marc.vercel.app/Landing) | Presentación pública del servicio, sistema, dashboard de muestra y pricing. |
| Web app | [buho-marc-web-dev.up.railway.app/app](https://buho-marc-web-dev.up.railway.app/app) | Dashboard navegable de demostración. |
| Landing de prueba | [buho-marc-web-dev.up.railway.app/landing-de-prueba-js](https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js) | Versión de prueba de la landing con escáner multimodal. |

La landing comercial y la landing de prueba presentan el mismo contenido visual. La primera se publica en Vercel y la segunda se conserva en Railway para revisión. Los enlaces de pricing dentro de la web app dirigen a `https://buho-marc.vercel.app/Landing#pricing`.

## Ejecutar en local

Requisitos: Node.js 22.13 o superior.

### Inicio con doble clic

En macOS, haz doble clic en **ABRIR BUHO MARC.command**. El lanzador:

1. Cierra una instancia anterior de esta misma aplicación si está activa.
2. Inicia una instancia nueva.
3. Abre automáticamente `http://127.0.0.1:3000/app` en el navegador.

Nunca cierra una aplicación ajena que esté usando el mismo puerto; en ese caso muestra un aviso.

### Inicio desde Terminal

```bash
npm install
npm run dev
```

Abre [http://localhost:3000/app](http://localhost:3000/app). Para verificar una versión optimizada:

```bash
npm run build
npm run start
```

Sin `DATABASE_URL`, la app usa `localStorage` para que la demo local siga funcionando sin instalaciones adicionales. Con `DATABASE_URL`, usa PostgreSQL automáticamente.

## Qué incluye la demo

- Dashboard con métricas, alertas, bandeja priorizada y agenda legal.
- Administración de marcas y formulario de alta.
- Coincidencias filtrables, comparación lado a lado y decisiones de revisión.
- Conversión de una coincidencia en caso.
- Tablero de casos por etapa, creación manual y avance entre columnas.
- Centro de notificaciones con correo editable, copia al portapapeles y estado de gestión.
- Lista y alta de usuarios.
- Configuración demostrativa y restauración de los datos iniciales.
- API persistente para crear marcas, casos y usuarios; revisar coincidencias; avanzar casos; y editar notificaciones.
- Esquema PostgreSQL con migraciones, datos iniciales, auditoría y aislamiento por organización.
- Diseño responsive para escritorio, tablet y móvil.

Los datos son ficticios. En Railway se comparten mediante PostgreSQL; en local, si no se configura una base, quedan en el navegador. La opción **Restaurar datos demo** está en Configuración.

## Qué no está implementado

No hay autenticación real, almacenamiento de archivos, envío de correo, fuentes oficiales ni motor de cruces. La app no calcula similitudes: las coincidencias iniciales son ejemplos y las marcas nuevas crean un trabajo `awaiting_engine`, listo para que un servicio externo lo consuma en el futuro.

## Despliegue en Railway

El repositorio incluye `railway.json`, migraciones y un health check en `/api/health`. El servicio web necesita una instancia PostgreSQL y la variable `DATABASE_URL`. Al iniciar, aplica las migraciones; la primera carga crea los datos ficticios de forma idempotente.

Railway publica la web app en `/app` y mantiene la landing de prueba en `/landing-de-prueba-js`. La landing comercial se despliega por separado en Vercel, en `/Landing`.

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
- `app/Landing/page.tsx`: ruta de la landing comercial publicada en Vercel.
- `app/landing-de-prueba-js/page.tsx`: ruta de prueba de Railway con el mismo contenido multimodal.
- `app/app/page.tsx`: interfaz y modo de respaldo local.
- `app/api/demo/route.ts`: lectura y mutaciones de la demo persistente.
- `db/schema.ts`: esquema PostgreSQL; `drizzle/`: migraciones versionadas.
- `db/demo.ts`: datos iniciales ficticios y consultas de la demo.
- `app/app/buho-app.css`: sistema visual de la aplicación.
- `app/app/layout.tsx`: metadatos de la ruta privada de demo.
- `docs/`: decisiones para el backend y la evolución funcional.

## Sistema visual

La app reutiliza los valores de la landing: tinta `#100d18`, fondo claro `#f3efe8`, violeta `#a855f7`, tipografías Geist y Geist Mono, radios pequeños y bordes translúcidos. La superficie de trabajo es deliberadamente más clara y densa que la landing para favorecer sesiones largas, legibilidad y escaneo de datos.
