# Traspaso: flecha centrada del selector Niza

- Actualizado: 2026-10-13 00:46, America/Santiago.
- Estado: listo para publicar; verificación visual aprobada.
- Rama y base: `codex/niza-flecha-centrada`; Dev `8e1869a36d475bee39f267f2770d8cfa4cbc3f90`.
- PR y entrega: pendientes.

## Objetivo y alcance
Centrar verticalmente la flecha del buscador de clase Niza de Factibilidad, con el aspecto de los demás controles. Cambio visual puntual; conservar búsqueda por número/significado, apertura, teclado y selección.

## Cambios y archivos relevantes
- `app/app/nice-class-combobox.tsx`: reemplaza «⌄» por `CaretDown` de 18 px de la librería Phosphor existente, decorativo (`aria-hidden`). El botón conserva su nombre accesible, estados y eventos.
- `app/app/similarity.css`: dos reglas limitadas a `.nice-class-combobox`; control flex sin espacio de línea base y botón grid centrado, sin padding heredado. No cambia `.brand-combobox-control` de otros buscadores.
- `docs/FACTIBILIDAD_MULTINFORME_2026-10-09.md`: nota del alineamiento del selector.

## Decisiones y motivos
Usuario: flecha centrada y consistente con los demás controles. Agente: cambio limitado al selector Niza, sin modificar comportamiento ni estilos de otros buscadores.

## Coordinación e integración
Se reutiliza el worktree aislado de este chat, limpio, con una rama nueva desde Dev actualizado. Sin cambios en datos, API, esquemas, dependencias ni inferencias. Servidor y base locales propios detenidos al terminar. Se conserva el flujo de publicación Dev y producción autorizado en el chat.

## Verificación
- Chrome/Playwright sobre la instancia local propia 3149/PostgreSQL 55489, fuente simulada y sesión QA local. En 1440, 820 y 390 px: campo 44,296875 px, SVG 18 px, diferencia vertical de centros -0,0078125 px. Capturas de escritorio/móvil inspeccionadas; el indicador de compilación de Next aparece sólo en la captura móvil de desarrollo y no corresponde a la interfaz publicada.
- Apertura con el botón: 45 opciones; filtro 30 y selección con flecha/Enter; reapertura y cierre con Escape aprobados. Cero errores de página, búsquedas remotas o inferencias. Evidencia ignorada en `work/niza-arrow-qa/qa.json` y capturas `niza-1440.png`, `niza-820.png`, `niza-390.png`.
- Reproducción: abrir Factibilidad/Buscar; medir centros de `#proposal-class` y `.nice-class-combobox button > svg` con `getBoundingClientRect()` a las tres anchuras. La diferencia debe ser menor a 0,5 px; pulsar Mostrar clases de Niza, filtrar 30, seleccionar con Enter y volver a abrir/cerrar con Escape.
- ESLint del componente, `tsc --noEmit --incremental false` y `git diff --check`: aprobados. `npm run build -- --webpack` aprobado: compilación/TypeScript y 36 páginas. No se añadieron pruebas unitarias que duplicaran este ajuste visual.

## Pendientes y siguiente paso
Publicar/verificar en Dev y producción siguiendo la autorización vigente del chat. Registrar PR, commit y despliegues exactos. No ejecutar consultas a INAPI ni OpenRouter para este ajuste.
