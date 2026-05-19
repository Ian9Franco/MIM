# MIM — Changelog Maestro de Cambios

> Auditoría completa de cambios, features y mejoras de Minecraft Intelligent Manager.  
> **Versión Actual:** 7.4.2 (SWR Caching, Video Dates & Volume Controls)  
> **Última actualización:** 2026-05-19

---

## 🚀 Versión 7.4.0 — SWR Caching, Video Dates & Volume Controls (2026-05-19)

### FOMO (YouTube Showcases & Reproductor)
- **SWR (Stale-While-Revalidate) de Showcases**: Carga instantánea de videos y shorts cacheados localmente en `localStorage` al cambiar de canal o pestaña, evitando pantallas de carga eternas y realizando una sincronización silenciosa en segundo plano.
- **Barra de Carga Superior (Trickle Progress Bar)**: Indicador visual premium con degradado neón (`from-red-500 via-orange-500 to-red-600`) que simula el progreso no lineal al cargar contenido y se desvanece de forma fluida (fade-out) al 100%.
- **Sincronización en Segundo Plano**: Indicador animado `🔄 Actualizando...` que notifica al usuario si se está refrescando la lista de videos silenciosamente por detrás.
- **Control de Volumen Analógico**: Deslizador de volumen fluido con soporte completo para silenciado directo (Mute) que recuerda el último nivel, integrado al 100% con la API del reproductor de YouTube.
- **Fecha de Creación de Videos**: Parseador automático de la fecha nativa de carga (`YYYYMMDD` ➔ `DD mes YYYY`) para mostrar el momento exacto de publicación tanto en el Spotlight central como en las listas secundarias.
- **Compatibilidad de Canales Universal**: Normalización robusta en backend para cualquier URL de YouTube (canales no-Minecraft, IDs `/channel/`, alias legacy, etc.).
- **Fallback de Mods Vacío**: Tarjeta informativa premium y contextual para videos sin mods detectados, permitiendo la reproducción multimedia nativa limpia.

---

## 🚀 Versión 7.1.1 — FOMO Showcases & Standalone Cache (2026-05-18)

### FOMO (YouTube Showcases & Seguidos)
- **Integración de YouTube Showcases**: Extracción automática de mods desde descripciones de videos y shorts de YouTube.
- **Carga Perezosa (Lazy Loading)**: Los videos se cargan de 5 en 5 para optimizar el rendimiento y consumo de red.
- **Gestión de Canales**: Dropdown personalizado con opción de eliminar canales y botones de **Accesos Rápidos** para los 4 canales más usados.
- **Persistencia de Interfaz**: La app recuerda la subpestaña activa (Proyectos, Autores, Historial, Showcases) al navegar.
- **Enlace Directo**: Botón para abrir el video de YouTube directamente desde la tarjeta.

### Backend & Optimización (Standalone)
- **Caché Físico en JSON**: Migración de `localStorage` a archivos JSON en `.MIM/source/.mim-index/` para persistir datos en modo standalone/Electron.
- **Seguridad contra Colisiones (MD5)**: Uso de hashes MD5 para evitar que canales distintos compartan el mismo archivo de caché.
- **Rutas .MIM**: Cambio de la carpeta base por defecto de `.mine` a `.MIM` para alinearse con el nombre del proyecto.

---

## 🚀 Versión 7.0.3 — Mejoras de Sistema & ALRT (2026-05-18)

### Features & Mejoras
- **Explorador de Configuraciones**: Sistema para visualizar y editar archivos de configuración (`.minecraft\config`) integrado en la sección Tweak.
- **Generación de `modlist.html`**: Implementación de generación automática de lista de mods para entornos host y user.
- **Jerarquía de Resourcepacks**: Mejora en la visualización y manejo de prioridades en Tweaks.
- **Preview de Entornos**: Previsualización de entornos `allhost` y `alluser` en Library Source.
- **Detección Inteligente de Actualizaciones**: Proyectos considerados "nuevos" o "actualizados" si tienen menos de 15 días.
- **Guía de Uso / Onboarding**: Sistema de ayuda interactiva para el primer inicio y por secciones (fomo, tweak, alrt, etc.).

### ALRT (Alerts & Monitoring)
- **Monitoreo de VirusTotal**: Visualización del estado de verificación en cola en ALRT y notificaciones al completar.
- **Integración de Seguidos**: Consulta de autores/proyectos seguidos en FOMO para mostrar actualizaciones en ALRT.

