# Traspaso: pago desde aceptación administrativa

- Actualizado: 2026-10-14 13:24, America/Santiago
- Estado: integrado y verificado en Dev y producción
- Rama y base: `codex/pago-aceptacion-administrativa`; `origin/dev` `56d7c7e57fbaf688feaffc9146fce1ea3fd3eb4d`.
- PR y commit de entrega: Dev [#84](https://github.com/joseibietasepulveda/Buho-Marc/pull/84), commit `0c48e662073f2d954d2d3c976ed1fe9ab992efa7`, integración `79cd21afbfb1fe43cb243521e633cf845f72e261`. Producción: promoción exclusiva de ese commit sobre `main` `0c43e2b51e9ef47641290f8a8e941cd498a7f078`; Dev y producción verificados. PR Main [#85](https://github.com/joseibietasepulveda/Buho-Marc/pull/85), integración `ea8fffe04e2e836018fce2e64acdea25a0f58a1e`.

## Objetivo y alcance

El usuario instruyó calcular 60 días hábiles desde la aceptación administrativa a registro, asumiendo notificación ese día; conservar ejecutoria como activador para aceptaciones con oposición, y actualizar todas las carteras. Es una convención de producto explícita, no una constancia ficticia de notificación o firmeza. Reemplaza para las aceptaciones administrativas la exigencia universal anterior de ejecutoria.

## Cambios y archivos relevantes

Implementado: identificación de aceptación administrativa en `lib/registration-proceedings.ts`; cálculo, explicación y presentación de progreso en `lib/registration-procedure.ts`; elegibilidad de recuperación en `lib/inapi-recovery.ts`; etiqueta neutral de aceptación en `lib/registration-data.ts`; explicación vigente en `app/app/page.tsx`; pruebas de regresión y documentación funcional. Sin cambios de esquema, API del proveedor, consultas de similitud ni llamadas a OpenRouter.

## Decisiones y motivos

- Usuario: nueva regla y aplicación a todas las cuentas reales.
- Agente: conservar los eventos, pruebas y estado original; derivar el pago en la presentación sin escribir ejecutorias/notificaciones inventadas. Verificar que pago, concesión, recursos y desenlaces posteriores mantengan su prioridad.
- La investigación previa comparó diez historiales públicos directamente contra DeQuiénEs; nueve aceptaciones administrativas no muestran una actuación separada de firmeza. Un fallo con oposición sí tiene certificación posterior. La muestra no establece un desfase jurídico universal.

## Coordinación e integración

Los cálculos son compartidos por Solicitudes, resumen, agendas y recuperación. La carpeta principal tiene referencias Git dañadas y Git termina con señal 138 al acceder a objetos; `create_worktree` de Codex falló al resolver la referencia. Se creó un clon limpio y un worktree separado bajo `/tmp/buho-regla-pago-20261014.FmbU9C/` sin modificar la carpeta principal ni ramas de otros chats. No reutilizar bases ni puertos locales.

`dev` contiene entregas adicionales no presentes en `main`. La aplicación a producción debe llevar únicamente este cambio, sin promover funcionalidades ajenas. La petición de actualizar todas las cuentas de producción se interpreta como autorización para publicar esta regla y recalcular sus vistas. Se verificará la entrega en Dev antes de producción. Antes de integrar se incorporó el avance de Dev (PR #83, documentación administrativa); no afectó código ni contratos de este cambio.

## Verificación

- Node 24.14.0, dependencias instaladas con `npm ci --no-audit --no-fund`. `node --import ./tests/ts-loader.mjs --test tests/administrative-payment.test.mjs tests/notification-event-assumption.test.mjs tests/registration-procedure.test.mjs tests/registration-evidence.test.mjs tests/inapi-procedure.test.mjs tests/inapi-recovery.test.mjs tests/legal-calendar.test.mjs tests/registration-renewal.test.mjs tests/inapi-recovery-integration.test.mjs`: 76 pruebas aprobadas, incluidas PostgreSQL local y fuente ficticia. Una expectativa anterior de ejecutoria en un caso administrativo falló al principio; se hizo explícita la oposición en ese fixture para conservar la prueba de constancia vinculada, y la nueva convención se prueba por separado.
- ESLint dirigido a los archivos editados y `git diff --check`: aprobados. `npm run build`: Next/TypeScript y generación aprobados tras los cambios finales.
- Lectura SQL `read only` de todas las carteras activas: producción 246 solicitudes propias y 670 fuentes vinculadas; Dev 128 solicitudes y 261 fuentes. Recálculo local sin permitir `fetch`, conservando objetos fuente y comprobando que concesión, pago acreditado y apelación no reabren el pago.
- Vista previa de producción: 16 pagos administrativos con fecha (14 completos y dos parciales); tres organizaciones afectadas, sin duplicar por miembros. No se reescribieron datos personales, historial, tareas, avisos o pruebas. Dev activa nueve pagos administrativos en la cartera correspondiente; sus dos cuentas comparten esa cartera.
- Se detectaron cuatro falsos positivos previos de oposición por mezclar la frase de ventana vencida con «solicitud presentada» en otro párrafo de una observación. Se separan títulos y referencias concretas de las observaciones. Esta función compartida afecta también detección de procedimiento contencioso, canal de evidencia y controles institucionales; sus pruebas se repitieron. No equivale a certificar completitud del historial.
- El cálculo es derivado y se consume al leer/ver las solicitudes: no requiere persistir fechas ficticias ni una migración de cartera. La verificación posterior debe confirmar el código publicado y recalcular todas las cuentas con la proyección de la API.

QA visual local completado con tres expedientes ficticios en puertos 3114/55714: aceptación administrativa del 2 de octubre vence 30 de diciembre, oposición sin ejecutoria no tiene fecha, oposición con ejecutoria del 8 de octubre vence 6 de enero. Tarjeta y detalle muestran el supuesto de notificación y su origen. Primer arranque sin semilla falló al provisionar el administrador; se preparó la semilla y cuenta exclusivamente local y se completó la prueba. Ninguna credencial o dato real se usó en esta prueba.

Compatibilidad con `main`: cherry-pick sin conflictos de este único cambio, 76/76 pruebas repetidas, build Next/TypeScript y ESLint dirigidos aprobados en la base estable. Sin promover el resto de Dev.

Dev publicado: Railway `b9c8c934-a880-4a28-8c19-ec1a510f9063`, SUCCESS y SHA exacto `79cd21afbfb1fe43cb243521e633cf845f72e261`. Salud 200/base conectada, solicitudes 401 sin sesión. Lectura completa posterior: 128/128 proyecciones coinciden con la regla, nueve fechas administrativas nuevas, 261/261 fuentes y todos los datos de solicitudes/fuentes sin cambios respecto de la lectura anterior. La comparación normaliza JSON y TZ=UTC del servidor.

Producción publicada: Railway `1fc3a8d4-3eee-4eb8-abfe-396c6d9e522b`, SUCCESS y SHA exacto `ea8fffe04e2e836018fce2e64acdea25a0f58a1e`. Salud de `rcirculo.com` 200/base conectada y solicitudes 401 sin sesión. Lectura posterior completa: 246/246 proyecciones coinciden con la regla publicada; 16 pagos administrativos con fecha (14 completos y dos parciales), tres organizaciones afectadas. Datos de las 246 solicitudes y de las 670 fuentes vinculadas, incluidos eventos y pruebas, iguales a la lectura previa. Sin escrituras de cartera, tareas o notificaciones y sin llamadas nuevas a INAPI, DeQuiénEs u OpenRouter para este recálculo. El acceso SSH temporal fue revocado al completar la comprobación. Los archivos de consulta son privados y temporales; no se incorporan al repositorio.

Este cierre solo actualiza documentación; no cambia el código que produjo esos resultados.

## Pendientes y siguiente paso

No quedan pendientes de esta regla ni migraciones. Para reproducir el cómputo, ejecutar las pruebas registradas arriba; el calendario sigue limitado a 2023–2027. La comprobación autenticada de interfaz fue local con fixtures; en ambientes reales se comprobó el código publicado, salud, protección de API y la proyección completa de cada cartera mediante lectura SQL. No se infiere una notificación, ejecutoria, ausencia universal de oposición o completitud del historial.

Fuera de alcance: reparar el Git de la carpeta principal y el parser de acceso público INAPI detectado durante la investigación previa. Su HTML entrega contexto en `setHash(...)` y los inputs iniciales carecen de `value`; esa limitación no se corrigió en este cambio. La regla opera sobre antecedentes ya guardados y no depende de una extracción nueva. Los worktrees limpios permanecen disponibles para continuar sin tocar los cambios de otros chats.
