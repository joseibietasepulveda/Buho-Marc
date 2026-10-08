# Implementación de la revisión visual de octubre

Actualización del 6 de octubre: [resúmenes, selectores y respuestas inmediatas](UX_RESPUESTA_INMEDIATA_2026-10-06.md), según los pedidos posteriores del usuario. Sustituye las columnas de cliente, la presentación de atención y el editor de respaldo indicados en versiones anteriores.

Estado: implementación comprobada localmente y **publicada únicamente en Dev el 5 de octubre de 2026**. Commit funcional `865f535`, publicado junto con documentación en `d6fb818`; despliegue `3857245e-4072-4785-b9f0-698bb3c8cd90`, estado `SUCCESS`. El [registro operativo](RAILWAY_DEPLOYMENT.md) contiene comprobaciones y límites. Producción conserva su entrega anterior.

## Alcance aprobado

Referencia: reconstrucciones en `output/auditoria-ui-ux-2026-10-04/propuestas/` y objetivo adjunto del 4 de octubre. Se mantienen los datos, permisos y comportamiento real del producto.

- [x] Base visual común: títulos de 31 px, Arial, paneles blancos, fondo lavanda gris y navegación compacta; flechas de select con margen y singular/plural.
- [x] Resumen de vigilancia: composición aprobada; «Tareas - Agenda próxima».
- [x] Mis marcas: Agregar marcas / Carga desde Excel arriba, solicitud / imagen / nombre como primeras columnas; sin paneles de incorporación inferiores.
- [x] Excel: .xls, .xlsx y CSV, guía de una hoja y columna; encabezado libre opcional identificado por contenido numérico incluso cuando sea texto.
- [x] Vigilancia: filtros aprobados con tarjetas actuales; Niza en marca propia; comparación compacta; valoraciones persistentes y envío al proveedor con explicación si admite texto.
- [x] Casos: tablero aprobado, modo a la derecha de pestañas; conservar formatos de lista y calendario.
- [x] Tareas: lista aprobada, completar y cambiar prioridad desde la lista; eliminación derecha.
- [x] Resumen de registros: tabla ampliada con imagen y marca; fecha descriptiva.
- [x] Factibilidad: Buscar / Revisar resultados / Preparar informe; radios de coincidencia; Niza conserva descripciones; agrupación sin recuadro centrada con el select; estudio e imagen a la derecha.
- [x] Factibilidad: conservar búsqueda ejecutada al editar criterios; selección explícita y revisión antes de exportar; validar PDF y Word existentes.
- [x] Solicitudes: conservar tarjetas, calendario y listas; retirar panel de ejemplos y hacer acceso discreto solo interno.
- [x] Notificaciones: lista y lector lateral, títulos y fechas más grandes; revisar prioritarias conserva historial.
- [x] Clientes: tabla nombre/RUT/contacto/correo/marcas; ficha editable, cartera con solicitud/imagen/nombre/estado; informes Excel/Word/PDF.
- [x] Usuarios: tabla nombre/correo/rol real/incorporación, búsqueda, organización real; alta según permisos existentes.
- [x] Bitácora: filtros, tabla cronológica, detalle y vínculos al expediente; antes/después solo cuando existe registro; solo lectura.
- [x] Comparador HTML de secciones rechazadas total/parcialmente: Mis marcas, Vigilancia, Casos, Registros, Factibilidad y Solicitudes.
- [x] Evidencia visual por sección y controles abiertos, comparación con referencia a igual tamaño, `design-qa.md` y documentación actualizada.

## Decisiones y fuentes

El 4 de octubre se aprobó agregar Clientes, Usuarios y Bitácora con el alcance descrito. La velocidad 1,5 elegida en la app permanece bajo control de la app; no hay herramienta para cambiarla desde el agente.

