# Traspaso: factibilidad, cartera y vigilancia

- Actualizado: 2026-10-15, America/Santiago.
- Estado: listo para revisión local; sin integración ni despliegue.
- Rama y base: `codex/factibilidad-cartera-vigilancia`; `dev` `742b379e0828372f745c54abdf7bf3cad067ab33`.
- PR: pendiente; no se publicó rama. Commit de entrega: consultar `git log -1 --oneline` en esta rama; la entrega lleva este documento.

## Objetivo y alcance

Implementar clases vinculadas y búsqueda sin clase, contexto jurídico breve, informes con nuevas etiquetas, cartera propia/terceros y cotitulares como clientes, detección diaria por representante predominante, cuatro avisos de vencimiento, pago manual auditado y vigilancia plana con recomendaciones IA reutilizables. Prioridad especial a UI; entregar costos semanales y ejemplos diarios.

[Contrato funcional completo](../FACTIBILIDAD_CARTERA_VIGILANCIA_2026-10-15.md) · [Costos semanales](../COSTOS_SEMANALES_2026-10-15.md) · [Capturas y documentos verificables](../../output/mejoras-2026-10-15/README.md).

## Cambios y archivos relevantes

- `lib/nice-related.ts`, `trademark-legal-context.ts`, `similarity-provider.ts`, `similarity-contract.ts`, `feasibility-*`, `openrouter-conclusion.ts`, `app/app/feasibility-review.tsx`: alcance opcional/vinculado, resumen legal, conclusiones seleccionadas incluso sin cruces, límites de contexto/costo, PDF/Word y UI.
- `lib/portfolio-parties.ts`, `db/portfolio-clients.ts`, `db/inapi-portfolio.ts`, `app/api/portfolio/import/route.ts`, `client-directory.ts`, `db/client-report.ts` y componentes Clientes/importación: rol por organización, alta/deduplicación de titulares y cotitulares, asociación múltiple. Backfill histórico por lotes de 100 al cargar Clientes; no modifica contactos editados.
- `lib/portfolio-discovery.ts`, `db/portfolio-discovery.ts`, `app/api/portfolio/discover/route.ts`, `scripts/start-monitored.mjs`: exploración diaria paginada por RUT de representante propio, cursor/reintentos/deduplicación; notificación con revisión antes de importar. `db/demo.ts` admite avisos sin borrador de correo.
- `lib/registration-payment.ts`, `app/api/registrations/payment/route.ts`, `registration-data.ts`, `registration-evidence.ts`, `registration-procedure.ts`, `registration-follow-up.ts`, `db/source.ts`, `app/app/registrations.tsx`, `legal-language.ts`: declaración local por obligación, auditoría, reversión, proyección y texto de confirmación pendiente. La reimportación conserva intervenciones.
- `lib/renewal-reminder.ts`, `db/renewal-notices.ts`: 1 año/6 meses/1 mes/7 días, hitos idempotentes, fechas vigentes y capturas tardías sin inundación.
- `lib/watch-{policy,list,page,digest}.ts`, `db/watch-digest*.ts`, `db/similarity.ts`, `app/api/watch/route.ts`, worker de digest, `watch-panel.tsx`, `page.tsx`, estilos: Mostrar/No mostrar, recomendaciones primero, filas independientes, umbral único, revisión sin correo, 50×2 y caché material. `scripts/import-watch-digest-pilot.mjs` conserva huella al importar decisiones.
- `drizzle/0019_portfolio_watch_improvements.sql`, journal y `db/schema.ts`: rol/monitoreo histórico, tabla diaria de descubrimiento, modo de entrega de trabajos, huellas e invalidación de pantallas. `.env.example` documenta controles y US$0,10 por ejecución. `lib/release-notes.ts` mantiene pendiente el correo por nuevas marcas.

## Decisiones y motivos

Confirmadas por el usuario: vinculadas activadas bajo agrupación; prioridad y publicación IA con positivos sobre umbral, negativos ocultos, no evaluados según umbral; máximo 50 marcas/dos cruces (100); evitar reevaluación idéntica; RUT predominante del **representante** de propias, nunca titular ni terceros; terceros no crean clientes; correo de nuevas marcas pendiente; pago manual con procedencia separada de INAPI; todas las marcas activas monitoreadas.

Decisiones técnicas: roles `own`/`third-party` en relación local; no elegir arbitrariamente entre RUT empatados; avisar antes de incorporar una solicitud nueva; reutilizar decisiones por evidencia material, no fecha de consulta; positivos/negativos persistentes compartidos por revisión y digest. Preservar modo diario/a pedido de vigilancia de cada organización; descubrimiento por representante es independiente. IA diaria optativa con `WATCH_AI_ENABLED=true`, además del botón; correo conserva sus interruptores propios.

Fuente jurídica: INAPI 2026 y DFL 4/2022 enlazados en el contrato. Se documentó **7–8** para herramientas, no se inventó 7–9 a partir del ejemplo ilustrativo. Relaciones son condicionales y no exhaustivas. Las reglas comprimen contexto jurídico; no reemplazan evidencia de notoriedad, consentimiento o cobertura concreta.

Pago manual no equivale a acreditación oficial. Además de la tarjeta se corrigieron textos secundarios, detalle y seguimiento para no anunciar pago acreditado antes de recibir confirmación. Una obligación distinta no hereda una declaración antigua.

## Coordinación e integración

