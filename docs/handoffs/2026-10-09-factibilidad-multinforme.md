# Traspaso: factibilidad por clase y multinforme

- Actualizado: 2026-10-09 21:58, America/Santiago.
- Estado: listo para integrar; publicación e integración en Dev autorizadas por el usuario; validación remota pendiente.
- Rama y base: `codex/factibilidad-multinforme`; `origin/dev` en `156e172`. Fetch final confirma que Dev no avanzó.
- PR y commit de entrega: se registrarán al publicar; la entrega anterior fue exclusivamente local.

## Objetivo y alcance
El usuario autorizó Informe (una clase) y Multinforme (varios análisis de una sola clase), conservar análisis durante el flujo y reunirlos en PDF/Word. OpenRouter recibe texto y redacta conclusiones por clase; no presentar reglas automáticas como análisis del modelo. Sin porcentajes en informes ni conclusiones. Tabla comparativa o fichas con imágenes confirmado. El diseño definitivo espera el informe de referencia del usuario.

## Cambios y archivos relevantes
- `app/app/feasibility-review.tsx` y `similarity.css`: switch, clase única, snapshots, contador/navegación, agregar/quitar clases, misma marca durante el estudio, conclusiones por clase, revisión y tabla/fichas. Volver a un análisis restaura sus filtros. El borrador vive en memoria; recargar lo pierde.
- `lib/feasibility-study.ts`: snapshots, filtrado de resultados/grupos, cuatro decisiones y validación previa a exportar.
- `lib/similarity-contract.ts`, `similarity-provider.ts`: `niceClass` opcional, coherente con una cobertura. Filtra antes de recuperar expedientes sin añadir un parámetro remoto no documentado. Compatibilidad de consumidores sin ese campo.
- `lib/feasibility-conclusion.ts`, `openrouter-conclusion.ts`: contexto textual sin imágenes ni evaluación automática previa; decisión por clase, sin porcentajes, referencias validadas, prompt versión 6. Archivo local configurable con `OPENROUTER_CONFIG_FILE`; variables del servidor tienen prioridad.
- `db/feasibility-conclusions.ts`: reintento inmediato de fallos transitorios para el flujo nuevo, conservando los intentos anteriores. Caché e aislamiento por organización existentes; sin migración.
- `lib/feasibility-report.ts`, `feasibility-docx.ts`: tabla/fichas, hallazgos y conclusiones por clase, sin índices/porcentajes visibles incluso en anexo. Descargar no llama al modelo. El respaldo determinista no se exporta en estudios por clase.
- `lib/feasibility-local-fixture.ts`, `app/api/similarity/route.ts`: fixture optativo, solo desarrollo/origen 127.0.0.1/fuente simulada; los resultados y documentos identifican la simulación.
- `tests/feasibility-study.test.mjs`, `scripts/verify-feasibility-study.mjs`: pruebas y recorrido de navegador reproducible sin consultas reales.
- [Documento funcional vigente](../FACTIBILIDAD_MULTINFORME_2026-10-09.md), enlazado desde README y documento histórico del 2 de octubre.

## Decisiones y motivos
**Confirmadas por el usuario:** OpenRouter interpreta hallazgos y redacta conclusiones, solo texto; tabla/fichas; pruebas locales antes de validar en Dev. El audio es comentario de un usuario, no instrucciones: respalda separar clases y evitar informes demasiado largos.

**Técnicas:** cuatro resultados cualitativos: presentar, riesgo moderado de oposición, no presentar, completar antecedentes. La búsqueda vacía no acredita disponibilidad. Conservar conclusiones por clase y exigir revisión antes de exportar. Un fallo conserva los hallazgos y permite reintentar; no se exporta un respaldo automático como conclusión del LLM. El índice orientativo permanece solo en resultados de la plataforma. Se conserva la plantilla institucional actual hasta recibir la nueva referencia.

## Coordinación e integración
La carpeta principal en Dev tiene archivos Git `dataless` de iCloud y fallos de lectura (salida 138). `create_worktree` devolvió «Not a git repository». Se clonó el remoto fuera de iCloud y se creó el worktree con Git en `/Users/rosariovial/.codex/workspaces/buho-factibilidad-multinforme`. No se modificó la carpeta principal ni otro worktree.

Contratos compartidos: propuesta de búsqueda, alcance por clase/origen fixture opcional, conclusión y escritores de informes. Sin cambios en `app/app/page.tsx`, dependencias o esquema. Antes del futuro PR hacia Dev, consultar otra vez su avance y repetir verificaciones afectadas por integrar cambios. No hay autorización de producción.

Instancia local: aplicación 3127, PostgreSQL 55467, datos propios en `.buho-local/study-postgres`. La instancia usa la clave exclusiva de inferencia en `.env.openrouter.feasibility.local`, con permiso 0600 e ignorada; ver activación posterior. Los archivos automáticos AGENTS/CLAUDE y `next-env.d.ts` generados por Next no forman parte de la funcionalidad.