---

## 🚀 Versión 6.3.1 — FOMO Rankings & Live Details (2026-05-17)

### FOMO (Discovery & Rankings)
- **Sistema de Rankings Dinámicos**: Creación de tops de más descargados agrupados por tipo (Mods, Texturas, Shaders, Datapacks). Solo se muestran si hay un mínimo de 3 elementos para formar un Top 3.
- **Diseño en Podio**: Los rankings se muestran en la parte superior con un diseño estilo podio (1º destacado a lo ancho, 2º y 3º abajo compartiendo fila).
- **Detalles en Vivo**: Al abrir un proyecto desde el historial o ranking, se fuerza una petición a la API para cargar descargas, autor y galería actualizados.
- **Iconos en Categorías**: Añadidos iconos representativos a las pestañas de tipos de proyecto dentro de las colecciones.
- **Icono de Galería**: Actualizado el icono de la pestaña de galería a `<Images />` de Lucide.

### Seguimiento de Autores
- **Carrusel Dinámico de Iconos**: Las tarjetas de autores seguidos ahora rotan automáticamente (cada 5s) entre los iconos de todos los mods que posees de ese autor (historial y favoritos).
- **Persistencia de Icono**: Al seguir a un autor, se guarda el icono del mod desde el que lo seguiste para evitar tarjetas vacías.

### Backend & API
- **Persistencia de Autor en Historial**: Ahora se guarda el campo `author` al registrar una descarga en `download-history.json` para evitar autores desconocidos.
- **Ampliación de API Modrinth**: El endpoint `/api/modrinth/project` ahora devuelve el objeto completo del proyecto (`...data`), permitiendo el acceso a métricas de descargas reales.

### Correcciones y Optimizaciones (Bugfixes)
- **Fix NaN en Descargas**: Solucionado el problema que mostraba `NaNK` en la popularidad al abrir proyectos con datos incompletos.
- **Descongelado de Botón**: Corregido el botón "Seguir Autor" en detalles que no cambiaba a "Siguiendo" por un problema de tipos de datos al comparar objetos con strings.
- **Limpieza de Nulos**: Se añadió un filtro para ignorar y limpiar autores `null` o `"Autor Desconocido"` heredados de sesiones anteriores que causaban crashes.

## 🚀 Versión 6.3.0 — MIMU Mode & SAGE Redesign (2026-05-17)

### SAGE (Security Scanner)
- **Escaneo en Dos Pasos**: Implementación de un flujo donde el escaneo local (bytecode) se completa al instante y la verificación de VirusTotal se procesa en cola en segundo plano.
- **Cola Inteligente de VirusTotal**: Sistema que respeta el límite de 4 peticiones por minuto de la API gratuita, esperando 15 segundos entre llamadas cuando es necesario.
- **Caché Persistente**: Almacenamiento de resultados de VirusTotal en `.mim-index/vt-cache.json` para evitar re-consultas.
- **Etiquetas de Estado**: Añadidos badges visuales para `Whitelist`, `SAGE Local`, `VirusTotal` y `VT Omitido`.

### Modo MIMU (User Mode)
- **Soporte Extendido**: Ahora lee directamente de la carpeta `.minecraft` los mods, resourcepacks, shaders y datapacks de mundos sin necesidad de un proyecto activo.
- **Adaptación de Módulos**: GATE y SAGE ahora funcionan correctamente en modo MIMU leyendo del directorio global del juego.

### CurseForge y Clasificación
- **Community Picks**: Integración de colecciones curadas de CurseForge en el feed de Spotlight.
- **Heurísticas de Clasificación**: Solucionado problema con datapacks complejos (ej. Tectonic) y mejor detección de shaders.

## 🚀 Beta 5.9 — Architecture & Code Consolidation (2026-05-14)

### Consolidación y Limpieza Técnica
- **Fusión de Servicios**: Eliminación de `overrides.ts` y consolidación de toda la lógica de configuración y metadatos manuales en `projectConfig.ts`.
- **Heurísticas Centralizadas**: Creación de `lib/classification-data.ts`, `lib/security-data.ts` y `lib/sage-data.ts` para centralizar patrones de detección, keywords y reglas heurísticas, eliminando el hardcodeo disperso.
- **Utilidades de Versión**: Extracción de lógica compleja de comparación de versiones a `lib/version-utils.ts`.

