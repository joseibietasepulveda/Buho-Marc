# Traspaso: informes para cliente y estudio

- Actualizado: 2026-10-12 11:24, America/Santiago
- Estado: listo para revisión y publicación en Dev
- Rama y base: `codex/factibilidad-cliente-estudio`; Dev `d17ff43fcbeb14a31640df6edef522a0ae8263d6`
- PR y commit de entrega: pendiente

## Objetivo y alcance
Selector de destinatario al descargar, inicialmente cliente; encabezado ordenado y nombres de marca en mayúsculas; logo de estudio reducido un 20%. Continuar el pulido del PR #20 en PDF y Word, tabla y fichas.

## Decisiones y motivos
- Confirmado por el usuario: reducir el logo de estudio un 20%, respetando proporciones.
- Confirmado: orden Informe de factibilidad, Inscripción marca, Inscripción en clase/clases, Para.
- Confirmado: cliente omite solicitudes, registros y campos de cobertura; estudio los conserva. Ninguna versión muestra factor de similitud.
- Decisión técnica: PDF de cliente no adjunta el respaldo técnico JSON; conserva la evidencia completa en el borrador y en la descarga para estudio. Evita entregar datos retirados mediante un adjunto oculto.

## Cambios y archivos relevantes
- `app/app/feasibility-review.tsx` y `similarity.css`: selector accesible de destinatario, inicialmente cliente, sin regenerar conclusiones; Nuevo estudio restablece cliente.
- `lib/feasibility-report-presentation.ts`: tipo `ReportAudience`, escala `.8`, denominaciones en mayúsculas y presentación textual compartida; cliente retira identificadores oficiales presentes en conclusiones sin cambiar el texto guardado.
- `lib/feasibility-report.ts` y `feasibility-docx.ts`: encabezado ordenado, logo reducido, campos técnicos reservados para estudio, ninguna similitud visible. Tablas pequeñas completas y centradas; ajuste de saltos de conclusión y fichas de cliente.
- PDF de estudio adjunta JSON versión 7 de registros relevantes, sin índices, canales ni payload completo; cliente no tiene adjunto técnico. Ambos mantienen tabla Marca/Logo.
- `tests/feasibility-report.test.mjs`: regresión de ambos destinatarios, formatos, presentación y adjuntos. `scripts/verify-feasibility-study.mjs`: ocho exportaciones y reutilización de conclusiones.
- Contrato funcional actualizado en `docs/FACTIBILIDAD_MULTINFORME_2026-10-09.md`.

## Coordinación e integración
Reutiliza el worktree aislado del chat con rama nueva desde Dev actualizado. Sin migraciones, dependencias ni cambios de credenciales. La selección, conclusiones y fuentes originales permanecen en el estudio; el destinatario afecta únicamente la presentación/exportación. El argumento opcional `audience` de ambos escritores usa cliente por defecto; consumidores técnicos antiguos deben indicar `study`. Se actualizaron sus pruebas. Sin impacto en la búsqueda ni en los demás apartados.

## Verificación
- `node --import ./tests/ts-loader.mjs --test tests/feasibility-study.test.mjs tests/feasibility-conclusion.test.mjs tests/feasibility-report.test.mjs tests/similarity.test.mjs`: 33/33 aprobadas.
- TypeScript (`tsc --noEmit`), ESLint de archivos afectados y `npm run build`: aprobados.
- `BUHO_LOCAL_PORT=3127 BUHO_LOCAL_DB_PORT=55467 BUHO_LOCAL_DATA_DIR="$PWD/.buho-local/study-postgres" npm run dev:local`: base y sesión locales aisladas, fuente simulada y programación deshabilitada.
- `scripts/verify-feasibility-study.mjs`: ocho descargas, clase activa, agrupación, cero antecedentes favorable, edición y errores; aprobado, selector cliente inicial y cambio de audiencia sin llamadas extra.
- QA adicional en navegador con registros y logos extraídos del PDF histórico entregado por el usuario: diez descargas reales de los escritores, sin búsquedas nuevas ni llamadas al modelo. Se reutilizó la recomendación histórica para revisar presentación; no constituye un análisis jurídico nuevo.
- Se renderizaron y revisaron 23 páginas: fichas cliente PDF/Word 2/2, fichas estudio 3/3, tablas cliente 2/2, tablas estudio 2/2 y multinforme tabla cliente 3/2. PDFium y LibreOffice incluido en el runtime de documentos. Sin desbordes; tablas pequeñas no se dividen, logos proporcionados, selector revisado en escritorio y móvil.
- Evidencia privada/local ignorada: `work/feasibility-audience-2026-10-12/` (manifest de páginas, QA del navegador, renders y descargas). No versionar el PDF fuente ni sus datos personales.
- La compilación en frío excedió inicialmente el timeout de navegación de 30 s; el verificador espera `domcontentloaded` con 60 s. Recorrido final aprobado sin errores.
- Dev actualizado comprobado en `d17ff43`; Main sigue en `59d3c7ae5ffb61a50ed5c0c990db96dc416fa272`. Publicación remota pendiente.

## Pendientes y siguiente paso
Crear PR hacia Dev, integrar con la autorización vigente y comprobar el SHA exacto/SUCCESS en Railway, salud y protección de rutas. Actualizar esta nota con la evidencia remota. No promover producción. La QA autenticada completa corresponde a local; las comprobaciones remotas serán de salud y aislamiento sin sesión.
