# Bienvenida de octubre y cartera Búho Marc

## Experiencia de ingreso

La propuesta HTML del 7 de octubre se incorpora a la aplicación autenticada en Dev y producción. `ReleaseWelcome` muestra «¡Buenas noticias!» con ocho novedades y luego tres mejoras próximas. Cada tarjeta tiene una casilla «Leído»; Aceptar exige completar el paso. «Lo veo después» y Escape permiten continuar trabajando sin registrar aceptación. La segunda pantalla se recupera al recargar si la primera ya fue aceptada. Tras ambas aceptaciones deja de aparecer.

El estado vive en `release_acknowledgements` por organización, usuario y versión `octubre-2026-v1`, mediante migración aditiva `0015_release_acknowledgements.sql`. `GET/POST /api/release-welcome` requieren sesión, verifican origen en escrituras y obtienen usuario/organización exclusivamente del servidor. El servidor valida las casillas, el orden y la versión. Un fallo no bloquea el espacio ni pierde las selecciones de la pantalla. Cambiar la versión implica una nueva campaña; no borrar aceptaciones anteriores.

Contenido: valoraciones de similitudes, comparador, búsqueda en tres pasos, informes personalizados, incorporación de cartera, actuaciones/plazos, flujo de casos/tareas/avisos y navegación. Las recomendaciones mejoradas, informes futuros y sugerencias IA se presentan como preparación, sin prometer entrenamiento individual ya operativo.

## Traslado puntual de cartera

El usuario autorizó copiar exclusivamente `estudio-ibieta-ip` de Dev a Main. Publicar código por sí solo conserva las bases independientes; esta copia es una operación separada y explícita. `lib/workspace-transfer.mjs` exporta el grafo de esa organización sin contraseñas y `scripts/transfer-buho-workspace.mjs` importa un archivo privado NDJSON comprimido. No se ejecuta desde arranque ni rutas HTTP.

La importación prepara tablas temporales, comprueba esquema y ambiente, rechaza consultas activas, usuarios inexistentes y fuentes globales incompatibles; bloquea las tablas afectadas y copia en una transacción. Conserva usuarios, claves, sesiones, otros estudios y filas exclusivas de Main. No genera búsquedas ni peticiones a INAPI. La vigencia de los antecedentes sigue siendo la observada en la exportación, no una reextracción.

Los seis contactos de semilla tienen UUID diferentes por ambiente: se reutiliza el UUID de Main por código de contacto, remapeando también las referencias dentro de JSON. Tres marcas de demostración comparten código pero son entidades distintas: las importadas reciben `BM-DEV-*`, conservando las tres existentes y sus relaciones. Dos casos creados independientemente para la misma coincidencia reutilizan la identidad y el código de Main, conservando sus tareas existentes y remapeando las referencias importadas. Las coincidencias de códigos de marcas reales detienen la operación. Las filas copiadas se comparan íntegramente con la preparación tras estos mapeos; huellas de filas ajenas y credenciales deben permanecer idénticas o todo revierte.

Uso, con conexión privada explícita y acceso autorizado:

```bash
# Ensaya toda la transacción y revierte al final.
node scripts/transfer-buho-workspace.mjs /ruta/privada/dev.ndjson.gz
# Aplica solo después de respaldar y verificar el ensayo.
node scripts/transfer-buho-workspace.mjs /ruta/privada/dev.ndjson.gz --apply
# Base descartable exclusivamente localhost.
node scripts/transfer-buho-workspace.mjs /ruta/privada/dev.ndjson.gz --local-test
```

La conexión que llama `exportWorkspace` debe conservar timestamps PostgreSQL como cadenas (parser crudo de OID 1082/1114/1184), para mantener microsegundos; no convertirlos a `Date` de JavaScript. Los archivos de exportación contienen datos privados: mantener fuera de Git, cifrar respaldos y retirar accesos temporales. No usar esta herramienta como sincronizador periódico. Mantener la recuperación directa INAPI desactivada en producción mientras Dev sea el único trabajador habilitado; presupuesto 200 e intervalo mínimo 3000 ms permanecen vigentes.

## Verificación y estado de publicación

La [nota de traspaso](handoffs/2026-10-08-buho-main-bienvenida.md) registra los ensayos, resultados, copia aplicada y despliegues comprobados; distingue implementación de publicación.
