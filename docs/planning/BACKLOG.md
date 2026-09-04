# MIM Living Engineering Backlog & Technical Debt Tracker

Este documento actúa como el backlog vivo del proyecto MIM, rastreando el estado de la deuda técnica, las prioridades de ingeniería (metodología MoSCoW) y las métricas de madurez de software a lo largo de los ciclos de desarrollo.

---

## 📊 Métricas de Salud del Repositorio

| Métrica | Estado Anterior | Estado Actual | Meta Próximo Hito |
| :--- | :---: | :---: | :---: |
| **Suites de Prueba Headless** | 5 suites | **12 suites (100% pass, SAGE 3.0 MIM-Bot)** | Cobertura E2E/Hooks |
| **Protección Sistémica en API Pública** | 1 de 14 rutas (7%) | **14 de 14 rutas (100% withApiGuard + Zod)** | 100% mantenido en producción |
| **Instancias de `any` en TypeScript** | 1026 | **Fase 2 Completada (APIs + FOMO UI tipados)** | < 700 (Fase 3: useHomeController / hooks) |
| **Mitigación de Riesgo Legal (Mods)** | 0% automatizado | **100% (License Auditor + CI Script)** | Ampliar a quilt.mod.json y mods legacy |
| **Escaneo de Vulnerabilidades Dinámico** | Inexistente | **100% Integrado en GitHub Actions (`ci.yml`)** | Notificaciones automáticas de seguridad |
| **Mitigación de Bus Factor** | Débil (sin docs) | **Fuerte (`ARCHITECTURE.md` + `ONBOARDING.md`)** | Onboarding guiado por video/wiki |

---

## 🔴 Must Have (Crítico / En Curso)

- [x] **Protección Sistémica de APIs Públicas (`web/app/api/`)**:
  - [x] Wrapper universal `withApiGuard` con sliding-window rate limiter e inyección de cabeceras defensivas.
  - [x] Middleware global de perímetro Edge (`web/middleware.ts`) para filtrado de métodos y cabeceras OWASP.
  - [x] Cobertura del 100% (14/14 rutas) con esquemas Zod en SearchParams y Request Body.
