# MIM Changelog

All notable changes to MIM (Minecraft Instance Manager) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Standalone Electron Build Plan** - Plan integral para compilar Next.js + Electron de forma portable sin Tauri ([standalone-build-plan.md](file:///d:/Dev/CodeProjects/MIM/docs/standalone-build-plan.md))
- **Sorting Methods** - Nuevos criterios de ordenación FOMO de Modrinth y CurseForge (Nuevos, Seguidores, Actividad) mapeados y unificados
- **Hardware-Accelerated Liquid Shimmer** - Animaciones líquidas 3D por GPU (`translate3d`) y renders aislados de composición libre de lag para los esqueletos de carga de mods
- **SAGE Recovery Engine** - Motor de recuperación automatizada con análisis heurístico de crashes
- **ALRT Intelligence** - Capa de inteligencia operacional con correlación temporal de eventos
- **Event Schema Registry** - Sistema de versionamiento y validación de eventos
- **Event Debugger UI** - Timeline visual interactiva para debugging del sistema event-driven
- **Formal Event Contract** - Taxonomía de 70+ eventos tipados con metadata estándar

### Enhanced
- **Fomo Grid-Filters UI** - Rediseño premium de los filtros de ordenamiento en cuadrícula compacta 2x2, coronado por Relevancia a ancho completo con iconos personalizados para cada opción
- **Smooth Column transitions** - Búfer de animación de 450ms con esqueleto de vidrio líquido en `FomoSidebar.tsx` que suaviza la transición de 3 a 2 columnas (y viceversa) al abrir/cerrar detalles de mod
- **Security UI** - Badges interactivos con tooltips detallados y modal de análisis
- **Incident Management** - Sistema completo de lifecycle con estados unseen → unread → acknowledged → resolved
- **Cross-Module Correlation** - Detección de patrones entre eventos independientes
- **Recovery Actions** - Acciones correctivas automatizadas con rollback seguro

### Fixed
- **TypeScript logs date parameter** - Declaración de tipos corregida en `api/project/logs` previniendo fallos en la futura compilación de producción de la app
- **Theme toggle duplicate icon** - Reemplazo de icono `Sparkles` por el de sol `Sun` para el tema Modern, previniendo duplicidades con el nuevo icono de Relevancia de los filtros de búsqueda

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
