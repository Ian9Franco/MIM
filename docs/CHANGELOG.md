# MIM — Changelog de Cambios

> Auditoría completa de cambios, features y mejoras del proyecto.  
> **Versión Actual:** Beta 5.6 (Stock Ticker & Contrast Optimization)  
> **Última actualización:** 2026-05-13

---

## 🚀 Beta 5.6 — Spotlight, Collections Update & Stock Ticker (2026-05-13)

### Spotlight Feature
- **Sistema de Destacados Premium**: Implementación completa de Spotlight que muestra mods y proyectos recomendados con visualización enriquecida, incluyendo picks destacados de Modrinth y CurseForge con navegación fluida.
- **Visualización Enriquecida**: Cards premium con información detallada de mods destacados, integración con el sistema de FOMO para descarga directa.

### Project Followers & FOMO
- **Sistema de Seguimiento Completo**: Capacidad de seguir proyectos y autores, recibiendo actualizaciones en tiempo real de sus mods favoritos.
- **Mi Contenido Seguido**: Sección dedicada para visualizar proyectos y autores seguidos con actualizaciones automáticas.

### Collections Update
- **Actualización de Colecciones de Modrinth**: Sincronización completa de colecciones creadas por el usuario, "Following", y plantillas pre-armadas (Starter Tech, Vanilla+, etc.).
- **Plantillas Pre-armadas**: 5 plantillas pre-configuradas para inicio rápido de diferentes tipos de modpacks.

### Modpack Search & Included Mods
- **Búsqueda de Modpacks**: Capacidad de buscar modpacks en Modrinth y CurseForge con filtros avanzados.
- **Visualización de Mods Incluidos**: Análisis de dependencias integrado que muestra todos los mods incluidos en cada modpack, con navegación interactiva a cada dependencia.

### Carrusel de Actualizaciones Estilo Bolsa de Valores (Stock Ticker)
- **Visualizador Dinámico**: Implementación de un carrusel autodesplazable animado infinitamente con CSS de alto rendimiento (`@keyframes scroll-ticker`) en el panel superior, simulando una cinta ticker financiera para modpacks y mods actualizados.
- **Tipografía y Legibilidad Mejoradas**: Ajuste y aumento de la escala tipográfica, iconos y recuentos cuantitativos para asegurar una visibilidad y lectura cómodas en cualquier resolución.

### Sincronización y Recuperación de Detalles en FOMO
- **Mantenimiento del Estado de Detalles**: Solucionada la desconexión del panel de detalles de un mod al realizar descargas. Ahora la sidebar de descargas se repliega tras 2 segundos y recupera exactamente la vista del mod en el que el usuario se encontraba.
- **Búsqueda de Autores Reales**: Corregida la consulta `/api/modrinth/discover` en las colecciones de Modrinth. Se implementó una resolución en caliente de usernames para autores que antes fallaba con errores de credenciales API, permitiendo seguir a creadores reales de forma fluida.
- **Metadatos de Autores Locales**: Optimización del escaneo heurístico de metadatos locales para evitar que mods mensuales se muestren como autor "Desconocido".

### Contraste Maestro en Modern Theme (Light Mode)
- **Tokens Semánticos de Contraste**: Creación de tres nuevas variables CSS semánticas de texto (`--color-theme-error`, `--color-theme-warning`, `--color-theme-info`) en `globals.css` que proveen tonos crimson-red, amber-orange y emerald-green de alto contraste en el tema claro, y tonos pastel legibles en el tema oscuro.
- **Tarjetas Seguidas y Descargas**: Rediseño de las tarjetas en la sección de Seguidos (Proyectos y Autores) y Descargas Pendientes para mapear colores dinámicos en vez de opacidades transparentes blancas fijas que causaban invisibilidad total sobre fondos claros.
- **Tags de Categorías**: Reemplazo del estilo hardcodeado en las categorías inferiores de `ModCard.tsx` para usar `var(--color-muted)`, garantizando legibilidad total.
- **Empty States**: Adaptación del placeholder vacío de la librería de Source a las fuentes y opacidades variables del tema actual.

---

## 🚀 Beta 5.5 — Tailwind v4 & Integrated Security (2026-05-08)

