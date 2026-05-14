# MIM — Roadmap Estratégico

> Logros alcanzados y visión de futuro.  
> **Versión Actual:** Beta 5.7
> **Última actualización:** 2026-05-14

---

# ✅ Logros Implementados (HECHO)

## 🏛️ Beta 5.7 — Discovery Unification & Architecture Cleanup
- **Unified Mod Details Architecture**: Eliminación completa del sistema "Standalone Details" y centralización de la visualización de metadatos dentro del panel lateral de FOMO, simplificando el flujo de navegación y reduciendo la fragmentación de estado.
- **Intelligent Metadata Rescue (Search Fallback)**: Implementación de un mecanismo de rescate robusto en `useFomoDiscover` que realiza búsquedas semánticas por título cuando los IDs/slugs extraídos de archivos locales fallan, garantizando el 100% de carga de descripciones y dependencias.
- **Global Event Refactoring**: Reestructuración del bus de eventos para disparar aperturas de detalles desde `VirtualizedLibrary`, `LibrarySection` y `AlertSidebar` de forma unificada, eliminando hooks y componentes redundantes en `RootLayoutClient`.
- **Portal & Sidebar Stability**: Corrección de condiciones de carrera y renderizado de portales para asegurar transiciones fluidas y una visualización perfecta en modo de pantalla dividida (Fomo Search Left / Details Right).


## 🚀 Beta 5.6 — Spotlight, Collections Update & Stock Ticker
- **Spotlight Feed & Discovery**: Sistema de destacados premium con picks recomendados en tiempo real desde Modrinth y CurseForge con navegación fluida y descarga directa.
- **Project Followers & Hybrid Search**: Seguimiento de autores (`author:`) y proyectos (`project:`) comparando versiones simultáneamente entre plataformas en modo "Ambos".
- **Collections & Modpack Dependencies**: Sincronización de colecciones de Modrinth con plantillas pre-armadas y parseo de dependencias internas de modpacks de CurseForge con resguardo en caché local.
- **Stock Ticker & Contraste Maestro**: Marquesina autodesplazable superior para actualizaciones de mods y tokens semánticos de contraste en UI.

## 🔄 Sincronización y Estabilidad
- **Sincronización Maestra (Disk Sync)**: Botón de refresco manual que sincroniza la app con el estado real del disco (Mods, Proyectos y Descargas).
- **Watcher de Borrado Inteligente**: Detección de `unlink` (archivos borrados a mano en Windows) con actualización instantánea de la UI.
- **Alert Center v2**: Changelogs integrados y botones de acceso web directo en las notificaciones. Fix del bug de notificaciones "fantasma".
- **Modern Theme v2 (Cyan Edition)**: Reemplazo de amarillos por Cyan vibrante. Grid premium de 2 columnas para subcategorías.

## 🏷️ Thematic Tags & Auto-Enrichment
- Los archivos en descargas obtienen sus tags (Aventura, Optimización, etc.) automáticamente vía Modrinth.
- **Intelligent Automation (Modo Auto)**: Sistema de categorización automática que mueve librerías, tecnología y sonidos a sus carpetas correctas respetando versiones.
- **⚡ Bulk Actions**: Eliminación por lote y retorno masivo a descargas (Unclassify) integrados en la bandeja de trabajo.
- **🛡️ Compatibilidad 1.20.1**: Excepción lógica para unificar Forge/NeoForge en la versión 1.20.1.

## 🛠️ Tweak & Control Synergy (Beta 5.2)
- **Tweak Sidebar UX**: Soporte para cierre por fuera (outside-click) y botones de header toggle (On/Off).
- **Visual Stack Inversion**: Reordenamiento de texturas con prioridad real invertida (Minecraft style).
- **Advanced Keybinds**: Edición directa de teclas de mods (Iris, Sodium, etc.) mediante scanner dinámico de prefijos.
- **Header Stability**: Z-Index refactor para mantener controles accesibles sobre backdrops.

