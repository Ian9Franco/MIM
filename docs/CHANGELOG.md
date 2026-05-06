# MIM — Backend Changelog

### 🔄 Sync Mastery & Premium UX (2026-05-06)
- **Botón de Refresco Maestro**: Implementado sistema de sincronización forzada con el disco. El nuevo botón "Sincronizar con Disco" en la cabecera dispara un re-escaneo profundo de la librería, actualizaciones y descargas pendientes.
- **Sincronización de Borrados (Unlink)**: El observador de archivos (Watcher) ahora detecta eliminaciones físicas en la carpeta de descargas, eliminando automáticamente los elementos de la UI en tiempo real.
- **Centro de Alertas v2**:
    - **Botones de Acción Enriquecidos**: Añadidos accesos directos a "Web" (Modrinth) e "Info" (Changelog) para cada notificación de actualización.
    - **Visualizador de Changelog Integrado**: Desplegable nativo dentro de la alerta para leer los cambios de la versión sin salir de la app.
    - **Fix de Notificaciones Fantasma**: Refactorizado el filtrado de conteo para excluir mods eliminados o ignorados de los badges de notificación.
- **Refinamiento Modern Theme (Cyan Edition)**:
    - **Acentos Cyan**: Transición de acentos amarillos a Cyan vibrante para máxima legibilidad y contraste en fondos claros.
    - **Grid de Subcategorías Premium**: Rediseño del panel de subcategorías con grid de 2 columnas estandarizadas, glassmorphism avanzado y letras de fondo dinámicas para profundidad visual.
    - **Lógica de Fusión Inteligente**: Las subcategorías ahora se fusionan inteligentemente entre los defaults del sistema ("Rendimiento" añadido como esencial) y las personalizaciones del usuario.
- **Fixes de Estabilidad**: Corregidos errores de "Used before declaration" en hooks de React y APIs de servidor.

### 🔮 FOMO 3.0 & Dynamic Floating Glass Layout (2026-05-05)
- **Ancho Dinámico "Glass Gutter"**: Rediseño de la geometría de pantallas. Al abrirse los detalles de un mod, el panel de FOMO se contrae fluidamente de `75vw` a `calc(100vw - 600px - 40px)`, y la barra lateral derecha se ensancha de `380px` a `600px`. Esto crea una separación vertical ("gutter") de `40px` mostrando el fondo de la app principal con un desenfoque de fondo cinematográfico.
- **Grilla Reactiva con Columnas Forzadas**: Unificación del feed a una grilla responsiva. El sistema fuerza dinámicamente un layout de exactamente **2 columnas** max tanto en el buscador de FOMO como en Colecciones en cuanto se abren los detalles del proyecto para evitar que las tarjetas colapsen por la reducción del espacio.
- **Colecciones Enriquecidas con Selección**: Integrada la lógica de selección de mods y descarga en lote (Bulk Download) con su propia barra inferior de acciones masivas dentro del tab "Mis Colecciones" en una grilla premium idéntica a la sección de descubrimiento.
- **Acción de Selección Libre de Tarjeta**: Selección inteligente al clickear cualquier espacio libre de la tarjeta contenedora del mod.
- **Freno de Propagación en Clicks**: Implementado `e.stopPropagation()` en todos los botones interactivos internos (`Detalles`, `Descargar`, `Web`, `Colección`) para permitir acciones inmediatas directas sin disparar ni interferir con la selección del mod.
- **Portal Polling Resolution**: Implementado sistema de sondeo recursivo cada `20ms` (hasta 10 reintentos) en `FomoVersionOverlay` para buscar el nodo portaleado `#fomo-details-sidebar-portal`, previniendo race conditions en la renderización asincrónica de componentes hermanos de React.
- **Estética Unificada**: Cabecera reducida y limpia. Eliminación de filtros de ordenación redundantes del header superior, moviéndolos al panel de filtros flotantes para ganar altura vertical para el contenido.

### 🚀 FOMO QoL & Advanced Filtering (2026-05-05)
- **Multi-Filtro Inteligente:** Panel de filtros avanzados con soporte para multi-selección de versiones, categorías (tags) y entornos (Client/Server).
- **Persistencia de Selección:** La selección de mods para descarga masiva ahora persiste entre páginas y cambios de fuente (Modrinth/CurseForge) usando `localStorage`.
- **Bulk Download:** Implementada barra de acciones masivas para descargar todos los mods seleccionados con un solo clic.
- **Aesthetic Dual-Source:**
  - **CurseForge Style:** Nuevo estilo "Rústico y Cuadrado" para tarjetas de CurseForge, diferenciándolas visualmente de Modrinth.
  - **Modrinth Style:** Mantiene el look "Glassmorphism" moderno y redondeado.
- **Header Refactor:** Reubicación de los botones de distribuidor al header para maximizar el espacio vertical de la lista de resultados.
- **Detalles Enriquecidos:**
  - **Environment Badges:** Visualización clara de compatibilidad Client-side / Server-side (Requerido/Opcional).
  - **Plataformas Expandidas:** Listado de todos los modloaders compatibles detectados para cada proyecto.
  - **Main Versions Highlight:** Resaltado visual de las versiones "Main" (1.20.1 y 1.21.1) en todos los selectores.

