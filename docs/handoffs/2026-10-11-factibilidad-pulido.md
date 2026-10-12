# Traspaso: pulido de factibilidad y antecedentes relevantes

- Actualizado: 2026-10-11 23:14, America/Santiago
- Estado: integrado y desplegado exclusivamente en Dev
- Rama y base: `codex/factibilidad-pulido-octubre11`; `dev` en `9b99acb7212f1ce94635cd2e9c95a2547bba8c87`
- PR y commit de entrega: [PR #20](https://github.com/joseibietasepulveda/Buho-Marc/pull/20); funcional `7e1735257e1161c0302546759985ac5277bba8c3`; integración Dev `c8ff459a4c42a2eb183c3ed38716c2e8c2bec341`

## Objetivo y alcance
Corregir los contadores de marcas con varios expedientes; simplificar el informe y la edición de conclusiones; pulir tablas PDF/Word con marcas e imágenes reales. Continuar la experiencia de Informe/Multinforme integrada mediante PR #18.

## Decisiones y motivos
- Confirmado por el usuario: una marca del mismo titular cuenta como un antecedente, aunque conserve varios expedientes asociados.
- Confirmado: la IA analiza únicamente la clase activa y los antecedentes incluidos; llena el recuadro del abogado y permite editar directamente en la vista previa.
- Confirmado: sin antecedentes relevantes incluidos, recomendar presentar. Reemplaza la regla anterior de concluir obligatoriamente «insuficiente» ante una selección/búsqueda vacía. La recomendación se refiere al detalle elegido y no garantiza registro.
- Confirmado: texto público «IA - Buho Marc», sin porcentajes, casilla de revisión, anexos ni notas finales indicadas en las capturas.
- Confirmado: tabla con dos columnas, Marca y Logo, centrada; conservar fichas como alternativa.

## Cambios y archivos relevantes
Implementado: `app/app/feasibility-review.tsx`, `lib/report-selection.ts`, `lib/feasibility-conclusion.ts`, `lib/openrouter-conclusion.ts`, escritores PDF/Word, estilos y verificaciones del flujo.

## Coordinación e integración
Contrato compartido de selección: distinguir lista vacía explícita de selección omitida para consumidores antiguos. Preservar expedientes y procedencia; no fusionar denominaciones de titulares diferentes. Sin migraciones. Producción fuera del alcance.

## Verificación
- Base limpia y actualizada desde `origin/dev`; no avanzó durante la implementación.
- 32/32 pruebas dirigidas: `node --import ./tests/ts-loader.mjs --test tests/feasibility-study.test.mjs tests/feasibility-conclusion.test.mjs tests/feasibility-report.test.mjs tests/similarity.test.mjs`.
- TypeScript y ESLint de archivos modificados aprobados; `npm run build` aprobado.
- `scripts/verify-feasibility-study.mjs`: navegador local, proveedores interceptados; tres expedientes como un antecedente, selección agrupada, dos clases con generación independiente, autollenado/edición sincronizada, cuatro descargas reutilizadas, selección vacía favorable y fallo visible aprobado. Contador vacío con distancia superior/inferior equivalente; captura móvil.
- Navegador → API local → PostgreSQL → OpenRouter real: clases 30 y 29, únicamente clase activa por llamada; clase 29 sin selección recomienda presentar; cuatro documentos con logos descargados. Fuente: registros históricos guardados de 22/09/2026, no nueva búsqueda ni evaluación de una cartera real. SKITTLES usa tres expedientes asociados y cuenta como un antecedente; SOUR PATCH KIDS y SNICKERS MUNCH son los otros dos. Los proxies recuperaron sus imágenes reales.
- Evidencia ignorada: `work/feasibility-qa-2026-10-11/real-browser-qa.json`, capturas y documentos `informe-tabla`/`informe-fichas`.
- Interrupción ENOSPC de la compilación local de desarrollo resuelta eliminando exclusivamente `.next-local/dev/cache`; recorrido repetido. Código, bases, artefactos y recursos de otros trabajos conservados.
- PDFium para PDF y `render_docx.py`/LibreOffice incluido para Word. Tabla final revisada: PDF 3 páginas, Word 2; tres logos y agrupación correcta. Fichas finales: PDF 4 páginas y Word 3. Las doce páginas finales se inspeccionaron completas; sin tablas pequeñas partidas, títulos aislados ni párrafos finales solos.
- Extracción de ambos PDF: sin OpenRouter, porcentajes, candidatos recuperados ni las dos notas retiradas.


## Integración y despliegue
- [PR #20](https://github.com/joseibietasepulveda/Buho-Marc/pull/20) integrado; Railway Dev `6f5b7742-acab-4d48-baa3-54bc471ed833` SUCCESS, SHA exacto `c8ff459a4c42a2eb183c3ed38716c2e8c2bec341` comprobado. Compilación remota y arranque correctos, migraciones existentes aplicadas sin cambios de esquema.
- Salud HTTP 200, `ok: true`, base conectada y motor DeQuiénEs; perfil, búsqueda y conclusiones 401 sin sesión; `/app` redirige a `/ingresar`. No se ejecutaron búsquedas nuevas ni generaciones remotas sobre carteras reales para esta comprobación. La QA autenticada completa corresponde al piloto local.
- Main comprobado antes y después sin cambios en `59d3c7ae5ffb61a50ed5c0c990db96dc416fa272`. Configuración de clave/modelo preservada. El cierre posterior solo cambia documentación.

## Pendientes y siguiente paso
Entrega funcional terminada en Dev. Continuar con los ajustes que indique el usuario; los ejemplos descargables y la base aislada quedan en este worktree. No hay migraciones ni secretos nuevos. La promoción a producción requiere una petición explícita.

## Interfaces compartidas
- `lib/report-selection.ts`: `reportMarkGroups` conserva cada expediente y agrupa por denominación normalizada (mayúsculas/espacios/NFC, preservando acentos) y titulares; no fusiona el nombre genérico «Marca figurativa sin denominación»; `selectReportHits` distingue selección omitida de `[]`. `conclusionText` añade el espacio omitido tras una coma textual sin alterar comas numéricas.
- `lib/feasibility-conclusion.ts` valida referencias seleccionadas; `lib/openrouter-conclusion.ts` versión 8 invalida cachés de la regla anterior. La clave de inferencia existente conserva su configuración y vencimiento nulo.
- `app/app/report-images.ts`: un logo por antecedente, alternativas en expedientes asociados. Compartido por este flujo de PDF/Word.
- `lib/feasibility-report.ts` y `lib/feasibility-docx.ts`: dos columnas, agrupación y conteos relevantes, notas retiradas; compatibilidad de consumidores antiguos conservada. PDF adjunto nuevo v6 restringido al detalle seleccionado.
- `app/app/feasibility-review.tsx` y `app/app/similarity.css`: generación activa, edición directa, acciones y espacios; perfil/cliente/autor solo cambian presentación y no borran conclusiones.
