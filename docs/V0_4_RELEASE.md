# v0.4 — Registros, agenda y trabajo del abogado

Entrega del 10 de septiembre de 2026, con publicación en **Dev** autorizada expresamente por el usuario. Versión visible v0.4; paquete 0.4.0. No incluye promoción a producción.

Antes de esta ronda, `main` y `dev` se sincronizaron en `c5a6be2` (confirmado también en el remoto). v0.4 se entrega sobre `dev`, conservando `main` y producción en esa base. El despliegue de Dev se comprueba en Railway y mediante `/api/health`; la copia local conserva su base independiente.

## Decisiones vigentes

Estas decisiones incorporan la reunión del 8 de septiembre, las precisiones posteriores del usuario y la referencia visual de INAPI. Reemplazan las restricciones de interfaz de las rondas anteriores cuando exista contradicción.

1. **Terminología:** “Resumen de registros” y “Solicitudes de registro”. Se mantiene “Marcas registradas”.
2. **Solicitudes:** lista predeterminada, tarjetas y calendario. La lista reúne nombre, logo, titular, solicitud, clases, estado procesal, último hito relevante y próxima gestión. “Fin de plazo” no sustituye el estado procesal.
3. **Agenda compartida:** mes, semana y próxima semana; varias entradas legibles en un mismo día; información al pasar el mouse y apertura mediante clic o teclado. Tres colores de categoría: tareas (violeta), INAPI (azul), Diario Oficial (ámbar). El rojo añade una señal de urgencia, no una cuarta categoría.
4. **Tareas:** texto libre, fecha opcional, responsable del equipo, autoasignación, estados Pendiente/Completado/No aplica, edición y eliminación confirmada. Se crean desde el calendario o la ficha, vinculadas a un caso o solicitud. Una fecha de tarea es interna y nunca cambia un plazo legal. Las tareas sin fecha aparecen en la lista inferior. La lista comienza en Tareas y permite pasar a INAPI o Diario Oficial.
5. **Notificaciones:** exactamente Prioritarias y Todas, sin configuraciones por usuario. Prioritarias es la entrada predeterminada; Todas conserva los avisos secundarios. Cada aviso tiene resumen y detalles desplegables. “Marcar como revisada” no significa enviar un correo.
6. **Hitos relevantes de INAPI:** presentación de solicitud; aceptación a trámite; pago de publicación y publicación efectiva en Diario Oficial; observaciones y oposiciones; cierre de plazos; aceptación a registro; pago final y constatación de pago; concesión; título de marca/certificado emitido. Concesión y emisión del título son hitos distintos. Cambios administrativos de titular o representante permanecen en Todas.
7. **Alertas globales:** barra visible en todos los módulos con tareas y plazos vencidos o próximos (14 días corridos de anticipación para el aviso, sin modificar el cálculo legal). Al abrirla se accede al expediente original. Las fechas desconocidas no se inventan; un caso sin gestión identificada no se rotula como plazo fatal.
8. **Factibilidad:** nombre, imagen o descripción; Búsqueda aproximada seleccionada inicialmente y logos ampliados. El análisis y sus porcentajes siguen siendo una demostración, no resultados derivados de la consulta ni una conclusión jurídica.
9. **Encontrar y agregar marcas:** búsqueda exacta por cualquier campo disponible, normalizando mayúsculas, acentos y puntuación de RUT. No busca fragmentos. Alta con criterios y parámetros encontrados a la izquierda y selección de resultados a la derecha. El RUT es el del titular/solicitante disponible en la fuente, no el usuario que cargó la marca en la plataforma.
10. **Correo al cliente:** asunto copiable y HTML con tabla comparativa de dos columnas (nombre, logo disponible y clases Niza), recomendación explícita “Se recomienda presentar oposición” y firma del usuario de la sesión de demostración. Copia con formato, alternativa de texto y descarga HTML. No se envía correo. El PDF técnico sigue siendo interno y de demostración.

## Límites y seguridad del dato

- La API real permite importar por número de solicitud. La consulta por otros atributos usa un catálogo ficticio detrás de `NEXT_PUBLIC_MOCK_ATTRIBUTE_SEARCH`; definirlo como `false` desactiva esa consulta mock. Es una variable pública evaluada al compilar, no un proveedor externo de flags.
- Ejemplos exactos de la consulta mock: nombre **ACME ANDES**, registro **1560998**, solicitud **1700998**, RUT **77.888.410-5**. El RUT devuelve dos ejemplos. En proveedor real, los resultados simulados no se incorporan a la cartera real.
- No se conectó ningún motor fonético, gráfico, semántico ni servicio de envío de correo. La búsqueda aproximada predeterminada es el parámetro preparado para ese motor.
- Los logos ausentes se identifican como ausentes; no se atribuye a una marca el logo de otra. Al copiar HTML, las imágenes dependen de URLs accesibles para el destinatario. Una dirección localhost sirve sólo para revisar la demo, no para enviar a clientes.
- Los 22 ejemplos procesales permanecen separados de la cartera y no admiten tareas persistentes.
- Se conserva la lógica procesal documentada en [REGISTRATION_PROCESS_REVIEW.md](REGISTRATION_PROCESS_REVIEW.md). No se calcula una fecha a partir del texto genérico “Fin de plazo”, ni se presume emisión del título por una concesión.
- La firma usa el usuario que entrega la sesión actual de la app; todavía no existe autenticación real.

