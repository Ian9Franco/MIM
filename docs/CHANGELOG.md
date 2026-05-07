# MIM — Changelog de Cambios

> Auditoría completa de cambios, features y mejoras del proyecto.  
> **Versión Actual:** Beta 5.2 (Tweak & Controls)  
> **Última actualización:** 2026-05-07

---

## 🛠️ Beta 5.2 — Tweak UI Mastery & Control Synergy (2026-05-07)

### Tweak Sidebar UX Refinement
- **Outside Click Closure**: Cierre automático del panel Tweak al hacer clic fuera para fluidez de navegación.
- **Header Toggle Integrity**: Los botones de la cabecera (ALRT, SAGE, TWEAK, FOMO) actúan como interruptores On/Off confiables, integrados con el sistema de cierre por fuera.

### Gestión Avanzada de Keybinds
- **Dynamic Mod Support**: El scanner de teclas detecta automáticamente cualquier prefijo `key_` en `options.txt`, permitiendo editar teclas de mods como **Iris** o **Sodium** sin configuración previa.
- **Direct Sync**: Sincronización instantánea de cambios de teclas con el archivo real de Minecraft.

### Visual Priority Stack (Resource Packs)
- **Pila de Prioridad Invertida**: Implementación visual del "Minecraft Inverted Stack". El primer pack de la lista MIM es el de mayor prioridad en el juego.
- **Controles de Ordenación**: Botones ↑ y ↓ para reordenar packs activos de forma intuitiva.
- **Validación de Reglas ⚠**: Advertencia visual automática si **Fresh Animations** no tiene mayor prioridad que sus patches.

### Z-Index Architecture
- Refactorización de niveles visuales. El header ahora reside en `z-[150]`, asegurando accesibilidad permanente sobre sidebars y backdrops.

---

## 🚀 Beta 5.1 — Thematic Tags & Intelligent Automation (2026-05-06)

### Sistema de Tags Unificado
- Integración de tags temáticos (Aventura, Optimización, Tecnología, etc.) en toda la app.
- Sustitución del término genérico "Categorías" por "Tags" para mayor precisión.

### Enriquecimiento Automático
- Los archivos en la carpeta de descargas obtienen sus tags automáticamente mediante búsqueda por hash en Modrinth.

### Modo "Auto" (Categorización Inteligente)
- Nuevo toggle **"Auto"** con animación de rotación suave que vigila descargas.
- **Reglas de Clasificación**: Mueve automáticamente mods a `.essential\librerias`, `.essential\tecnologia` o `.local\sonidos` basándose en sus tags.
- **Seguridad**: Validación automática de compatibilidad (Loader y Versión) antes de mover cualquier archivo.

### Excepción de Compatibilidad 1.20.1
- Regla lógica para tratar Forge y NeoForge como compatibles en la versión 1.20.1, eliminando advertencias erróneas.

### Acciones Masivas (Bulk Actions)
- **Eliminación por Lote**: Borrar permanentemente múltiples mods seleccionados en la bandeja de clasificación.
- **Retorno Masivo (Unclassify)**: Devolver múltiples mods de la librería a la carpeta de descargas en un solo clic.

### UX & Micro-animaciones
- **Bell Shaking v2**: Animación de campana más agresiva que se activa automáticamente al recibir nuevas notificaciones.
- **Fix de Referencias**: Corregidos errores de `useRef` y `ConfirmModal` no definidos.

---

## 🔄 Beta 5.0 — Sync Mastery & Premium UX (2026-05-06)

### Botón de Refresco Maestro
- Sistema de sincronización forzada con el disco. El botón "Sincronizar con Disco" dispara un re-escaneo profundo de la librería, actualizaciones y descargas pendientes.

### Watcher de Borrado Inteligente
- Detección de `unlink` (archivos borrados a mano en Windows) con actualización instantánea de la UI.

### Alert Center v2
- Changelogs integrados y botones de acceso web directo en las notificaciones.
- Fix del bug de notificaciones "fantasma".

### Modern Theme v2 (Cyan Edition)
- Reemplazo de amarillos por Cyan vibrante.
- Grid premium de 2 columnas para subcategorías con profundidad visual.

---

## 🔮 Beta 4.5 — FOMO 3.0 & Dynamic Floating Glass Layout (2026-05-05)

### Ancho Dinámico "Glass Gutter"
- Rediseño de geometría de pantallas. Al abrirse los detalles de un mod, el panel de FOMO se contrae fluidamente de `75vw` a `calc(100vw - 600px - 40px)`.
- La barra lateral derecha se ensancha de `380px` a `600px`.
- Creación de una separación vertical ("gutter") de `40px` mostrando el fondo de la app principal con desenfoque cinematográfico.

### Grilla Reactiva con Columnas Forzadas
- Layout de exactamente **2 columnas** max tanto en el buscador de FOMO como en Colecciones cuando se abren los detalles del proyecto.

### Colecciones Enriquecidas con Selección
- Lógica de selección de mods y descarga en lote (Bulk Download) con barra inferior de acciones masivas en el tab "Mis Colecciones".

