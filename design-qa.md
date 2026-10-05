# Design QA — Buho Marc Dev · 24 Aug 2026

> Actualización del 2 de octubre de 2026: las secciones antiguas conservan su fecha, referencias y alcance. El registro de la ronda actual se encuentra al final de este documento; [UI/UX](docs/UX_OCTUBRE_2026.md) e [informes](docs/INFORMES_FACTIBILIDAD_2026-10-02.md) describen la implementación vigente.

## Comparison target

- Dashboard KPI and calendar references: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-af30a0a1-c633-41f1-a47a-a4e292ffb251.png`, `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-2d5f27f8-7566-4c5b-85ff-f412ba4f5c31.png` and `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-391a342c-b141-4935-8c43-9c51f644d464.png`.
- Coincidence table reference: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-cea74db9-79eb-4dfe-98c6-d1af9f5ed268.png`.
- Case drawer and board references: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-013221e7-2878-46ea-944c-5ed42530c87e.png` and `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-d9907daf-01fe-4aee-a98b-0df073b42fd7.png`.
- Implementation: `http://127.0.0.1:3000/app` in the Codex in-app browser.
- Browser-rendered screenshots: `/tmp/buho-dashboard-1440.png`, `/tmp/buho-dashboard-1000.png`, `/tmp/buho-dashboard-default-final.png`, `/tmp/buho-matches-1440.png`, `/tmp/buho-cases-1440.png`, `/tmp/buho-case-match-overlay-1440.png` and `/tmp/buho-railway-dev-final.png`.
- Viewports: 1440 × 900 and 1000 × 900 CSS pixels.
- States compared: dashboard, previous/next calendar month, coincidence list, case board, case list, case drawer, superposed coincidence drawer and unlink confirmation.

## Visual comparison

- The warm grey workspace, off-white surfaces, dark fixed navigation and violet accent system remain unchanged.
- The KPI surface is vertically tighter. All four cards use identical title, number and subtitle tracks; at 1000 px their offsets are 13, 50 and 109 px respectively, including the two-line opposition subtitle.
- The KPI grid changes cleanly from four columns to two without document overflow.
- The dashboard match rows no longer contain the INAPI link. Similarity badges, followed brand and possible match now fit without overlap.
- The calendar month title is fully visible between compact arrow buttons and the two lower dashboard panels keep the requested equal split at desktop width.
- The coincidence table begins with Similitud and Estado, contains no Revisar column and fits its complete 1158 px container without horizontal overflow at the desktop viewport.
- The case board contains only Preparación, Presentado, Seguimiento and Concluido.
- No clipped headings, broken spacing, unintended black blocks or overlapping controls remain in the tested states.

## Interaction QA

- Calendar arrows changed Agosto de 2026 to Septiembre de 2026 and back without reloading the page.
- Match rows remain fully clickable and keyboard accessible after the column reordering.
- Opening Ver coincidencia from a case produced two stacked drawers; closing the match drawer left the case drawer open.
- Sacar de caso showed an explicit confirmation explaining that the match returns to pending review while the case remains open; Cancelar closed the confirmation without changing data.
- Legacy Evaluación values from local storage and PostgreSQL snapshots are normalized to Preparación, so no hidden fifth stage remains in board or list view.
- Case-list stage badges use distinct classes and colors for Preparación, Presentado, Seguimiento and Concluido.
- Browser console errors and warnings: none.

## Verification

- `npm test`: passed (includes production build and five automated tests).
- Focused ESLint check for the modified TypeScript files: passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- Railway Dev was checked after deployment: the complete month title is visible, the four case stages and reordered match headers are present, and the browser console has no warnings or errors.

final result: passed

---

## Design QA — Escala de escritorio y tabla de Vigilancia · 4 Sep 2026

### Comparison target

