# Plan de Implementación: YouTube Showcases y Optimización de Spotlight

## 1. Optimización y Correcciones en Spotlight
- **Caché de UI:** Implementar carga en segundo plano (lazy loading) y cachear los resultados en la primera carga. Esto evitará solicitudes repetitivas a la API y la constante visualización de estados de carga al navegar entre pantallas.
- **CurseForge Picks:** Revisar los resultados "hardcodeados" (ej. "Best mods of 2024", picks de febrero). Evitar que la API devuelva por defecto resultados genéricos de exploración (como JEI o Jade) simulando que son colecciones curadas.

## 2. Nueva Funcionalidad: YouTube Showcases
Añadir soporte para extraer e integrar automáticamente los mods presentados en videos de creadores de contenido (ej. EnderVerse).

### Distribución en la Interfaz
- **Sección Spotlight:** Agregar una nueva fila/columna que muestre **exclusivamente el video más reciente** del creador. Mantiene la página viva, actualizada y libre de basura visual.
- **Sección Seguidos:** Añadir un apartado "Showcases" o "Canales" como archivo histórico. Mostrará una lista vertical minimalista con miniaturas de los últimos 10-20 videos. Al hacer clic, se desplegará la grilla con todos los mods de ese video en particular.

## 3. Arquitectura Técnica

### Backend (Electron - Main Process)
Se encargará del trabajo pesado para evitar bloqueos en la UI y problemas de CORS.
- **Herramienta:** Instalar y utilizar la librería `yt-dlp-wrap`.
- **Lógica de Extracción:**
  1. Solicitar la metadata de YouTube usando `yt-dlp` (para Spotlight, limitando a 1 resultado con `--playlist-end 1`).
  2. Extraer la descripción completa del video.
  3. Utilizar Expresiones Regulares (Regex) para aislar los links de los mods:
     - *Modrinth:* `/modrinth\.com\/mod\/([a-zA-Z0-9-_]+)/g`
     - *CurseForge:* `/curseforge\.com\/minecraft\/mc-mods\/([a-zA-Z0-9-_]+)/g`
  4. **Saneamiento y Limpieza de Slugs (Pro-Tip):** Limpiar cualquier query parameter (`?hl=en-US`, `?vip=true`, etc.) o fragmento residual que pueda quedar pegado al slug extraído antes de enviarlo al frontend para evitar fallos en la consulta a la API de Fomo.
  5. Formatear y devolver al Frontend una estructura limpia de slugs sin duplicados (ej. `["modrinth:slug", "curseforge:slug"]`), junto al título y miniatura del video.
- **Comunicación:** Exponer esta funcionalidad a través de un handler IPC (`ipcMain.handle('get-latest-showcase')`).

### Frontend (Next.js - Renderer Process)
- **Componente Carrusel (`CommunityShowcase`):**
  1. Al montarse, invoca el puente IPC de Electron para obtener los datos.
  2. Renderiza una **Tarjeta Disparadora** inicial con la miniatura del video y la cantidad de mods detectados. Al hacerle clic, puede llevar al video en YouTube.
  3. Itera sobre los identificadores devueltos, separando plataforma y slug (`platform:slug`), e instancia los componentes `ModCard` preexistentes.
  4. El submódulo `fomo` se encargará transparentemente de hacer las peticiones a Curse/Modrinth usando estas `ModCards`.
- **Manejo de Errores en `ModCard` (Pro-Tip):** Implementar una gestión robusta para mods que ya no existen, han sido eliminados o cuyos slugs cambiaron (especialmente en showcases antiguos). La tarjeta debe fallar elegantemente de forma silenciosa (auto-ocultándose) o mostrando un placeholder sutil para no romper la UI del carrusel completo.

### Optimización y Persistencia (Evitando Rate Limits)
- **Capa de Caché Local:** Reutilizar la persistencia/base de datos local de MIM para almacenar los detalles de los mods individuales ya consultados por Fomo. Al cargar carruseles grandes o históricos (10-20 videos), priorizar siempre la base de datos local y sólo realizar peticiones externas si el mod no está registrado localmente. Con esto reducimos drásticamente el consumo de API rate limits en CurseForge y Modrinth.
