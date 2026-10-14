# Traspaso: evaluaciones de cruces por abogado

- Actualizado: 14/10/2026, America/Santiago.
- Estado: listo para revisión local; publicación Dev pendiente.
- Rama y base: `codex/admin-evaluaciones-abogados`; Dev `6a7e5776941f85de5ea1a7891ef9c2321726b25f`.
- PR y commit de entrega: pendientes.

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

## Pendientes y siguiente paso

Comprobar avances de Dev y publicar por PR adjunto. No reiniciar ni reemplazar contraseñas de usuarios. Registrar evidencia real de despliegue y compatibilidad.