- Referencia visual principal al 80%: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-028f956b-e3b1-4fe4-964b-d70d40c5a022.png`.
- Referencias del problema de Vigilancia: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-64166b44-7718-4151-9a84-f9eb1d9dba97.png`, `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-53cc9fd4-e427-42fe-8717-aa5792853a20.png` y `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-24660863-bec6-4e2b-a28a-fc7a61855b3e.png`.
- Referencia del historial del caso: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-a8ef23a1-a2d0-45c1-8d7c-107787656fa0.png`; patrón de destino: historial vertical de Inscripción de marcas.
- Implementación local verificada en Google Chrome: `/tmp/buho-qa-brands-final.png`, `/tmp/buho-qa-vigilancia-final.png` y `/tmp/buho-qa-historial.png`.
- Comparaciones combinadas: `/tmp/buho-compare-brands.png` y `/tmp/buho-compare-vigilancia.png`.

### Visual comparison

- La aplicación de escritorio usa una escala interna de 80%, por lo que Chrome puede permanecer al 100% manteniendo la densidad de las referencias.
- El menú lateral conserva el mismo ritmo y queda deliberadamente un poco más legible que la referencia, con títulos de 15 px antes de aplicar la escala.
- La tabla de Vigilancia y su barra superior comparten ahora un ancho de 2380 px. Las 15 columnas tienen una asignación explícita y conservan desplazamiento horizontal.
- El encabezado de Vigilancia mide 58 px y las primeras cinco filas miden 67 px cada una en la verificación de Chrome. Solo la casilla de selección queda bajo 50 px, como corresponde; ninguna columna de texto termina vertical.
- El historial del caso usa tres hitos unidos por una línea vertical y dos flechas hacia abajo, replicando la gramática visual de Inscripción de marcas.
- No quedan superposiciones, columnas ilegibles ni alturas de fila desproporcionadas en los estados revisados.

### Verification

- `npm test`: passed; incluye build de producción, TypeScript y cinco pruebas automatizadas.
- `git diff --check`: passed.
- Consola de Google Chrome: sin errores ni advertencias.
- Interacciones verificadas: navegación entre Marcas registradas, Vigilancia y Casos; apertura del caso; presencia de tres hitos y dos flechas en el historial.

final result: passed

---

## Design QA — Revisor de factibilidad · 28 Aug 2026

### Comparison target

- Source visual truth: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-6c82d82c-d4ab-4da9-841a-d694968f2d9d.png` (search structure, 2264 × 476 px) and `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-39a5a984-9f25-44a5-93b7-a07ff11d0388.png` (results table, 2454 × 608 px).
- Supporting brand assets: the four user-supplied Cafeteras Mistral, Cafeteras Las Delicias, Pisco Mistral and Museo Gabriela Mistral images, plus the public Hotel Mistral reference saved in `public/feasibility/`.
- Browser-rendered implementation: `reference-captures/feasibility-initial-final.png` and `reference-captures/feasibility-results-final-fit.png`, both 1280 × 720 px.
- Combined comparison evidence: `reference-captures/feasibility-comparison-final.png`, 2560 × 1440 px. Each source or implementation view was normalized to a 1280 × 720 cell without density scaling; browser viewport was 1280 × 720 CSS px at device density 1.
- States compared: prepared demo search and analyzed results with the first candidate expanded.

### Required fidelity surfaces

- Fonts and typography: the reference hierarchy was translated into the existing Geist/Geist Mono system; large app title, compact field labels, strong table headers and readable risk values remain consistent with Buho Marc rather than copying EUIPO styling.
- Spacing and layout rhythm: the search uses the reference's single horizontal composition and the table keeps its dense row rhythm. The result summary precedes the table as requested and the sidebar retains all eight destinations at the 720 px test height.
- Colors and visual tokens: the existing ink, warm surface and violet controls are preserved. Risk is not color-only: each value includes a percentage and probability label; green, gray and red semantics follow the 15% reference rule.
- Image quality and asset fidelity: all five candidate rows use real raster logo assets with `object-fit: contain`; no logo is reproduced as CSS, text art or a placeholder. The uploaded Cafeteras Mistral mark remains sharp in the input preview.
- Copy and content: no advanced-search control or trademark-office column remains. The table includes Niza classes, applicant name, application number, situation and similarity evidence; the summary distinguishes pre-publication formal observations from post-publication substantive objections and carries an explicit mock-data disclaimer.

### Interaction QA

- Sidebar order verified as Inicio → Revisor de factibilidad → Inscripción de marcas → Marcas registradas.
- Text entry, match-mode selector, image upload, case reset and analysis button are interactive.
- Selecting class 35 after classes 11, 30 and 43 produced a fourth numeric chip without replacing earlier choices; the uploaded filename and preview updated correctly.
- Analysis showed the loading state and then four ordered candidates. Row disclosure opened and closed the explanation without navigating away.
- Browser console errors and warnings: none. Production build and TypeScript check passed through `npm run build`.
- Railway Dev deployment `fd17c0b7-00ba-4c2b-871c-69ee81da297e` reached `SUCCESS`; the published flow returned four rows, its browser console remained clean and `/api/health` reported `database: connected`.