## Persistencia e integración

- `case_tasks`: reutiliza `due_at` y `assignee_id`; la interfaz intercambia fechas civiles YYYY-MM-DD.
- `registration_tasks`: nueva tabla de la migración `0003_huge_blazing_skull.sql`, con organización, solicitud, título, estado, fecha y responsable.
- `POST /api/demo` → `saveCaseTask`: guarda tareas de casos.
- `POST /api/tasks`: guarda tareas de solicitudes y elimina tareas de ambos módulos. Comprueba origen, organización, pertenencia del responsable y del identificador de tarea.
- `GET /api/registrations`: devuelve solicitudes y tareas; convierte DATE a texto ISO en SQL para evitar cambios por zona horaria.
- El resumen, la lista y el calendario consumen los mismos datos de solicitudes. Las mutaciones refrescan los datos; la consulta se actualiza también cada 30 segundos.

## Próximas versiones — pendientes concretos

**Mantenimiento de seguridad prioritario, antes de promover a producción:** la auditoría de dependencias del 10 de septiembre (`npm audit --omit=dev`) informa cinco paquetes afectados: uno crítico, tres altos y uno moderado. Next.js 16.2.6 ya estaba presente en la base `c5a6be2`; v0.4 no actualiza esa dependencia. Revisar los avisos, actualizar Next.js y sus dependencias afectadas a versiones corregidas y repetir compilación, pruebas y verificación en Dev. La clasificación de la auditoría no acredita por sí sola explotabilidad en esta aplicación. Este trabajo queda separado de la entrega funcional y no debe resolverse con una actualización forzada sin pruebas.

1. **Resend para el abogado:** correos previos al vencimiento de tareas y plazos; correo específico cuando se emita el título/certificado; incluir fecha, responsable y enlace. Cancelar o reprogramar cuando cambie la fecha, termine una tarea o concluya un caso. Evitar duplicados y registrar entrega, fallos y reintentos.
2. **TPI/TDPI:** detectar el ingreso de apelaciones al tribunal, no sólo su aparición en tabla. Incorporar aviso de comparecencia/solicitud de alegatos; validar con el abogado la regla, vigencia y cómputo del plazo de cinco días mencionado antes de automatizarlo.
3. **Motor de búsquedas fonéticas:** detectar términos o segmentos relevantes dentro de marcas largas (no “destacar” como función cosmética). Validar también marcas muy cortas y de dos letras.
4. **Encontrar cualquier marca para seguirla:** conectar todos los atributos a la fuente real; búsqueda aproximada por nombre, errores tipográficos y variantes fonéticas, con orden por relevancia y explicación; autocompletar nombres y titulares; combinar campos/clases; recuperar todas las marcas de un RUT con paginación, multiselección y control de duplicados por solicitud/registro; búsqueda por imagen/descripción e historial de filtros.
5. **Patentes:** vigilancia de patentes y gestión internacional PCT por jurisdicción, anualidades y corresponsales. No se incorpora a los filtros activos de v0.4.
6. **Casos/Trello:** comentarios, documentos, checklists y colaboración adicionales sobre las tareas y calendarios ya implementados.
7. **Motores reales y operación:** integrar motores visual/semántico, calibrar factibilidad, generar un PDF técnico específico por vigilancia y guardar archivos; carga Excel y validación Niza/Madrid; autenticación, permisos y calendario legal plurianual.

La misma selección está visible en “Acerca de esta versión”, desde `lib/release-notes.ts`.

## Copia local

`npm run dev:local` y `ABRIR BUHO MARC.command` preparan PostgreSQL local con `embedded-postgres` (dependencia sólo de desarrollo). Los datos permanecen en `.buho-local/postgres`, ignorados por Git y Railway. Los servicios escuchan sólo en 127.0.0.1. Se fuerza el proveedor simulado y se desactiva la sincronización automática: este modo nunca migra ni modifica la base publicada. `npm run dev` conserva el flujo anterior para una base configurada.

## Verificación reproducible

Usar exclusivamente una base local desechable con `SOURCE_PROVIDER=simulated` y el programador de sincronización desactivado.

```bash
npm ci
npm run db:migrate
npm run build
node --import ./tests/ts-loader.mjs --test tests/*.test.mjs
```

Para comprobar fechas, responsables, edición, aislamiento y eliminación a través de la API local, iniciar la app y ejecutar:

```bash
TASK_TEST_BASE_URL=http://localhost:3000 node --test tests/task-api.test.mjs
```

La integración de sincronización se habilita por separado con `SOURCE_TEST_DATABASE_URL`, siempre en una base local de prueba.

## Verificación realizada — 10 de septiembre

- Compilación de producción y comprobación TypeScript aprobadas en la carpeta local definitiva.
- 71 pruebas aprobadas con la prueba HTTP de tareas habilitada; la prueba de sincronización PostgreSQL, ejecutada por separado en una base desechable, también aprobada.
- Verificación visual de calendario semanal, asignación y edición de fecha, lista de solicitudes, notificaciones desplegables, alta por RUT, control de duplicados y copia HTML con tabla/firma.
- Inicio local nuevo y reinicio con la misma base persistente comprobados. La copia previa se conserva completa en la carpeta hermana `Monitoreador Logos-respaldo-2026-09-10`; se mantuvieron sus archivos auxiliares y su ajuste particular de TypeScript.
