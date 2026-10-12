# Traspaso: espacio vacío al desplazar hacia arriba

- Actualizado: 2026-10-11 22:32, America/Santiago
- Estado: listo para revisión
- Rama y base: `codex/fix-scroll-superior`; `dev` en `9b99acb7212f1ce94635cd2e9c95a2547bba8c87`
- PR: pendiente (rama local, sin publicar). Commit de entrega: el que incorpora esta nota; consultar `git log -1 --format=%H -- docs/handoffs/2026-10-11-scroll-superior.md`.

## Objetivo y alcance
Corregir el espacio vacío que aparece sobre la cabecera de Mis marcas al desplazar hacia arriba. Preservar el desplazamiento del contenido y la navegación independiente.

## Cambios y archivos relevantes
- `app/app/design-refresh.css`: `.buho-app .buho-workspace` incorpora `overscroll-behavior-y:none`. La regla previa `overscroll-behavior:contain` de `buho-app.css` impedía encadenar el desplazamiento, pero permitía el rebote nativo al llegar al límite. El eje horizontal conserva su comportamiento.
- `docs/UX_IMPLEMENTACION_OCTUBRE_2026.md`: comportamiento vigente y enlace a esta nota, separado de las verificaciones históricas.

## Decisiones y motivos
- Usuario: trabajar en una rama y carpeta aisladas porque ejecutará otro agente.
- Agente: base limpia desde el remoto de `dev`. Los archivos de la carpeta original están marcados como `dataless` por iCloud; `git status` termina con señal 10 y las lecturas quedan bloqueadas. No se modificaron sus archivos.
- Diagnóstico: la captura del usuario es compatible con el rebote del contenedor central. Se confirmó en navegador local que la regla anterior computaba `contain`; el cambio computa `none`. [MDN: valores de overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior#values) documenta que `contain` permite el rebote y `none` lo impide. No se introducen manejadores de rueda ni bloqueos de teclado.

## Coordinación e integración
Worktree: `/Users/rosariovial/.codex/worktrees/scroll-superior/Buho-Marc`, asociado al clon `/Users/rosariovial/.codex/scroll-fix-source`. El creador administrado de Codex falló con `Git ref lookup failed` (`7836b943-f91f-4862-810b-c85ff7a551bc`); se utilizó un worktree Git desde el clon. La herramienta de adjuntar lo rechaza porque no está administrado. Sin cambios de API, datos, dependencias ni migraciones.

El único archivo de código compartido es `app/app/design-refresh.css`; afecta a todos los apartados que usan `.buho-workspace`. Mantener esta propiedad al integrar cambios visuales de otros agentes. No se modificaron medidas, zoom, padding ni reglas móviles. `git fetch origin dev` confirmó que la base remota seguía en `9b99acb` durante el cierre.

## Verificación
Ambiente: macOS, Node 24.14.0, Next 16.3.5, Chrome local con Playwright, PostgreSQL aislado de demostración. Sin consultas nuevas a INAPI ni llamadas OpenRouter.

- `npm ci --no-audit --no-fund`: aprobado, sin modificar el lockfile.
- `BUHO_LOCAL_PORT=3427 BUHO_LOCAL_DB_PORT=55447 BUHO_LOCAL_DATA_DIR=/Users/rosariovial/.codex/worktrees/scroll-superior/local-data npm run dev:local`: migrations y arranque aprobados; se preparó una cuenta QA únicamente en esa base. Servidor y base detenidos al terminar.
- `node outputs/scroll-superior/check.mjs`: aprobado con datos simulados, a 1440×1000, 820×1100 y 390×844. Rueda hacia abajo: `scrollTop=600`; regreso al inicio y ocho gestos adicionales hacia arriba: `scrollTop=0`, cabecera en la misma posición y documento exterior sin desplazamiento. Extremo inferior estable. Tabla desplazable horizontalmente en tablet/móvil (444/644 px); navegación Resumen → Mis marcas vuelve al inicio.
- Revisión de las tres capturas locales `outputs/scroll-superior/after-{1440,820,390}.png`: cabecera sin espacio agregado. Script, capturas y medidas (`results.json`) son artefactos locales ignorados por Git, disponibles en este worktree.
- Límite: la automatización con rueda no reproduce el gesto físico del trackpad ni la animación nativa de Safari. Se verificaron CSS computado, geometría y comportamiento en Chrome; el rebote original de la captura no se reprodujo como animación nativa.
- `NODE_OPTIONS=--dns-result-order=ipv4first npm run build -- --webpack`: segunda ejecución aprobada, con compilación, TypeScript, 36 páginas y empaquetado final. La primera ejecución compiló y pasó TypeScript, pero falló el empaquetado por `ENOSPC` (disco lleno). Se detuvo la demo y se retiró únicamente `.next-local` de este worktree antes de repetir.
- `git diff --check`: aprobado.

Para reproducir manualmente: iniciar demo con los puertos/directorio anteriores, ingresar con la cuenta local QA, posponer la bienvenida y abrir Mis marcas. Desplazar hacia abajo, regresar al inicio e insistir hacia arriba; comprobar que la cabecera no se separa del límite. Repetir al final, en 820 y 390 px y con desplazamiento horizontal de la tabla. No usar carteras alojadas ni iniciar revisiones de vigilancia para este ajuste.

## Pendientes y siguiente paso
Cambio local: pendiente de revisión, integración y publicación; no se autorizaron promoción a `main` ni producción. Para recuperar la rama desde otro checkout, ejecutar `git fetch /Users/rosariovial/.codex/scroll-fix-source codex/fix-scroll-superior` y revisar `FETCH_HEAD` antes de incorporarlo. No requiere otras ramas ni migraciones. Confirmar también el gesto físico del trackpad al revisar la entrega en el navegador del usuario.

Next generó `AGENTS.md` y `CLAUDE.md` al iniciar el servidor; se retiraron esos dos archivos temporales después de detenerlo, porque no pertenecen al ajuste. No confundirlos con las instrucciones del usuario que rigen este trabajo.
