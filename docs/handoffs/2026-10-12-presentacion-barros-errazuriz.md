# Traspaso: preparación de presentación Barros & Errázuriz

- Actualizado: 2026-10-12, America/Santiago.
- Estado: listo para revisión e integración autorizada.
- Rama y base: `codex/presentacion-barros-errazuriz`; `origin/dev` `8ffd8b82594d657a81410ecf1307c60024cfe79f`.
- PR y commit de entrega: pendientes.

## Objetivo y alcance
Usuario autoriza ajustar densidad de Vigilancia, caché de navegación, detalles útiles de avisos, permisos exclusivos del administrador de Búho Marc y conclusión condicionada por la recomendación del abogado. Añadir a B&E BRANDON METRICS 1320072, Boretek 1490801 y BRUMA 1310436, comprobar cruces reales 1671049, 1670768 y 1674156. Verificar Dev y promover a Main. Petición adicional: resumen B&E con TV ELQUI y dos de las tres marcas nuevas, sustituyendo Velocitech y la figurativa en sus tres tarjetas. Se priorizan BRANDON METRICS y Boretek mediante el orden de destacadas.

## Cambios y archivos relevantes
En la base vigente ya están integradas la unificación de Antecedentes/Novedades, navegación local entre bandejas y detalles condicionales de notificaciones (PR 37/45). Conservar esas decisiones posteriores. Pendientes densidad, autorización por organización y rol, recomendación y operación puntual de cartera.

## Decisiones y motivos
Usuario: partir de Dev actual, probar y promover a Main. Agente: identificar Boretek por el número de solicitud de la captura; no inventar resultados, índices, fechas ni estados. Las pruebas de IA usarán proveedor simulado, sin llamadas reales a OpenRouter.

## Coordinación e integración
Git del checkout original termina con código 138 por archivos iCloud dataless. La creación administrada falló con «Git ref lookup failed». Se trabaja en clon aislado `/Users/rosariovial/.codex/buho-presentacion-recovery-20261012`, conservando checkout original. Dependencias enlazadas del checkout previo con mismo lockfile; disco limitado. B&E existe sólo en producción según entrega TV ELQUI: verificar antes de operar. No crear cuenta Dev ni copiar credenciales.

## Verificación
Leídos README, decisiones UX vigentes, consumo, despliegue, notas de bandejas/cajas/detalles/TV ELQUI y código actual. Comprobaciones de implementación pendientes.

## Pendientes y siguiente paso
Implementar, probar con datos aislados, comprobar evidencia real de los tres cruces y actualizar esta nota con integraciones/despliegues/resultados.

## Avance comprobado
- Capacidades internas denegadas por defecto; únicamente slug `estudio-ibieta-ip` con rol `admin` obtiene fuente/acerca/clave. API, snapshot y página usan la misma regla. Si una cuenta externa requiere renovación de clave, muestra contacto con administrador sin bucle de redirección; no elimina la obligación de actualizarla.
- Selector de recomendación invalida texto/conclusión previa. Prompt v9 recibe instrucción expresa, esquema limita decisión/recomendación y validador exige cierre coherente; modo automático conserva decisión independiente. Pruebas con proveedor simulado, ninguna inferencia real.
- Vigilancia: zoom local `.8` sólo escritorio, sin afectar Factibilidad ni móvil. Dev actual ya tiene ambas bandejas sobre un snapshot; UI confirmó cero consultas al alternarlas.
- 41 pruebas dirigidas y suite HTTP con PostgreSQL aislado aprobadas, incluidos administrador B&E/Daniel y miembro Búho sin capacidades. Una expectativa histórica de contador destacado falló (esperaba 0); corregida a contador unificado 3 ya vigente, sin cambio funcional. ESLint y build/TypeScript aprobados antes del ajuste adicional de página de clave y CLI; verificación final pendiente.
- QA navegador local a 1440/820/390, capturas en `outputs/`; cuatro elecciones manuales + automático, invalidación y descarga bloqueada mientras falta conclusión. Sin errores de página. Revisión React: cambios desde evento, epoch cancela respuestas antiguas, caché incluye decisión, controles nativos y sin nueva consulta al cambiar pestaña.
- Operación puntual B&E producción: tres marcas propias importadas con una llamada batch real a DeQuiénEs, registros vigentes verificados. Sin clientes inventados, sin cambiar claves y sin copiar decisiones de otras organizaciones. Auditoría `portfolio.be_presentation_2026_10_12`. Las tres vigilancias quedan activas; comprobación de sus resultados pendientes.

## Preparación de integración
- Build final `npm run build -- --webpack`, TypeScript y ESLint de todos los archivos modificados aprobados. `git diff --check` aprobado. 42 pruebas dirigidas (41 conjuntas más nueva regresión de orden del resumen) y suite HTTP aislada aprobadas. No se ejecutó inferencia real ni búsquedas para QA visual.
- Dev sigue en la base `8ffd8b8`; código funcional de Dev/Main idéntico antes de esta entrega. La unificación de bandejas y detalles útiles ya vigentes no se reimplementan.
- B&E ausente en Dev, confirmado por CLI sin escrituras. No se crea una cuenta ni se copian claves. B&E producción tiene las tres marcas propias añadidas; el supervisor habitual inició tres stocks reales de 50 resultados. BRANDON METRICS → Brandon 1671049 confirmado con índice original 0,7756; Boretek → B BORTEK INDUSTRIAL SOLUTIONS 1670768 con 0,4177. BRUMA aún en proceso al preparar esta integración.
- `scripts/provision-be-presentation.ts` es operación explícita con modo seco predeterminado, restringida por ambiente y slug; añade sólo las tres ausentes con evidencia pública verificada, auditoría y vigilancia activa. No modifica marcas existentes, clientes ni decisiones y no forma parte del arranque.