### Optimización de Legibilidad (Clean Code)
- **Refactorización Masiva**: Reducción drástica de líneas de código en archivos críticos (>500 líneas):
  - `app/page.tsx`: Reducción del 80% mediante extracción de hooks (`useFileWatcher`) y componentes (`FomoSidebarPortal`).
  - `security-scanner.ts`: Reducción del 85% mediante modularización de reglas.
  - `sageRecoveryEngine.ts`: Reducción del 78% mediante extracción de patrones.
  - `PackHealthModal.tsx`: Reducción del 72% mediante extracción de sub-componentes.
  - `incidentStorage.ts`: Reducción del 78% mediante extracción de fallbacks de almacenamiento.
- **Desacoplamiento de UI**: Extracción de componentes DOM complejos y portales a archivos dedicados para mejorar el mantenimiento visual.

## 🚀 Beta 5.7 — Persistent Metadata & Priority Hierarchy (2026-05-14)

### Persistencia de Metadata Real
- **Arquitectura IndexedDB**: Implementación de una base de datos local robusta para almacenar entidades `ModEntity` utilizando el hash SHA1 como clave primaria, permitiendo la identificación única de mods independientemente de su nombre de archivo.
- **Deduplicación Inteligente**: Sistema de limpieza automática que reemplaza versiones antiguas basadas en ModID y versión técnica.
- **Enriquecimiento de Metadata**: Integración de un servicio de persistencia que orquesta el escaneo técnico profundo y el almacenamiento persistente de metadatos de entorno y loader.

### Priority Classification System (Modo Auto v2)
- **Clasificación Jerárquica Estricta**: Refactorización del motor de clasificación para seguir una jerarquía `Entorno > Tipo > Tags`. 
- **Conciencia de Entorno**: El sistema ahora prioriza la metadata técnica (`client`, `server`, `both`) sobre las heurísticas semánticas, garantizando que los mods se ubiquen en las carpetas físicas correctas (`.local`, `.server`, `.essential`).
- **Detección de Tipo Mandataria**: Las librerías y APIs ahora se detectan y clasifican con prioridad absoluta en la subcarpeta `librerias`.

### Interfaz y Experiencia de Usuario (UX)
- **Badges de Entorno Dinámicos**: Incorporación de etiquetas visuales (🖥️ CLIENT, ☁️ SERVER, 🌐 BOTH) en `ModCard` con colores temáticos para una identificación rápida de la compatibilidad del entorno.
- **Background Metadata Sync**: Proceso en segundo plano que hidrata la librería en tiempo real, escaneando mods faltantes sin interrumpir la navegación del usuario.
- **Sincronización Frontend-Backend**: Actualización del pipeline de clasificación para pasar metadatos persistentes entre el cliente y el servidor.

## 🚀 Beta 5.6 — Spotlight, Collections Update & Stock Ticker (2026-05-13)

### Spotlight & Discovery
- **Sistema de Destacados Premium**: Implementación completa de Spotlight que muestra mods y proyectos recomendados con visualización enriquecida, incluyendo picks destacados de Modrinth y CurseForge con navegación fluida.
- **Visualización Enriquecida**: Cards premium con información detallada de mods destacados, integración con el sistema de FOMO para descarga directa.
- **Bug de Selección Cruzada en Spotlight**: Unificación del estado global `activeSource` para solucionar el problema de carga de detalles y descargas de picks destacados en Spotlight tras alternar el distribuidor activo en Explorar.
- **Badge Unificado "MODPACK" & "DATAPACK"**: Incorporación de etiquetas distintivas de tipología para "Modpack" y "Datapack" tanto en las tarjetas del catálogo general como en Spotlight.

### Project Followers & Seguidos
- **Sistema de Seguimiento Completo**: Capacidad de seguir proyectos y autores en tiempo real en Modrinth y CurseForge.
- **Búsqueda Híbrida Inteligente**: Lupa de búsqueda dedicada para autores (`author:`) y proyectos (`project:`) en modo "Ambos" para comparar versiones y detectar discrepancias entre plataformas.
- **Mantenimiento del Estado de Detalles**: Restauración asíncrona automatizada de la vista de descripción de mods después de replegar temporalmente la barra de descargas.