## 🧠 SAGE (Systematic Analyzer for Glitches & Exceptions)
- **Crash Log Interpreter (S+)**: Analizador heurístico avanzado 100% local que parsea stack traces de Java de Minecraft.
- **Detector de Dependencias Rígido**: Identifica dependencias faltantes y asocia qué mod las está requiriendo.
- **Acción Rápida SAGE → FOMO**: Integración directa para buscar, descargar e instalar dependencias faltantes con un solo clic.
- **Lector Resiliente de Logs**: Escaneo dual inteligente (local en proyecto + global en `.minecraft`).
- **Borrado Seguro**: Implementación de borrado físico real de archivos de crash protegido contra ataques de Directory Traversal.
- **Limpieza de UI de Desarrollo**: Eliminación del bug 400 Bad Request en la API de colecciones de Modrinth.

## 👁️ FOMO 3.0 (Discovery & Cloud)
- **Spotlight Feed (Destacados)**: Exhibición curada en tiempo real de novedades, selecciones de la comunidad y proyectos virales tanto de Modrinth como de CurseForge.
- **Seguidos (Following & Hybrid Search)**: Seguimiento dedicado de creadores y proyectos favoritos. Incluye lupa de búsqueda híbrida (`author:` y `project:`) para comparar al instante versiones y plataformas (Modrinth vs CurseForge) en un único catálogo combinado ("Ambos").
- **Manual Version Selector**: Capacidad de elegir versiones específicas para Assets y Datapacks.
- **Modrinth Collections**: Sincronización de colecciones personales y listas de seguimiento.
- **Bulk Download**: Barra de acciones masivas para descargas en lote.
- **Layout "Glass Gutter"**: Transiciones fluidas y redimensionamiento dinámico de sidebars con interacción de filtros tipo "pill" en la barra de búsqueda.

## 🔌 Soporte Híbrido Sinytra Connector (Forge + Fabric)
- **Auto-Detección Inteligente**: Sincroniza automáticamente la UI con el loader y versión del proyecto activo.
- **Búsqueda Multi-Loader Optimizada**: Cuando está activo el modo híbrido, busca mods de Forge y Fabric de manera unificada.
- **Identificación Visual Premium**: Insignia 🔌 Sinytra Bridge con efectos holográficos.
- **Resolución Inteligente de Descargas**: Descarga y extrae dinámicamente versiones nativas de Fabric para mods exclusivos de Fabric.
- **Heurísticas SAGE para Modos Híbridos**: Diagnóstico inteligente de fallos de traducción de bytecode.
- **SAGE Connector Compatibility Engine (S+)**: Analizador de compatibilidad híbrida con sistema de puntuación (0-100%).
- **Connector Compatibility Estimate en FOMO**: Estimaciones dinámicas en tarjetas de mods de Fabric para proyectos híbridos.
- **Deduplicación de Descargas Local Directa**: Detección de colisiones de descarga entre múltiples proyectos mediante hashes locales.

## 🛡️ Security Layer v1.1 (Cloud & Whitelisting)
- **Threat Detection Engine**: Análisis de bytecode para detectar malware y llamadas de red sospechosas.
- **Risk Scoring System**: Clasificación de riesgo 0-100 con insignias visuales.
- **Security UI**: Integración de badges de seguridad en ModCards y Centro de Alertas.
- **Known Threat DB (VirusTotal)**: Integración de hashes SHA-256 con la API pública de VirusTotal v3.
- **Whitelist System Local**: Lista blanca de mods ultra populares que previenen falsos positivos.

## 📦 Core Management
- **Universal Scanner**: Detección de Mods, Resourcepacks, Shaders y Datapacks.
- **SHA1 Matching**: Matching 100% preciso basado en hashes con Modrinth.
- **Thumbnail Extraction**: Extracción local de iconos en Base64.
- **Automated Builder**: Creación de zips para usuarios y carpetas para servidores en un clic.

## ⚡ Performance & Escalabilidad
- **Virtual Scrolling**: Reducción de 75% de nodos DOM para bibliotecas grandes.
- **Smart Cache System**: TTL dinámico y estrategia Stale-While-Revalidate.
- **IndexedDB**: Storage escalable para 10,000+ mods.
- **Web Workers**: Background JAR scanning sin bloquear UI.
- **Lazy Loading**: Descripciones on-demand.
- **Aggressive Memoization**: Reducción del 60% de uso de CPU.

