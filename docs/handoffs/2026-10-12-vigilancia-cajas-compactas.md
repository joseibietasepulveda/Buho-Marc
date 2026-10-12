# Traspaso: cajas compactas de Vigilancia

- Actualizado: 2026-10-12 19:21, America/Santiago
- Estado: listo para revisión e integración autorizada
- Rama y base: `codex/vigilancia-cajas-compactas`; `dev` en `816c5eaad7e8cdb89890ee524378b7cd367d6c2f`
- PR y commit de entrega: pendientes

## Objetivo y alcance
Petición explícita del usuario: retirar «Nueva publicación» de las cajas de cruces, abrir comparación/historial al pulsar la caja, eliminar su botón y ordenar Convertir en caso / Pasar a seguimiento / Descartar en una fila de igual altura. Publicar e integrar únicamente en Dev.

## Cambios y archivos relevantes
- `app/app/watch-panel.tsx`: oculta únicamente la etiqueta del tipo `publication`, usa apertura desde la tarjeta y agrupa Convertir en caso / Pasar a seguimiento / Descartar, en ese orden. Conserva aviso de publicación, feedback y acceso al caso convertido.
- `app/app/similarity-results.tsx`: `SimilarityCard.onOpen` reemplaza el antiguo `onDetails`, usado solo por Vigilancia. El contenido abre la ficha; el nombre es un botón de apariencia textual accesible con Enter/Espacio. Controles, formularios, etiquetas e imágenes se excluyen del clic general. Coberturas/historial de vigilancia quedan en la ficha, sin botones redundantes ni historial repetido en la caja. `onSelect` y el detalle desplegable sin `onOpen` conservan su comportamiento.
- `app/app/similarity.css`: estilos limitados a la apertura de cruces y `watch-finding-actions`; tres botones de 40 px, misma línea en escritorio/tablet y ajuste de filas en móvil.
- `docs/DECISIONES_UX_2026-09-24.md`: nueva regla de presentación y enlace a este traspaso.

## Decisiones y motivos
- Usuario: alcance visual y publicación en Dev.
- Agente: conservar la fecha real de publicación, el seguimiento/aviso de publicación y las decisiones persistentes. La retirada de la etiqueta no modifica detección ni notificaciones.
- Agente: acceso con teclado y controles interiores independientes al abrir la caja; mantener selección de informes de Factibilidad, que comparte `SimilarityCard`.

## Coordinación e integración
El módulo `similarity-results.tsx` y `similarity.css` se comparten con Factibilidad; su tabla actual usa `SimilarityImage` y `SimilarityStatusNotice`, y conserva su selección/comparación propia. Sin cambios de API, datos, migraciones ni proveedores. El repositorio del Escritorio conserva archivos `dataless` de iCloud y Git falla con código 138; la creación gestionada de worktree falló con «Git ref lookup failed». Se usa una copia completa aislada de la rama remota en `/private/tmp/buho-vigilancia-cajas-20261012`, sin modificar el checkout original ni recuperar archivos sobre él. La nota local antigua `2026-10-07-dev-vigilancia-espacio-adicional.md` no existe en esta base remota y no acredita un cambio integrado.

## Verificación
Ambiente: macOS, Node 24.14.0, Next 16.3.5, Chrome/Playwright y PostgreSQL desechable. Sin llamadas reales a OpenRouter, INAPI o DeQuiénEs.

- `npm ci --no-audit --no-fund`: aprobado, lockfile conservado.
- `npm run build`: aprobado (Turbopack, TypeScript y 36 páginas).
- `npx eslint app/app/watch-panel.tsx app/app/similarity-results.tsx`: aprobado sin errores ni advertencias. Revisión de React: accesibilidad con botones nativos, controles interiores independientes y sin efectos/consultas adicionales.
- `node --import ./tests/ts-loader.mjs --test tests/watch-view-state.test.mjs tests/watch-page.test.mjs tests/watch-feedback.test.mjs`: 11/11 aprobadas; estado confirmado, conversión conservada tras polling, descarte, filtros, paginación y feedback.
- `WATCH_QA_KEEP=true WATCH_QA_PORT=3438 node --import ./tests/ts-loader.mjs tests/watch-http.mjs`: aprobadas comprobaciones HTTP con fuente ficticia, aislamiento, autorizaciones y persistencia; se mantuvo el servidor únicamente para el navegador.
- `node outputs/vigilancia-cajas/check.mjs`: aprobado con fixtures de publicación, a 1440×1000, 820×1100 y 390×844. Tres acciones de 40 px y una fila en los dos primeros anchos; filas adaptadas en móvil. Apertura por contenido y Enter/Espacio, una petición de ficha por apertura; fecha real visible y etiqueta retirada. Feedback/comentario/seguimiento/aviso/conversión/descarte sin apertura accidental. Acceso al caso exacto. Factibilidad conserva selección en tabla y comparación y permite quitar del informe desde la ficha. Cero errores de página. Una ejecución intermedia del verificador falló porque su observador trató el formulario multipart de Factibilidad como JSON; se corrigió solo ese observador y la ejecución completa posterior pasó.
- Capturas y medidas locales ignoradas: `outputs/vigilancia-cajas/after-{1440,820,390}.png`, `comparison.png` y `results.json`; revisadas visualmente. La captura tablet conserva el desbordamiento previo del bloque de oposición en su columna estrecha; no se cambió su distribución con esta entrega centrada en escritorio.
- `git diff --check`: aprobado. `origin/dev` seguía en la base al preparar la entrega; no hay ramas pendientes de las que dependa este cambio.

## Pendientes y siguiente paso
Abrir PR hacia Dev, integrar por autorización del usuario y comprobar despliegue exacto/salud. Actualizar aquí las referencias de integración y publicación. Detener el servidor/base local al terminar. Sin promoción a main ni producción.