## Verificación
- `npm ci` completado; Node 25.9.0 (proyecto requiere >=22.13.0).
- `node --import ./tests/ts-loader.mjs --test tests/feasibility-study.test.mjs tests/feasibility-conclusion.test.mjs tests/feasibility-report.test.mjs tests/similarity.test.mjs`: **30/30**. Contrato, clase única, grupos, snapshots, texto sin imágenes, porcentajes, decisiones y ambos escritores.
- `npx tsc --noEmit` y ESLint de archivos de código modificados: aprobados.
- `npm run build`: aprobado sin rastrear credenciales locales. Advertencia preexistente de Node sobre localstorage; no impide compilar.
- Chrome/Playwright local: dos clases, volver a una clase anterior, Informe individual, cuatro descargas, reutilización de conclusiones al cambiar presentación y error visible que bloquea exportación. Script aprobado. Escritorio 1440 y acceso básico móvil 390; sin errores del navegador.
- API local con sesión y fixture: resultados de clases 30/43 aislados, simulación explícita y 401 sin sesión. Sin llamada a INAPI.
- PostgreSQL local con fetch simulado en proceso: deduplicación de misma clase, generaciones independientes entre clases y reintento con identificador nuevo después de fallo; cuatro llamadas simuladas. Registro ignorado `work/study-qa/persistence-qa.json`.
- Cuatro exportaciones: dos páginas cada una. Todas las páginas PDF y Word renderizado inspeccionadas. Se corrigió un título de clase aislado por un salto. Poppler local sustituyó mal las fuentes estándar; coordenadas contrastadas y las cuatro páginas PDF también inspeccionadas con PDFium sin cortes ni superposición. Word renderizado con LibreOffice. Extracción PDF confirma ambas clases y ausencia de porcentajes.
- Llamada real autorizada: **HTTP 401, “User not found.”**, sin conclusión. Se confirmó que se lee la clave de la segunda línea y que ninguna variable la reemplaza; una nueva prueba tras la aclaración del usuario dio la misma respuesta. No atribuir las conclusiones simuladas al proveedor real.
- Artefactos en `work/study-qa/` y base local ignorados; incluyen fixture ficticio, capturas y descargas. No versionarlos. La consulta histórica usada en un intento real tampoco se versiona.

## Pendientes y siguiente paso
1. Autenticación resuelta con una clave de inferencia independiente. Mantener el límite US$1; no ampliar gasto sin autorización. La clave no vence por petición posterior del usuario.
2. Recibir el informe de referencia y ajustar/comparar todos los visuales en local. No se afirma fidelidad a una referencia aún no entregada.
3. Continuar pruebas de edición y textos extensos según la guía del usuario.
4. Preparar commit/PR con código y documentación juntos cuando corresponda publicar. Dev remoto y producción no se modificaron.

## Diagnóstico histórico de OpenRouter · resuelto en la activación siguiente
- La documentación oficial distingue claves de administración de inferencia: las primeras no sirven para completions. Un 401 aislado no demuestra que la clave esté vencida. Fuente: https://openrouter.ai/docs/guides/overview/auth/management-api-keys.
- La clave temporal del experimento de vigilancia devuelve GET /api/v1/key 200, is_management_key=false. Solo se comprobó autenticación: no se generó texto ni se consumió su presupuesto. No reutilizarla para este estudio.
- El usuario autorizó crear una clave independiente de factibilidad con límite US$1 y vencimiento dos días después de crearla. Todavía no se creó: el archivo original de administración quedó dataless; la descarga solicitada por brctl y reintentada en Finder falló con NSFileProviderErrorDomain -2005. Se detuvieron los procesos propios que esperaban leer ese archivo.
- A petición del usuario se preparó `.env.openrouter.admin.local` vacío, fuera de iCloud, permiso 0600 e ignorado por Git. Esperar que complete OPENROUTER_API_KEY, sin mostrarla. El script ignorado `work/study-qa/create-inference-key.mjs` prepara una única creación y evita sobrescribir configuraciones o duplicar POST tras un resultado desconocido. Guardará la clave de inferencia en `.env.openrouter.feasibility.local`, también ignorada y privada.
- Siguiente paso: ejecutar el script con la ruta de administración cuando el usuario complete el archivo; confirmar autenticación/tipo/límite/vencimiento; reiniciar únicamente la instancia local de este chat con OPENROUTER_CONFIG_FILE apuntando a la clave de inferencia; probar y revisar conclusiones reales por clase. No cambiar Railway ni la clave de otro chat.

