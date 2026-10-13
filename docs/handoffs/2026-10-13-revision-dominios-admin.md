# Traspaso: revisión de dominios para administrador Búho Marc

- Actualizado: 2026-10-13 16:16, America/Santiago.
- Estado: integrado y publicado en Railway Dev; permisos y flujos verificados.
- Rama y base: `codex/revision-dominios-admin`; Dev `475b9807f0aa8e5ad8f22f1b50ae218439f96e6c`.
- PR y commit de entrega: [PR #78](https://github.com/joseibietasepulveda/Buho-Marc/pull/78), integrado hacia Dev; implementación `d6cac53`, cierre `a9fb503`, integración `92a55a13a85636c5963fd49c3e5fe396045582c4`.

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

Superficies compartidas: política de acceso y navegación/ficha/resumen en `page.tsx`. La nueva capacidad opcional conserva compatibilidad con snapshots antiguos (oculta por defecto) y con expectativas de terceros. No hay APIs nuevas, migraciones, dependencias nuevas ni cambio de programación. Fetch previo al merge confirmó Dev sin avances frente a la base. Conservar cambios de otros chats. Usuario autorizó integrar PR #78 y publicar exclusivamente en Dev el 13/10. Main/producción no se incluyen.

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
- `git diff --check`: aprobado. Nuevos enlaces del README y enlaces relativos de ambos documentos aprobados. La comprobación global encontró una referencia histórica del README a `output/implementacion-ux-2026-10-04/comparador-ui-ux.html` ausente en el clon; no se modificó por ser ajena al cambio.

Capturas y resultado JSON en `outputs/domains/` (ignorado; sólo datos ficticios). Runner temporal `/tmp/buho-domains-browser.mjs` y sesiones temporales no se publican. Para reproducir manualmente: iniciar local aislado, preparar sesión del admin con helpers `ensureDemoSeed`/`createSession` en esa base, abrir `/app`, descartar bienvenida, seguir los flujos enumerados; repetir con rol member y otra organización admin. No usar sesiones reales para fixtures.

No se ejecutaron suites masivas de vigilancia: no cambian sus contratos ni consumidores. No hay integración real NIC, persistencia de dominios, consultas masivas ni cambios a producción. La publicación Dev se registra debajo.

## Pendientes y siguiente paso
1. Probar en [Railway Dev](https://buho-marc-web-dev.up.railway.app/app) con admin Búho; recargar para recibir el permiso/código nuevo. La funcionalidad queda mock y se reinicia al recargar.
2. API y vigilancia real posteriores: acordar contrato, organización, permisos, persistencia, datos ausentes y política de avisos. No heredar como reales los fixtures del prototipo.
3. Producción/Main requieren petición explícita. Retirar copia aislada sólo cuando esté autorizado y no queden pendientes.

## Integración y publicación · 13/10/2026

- Autorización expresa del usuario: integrar PR #78 en Dev y publicar para probar, conservando acceso exclusivo al administrador de Búho Marc.
- Antes de integrar: fetch confirmó Dev en la base `475b9807f0aa8e5ad8f22f1b50ae218439f96e6c`, sin avances/conflictos. Se repitieron las 11 pruebas dirigidas; todas aprobadas.
- PR #78 pasó de borrador a listo y se integró por merge con SHA completo del head fijado; GitHub integración `92a55a13a85636c5963fd49c3e5fe396045582c4`, 13/10/2026 16:10:53 Santiago. La primera petición de merge utilizó SHA abreviado y fue rechazada sin integrar; se corrigió a SHA completo.
- Railway Dev: ambiente `9e2891f0-7281-4872-a992-2c48866a782d`, servicio `buho-marc-web`, despliegue `8f697aad-bde7-4463-bf8b-e9a39b886c55`, **SUCCESS**, desde rama Dev y SHA exacto de integración. GitHub deployment `7047661304`. Compilación remota/TypeScript, migraciones existentes y arranque correctos. Sin migraciones nuevas ni cambios de variables.
- Salud HTTP 200: `ok=true`, base conectada y motor DeQuiénEs. `/api/demo` sin sesión 401; `/app` 307 a ingresar. No se iniciaron revisiones ni inferencias de QA.
- QA autenticada contra Dev con sesiones temporales de 20 minutos para usuarios existentes: admin Búho, miembro Búho y admin Daniel externo. No se modificaron cuentas, claves ni roles. Snapshot entrega domainsPreview únicamente al admin Búho. Navegador confirma miembro/externo sin menú/tabla/KPIs, acceso directo #domains devuelve resumen y ficha de miembro sin campo de dominio.
- Admin publicado: tabla inicial 4, alta de prueba opcionalmente asociada a una marca existente, desvinculación, Factibilidad Exacta, aviso revisado y KPIs 5/1, navegación y recarga restaurando cuatro ejemplos. Son cambios sólo de memoria. Cero errores de página y cero POST/PATCH/DELETE de esos flujos. Captura local de tabla, sin versionar datos de cartera.
- Acceso SSH temporal para crear/verificar/revocar sólo esas tres sesiones: tres retiradas, todas responden 401 posteriormente; clave temporal eliminada en Railway y archivos locales privados retirados. No se descargaron credenciales de la base ni se copió una cartera.
- Main confirmado en `0c43e2b51e9ef47641290f8a8e941cd498a7f078`; su despliegue no se modificó. No se elimina rama/copia aislada porque el usuario no pidió limpieza.
- El cierre documental viaja en una rama posterior basada en Dev integrado; no cambia código funcional probado. README y contrato funcional se actualizan al estado publicado.