### Comparison history and resolved findings

- P2 persistent navigation: the first 1280 × 720 capture hid Usuarios below the viewport. Compact-height sidebar spacing, button heights and plan padding were reduced; the final capture shows all eight destinations and the plan.
- P2 result visibility: the initial table width hid applicant and similarity columns behind horizontal overflow at 1280 px. The desktop minimum width, cell padding, logo size and applicant width were tightened; the final evidence shows all requested columns and risk scores simultaneously.
- No actionable P0, P1 or P2 findings remain. The source screenshots are structural references from a different product, so their map illustration, colors and typography were intentionally not cloned.

### Follow-up polish

- P3: a production motor should add partial-result and source-unavailable states; these are documented in the backlog and do not block the curated demo.

final result: passed

---

## Design QA — Inscripción de marcas · 27 Aug 2026

### Comparison target

- Structural references: `/Users/rosariovial/Downloads/WhatsApp Image 2026-08-27 at 17.57.49.jpeg` and `/Users/rosariovial/Downloads/WhatsApp Image 2026-08-27 at 17.57.48.jpeg` (3024 × 4032 px). The whiteboard notes are treated as information architecture and workflow references, not as a visual style source.
- Existing-product visual source: the current Buho Marc navigation, Geist typography, warm neutral surfaces, compact borders and violet accent system in `app/app/buho-app.css`.
- Implementation captures: `reference-captures/registration-desktop.png`, `reference-captures/registration-detail.png` and `reference-captures/registration-history.png` at 1440 × 1000 CSS pixels, DPR 1.
- Combined comparison inputs: `reference-captures/registration-qa-canvas.png` and `reference-captures/registration-qa-detail.png`.
- Primary target: desktop. Tablet and mobile are compatibility surfaces only, as documented in the README.

### Visual comparison

- The complete Canvas presents the two macrofases in the requested sequence: INAPI first and Diario Oficial · desde la publicación second, with a directional transition between them.
- Closed cards preserve the rapid reading order marca → estado → vencimiento → días restantes. Legal days are separated from the state label and use the existing blue accent.
- Normal, próximo a vencer, vencido and terminal conditions use iconography and explicit text in addition to color.
- The Diario Oficial header explains that the workflow continues through opposition, substantive examination and INAPI resolution after publication.
- The detail drawer opens over the Canvas without changing its position. State is the first detail field; identity, application metadata, holder/client, Nice classes, registration information and expediente reference follow.
- The vertical history uses the exact event grammar, a visible downward connector and optional secondary context.
- The interface uses the app's real logo assets and Phosphor icons; no placeholder illustration or custom SVG substitute was introduced.
- No clipped headings, overlapping cards, unintended global footer styling or broken desktop grids remain in the final comparison.

### Interaction QA

- Sidebar order verified as Inicio → Inscripción de marcas → Marcas registradas.
- Search by TERRA reduced the Canvas to one matching card and clearing filters restored all 12 applications.
- The temporary status selector exposes all 17 requested statuses; moving TERRA SUR to a Diario Oficial state moved the card to the second macrofase, and moving it back restored the INAPI lane.
- Loading and empty demo states render independently and return to the Canvas state.
- Opening and closing the detail drawer preserves the Canvas URL and position.
- A fresh browser tab loaded all 12 cards with no browser errors or warnings; only normal Vite connection and React development messages were present.

### Resolved findings

- P1 behavior: a missing `Funnel` icon import initially prevented the Canvas from rendering; the import was added and a fresh-tab check passed.
- P1 layout: the app's global footer rules leaked into card footers; the card footer was explicitly scoped and the final desktop capture shows correct alignment.
- P2 content: a publication date could remain visible after moving a mock card back to INAPI; publication metadata is now shown on closed cards only in the Diario Oficial macrofase.
- P2 content: the timeline connector did not literally display the requested down arrow; the arrow is now visible between recorded events.
- P2 responsive navigation: compact navigation buttons had no visible labels; numeric labels 01, 02 and 03 remain visible for basic small-screen access, without changing the desktop-first product decision.

