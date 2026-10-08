# Guía de recorrido de Buho Marc

Actualizada el 2 de octubre de 2026 para [Railway Dev](https://buho-marc-web-dev.up.railway.app/app). Los espacios autenticados guardan datos separados por organización. Los ejemplos del espacio de prueba y del explorador de proceso no se convierten en antecedentes reales de otras carteras. La landing de [Vercel](https://buho-marc.vercel.app/) tiene un dashboard promocional estático; el trabajo interactivo ocurre en `/app`.

## Preparación

Usar una cuenta y ambiente autorizados. Para una demostración que implique altas, cambios o eliminaciones, preferir el piloto local descartable o datos del propio espacio de prueba. No modificar carteras ajenas ni volver a consultar INAPI solo para mostrar estilos. El [README](../README.md) explica el inicio local; el [índice](README.md) distingue guías actuales e historial.

## Recorrido sugerido

1. **Resumen Vigilancia**: tareas pendientes con su caso, indicadores y agenda legal. Abrir el calendario completo y una tarea. Las fechas internas y los plazos legales se presentan por separado.
2. **Buscador general**: buscar marca, cliente, RUT, solicitud, registro, representante o contraparte y abrir la ficha relacionada. Filtra datos guardados; escribir no inicia una búsqueda remota.
3. **Mis marcas**: revisar Número de solicitud como primera columna, logo y marca separados, Estado INAPI en texto y «5+ por revisar» cuando corresponde. El RUT se consulta en la ficha/buscador, sin columna visible ni filtro Real/Mock.
4. **Agregar marcas**: combinar criterios a la izquierda; buscar explícitamente y revisar candidatos a la derecha. Mostrar coincidencias de titular/representante, elegir expedientes y confirmar cartera propia, cliente y rol, o dejarlos sin cliente. Número de solicitud es exacto; nombre y RUT de persona permiten preparar una cartera sin Excel.
5. **Subir desde Excel**: cargar solicitudes, RUT, razones sociales o representantes; revisar candidatos y filas inválidas/repetidas. No atribuir un cliente porque figure en el archivo. La incorporación preserva vínculos existentes y no duplica solicitudes.
6. **Vigilancia**: recorrer Novedades por revisar, Antecedentes y En seguimiento; niveles alta/media, clases, coberturas e historial. Buscar más amplía el lote guardado de cinco en cinco. Las revisiones manuales se solicitan desde el chat; abrir, filtrar o ampliar no consulta la fuente. Seguir o esperar publicación son decisiones explícitas.
7. **Casos**: comparar modo simple inicial y detallado en tablero, lista y calendario. El simple omite tareas de las tarjetas; la ficha conserva el detalle. Cambiar prioridad desde su píldora y revisar la tabla del expediente defendido. Abrir historial y solicitud vinculada cuando existan.
8. **Clientes**: abrir una fila, editar su ficha y acceder a marcas/solicitudes. Junto a Marcas vinculadas, abrir Descargar informe de cliente; elegir columnas una a una y Excel (inicial), Word o PDF. Descargar desde abajo a la derecha. Usa información guardada, sin otra consulta a INAPI.
9. **Factibilidad**: abrir Agregar la información de tu estudio, en la tarjeta derecha sobre el logo. Mostrar campos opcionales y el perfil precargado de Zamora IP, Daniel/De Las Heras o FA. Guardar, recargar y reabrir para comprobar persistencia; no reemplazar datos de otro estudio durante una demo.
10. Revisar agrupación activa inicialmente, seis modos de nombre, clases/coberturas, estados/índice y fechas de solicitud/publicación/registro. Las fechas limitan canales en la fuente; los otros filtros trabajan sobre el lote recuperado. El índice mide semejanza y no una probabilidad jurídica.
11. Con una búsqueda disponible, seleccionar antecedentes, pulsar Preparar conclusión y revisar el texto antes de descargar. El abogado puede elegir recomendación y motivo. PDF/Word usan la misma conclusión preparada y consideran toda la búsqueda para el análisis, aunque se detallen menos marcas.
12. Descargar **Informe de factibilidad** en PDF y Word: logo/encabezado, cuatro secciones, coberturas completas, imágenes, conclusión y firma opcional al final; direcciones/contactos en el pie. Sin datos de estudio, los campos se omiten.
13. **Notificaciones**: distinguir Prioritarias/Todas, revisar historia, retirar un aviso y mostrar la limpieza por bandeja. Se conserva evidencia y nuevas actuaciones pueden volver a generar avisos. Las tareas admiten X bajo el calendario y botón rojo en su editor; eliminarlas no borra plazos legales.
14. Abrir fichas laterales de clientes, marcas o casos y cerrarlas pulsando fuera. Los diálogos compartidos admiten Escape y devuelven el foco al origen. Verificar que nombres/coberturas largos se puedan leer y que el pie de los formularios siga accesible.

## Conclusión asistida y respaldo

OpenRouter recibe los antecedentes textuales de la consulta completa desde el servidor. No recibe una autorización para seguir instrucciones incrustadas en nombres/documentos. Sin clave, error, timeout o respuesta inválida, se conserva una conclusión determinista y la descarga permanece disponible. Un motivo escrito por el abogado se usa directamente. La integración se probó con un proveedor aislado; la clave real de Dev sigue pendiente. [Configuración y formato](INFORMES_FACTIBILIDAD_2026-10-02.md).

No presentar los ejemplos, puntajes del motor o la redacción asistida como un pronóstico oficial de concesión. La búsqueda es acotada y la revisión profesional conserva su lugar. La conclusión de SEMASK del PDF de referencia no se copia a otras marcas.

## Ejemplos del procedimiento

En **Solicitudes de registro → Explorar ejemplos del proceso**, recorrer los 22 expedientes ficticios para forma, publicación, oposición/fondo concurrentes, aceptación parcial, apelación, ejecutoria, pago y registro. No generan avisos ni cambios en la cartera. El transcurso del tiempo no acredita por sí solo notificación, firmeza, ausencia de oposición ni concesión. El calendario implementado cubre 2026–2027 y no extrapola años sin cobertura. [Reglas y límites](REGISTRATION_PROCESS_REVIEW.md).

## Límites y evidencia

Se guardan perfiles y contextos/resultados de conclusiones; el archivo completo de estudios con imágenes propuestas y el almacenamiento general de adjuntos siguen pendientes. El correo comparativo se copia, sin envío automático. No hay consulta directa documentada por registro en la fuente ni garantía de exhaustividad en el lote de semejanza.

La entrega funcional `b42ae34` quedó en Dev con despliegue `SUCCESS`, migraciones y perfiles preparados. PDF/Word pasaron revisión completa en seis variantes; pantallas y mutaciones se verificaron en base aislada. [QA](../design-qa.md) · [UI/UX](UX_OCTUBRE_2026.md) · [Publicación](RAILWAY_DEPLOYMENT.md). Las mejoras del 2 de octubre no se promovieron a producción.
