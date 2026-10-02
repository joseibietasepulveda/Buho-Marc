# Informes de factibilidad · 2 de octubre de 2026

Esta decisión reemplaza la generación exclusivamente determinista y el logo genérico descritos el 24 de septiembre. La publicación de esta ronda está autorizada únicamente en Dev.

## Datos del estudio

«Agrega la información de tu estudio» abre un formulario encima de los criterios de búsqueda. Nombre del estudio, dirección, abogado, texto adicional del encabezado, correo, teléfono, web y logo son opcionales. Se guardan en la organización, se reutilizan al recargar y se pueden editar. El formulario detecta ediciones concurrentes y no descarta el borrador ante un conflicto.

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
