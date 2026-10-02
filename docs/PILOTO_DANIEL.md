# Piloto Daniel Morales · acceso y operación

## Acceso

`/app` requiere sesión. La cuenta `daniel_morales` tiene organización independiente y rol administrador. `DANIEL_INITIAL_PASSWORD` configura la clave inicial; se almacena como hash scrypt con sal aleatoria y debe reemplazarse en el primer ingreso. La provisión es idempotente: reinicios y despliegues conservan la clave vigente.

Sesiones de 12 horas, cookies HttpOnly/SameSite y Secure en producción, revocación al salir y revocación de otras sesiones al cambiar la clave. Se limitan los intentos de acceso y cambio de clave. Cada operación obtiene organización y autor desde la sesión; los cambios validan el origen. La revisión programada usa una credencial interna y recorre cada organización por separado.

El espacio nuevo comienza sin marcas, solicitudes, vigilancias, casos, avisos ni clientes ficticios. La cartera autenticada no se recupera ni guarda en el antiguo almacenamiento del navegador. Los datos de demostración permanecen en su organización original.

El espacio anterior tiene acceso con `Buho_Marc` (el ingreso no distingue mayúsculas en el usuario). `BUHO_INITIAL_PASSWORD` habilita una sola vez las credenciales del administrador existente de `estudio-ibieta-ip`, sin cambiar su identidad, cartera ni asignaciones. La contraseña distingue mayúsculas y debe cambiarse al primer ingreso. La provisión rechaza conflictos de usuario o vínculos a otras organizaciones; nunca reemplaza credenciales existentes. Tras verificar el acceso en Dev, se vacía esta variable de provisión.

## Excel

Desde Mis marcas, Solicitudes o Resumen de registros: **Subir desde Excel**. Admite `.xlsx` y `.csv`, hasta 2 MB y 2.000 filas por archivo, varias hojas y cargas consecutivas. La carga ampliada de octubre acepta números de solicitud, RUT, razones sociales y representantes. Las columnas con clientes son sugerencias y no crean vínculos automáticamente.

También se puede preparar una cartera sin Excel desde Agregar marcas: combinar marca, solicitud, persona/RUT, rol titular/representante, clase y estado; revisar a la derecha los candidatos y confirmar los elegidos. La fuente no resuelve directamente números de registro solos; se pueden buscar entre los expedientes ya guardados.

1. Lectura: detecta identificadores inválidos y reúne filas repetidas. Una fila de persona exige revisar el rol y buscar candidatos expresamente.
2. Revisión: muestra coincidencia, datos, estado y destino. Se confirma cartera propia, cliente y rol por expediente, o se elige dejarlo sin cliente.
3. Incorporación: guarda los expedientes válidos por lotes; omite duplicados y conserva los vínculos de expedientes existentes. Los errores no borran lo ya incorporado y se pueden reintentar. Se puede pausar al terminar el bloque actual.

Alcance y límites de la fuente en [UI/UX de octubre](UX_OCTUBRE_2026.md).

Registro concedido con número de registro → Marcas. Registros vencidos/cancelados conservan su estado explícito. Tramitaciones activas y solicitudes terminadas sin concesión → Solicitudes. Una concesión posterior crea la marca durante la revisión y conserva la solicitud con su historial. La carga inicial no genera avisos históricos.

El motor de cruces ya está integrado. Los expedientes propios importados participan del seguimiento por organización y la cartera de Daniel mantiene su revisión automática diaria. La consulta de novedades del expediente y la vigilancia de similitudes son operaciones independientes; no se inventan hallazgos al incorporar. El buscador y la vista no disparan una revisión por el solo hecho de abrirse.

## Informe y datos de De Las Heras · 2 de octubre

En Dev se cargó el perfil De Las Heras Abogados para Daniel Morales Sorondo a partir de `Informe Factibilidad SEMASK (rev dms).pdf`: logo, nombres del encabezado, direcciones, teléfonos y web. Se dejó vacío el correo no informado. El formulario **Agrega la información de tu estudio** aparece encima de los criterios de factibilidad; todos los campos son opcionales, persistentes y editables.

