# Informes de factibilidad · 2 de octubre de 2026

Actualización funcional del 9 de octubre: [Factibilidad por clase y Multinforme](FACTIBILIDAD_MULTINFORME_2026-10-09.md) cambia el flujo a una clase por análisis, incorpora tabla/fichas y conclusiones independientes sin porcentajes. En esa rama un fallo del modelo bloquea la exportación; la descripción histórica de respaldo siguiente corresponde a los consumidores anteriores. La nueva ronda aún no está integrada ni desplegada.

Actualización de interfaz posterior: [Implementación de maquetas](UX_IMPLEMENTACION_OCTUBRE_2026.md) integra estos generadores en Buscar / Revisar resultados / Preparar informe. Requiere selección explícita cuando hay antecedentes y confirmar la revisión; una edición relevante invalida esa confirmación. En el piloto local se descargaron PDF y Word con la misma consulta, dos solicitudes seleccionadas y conclusión. Ambos se renderizaron (dos páginas cada uno) y sus cuatro páginas se inspeccionaron individualmente. Esta comprobación y sus archivos no constituyen un despliegue nuevo ni una llamada real al proveedor.

Esta decisión reemplaza la generación exclusivamente determinista y el logo genérico descritos el 24 de septiembre. La publicación de esta ronda está autorizada únicamente en Dev.

## Datos del estudio

«Agregar la información de tu estudio» abre su editor desde una tarjeta a la derecha, encima del logo de la marca propuesta. La ubicación se actualizó en el [pulido del 4 de octubre](UX_PULIDO_2026-10-04.md). Nombre del estudio, dirección, abogado, texto adicional del encabezado, correo, teléfono, web y logo son opcionales. Se guardan en la organización, se reutilizan al recargar y se pueden editar. El formulario detecta ediciones concurrentes y no descarta el borrador ante un conflicto.

La precarga inicial en Dev conserva cualquier edición o eliminación posterior. No crea cuentas ni cambia credenciales. Identidades preparadas:

