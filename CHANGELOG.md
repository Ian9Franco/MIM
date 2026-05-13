# MIM Changelog

All notable changes to MIM (Minecraft Intelligent Manager) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.6.0] - 2026-05-13

### Added
- **Spotlight Feature** - Sistema de destacados premium que muestra mods y proyectos recomendados con visualización enriquecida, incluyendo picks destacados de Modrinth y CurseForge con navegación fluida.
- **Project Followers & FOMO** - Sistema completo de seguimiento de proyectos y autores, permitiendo seguir creadores y recibir actualizaciones en tiempo real de sus mods favoritos.
- **Collections Update** - Actualización completa del sistema de colecciones de Modrinth con sincronización de colecciones creadas por el usuario, "Following", y plantillas pre-armadas (Starter Tech, Vanilla+, etc.).
- **Modpack Search & Included Mods** - Capacidad de buscar modpacks y visualizar los mods incluidos en cada uno, con análisis de dependencias integrado para CurseForge y Modrinth.
- **Ticker-Style Updates Carousel** - Animación e interfaz estilo marquesina autodesplazable ("ticker de bolsa de valores") para la visualización de mods y texturas seguidos actualizados, maximizando la legibilidad con fuentes y escalas agrandadas.
- **Semantic Text Tokens** - Definición de `--color-theme-error`, `--color-theme-warning`, y `--color-theme-info` para soportar estados de error y advertencias con contraste premium garantizado en cualquier esquema claro u oscuro.

### Enhanced
- **Persistent FOMO Details Recovery** - Restauración asíncrona automatizada de la vista de descripción de mods después de replegar temporalmente la barra para mostrar descargas activas, mejorando la fluidez.
- **Real-Time Creator Resolution** - Integración de resolución en caliente para nombres de autores y proyectos en el catálogo de colecciones de Modrinth, solucionando errores de API key y devolviendo nombres precisos.
- **Modern Theme Contrast Optimization** - Rediseño del contraste de fuentes y bordes en "Mi Contenido Seguido" (proyectos y autores), descargas pendientes, etiquetas de categorías de modcard y placeholders vacíos de la librería principal.

### Fixed
- **Local Author Scanning** - Corrección en la extracción heurística de metadatos de autores para mods mensuales locales, evitando que aparezcan como creadores desconocidos.
- **Undefined CSS Variable Typo** - Corrección de `--color-foreground-muted` por `--color-muted` en el badge de proyectos incompatibles.
- **CurseForge Modpack Embedded Dependencies Parser** - Algoritmo que descarga y analiza dinámicamente en caliente el archivo `manifest.json` interno de modpacks de CurseForge a través de enlaces reconstruidos de Edge CDN (`edge.forgecdn.net`), resolviendo la falta de datos de dependencias en la API oficial de CurseForge.
- **Persistent Local Dependency Cache** - Almacenamiento persistente en disco (`fomo_modpack_dependencies_cache.json`) que guarda el mapeo de dependencias de modpacks procesados de CurseForge, logrando cargas instantáneas de milisegundos en consultas posteriores.

### Enhanced
- **Extrema Optimización de Latencia (Cache Misses)** - Limitación del parseo en cache-misses a únicamente la versión más reciente por consulta API, reduciendo descargas en red a un tercio (1/3) del tiempo original (ahorrando hasta 30 segundos).
- **Badge Unificado "MODPACK" & "DATAPACK"** - Incorporación de etiquetas distintivas de tipología para "Modpack" y "Datapack" tanto en las tarjetas del catálogo de Explorar (`FomoModCard.tsx`) como en las sugerencias destacadas de Spotlight (`FomoSpotlight.tsx`).
- **Navegación Interactiva desde Dependencias (Ver Modcard)** - Redirección fluida que cambia a la pestaña "Explorar", cierra el overlay y auto-completa la búsqueda en el catálogo al hacer clic en cualquier mod requerido, opcional o incluido en el detalle, permitiendo ver su Modcard general de inmediato.