### Verification

- `npx tsc --noEmit`: passed with the project's stale generated `.next-local` cache isolated for the check, then restored unchanged.
- `git diff --check`: passed.
- Browser checks: desktop Canvas, detail drawer, vertical history, search, status movement, loading and empty states passed.
- Railway Dev deployment `5dad6892-9e25-4fbd-b17f-28401d9127a0`: `SUCCESS`; health check connected, 12 cards visible, both macrofases rendered side by side at 1280 px, exact sidebar order present and browser console clean.
- Focused ESLint did not complete in this repository and was stopped after hanging without output; no partial changes were produced.

final result: passed

---

## Focused QA — KPI deadline and match-table overflow

- Reference: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-14c27b34-3329-4c1b-b4b7-f419ebd50b57.png`.
- Local implementation screenshots: `/tmp/buho-dashboard-kpi-1280.png`, `/tmp/buho-matches-scrollbar-1280.png`, `/tmp/buho-matches-scrollbar-1000.png` and `/tmp/buho-matches-scrollbar-visible.png`.
- Viewports: 1280 × 900 and 1000 × 900 CSS pixels.
- The Casos activos subtitle reads `2 con vencimiento en menos de 14 días`; its card has no horizontal or vertical overflow at 1280 px.
- Similitud and Estado pills render at 10 px. Across all ten rows, both pills remain inside their own cells at both tested widths; the longest status, `En observación`, keeps 30.3 px of free space before its cell boundary.
- The table uses a fixed 1280 px layout inside a 977 px container at the desktop check and a 691 px container at the narrow check. Horizontal overflow is therefore deliberate and available at both widths.
- The horizontal scrollbar is visible with a violet thumb and was exercised from `scrollLeft = 0` to `286.11` using the browser UI.
- Visual comparison confirms that the overlap shown in the reference no longer occurs. Browser console errors and warnings: none.
- Railway Dev was checked after deployment at 1280 × 900: all ten live rows—including `En observación` and `Convertida en caso`—remain inside their cells at 10 px; the published table scrolls horizontally from `0` to `286.11` and its console has no warnings or errors.

final result: passed

## QA de UI e informes · 2 de octubre de 2026

Entrega funcional `b42ae34`, publicada y verificada en Railway Dev. Esta ronda no revalida automáticamente los ejemplos ni screenshots de agosto/septiembre.

### Pantallas

- Alta de cartera con criterios a la izquierda/candidatos a la derecha, coincidencias por persona y confirmación de cliente/rol; búsqueda y Excel/CSV sin duplicar expedientes.
- Agrupación inicial y filtros de fecha de factibilidad; formulario de estudio por encima de los criterios, todos los campos opcionales, guardado/recarga y edición.
- Casos simple/detallado, prioridad, tabla del expediente defendido; informe de cliente por columnas y formatos.
- Paneles/diálogos con cierre exterior, Escape y foco; formulario de estudio en escritorio y ancho móvil, desplazamiento interno, footer completo y sin desborde horizontal.
- Retirada/limpieza persistente de notificaciones y eliminación de tareas en el piloto aislado, sin eliminar plazos del expediente.

### PDF y Word

Referencia del cliente: `Informe Factibilidad SEMASK (rev dms).pdf`, autor Daniel Morales, 11 páginas Carta. Se utiliza su estructura institucional, no su conclusión ni resultados sobre SEMASK. Referencias de marca: sitios oficiales de Zamora IP/FA y logo FA adjuntado por el usuario; logo De Las Heras extraído del ejemplo.

Se renderizaron y revisaron las seis variantes completas: estudio de ejemplo, sin estudio, texto largo, Zamora, FA y Daniel. PDF: 5/4/6/5/4/5 páginas respectivamente; Word renderizado: 4/4/5/4/4/4. Las diferencias de paginación entre formatos conservan todos los datos. Se comprobaron nombres/coberturas largos, imagen junto a sus identificadores, encabezados/pies, ausencia de cortes o superposición y conclusión/nota/firma finales. Se corrigió una firma aislada y se regeneraron las variantes antes del control final.

Artefactos locales reproducibles en `work/report-qa/` (ignorados por Git): seis `.pdf` y `.docx`, PDFs/PNG de los Word y hojas de revisión `pdf-todas-*.png` / `word-todas-*.png`. Son ejemplos con una búsqueda histórica y «Cliente de Ejemplo», sin una llamada nueva al motor ni una clave real de OpenRouter. El generador puede descargar imágenes si no están en caché.

### Verificación funcional y publicación

Compilación/TypeScript y ESLint de componentes modificados aprobados. Las pruebas dirigidas y el piloto descartable verificaron el contexto completo, respuesta válida/error del proveedor, decisión del autor, fallback, persistencia, costo/uso, generación concurrente única, aislamiento, control de versiones del perfil y precarga sin sobrescribir ediciones. Se comprobó descargar PDF y Word con la misma conclusión preparada.

Dev `f02635e3-bd50-4342-9931-710d648b36a4`: `SUCCESS`, migraciones aplicadas, perfil de los tres estudios precargado, salud 200 con base conectada, logos 200 y perfil anónimo 401. No se verificó un llamado OpenRouter con credencial real. Resultado: aprobado para el alcance implementado; activar el proveedor real sigue pendiente de clave.

## Pulido visual y notificaciones · 4 de octubre de 2026

Ronda descrita en [Pulido de octubre](docs/UX_PULIDO_2026-10-04.md). Referencia de bandeja: documentación oficial de [Linear Inbox](https://linear.app/docs/inbox), adaptada a Buho Marc.

- Navegador: escritorio de 1280 × 720, escritorio angosto de 1024 × 900 y móvil de 390 × 844. Revisor y bandeja sin desborde horizontal. En móvil se apilan campos y tarjetas; los controles permanecen legibles.
- Revisor: datos del estudio a la derecha sobre el logo; agrupación junto al selector Niza y seleccionada inicialmente; seis modos textuales; ausencia del selector de modelo alternativo; letras ampliadas en clases, fechas, estados y criterios adicionales. Apertura y cierre del editor comprobados.
- Tareas: eliminación en su columna derecha y títulos/contexto mayores. Calendario de resumen y agenda completa usan X SVG centradas. Diferencia medida entre el centro del SVG y del botón: menos de 0,005 px en escritorio y 0 px en móvil para notificaciones.
- Todas: bandeja con filas, búsqueda y filtro de revisión; cada aviso abre un panel lateral. Se verificaron cierre exterior y Escape. Páginas de 50 y 17 avisos para un historial de 67, sin perder avisos al navegar. La búsqueda de representante devolvió diez filas y el filtro Revisadas once en la cuenta descartable.
- Limpiar prioritarias: el indicador lateral pasó de 27 a vacío, conservando los 67 avisos. Los cambios administrativos permanecieron pendientes y el historial siguió accesible.
- Compilación de producción/TypeScript y ESLint de todos los componentes modificados aprobados. Quince pruebas dirigidas de tareas, cronología y paginación aprobadas. Piloto PostgreSQL y pruebas UX aisladas verificaron limpieza sin retirada, repetición idempotente, aislamiento, aviso futuro pendiente, cliente/rol, informes Excel/Word/PDF y eliminación de tareas.
- No se usaron expedientes alojados para acciones de prueba. Consola del navegador sin errores ni advertencias en la compilación final.

Capturas locales en `work/ui-qa-oct4/` (ignoradas por Git): `revisor-escritorio.png`, `notificaciones-todas.png` y `notificacion-detalle.png`. La cuenta y los avisos son descartables. Resultado de QA funcional y visual: aprobado. Destino de publicación: Railway Dev.

Publicación de esta ronda comprobada: entrega funcional `83386dc`, Dev `dc2db98a-0f70-486b-8ab8-2d020a41bfab`, estado `SUCCESS`; salud HTTP 200/base conectada y PATCH anónimo 401. La verificación de interfaz e interacción se realizó en el entorno local aislado; el control de Dev confirmó commit, compilación, arranque y salud del servicio.

---

## Implementación de maquetas y directorios · ronda posterior del 4 de octubre de 2026

Resultado local para el alcance aprobado. **Sin publicación nueva.** Los resultados de despliegue anteriores no corresponden a esta implementación. Fuentes, capturas, comparaciones, registros y exportaciones se conservan en [Implementación UX](output/implementacion-ux-2026-10-04/README.md); el [comparador](output/implementacion-ux-2026-10-04/comparador-ui-ux.html) distingue referencia, aplicación y pantalla anterior.

### Fuentes, normalización y estados

Fuente visual: `output/auditoria-ui-ux-2026-10-04/propuestas/`, once PNG y HTML originales: 01-resumen, 02-marcas, 03-vigilancia, 04-casos, 05-tareas, 06-registros, 07-busqueda, 07-resultados, 07-informe, 08-solicitudes y 09-notificaciones. Las decisiones expresas del usuario reemplazan la lista plana propuesta de Vigilancia y Solicitudes, preservan Casos Lista/Calendario, amplían columnas y restauran el selector Niza. La fuente para esas desviaciones es la decisión aprobada, no una coincidencia literal con la maqueta rechazada.

Implementación: `http://127.0.0.1:50746/app`, sesión del piloto aislado. Capturas reales en `output/implementacion-ux-2026-10-04/capturas/`: principales 01/02/03/04/05/06/08/09 y los tres estados 07-busqueda, 07-resultados-agrupados y 07-informe-final. Estados adicionales: filtros abiertos, Excel .xls, comparación/historial, feedback/motivo, seguimiento/conversión, casos detallado/lista/calendario/ficha, tarea completada, actuación, error de consulta, informe sin revisar, solicitudes Lista/Calendario, lector/limpieza/paginación y directorios/fichas.