### Collections & Modpacks
- **Actualización de Colecciones de Modrinth**: Sincronización de colecciones creadas por el usuario, "Following", y 5 plantillas pre-armadas (Starter Tech, Vanilla+, etc.).
- **Búsqueda de Modpacks & Dependencias**: Capacidad de buscar modpacks y visualizar los mods incluidos en cada uno, con redirección fluida a la Modcard general de cada dependencia.
- **Resolución de Autores Reales**: Integración de resolución en caliente para nombres de autores en colecciones de Modrinth, solucionando errores de API key.
- **CurseForge Modpack Embedded Dependencies Parser**: Algoritmo que descarga y analiza en caliente el archivo `manifest.json` interno de modpacks de CurseForge a través de enlaces reconstruidos de Edge CDN (`edge.forgecdn.net`).
- **Persistent Local Dependency Cache**: Almacenamiento persistente en disco (`fomo_modpack_dependencies_cache.json`) que guarda el mapeo de dependencias procesadas de CurseForge para cargas instantáneas.

### Interfaz, Ticker & Contraste Maestro
- **Carrusel de Actualizaciones Estilo Bolsa de Valores (Stock Ticker)**: Marquesina autodesplazable animada infinitamente (`@keyframes scroll-ticker`) en el panel superior para la visualización de mods actualizados.
- **Tipografía y Legibilidad Mejoradas**: Aumento de la escala tipográfica, iconos y recuentos cuantitativos para asegurar una visibilidad cómoda en cualquier resolución.
- **Tokens Semánticos de Contraste**: Variables CSS `--color-theme-error`, `--color-theme-warning`, `--color-theme-info` garantizando contraste y legibilidad en temas claros y oscuros.
- **Contraste en Modern Theme**: Rediseño de las tarjetas en Seguidos y Descargas Pendientes con colores dinámicos e identidades claras.

### Tweak & Rule-Based Optimization Engine
- **Sistema de Optimización Basado en Reglas**: Perfiles automáticos de rendimiento (JVM args recomendados según memoria, presets rápidos de video y sugerencias de optimización específicas para perfiles low/mid/high) en función del hardware detectado (CPU/GPU/RAM) y el volumen total de mods activos.

### Performance & Packaging
- **Extrema Optimización de Latencia (Cache Misses)**: Limitación del parseo en cache-misses a únicamente la versión más reciente por consulta API, reduciendo descargas en red a un tercio (1/3) del tiempo original.
- **Automated Windows Packaging (`npm run package:win`)**: Configuración completa de `electron-builder` para generar instaladores NSIS nativos y `.exe` portables automáticamente.
- **No-ASAR Standalone Run**: Ejecución nativa del servidor Next.js standalone vía `child_process.fork`.
- **Corporate Network Pinger**: Reconfiguración del pinger de inicio para usar IP local `127.0.0.1` y evitar bloqueos por proxies corporativos.
- **Standalone Electron Build Plan**: Plan integral para compilar Next.js + Electron de forma portable ([standalone-build-plan.md](./docs/standalone-build-plan.md)).

---

## 🚀 Beta 5.5 — Tailwind v4 & Integrated Security (2026-05-08)

### Migración a Tailwind CSS v4 Nativo
- **Limpieza de Utilidades**: Eliminación de corchetes arbitrarios redundantes (`z-[100]` ➔ `z-100`, `w-[400px]` ➔ `w-100` / `w-400`) adoptando los sistemas de escala simplificados de Tailwind v4.
- **Gradientes Modernos**: Migración de reglas de gradiente obsoletas a la nueva sintaxis nativa de Tailwind v4 (`bg-linear-to-r`).

### SAGE Recovery Engine Integrado
- **Flujos de Recuperación Automatizados**: Implementación completa de `sageRecoveryEngine.ts` que permite la auto-recuperación del sistema ante fallos.
- **Resolución de Dependencias en 1-Clic**: Al detectar un crash por dependencias faltantes en el log, el sistema se conecta directamente con la sidebar de FOMO para buscar, sugerir y permitir la descarga del archivo exacto requerido.
- **Acciones Correctivas Directas**: Permite deshabilitar de forma segura mods conflictivos de la carga activa y reparar archivos de jugadores `.dat` corruptos con respaldos `.mim_bak`.

### Capa de Seguridad Interactiva y Detallada
- **Modal de Detalles de Seguridad (`SecurityDetailsModal.tsx`)**: Modal que ofrece una radiografía del escaneo estático de bytecode de cada mod (`ProcessBuilder`, ejecuciones de red, accesos reflexivos de JNI).
- **Badges y Tooltips Enriquecidos (`SecurityBadge.tsx`)**: Tooltips animados de alta fidelidad que visualizan los votos de VirusTotal, reputación SHA-256 y comprobaciones de la Whitelist local.