- [x] **Proveedor Oficial de Traducción**:
  - [x] Reemplazo de endpoint no oficial por API oficial de DeepL / Google Cloud Translation / LibreTranslate con cadena de fallback y degradación graceful en [`web/lib/translator.ts`](file:///d:/.mine/manager/web/lib/translator.ts).
- [x] **Mitigación del Bus Factor**:
  - [x] Especificación de topología del sistema y diagramas de flujo de datos en [`docs/ARCHITECTURE.md`](file:///d:/.mine/manager/docs/ARCHITECTURE.md).
  - [x] Guía de onboarding para nuevos colaboradores en [`docs/ONBOARDING.md`](file:///d:/.mine/manager/docs/ONBOARDING.md).
- [x] **Reducción Progresiva de `any` (Fase 2)**:
  - [x] Tipado estricto en los 14 endpoints de `web/app/api/`.
  - [x] Reducir `any` en capas de UI complejas (`web/components/`, `components/fomo/`).

---

## 🟡 Should Have (Importante / Mediano Plazo)

- [x] **Auditoría de Licencias de Mods de Terceros**:
  - [x] Motor [`licenseAuditor.ts`](file:///d:/.mine/manager/lib/modding/licenseAuditor.ts) capaz de inspeccionar `fabric.mod.json`, `mods.toml`, `mcmod.info` y licencias embebidas.
  - [x] Alertas explícitas para mods "All Rights Reserved" o con restricciones de redistribución.
  - [x] CLI de inspección en [`scripts/audit-licenses.ts`](file:///d:/.mine/manager/scripts/audit-licenses.ts).
- [x] **Pentesting Dinámico y DAST**:
  - [x] Script automatizado [`scripts/security/dast-scan.js`](file:///d:/.mine/manager/scripts/security/dast-scan.js) para validación de cabeceras en vivo y rate limiters.
  - [x] Documentación de escaneo con OWASP ZAP y plantillas Nuclei en [`docs/THREAT_MODEL.md`](file:///d:/.mine/manager/docs/THREAT_MODEL.md).
- [x] **CI/CD Pipeline Automatizado**:
  - [x] Flujo de GitHub Actions para ejecutar automáticamente `npm test`, validación DAST y chequeo de tipos en cada PR.

---

## 🟢 Could Have (Deseable / Próximos Pasos)

- [x] **SAGE 3.0: Copiloto MIM-Bot, Inteligencia de Grafo FOMO y Profiling de Logs**:
  - [x] **Motor BYOK Multi-Modelo Local**: Conexión directa en Electron con OpenAI (ChatGPT Pro, GPT-4o, o1, o3-mini) y Google Gemini Pro (con Google Search Grounding). Almacenamiento local cifrado mediante `safeStorage` del SO sin enviar jamás las llaves a Vercel ni a la nube ([`lib/intelligence/sage/sageMimbotEngine.ts`](file:///d:/.mine/manager/lib/intelligence/sage/sageMimbotEngine.ts)).
  - [x] **Caché Persistente Local en la App**: Almacenamiento local de firmas de crash (`SHA-256`) y diagnósticos resueltos en el almacenamiento de la app Electron (`.mim-index/cache/sage-cache.json`) para re-consultas instantáneas sin re-consumo de tokens de API ([`lib/intelligence/sage/cacheEngine.ts`](file:///d:/.mine/manager/lib/intelligence/sage/cacheEngine.ts)).
  - [x] **Inteligencia de Grafo FOMO y Árbol de Descarte Lógico**: Análisis algorítmico sin azar ni suposiciones; cruce de árbol de dependencias de Modrinth/CurseForge, incompatibilidades documentadas y colisiones no documentadas por Mixin Injection ([`lib/intelligence/sage/fomoCorrelator.ts`](file:///d:/.mine/manager/lib/intelligence/sage/fomoCorrelator.ts)).
  - [x] **Profiler Preventivo de Logs en Vivo (`latest.log`, `debug.log`)**: Análisis de estado del juego en cliente y servidor para detectar memory leaks, packet/entity spam, tick-lag y sugerir stacks de optimización (Sodium, Lithium, FerriteCore, ModernFix, flags JVM) ([`lib/intelligence/sage/logProfiler.ts`](file:///d:/.mine/manager/lib/intelligence/sage/logProfiler.ts)).
  - [x] **UI Interactivo con Icono Saltarín**: Panel interactivo del copiloto y disparador en SAGE con animación `.animate-slime` ([`components/sage/parts/SageMimbotCopilot.tsx`](file:///d:/.mine/manager/components/sage/parts/SageMimbotCopilot.tsx)).
  - *Documento de arquitectura formal:* [`docs/PROPOSAL_SAGE_MIMBOT_INTELLIGENCE.md`](file:///d:/.mine/manager/docs/PROPOSAL_SAGE_MIMBOT_INTELLIGENCE.md).
- [x] **Modularización de Componentes Gigantes (`ModDetailsSheet.tsx`)**:
  - [x] Desacoplamiento de componente monolítico de 2,347 líneas en submódulos especializados en [`web/components/mod-details/`](file:///d:/.mine/manager/web/components/mod-details/).
  - [x] Todos los submódulos cumplen la regla estricta de permanecer por debajo de 500 líneas de código funcional.
- [ ] **Modularización Progresiva de Monolitos (> 500 líneas)**:
  - [x] **Fase 1: `web/components/tabs/ProfileTab.tsx` (1,310 líneas)**:
    - Descompuesto en 11 submódulos en [`web/components/profile/`](file:///d:/.mine/manager/web/components/profile/) (`ProfileAuthForm`, `ProfileHeader`, `ProfileDraftsSection`, `ProfileFavoritesSection`, `ProfileSharesSection`, `ProfileFollowedAuthorsSection`, `ProfileSovereignVaultCard`, `ProfileVaultModals`, `useProfileVault`, `utils`, `types`).
    - Orquestador reducido a 283 líneas; todos los submódulos por debajo de 300 líneas.
  - [ ] **Fase 2: `web/components/tabs/DiscoverTab.tsx` (862 líneas)** y **`web/components/DraftDetailView.tsx` (819 líneas)**:
    - Extraer subcomponentes atómicos para reducir la complejidad ciclomática de las vistas clave.
  - [ ] **Fase 3: `components/fomo/core/FomoVersionOverlay.tsx` (869 líneas)**:
    - Desacoplar selectores de versiones de Minecraft y loaders en subcomponentes modulares.
  - [ ] **Fase 4: `web/hooks/useHomeController.ts` (1,525 líneas)**:
    - Modularizar en sub-hooks de dominio (`useHomeFilters`, `useHomeDrafts`, `useHomeSearch`, `useHomeCommunity`).
- [ ] **Cache Distribuido Redis/Upstash (Opcional)**:
  - Para entornos serverless con múltiples réplicas independientes en Vercel donde el rate limiter en memoria local de Node.js pueda requerir sincronización global.
  - Driver desacoplado en [`web/lib/rateLimiter.ts`](file:///d:/.mine/manager/web/lib/rateLimiter.ts) con fallback transparente a Map local en ausencia de variables de entorno.
- [ ] **Reducción Progresiva de `any` (Fase 3 - Hooks Orquestadores)**:
  - Migración de tipado estricto en [`web/hooks/useHomeController.ts`](file:///d:/.mine/manager/web/hooks/useHomeController.ts) conectando contratos de `types/fomo.ts`.
  - Tipado de estado global para drafts, favoritos y colecciones de mods de usuario.
- [ ] **Ampliación de Formatos en Auditoría de Licencias**:
  - Incorporar soporte para manifiestos Quilt (`quilt.mod.json`) y resolución de dependencias transitivas.
- [x] **Soporte de Multi-idioma Extendido para SAGE**:
  - [x] Internacionalización completa de los mensajes de error diagnósticos generados por el pipeline de SAGE hacia inglés/español ([`lib/intelligence/sage/i18n.ts`](file:///d:/.mine/manager/lib/intelligence/sage/i18n.ts)).

---

## ⚪ Won't Have (Deliberadamente Fuera de Alcance)

- **Inspección en Runtime de Navegadores Automatizados**: La interacción visual en localhost está reservada exclusivamente a la experiencia y testing del desarrollador humano.
- **Carpeta `src/`**: La arquitectura del repositorio se mantendrá estrictamente en la raíz de App Router y directorios funcionales modulares.
- **SAGE Copilot en MIMHub (Web)**: Descartado deliberadamente por diseño arquitectónico; SAGE depende de operaciones intensivas de filesystem local (lectura de `crash-reports/`, `latest.log`, `options.txt`, inspección de bytecode de JARs y caché `safeStorage`), las cuales son exclusivas y nativas del entorno Desktop/Electron y no aplican al catálogo web.