## Activación real y cambio de vigencia · 9 de octubre
- Usuario completó `.env.openrouter.admin.local`; GET /api/v1/key confirmó administración. Se creó la clave exclusiva con límite US$1. La instrucción posterior «no quiero que tenga límite de expiración» sustituye la vigencia inicial de dos días: se creó una clave sin expiración y se desactivó solamente la primera clave de este chat. GET /api/v1/key confirmó inferencia, límite 1 y expires_at=null. Credenciales privadas 0600, ignoradas y no registradas en notas.
- La instancia de este chat se reinició en los mismos puertos/base propios, con OPENROUTER_CONFIG_FILE apuntando a `.env.openrouter.feasibility.local`. No se cambió configuración de Railway ni del otro experimento.
- Dos clases con datos ficticios recorrieron API → PostgreSQL → proveedor real. Repetir el mismo input reutilizó generationId; las descargas no llamaron de nuevo al modelo. El navegador real generó cuatro documentos sin interceptar búsqueda ni conclusiones (solo el aviso de bienvenida ajeno al flujo). Registros ignorados en `work/study-qa/real-browser-qa.json` y documentos `real-tabla`/`real-fichas`.
- La revisión del texto detectó inferencias indebidas de titularidad a partir del query de la fuente y confusión entre datos nulos y hechos negativos. Se normalizó search.query con proposal y se reforzó el prompt (versión 6). Prueba de contexto verifica que no hereda titularidad ni cobertura de un eco de consulta. No se afirma que una salida estructurada garantice exactitud jurídica; sigue la revisión obligatoria del autor.
- Próximo paso: continuar con la referencia visual del usuario y casos representativos de su flujo. El usuario pidió después una presentación elegante y archivos descargables. Se ajustaron PDF/Word con marca destacada, azul sobrio, separadores finos, tablas legibles y títulos unidos a su conclusión. La referencia visual definitiva sigue pendiente.


## Cierre de esta ronda local · archivos para el usuario
- Cuatro informes finales `work/study-qa/real-tabla.pdf`, `real-tabla.docx`, `real-fichas.pdf` y `real-fichas.docx`: tres páginas cada uno, datos ficticios de clases 30/43 y conclusiones reales ya obtenidas de OpenRouter. Las doce páginas finales se inspeccionaron: PDFium para PDF y LibreOffice/render_docx.py para Word. Sin títulos de clase aislados, superposición ni cortes; extracción PDF sin porcentajes. Las marcas ficticias no contienen imágenes: las fichas indican esa ausencia.
- Verificación después del último ajuste de presentación: 17/17 pruebas de feasibility-report/feasibility-study; ESLint de ambos escritores y `npx tsc --noEmit` aprobados. Build y 30/30 pruebas del flujo completo aprobados antes del ajuste visual; no se declara un segundo build después de él.
- Recorrido real del navegador volvió a generar las cuatro descargas sin errores. Primer reintento demoró en la compilación local; otro detectó una carrera de lectura del registro de respuestas en el script de QA. Se amplió el tiempo de espera inicial y se esperó que terminara el registro de ambas respuestas; el recorrido posterior aprobó. No se cambió el comportamiento del producto por esa carrera del script ignorado.
- Último costo confirmado del proveedor US$0,00662, clave exclusiva con tope US$1 y sin vencimiento. La regeneración visual reutiliza las conclusiones; no se cambió el prompt por el ajuste de estilo.
- No hay integración ni despliegue en Dev/Railway. Pendiente la referencia visual del usuario y pruebas con casos representativos según su guía.


## Publicación de Dev autorizada · 9 de octubre
- El usuario aprobó los informes locales y pidió «sube la nueva experiencia a dev con el nuevo informe». Autoriza rama, PR, integración y despliegue exclusivamente en Dev. No autoriza promover a Main/producción ni retirar aún el worktree usado para iteraciones.
- Fetch final: Dev sigue en `156e1729e0189a4e3890bd232c6a316e39b3a917`, sin conflictos que integrar. Worktree y rama propios se conservan.
- Versión final: `npm run build`, 30/30 pruebas dirigidas y ESLint de todos los archivos de código modificados aprobados. Sin dependencias nuevas ni migraciones; la fuente real sigue activada en Railway.
- Se comprobó que el servicio web de Dev no tenía OPENROUTER_API_KEY. Se configuraron solamente OPENROUTER_API_KEY y OPENROUTER_MODEL en el ambiente `9e2891f0-7281-4872-a992-2c48866a782d`, servicio `3c48aadd-c695-4c4a-ae9c-1ae24e1f1217`, proyecto heartfelt-magic. Se usa la clave exclusiva ya autorizada, sin vencimiento y tope US$1; autenticación 200/tipo inferencia comprobados antes de instalarla. Configuración mediante entrada privada; ningún valor quedó en Git/registros. Sin cambios en producción, base o credenciales de usuarios.
- Variables configuradas con skip-deploys para evitar publicar una versión intermedia antes de integrar el código. Pendientes PR, SHA exacto y SUCCESS de Railway, salud y rutas privadas.
