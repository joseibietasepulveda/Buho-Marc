# Traspaso: espacio vacío al desplazar hacia arriba

- Actualizado: 2026-10-12, America/Santiago
- Estado: listo para revisión
- Rama y base: `codex/fix-scroll-superior`; base inicial `dev` en `9b99acb`; actualizada a `9d87694e58162c0b0481f49374ab44c43aae5bc2` mediante `14a0886`.
- PR hacia `dev`: [#26](https://github.com/joseibietasepulveda/Buho-Marc/pull/26). Arreglo funcional: `bc428b8`; compatibilidad verificada: `b1be4ad`. Estado y SHA de integración disponibles en ese PR.

## Objetivo y alcance
Corregir el espacio vacío que aparece sobre la cabecera de Mis marcas al desplazar hacia arriba. Preservar el desplazamiento del contenido y la navegación independiente.

## Cambios y archivos relevantes
- `app/app/design-refresh.css`: `.buho-app .buho-workspace` incorpora `overscroll-behavior-y:none`. La regla previa `overscroll-behavior:contain` de `buho-app.css` impedía encadenar el desplazamiento, pero permitía el rebote nativo al llegar al límite. El eje horizontal conserva su comportamiento.
- `docs/UX_IMPLEMENTACION_OCTUBRE_2026.md`: comportamiento vigente y enlace a esta nota, separado de las verificaciones históricas.

## Decisiones y motivos
- Usuario: trabajar en una rama y carpeta aisladas porque ejecutará otro agente.
- Usuario, 12/10: revisar compatibilidad de los dos cambios recientes e incorporar este arreglo. Se identificaron las entregas funcionales `426739c` (informes para cliente/estudio) y `af0af7c` (notificación el día de la actuación); sus cierres documentales también están en la base.
- Agente: base limpia desde el remoto de `dev`. Los archivos de la carpeta original están marcados como `dataless` por iCloud; `git status` termina con señal 10 y las lecturas quedan bloqueadas. No se modificaron sus archivos.
- Diagnóstico: la captura del usuario es compatible con el rebote del contenedor central. Se confirmó en navegador local que la regla anterior computaba `contain`; el cambio computa `none`. [MDN: valores de overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior#values) documenta que `contain` permite el rebote y `none` lo impide. No se introducen manejadores de rueda ni bloqueos de teclado.

## Coordinación e integración
Worktree: `/Users/rosariovial/.codex/worktrees/scroll-superior/Buho-Marc`, asociado al clon `/Users/rosariovial/.codex/scroll-fix-source`. El creador administrado de Codex falló con `Git ref lookup failed` (`7836b943-f91f-4862-810b-c85ff7a551bc`); se utilizó un worktree Git desde el clon. La herramienta de adjuntar lo rechaza porque no está administrado. Sin cambios de API, datos, dependencias ni migraciones.

El único archivo de código compartido del arreglo es `app/app/design-refresh.css`; afecta a todos los apartados que usan `.buho-workspace`. Mantener esta propiedad al integrar cambios visuales de otros agentes. No se modificaron medidas, zoom, padding ni reglas móviles. El 12/10 se incorporó `origin/dev` sin conflictos; la comparación con esa base contiene únicamente el CSS del arreglo y sus dos documentos.

### Compatibilidad revisada el 12/10
- Informes: `audience` afecta a la presentación de PDF/Word y no cambia selección, conclusión guardada ni evidencia original. Descargar para ambos destinatarios reutiliza las conclusiones de cada clase.
- Plazos: `notificationDateAssumed` se deriva de la actuación procedimental; una notificación acreditada conserva prioridad. No se escriben fechas asumidas al historial ni se alteran estados usados por factibilidad.
- No hay importaciones entre los escritores de factibilidad y `registration-procedure.ts`, cambios de contrato incompatibles ni migraciones entre ambas entregas. Se mantienen los dos comportamientos al actualizar la rama; el arreglo de desplazamiento es común a sus pantallas.

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
Incorporación a `dev` preparada en PR #26; consultar su estado antes de volver a aplicar el arreglo. No se autorizaron promoción a `main` ni producción. No requiere otras ramas ni migraciones. Confirmar también el gesto físico del trackpad al revisar la entrega en el navegador del usuario. El despliegue remoto no forma parte de la verificación local descrita aquí.

### Verificación conjunta del 12/10
- `node --import ./tests/ts-loader.mjs --test tests/feasibility-study.test.mjs tests/feasibility-conclusion.test.mjs tests/feasibility-report.test.mjs tests/similarity.test.mjs tests/notification-event-assumption.test.mjs tests/registration-procedure.test.mjs tests/registration-evidence.test.mjs tests/inapi-procedure.test.mjs tests/inapi-recovery.test.mjs tests/inapi-recovery-integration.test.mjs`: 88/88 aprobadas; incluye PostgreSQL aislado para recuperación, prioridad de fechas acreditadas, obligaciones concurrentes y ambos destinatarios de informes.
- `scripts/verify-feasibility-study.mjs`, con `BUHO_QA_ORIGIN=http://127.0.0.1:3427`, `BUHO_PLAYWRIGHT_MODULE` apuntando al runtime de Codex y `BUHO_BROWSER_EXECUTABLE` a Chrome: aprobado; dos clases, ocho descargas y dos destinatarios, reutilización de conclusiones y fallo visible. Fuente/modelo simulados en el navegador, sin llamadas reales.
- `node outputs/scroll-superior/check.mjs`: aprobado sobre el nuevo `dev` en escritorio, tablet y móvil; se repitieron topes superior/inferior, navegación y tabla horizontal.
- `NODE_OPTIONS=--dns-result-order=ipv4first npm run build -- --webpack`: aprobado en la combinación completa, incluido TypeScript y empaquetado final.
- `npx eslint app/app/feasibility-review.tsx app/app/registrations.tsx app/app/page.tsx app/app/registration-evidence-editor.tsx lib/registration-procedure.ts lib/feasibility-report-presentation.ts lib/feasibility-report.ts lib/feasibility-docx.ts`: aprobado, sin errores ni advertencias.
- `git diff --check`: aprobado. Logs ignorados en `outputs/scroll-superior/*-2026-10-12.*`; exportaciones de fixtures en `work/study-qa/`. No se modificó el checkout original ni bases alojadas. Servidor/base QA detenidos; se retiró el archivo de sesión local del verificador.

Next generó `AGENTS.md` y `CLAUDE.md` al iniciar el servidor; se retiraron esos dos archivos temporales después de detenerlo, porque no pertenecen al ajuste. No confundirlos con las instrucciones del usuario que rigen este trabajo.