### Fixed
- **Bug de Selección Cruzada en Spotlight** - Unificación del estado global `activeSource` para solucionar el problema de carga de detalles y descargas de picks destacados en Spotlight tras alternar el distribuidor activo en Explorar.
- **Standalone Electron Build Plan** - Plan integral para compilar Next.js + Electron de forma portable sin Tauri ([standalone-build-plan.md](file:///d:/Dev/CodeProjects/MIM/docs/standalone-build-plan.md))
- **Sorting Methods** - Nuevos criterios de ordenación FOMO de Modrinth y CurseForge (Nuevos, Seguidores, Actividad) mapeados y unificados
- **Hardware-Accelerated Liquid Shimmer** - Animaciones líquidas 3D por GPU (`translate3d`) y renders aislados de composición libre de lag para los esqueletos de carga de mods
- **SAGE Recovery Engine** - Motor de recuperación automatizada con análisis heurístico de crashes
- **ALRT Intelligence** - Capa de inteligencia operacional con correlación temporal de eventos
- **Event Schema Registry** - Sistema de versionamiento y validación de eventos
- **Event Debugger UI** - Timeline visual interactiva para debugging del sistema event-driven
- **Formal Event Contract** - Taxonomía de 70+ eventos tipados con metadata estándar
- **Automated Windows Packaging (`npm run package:win`)** - Configuración completa de `electron-builder` en `package.json` para generar instaladores NSIS nativos y `.exe` portables automáticamente, incluyendo solución manual de caché de `winCodeSign` para PCs corporativas.
- **No-ASAR Standalone Run** - Desactivación de compresión ASAR (`"asar": false`) en `package.json` para permitir la ejecución nativa del servidor Next.js standalone vía `child_process.fork`.

### Enhanced
- **Fomo Grid-Filters UI** - Rediseño premium de los filtros de ordenamiento en cuadrícula compacta 2x2, coronado por Relevancia a ancho completo con iconos personalizados para cada opción
- **Smooth Column transitions** - Búfer de animación de 450ms con esqueleto de vidrio líquido en `FomoSidebar.tsx` que suaviza la transición de 3 a 2 columnas (y viceversa) al abrir/cerrar detalles de mod
- **Security UI** - Badges interactivos con tooltips detallados y modal de análisis
- **Incident Management** - Sistema completo de lifecycle con estados unseen → unread → acknowledged → resolved
- **Cross-Module Correlation** - Detección de patrones entre eventos independientes
- **Recovery Actions** - Acciones correctivas automatizadas con rollback seguro

### Fixed
- **Strict TypeScript Event Payloads** - Resolución global de tipado en `system:refresh` y limpieza de iteradores nulos en cachés de `eventDebugger.ts` y `eventSchemaRegistry.ts`, logrando un build de producción 100% verde.
- **TypeScript logs date parameter** - Declaración de tipos corregida en `api/project/logs` previniendo fallos en la futura compilación de producción de la app
- **Theme toggle duplicate icon** - Reemplazo de icono `Sparkles` por el de sol `Sun` para el tema Modern, previniendo duplicidades con el nuevo icono de Relevancia de los filtros de búsqueda
- **Corporate Network Pinger & Localhost Bypassing** - Reconfiguración del pinger de inicio `waitForServer` y del cargador de ventanas en `standalone/main.js` para usar la IP `127.0.0.1` y ping offline local, evitando bloqueos por proxies corporativos y consultas API externas.

### Technical
- **Event-Driven Architecture** - Sistema distribuido de observabilidad para entornos Minecraft
- **Schema Evolution** - Migraciones automáticas entre versiones de eventos
- **Backward Compatibility** - Validación de compatibilidad entre schemas
- **Performance Monitoring** - Métricas de procesamiento y bottleneck detection

## [3.1.0] - 2024-12-XX

### 🚀 Major Features

#### SAGE Recovery Engine
- **Crash Recovery Pipeline**: Análisis heurístico de logs con detección de patrones
- **One-Click Dependency Resolution**: Integración con FOMO para instalación automática
- **Conflict Isolation & Safe Disable**: Desactivación temporal sin borrado físico
- **Player & World Recovery Tools**: Reparación de datos corruptos con backups automáticos
- **Runtime Optimization Suggestions**: JVM args según configuración y hardware

#### ALRT Intelligence
- **Central Event Awareness Layer**: Escucha global de eventos con canal unificado
- **Cross-Module Incident Correlation**: Patrones predefinidos con confidence scoring
- **Incident Lifecycle System**: Estados completos con persistencia y timeline
- **Actionable Recommendations Layer**: Recomendaciones contextuales con priorización
- **Behavioral Pattern Recognition**: Detección de patrones operacionales recurrentes

#### Event Architecture
- **Event Schema Registry**: 70+ schemas versionados con validación runtime
- **Event Debugger UI**: Timeline visual con filtrado avanzado y flow traces
- **Formal Event Contract**: Taxonomía semántica con 8 categorías de eventos
- **Migration System**: Migraciones automáticas entre versiones de schemas
- **Performance Analytics**: Bottleneck detection y métricas de procesamiento

### 🔧 Improvements
- **Security Badges** integrados en ModCard y FomoModCard
- **Incident Manager** con persistencia en IndexedDB
- **Correlation Engine** con reglas reactivas configurables
- **Memory Management** con cleanup automático de eventos
- **Error Handling** robusto con fallbacks y logging

### 🐛 Fixes
- **TypeScript Errors** corregidos en SAGE Recovery Engine y ALRT Intelligence
- **Runtime Errors** solucionados en Incident Manager y Alert Sidebar
- **Event Contract Compliance** actualizado para todas las emisiones de eventos
- **Async/Await Patterns** implementados correctamente en componentes de UI

### 📊 Architecture
- **Event-Driven Design**: Conversión de módulos aislados a ecosistema coordinado
- **Observability Platform**: Capacidades enterprise-level para debugging
- **Schema Evolution**: Versionamiento semántico con backward compatibility
- **Contextual Intelligence**: Correlación de múltiples señales en incidentes contextuales

## [3.0.0] - 2024-XX-XX

### ✅ Phase 3: Seguridad Avanzada Completa
- **Threat Detection Engine**: Análisis de bytecode con scoring de riesgo
- **Known Threat DB**: Integración con VirusTotal y APIs de reputación
- **Whitelist System**: Mods verificados oficialmente
- **Security UI**: Badges visuales interactivos en toda la aplicación

### 🎨 UI/UX
- **SecurityBadge Component** con animaciones y tooltips
- **SecurityDetailsModal** con tabs de análisis y acciones
- **Risk Score Visualization** (0-100) con color coding
- **Interactive Security Actions** (cuarentena, whitelist, re-analizar)

### 🔍 Security
- **Real-time Scanning** durante descarga de mods
- **Behavioral Analysis** de archivos sospechosos
- **Network Reputation** checking con múltiples fuentes
- **Local Threat Database** con actualizaciones automáticas

## [2.0.0] - 2024-XX-XX

### ✅ Phase 2: Compatibilidad y Optimización
- **Sinytra Connector Flag**: Vista combinada Fabric+Forge para builds híbridos
- **SAGE Diagnostics**: Análisis de crash logs y compatibilidad
- **Auto-Optimization**: Ajuste automático de Java Args y Shaders según hardware
- **Conflict Detection Engine**: Detección de colisiones de Mixins previa al lanzamiento

### ⚡ Performance
- **Hardware Detection** automática con presets optimizados
- **Memory Management** dinámico según cantidad de mods
- **Shader Compatibility** checking con sugerencias de configuración
- **JVM Args Optimization** basado en perfil técnico

### 🔧 Compatibility
- **Cross-Loader Support** para Fabric/Forge/híbridos
- **Version Validation** automática de dependencias
- **Conflict Resolution** con sugerencias de downgrade
- **Dependency Graph** visual con detección de ciclos

## [1.0.0] - 2024-XX-XX

### ✅ Phase 1: Inteligencia de Clasificación
- **Smart Categories**: Clasificación automática de mods comunes
- **Universal Tagging**: Integración de tags temáticos de Modrinth
- **Memory de Clasificación**: Pre-selección basada en historial
- **Cross-Platform Exclusivity Check**: Identificación visual de exclusividad

### 🏗️ Foundation
- **Mod Library Management** con búsqueda y filtrado avanzado
- **Project Structure** con múltiples instancias de Minecraft
- **FOMO Integration** con Modrinth y CurseForge
- **TWEAK Configuration** con edición de settings y keybinds

---

## Architecture Evolution

### From Launcher to Platform
MIM ha evolucionado desde un simple launcher con features a una **plataforma de observabilidad distribuida** para entornos Minecraft, con capacidades comparables a sistemas enterprise:

- **Event-Driven Architecture** con correlación temporal
- **Schema Registry** con versionamiento y migraciones
- **Observability Tools** con debugging visual
- **Intelligence Layer** con context awareness
- **Recovery Systems** con acciones automatizadas

### Technical Milestones
- **Phase 1**: Clasificación inteligente y organización
- **Phase 2**: Compatibilidad y optimización avanzada
- **Phase 3**: Seguridad y threat detection
- **Phase 3.1**: Ecosistema operacional coordinado

### Future Roadmap
- **Rule-Based Optimization Engine** (Next Priority)
- **Conflict Detection Engine** (Signature Feature)
- **Mod Packaging Assistant** (Creator Tools)
- **Advanced Analytics** (ML Integration)

---

*Para más detalles técnicos, ver la documentación en `/docs/` y el código fuente en `/lib/`.*