Las fuentes originales miden 1280 px de ancho y mayor alto según maqueta. Se recorta **solo el tramo superior a 1280 × 720**, sin escalar ni cambiar contenido. Las capturas de escritorio miden 1280 × 720 píxeles y CSS, densidad 1:1. Se verifican dimensiones antes de guardar. Las comparaciones `comparaciones/01-resumen.png` hasta `09-notificaciones.png`, incluidos los tres archivos 07, juntan ambas imágenes en un lienzo 2560 × 752 (32 px de etiquetas y dos vistas de 1280 × 720). Se abrieron e inspeccionaron esas imágenes combinadas; no se emitió el juicio a partir de dos vistas separadas.

Recortes adicionales inspeccionados: `comparaciones/05-tareas-controles.png`, `07-busqueda-controles.png` y `09-notificaciones-controles.png`. Permiten leer controles, prioridades, radios, Niza/agrupación y títulos/fechas del lector. En la tabla inferior de registros se usó `capturas/06-registros-tabla.png` porque queda fuera de la primera pantalla. Las páginas exportadas se inspeccionaron individualmente.

Contenido y estado: las maquetas usan datos ilustrativos y una navegación de nueve secciones; la aplicación conserva directorios, buscador general, roles, etapas y datos reales del piloto. No se pretende precisión de píxeles con nombres, cantidades o etapas diferentes. Algunas capturas pertenecen al recorrido que crea temporalmente un caso o completa una tarea; sus cantidades reflejan ese estado. La consulta de factibilidad es MISTRAL y los dos antecedentes elegidos permanecen identificados hasta la exportación.

