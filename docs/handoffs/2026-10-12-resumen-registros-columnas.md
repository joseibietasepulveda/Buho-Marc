# Traspaso: columnas del resumen de registros

- Actualizado: 2026-10-13, America/Santiago.
- Estado: integrado y publicado en Dev y Main/producción.
- Rama y base: `codex/resumen-registros-columnas`; Dev `07d5083920e71a243b503811ff783419d16fb302`.
- Entrega: `d3b5a56`; [PR 60 Dev](https://github.com/joseibietasepulveda/Buho-Marc/pull/60), [PR 61 Main](https://github.com/joseibietasepulveda/Buho-Marc/pull/61).

## Objetivo y alcance
Evitar que Solicitud, sus números, Expediente y Abrir se partan en la tabla Últimos movimientos de tus solicitudes. El botón debe permanecer dentro de la tarjeta. Continuar el flujo autorizado de correcciones en Dev y Main.

## Cambios y archivos relevantes
`app/app/design-refresh.css`, exclusivamente `.registration-recent-table`: distribución de columnas con ancho mínimo, etiquetas y números indivisibles, desplazamiento horizontal contenido y última columna fija al borde interior. Los textos extensos conservan ajuste en sus celdas.

## Decisiones y motivos
Usuario: no partir las palabras ni desbordar la caja. Agente: tabla con layout fijo y columna de expediente visible al desplazarse; no usar overflow visible ni reducir la letra. Sin cambios a datos, acciones o API.

## Coordinación e integración
Se conserva el clon aislado y el checkout original intacto. CSS limitado al resumen de registros; no cambia otras tablas. Sin migraciones ni dependencias.

## Verificación
- `npm run build -- --webpack`: compilación, TypeScript y 36 rutas aprobados. `git diff --check` aprobado. Sólo CSS y documentación; no se añaden pruebas que repitan reglas de estilo.
- `WATCH_QA_PORT=3477 WATCH_QA_KEEP=true node --import ./tests/ts-loader.mjs tests/watch-http.mjs`: prepara PostgreSQL y aplicación aislados con fuente simulada. Se usan las comprobaciones de autenticación/CSRF/permisos/cola de ese modo; KEEP omite casos, contadores de estados y clientes, por lo que no se declaran verificados aquí.
- `node outputs/registration-columns-ui.mjs`: API de registros interceptada con tres solicitudes de QA (títulos y titulares largos, número de hasta diez dígitos), sin escrituras de cartera. A 1440/1280/1024/820/390/320 px y tres posiciones de desplazamiento por tamaño: encabezados/números en una línea sin recorte; Abrir dentro de celda y tarjeta y texto completo; página sin desbordamiento; apertura del expediente correcto y cero errores de página.
- Capturas revisadas `outputs/registration-columns-1280.png` y `outputs/registration-columns-390.png`; resultados `outputs/registration-columns-qa.json`, ignorados. Se confirma columna fija y textos extensos contenidos. Sin consultas reales de fuente ni OpenRouter.
- Servidor y PostgreSQL locales detenidos tras QA.

## Pendientes y siguiente paso
Sin pendientes funcionales. Recargar la aplicación para cargar la hoja de estilos publicada. No repetir la QA sobre cartera real ni ejecutar búsquedas de fuente para este ajuste visual.

## Integración comprobada
- Dev: merge `aed6392ba5073eca7578eeae3cc30c16b937a61e`; Railway `0de9ad90-c0a2-4395-846b-512f720e351e`, SUCCESS. Salud pública HTTP 200, ok true y database connected.
- Main: merge `f90a66316e9c19335eb72952f5d325662c63a08e`; promoción conserva documentación exclusiva de Main (merge ensayado sin conflictos). `git diff origin/dev origin/main -- app db lib scripts tests` vacío: mismo código funcional probado.
- Producción: Railway `2d510103-d4ea-40df-a44e-da394ae20fd8`, SUCCESS para el merge de Main; salud pública HTTP 200, ok true y database connected. La actualización final de esta nota es sólo documental, sin cambiar el CSS verificado.
- La revisión visual y apertura del expediente se comprobaron en Chrome local con fixtures; en Railway se comprueba SHA y salud pública, sin modificar cartera ni iniciar consultas remotas.