El checkout original de Desktop tenía archivos `dataless` de iCloud, incluido `.git/index`; Git no completó lecturas y Codex `create_worktree` devolvió `Git ref lookup failed`. Se obtuvo un clon independiente limpio desde GitHub en `/Users/rosariovial/CodexWorkspaces/buho-mejoras-20261015`, conservando íntegro el original. Se anunciaron carpeta/rama al usuario antes de editar. No se copiaron credenciales ni datos. Las reglas AGENTS.md vinieron explícitamente del usuario; no existían en el árbol remoto. Archivos AGENTS/CLAUDE generados por Next se retiraron, igual que modificaciones automáticas de tsconfig/next-env.

Cambios compartidos en `page.tsx`, contratos de fuente/registro, clientes, estilos y supervisor. Aplicar migración 0019 antes del código y revisar colisiones de número/journal al integrar; conserva migraciones anteriores. Las decisiones GLM existentes reciben huella calculada del snapshot, no se borran. Verificar conjuntamente los contadores, Clientes, agenda/correos, reimportaciones y pagos si otras ramas cambian estos archivos. Consultar `origin/dev` de nuevo antes de preparar integración.

No se ejecutaron OpenRouter, correos, búsquedas reales masivas, operaciones remotas de datos, push, merge ni despliegue. Las llamadas del modelo en pruebas fueron respuestas simuladas, incluida contabilidad/reintentos. Los secretos de fixtures son locales y no son credenciales reales.

## Verificación

Ambiente: macOS, Node 24.14, PostgreSQL embebido efímero por suite; UI en 3107/base 55447/directorio `.buho-local/improvements`. Supervisor/credenciales reales desactivados. Instancia local detenida al terminar capturas.

- `npm ci`: completado.
- `npm run build`: compilación de producción completada, incluidas nuevas rutas; también se comprobó salida convencional con `VERCEL=1` sin desplegar.
- `npx tsc --noEmit`: pasó con configuración original restaurada.
- ESLint sobre todos los TS/TSX/MJS modificados/nuevos: pasó sin errores. `npm run lint` global detectó dos errores preexistentes fuera del alcance: React sin uso en `.qa-registration/main.tsx` y bloque vacío en `tests/pilot-e2e.mjs`, además de tres advertencias de imágenes en landings. Se confirmaron en la base y no se editaron.
- Ronda final: **149 pruebas, 149 aprobadas, cero omitidas**. Comando reproducible:

```sh
node --import ./tests/ts-loader.mjs --test tests/similarity.test.mjs tests/portfolio-improvements.test.mjs tests/portfolio-improvements-integration.test.mjs tests/watch-digest-integration.test.mjs tests/feasibility-conclusion.test.mjs tests/feasibility-report.test.mjs tests/feasibility-study.test.mjs tests/renewal-reminder.test.mjs tests/renewal-notices.test.mjs tests/watch-digest.test.mjs tests/watch-list.test.mjs tests/watch-page.test.mjs tests/watch-view-state.test.mjs tests/watch-discovery.test.mjs tests/clients.test.mjs tests/portfolio-import.test.mjs tests/registration-evidence.test.mjs tests/administrative-payment.test.mjs tests/registration-procedure.test.mjs tests/registration-renewal.test.mjs tests/registration-follow-up.test.mjs tests/notification-page.test.mjs tests/report-coverage.test.mjs tests/snapshot-client.test.mjs tests/legal-language.test.mjs tests/rendered-html.test.mjs
node --import ./tests/ts-loader.mjs tests/watch-integration.mjs
```

La integración de vigilancia también pasó: migraciones, cola, idempotencia, diez reintentos 403, aislamiento, ventanas de seguimiento, transición a registro y monitoreo obligatorio. La prueba nueva de cartera cubre clientes/cotitulares, terceros, notificaciones, cuatro hitos por reglas, huellas de IA, cambios materiales y pago HTTP autenticado con reversión. Una prueba HTTP histórica adicional de evidencia no se ejecutó por faltar su base dedicada; no se contó como aprobada y su cobertura nueva de pagos se comprobó en la integración aislada.

- Chromium: pruebas de pantallas reales sobre fixtures, desktop/móvil, umbral guardado, búsqueda habilitada sin Niza, selección vinculada, selector terceros, Pagado/Deshacer sin abrir detalle; cero errores del navegador. [Comandos, capturas y límites](../../output/mejoras-2026-10-15/README.md).
- PDF/Word: generados con conclusión ficticia de autor, sin IA; PDF renderizado e inspeccionado en sus dos páginas. Word comprobado por estructura/etiquetas/selección en las pruebas; no renderizado en Word en esta ronda.
- `git diff --check`: pasó. Enlaces locales de documentación y fórmulas de costos revisados.

## Pendientes y siguiente paso

1. Revisar esta rama, actualizar contra Dev y resolver posibles cambios compartidos; luego preparar PR/validación en Railway Dev cuando se solicite publicación. Producción requiere petición explícita.
2. Configurar en el ambiente de destino los controles acordados; la plantilla no actualiza variables existentes. Mantener claves separadas y comprobar el presupuesto vigente antes de habilitar IA diaria.
3. Medir una semana de tokens/consultas/cargos reales en operación autorizada y aplicar contrato de fuente e infraestructura. El reporte entrega supuestos y fórmula, no inventa un total facturado.
4. Correo automático de nuevas marcas sigue pendiente por decisión del usuario; Notificaciones sí está implementado.
5. Mantener actualizado el catálogo referencial INAPI; no tratarlo como una matriz universal ni suponer exhaustividad de la búsqueda limitada a 100 candidatos.