### Cinco superficies de fidelidad

| Superficie | Evaluación de fuente y aplicación |
| --- | --- |
| Tipografía | Arial en fuente y aplicación; títulos de 31 px, peso 700 y jerarquía coherente. Se midieron las nueve secciones: `mediciones-ui.json`. Avisos con título 16 px y fecha 14 px. Texto de tareas compacto y legible; en móvil el título ocupa la columna disponible y la prioridad pasa a una segunda línea. Nombres largos ajustan altura de tarjeta en vez de cortarse. |
| Espaciado y composición | Encabezado compacto, márgenes/paneles consistentes y radios de 12 px. Resumen y Registros recuperan indicadores + dos áreas de trabajo; Factibilidad conserva principal/lateral y tres pasos. Niza/agrupación: centros verticales separados 0,148 px. Las tablas tienen desplazamiento propio; la página no se ensancha. Lista/Calendario y tarjetas de Solicitudes son desviaciones expresamente aprobadas. |
| Color y estados | Fondo `#f6f5f8`, panel blanco, borde `#e1dce8`, púrpura `#6d3e94`, texto oscuro y secundarios sobrios. Prioridades Alta/Media/Baja usan rosa/amarillo/verde y texto. Selección, revisión, deshabilitado y voto tienen estados visibles. Se corrigieron reglas genéricas que anulaban colores o duplicaban bordes. |
| Imágenes, iconos y definición | Las marcas sin imagen se identifican como Denominativa/Sin imagen; no se fabrican logos. Los informes utilizan los assets del perfil existente, conservando proporción y formato institucional. Iconos de acciones pertenecen a la familia ya usada; X centradas y caret a 12 px del borde derecho, con 38 px reservados para no chocar con el texto. Los renders de PDF/Word se abrieron al tamaño suficiente para revisar texto y cierre. No se sustituyeron assets institucionales por dibujos de código. |
| Texto y comprensión | «Tareas - Agenda próxima», «Fecha de la actuación», prioridad sin «del caso» y títulos compartidos. La guía explica .xls y encabezado/hoja libres. Los seis modos, alcance recuperado y separación de consulta/borrador se explican en la propia pantalla. Agrupar, valorar, seguir, convertir, revisar avisos y eliminar no se presentan como la misma acción. Se revisaron singular/plural de los contadores modificados. |

