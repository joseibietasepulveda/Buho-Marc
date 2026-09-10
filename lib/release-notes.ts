export const APP_VERSION = "0.4";
export const RELEASE_INCLUDED = [
  "Solicitudes de registro: vistas de lista, tarjetas y calendario, con estado procesal y último hito relevante.",
  "Calendarios de Casos y Solicitudes con mes, semana, próxima semana, tareas por día y lista inferior por categoría.",
  "Tareas persistentes con fecha, responsable, autoasignación, edición y eliminación. Tres colores por origen y énfasis rojo para vencimientos.",
  "Alertas de tareas y plazos visibles desde todos los módulos.",
  "Notificaciones Prioritarias y Todas, sin configuraciones; hitos desplegables y aviso específico de título de marca.",
  "Factibilidad por nombre, imagen o descripción; búsqueda aproximada predeterminada y logos más grandes. Resultados todavía simulados.",
  "Cartera con búsqueda exacta por campos disponibles y alta con parámetros a la izquierda. Búsqueda por atributos con catálogo de demostración.",
  "Correo al cliente con cuadro comparativo copiable y firma de la sesión. PDF técnico reservado al abogado.",
  "Seguimiento INAPI, historial de actuaciones y los 22 ejemplos del procedimiento de la versión anterior.",
];
export const RELEASE_UPCOMING = [
  { title: "Correos al abogado con Resend", items: ["Recordatorios de tareas y plazos antes del vencimiento, con fecha, responsable y enlace al expediente.", "Aviso específico cuando INAPI emita el título o certificado de titularidad.", "Evitar duplicados y cancelar recordatorios cuando cambie el plazo, se complete la tarea o concluya el caso; registrar entrega, errores y reintentos."] },
  { title: "Integración con el Tribunal de Propiedad Industrial (TPI / TDPI)", items: ["Detectar el ingreso de la apelación al tribunal, además de su aparición en tabla.", "Alertar las gestiones de comparecencia y solicitud de alegatos desde el ingreso; validar con el abogado la regla y el cómputo del plazo de cinco días mencionado en la reunión."] },
  { title: "Motor de búsquedas fonéticas", items: ["Detectar términos o segmentos clave dentro de denominaciones extensas, aunque reduzcan la similitud global. Incluir casos de marcas muy cortas y de dos letras en la validación del motor."] },
  { title: "Encontrar cualquier marca para darle seguimiento", items: ["Conectar la búsqueda por nombre, registro, solicitud, titular, RUT y representante con la fuente real; reemplazar el catálogo mock detrás de la flag.", "Búsqueda aproximada por nombre que encuentre errores de escritura, variantes y similitudes fonéticas; ordenar por relevancia y explicar la coincidencia.", "Autocompletar nombres y titulares; combinar campos y clases Niza para acotar resultados.", "Cargar toda la cartera de un titular por RUT con selección múltiple, paginación y control de duplicados por solicitud y registro.", "Buscar por imagen o descripción y conservar filtros e historial de búsquedas para retomar una revisión."] },
  { title: "Patentes", items: ["Vigilancia de patentes dentro del módulo de Vigilancia.", "Seguimiento internacional de patentes PCT por jurisdicción, anualidades y corresponsales."] },
  { title: "Gestión de casos para reemplazar Trello", items: ["Completar comentarios, documentos, checklists y colaboración según los flujos del estudio, sobre las tareas y fechas ya disponibles."] },
  { title: "Otros desarrollos pendientes", items: ["Conectar los motores visual y semántico y la búsqueda real de factibilidad.", "Generar PDF técnico específico por vigilancia y almacenar archivos con acceso apropiado.", "Carga masiva desde Excel y validación Niza/Madrid.", "Autenticación real, calendario legal plurianual, permisos y operación productiva."] },
];
