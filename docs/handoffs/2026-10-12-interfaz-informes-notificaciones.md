# Interfaz, informes y avisos reales · 12 de octubre de 2026

## Alcance y base

Implementación en `codex/factibilidad-interfaz-notificaciones`, desde Dev `248c61e` solicitado por el usuario. Conserva los cambios recientes de scroll y notificación asumida el día del evento. Publicación de código únicamente en Dev. El usuario autorizó además incorporar notificaciones reales en la cuenta de Barros & Errázuriz de Main/production para su presentación; esto es una escritura de datos acotada, no una promoción del código a Main.

## Comportamiento

- Selector cliente/estudio: dos líneas explícitas y peso constante; no cambia altura al seleccionarlo.
- Informes: tabla Marca/Parte Figurativa, encabezado centrado; Word por defecto Times New Roman, PDF Times-Roman/Times-Bold estándar compatible, cuerpo justificado y última línea a izquierda. Continúan dos destinatarios, mayúsculas, logo del estudio al 80% y ausencia de factores de similitud.
- Clase de Niza: combobox de 45 clases, prefijo numérico y significado textual, flechas/Enter/Escape, reapertura aunque conserve el foco y bloqueo de clases ya guardadas.
- Conclusión editable en peso normal y Nuevo estudio morado/blanco.
- Agregar marcas: animación compartida del inicio, inline en resultados durante la consulta, retirada también al fallar. Solicitudes: Buscador visible y cinco controles de 44 px.
- Notificaciones: lector derecho ampliable mediante superficie o botón accesible; diálogo nativo con Escape y cierre; conserva timeline y referencias/observaciones distintas, retira el párrafo de resumen repetido. Otros cambios únicos quedan después del timeline. Los avisos importados del historial indican su origen.

## Datos reales autorizados

Se revisaron en lectura las identidades y fuentes antes de escribir. Dev no tiene una organización de Barros & Errázuriz; el usuario confirmó que está en Main. Operación aplicada exclusivamente a:

- Dev, administrador `buho_marc`, organización `estudio-ibieta-ip`: 12 avisos de 12 expedientes reales, seleccionados entre 111 historias de marcas de INAPI disponibles.
- Production, administrador `barros_errazuriz`, organización `barros-errazuriz`: 12 avisos de 12 expedientes reales, seleccionados entre 26 historias de marcas de INAPI disponibles.

Se tomó la última actuación prioritaria disponible de cada expediente, sin inventar eventos ni fechas, manteniendo ID, observaciones y procedencia. Se identifican como antecedentes del historial guardado, no cambios descubiertos hoy. No se crearon plazos nuevos. Se insertaron únicamente avisos, sus borradores internos necesarios para la proyección de la bandeja y auditoría; no se enviaron correos ni mensajes. No se modificaron carteras, fuentes, snapshots ni otras organizaciones. El código estable `NH-` evita duplicados: segunda revisión devuelve cero candidatos y 12 avisos visibles por cuenta. Los triggers existentes invalidan la caché de cartera.

## Verificación

50/50 pruebas dirigidas de factibilidad, conclusiones, escritores, timeline, regla de notificación y similitud. QA de multinforme previa pasa con 8 exportaciones y generación/cache/edición por clase. Diez exportaciones con expedientes y logos conservados del PDF histórico PASTELES (sin nuevas consultas ni nuevas conclusiones de IA); 23 páginas PDF/Word revisadas, tabla/fichas y dos clases. Son ejemplos de presentación, no nuevos dictámenes.

`scripts/verify-platform-ui.mjs` añade comprobación reproducible de foco/reapertura/teclado del combobox, selector estable (63.1875 px), botones, textarea normal, cinco controles de 44 px, loading pendiente/restablecido, diálogo de notificación y móvil. Sus fuentes y conclusiones se interceptan con fixtures exclusivamente locales. Se ejecuta con las mismas variables de Playwright/navegador y sesión local indicadas en la documentación de factibilidad; `BUHO_UI_QA_OUTPUT` permite fijar la carpeta de capturas. No funciona contra URLs remotas.

Se verificaron los 12 avisos de Barros & Errázuriz mediante API autenticada y navegador en producción, con captura de bandeja/timeline. La nueva interfaz de esa cuenta continúa siendo la versión de Main. La verificación de la nueva interfaz se realiza en Dev. Las sesiones y el acceso SSH usados para comprobar se retiran al finalizar.

Artefactos ignorados: `work/feasibility-ui-2026-10-12/`. No versionar claves, sesiones, archivos privados de Railway ni datos crudos de clientes.

## Publicación y cierre comprobados

[PR #27](https://github.com/joseibietasepulveda/Buho-Marc/pull/27) integrado en Dev `816c5eaad7e8cdb89890ee524378b7cd367d6c2f`. Railway `f8ce295d-6fbb-4f34-9908-c3663cb7d067` terminó SUCCESS para ese SHA, con compilación, TypeScript y salud 200/base conectada. Se comprobaron los 12 avisos mediante sesión autenticada en Dev, lector ampliado y diez descargas desde su bundle con expedientes/logos históricos interceptados; sin nueva búsqueda ni conclusión de IA.

Main conservó `59d3c7ae5ffb61a50ed5c0c990db96dc416fa272`, producción `94718a9f-e979-4501-8cd3-980c162be484`; la operación autorizada sobre Barros & Errázuriz fue exclusivamente de datos. Se revocaron las dos sesiones temporales y la clave SSH de comprobación, y se retiraron los archivos privados de acceso. Las entregas posteriores de Dev conservan esta funcionalidad. [Cierre documental y aplazamiento de recuperación adicional](2026-10-12-cierre-factibilidad.md).
