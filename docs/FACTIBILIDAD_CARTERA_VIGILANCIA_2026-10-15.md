# Factibilidad, cartera y vigilancia · 15 de octubre de 2026

Estado: **publicado exclusivamente en Railway Dev**, [PR #92](https://github.com/joseibietasepulveda/Buho-Marc/pull/92), SHA `f526fb6`, despliegue `4c5d0589-40ef-427a-baa5-07c4df14453d` SUCCESS. Migración y conservación de registros verificadas. [Traspaso y comprobaciones](handoffs/2026-10-15-factibilidad-cartera-vigilancia.md) · [Costos y semana de ejemplo](COSTOS_SEMANALES_2026-10-15.md).

## Decisiones de producto

Esta entrega sustituye las categorías alta/media de vigilancia, los límites anteriores de cinco cruces por marca/150 totales, la pausa individual de marcas, la obligatoriedad de elegir Niza y el recordatorio único de renovación. Mantiene las decisiones del abogado, los estados oficiales, las revisiones guardadas, la separación por organización y la política existente de consulta diaria/a pedido. La nueva detección por representante tiene su propia programación diaria.

## Revisor de factibilidad e informes

- **Considerar también clases vinculadas** aparece activado debajo de **Agrupar similares del mismo titular**. El enlace abre la fuente oficial de INAPI. Se distinguen clases seleccionadas y vinculadas, y se puede ajustar cuáles incluir.
- Buscar sin clase está permitido: no se restringe la clase en el lote recuperado. Elegir clase expande una sola petición, deduplica y filtra el lote de hasta 100 candidatos; no promete una revisión exhaustiva de la base.
- El catálogo versionado en `lib/nice-related.ts` deriva de [INAPI, Marcas previas en Chile, §§8–15, pp. 12–14](https://www.inapi.cl/docs/default-source/2026-doc/centro-de-documentacion/directrices/marcas/aspectos-sustantivos/42---tercera-parte---aspectos-sustantivos---marcas-previas-en-chile-docx.pdf?sfvrsn=b9267d1c_2#page=12), dentro de las [directrices oficiales](https://www.inapi.cl/marcas/directrices). Son ejemplos condicionados por productos/servicios, no una matriz universal exhaustiva. El ejemplo documentado para herramientas es **7–8**; el 7–9 mencionado inicialmente por el usuario era ilustrativo y no se convirtió en una regla inventada.
- Las relaciones con comercialización de clase 35 se ofrecen con explicación. Desde la clase 35 el usuario selecciona los productos pertinentes: no se activan automáticamente las 34 clases de productos.
- PDF y Word dicen **Marca en estudio**, **Clase(s) de Niza** y **X coincidencias detectadas**. La misma marca/titular agrupada conserva un único antecedente con sus expedientes. El alcance enumera clases seleccionadas y vinculadas.
- Todas las conclusiones asistidas reciben solo los antecedentes seleccionados, cobertura propuesta, alcance y un resumen jurídico versionado. No se envían imágenes ni PDFs jurídicos completos. `lib/trademark-legal-context.ts` resume los arts. 19, 20 a)–k) y 23 del [DFL 4/2022, Ley de Propiedad Industrial](https://www.bcn.cl/leychile/navegar?i=1179684).
- El modelo debe explicar causales pertinentes con artículo/letra: genericidad, falta de distintividad, descripción, signos engañosos, emblemas, nombres personales, notoriedad, derechos previos, indicaciones geográficas y orden público. «Chocolate» se analiza respecto de sus productos; sin cobertura suficiente debe explicitar la falta de información. Cero coincidencias no obliga a recomendar el registro.
- La cantidad de cruces y el índice no equivalen a una probabilidad jurídica. La conclusión debe distinguir conflictos en clases elegidas/vinculadas y fundamentar la relación de productos. Conserva la decisión explícita del abogado; PDF/Word reutilizan la conclusión sin regenerarla.
- Límite: 90.000 bytes de contexto textual, 2.200 tokens de salida por intento, hasta dos intentos en 45 segundos compartidos. No se truncan expedientes silenciosamente. Un contexto excesivo o una respuesta fallida requiere reducir selección/reintentar o escribir una conclusión revisada; el respaldo determinista no habilita por sí solo la exportación actual.

## Mis Marcas, terceros y clientes

La cartera tiene **Mis Marcas** y **Marcas de 3ros**. Desaparece la columna y opción de no monitorear. La migración activa marcas no archivadas; las nuevas se incorporan con seguimiento habilitado. El modo diario/a pedido de la organización sigue controlando cuándo se consulta la fuente.

**Agregar marcas de 3ros**, debajo de Limpiar filtros, abre el selector existente y confirma con **Agregar al seguimiento de 3ros**. `monitoring_config.portfolioRole` (y `data.portfolioRole` para solicitudes) pertenece a la relación de cada organización, nunca al registro compartido de INAPI. Valores `own`/`third-party`, predeterminado `own` para datos históricos. Los expedientes de terceros en trámite pueden aparecer en esa cartera sin convertirse en solicitudes propias.

Al incorporar expedientes propios se crean/reutilizan todos sus titulares y cotitulares como clientes. RUT normalizado; a falta de RUT se compara nombre normalizado entre contactos sin RUT. Se conserva el cliente principal asignado y se enlazan todos mediante `clientIds`. Sus fichas e informes muestran todas las marcas asociadas. Los titulares de terceros no se crean como clientes. La carga de Clientes incorpora por lotes de 100 los expedientes propios históricos aún no vinculados; no fusiona contactos editados ni elimina duplicados históricos.

## Descubrimiento diario por representante

`POST /api/portfolio/discover`, protegido por secreto del supervisor, ejecuta una exploración por organización/día de Santiago aunque nadie abra el navegador. Usa el **RUT de representante que aparece en más solicitudes distintas de Mis Marcas**, incluidas las solicitudes propias en trámite. Excluye terceros. Si falta RUT o hay empate, omite la búsqueda; no usa el RUT del titular ni el de la cuenta.

Consulta metadatos por representante, 100 resultados por página; una página por turno y cursor durable. Una exploración completada no se repite ese día. Límite 10.000 resultados; un recorrido incompleto queda visible en `portfolio_discovery_runs` como `limited`/`failed`. Hasta tres intentos por página con una hora de espera ante fallos, bloqueo y arrendamiento para evitar concurrencia. `PORTFOLIO_DISCOVERY_ENABLED=false` la desactiva; requiere fuente real, credencial y supervisor activo.

Por cada solicitud desconocida se crea una notificación única por organización/solicitud. Abrirla permite revisar e incorporar desde el selector. No importa automáticamente ni presenta como propia una solicitud solo por compartir representante. No descarga todos los expedientes cada día. El aviso por correo automático permanece **pendiente** en las novedades de la app (`lib/release-notes.ts`); esta entrega solo lo incorpora a Notificaciones.

## Avisos de vencimiento

El backend evalúa cada día los hitos de **un año, seis meses, un mes y siete días** antes del vencimiento de registros propios. Usa la fecha vigente informada por la fuente o, si falta y existe registro verificable, diez años desde su fecha de registro. Ajusta meses al último día válido.

Deduplica por organización/registro/vencimiento/hito. Una importación tardía o interrupción genera el hito vencido más cercano, evitando cuatro avisos históricos juntos. Al cambiar la fecha de vigencia invalida avisos de la fecha anterior y calcula la nueva. Excluye terceros y registros ya vencidos. Se ejecuta desde el supervisor de sincronización, también en organizaciones a pedido; no depende de la pestaña abierta. No declara una marca renovada ni caducada por el simple paso del tiempo.

## Pago informado por el usuario: primera intervención sobre el avance

En la parte superior de la tarjeta de una solicitud propia que espera pago aparece **Pagado**, sin abrir el detalle. Aplica al pago de publicación y al de aceptación cuando la obligación está identificada; los litigios que esperan firmeza mantienen su regla previa.

1. La persona pulsa Pagado. El servidor vuelve a comprobar organización y obligación actual, con bloqueo de la solicitud; si el acto cambió responde 409 y pide actualizar.
2. Registra quién informó, cuándo, clase de pago y clave de la actuación (solicitud/id/fecha/descripción). Una repetición no crea otro pago. `registration.payment.paid` conserva antes/después en auditoría.
3. La tarjeta dice **Pago informado por el equipo · Confirmación de INAPI pendiente**. El avance local pasa a esperar publicación o verificación del pago. Los eventos, documentos y estado oficial de INAPI permanecen separados en `officialStatusId`; la declaración no constituye un comprobante emitido por INAPI.
4. Una actualización antigua de la misma obligación no borra la declaración. Una obligación distinta no hereda el pago. Cuando la fuente acredita el avance correspondiente se muestra **Pago confirmado por INAPI**.
5. **Deshacer** revoca la declaración mientras esté pendiente, registra autor/fecha y `registration.payment.revoke`, y devuelve la proyección al estado oficial. No borra el historial. Una confirmación oficial ya recibida no se revoca con ese botón.

Contrato: `POST /api/registrations/payment`, sesión y mismo origen; `paid` requiere `applicationId` y `actKey`; `revoke`, `applicationId` y `paymentId`. No acepta una identidad de actor enviada por el cliente. Datos locales en `manualPayments`; proyección derivada `manualPayment`. Las reimportaciones preservan esta evidencia local.

## Vigilancia y revisión con IA

Solo existen **Mostrar/No mostrar** como decisión de publicación. La evaluación positiva aparece como **Recomendado**, primero; la negativa se oculta; un cruce no evaluado se muestra si alcanza el umbral. Un error de IA no equivale a una decisión negativa. Se conservan los filtros de estado/publicación y las decisiones de seguimiento/caso/descartado. Un positivo puede superar el umbral y la heurística comercial, pero no reabrir un caso cerrado o un expediente excluido.

Cada cruce ocupa una fila con ambas marcas, imágenes o alternativa legible, clases, estado, motivo desplegable, valoración y acciones existentes. No se muestra índice ni se agrupa visualmente por marca. Recomendados se ordenan por índice descendente y luego el resto. Paginación global de 30 cruces. Comparación, seguimiento, aviso de publicación y conversión en caso se conservan.

Configurar umbrales contiene un solo deslizador de 0–100%, pasos de cinco: verde No mostrar, rojo Mostrar, porcentaje encima. La sección IA está debajo. Panel desplegable compacto en escritorio y adaptado al ancho móvil.

Antes de inferir se excluyen decisiones vigentes. Se ordenan marcas por su mejor cruce pendiente, se toman hasta 50 y sus dos primeras coincidencias: máximo 100, también si el trabajo se divide en llamadas físicas. Ambos flujos, revisión sin correo y digest existente, comparten este límite. Los restantes quedan para otra revisión.

`watch_evidence_fingerprint` conserva identidad, denominación, imagen, clases/cobertura, titulares, estado y fechas materiales de ambos signos. Cambios de fecha de consulta o índice solamente no pagan otra inferencia; un antecedente material nuevo sí permite reevaluar ese cruce. Se guarda también la decisión negativa. Un cambio de prompt por sí solo no invalida todo el historial. Las decisiones actuales invalidan las versiones de las pantallas para que el resultado aparezca al refrescar.

**Ordenar con IA** prepara una revisión persistente sin depender del correo. La ejecución automática diaria es optativa con `WATCH_AI_ENABLED=true`, y requiere `OPENROUTER_WATCH_API_KEY`. En Dev, por petición posterior del usuario, esa variable referencia `OPENROUTER_API_KEY`; comparten credencial/saldo y mantienen contabilidad y límites del subsistema. Resend y el correo semanal conservan activación independiente. La migración conserva decisiones anteriores y calcula su huella; el importador de pilotos guarda también esa huella.

## Integración y operación

Aplicar `drizzle/0019_portfolio_watch_improvements.sql` antes de servir el nuevo código. Agrega descubrimiento diario, `delivery_mode`, huellas, funciones y disparadores de invalidación; no elimina migraciones previas. Revisar numeración/journal al integrar otros trabajos. SQL y `db/schema.ts` deben viajar juntos.

Archivos compartidos principales: `app/app/page.tsx`, `watch-panel.tsx`, `feasibility-review.tsx`, `registrations.tsx`, `client-provider.tsx`, `brand-search.tsx`, estilos de `app/app/`, `db/demo.ts`, `db/source.ts`, `db/similarity.ts`, `db/watch-digest*.ts` y supervisor. Verificar Clientes, Resumen, informes, pagos y correo además de Vigilancia cuando se integren ramas.

Publicación en Dev autorizada el 15/10/2026: se conserva su configuración externa y producción no cambia. El supervisor habilita el descubrimiento diario por defecto. IA diaria y correos siguen desactivados. La falta inicial de clave se resolvió configurando `OPENROUTER_WATCH_API_KEY` como referencia a la clave existente de factibilidad; [decisión y verificación de configuración](handoffs/2026-10-15-openrouter-compartido-dev.md). Las decisiones guardadas se conservan. Las pruebas de operaciones autenticadas usan PostgreSQL aislado, datos ficticios y respuestas simuladas; el costo real del modelo debe medirse en operación autorizada.
