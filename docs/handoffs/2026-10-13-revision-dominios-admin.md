# Traspaso: revisión de dominios para administrador Búho Marc

- Actualizado: 2026-10-13, America/Santiago.
- Estado: listo para revisión; no integrado ni desplegado.
- Rama y base: `codex/revision-dominios-admin`; Dev `475b9807f0aa8e5ad8f22f1b50ae218439f96e6c`.
- PR y commit de entrega: pendiente.

## Objetivo y alcance
Usuario solicita un dominio opcional desde cada ficha de marca, alta independiente, tabla con fecha de creación y titular, Factibilidad dominio inspirada en NIC Chile y dos KPIs en una fila del resumen. Sólo administrador Búho Marc, con datos mock; otros usuarios no reciben la funcionalidad. [Contrato funcional](../DOMINIOS_PREVIEW_2026-10-13.md).

## Cambios y archivos relevantes
- `lib/workspace-policy.ts`: `domainsPreview` opcional, habilitado únicamente para slug `estudio-ibieta-ip` y rol `admin`; sin cambiar capacidades de terceros ni estructura de su snapshot.
- `lib/domain-preview.ts`: tipos `DomainPreview`, `DomainRecord`, `DomainNotice`, fixtures independientes por sesión, normalización de host/IDN, altas/asociación sin duplicados, búsqueda Exacta/Contenga. Las fechas del registro y del alta son distintas. Titular permanece null hasta la futura API.
- `app/app/domains-preview.tsx` y `.css`: tabla, formulario, ficha editable de asociación, bloque de ficha de marca, resultados ficticios, avisos revisables y dos métricas. Estilos del diálogo también funcionan fuera de `.buho-app`, donde lo monta el portal.
- `app/app/page.tsx`: navegación, bloqueo de hash no autorizado, estado de prueba en memoria, ficha de marca y métricas. El estado sobrevive a la navegación y se reinicia al recargar. No se toca cartera persistida.
- `tests/domain-preview.test.mjs`: acceso, normalización, duplicados, asociación, disponibilidad desconocida e independencia de fixtures. `tests/pilot-presentation.test.mjs` actualiza la expectativa del nuevo permiso interno.
- README y documento funcional enlazan alcance y límites.

## Decisiones y motivos
**Usuario:** mock limitado al admin interno, asociación opcional, entrada lateral entre notificaciones/solicitudes, tabla y KPIs.

**Agente:** usar permiso autenticado por slug/rol, separar avisos ficticios de las notificaciones reales y guardar sólo en memoria. Cada marca admite un dominio; cada dominio se vincula a una marca como máximo en este prototipo. Todos los fixtures empiezan sin vínculo para no asociar automáticamente marcas reales por nombre. Fecha de creación y titular nuevos quedan pendientes; ausencia de resultados no indica disponibilidad. Modos basados en [WHOIS NIC Chile](https://www.nic.cl/registry/Whois.do), consultado el 13/10. No se llamó a OpenRouter.

## Coordinación e integración
Git original terminó con código 138; worktree administrado falló «Git ref lookup failed». Clon aislado `/Users/rosariovial/.codex/workspaces/revision-dominios-admin`, desde Dev remoto vigente. No se editaron/repararon archivos originales ni se copiaron credenciales. Copia limpia antes de cambiar; instrucciones AGENTS aportadas por usuario se aplicaron aunque no están versionadas en Dev.

Superficies compartidas: política de acceso y navegación/ficha/resumen en `page.tsx`. La nueva capacidad opcional conserva compatibilidad con snapshots antiguos (oculta por defecto) y con expectativas de terceros. No hay APIs nuevas, migraciones, dependencias nuevas ni cambio de programación. Fetch final confirma Dev sin avances frente a la base; comprobar otra vez antes de integrar. Conservar cambios de otros chats. Merge y producción quedan pendientes de autorización.

## Verificación
Ambiente: macOS, Node 24.14.0; clon limpio con `npm ci --no-audit --no-fund`. No se modificó lockfile.

- `node --import ./tests/ts-loader.mjs --test tests/domain-preview.test.mjs tests/pilot-presentation.test.mjs`: 11 pruebas aprobadas.
- `npx eslint app/app/domains-preview.tsx app/app/page.tsx lib/domain-preview.ts lib/workspace-policy.ts`: sin errores.
- `npm run build -- --webpack`: compilación, TypeScript y generación de rutas aprobadas. Sin conexión a base remota ni inferencias.
- `npm run dev:local` con `BUHO_LOCAL_PORT=3143`, `BUHO_LOCAL_DB_PORT=55543`, `BUHO_LOCAL_DATA_DIR=<clon>/.buho-domains/postgres`: PostgreSQL aislado, migraciones y fixtures locales. SOURCE_PROVIDER simulated y programación desactivada por el lanzador.
- QA con Playwright/Chrome local y sesiones creadas únicamente en esa base: administrador Búho, miembro Búho y administrador externo. Acceso desde snapshot real/local; no se interceptó el permiso para aprobarlo.
- Navegador: seis métricas en una fila a 1440; alta independiente, rechazo de duplicado, búsqueda exacta/contenga, ejemplo disponible y alta desde resultado, aviso revisado/KPI, asociación de dominio existente desde ficha de marca sin duplicar, ficha de dominio/desvinculación, navegación conservando cambios, reinicio tras recarga. Miembro y admin externo sin menú/controles/KPIs; `#domains` redirige al resumen y miembro sin bloque en ficha.
- Vista a 1440/820/390; capturas revisadas de resumen, tabla, ficha y factibilidad. Sin desbordamiento horizontal de página (tabla tiene scroll interno). Cero errores de página y cero POST durante flujos de dominios: no escriben en la API existente ni alteran otras notificaciones.
- Revisión React: estado inicial lazy y por instancia, cambios desde eventos, tipos explícitos, diálogos compartidos con foco/Escape, etiquetas nativas y estilos acotados a nuevas clases. Sin efectos de búsquedas remotas ni nuevos listeners/polling.
- `git diff --check`: aprobado. README y enlaces relativos de nuevos documentos revisados.

Capturas y resultado JSON en `outputs/domains/` (ignorado; sólo datos ficticios). Runner temporal `/tmp/buho-domains-browser.mjs` y sesiones temporales no se publican. Para reproducir manualmente: iniciar local aislado, preparar sesión del admin con helpers `ensureDemoSeed`/`createSession` en esa base, abrir `/app`, descartar bienvenida, seguir los flujos enumerados; repetir con rol member y otra organización admin. No usar sesiones reales para fixtures.

No se ejecutaron suites masivas de vigilancia: no cambian sus contratos ni consumidores. No hay integración real NIC, persistencia de dominios, consultas masivas, despliegue Railway ni cambios a producción.

## Pendientes y siguiente paso
1. Revisar PR hacia Dev y decidir integración; publicar en Dev cuando se autorice. Recargar para recibir el permiso/código nuevo.
2. API y vigilancia real posteriores: acordar contrato, organización, permisos, persistencia, datos ausentes y política de avisos. No heredar como reales los fixtures del prototipo.
3. Producción/Main requieren petición explícita. Después de integrar, añadir PR/commit y verificaciones conjuntas en esta nota; retirar copia aislada sólo cuando esté autorizado y no queden pendientes.