### 🛡️ Security Layer (Threat Detection v1.0)
- **Bytecode Scanner:** Implementado motor de detección de amenazas en `lib/security-scanner.ts`.
- **Heuristic Engine:** Detección de llamadas de red, ejecución de procesos, abuso de reflexión y código nativo.
- **Risk Scoring:** Implementado sistema de puntuación 0-100 con niveles de riesgo visuales.
- **SHA1 Blacklist:** Soporte para bloqueo de hashes de malware conocidos.
- **API Security:** Nuevo endpoint `/api/security/scan` para auditoría bajo demanda.

### 🎨 FOMO UI 2.0 (High Density)
- **Grid de 2 Columnas:** El panel de descubrimiento ahora utiliza una rejilla de dos columnas, duplicando la visibilidad de mods por scroll.
- **Sidebar Widened:** Ancho del sidebar aumentado a `750px` para acomodar el nuevo layout.
- **Detailed Version Overlay:** Panel de detalles premium con:
  - **Tabs:** Historial de Versiones, Dependencias y Descripción (Markdown).
  - **Dependency Resolver:** Visualización de dependencias requeridas (Rojo) y opcionales (Violeta) con botón de descarga directa.
  - **Full Changelogs:** Renderizado completo del historial de cambios en un contenedor scrolleable.

### 🔧 Fixes & Estabilidad
- **TypeScript Strictness:** Corregidos errores de tipos en el mapeo de `VersionEntry` y props de componentes.
- **Limpieza de UI:** Eliminados los `alert()` intrusivos para una experiencia silenciosa.
- **SHA1 Matching:** El matching de Modrinth ahora es 100% preciso basado en hashes.

---

> Auditoría y refactor completo del backend. Fecha: 2026-05-04  
> Archivos modificados: **15+** · Bugs corregidos: **2** · Mejoras: **10+**

---

## 🔥 Novedades (2026-05-04) — Integraciones Críticas

### 🚀 CurseForge Integration
- **API de Eternal Implementada:** Endpoint `/api/curseforge/discover` con soporte completo para búsqueda de mods, resourcepacks, shaders y datapacks.
- **FOMO Sidebar Toggle:** Nuevos botones para alternar entre Modrinth y CurseForge con colores distintivos (verde Modrinth, naranja CurseForge).
- **Mapeo de IDs:** Traducción automática de IDs de proyecto entre plataformas y mapeo de loaders (Forge→1, Fabric→4, NeoForge→6).
- **UI Adaptativa:** Indicador "CurseForge" en mods de CF. Botón de descarga cambia a "Abrir externo" ya que CF requiere descarga manual.
- **Error Handling:** Banner informativo cuando `CURSEFORGE_API_KEY` no está configurada (HTTP 503).

---

### 📦 Modrinth Collections & Presets
- **Sincronización Completa:** Endpoint `/api/modrinth/collections` ahora integra tanto colecciones creadas por el usuario como colecciones seguidas (Following).
- **Fix de Conexión:** Corregido error 404/502 cuando el usuario no tenía colecciones creadas; ahora el sistema maneja gracefully la ausencia de datos y busca en follows.
- **Acción Directa:** Soporte para descarga masiva de colecciones directamente a la carpeta Downloads del sistema.
- **Nuevo Tab "Plantillas":** Tercer tab en FOMO Sidebar junto a "Descubrir" y "Mis Colecciones".
- **Colecciones Curadas:** 5 plantillas pre-armadas (Starter Tech, Vanilla+, etc.) con auto-configuración de loader y versión.

---

### 🎨 UX & UI Improvements
- **Selector Manual de Versiones:** Implementado selector para Datapacks y assets ambiguos, permitiendo elegir versiones específicas (ej: v44.44.44) antes de descargar.
- **README Killer (Español):** Reescritura completa con Hero potente, diagramas de arquitectura y case study técnico.

---

## 🔥 Novedades (2026-05-04)

### 🚀 FOMO Discovery Sidebar
- **Integración con Modrinth:** nueva barra lateral desplegable para descubrir contenido (Mods, Packs, Shaders, Datapacks).
- **Dynamic Text & Filters:** el FOMO ahora adapta sus textos y oculta selectores innecesarios (ej: Loader en Shaders) según el tipo de asset.
- **Sorting Inteligente:** soporte para Relevancia, Nuevos y Actualizados.

### 📦 Universal Asset Management
- **Scanner Multi-Asset:** `lib/scanner.ts` ahora detecta automáticamente Resourcepacks, Datapacks y Shaders.
- **Thumbnail Local Extraction:** extracción automática de iconos (`pack.png` o mod icons) en Base64 para visualización instantánea sin internet.
- **Clasificación por Contexto:** los archivos no-mod se mueven automáticamente a las carpetas del proyecto activo (`_projects/.../resourcepacks`, etc.).
- **Aislamiento Total:** packs y configs son 100% específicos de cada proyecto.

### 🎨 UI & UX Polish
- **Global Scaling:** interfaz un 15% más grande (base 17px) para mejor legibilidad.
- **Pixel-Perfect Icons:** uso de `image-rendering: pixelated` para iconos de Minecraft ultra nítidos.
- **Categorización Visual:** agrupación por subcategorías en la librería (Fauna, Tecnología, etc.).

### 🔴 Critical Bug Fixes
- **Data Loss Guard:** bloqueo de operaciones de clasificación si el origen y destino son idénticos.
- **Modrinth Discovery Fix:** eliminado filtro que ocultaba Datapacks erróneamente.
- **Download Loader Filter:** corregido error que impedía bajar Packs/Shaders por filtros de loader incompatibles.
- **Watcher Race Condition:** delay de 500ms para asegurar que archivos grandes terminen de escribirse antes del escaneo.