### Iteraciones y hallazgos corregidos

La primera comparación quedó bloqueada por diferencias visuales P2. Después de aplicar ajustes se recapturó y volvió a abrir cada par fuente/implementación. No quedan diferencias P0/P1/P2 accionables dentro del alcance acordado.

| Hallazgo inicial | Impacto y corrección | Evidencia posterior inspeccionada |
| --- | --- | --- |
| P2 · Resumen: calendario grande/desproporción de zonas | Desplazaba la agenda y alteraba la composición. Se restauraron cuatro indicadores, atención y agenda próxima compacta. | `comparaciones/01-resumen.png` |
| P2 · Mis marcas: tabla excesiva y filtros colisionando | Dificultaba escanear y empujaba controles. Se ajustaron columnas, etiquetas y ancho; filtros de estado/tipo/Niza apilados en móvil. | `comparaciones/02-marcas.png`, `movil/02-marcas.png`; los tres selects móviles miden 304 px y muestran la opción completa. |
| P2 · Vigilancia: filtros abiertos ocupaban demasiadas filas | Aumentaba densidad antes de los hallazgos. Se dejaron controles de búsqueda/relevancia y disclosures de publicación/umbrales en la cabecera. | `comparaciones/03-vigilancia.png`, `capturas/03-vigilancia-filtros.png`, `movil/03-vigilancia.png` cargada. |
| P2 · Botón de explicación heredaba dimensiones incorrectas | Deformaba el área de valoración. Se corrigió su alcance de estilo y se verificó el diálogo abierto. | `capturas/03-vigilancia-tarjeta.png`, `capturas/03-explicacion.png` |
| P2 · Casos simple todavía mostraba campos detallados | Mantenía el problema de sobrecarga. Se conservaron prioridad, identidad, marca/solicitud y contexto; tareas en Detallado/ficha. | `comparaciones/04-casos.png`, `capturas/04-casos-detallado.png` |
| P2 · Tareas: prioridad sin color/título móvil estrecho | La prioridad heredaba estilos genéricos y el título se comprimía. Se corrigió especificidad y distribución móvil; eliminación derecha. | `comparaciones/05-tareas.png`, `05-tareas-controles.png`, `movil/05-tareas.png` |
| P2 · Registros: pie global invadía panel | Fondo/columnas del footer alteraban la lectura. Se aisló el estilo del pie de atención. | `comparaciones/06-registros.png`, `capturas/06-registros-tabla.png` |
| P2 · Factibilidad: referencia capturada con desplazamiento incorrecto | No permitía juzgar composición. Se repitió la captura al inicio de cada paso y normalizó el par. | `comparaciones/07-busqueda.png`, `07-resultados.png`, `07-informe.png`, `07-busqueda-controles.png` |
| P2 · Solicitudes: doble borde del buscador | El input interno parecía un segundo campo. Se corrigió la regla del selector real y se comprobó borde computado 0. | `comparaciones/08-solicitudes.png`, `movil/08-solicitudes.png` |
| P2 · Notificaciones: carga diferida anulaba pestañas/bordes | Aparecía otro sistema visual y borde doble. Se reforzó el alcance de estilos. Antes conservado en `iteraciones/09-borde-buscador-antes.png`. | `comparaciones/09-notificaciones.png`, `09-notificaciones-controles.png`, `movil/09-notificaciones.png` |
| P2 · Lector de notificaciones: acciones inferiores inaccesibles | El cuerpo completo se desplazaba fuera de la vista. Se separaron cabecera/cuerpo desplazable/pie fijo. | `capturas/09-notificacion-lector.png`, `movil/09-notificacion-lector.png` |
| P2 · Móvil: altura sobrante y buscador de Casos reducido | Generaba desplazamiento externo y filtro angosto. Se corrigió altura del contenedor y buscador de fila completa. | `comparaciones/movil-1.png`, `movil-2.png`, `movil-3.png`; raíz 390 × 844 y cuerpo de 390 px. |

