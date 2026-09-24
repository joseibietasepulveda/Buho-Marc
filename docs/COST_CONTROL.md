# Control de consumo · 24 de septiembre de 2026

Daniel conserva su revisión automática diaria a las 12:30 de Chile. La cartera
`estudio-ibieta-ip` (Búho) queda a pedido, tanto para similitudes como para actualizar
los expedientes. La migración conserva datos, decisiones y revisiones completadas;
cancela únicamente búsquedas automáticas de Búho todavía en cola o en reintento.
Las solicitudes manuales y una búsqueda que ya esté ejecutándose pueden terminar.

Abrir la aplicación no inicia una revisión de INAPI. Por decisión del 24/09/2026,
Vigilancia ya no ofrece botones para revisar una marca ni toda la cartera: las
revisiones manuales se solicitan desde el chat con el asistente y usan la cola
existente. La actualización manual de expedientes sigue disponible desde Mis
marcas. Las dos funciones siguen siendo independientes. La retirada de controles
no cambia la programación automática de Daniel ni el modo a pedido de Búho.
El modo manual posterga la detección de novedades y los avisos hasta que se solicite
la revisión. Daniel sigue trabajando automáticamente aunque nadie tenga la web abierta.

Las decisiones actuales de presentación, casos e informes están en
[Decisiones UX del 24 de septiembre](DECISIONES_UX_2026-09-24.md).

## Descargas

- Las respuestas privadas tienen un identificador de versión por organización,
  sección, usuario y filtros. La versión cambia con las escrituras en PostgreSQL.
- Las consultas sin cambios devuelven 304 sin reconstruir ni enviar la cartera.
  La autenticación se comprueba antes de evaluar esa versión.
- Las pestañas ocultas dejan de consultar; al volver se comprueban cambios.
- Vigilancia consulta cambios cada 30 segundos. Entrega diez marcas por rango y
  cinco coincidencias por marca, ampliables. La búsqueda y los filtros se aplican
  al conjunto completo antes de paginar, sin perder resultados ni seguimientos.
- Las listas no transportan coberturas extensas ni historiales de coincidencias.
  La ficha individual conserva esos antecedentes y se carga al abrirla.
- Los datos se conservan en memoria de cada pantalla, sin caché compartida entre
  sesiones ni almacenamiento persistente en el navegador.

## Verificación

`npm run test:cost-control` comprueba migraciones, programación independiente,
revisiones manuales, invalidación por cambios, aislamiento entre organizaciones,
paginación, filtros sobre datos todavía no cargados y suspensión en pestañas ocultas.
`npm run test:watch` conserva las pruebas de cola, reintentos, publicaciones y decisiones.

El inicio informa el modo y la cantidad de objetivos por cartera en los registros
de Railway. Los usuarios con pestañas antiguas deben recargar una vez para utilizar
la nueva interfaz. La entrega corresponde a Dev; production no se modifica.

## Pendiente: servidor dedicado

Poner el sistema en un servidor dedicado para poder revisar más solicitudes.
Antes de migrar, medir capacidad, memoria, costo fijo, respaldos, restauración y
tiempos de cola; acordar con DeQuiénEs las cuotas y concurrencia. Más capacidad de
servidor no elimina los límites de la fuente. No se contrata ni migra infraestructura
con esta entrega.