PDF y Word siguen la estructura del ejemplo, con coberturas completas, conclusión y firma al final. La conclusión toma la búsqueda actual completa; no copia los resultados ni el análisis jurídico de SEMASK a otras marcas. OpenRouter está preparado y conserva un respaldo determinista cuando falta la clave o falla. [Configuración y pruebas](INFORMES_FACTIBILIDAD_2026-10-02.md).

## Oposiciones presentadas

En Casos: **Agregar oposición presentada**. Requiere número de solicitud de la marca contraria y persona/cliente oponente. Admite vínculo a una marca o solicitud propia, fecha de presentación, enlace HTTPS al respaldo y notas. La marca de fundamento se valida dentro de la organización y es opcional al crear el caso.

El expediente contrario se sigue dentro del caso. No se incorpora a Marcas, Solicitudes propias ni Vigilancias. Su historial se muestra en la ficha. Una actuación nueva genera aviso y tarea de revisión sin duplicarlos al repetir una consulta idéntica; el aviso enlaza al caso. Los casos concluidos o descartados dejan de revisarse.

La aplicación no atribuye al oponente las obligaciones de contestación del solicitante. Las tareas nuevas quedan sin vencimiento jurídico supuesto: el abogado verifica la actuación, notificación, parte obligada y fecha. Puede agregar tareas con fechas internas en la ficha. La identidad del oponente y la fecha de presentación ingresadas por el equipo no se presentan como verificadas por la fuente.

Se guarda un enlace al respaldo, sin almacenamiento persistente de archivos adjuntos. No hay conexión directa al TDPI ni garantía de que el proveedor incluya todas las actuaciones. Una falla conserva los últimos datos y queda registrada.

## Operación

- Migración `0005_left_husk`: credenciales, sesiones, control de intentos y antecedentes del caso; sin borrado de datos.
- `npm run account:provision`: crea la cuenta cuando se configura la clave inicial. Railway lo ejecuta después de migrar.
- Local: configurar `DANIEL_INITIAL_PASSWORD` antes del primer `npm run dev:local`. El proveedor local sigue siendo simulado. La cuenta local y la publicada son independientes.
- Dev: `SOURCE_PROVIDER=inapi`, clave del proveedor y revisión automática habilitadas; búsquedas mock por atributos desactivadas para el piloto.
- Recuperación de claves e invitaciones con credenciales para otros miembros quedan pendientes. El alta anterior de usuarios crea un miembro del equipo, sin entregar automáticamente una contraseña ni un acceso nuevo.

## Verificación

Compilación de producción y TypeScript; suite de reglas y regresiones; pruebas de Excel, hashes e identidades concurrentes. `node --import ./tests/ts-loader.mjs tests/pilot-e2e.mjs` crea PostgreSQL y servidor descartables con dos cuentas y respuestas INAPI de prueba: acceso, cambio de clave, rechazos anónimos/cruzados, importación, deduplicación, oposición, concesión posterior, novedades, tareas, fallas y cierre de sesión.

Revisión visual: ingreso, carga con IDs repetidos/erróneos y consulta del expediente contrario. Ningún expediente de prueba se carga en la cuenta de Daniel.

Seguridad de dependencias, registro de la entrega v0.6: Next.js actualizado a 16.3.5 y dependencias transitivas compatibles. La auditoría de producción de aquella entrega no reportó hallazgos altos/críticos; esto no acredita una auditoría nueva el 2 de octubre. Quedan dos entradas moderadas relacionadas con el mismo aviso de `uuid` transitivo de ExcelJS (v3/v5/v6 con buffer proporcionado); ExcelJS utiliza únicamente v4 sin buffer en su código. No se fuerza una degradación de ExcelJS para ocultar ese aviso.

Esta entrega se publica en **Dev**. Producción conserva su versión anterior.
