# Factibilidad por clase y multinforme · 9 de octubre de 2026

Estado: integrado exclusivamente en Dev por [PR #18](https://github.com/joseibietasepulveda/Buho-Marc/pull/18), commit `b78d204e7d2a42dc1c01b633c6ed2cf3f1077247`; Railway confirmó SUCCESS en el despliegue `39007126-edc7-4e7e-897f-f800ef1ea29d`. Rama de implementación `codex/factibilidad-multinforme`, base `156e172`. Sin promoción a producción. Se verificaron conclusiones reales de OpenRouter con datos ficticios locales; el problema de autenticación se resolvió usando una clave de inferencia independiente. El ajuste visual definitivo espera el informe de referencia del usuario.

Pulido del 11 de octubre integrado mediante [PR #20](https://github.com/joseibietasepulveda/Buho-Marc/pull/20), Dev `c8ff459a4c42a2eb183c3ed38716c2e8c2bec341`. Railway confirmó SUCCESS en `6f5b7742-acab-4d48-baa3-54bc471ed833`, salud 200 y base conectada. El contrato de esta página incorpora los ajustes de selección, conclusiones y presentación; [traspaso y verificación](handoffs/2026-10-11-factibilidad-pulido.md).

Pulido del 12 de octubre integrado por [PR #27](https://github.com/joseibietasepulveda/Buho-Marc/pull/27), Dev `816c5eaad7e8cdb89890ee524378b7cd367d6c2f`; Railway `f8ce295d-6fbb-4f34-9908-c3663cb7d067` confirmó SUCCESS. Incluye tipografía, Parte Figurativa, selector estable y combobox; [verificación y avisos reales acotados](handoffs/2026-10-12-interfaz-informes-notificaciones.md). Los registros anteriores describen cada corte de entrega.

Estado posterior comprobado al cerrar la documentación: la promoción a Main se completó mediante [PR #30](https://github.com/joseibietasepulveda/Buho-Marc/pull/30) y su registro [PR #31](https://github.com/joseibietasepulveda/Buho-Marc/pull/31). Esta actualización documental se publica solo en Dev; [corte y ambientes](handoffs/2026-10-12-cierre-factibilidad.md).

## Flujo vigente

Al comenzar, elegir **Informe** o **Multinforme**. Ambos requieren exactamente una clase Niza por búsqueda. Informe genera un estudio de una clase; Multinforme reúne varios análisis independientes de la misma marca. La denominación y la imagen propuesta se conservan mientras se agregan clases.

En Buscar se elige una clase con un combobox y sus criterios. Al enfocar o volver a pulsar el campo se muestran las 45 clases; escribir un número filtra por prefijo (2 muestra 2 y 20–29), y escribir texto busca su significado. Admite flechas, Enter y Escape; las clases ya analizadas aparecen inhabilitadas. La fuente recibe la cobertura en su contrato existente; el adaptador filtra el lote por clase antes de recuperar expedientes. No se añade un parámetro remoto no documentado. Se incluyen marcas que tengan la clase solicitada, aunque también estén inscritas en otras clases. Se conservan sus coberturas completas. Filtrar hasta 100 candidatos recuperados no acredita exhaustividad.

Revisar resultados mantiene selección, comparación, grupos y filtros. **Siguiente** conserva el análisis y, en Multinforme, permite **Agregar otro análisis por clase de Niza**. Un contador y botones de clase muestran los análisis guardados y sus conclusiones. Se puede volver a una clase, editarla o quitarla; no se duplica una clase. Nuevo estudio vacía este borrador y usa el botón morado con texto blanco de la plataforma.

Los contadores y el detalle agrupan la misma denominación del mismo conjunto de titulares como un antecedente con expedientes asociados. No se fusionan titulares diferentes, denominaciones diferentes ni registros sin titular informado ni marcas figurativas sin denominación. La selección inicial incluye hasta cinco marcas con sus expedientes; una selección vacía explícita permanece vacía. La fila agrupada selecciona o retira todos sus expedientes; al expandir se pueden revisar individualmente.

Los análisis completos viven en memoria del navegador durante el estudio. La persistencia existente conserva generaciones de conclusiones por organización; no constituye un archivo de estudios y no preserva el borrador completo después de recargar.

## Recuperación adicional: decisión del 12 de octubre

El usuario solicitó «Ver más» para traer nuevos antecedentes desde Revisar resultados y aceptó aplazarlo al conocer el límite. Se comprobó el [contrato público del buscador](https://dequienes.cl/inapi/spec): `SearchRequest.limit` admite hasta 100; no documenta cursor, offset ni exclusión de solicitudes para continuar. `per_channel` amplía candidatos por canal, pero no constituye paginación. La paginación por titular/representante de otro endpoint no se traslada a este buscador.

La pantalla puede mostrar cuatro antecedentes de una clase aunque haya recuperado 100 candidatos antes de aplicar filtros. Los controles de página solo recorren los resultados ya cargados. No se implementó ni publicó «Ver más», ni se cambió el límite o se ejecutaron nuevas búsquedas para esta comprobación. Queda pendiente coordinar continuación en DeQuiénEs, integrante del mismo equipo. Al retomarlo: conservar clase, criterios, selección y resultados anteriores, deduplicar solicitudes y comprobar carga, error y fin de resultados. [Cierre del chat](handoffs/2026-10-12-cierre-factibilidad.md).

## Conclusiones

**Generar conclusión con IA - Buho Marc** trabaja únicamente sobre la clase activa y los antecedentes relevantes incluidos en su detalle. OpenRouter sigue siendo el proveedor interno; su nombre no aparece en este flujo público. El contexto contiene textos, estados, titulares, coberturas e historial de los expedientes seleccionados y una agrupación por marca; excluye imágenes, expedientes no seleccionados, totales recuperados y evaluación determinista previa. La cobertura de otras clases no se atribuye a la clase activa. La identidad, titularidad y cobertura propuestas provienen del formulario del autor.

La generación llena «Conclusión del abogado · Clase X (opcional)» y la vista previa. El texto editable usa peso normal. Ambos recuadros permiten editar el mismo texto directamente. Cambiar el texto o la decisión conserva las otras clases. Para generar una clase distinta se debe abordarla expresamente desde los botones de análisis guardados. Agregar otro análisis está disponible tanto junto al generador como debajo de la vista previa.

Cada clase recibe una decisión: recomendar presentar, presentar con riesgo moderado de oposición, no presentar o completar antecedentes. Sin antecedentes relevantes incluidos se recomienda presentar para la cobertura propuesta, explicando que no se incluyeron antecedentes; no se afirma que la búsqueda demostró inexistencia de derechos o conflictos. Esta decisión explícita del 11 de octubre reemplaza la regla anterior de exigir «insuficiente» ante búsqueda/selección vacía. La validación rechaza porcentajes, referencias a expedientes no seleccionados y decisiones incoherentes; conserva la decisión expresa del abogado. El prompt vigente tiene versión 8.

No se exporta un respaldo determinista como conclusión del modelo. Un error conserva el estudio y permite reintentar inmediatamente en este flujo por clase; los consumidores antiguos sin `proposal.niceClass` mantienen su comportamiento de respaldo y caché de cinco minutos. La deduplicación distingue clase, contexto, perfil, modelo, versión del prompt y credencial. Las conclusiones ya obtenidas se conservan si falla otra clase.

Esta decisión sustituye, para el flujo nuevo, el respaldo exportable y la evaluación automática enviada al modelo descritos en [Informes del 2 de octubre](INFORMES_FACTIBILIDAD_2026-10-02.md). No implica una autorización para nuevas llamadas desde otro chat: ver las reglas del repositorio.

## Informe

Antes de descargar se elige **Informe para cliente** (inicial) o **Informe para estudio**, después **Tabla comparativa** o **Fichas con imágenes**, y PDF o Word editable. El selector mantiene dos líneas y la misma altura para ambos estados, sin desplazamientos al cambiar de destinatario. Cambiar el destinatario no cambia los antecedentes seleccionados ni la conclusión guardada y no llama a la IA. Nuevo estudio vuelve al destinatario cliente. Cada clase debe tener una conclusión preparada o escrita por el abogado. No se exige una casilla adicional de revisión. Las descargas reutilizan esas conclusiones; cambiar presentación no vuelve a llamar al modelo.

Ambos formatos usan Carta, encabezado/logo y firma opcionales, cuatro secciones, Times New Roman en Word y la familia estándar compatible Times en PDF, cuerpo justificado, azul sobrio y separadores finos. La tabla tiene exclusivamente **Marca** y **Parte Figurativa**, queda centrada y respeta la proporción de las imágenes. Los nombres y logos están centrados vertical y horizontalmente; las filas alternan blanco y gris suave. Las tablas pequeñas permanecen juntas y las largas repiten encabezado. Las fichas de cliente muestran marca, estado, titular y logo. Las fichas para estudio agregan expedientes asociados, registros y coberturas completas. Los campos de cobertura propuesta se reservan para estudio. Las tablas mantienen dos columnas para ambos destinatarios.

El cliente ve únicamente el número de antecedentes relevantes incluidos por clase. Se retiraron la opción de anexo, la atribución debajo del recuadro, el botón intermedio de edición, la nota final sobre candidatos recuperados y el aviso general sobre datos incompletos. No se muestran índices ni porcentajes de riesgo. La vista previa se titula **Vista previa de las conclusiones**. Las descargas no llaman al proveedor. El PDF para cliente no lleva respaldo técnico adjunto. El PDF para estudio adjunta JSON versión 7 con registros seleccionados y procedencia temporal, sin índices, canales, totales recuperados ni el payload remoto completo. La interfaz conserva la evidencia original: este cambio afecta la descarga, no el estudio ni la persistencia. La conclusión visible de cliente omite identificadores oficiales que aparezcan en el texto; la de estudio los conserva. Ninguna presentación muestra el factor de similitud. Los escritores conservan compatibilidad para consumidores antiguos sin `analyses`; allí la selección omitida aún toma cinco resultados, pero `[]` incluye cero, y el argumento histórico de anexo permanece solo para ese contrato.

El encabezado ordena Informe de factibilidad, Inscripción marca (denominación en mayúsculas), Inscripción en clase/clases y Para (si se indica cliente). Las referencias de marca se muestran en mayúsculas en el cuerpo y las conclusiones, sin modificar la evidencia original. El logo del estudio se reduce un 20% en ambos formatos, conservando proporciones. [Traspaso del selector y encabezado](handoffs/2026-10-12-factibilidad-cliente-estudio.md).

La preparación de imágenes intenta un logo por marca y prueba otro expediente asociado si falla el primero; informa faltantes por marca. Comprobaciones y límites del pulido: [traspaso del 11 de octubre](handoffs/2026-10-11-factibilidad-pulido.md).

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

El fixture se genera con el script de QA, utiliza **Marca de prueba** y clases **30 y 43**. El cargador exige desarrollo, fuente simulada y origen local 127.0.0.1. En producción o con fuente real queda desactivado. Los resultados identifican la simulación; los documentos de QA deben presentarse como ejemplos ficticios al entregarlos. El texto de advertencia general ya no se incorpora al informe del cliente. El fixture evita consultas a INAPI; no sustituye las conclusiones reales de OpenRouter.

`scripts/verify-feasibility-study.mjs` requiere Playwright (paquete o ruta en `BUHO_PLAYWRIGHT_MODULE`), navegador disponible y una sesión de una cuenta de QA local en `work/study-qa/session.json` como `{"token":"<sesión local>"}`. No guardar ese archivo en Git. `BUHO_BROWSER_EXECUTABLE` permite indicar Chrome. El script intercepta únicamente las solicitudes del navegador de prueba y genera ocho descargas, capturas y el fixture, sin consultar fuentes ni OpenRouter reales. Comprueba tres expedientes como una marca, selección agrupada, contador vacío centrado, generación solo de la clase activa, edición sincronizada, dos destinatarios sin llamadas adicionales al modelo, selección vacía favorable y fallo del proveedor que bloquea descarga.

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
