# Cierre de factibilidad · 12 de octubre de 2026

## Acuerdos vigentes

La guía funcional es [Factibilidad por clase y multinforme](../FACTIBILIDAD_MULTINFORME_2026-10-09.md). Informe aborda una clase; Multinforme reúne clases de una marca, con guía visual de análisis guardados. Cada búsqueda exige una clase y filtra sus resultados. Los contadores agrupan marca y titular; CIOCCOLATA con tres expedientes del mismo titular cuenta como un antecedente.

IA - Buho Marc es el nombre público de OpenRouter, usado internamente para redactar conclusiones a partir de texto. Genera únicamente la clase que se está abordando y los antecedentes relevantes incluidos, sin imágenes. Llena el recuadro del abogado y la vista previa; se editan directamente en peso normal. Recomienda presentar cuando no se incluyen antecedentes relevantes, con la cobertura propuesta. No incluye porcentajes ni atribuye coberturas de otras clases a la activa.

Descargas: cliente seleccionado inicialmente, estudio opcional, selector de dos líneas estable, tabla o fichas y PDF/Word. Tabla de dos columnas Marca/Parte Figurativa, centrada. Word Times New Roman; PDF Times estándar compatible. Cuerpo justificado, denominación en mayúsculas y logo del estudio reducido un 20%. Encabezado: Informe de factibilidad, Inscripción marca, Inscripción en clase/clases y Para. Cliente omite identificadores oficiales y coberturas; estudio los conserva en fichas. Ninguno incluye factor de similitud. Se retiraron casilla de revisión, anexo opcional, atribución bajo el recuadro y notas finales señaladas por el usuario.

Los ajustes de combobox, Nuevo estudio morado, loading durante Buscar en INAPI, etiqueta Buscador/controles de solicitudes y lector de notificaciones ampliable con timeline sin resumen repetido están [implementados y verificados](2026-10-12-interfaz-informes-notificaciones.md). La publicación PR #27 fue exclusivamente Dev; doce avisos reales de Barros & Errázuriz en producción fueron una operación puntual autorizada de datos, con otros doce en Dev/admin. Accesos temporales revocados.

## «Ver más»: aplazado por acuerdo del usuario

El usuario solicitó recuperar más antecedentes desde la pantalla de resultados y después aceptó aplazarlo. Se revisaron el adaptador y el [contrato público de DeQuiénEs](https://dequienes.cl/inapi/spec) el 12 de octubre. El endpoint de búsqueda admite hasta 100 resultados sin continuación documentada. La captura de CHOCOLATE en clase 29 muestra cuatro antecedentes después de filtrar ese lote; no demuestra que solo se hayan solicitado cuatro.

No se añadió el botón ni se modificó la búsqueda. DeQuiénEs forma parte del equipo; el requisito pendiente es coordinar continuación en su buscador. No extrapolar la paginación por titular/representante ni tratar la ampliación por canal como un siguiente lote. Al retomarlo se deberán conservar criterios/clase y selección, deduplicar expedientes, integrar grupos y verificar carga, error y agotamiento.

## Esta entrega documental

Se actualizan los README, guía vigente, integración INAPI, hoja de ruta y registros de publicación; las guías históricas se identifican como tales. Base de este cierre: Dev `e346a26`, incluyendo los PR #28 y #29 de Vigilancia. No hay cambios de aplicación, migraciones, variables, credenciales ni escrituras nuevas de datos. La publicación solicitada es únicamente a Dev; su resultado exacto se registra en el PR de cierre después de comprobar Railway y salud.

Durante el cierre se comprobó una promoción posterior realizada desde otro chat: [PR #30](https://github.com/joseibietasepulveda/Buho-Marc/pull/30) y [PR #31](https://github.com/joseibietasepulveda/Buho-Marc/pull/31). Main está en `0d28c4ad80bfe2f9f439c1e58ed4bf6b6decbad3` y Railway production `d3213ea5-911f-484a-83d8-33fede70bfe9` informa SUCCESS. Las afirmaciones de publicación exclusivamente Dev del PR #27 corresponden a su corte histórico, anterior a esa promoción. Este cierre no modifica Main ni production.

Los ejemplos y capturas revisados permanecen en la carpeta local ignorada `work/feasibility-ui-2026-10-12/`. El contrato público consultado se conserva en `work/feasibility-ver-mas/source-spec-2026-10-12.json`. No versionar artefactos privados, sesiones ni datos crudos de clientes.