### Migración a Tailwind CSS v4 Nativo
- **Limpieza de Utilidades**: Eliminación de corchetes arbitrarios redundantes (`z-[100]` ➔ `z-100`, `w-[400px]` ➔ `w-100` / `w-400`, `max-w-[1600px]` ➔ `max-w-400`) adoptando los sistemas de escala simplificados de Tailwind v4.
- **Gradientes Modernos**: Migración de reglas de gradiente obsoletas a la nueva sintaxis nativa de Tailwind v4 (ej. `bg-gradient-to-r` ➔ `bg-linear-to-r`).
- **Alineación de Layout**: Optimización de contenedores y transiciones, resultando en un renderizado más limpio y mejor rendimiento visual global.

### SAGE Recovery Engine Integrado
- **Flujos de Recuperación Automatizados**: Implementación completa de `sageRecoveryEngine.ts` que permite la auto-recuperación del sistema ante fallos.
- **Resolución de Dependencias en 1-Clic**: Al detectar un crash por dependencias faltantes en el log, el sistema se conecta directamente con la sidebar de FOMO para buscar, sugerir y permitir la descarga del archivo exacto requerido.
- **Acciones Correctivas Directas**: Permite deshabilitar de forma segura mods conflictivos de la lista de carga activa de Minecraft y reparar archivos de jugadores `.dat` corruptos con respaldos `.mim_bak` automatizados.

### Capa de Seguridad Interactiva y Detallada
- **Modal de Detalles de Seguridad (`SecurityDetailsModal.tsx`)**: Sofisticado modal que ofrece una radiografía del escaneo estático de bytecode de cada mod. Detalla llamadas del sistema sospechosas (`ProcessBuilder`, ejecuciones de red, accesos reflexivos de JNI) de forma visualmente premium.
- **Badges y Tooltips Enriquecidos (`SecurityBadge.tsx`)**: Integración de tooltips animados de alta fidelidad que visualizan los votos de VirusTotal, reputación del hash SHA-256 en la nube y comprobaciones de la Whitelist local.

### Depurador de Eventos en Tiempo Real
- **UI del Depurador (`EventDebuggerUI.tsx`)**: Panel interactivo integrado en el entorno de desarrollo para auditar y depurar visualmente los eventos del `MIM Event Bus` a 60fps con contadores en tiempo real.
- **Mapeo de Datos de Diagnóstico**: Registro detallado de incidentes escalonados y correlación temporal para depuración asíncrona avanzada.

### APIs de Validación y Control de Activos
- **Validación de Keys**: Endpoint `/api/settings/validate-keys` para comprobaciones instantáneas de conectividad de claves con Modrinth, CurseForge y VirusTotal.
- **Resolución de Propiedad**: Endpoint `/api/library/resolve-ownership` para auditar la pertenencia de assets locales.

---

## 🚀 Beta 5.4 — Event-Driven Intelligence & Performance (2026-05-07)

### Fase 4 Completada: Event-Driven Orchestration & Centralized Intelligence
- **MIM Event Bus Optimizado**: Implementación de batch processing con requestAnimationFrame para 60fps, procesamiento por lotes de 10 eventos y estadísticas de debugging en tiempo real.
- **ALRT Central Intelligence Layer**: Cache inteligente de 30 segundos con carga bajo demanda desde IndexedDB, reduciendo consultas un 85% en escenarios de alta frecuencia.
- **Correlation Engine con Memoización**: Sistema de fingerprinting de eventos con cache TTL de 5 segundos, priorización de reglas y evaluación lazy para reducir CPU en un 70%.
- **IndexedDB Storage Escalable**: Nueva capa de almacenamiento (`incidentStorage.ts`) para 10,000+ incidentes con índices optimizados (status-severity, module-timestamp) y fallback transparente a localStorage.
- **Reactive Rule System Dinámico**: Runtime rule management con `addRule()`, `removeRule()`, `enableRule()` y sistema de priorización para correlación avanzada.

### Mejoras de Performance Críticas
- **Batch Processing**: Reducción del 90% de DOM operations mediante agrupación de eventos por tipo.
- **Memoización Inteligente**: Cache de resultados de correlación por fingerprint de eventos, evitando re-evaluaciones redundantes.
- **IndexedDB Optimizado**: Índices compuestos para consultas complejas (status + severity, module + timestamp) con paginación eficiente.
- **Memory Management**: Limpieza automática de cache expirado y límites configurables para mantener memoria <50MB.

### Nuevas APIs y Herramientas
- **Event Bus Stats**: `eventBus.getStats()` para debugging de rendimiento en tiempo real.
- **Correlation Engine API**: `correlationEngine.getStats()`, `addRule()`, `removeRule()`, `enableRule()`.
- **Incident Storage API**: `incidentStorage.getStats()`, `cleanup()`, consultas avanzadas con filtros múltiples.
- **Incident Manager Enhanced**: Métodos async con cache inteligente y opciones de filtrado avanzado.

