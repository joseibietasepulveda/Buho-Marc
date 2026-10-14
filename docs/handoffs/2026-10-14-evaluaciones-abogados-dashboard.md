# Traspaso: evaluaciones de cruces por abogado

- Actualizado: 14/10/2026, 17:27, America/Santiago.
- Estado: integrado y verificado en Dev.
- Rama y base: `codex/admin-evaluaciones-abogados`; Dev `6a7e5776941f85de5ea1a7891ef9c2321726b25f`.
- PR: [#88](https://github.com/joseibietasepulveda/Buho-Marc/pull/88); entrega `43655fea3cdd8d3968944ef28d3d4596deb47e1a`; integración Dev `035d6b8cbef5bf5324a847c52556467499d393c5`.

## Objetivo y alcance

Usuario: incorporar 👍/👎 al dashboard por abogado, distinguir cruces únicos y cantidad de evaluaciones, incluir cambios de opinión y comentarios, ver todas las evaluaciones individualmente y publicar en Dev. Conservar dashboard y regla de pago administrativo ya integrados. No producción ni consultas OpenRouter.

## Decisiones y motivos

- Fuentes durables existentes: `match_reviews` para decisiones formales, `audit_events`/`watch.feedback` para historial de pulgares y comentarios; `watch_feedback` únicamente como estado parcial cuando no existe bitácora. No duplicar estado actual e historial.
- Evaluaciones: decisiones guardadas, incluidas nuevas valoraciones y reconfirmaciones. Edición de comentario sin cambiar el voto se registra aparte, sin inflar evaluaciones. Cruces únicos: cruces con valoración concluyente por abogado durante el período; un cruce evaluado por dos abogados cuenta una vez en el total global y una vez para cada abogado.
- Cambio de opinión: inversión positiva/negativa respecto de la valoración concluyente anterior del mismo abogado y cruce, incluidos cambios entre canales. Pasar de seguimiento a caso no es una inversión de opinión. Comentarios no cambian el voto por sí solos.
- Historial fuera del período aporta contexto para detectar cambios, pero no aumenta los conteos del período. Registros sin autor o fechas exactas permanecen señalados; no reconstruir hechos perdidos.
- Vista administrativa paginada y filtrada: comentarios autorizados para administrador interno; esta lectura no los envía a telemetría/PostHog/proveedores. El envío existente de valoraciones a DeQuiénEs no cambia. Lecturas en conexión analítica existente; no consultas extra en el guardado del abogado.

## Cambios y coordinación

Implementados: `db/admin-evaluations.ts` normaliza fuentes/fechas/cambios, `lib/admin-evaluations.ts` contrato, `GET /api/admin/evaluations` protegido, `evaluations.tsx` con filtros/paginación/corte/CSV y ruta independiente `/app/admin/evaluaciones`. Agregación `db/admin-analytics.ts`, `AnalyticsUserRow.reviews` y campos nuevos, Actividad/Cartera/CSV actualizados. Caché versionada `v2-evaluations`; nuevas lecturas no consumen reportes viejos. Relevancia/primera revisión/costo por alerta usan pulgares bajo la prioridad formal existente. Sin modificación de las reglas legales, credenciales, fuentes o esquema de negocio.

## Verificación

Paquete final **50/50 aprobado**, con PostgreSQL descartable y sin proveedores: conteos por autor/cruce, comentarios sin nueva decisión, inversiones entre canales, contexto anterior al período, historial parcial, 520 registros sin límite de 500, paginación/corte, permisos 401/403 y filtros; regresión de analítica/captura, correo semanal y pago administrativo.

Comando reproducible:
```sh
node --import ./tests/ts-loader.mjs --test tests/admin-evaluations.test.mjs tests/admin-analytics*.mjs tests/admin-dashboard-ui.test.mjs tests/analytics-capture*.mjs tests/watch-digest*.mjs tests/administrative-payment.test.mjs
```
TypeScript (`tsc --noEmit`) y ESLint dirigido a los archivos TypeScript/JS modificados/nuevos aprobados. Revisión React aplicada. QA de navegador con Next/API/PostgreSQL local en puertos propios 3449/55473: **9 comprobaciones, cero errores JS**, filtros/estudio, paginación, cambios, ruta independiente, búsqueda/historial, pulgares, escape de texto y fórmulas CSV, móvil 390 px sin desborde de página. Capturas escritorio/móvil inspeccionadas; tablas conservan desplazamiento horizontal en móvil. Evidencia local ignorada: `outputs/admin-evaluaciones/qa-result.json` y capturas. Servidor y base descartables cerrados.

Las primeras corridas del harness visual fallaron por esperar solo el estudio interno en un alcance global y por selectores de etiqueta; se corrigieron las expectativas/selectores, no se ocultaron fallos de aplicación. Compilación final `npm run build -- --webpack` aprobada (46 páginas; API y ruta nuevas incluidas). Solo para esta compilación local se desactivaron la caché webpack y la generación automática de instrucciones Next mediante configuración temporal, restaurada antes del commit. No se efectuaron consultas OpenRouter, INAPI ni DeQuiénEs, ni se enviaron correos.

## Publicación y verificación en Dev

- Railway `1d3307d0-c5f3-478a-9b5f-134414e02303`, **SUCCESS**, ambiente Dev `9e2891f0-7281-4872-a992-2c48866a782d`, rama `dev` y SHA exacto `035d6b8` comprobados. Conserva por ascendencia Dev `6a7e577` (dashboard y pago administrativo); no promoción a producción.
- Lectura nativa sobre la base Dev con validación del ambiente/SHA: período 15/09–14/10, **42 evaluaciones, 33 cruces únicos, 43 registros, 6 👍, 4 👎, 32 formales, 2 cambios de opinión, 1 edición solo de comentario**. Historial completo: **55 registros**, 40 en primera página y 2 páginas. Nueve métricas nuevas y campos por usuario presentes. Son cifras al corte, no datos de prueba insertados.
- Preparación/lectura del resumen y detalle completadas en 1133 ms en proceso de verificación nativo; no representa latencia de red de un usuario. Ledgers antes/después iguales (60 llamadas vigilancia, 17 conclusiones factibilidad, 136 registros de telemetría API); `fetch` bloqueado en el proceso de comprobación. No nuevas llamadas a fuentes/modelos, correos ni votos.
- Salud HTTP 200/base conectada, login administrativo 200; vista independiente redirige a login sin sesión y API devuelve 401. Permisos autenticados de administrador interno/miembro/administrador externo y recorrido completo verificados localmente con fixtures. No se restableció ni reprovisionó ninguna contraseña en Dev.
- README y documentación funcional actualizados. El cierre posterior solo registra esta evidencia. Acceso SSH temporal de esta comprobación retirado al finalizar.

## Pendientes y siguiente paso

Abrir `/app/admin/evaluaciones` con la cuenta administrativa existente. La vista muestra la base del ambiente consultado; no importa la base HTML de 19.630 cruces ni recupera estados históricos que no fueron guardados. La descarga de detalle es por página. Conservar esta distinción si se añade exportación completa o se promueve a producción; dicha promoción requiere autorización explícita.