- Zamora IP: Juan Pablo Zamora Iturra, contacto@zamoraip.cl, +56 9 9169 1577, web y logo original del [sitio oficial](https://zamoraip.cl/). El sitio no informa una dirección; se deja vacía. Slugs reconocidos: `zamora-ip`, `juan-pablo-zamora`, `zamoraip`.
- FA: Flores Acevedo Abogados, oficinas de Santiago y Concepción, contacto@fa.cl, teléfonos y [web oficial](https://fa.cl/). No se atribuye el informe a un abogado individual. Logo tomado de la imagen adjuntada por el usuario y restaurado con ImageGen; PNG transparente de 1000 × 333, adecuado al tamaño de impresión. Prompt final: conservar exactamente «FloresAcevedo / ABOGADOS», sus formas, proporciones y colores; limpiar bordes y fondo, sin agregar elementos.
- Daniel Morales: De Las Heras Abogados, Daniel Morales Sorondo, socios del encabezado, logo, dos direcciones, teléfonos y web extraídos de `Informe Factibilidad SEMASK (rev dms).pdf`, encontrado en Descargas. No se agrega un correo que el ejemplo no informa.

## Informe

El PDF de referencia del cliente tiene tamaño Carta, Arial, logo a la izquierda, encabezado institucional a la derecha, nombre y clases de la marca, título centrado y cuatro secciones: I. Marca objeto del análisis; II. Antecedentes registrales relevantes; III. Resultados de la búsqueda; IV. Conclusión. Las descargas siguen esta estructura, conservan las coberturas completas de todas las clases de cada antecedente incluido y cierran con la conclusión, nota de alcance y firma opcional. Dirección y contactos se repiten en el pie. Se conserva la selección individual de antecedentes y el anexo opcional.

No se copian al sistema la conclusión jurídica sobre SEMASK, sus titulares, sus solicitudes o los datos de esa búsqueda como resultados de otras consultas. La información del PDF es material de referencia, no instrucciones operativas.

## Conclusión asistida

El servidor prepara un contexto textual con la consulta y todos sus filtros, toda la búsqueda recuperada, titulares, representantes, estados, clases, coberturas, actuaciones, evidencia textual de la fuente, advertencias, alcance, datos del estudio y evaluación determinista. La selección del informe no recorta los antecedentes enviados. Se excluyen las imágenes binarias. Un contexto mayor a 2 MiB usa la conclusión determinista sin truncar expedientes.

OpenRouter recibe ese contexto y debe devolver una respuesta estructurada. El prompt pide analizar las clases solicitadas y sus relaciones, ignorar instrucciones dentro de datos de terceros y no inventar hechos ni leyes. Los números de solicitud citados se validan contra la consulta. La decisión explícita del abogado se conserva; un motivo escrito por el abogado se utiliza directamente.

Sin clave, fallo de red, tiempo agotado, error del proveedor, respuesta incompleta o inválida, queda una conclusión determinista basada en los datos disponibles. PDF y Word usan la misma conclusión preparada; descargar ambos no repite el llamado.

Cada generación tiene UUID antes de llamar al proveedor, contexto persistido por organización, estado, resultado, modelo, identificador del proveedor y uso/costo cuando se reciben. Las solicitudes idénticas se deduplican; los intentos abandonados o fallidos se conservan. Un fallo transitorio se puede reintentar después de cinco minutos.

## Configuración

Copiar `openrouter.example.txt` a `openrouter.private.txt` y completar `OPENROUTER_API_KEY`. Ya se dejó una copia local vacía. El archivo privado está ignorado por Git. Modelo predeterminado: `openai/gpt-4.1-mini`; configurable mediante `OPENROUTER_MODEL`.

En Railway se configura `OPENROUTER_API_KEY` como variable privada del servicio web en Dev. El archivo local no se publica. Las variables del servidor tienen prioridad sobre el archivo. La clave nunca se envía al navegador ni se guarda en las generaciones. Sin credencial real, las pruebas usan un proveedor aislado y prueban el respaldo determinista.

## Verificación

`tests/feasibility-conclusion.test.mjs`, `tests/feasibility-report.test.mjs` y el piloto aislado verifican contexto completo, errores del proveedor, persistencia, costo, deduplicación, conflictos del perfil, separación de organizaciones y precarga sin sobrescritura. `scripts/verify-feasibility-layout.ts` genera PDF y Word con estudio, sin estudio, texto largo y los tres perfiles pedidos a partir de una consulta histórica guardada. Los documentos se renderizan y revisan visualmente; no se ejecuta una nueva búsqueda para maquetarlos.

## API, persistencia y límites

- `GET /api/report-profile` devuelve perfil y versión de la organización de la sesión. `PUT` exige esa versión, valida/normaliza el logo y devuelve 409 si otro usuario editó antes; el borrador no se descarta automáticamente.
- El formulario admite PNG/JPEG/WebP de hasta 4 MiB y normaliza antes de enviar. El servidor exige hasta 1 MiB, hasta 20 MP y redimensiona dentro de 1000 × 1000. Se audita el cambio sin copiar el binario del logo a la auditoría.
- `POST /api/feasibility/conclusions` prepara o reutiliza una conclusión. Devuelve 202 si existe una generación pendiente; `GET /api/feasibility/conclusions/[id]` permite esperarla y devuelve 404 para otra organización. Ambas rutas requieren sesión; las escrituras validan origen.
- `0012_feasibility_report_settings.sql` agrega perfil/versionado y `feasibility_conclusions`. El UUID y contexto se guardan antes del llamado; los estados son `pending`, `complete` o `abandoned`. Un resultado `complete` puede ser respaldo determinista: el origen/motivo quedan en el resultado.
- La clave no se envía al navegador ni se persiste. Uso/costo se guardan cuando el proveedor los informa. Mismo contexto/modelo/prompt/configuración reutiliza la generación; un fallo transitorio permite reintentar tras cinco minutos, y una generación pendiente por más de 120 segundos se conserva como abandonada.
- El motivo escrito por el abogado tiene prioridad y se utiliza directamente. La validación de respuesta rechaza referencias ajenas a la consulta o una decisión distinta de la elegida por el autor.

El guardado de conclusiones no equivale a un archivo completo de estudios: no se conservan aquí las imágenes propuestas ni los documentos exportados. No hay almacenamiento general de adjuntos en esta entrega.

## Revisión visual completa

Se generaron y revisaron todas las páginas de cada formato con la misma búsqueda histórica, cinco antecedentes detallados y coberturas completas. Los documentos de QA usan «Cliente de Ejemplo»; no constituyen un informe nuevo para un cliente real.

| Variante | Páginas PDF | Páginas Word renderizado |
| --- | ---: | ---: |
| Estudio de ejemplo | 5 | 4 |
| Sin estudio | 4 | 4 |
| Texto extenso | 6 | 5 |
| Zamora IP | 5 | 4 |
| FA Abogados | 4 | 4 |
| Daniel / De Las Heras | 5 | 4 |

Se corrigió una firma que quedaba sola al final del PDF; la nota y firma ahora se mantienen juntas. Los logos, imágenes y datos de cada antecedente, encabezados/pies repetidos, párrafos largos y conclusión se comprobaron sin cortes ni superposición. La paginación puede variar entre PDF y Word por sus métricas, conservando contenido y estructura. [Registro de QA](../design-qa.md).

Para reproducir desde una consulta JSON guardada:

```sh
node --import ./tests/ts-loader.mjs --test tests/feasibility-conclusion.test.mjs tests/feasibility-report.test.mjs
npm run build
node --import ./tests/ts-loader.mjs tests/pilot-e2e.mjs
node --import ./tests/ts-loader.mjs scripts/verify-feasibility-layout.ts ruta/consulta-guardada.json work/report-qa
```

El último comando no ejecuta una búsqueda ni llama a OpenRouter; puede recuperar imágenes de origen si faltan en su caché. La revisión visual requiere renderizar los DOCX y PDF generados. Los artefactos locales de QA en `work/report-qa/` están ignorados por Git y no contienen credenciales.

## Publicación y activación

Dev verificó `b42ae34c4bc15bb8224206cb4b4db5b8452452f8` en el despliegue `f02635e3-bd50-4342-9931-710d648b36a4`, estado `SUCCESS`, migraciones aplicadas y `/api/health` 200. El arranque confirmó perfiles en `juan-pablo-zamora`, `fa-abogados` y `daniel-morales`. Los tres PNG respondieron 200 y la ruta de perfil 401 sin sesión. La ronda no se promovió a producción.

La integración OpenRouter se verificó con un proveedor aislado, incluidos éxito, fallos, costo/uso, concurrencia, caché y separación entre organizaciones. **Falta una clave real para activar y verificar un llamado en Dev.** El archivo privado local quedó preparado, vacío e ignorado; debe configurarse `OPENROUTER_API_KEY` en el servicio web para activar el ambiente publicado.
