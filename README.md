# Buho Marc

Mockup navegable de la plataforma web para monitorear marcas, revisar coincidencias y gestionar casos legales. La landing existente se mantiene en `/` y la aplicación demo vive en `/app`.

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

## Qué incluye la demo

- Dashboard con métricas, alertas, bandeja priorizada y agenda legal.
- Administración de marcas y formulario de alta.
- Coincidencias filtrables, comparación lado a lado y decisiones de revisión.
- Conversión de una coincidencia en caso.
- Tablero de casos por etapa, creación manual y avance entre columnas.
- Centro de notificaciones con correo editable, copia al portapapeles y estado de gestión.
- Lista y alta de usuarios.
- Configuración demostrativa y restauración de los datos iniciales.
- Diseño responsive para escritorio, tablet y móvil.

Los datos se guardan en `localStorage` del navegador. Son locales al dispositivo y deliberadamente ficticios. La opción **Restaurar datos demo** está en Configuración.

## Qué no está implementado

No hay autenticación, base de datos, almacenamiento de archivos, correo real, fuentes oficiales ni motor de cruces. El mockup no calcula similitudes: muestra resultados de ejemplo para validar el flujo de producto.

## Documentación para convertirlo en producto

- [Guía de la demo](docs/DEMO_GUIDE.md)
- [Arquitectura propuesta](docs/ARCHITECTURE.md)
- [Contrato con el motor de cruces](docs/MATCHING_ENGINE_INTEGRATION.md)
- [Modelo de datos inicial](docs/DATA_MODEL.md)
- [Hoja de ruta de implementación](docs/IMPLEMENTATION_ROADMAP.md)

## Estructura relevante

- `app/portada-3/`: landing pública actual.
- `app/app/page.tsx`: comportamiento, datos falsos y módulos del mockup.
- `app/app/buho-app.css`: sistema visual de la aplicación.
- `app/app/layout.tsx`: metadatos de la ruta privada de demo.
- `docs/`: decisiones para el backend y la evolución funcional.

## Sistema visual

La app reutiliza los valores de la landing: tinta `#100d18`, fondo claro `#f3efe8`, violeta `#a855f7`, tipografías Geist y Geist Mono, radios pequeños y bordes translúcidos. La superficie de trabajo es deliberadamente más clara y densa que la landing para favorecer sesiones largas, legibilidad y escaneo de datos.
