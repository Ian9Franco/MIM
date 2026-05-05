# 🧠 MIM — Centro de Control y Estrategia

Este documento centraliza las ideas, integraciones pendientes y la visión a largo plazo para transformar el **Minecraft Intelligent Manager (MIM)** de un proyecto personal a una herramienta de nivel profesional.

**Última actualización:** 2026-05-05 — Security Layer v1.0 y FOMO UI 2.0 completada

---

## 📑 Tabla de Contenidos
- [✅ Completado Recientemente](#-completado-recientemente)
- [🚧 En Progreso](#-en-progreso)
- [🗺️ Roadmap Estratégico](#️-roadmap-estratégico)
    - [Fase 1: Producto Base y Presencia](#fase-1-producto-base-y-presencia)
    - [Fase 2: Core Features Poderosas](#fase-2-core-features-poderosas)
    - [Fase 3: Security Layer](#fase-3-security-layer)
    - [Fase 4: IA de Valor Real](#fase-4-ia-de-valor-real)
    - [Fase 5: Posicionamiento Profesional](#fase-5-posicionamiento-profesional)
- [🎯 Prioridades S+](#-prioridades-s)
- [📜 Regla de Oro](#-regla-de-oro)

---

- **README Killer (Español):** Reescritura completa con Hero potente y case study técnico.
- **Sincronización de Integridad (SHA1):** Generación automática de hashes SHA1 para todos los archivos locales para matching exacto con Modrinth.
- **FOMO UI 2.0:** Rediseño a 2 columnas, mayor densidad de información, backdrop blur y tarjetas premium.
- **Detailed Version Overlay:** Panel de detalles completo con changelogs, historial y resolución de dependencias (Required/Optional).
- **Threat Detection Engine v1.0:** Análisis de bytecode para detectar malware, ejecución de procesos y llamadas de red sospechosas.
- **Security Scoring System:** Clasificación de riesgo 0-100 con badges visuales.
- **Multi-Theme & High Contrast:** Soporte completo para temas claro/oscuro con tokens dinámicos y legibilidad optimizada (Modern/Vampire).
- **Premium UX Polish:** Glassmorphism avanzado, custom scrollbars ultra-finos y transiciones fluidas.


### Backend Refactor Completo
- **17 bugs críticos corregidos** — path traversal, race conditions, rate limiting, memory leaks.
- **33 mejoras aplicadas** — helpers de validación como SSOT, JSDoc completo, logs estructurados.
- **Archivos modificados:** `lib/constants.ts`, `lib/scanner.ts`, `lib/watcher.ts`, `lib/builder.ts`, y 7 API routes.

### Features de UX
- Thumbnail extraction local (Base64) sin depender de internet.
- Settings persistentes (`mim-settings.json`).
- Filtros dinámicos en FOMO según tipo de asset (oculta Loader en Shaders).
- Global scaling 17px, pixel-perfect icons.

---

## 🚧 En Progreso

| Feature | Estado | Descripción |
|---------|--------|-------------|
| **JAR Scanner Avanzado** | 🚧 Diseño | Detección de dependencias rotas e incompatibilidades |
| **Conflict Engine** | 🚧 Diseño | Detección de conflictos entre mods |
| **Crash Interpreter** | 🚧 Diseño | Traducción de logs a acciones accionables |
| **Memory de Clasificación** | 🚧 Diseño | Pre-seleccionar categoría basada en historial |
| **Sinytra Connector Flag** | 🚧 Diseño | Vista combinada Fabric+Forge para builds híbridos |

---

## 🗺️ Roadmap Estratégico
> [!TIP]
> El objetivo es pasar de "otro repo abandonado" a un proyecto que demuestre seniority y capacidad de producto.

### Fase 1: Producto Base y Presencia
*Que no parezca un proyecto de las 3 AM.*

- [x] **README Killer:** Hero potente, diagramas de arquitectura, case study técnico.
- [ ] **Demo Deployable:** Landing funcional o showcase visual que no requiera instalación inmediata.
- [ ] **Video Demo:** 60-90 segundos de "Problema → Solución → Wow factor".
- [ ] **Portfolio Case Study:** Documentación de decisiones, problemas y soluciones.

### Fase 2: Core Features Poderosas
*Donde MIM se vuelve indispensable.*

| Feature | Descripción | Objetivo |
| :--- | :--- | :--- |
| **JAR Scanner** | ✅ Lectura profunda de metadata, versiones y loaders. | Base de datos local sólida. |
| **JAR Scanner Avanzado** | 🚧 Detección de dependencias rotas e incompatibilidades. | Prevenir crashes. |
| **Conflict Engine** | 🚧 Detección de dependencias rotas e incompatibilidades de loaders. | Evitar sufrimiento humano. |
| **Crash Interpreter** | 🚧 Traducción de logs de Java a sugerencias accionables. | UX de diagnóstico. |
| **Memory de Clasificación** | 🚧 Pre-seleccionar categoría basada en historial. | Fricción cero. |
| **Sinytra Connector Flag** | 🚧 Vista combinada Fabric+Forge para builds híbridos. | Compatibilidad máxima. |

### Fase 3: Security Layer
*Instalar mods no debería ser un riesgo.*

**🚧 En Progreso (2026-05-04):**
- **Threat Detection Engine v1.0:** ✅ Implementado
  - `lib/security-scanner.ts` — Análisis de bytecode Java
  - `POST /api/security/scan` — Endpoint de scanning
  - Detección de: Process Execution, Native Code, Reflection Abuse, Network Calls
  - Sistema de scoring 0-100 con 4 niveles de riesgo
  - Base de datos de hashes de malware (starter)
  - Batch scanning para múltiples archivos

**📋 Pendiente:**
- **Risk Score UI:** ✅ Mostrar badge de seguridad en ModCard y Alert Center
- **Theme Awareness:** ✅ Sincronización de componentes con variables CSS (Zero hardcoded colors)
- **Contrast Optimization:** ✅ Legibilidad 100% en modo light (Modern theme)
- **Known Threat DB:** 🚧 Integración con APIs externas (VirusTotal, etc.)
- **Auto-scan:** 🚧 Escanear automáticamente al clasificar nuevos mods
- **Whitelist:** Mods verificados de Modrinth/CurseForge

Ver documentación completa: `docs/security.md`

### Fase 4: IA de Valor Real
*IA que resuelve problemas, no un chatbot decorativo.*

- **AI Security Analysis:** Análisis de contexto y anomalías en el comportamiento del código.
- **Natural Language Search:** Búsqueda semántica (ej: "mods medievales oscuros con magia").
- **Smart Recommendations:** "Si usas esto, probablemente quieras esto".
- **Auto-Optimization:** Ajuste automático de Java args y shaders según el hardware.

### Fase 5: Posicionamiento Profesional
*Arquitectura y mentalidad de Senior.*

- **Arquitectura Visual:** Diagramas de flujo de sistema (Frontend ↔ Backend ↔ Scanner ↔ IA).
- **Technical Case Study:** Documentación de trade-offs técnicos y escalabilidad.
- **Branding de Producto:** Naming profesional (ej: *Threat Detection Engine* en vez de "antivirus").

---

## 🎯 Prioridades S+
Si tienes poco tiempo, enfócate en esto:
1. **Security UI Integration** (Mostrar risk score en cards, badge visual)
2. **Crash Log Interpreter** (Valor inmediato)
3. **Conflict Detection Engine** (Resolución de fricción)
4. **Portfolio Case Study** (Impacto laboral)
5. **Demo Deployable** (Viral potential)

**✅ Completado recientemente:** Threat Detection Engine v1.0 — Análisis de bytecode con scoring 0-100 implementado.

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