La documentación de [DeQuiénEs](https://dequienes.cl/inapi/docs) confirma `search_id`, feedback con `judge`, `application_id`, `grade`, `uncertainty` y `rationale`, y `name_match` para el canal de denominación. Se comprobaron persistencia, envío y recuperación; no se muestra confirmación remota cuando solo se ha guardado localmente.

Para Excel antiguo se incorpora el lector oficial [SheetJS 0.20.3](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/). Se mantienen límites de archivo y de filas y la revisión previa de candidatos.

## Entrega visual y evidencia

El [comparador e informe UI/UX](../output/implementacion-ux-2026-10-04/comparador-ui-ux.html) permite alternar propuesta original, implementación ajustada y pantalla anterior en las seis decisiones principales, ampliar imágenes y recorrer los tres pasos de factibilidad. También incluye Resumen, Tareas, Notificaciones, Clientes, Usuarios y Bitácora. Su [guía](../output/implementacion-ux-2026-10-04/README.md) enlaza capturas, registros y exportaciones. La auditoría original de 92 páginas conserva su alcance histórico.

La [QA visual](../design-qa.md) registra hallazgos iniciales, correcciones y evidencia posterior. Se revisaron once comparaciones de fuente/captura juntas a 1280 × 720, tres recortes de controles y las nueve primeras secciones a 390 × 844. Los datos de maquetas y piloto son ilustrativos; no se retocaron las capturas para hacer coincidir etapas/cantidades.

## Excel: cómo debe venir

La opción Carga desde Excel abre la guía antes de pedir el archivo. El formato más fácil es **una hoja y una columna con un número de solicitud de INAPI por fila**. El nombre de la hoja puede ser cualquiera, no necesita «marcas». Puede comenzar con números o un título libre como «Mis solicitudes»; no necesita `numero_solicitud`. Los números guardados como texto se reconocen por su contenido. Usar solicitud, que puede ser distinta del número de registro.

Formatos **.xls antiguo, .xlsx o .csv**, hasta 2 MB y 2.000 filas. Fórmulas y errores de celda se rechazan; conviene usar valores simples, sin bloques o títulos adicionales. .xls exige BIFF/OLE real, no HTML renombrado. El lector conserva límites de ZIP descomprimido, entradas y filas/columnas. La revisión de candidatos y confirmación de cliente/rol sigue obligatoria y los duplicados se reúnen antes de incorporar.

La carga asistida con varias columnas conserva `numero_solicitud`, `rut`, `razon_social`, `representante`, `rut_representante`, `rol`, `cliente` y `marca`. El título libre corresponde al formato simple de una columna; el asistido utiliza los alias reconocidos. Rol admite titular, representante o ambos. Agregar marcas también permite descubrir una cartera sin Excel.

## Factibilidad: búsqueda e informe

1. **Buscar:** nombre/imagen, seis modos visibles, Niza por número/significado, coberturas, estados, índice y criterios adicionales. Estudio arriba del logo de la marca a la derecha. Agrupación inicial activa, sin tarjeta y centrada junto al select. Se usa `visual_model: base`; no hay selector alternativo.
2. **Revisar resultados:** contexto de la búsqueda ejecutada, grupos del servidor desplegables, búsqueda/paginación dentro del lote, comparación y selección explícita. Editar criterios no reetiqueta los resultados anteriores; un fallo conserva su identidad.
3. **Preparar informe:** cliente, autor, recomendación/conclusión, vista previa de contenido, PDF/Word y confirmación de revisión. Un cambio relevante invalida la revisión previa; siguen funcionando los generadores institucionales existentes.

Contiene, palabra completa, prefijo y sufijo se transmiten como `name_match` al canal de denominación. Similar conserva la semejanza. Exacto utiliza contiene remotamente y filtra coincidencias exactas dentro del lote recuperado: no garantiza exhaustividad de toda la base. Estados e índice mínimo se aplican al lote de hasta 100. Otros canales pueden aportar semejanza fonética, visual o por cobertura. El índice no expresa probabilidad jurídica.

Se descargaron PDF y Word desde la interfaz con MISTRAL y solicitudes 1800000/1800001 seleccionadas; misma consulta/conclusión, sin la tercera solicitud ni el borrador NOVA. Cada documento tuvo dos páginas. Se renderizaron y revisaron **las cuatro páginas individualmente**, sin cortes ni superposición. Archivos y renders en `output/implementacion-ux-2026-10-04/informes/`: son documentos de prueba.

## Valoraciones de vigilancia

`POST /api/watch/feedback` acepta ID del hallazgo, voto y motivo. Organización, actor, solicitudes propia/ofrecida e índice se derivan de sesión/evidencia del servidor. `0013_watch_feedback.sql` crea la tabla, identidad única por organización/hallazgo/usuario y estado de entrega. La mutación queda auditada.

La documentación admite `rationale`, por lo que se ofrece Explícanos por qué. Se envía únicamente con `search_id` relacionado y se confirma solo con ACK concordante en búsqueda, solicitud y grado. Ante fallo, se conserva el voto local y reintento duradero. Versión y reclamación temporal impiden confirmar una edición nueva con una respuesta antigua. El worker procesa pendientes; sin búsqueda concordante, espera evidencia posterior. Votar no activa seguimiento ni crea un caso.

## Clientes, Usuarios y Bitácora

Clientes ofrece ficha con teléfono, cartera solicitud/imagen/nombre/estado e informes con campos guardados elegidos: Excel inicial, Word o PDF. La importación de duplicados conserva un cliente ya asignado. Usuarios presenta búsqueda, organización, nombre/correo/rol/incorporación y alta según administrador/miembro existentes; no inventa desactivación ni permisos nuevos. `GET /api/audit` consulta el historial completo del tenant con texto/actor/acción/fechas y páginas de 25. Antes/después aparece solo con evidencia registrada; referencias conocidas abren expediente/cliente. No permite editar ni borrar movimientos.

## Comprobaciones y operación

- Compilación/TypeScript y ESLint de 37 archivos aprobados; 39 pruebas dirigidas y cinco comprobaciones estructurales aprobadas.
- Piloto por rutas reales: prioridades/tareas persistentes, representante/paginación, cliente/rol, incorporación/deduplicación, conservación de asignaciones, informes y notificaciones; aislamiento por organización.
- Segundo recorrido: feedback confiable, ACK, caída/reintento, auditoría completa/filtrada y carga multipart .xls con hoja/encabezado libres, números como texto y duplicado.
- Comparador probado: versiones, imágenes ampliadas y navegación; selección/revisión y PDF/Word reales desde la interfaz.
- Cierre exterior/Escape, controles con margen, X centradas y textos singular/plural; formatos originales de Casos Lista/Calendario y Solicitudes conservados.

La base y cuentas del piloto son descartables. La QA local no hizo llamadas nuevas con credenciales reales ni acciones en carteras alojadas. No se valida exhaustividad/calibración del motor, carga a escala, análisis jurídico ni cumplimiento integral de accesibilidad.

La publicación del 5 de octubre confirmó compilación/TypeScript, migraciones y arranque en Railway Dev; salud 200 con base conectada y motor DeQuiénEs; 401 sin sesión en auditoría, feedback y perfil del estudio; y coincidencia del recurso visual publicado con el archivo revisado. La migración 0013 está incluida en la entrega. La sesión de Chrome disponible abrió el ingreso: no se repitieron los flujos autenticados sobre carteras reales ni se dispararon búsquedas de INAPI para comprobar esta publicación. La evidencia está en `output/deploy-dev-2026-10-05/`. El respaldo previo fue una copia lógica puntual de Dev, no una prueba de restauración ni protección permanente de producción.
