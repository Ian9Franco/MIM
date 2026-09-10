MIM
MIMhub (Mobile)
• Header y altura de pantalla (iPhone 17 / Safari): Al abrir un mod y ver detalles, el encabezado ocupa ~70% de la pantalla vertical, dejando poco espacio para el contenido principal (descripción, galería, resumen, versiones, dependencias). Variar el tamaño según la sección y hacer que la pestaña suba/baje resulta poco práctico. Revisar diseño funcional (referencia: sección de dependencias/versiones).

• Tema Modern (Contraste): El bloque de entorno (cliente, servidor, ambos) tiene mal contraste sobre fondo blanco. Corregir legibilidad.
MIM (Desktop)
• Navegación y selección de Mods en "Descubrir":

  • Comportamiento actual: Al hacer clic en un mod, solo se selecciona, y para ir a detalles hay que hacer clic explícitamente en el botón de detalles.

  • Nuevo comportamiento deseado:

    • Un clic abre la vista de detalles.

    • Doble clic selecciona el mod.

    • Si un mod ya tiene abierta la vista de detalles y se le hace clic de nuevo, se selecciona.

• Filtro de búsqueda por defecto (exportado de MIMhub):

  • Implementar por defecto el filtro "Ambos" para buscar simultáneamente en Modrinth y CurseForge (excluyendo Bedrock).

• UI/UX de Fomo Cloud:

  • Debe heredar el diseño de la sección "Comunidad" de MIMhub, pero con un enfoque más optimizado.

• Efectos 3D y profundidad en Spotlight:

  • Optimizar el intento actual de dar efecto de profundidad en la sección Spotlight.

• Rediseño de la sección "Editorial":

  • Repensar la sección. Idea: incluir un Slime con la estética/logo de MIM renderizado en 3D.

• Sección de Seguidos:

  • Rediseñar por completo la sección de "Seguidos".
MIMBot (MIM Desktop & MIMhub)
• Disponibilidad y Ubicuidad: Debe estar disponible de alguna forma en casi todo momento dentro de ambas plataformas.

• Interfaz y UX: Pulir la interfaz de interacción para que sea más fluida y familiar a las interfaces modernas de LLMs.

• Enfoque de respuestas: Respuestas concisas y directas al grano. Si el usuario desea profundizar, debe ofrecer enlaces/accesos directos a la vista de detalle del mod/textura/recurso.

• Funcionalidades de Asistente Proactivo:

  • Notificaciones de Perfil: Avisar sobre actualizaciones en mods que seguimos, tenemos en drafts o agregados a colecciones.

  • Resumen de Changelogs: Al preguntarle por una actualización puntual, debe resumir brevemente las nuevas features implementadas.

  • Novedades de Contenido: Notificar sobre nuevos videos de canales seguidos que hablen de mods interesantes.

• Estrategia por Plataforma y Eficiencia:

  • MIM Desktop: Debe incluir features más potentes e interesantes que la versión mobile.

  • Optimización de Costos: Priorizar la economización máxima del uso de tokens/llamadas API.

  • Evaluación de LLM Local (Desktop): Analizar la viabilidad y conveniencia de implementar un LLM local para la versión de escritorio.