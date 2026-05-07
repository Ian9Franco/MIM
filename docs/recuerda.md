# 🧠 MIM — Centro de Control y Estrategia

Este documento centraliza el estado actual del proyecto, separando los hitos alcanzados de la visión a futuro.

**Última actualización:** 06-05-2026 — Beta 5.0 (Automation & Tags)

---

# ✅ Logros e Implementaciones (HECHO)

### 🔄 Sincronización y Estabilidad (Sesión 06-05-2026)
- **Sincronización Maestra (Disk Sync):** Botón de refresco manual que sincroniza la app con el estado real del disco (Mods, Proyectos y Descargas).
- **Watcher de Borrado Inteligente:** Detección de `unlink` (archivos borrados a mano en Windows) con actualización instantánea de la UI.
- **Alert Center v2:** Changelogs integrados y botones de acceso web directo en las notificaciones. Corregido el bug de notificaciones "fantasma".
- **Modern Theme v2 (Cyan Edition):** Reemplazo de amarillos por Cyan vibrante. Grid premium de 2 columnas para subcategorías con profundidad visual.
- **🏷️ Thematic Tags & Auto-Enrichment:** Los archivos en descargas ahora obtienen sus tags (Aventura, Optimización, etc.) automáticamente vía Modrinth para identificación instantánea.
- **🤖 Intelligent Automation (Modo Auto):** Sistema de categorización automática que mueve librerías, tecnología y sonidos a sus carpetas correctas respetando versiones.
- **⚡ Bulk Actions (Bandeja de Clasificación):** Eliminación por lote y retorno masivo a descargas (Unclassify) integrados en la bandeja de trabajo.
- **🛡️ Compatibilidad 1.20.1:** Excepción lógica para unificar Forge/NeoForge en la versión 1.20.1.
- **Fixes de Estabilidad:** Resolución de errores de `ConfirmModal` y `useRef` en la página principal.
- **✨ Enhanced Layout & Scanner (Beta 5.1):**
  - Layout de `ModCard` estandarizado con alturas fijas y gaps consistentes.
  - Fixes de TypeScript en `enhanced-mod-scanner`.
  - Mejoras en la detección de versiones desde nombres de archivos y paths.
  - Creación de la [Guía de Implementación](file:///D:/.mine/manager/docs/enhanced-components-guide.md).

### 🧠 SAGE (Systematic Analyzer for Glitches & Exceptions) — Diagnosis Engine
- **Crash Log Interpreter (S+):** Analizador heurístico avanzado 100% local que parsea stack traces de Java de Minecraft, extrayendo hilos caídos, tipos de excepciones, Mixins conflictivos y causantes del crash.
- **Detector de Dependencias Rígido:** Identifica dependencias faltantes (ej: LionfishAPI, ResourcefulConfig) y asocia de forma inteligente qué mod las está requiriendo.
- **Acción Rápida SAGE → FOMO:** Integración directa para buscar, descargar e instalar dependencias faltantes con un solo clic directamente desde el panel FOMO.
- **Lector Resiliente de Logs:** Escaneo dual inteligente que busca de forma local en la carpeta del proyecto activo y de forma global en `.minecraft` (garantizando listar reportes de crash pasados incluso si el proyecto aún no se ha compilado o no existe la carpeta local física).
- **Borrado Seguro:** Implementación de borrado físico real de archivos de crash directo de disco, protegido contra ataques de Directory Traversal y con ventana de confirmación glassmórfica (`SageDeleteModal`).
- **Limpieza de UI de Desarrollo:** Eliminación del bug 400 Bad Request en la API de colecciones de Modrinth, optimizando el rendimiento y velocidad a la mitad de tiempo.

### 👁️ FOMO 3.0 (Discovery & Cloud)
- **Discovery Sidebar:** Integración total con Modrinth y CurseForge.
- **Multi-Filtro Avanzado:** Filtrado por versiones, categorías, loaders y entornos (Client/Server).
- **Manual Version Selector:** Capacidad de elegir versiones específicas para Assets y Datapacks.
- **Modrinth Collections:** Sincronización de colecciones personales y "Following" (depurado de errores de API v3).
- **Bulk Download:** Barra de acciones masivas para descargas en lote.
- **Layout "Glass Gutter":** Transiciones fluidas y redimensionamiento dinámico de sidebars con auto-colapso inteligente de 3 segundos al completarse descargas en segundo plano.

### 🔌 Soporte Híbrido Sinytra Connector (Forge + Fabric)
- **Auto-Detección Inteligente:** Sincroniza automáticamente la UI con el loader y versión del proyecto activo, y escanea las librerías físicas del disco para auto-activar el soporte híbrido si detecta Sinytra Connector instalado.
- **Búsqueda Multi-Loader Optimizada:** Cuando está activo el modo híbrido en proyectos de Forge, busca mods de Forge y Fabric de manera unificada en una sola petición OR hacia la API de Modrinth.
- **Identificación Visual Premium:** Insignia 🔌 Sinytra Bridge con efectos holográficos y micro-animaciones en los mods de Fabric que el puente es capaz de ejecutar.
- **Resolución Inteligente de Descargas:** Descarga y extrae dinámicamente versiones nativas de Fabric para mods exclusivos de Fabric cuando se instalan dentro de un perfil de Forge.
- **Heurísticas SAGE para Modos Híbridos:** Diagnóstico inteligente capaz de detectar fallos de traducción de bytecode de clases de Fabric en tiempo de ejecución (fase de transformación/classloader de Sinytra) y reportarlos de forma simplificada en español con planes de acción adaptados.
- **SAGE Connector Compatibility Engine (S+):** Analizador de compatibilidad híbrida con un sistema de pesos/puntuación (0-100%) y visualización de un medidor glassmórfico de riesgo en la UI, detectando bloqueos complejos de recursos (deadlocks por idiomas), falta de módulos de Fabric API y fallos de Access Widener o métodos (NoSuchMethod/Field).
- **Connector Compatibility Estimate en FOMO (S+):** Estimaciones dinámicas en tarjetas de mods de Fabric exclusivas para proyectos híbridos, calculando el nivel de inestabilidad según tags y dependencias de renderizado/optimización.
- **Deduplicación de Descargas Local Directa:** Detección de colisiones de descarga entre múltiples proyectos mediante hashes locales, copiando instantáneamente de forma local entre proyectos en vez de forzar re-descargas lentas de internet.

### 🛡️ Security Layer v1.0
- **Threat Detection Engine:** Análisis de bytecode para detectar malware y llamadas de red sospechosas.
- **Risk Scoring System:** Clasificación de riesgo 0-100 con insignias visuales.
- **Security UI:** Integración de badges de seguridad en ModCards y Centro de Alertas.

### 📦 Core Management
- **Universal Scanner:** Detección de Mods, Resourcepacks, Shaders y Datapacks.
- **SHA1 Matching:** Matching 100% preciso basado en hashes con Modrinth.
- **Thumbnail Extraction:** Extracción local de iconos en Base64.
- **Automated Builder:** Creación de zips para usuarios y carpetas para servidores en un clic.

---

# 🚧 Roadmap y Próximos Pasos (PENDIENTE)

### 🎯 Prioridades Inmediatas (S+)
1. **Conflict Detection Engine (Avanzado):** Extender SAGE para detectar colisiones lógicas complejas de bytecode (Mixins del mismo método) previas al lanzamiento físico del juego.
2. **Auto-Optimization (Fase 2):** Ajuste automático de Java Args y Shaders según hardware.

### 🗺️ Roadmap Estratégico

#### Fase 1: Inteligencia de Clasificación
- [x] **Smart Categories (Modo Auto):** Clasificación automática de mods comunes (Librerías, Tech, Sonidos).
- [x] **Universal Tagging:** Integración de tags temáticos de Modrinth en toda la app.
- [x] **Memory de Clasificación:** Pre-seleccionar categorías basadas en el historial de uso manual.
- [x] **Cross-Platform Exclusivity Check:** Identificar visualmente si un mod es exclusivo de una plataforma o está en ambas.

#### Fase 2: Compatibilidad y Optimización
- [x] **Sinytra Connector Flag:** Vista combinada Fabric+Forge para builds híbridos.
- [ ] **Auto-Optimization:** Ajuste automático de Java Args y Shaders según hardware.

#### Fase 3: Seguridad Avanzada
- [ ] **Known Threat DB:** Integración con APIs externas de reputación (VirusTotal, etc.).
- [ ] **Whitelist System:** Mods verificados oficialmente.

#### Fase 4: Posicionamiento Profesional
- [ ] **Demo Deployable:** Showcase visual o landing funcional.
- [ ] **Video Demo:** "Problema → Solución → Wow factor".
- [ ] **Technical Case Study:** Documentación de trade-offs y arquitectura senior.

---

## 📜 Regla de Oro
> [!IMPORTANT]
> **Nunca hagas un "AI Assistant". Siempre haz "Herramientas Concretas".**
> 
> - "Assistant" suena a humo.
> - "Diagnosis Engine" suena a dinero.
> 
> *Preferimos el valor concreto (y el dinero).*

---
*MIM — Minecraft Intelligent Manager*
