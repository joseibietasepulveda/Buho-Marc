# Dominios: vista de prueba · 13/10/2026

## Acceso y alcance
Solicitud del usuario: añadir revisión de dominios con datos mock exclusivamente al administrador de Búho Marc, sin afectar a otros usuarios. `workspacePolicy` habilita `domainsPreview` sólo para slug `estudio-ibieta-ip` y rol `admin`. La capacidad se entrega por el snapshot autenticado de `/api/demo`; no se deduce del nombre visible. Miembros y administradores externos no reciben opciones, controles de ficha ni KPIs de dominios. El enlace `#domains` vuelve al resumen cuando falta el permiso.

## Flujos
- Dominios aparece entre Solicitudes de registro y Notificaciones. Tiene Mis dominios, Factibilidad dominio y Avisos de dominios.
- Cada marca admite un dominio opcional. Desde su ficha, Agregar dominio valida y asocia el nombre; si ya existía sin marca, se reutiliza. Desvincular conserva el dominio en vigilancia. La asociación inicial de fixtures es vacía: no se vinculan por similitud de nombre a marcas reales.
- Agregar dominio permite alta independiente o elegir una marca que aún no tenga dominio. Se rechazan duplicados; un dominio ya asociado no puede reasignarse silenciosamente a otra marca. La ficha del dominio permite elegir o quitar la marca.
- La tabla muestra nombre, fecha de creación, titular, marca opcional y vigilancia simulada. Fecha de creación corresponde al registro del dominio, distinta de Inicio de vigilancia. Los ejemplos tienen fechas ficticias; nuevas altas y todos los titulares están pendientes de API. No se usa el titular de la marca como titular del dominio.
- Factibilidad dominio reproduce los modos Exacta y Contenga de [WHOIS NIC Chile](https://www.nic.cl/registry/Whois.do). Exacta normaliza un host y agrega `.cl` a nombres sin extensión. Contenga filtra fixtures locales. Se aceptan hostnames e IDN; se rechazan URLs, rutas, correos, puertos y etiquetas inválidas. Aunque la lista admite otras extensiones, la referencia y ejemplos de factibilidad son .CL.
- `novafoods.cl`, `terrasur.cl`, `casanube.cl` y `estudioejemplo.cl` son ejemplos inscritos simulados; `nuevamarcaejemplo.cl` es el único ejemplo disponible ficticio. Un nombre ausente muestra Sin datos en esta demo, sin deducir disponibilidad. Vigilar dominio incorpora el ejemplo disponible sin inventar antecedentes de registro.
- Avisos tiene dos ejemplos explícitos: cambio de titular y de servidores. Marcar revisado disminuye el KPI sin borrar el aviso. Son independientes de las notificaciones reales de la aplicación.
- Resumen Vigilancia añade Dominios vigilados y Avisos de dominios en la misma fila de seis KPIs en escritorio; tablet usa tres y móvil dos por fila. Sus botones abren la lista o avisos correspondientes.

## Estado y continuidad
`DomainPreview` vive en memoria del componente del espacio y se conserva al navegar. Recargar reinicia los ejemplos. No hay endpoints de dominios, esquema, migraciones, cron, consultas a NIC/INAPI, OpenRouter, notificaciones reales ni modificación persistente de marcas. La vigilancia real de dominios y persistencia todavía no están implementadas.

Para conectar la API: acordar fuente, contrato y permisos; persistir por organización, mantener un dominio opcional por marca, distinguir fechas de registro/alta y datos ausentes, guardar procedencia, definir avisos y programación autorizada. No interpretar este prototipo como disponibilidad comprobada ni promesa de monitoreo activo.

Integrado en Dev por [PR #78](https://github.com/joseibietasepulveda/Buho-Marc/pull/78) y publicado en Railway Dev (`92a55a13a85636c5963fd49c3e5fe396045582c4`, despliegue SUCCESS `8f697aad-bde7-4463-bf8b-e9a39b886c55`). Permisos y flujos verificados con sesiones admin Búho/miembro/admin externo. Producción conserva su versión. [Traspaso con pruebas y siguientes pasos](handoffs/2026-10-13-revision-dominios-admin.md).
