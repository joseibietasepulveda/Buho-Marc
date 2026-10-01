# Presentación de la cuenta de prueba y piloto FA Abogados

Solicitud del 1 de octubre de 2026. Entrega autorizada **primero en Dev**, sin promoción a main/production.

## Cuenta de prueba · Estudio Ibieta IP

- Cambiar clave y Salir se ubican al final de la navegación, con botones delimitados y foco visible.
- Mis marcas ordena primero las fichas con menos datos faltantes en la tabla; después conserva el criterio de cantidad de coincidencias y nombre. Una marca denominativa no requiere imagen y una solicitud en trámite no requiere número de registro. No se completan datos ficticios.
- Se reconocen una sola vez las notificaciones existentes en este espacio. Se conservan los avisos y se registra la operación en auditoría. Una nueva notificación permanece pendiente: reiniciar el servicio no vuelve a marcarla automáticamente.
- Se muestran 50 avisos por página en ambas bandejas, manteniendo los totales reales y el acceso al historial completo. Evita bloquear el navegador al dibujar más de 32.000 avisos simultáneos.
- Las diez comparaciones de las capturas tienen prioridad en **Coincidencias destacadas** y en la vista previa del resumen. La configuración solo se aplica a este tenant. Las selecciones respetan búsquedas, fechas y decisiones de revisión, pero pueden incluir marcas registradas o índices inferiores al umbral general porque son ejemplos elegidos expresamente para esta cuenta de prueba.
- Se conservan los porcentajes del motor, estados, clases e historiales. Las estimaciones humanas de las capturas no sustituyen automáticamente los índices del motor. Fuera de esta selección, siguen vigentes los filtros normales de vigilancia.
- La Brioche se añade como **Ejemplo de prueba**, con evidencia pública consultada el 29 de septiembre de 2026 y un índice original de 75,23%. No se copia la cartera de Daniel ni se añade a Mis marcas, solicitudes propias o consultas automáticas. El ejemplo conserva imágenes, coberturas e historial público; no crea avisos retroactivos y respeta las decisiones posteriores de revisión.

Comparaciones, en el orden solicitado:

1. Club Del Mal Amor (1659715) → Chaparrita del amor (1683639) y Titanes del amor (1689486).
2. La Brioche Bakery Café (1638707) → LA BRIOCHE DOREE (997604).
3. Maison Dubai Niche (1644808) → M MAISON NICHE (1397032).
4. Bosques del Norte por un Mundo Sustentable (1675838) → bosquesdelnorte por un mundo sustentable (1245326).
5. ELQUI.CL (1670929) → Tv elqui.cl (1572142).
6. Mote con Huesillo El Copihue de Lonquén (1552147) → Copihue Mote con Huesillo El Original 1985 (1672680).
7. INIZZI (1652393) → inizzi tu primera ilusión (1290829).
8. MAÍTA (1630024) → MAITA PLAYA LAS MOSTAZAS (1665441).
9. ALMATEXTIL (1671216) → Almatex (1658314).

## FA Abogados

- Tenant separado con slug `fa-abogados`, nombre FA Abogados y usuario `FA_abogados` (normalizado a minúsculas al ingresar).
- Cartera, solicitudes, vigilancia, casos, clientes y notificaciones vacíos. No se copia la demo ni la cartera de otro estudio.
- Sin Administrador de fuente, Acerca de esta versión ni Cambiar clave. El acceso directo al administrador de fuente y al cambio de clave también se bloquea en el servidor; `/cambiar-clave` redirige a `/app`.
- Sin obligación de cambiar la clave inicial al primer acceso, conforme a la solicitud del usuario. La clave no se guarda en este documento ni en el código: se recibe durante la preparación desde una variable del ambiente y se almacena como hash.
- Se mantienen las funciones ordinarias del espacio y Salir. La creación es idempotente y no reemplaza credenciales ni vincula un usuario existente con otros espacios.

## Operación y verificación

`scripts/provision-pilot.ts` prepara FA y reconoce los avisos de prueba únicamente si recibe `FA_INITIAL_PASSWORD` y el identificador exacto del ambiente Dev. La variable se retira al completar la preparación; no debe copiarse a producción. La auditoría protege la operación única de notificaciones.

Pruebas: orden por completitud; selección exacta sin cambiar índices; filtros y decisiones de revisión; creación idempotente; avisos antiguos y futuros; inicio de sesión con usuario en mayúsculas; aislamiento del espacio; bloqueo de rutas; compilación y revisión visual.
