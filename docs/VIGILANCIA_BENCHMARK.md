# Prueba de vigilancia con solicitudes de Daniel

Fecha: 2026-09-21T13:54:14.598Z

Cliente ejecutado en Mac Apple M2 (8 núcleos). El motor de similitud se ejecuta en DeQuiénEs, no en el Mac. No intervino el servidor de la aplicación de Railway; se usó su configuración existente solo para obtener la credencial. La interfaz y la preparación de resultados corren localmente.

Se consultaron cuatro solicitudes que la fuente informa En Trámite, escogidas del listado entregado por Daniel. La Brioche y TORO tienen oposición recibida según la aclaración previa del usuario. Una muestra secuencial por marca; sin reintentos de búsqueda, sin corte de fechas, 50 solicitudes individuales, exclusión del mismo titular y coberturas incluidas. No se modificó la cartera.

| Marca | Solicitud | Búsqueda | Estados | Total | Motor informado | Resultados En Trámite |
|---|---:|---:|---:|---:|---:|---:|
| La Brioche Bakery Café | 1638707 | 23.95 s | 0.75 s | 24.70 s | 23.70 s | 1/50 |
| TORO automóviles | 1617903 | 17.87 s | 0.49 s | 18.37 s | 17.64 s | 6/50 |
| Vicentica | 1686458 | 15.61 s | 0.32 s | 15.94 s | 15.39 s | 2/50 |
| Barrio Lola | 1651042 | 12.15 s | 0.37 s | 12.52 s | 11.91 s | 3/50 |

Total de las cuatro búsquedas y consulta de estados: 71.53 s. La consulta inicial de las cuatro fichas tomó 0,39 s adicionales; la obtención de credenciales y construcción de la interfaz quedan fuera de los tiempos. El total incluye lectura de respuestas JSON y pequeñas operaciones locales; no incluye descarga de logos ni renderizado del navegador. No se conoce si el motor usó caché ni su carga concurrente. No es una medición del motor en CPU local ni una comparación controlada entre pedir 5 y pedir 50.

## Hallazgos

- Las cuatro búsquedas y los cuatro lotes de detalle respondieron 200; hay 200 resultados y estado informado para cada uno. No se repite una solicitud dentro de una búsqueda y ninguna incluye la propia solicitud consultada.
- La consulta adicional de estados tarda entre 0,32 y 0,75 s. La mayor parte del tiempo está en el motor remoto: 11,91–23,70 s según su propio dato. Filtrar estados en el Mac es viable, pero no elimina ese tiempo de búsqueda.
- Confirmado el canal `phonetic` en respuestas reales. También aparecen `name`, `distinctive_tokens`, `visual_base`, `visual_residual` y `coverage`. No hay un canal independiente llamado semántica en estas cuatro respuestas.
- No se transforman puntajes en porcentajes ni se descartan resultados de baja puntuación: la vista conserva los 50 en su orden original.
- La API advierte que la exclusión del mismo titular se realiza sobre un conjunto acotado de candidatos. Estos 50 no representan todo el universo de solicitudes en trámite.
- El estado se muestra literalmente como lo entrega la fuente. Los casos «VER INSTANCIA» y otros estados ambiguos requieren revisar antecedentes; un estado general aislado no acredita firmeza de un rechazo ni ausencia de recursos.

## Solicitudes etiquetadas En Trámite

### La Brioche Bakery Café

- Posición 46: Bucare, solicitud 1669705.

### TORO automóviles

- Posición 6: TROCARS, solicitud 1681173.
- Posición 8: TORO NEGRO AUTO CARE, solicitud 1673068.
- Posición 20: Tradecars automotores, solicitud 1682165.
- Posición 38: AUTOMOTORA ROMEC CAMBIA TU RUMBO, ENCUENTRA TU DESTINO, solicitud 1602877.
- Posición 41: TORO D’ORO, solicitud 1661644.
- Posición 42: AUTOMOTORA CROACIA, solicitud 1663785.

### Vicentica

- Posición 44: Agentica, solicitud 1665581.
- Posición 48: Venerdi, solicitud 1664759.

### Barrio Lola

- Posición 11: By Lola / productos caseros, solicitud 1681953.
- Posición 43: Ladys del Barrio, solicitud 1674506.
- Posición 48: Lola de Fiesta, solicitud 1623162.

La Brioche solo tiene una coincidencia etiquetada En Trámite, en posición 46. Vicentica tiene dos, en 44 y 48. TORO tiene seis y Barrio Lola tres. Esto demuestra que no debemos recortar a diez antes de consultar estados. No demuestra que esos resultados sean jurídicamente relevantes: corresponde revisar nombres, logos y coberturas con el usuario.

## Evidencia original

Las respuestas y la interfaz exploratoria permanecen localmente en `output/vigilancia-prueba-daniel/`. Este documento conserva las mediciones sin incorporar al repositorio las respuestas completas.