## 📡 Event-Driven Orchestration & Centralized Intelligence (Beta 5.4)
- **MIM Event Bus**: Bus de eventos centralizado, ultraligero y completamente tipado con batching (`requestAnimationFrame`), procesamiento por lotes (10 eventos) y estadísticas en tiempo real.
- **ALRT Central Intelligence Layer**: Cache de 30s con carga bajo demanda desde IndexedDB, reduciendo un 85% de lecturas y escrituras pesadas.
- **Correlation Engine con Memoización**: Fingerprinting de eventos, cache TTL de 5s, priorización dinámica de reglas y evaluación lazy para ahorrar un 70% de consumo de CPU.
- **IndexedDB Storage Escalable**: Base de datos dedicada para 10,000+ incidentes con índices compuestos (status-severity, module-timestamp) y fallback a localStorage.
- **Reactive Rule System**: Runtime extensible con gestión en caliente (`addRule()`, `removeRule()`, `enableRule()`) y priorización de reglas.

## 🛡️ Tailwind v4 & Integrated Security (Beta 5.5)
- **Migración Nativa Tailwind v4**: Conversión completa de clases con corchetes arbitrarios (`z-[100]` -> `z-100`, `w-[400px]` -> `w-100` / `w-400`, `max-w-[1600px]` -> `max-w-400`) y directivas de gradientes a la nueva sintaxis nativa de Tailwind v4 (`bg-linear-to-r`), reduciendo el bundle de estilos y optimizando la compilación.
- **Security Details Modal**: Modal interactivo premium (`SecurityDetailsModal`) que expone de forma visual e intuitiva la auditoría estática de bytecode (procesos levantados, sockets de red, llamadas reflexivas a nivel JNI).
- **Security Badges & Rich Tooltips**: Tooltips premium con animaciones elásticas que detallan puntuación de riesgo (0-100), reputación en la nube mediante VirusTotal (votos, hashes SHA-256) y estado en la Whitelist local.
- **SAGE Recovery Engine**: Motor de recuperación automatizado (`sageRecoveryEngine.ts`) con flujos interactivos para solucionar crashes (descarga de dependencias faltantes interactuando con FOMO, desactivación segura de mods conflictivos y reparación de perfiles `.dat` con backups automáticos).
- **MIM Event Debugger**: Interfaz de desarrollo visual (`EventDebuggerUI.tsx`) para supervisar en vivo el flujo del Event Bus a 60fps con estadísticas de rendimiento en tiempo real.

## 🗺️ Fases Estratégicas Implementadas

### Fase 1: Inteligencia de Clasificación ✅
- [x] **Smart Categories (Modo Auto)**: Clasificación automática de mods comunes.
- [x] **Universal Tagging**: Integración de tags temáticos de Modrinth en toda la app.
- [x] **Memory de Clasificación**: Pre-seleccionar categorías basadas en el historial de uso manual.
- [x] **Cross-Platform Exclusivity Check**: Identificar visualmente si un mod es exclusivo de una plataforma o está en ambas.

### Fase 2: Compatibilidad y Optimización ✅
- [x] **Sinytra Connector Flag**: Vista combinada Fabric+Forge para builds híbridos.
- [x] **SAGE Diagnostics**: Análisis de crash logs y compatibilidad.

### Fase 3: Seguridad Avanzada ✅
- [x] **Threat Detection Engine**: Análisis de bytecode.
- [x] **Known Threat DB**: Integración con APIs externas de reputación (VirusTotal).
- [x] **Whitelist System**: Mods verificados oficialmente.
- [x] **Security UI**: Badges visuales completos en toda la app.
  **Badges interactivos en ModCard/FomoModCard con tooltips detallados y modal de análisis estético.**

### Fase 4: Event-Driven Orchestration & Centralized Intelligence ✅
- [x] **MIM Event Bus**: Bus centralizado para desacoplar comunicación entre módulos con batching y requestAnimationFrame.
- [x] **ALRT Central Intelligence Layer**: Evolución del Centro de Alertas hacia un núcleo de inteligencia operacional.
- [x] **Cross-Module Incident Correlation Engine**: Motor reactivo de correlación para detectar relaciones entre eventos independientes.
- [x] **Incident Persistence & Session Memory**: Persistencia local en IndexedDB con índices compuestos y fallback a localStorage.
- [x] **Reactive Rule System**: Sistema extensible runtime de reglas con addRule(), removeRule() y enableRule().

---

# 🚧 Roadmap y Próximos Pasos (PENDIENTE)

