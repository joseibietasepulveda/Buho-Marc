# Factibilidad por clase y multinforme · 9 de octubre de 2026

Estado: integrado exclusivamente en Dev por [PR #18](https://github.com/joseibietasepulveda/Buho-Marc/pull/18), commit `b78d204e7d2a42dc1c01b633c6ed2cf3f1077247`; Railway confirmó SUCCESS en el despliegue `39007126-edc7-4e7e-897f-f800ef1ea29d`. Rama de implementación `codex/factibilidad-multinforme`, base `156e172`. Sin promoción a producción. Se verificaron conclusiones reales de OpenRouter con datos ficticios locales; el problema de autenticación se resolvió usando una clave de inferencia independiente. El ajuste visual definitivo espera el informe de referencia del usuario.

## Flujo vigente en esta rama

Al comenzar, elegir **Informe** o **Multinforme**. Ambos requieren exactamente una clase Niza por búsqueda. Informe genera un estudio de una clase; Multinforme reúne varios análisis independientes de la misma marca. La denominación y la imagen propuesta se conservan mientras se agregan clases.

En Buscar se elige una clase y sus criterios. La fuente recibe la cobertura en su contrato existente; el adaptador filtra el lote por clase antes de recuperar expedientes. No se añade un parámetro remoto no documentado. Se incluyen marcas que tengan la clase solicitada, aunque también estén inscritas en otras clases. Se conservan sus coberturas completas. Filtrar hasta 100 candidatos recuperados no acredita exhaustividad.

Revisar resultados mantiene selección, comparación, grupos y filtros. Preparar informe conserva el análisis y, en Multinforme, permite **Agregar otro análisis por clase de Niza**. Un contador y botones de clase muestran los análisis guardados y sus conclusiones. Se puede volver a una clase, editarla o quitarla; no se duplica una clase. Nuevo estudio vacía este borrador.

Los análisis completos viven en memoria del navegador durante el estudio. La persistencia existente conserva generaciones de conclusiones por organización; no constituye un archivo de estudios y no preserva el borrador completo después de recargar.

## Conclusiones

**Generar conclusiones con OpenRouter** analiza por separado todos los hallazgos recuperados de cada clase, incluso los no seleccionados para el detalle. El contexto contiene texto, estados, titulares, coberturas e historial; excluye campos de imágenes y la evaluación determinista previa. La identidad, titularidad y cobertura propuestas provienen del formulario del autor, evitando inferencias desde el eco de consulta de la fuente. El prompt distingue datos ausentes de hechos negativos confirmados. Los índices de semejanza son señales técnicas, no probabilidades jurídicas.

Cada clase recibe una decisión: recomendar presentar, recomendar presentar con riesgo moderado de oposición, no recomendar presentar o completar antecedentes antes de decidir. Los argumentos deben apoyarse en la consulta. Una búsqueda vacía exige completar antecedentes. La validación rechaza porcentajes, solicitudes ajenas y decisiones incoherentes; conserva una decisión explícita del abogado. El abogado puede editar o redactar su conclusión sin porcentajes.

No se exporta un respaldo determinista como conclusión del modelo. Un error conserva el estudio y permite reintentar inmediatamente en este flujo por clase; los consumidores antiguos sin `proposal.niceClass` mantienen su comportamiento de respaldo y caché de cinco minutos. La deduplicación distingue clase, contexto, perfil, modelo, versión del prompt y credencial. Las conclusiones ya obtenidas se conservan si falla otra clase.

Esta decisión sustituye, para el flujo nuevo, el respaldo exportable y la evaluación automática enviada al modelo descritos en [Informes del 2 de octubre](INFORMES_FACTIBILIDAD_2026-10-02.md). No implica una autorización para nuevas llamadas desde otro chat: ver las reglas del repositorio.

## Informe

Antes de descargar se elige **Tabla comparativa** o **Fichas con imágenes**, luego PDF o Word editable. Se revisan las conclusiones de todas las clases y se confirma la revisión. Las descargas reutilizan esas conclusiones; cambiar presentación no vuelve a llamar al modelo.

Ambos formatos usan Carta, encabezado/logo opcionales, cuatro secciones, coberturas completas y firma opcional. La petición posterior de una presentación elegante se implementa con título de marca destacado, tipografía consistente, azul sobrio, separadores finos y tablas con encabezado oscuro; Word conserva los títulos de clase junto a sus conclusiones y las filas de cobertura unidas. La referencia visual definitiva sigue pendiente. Agrupan hallazgos y conclusiones por clase. No muestran índices de semejanza ni porcentajes de riesgo. El anexo opcional también omite esos índices. La tabla incluye marca/titular, solicitud/registro, estado y clases/cobertura; las fichas mantienen imágenes disponibles. La interfaz de resultados conserva su índice orientativo.

## Configuración y reproducción local

Se reutiliza OpenRouter mediante `OPENROUTER_API_KEY` y `OPENROUTER_MODEL`. `OPENROUTER_CONFIG_FILE` permite indicar un archivo local existente sin copiar credenciales entre worktrees; si se omite se utiliza `openrouter.private.txt`. Las variables del servidor tienen prioridad. El archivo se lee en cada generación y nunca se publica ni envía al navegador. Formato del archivo: una línea `OPENROUTER_API_KEY=<clave vigente>`, sin necesidad de comillas. Para generar texto debe ser una clave de inferencia: una clave de administración sirve para administrar claves y no para completions.

Para reutilizar una búsqueda ficticia en una instancia local:

~~~sh
BUHO_LOCAL_PORT=3127 \
BUHO_LOCAL_DB_PORT=55467 \
BUHO_LOCAL_DATA_DIR="$PWD/.buho-local/study-postgres" \
BUHO_LOCAL_FEASIBILITY_FIXTURE="$PWD/work/study-qa/local-fixture.json" \
OPENROUTER_CONFIG_FILE="/ruta/a/configuracion-privada-local" \
npm run dev:local
~~~

El fixture se genera con el script de QA, utiliza **Marca de prueba** y clases **30 y 43**. El cargador exige desarrollo, fuente simulada y origen local 127.0.0.1. En producción o con fuente real queda desactivado. Los resultados e informes indican que son datos simulados. El fixture evita consultas a INAPI; no sustituye las conclusiones reales de OpenRouter.

`scripts/verify-feasibility-study.mjs` requiere Playwright (paquete o ruta en `BUHO_PLAYWRIGHT_MODULE`), navegador disponible y una sesión de una cuenta de QA local en `work/study-qa/session.json` como `{"token":"<sesión local>"}`. No guardar ese archivo en Git. `BUHO_BROWSER_EXECUTABLE` permite indicar Chrome. El script intercepta únicamente las solicitudes del navegador de prueba y genera cuatro descargas, capturas y el fixture, sin consultar fuentes ni OpenRouter reales.

~~~sh
node --import ./tests/ts-loader.mjs --test tests/feasibility-study.test.mjs tests/feasibility-conclusion.test.mjs tests/feasibility-report.test.mjs tests/similarity.test.mjs
node scripts/verify-feasibility-study.mjs
npx tsc --noEmit
npm run build
~~~

Los artefactos en `work/study-qa/` y la base local están ignorados. Para comprobaciones, archivos compartidos y próximos pasos, consultar [la nota de traspaso](handoffs/2026-10-09-factibilidad-multinforme.md).


## Activación local verificada

El usuario autorizó una clave exclusiva de factibilidad con tope US$1 y posteriormente pidió que no venciera. `.env.openrouter.feasibility.local` contiene esa clave de inferencia, sin expiración; `.env.openrouter.admin.local` conserva la clave de administración aportada para crearla. Ambos archivos tienen permiso 0600 y están ignorados por Git. La primera clave creada con dos días de vigencia fue desactivada al reemplazarla; no se cambió la clave de otro chat.

La instancia local usa OPENROUTER_CONFIG_FILE apuntando al archivo de inferencia. Se probaron dos clases desde el navegador, endpoints, persistencia y proveedor real, y se descargaron PDF/Word en tabla/fichas. La fuente de esos antecedentes es el fixture ficticio, claramente marcado: no hubo búsqueda nueva en INAPI ni validación jurídica de un expediente de cliente. Las conclusiones siguen sujetas a revisión del autor. La petición posterior de publicar en Dev autorizó configurar la clave exclusiva y el modelo en Railway Dev. Autenticación de la clave 200, sin vencimiento/tope US$1, salud 200/base conectada/motor DeQuiénEs y rutas privadas 401 sin sesión comprobados después del despliegue. El fixture local no está habilitado allí. No se ejecutó una búsqueda real nueva ni generación remota sobre datos de clientes para verificar la publicación.