### Portal Polling Resolution
- Sistema de sondeo recursivo cada `20ms` (hasta 10 reintentos) en `FomoVersionOverlay` para buscar el nodo portaleado `#fomo-details-sidebar-portal`.

---

## 🚀 Beta 4.0 — FOMO QoL & Advanced Filtering (2026-05-05)

### Multi-Filtro Inteligente
- Panel de filtros avanzados con soporte para multi-selección de versiones, categorías (tags) y entornos (Client/Server).

### Persistencia de Selección
- La selección de mods para descarga masiva persiste entre páginas y cambios de fuente (Modrinth/CurseForge) usando `localStorage`.

### Bulk Download
- Barra de acciones masivas para descargar todos los mods seleccionados con un solo clic.

### Aesthetic Dual-Source
- **CurseForge Style**: Estilo "Rústico y Cuadrado" para tarjetas de CurseForge.
- **Modrinth Style**: Look "Glassmorphism" moderno y redondeado.

### Detalles Enriquecidos
- **Environment Badges**: Visualización clara de compatibilidad Client-side / Server-side.
- **Plataformas Expandidas**: Listado de todos los modloaders compatibles detectados.
- **Main Versions Highlight**: Resaltado visual de versiones "Main" (1.20.1 y 1.21.1) en todos los selectores.

---

## 🛡️ Beta 3.5 — Security Layer v1.1 (Cloud & Whitelisting) (2026-05-04)

### Threat Detection Engine v1.0
- Análisis de bytecode para detectar malware y llamadas de red sospechosas.

### Risk Scoring System
- Clasificación de riesgo 0-100 con insignias visuales (Clean, Caution, Suspicious, Critical).

### VirusTotal Integration v3
- Integración de hashes SHA-256 con la API pública de VirusTotal para corroborar reputación de archivos.

### Whitelist System Local
- Lista blanca de mods ultra populares (Sodium, Iris, Curios, etc.) que previenen falsos positivos.

---

## 🔥 Beta 3.0 — Integraciones Críticas (2026-05-04)

### CurseForge Integration
- API de Eternal implementada: Endpoint `/api/curseforge/discover`.
- FOMO Sidebar Toggle: Botones para alternar entre Modrinth y CurseForge.
- Mapeo de IDs: Traducción automática de IDs de proyecto entre plataformas.
- UI Adaptativa: Indicador "CurseForge" en mods de CF.

### Modrinth Collections & Presets
- Sincronización completa de colecciones creadas por el usuario y "Following".
- Fix de error 404/502 cuando el usuario no tenía colecciones creadas.
- Nuevo Tab "Plantillas": 5 plantillas pre-armadas (Starter Tech, Vanilla+, etc.).

---

## 🎨 Beta 2.5 — FOMO Discovery Sidebar (2026-05-04)

### Integración con Modrinth
- Nueva barra lateral desplegable para descubrir contenido (Mods, Packs, Shaders, Datapacks).

### Dynamic Text & Filters
- El FOMO adapta sus textos y oculta selectores innecesarios según el tipo de asset.

### Sorting Inteligente
- Soporte para Relevancia, Nuevos y Actualizados.

---

## 📦 Beta 2.0 — Universal Asset Management (2026-05-04)

### Scanner Multi-Asset
- `lib/scanner.ts` ahora detecta automáticamente Resourcepacks, Datapacks y Shaders.

### Thumbnail Local Extraction
- Extracción automática de iconos (`pack.png` o mod icons) en Base64 para visualización instantánea sin internet.

### Clasificación por Contexto
- Los archivos no-mod se mueven automáticamente a las carpetas del proyecto activo.

### Aislamiento Total
- Packs y configs son 100% específicos de cada proyecto.

---

## 🎨 Beta 1.5 — UI & UX Polish (2026-05-04)

### Global Scaling
- Interfaz un 15% más grande (base 17px) para mejor legibilidad.

### Pixel-Perfect Icons
- Uso de `image-rendering: pixelated` para iconos de Minecraft ultra nítidos.

### Categorización Visual
- Agrupación por subcategorías en la librería (Fauna, Tecnología, etc.).

---

## 🔴 Beta 1.0 — Critical Bug Fixes & Core Stability (2026-05-04)

### Data Loss Guard
- Bloqueo de operaciones de clasificación si el origen y destino son idénticos.

### Modrinth Discovery Fix
- Eliminado filtro que ocultaba Datapacks erróneamente.

### Download Loader Filter
- Corregido error que impedía bajar Packs/Shaders por filtros de loader incompatibles.

### Watcher Race Condition
- Delay de 500ms para asegurar que archivos grandes terminen de escribirse antes del escaneo.

---

## 📊 Estadísticas del Desarrollo

| Período | Archivos Modificados | Bugs Corregidos | Features Agregadas |
|---------|---------------------|-----------------|-------------------|
| 2026-05-07 | 8+ | 3 | 4 (Tweak UI) |
| 2026-05-06 | 12+ | 5 | 6 (Auto, Tags) |
| 2026-05-05 | 15+ | 4 | 8 (FOMO 3.0) |
| 2026-05-04 | 20+ | 8 | 12 (Security, CF) |

---

*MIM — Minecraft Intelligent Manager*