### Depurador de Eventos en Tiempo Real
- **UI del Depurador (`EventDebuggerUI.tsx`)**: Panel interactivo para auditar visualmente los eventos del `MIM Event Bus` a 60fps.

---

## 🚀 Beta 5.4 — Event-Driven Intelligence & Performance (2026-05-07)

### Fase 4 Completada: Event-Driven Orchestration & Centralized Intelligence
- **MIM Event Bus Optimizado**: Implementación de batch processing con `requestAnimationFrame` para 60fps y procesamiento por lotes de 10 eventos.
- **ALRT Central Intelligence Layer**: Cache inteligente de 30 segundos con carga bajo demanda desde IndexedDB.
- **Correlation Engine con Memoización**: Sistema de fingerprinting de eventos con cache TTL de 5 segundos para reducir CPU en un 70%.
- **IndexedDB Storage Escalable**: Nueva capa de almacenamiento para 10,000+ incidentes con fallback a localStorage.
- **Reactive Rule System Dinámico**: Runtime rule management con `addRule()`, `removeRule()`, `enableRule()`.

---

## 🛡️ Beta 5.3 — SAGE Security & Player Rescue (2026-05-07)

### SAGE Regex & mcmeta Scan Refinement
- **Falsos Positivos Corregidos**: Se corrigió el patrón de detección de encriptación añadiendo límites de palabra exactos `\b(AES|DES|RSA)\b` para evitar marcar erróneamente palabras cotidianas de Minecraft.
- **Soporte de Escaneo para .mcmeta**: SAGE ahora escanea y valida sintácticamente archivos `.mcmeta`.

### Rescate de Emergencia de Jugadores (.dat Player Editor)
- **Editor NBT Nativo**: Implementación de un cargador y serializador NBT binario (`lib/nbt.ts`) en TypeScript puro con compresión Gzip nativa.
- **Carpeta de Rescate Portátil Integrada**: El endpoint `/api/sage/player-rescue` opera de forma portátil sobre `.mine/source/.mim-index/player-rescue/`.
- **Herramientas de Rescate Directas**: Teletransportar al Spawn, Vaciar Inventario / Cofre de Ender, Cambiar Dimensión.

---

## 🛠️ Beta 5.2 — Tweak UI Mastery & Control Synergy (2026-05-07)
- **Outside Click Closure**: Cierre automático del panel Tweak al hacer clic fuera.
- **Dynamic Mod Support**: El scanner de teclas detecta automáticamente prefijos `key_` en `options.txt` para editar controles de Iris o Sodium.
- **Visual Priority Stack (Resource Packs)**: Pila de prioridad invertida visual idéntica a Minecraft con reordenamiento interactivo y validación para Fresh Animations.

---

## 🚀 Beta 5.1 — Thematic Tags & Intelligent Automation (2026-05-06)
- **Modo "Auto"**: Mueve automáticamente mods a sus carpetas correctas basándose en sus tags temáticos.
- **Excepción de Compatibilidad 1.20.1**: Regla para tratar Forge y NeoForge como compatibles en 1.20.1.
- **Acciones Masivas (Bulk Actions)**: Eliminación por lote y retorno masivo a descargas (Unclassify).

---

## 🔄 Beta 5.0 — Sync Mastery & Premium UX (2026-05-06)
- **Botón de Refresco Maestro**: Sincronización forzada profunda con el disco.
- **Watcher de Borrado Inteligente**: Detección de `unlink` en tiempo real.
- **Alert Center v2**: Changelogs integrados y solución de notificaciones fantasma.

---

## 📊 Historial de Versiones Anteriores
- **Alpha 4.5**: FOMO 3.0 & Dynamic Floating Glass Layout ("Glass Gutter").
- **Alpha 4.0**: Multi-Filtro Inteligente y Bulk Download en FOMO.
- **Alpha 3.5**: Security Layer v1.1 con Threat Detection Engine, VirusTotal y Whitelist.
- **Alpha 3.0**: Integración completa con CurseForge Eternal API y colecciones Modrinth.
- **Alpha 2.0 / 1.0**: Universal Asset Management (Shaders, Datapacks, Resourcepacks) y Core Engine.

---

*Minecraft Intelligent Manager — Hecho con ⚡ para la comunidad.*