Los estados intermedios no conservados como captura independiente se registran como hallazgos del recorrido, sin inventar una imagen anterior. La evidencia final combinada se conserva para cada corrección.

### Interacciones y comprobaciones

- Búsqueda/carga asistida con candidatos, confirmación de cliente/rol, .xls real, encabezado libre, números como texto y deduplicación. La asignación existente se conserva; tenant ajeno no accede.
- Vigilancia: voto persistido, motivo, ACK concordante, caída/reintento y aislamiento; pareja/índice/actor derivados del servidor. Tarjeta → seguimiento → convertir → caso conservando referencia.
- Casos: simple/detallado, Lista/Calendario conservados, ficha/expediente y prioridad persistente. Tareas: prioridad exterior, finalización y eliminación persistente.
- Factibilidad: seis radios, Niza, grupos/resultados, comparación, consulta ejecutada conservada ante error, selección explícita y revisión invalidada al editar; PDF/Word con misma selección y conclusión.
- Notificaciones: limpiar prioritarias dejó el indicador en 0 y mantuvo 68 avisos, con 38 revisados; historial página 2 muestra 51–68. Retirada individual/total persistente y tenant verificados por API.
- Clientes: ficha/edición, marcas vinculadas, selector de campos y formatos; Excel real de tres columnas. Usuarios: organización/roles y formulario. Auditoría: paginación de 25, texto/actor/acción/fechas, detalle con evidencia existente y referencias, tenant.
- Cierre exterior y Escape de paneles/diálogos, focos/etiquetas y controles semánticos durante los recorridos. No se certifica accesibilidad integral ni todos los lectores de pantalla.
- Comparador: A/B/Anterior funcionan; ArrowRight cambia pestaña y foco; imagen ampliable/cierre; imágenes visibles cargadas sin fallos. Captura `vista-comparador.png`.
- Compilación/TypeScript aprobados tras la última corrección CSS; ESLint 37 archivos, 39 pruebas dirigidas, cinco contratos estructurales, pilotos UX y feedback/auditoría/.xls aprobados. Registros en el paquete.

### Informes y límites

PDF y Word se descargaron desde la UI nueva y se renderizaron. `informes/pdf-pagina-1.png`, `pdf-pagina-2.png`, `word-render/page-1.png` y `page-2.png` se inspeccionaron **individualmente**: encabezado institucional, antecedentes seleccionados, conclusión y cierre íntegros. Dos páginas en cada formato; misma consulta MISTRAL, solicitudes 1800000/1800001 y conclusión. No se incluyó 1800002 ni el borrador NOVA. No se compara paginación del generador con el recuadro ilustrativo de vista previa.

Datos de piloto y proveedores controlados. No hubo llamadas nuevas con credenciales reales ni pruebas en carteras alojadas. La migración 0013 se aplicó solo al piloto. Exhaustividad/calibración, escala, producción y accesibilidad integral permanecen fuera de esta aceptación. La revisión visual no equivale a validar un análisis jurídico. Esta ronda no presenta una nueva comprobación completa de la consola del navegador; compilación, rutas reales y pantallas renderizadas constituyen la evidencia disponible. No se observaron pantallas de error del runtime en los recorridos finales.

Seguimiento P3: observar búsquedas habituales con abogados acostumbrados a INAPI y comprobar comprensión de grupos/selección antes de un informe. No es una discrepancia visual bloqueante frente a lo aprobado.

Checklist de entrega: fuentes/capturas normalizadas ✓; pares combinados y controles inspeccionados ✓; nueve vistas móviles ✓; recorridos persistentes ✓; cuatro páginas exportadas ✓; comparador probado ✓; guías y READMEs actualizados ✓. No quedan reparaciones necesarias para el alcance local.

final result: passed
