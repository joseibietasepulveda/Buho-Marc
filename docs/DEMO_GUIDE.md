# Guía de la demo

## Objetivo

La demo permite mostrar la experiencia de Buho Marc sin backend. Está pensada para una conversación comercial o una validación de producto, no para operar información real.

## Accesos de demostración

- Landing comercial: [https://buho-marc.vercel.app/Landing](https://buho-marc.vercel.app/Landing).
- Web app navegable: [https://buho-marc-web-dev.up.railway.app/app](https://buho-marc-web-dev.up.railway.app/app).
- Landing de prueba: [https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js](https://buho-marc-web-dev.up.railway.app/landing-de-prueba-js).

El dashboard incluido dentro de las landings es una vista previa estática, pensada para explicar la herramienta antes de contratarla. La interacción completa está disponible únicamente en la web app.

## Recorrido sugerido

1. Abrir **Inicio** y explicar la jerarquía: atención inmediata, indicadores, coincidencias y plazos.
2. Entrar a **Marcas**, revisar el cupo y agregar una marca. La nueva marca aparece como `Procesando`.
3. Entrar a **Coincidencias**, filtrar por nivel y abrir NOVA FUDS.
4. Revisar la comparación y convertirla en caso.
5. Entrar a **Casos**, abrir el caso creado y moverlo a la siguiente etapa.
6. Entrar a **Notificaciones**, editar un correo y copiarlo.
7. Entrar a **Usuarios** y agregar una persona.
8. Usar **Configuración → Restaurar datos demo** para volver al estado inicial.

## Datos editables

- Marcas, casos y usuarios se pueden agregar.
- Las coincidencias se pueden descartar, observar o convertir en caso.
- Los casos se pueden mover hacia la etapa siguiente.
- Los borradores de correo se pueden editar y marcar como gestionados.
- En Railway los cambios se guardan en PostgreSQL y son visibles para todos quienes abran la demo.
- En local, si no existe `DATABASE_URL`, se usa `localStorage` como respaldo sin configuración.

## Comportamientos simulados

- El estado `Procesando` de una nueva marca no avanza automáticamente.
- Los puntajes y explicaciones de coincidencia son datos fijos.
- El enlace a la fuente oficial abre INAPI como referencia, no una publicación específica.
- Cargar un archivo, exportar, vistas guardadas y filtros secundarios son controles visuales.
- Copiar un correo usa el portapapeles del navegador; nunca se envía automáticamente.

## Criterios UX aplicados

- Se conserva el contexto con paneles laterales para revisar coincidencias, casos y correos.
- El color siempre se acompaña de texto.
- Las coincidencias están ordenadas por puntaje descendente.
- Las acciones de mayor impacto se explicitan y muestran confirmación.
- Los formularios no borran datos hasta que el usuario confirma o cierra el panel.
- En móvil, las tablas pueden desplazarse horizontalmente y el tablero conserva sus columnas.