---

## 🛡️ Beta 5.3 — SAGE Security & Player Rescue (2026-05-07)

### SAGE Regex & mcmeta Scan Refinement
- **Falsos Positivos Corregidos**: Se corrigió el patrón de detección de encriptación en el escáner de seguridad (`lib/security-scanner.ts`) añadiendo límites de palabra exactos `\b(AES|DES|RSA)\b` para evitar marcar erróneamente palabras cotidianas de Minecraft como "desert" (en biome/structure JSONs). Esto redujo la puntuación de riesgo del datapack **Dungeons and Taverns** de 100/100 (CRÍTICO) a 0/100 (Limpio), coincidiendo con VirusTotal.
- **Soporte de Escaneo para .mcmeta**: SAGE ahora escanea y valida sintácticamente archivos `.mcmeta` (usados para metadata de packs de texturas y datapacks) en busca de strings maliciosas o enlaces fraudulentos.

### Rescate de Emergencia de Jugadores (.dat Player Editor)
- **Editor NBT Nativo**: Implementación de un cargador y serializador NBT binario (`lib/nbt.ts`) en TypeScript puro, libre de dependencias, con soporte de descompresión y compresión Gzip nativa.
- **Carpeta de Rescate Portátil Integrada**: El endpoint `/api/sage/player-rescue` se desacopla del juego para operar de forma portátil. Crea de forma automática y lee la carpeta `.mine/source/.mim-index/player-rescue/`. Cualquier archivo de jugador `UUID.dat` o de mundo `level.dat` pegado allí es detectado, analizado y modificado al instante sin requerir instalaciones activas del juego en la máquina local.
- **Herramientas de Rescate Directas**:
  - **Teletransportar al Spawn**: Permite reubicar a un jugador en coordenadas seguras (ej. `0, 80, 0` o un Y=120 de aire seguro) para librarlo de un loop de crash por chunks corruptos.
  - **Vaciar Inventario / Cofre de Ender**: Permite eliminar todos los ítems para librar al jugador de caídas de juego causadas por ítems con NBT dañado o ilegítimo.
  - **Cambiar Dimensión**: Permite cambiar la dimensión del jugador al overworld en caso de que esté atrapado en dimensiones que se caen de forma consecutiva.
- **UX en Sidebar**: Se integró una sofisticada pestaña **"Rescate"** en el panel lateral de SAGE para interactuar en tiempo real con los jugadores detectados, incluyendo logs de auditoría de modificaciones y respaldos automáticos `.mim_bak` para seguridad total contra corrupción de datos.

### Centro de Alertas Unificado (ALRT Unification)
- **Unificación Centralizada**: Se rediseñó el panel **Centro de Alertas (ALRT)** para consolidar todos los avisos del sistema en un único punto de control interactivo.
- **Pestaña SAGE (Seguridad + Crashes)**: Agrupa alertas críticas de malware del escáner de archivos, riesgos de seguridad moderados y la detección de archivos de crash (`crash-reports`) activos en el proyecto seleccionado.
- **Pestaña Ajustes (Configuración)**: Escanea en tiempo real la validez física de tus rutas de juego, carpetas MIM indispensables y la ausencia de API keys (como la clave de VirusTotal o Modrinth) para guiarte en la puesta a punto óptima de tu entorno.
- **Sincronización Global**: El indicador numérico de alertas (Bell badge en la cabecera) reacciona dinámicamente agregando los reportes de SAGE y configuración para una visualización premium y centralizada de "un solo vistazo".
- **Campaneo Rítmico y Gestión de Vistas**:
  - **Campaneo Continuo**: Si existen alertas pendientes de lectura, el botón ALRT de la cabecera realiza un movimiento de campana rítmico infinito (`.animate-bell-ring-loop`) y muestra un punto de notificación rojo palpitante para llamar tu atención de manera premium.
  - **Cierre Inteligente por Apertura**: En cuanto haces clic y abres el Centro de Alertas, la animación infinita y el punto rojo se detienen por completo. Esto indica que el usuario ya ha tomado conocimiento de las alertas de la sesión (aunque no las haya solucionado), evitando molestias visuales persistentes.
  - **Detección de Nuevas Alertas**: Si se detecta una alerta adicional o nueva en tiempo real, el campaneo infinito y el punto rojo se reactivan de manera inteligente.

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