## 🎯 Prioridades Inmediatas (S+)
1. **Conflict Detection Engine (Avanzado)**: Extender SAGE para realizar análisis estático de colisiones lógicas de bytecode (Mixins modificando el mismo método de Minecraft) previo al lanzamiento físico del juego.
2. **Intelligent Pack Validation & Build Gate**: Pipeline de validación de dependencias, conflictos y entornos previo al empaquetado de exportación.

## 🗺️ Roadmap Estratégico

### Fase 3.1: Ecosistema Interactivo  
- [x] **Rule-Based Optimization Engine**: Sistema de optimización automática basado en reglas.
  - Detección de hardware (GPU/RAM/CPU) y perfil de carga de mods
  - Presets automáticos: RTX 3060 + 300 mods → HIGH preset
  - Sugerencias específicas: JVM args, memoria óptima, nivel shader
  - Integración con TWEAK para aplicar configuraciones optimizadas
  - Conexión con SAGE/ALRT para detección de problemas de rendimiento (orientado con más precisión a low/mid profiles)
  
- [ ] **Conflict Detection Engine**: Motor de detección de conflictos de bytecode.
  - Detección previa al lanzamiento: mixin collisions, access transformer conflicts
  - Análisis de inyecciones duplicadas y dependencias circulares
  - Risk scoring basado en tipo de conflicto (0-100%)
  - Sugerencias automáticas: downgrade mods, instalar compatibilidad, desactivar módulos
  - Integración con SAGE para debugging profundo de incompatibilidades
  
- [x] **SAGE Recovery Engine**: Flujos interactivos de recuperación automatizada.
  - Detección de crash → instalación automática de dependencias faltantes
  - Desactivación de mods conflictivos con un clic
  - Reparación de jugadores corruptos y reordenamiento de packs
  - Sugerencias inteligentes de JVM args basadas en configuración
  **Motor de recuperación completo con análisis heurístico de crashes y acciones correctivas automatizadas.**
  
- [x] **ALRT Intelligence**: Sistema de conciencia contextual avanzada.
  - Correlación de patrones entre eventos independientes
  - Detección de incidentes escalonados con contexto
  - Sistema de awareness basado en arquitectura event-driven
  - Escalación inteligente de alertas con recomendaciones contextuales
  **Capa de inteligencia operacional con correlación temporal y lifecycle management de incidentes.**
  
- [ ] **Intelligent Pack Validation & Environment-Aware Build System (Mod Packaging Assistant repensado)**
  - **Meta de Diseño**: "Impedir que el usuario exporte un modpack roto antes de tiempo".
  - [ ] **Persistencia de Metadata Real**: Entidades completas por mod con su ID, versión, loader, entorno (client/server/both), dependencias y conflictos.
  - [ ] **Priority Classification System**: Clasificación estricta basada en jerarquía `entorno > tipo > tags`.
  - [x] **Validation Engine (`validateProject`)**: Análisis preventivo previo a la exportación que retorna errores graves (bloqueantes), advertencias y sugerencias de optimización.
  - [x] **Build Gate Inflexible**: Bloqueo absoluto de exportación ante errores graves ("No negociación, no democracia") y exportación permitida bajo advertencia para perfiles experimentales.
  - [ ] **Smart Split Export**: Generación validada y separada de `alluser.zip` (client + essential + shaders/resources) y `allhost.zip` (server + essential + datapacks).
  - [x] **Pack Health Score**: Puntuación de salud global (ej. `91/100`) para certificar la integridad del modpack.

### Fase 5: Posicionamiento Profesional 
- [ ] **Demo Deployable**: Showcase visual o landing funcional.
- [ ] **Video Demo**: "Problema → Solución → Wow factor".
- [ ] **Technical Case Study**: Documentación de trade-offs y arquitectura senior.
- [ ] **Portfolio Integration**: Integración en portfolio profesional.

## 📊 Métricas de Éxito

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Mods gestionables | 1,200+ | 10,000+ |
| Tiempo de carga inicial | <2s | <1s |
| API calls reducidos | 93.75% | 95%+ |
| Memory usage | 40-60MB | <50MB |
| Scroll performance | 60fps | 60fps |

---

> [!IMPORTANT]
> **Regla de Oro:**
> **Nunca hagas un "AI Assistant". Siempre haz "Herramientas Concretas".**
> 
> - "Assistant" suena a humo.
> - "Diagnosis Engine" suena a dinero.
> 
> *Preferimos el valor concreto (y el dinero).*

---

*MIM — Minecraft Intelligent Manager*
