# MIM Living Engineering Backlog & Technical Debt Tracker

> **Referencia actual:** [cierres auditados del 2026-09-06](#revision-de-cierres-2026-09-06). Las métricas y estados de las secciones históricas no son una medición actual. Las tareas activas se mantienen en [Who's Next](../planning/whosnext.md).

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
  - [x] Reemplazo de endpoint no oficial por API oficial de DeepL / Google Cloud Translation / LibreTranslate con cadena de fallback y degradación graceful en [`web/lib/translator.ts`](../../web/lib/translator.ts).
- [x] **Mitigación del Bus Factor**:
  - [x] Especificación de topología del sistema y diagramas de flujo de datos en [`docs/architecture/overview.md`](../architecture/overview.md).
  - [x] Guía de onboarding para nuevos colaboradores en [`docs/guides/onboarding.md`](../guides/onboarding.md).
- [x] **Reducción Progresiva de `any` (Fase 2)**:
  - [x] Tipado estricto en los 14 endpoints de `web/app/api/`.
  - [x] Reducir `any` en capas de UI complejas (`web/components/`, `components/fomo/`).

---

## 🟡 Should Have (Importante / Mediano Plazo)

- [x] **Auditoría de Licencias de Mods de Terceros**:
  - [x] Motor [`licenseAuditor.ts`](../../lib/modding/licenseAuditor.ts) capaz de inspeccionar `fabric.mod.json`, `mods.toml`, `mcmod.info` y licencias embebidas.
  - [x] Alertas explícitas para mods "All Rights Reserved" o con restricciones de redistribución.
  - [x] CLI de inspección en [`scripts/audit-licenses.ts`](../../scripts/audit-licenses.ts).
- [x] **Pentesting Dinámico y DAST**:
  - [x] Script automatizado [`scripts/security/dast-scan.js`](../../scripts/security/dast-scan.js) para validación de cabeceras en vivo y rate limiters.
  - [x] Documentación de escaneo con OWASP ZAP y plantillas Nuclei en [`docs/security/threat-model.md`](../security/threat-model.md).
- [x] **CI/CD Pipeline Automatizado**:
  - [x] Flujo de GitHub Actions para ejecutar automáticamente `npm test`, validación DAST y chequeo de tipos en cada PR.

---

## 🟢 Could Have (Deseable / Próximos Pasos)

- [x] **SAGE 3.0: Copiloto MIM-Bot, Inteligencia de Grafo FOMO y Profiling de Logs**:
  - [x] **Motor BYOK Multi-Modelo Local**: Conexión directa en Electron con OpenAI (ChatGPT Pro, GPT-4o, o1, o3-mini) y Google Gemini Pro (con Google Search Grounding). Almacenamiento local cifrado mediante `safeStorage` del SO sin enviar jamás las llaves a Vercel ni a la nube ([`lib/intelligence/sage/sageMimbotEngine.ts`](../../lib/intelligence/sage/sageMimbotEngine.ts)).
  - [x] **Caché Persistente Local en la App**: Almacenamiento local de firmas de crash (`SHA-256`) y diagnósticos resueltos en el almacenamiento de la app Electron (`.mim-index/cache/sage-cache.json`) para re-consultas instantáneas sin re-consumo de tokens de API ([`lib/intelligence/sage/cacheEngine.ts`](../../lib/intelligence/sage/cacheEngine.ts)).
  - [x] **Inteligencia de Grafo FOMO y Árbol de Descarte Lógico**: Análisis algorítmico sin azar ni suposiciones; cruce de árbol de dependencias de Modrinth/CurseForge, incompatibilidades documentadas y colisiones no documentadas por Mixin Injection ([`lib/intelligence/sage/fomoCorrelator.ts`](../../lib/intelligence/sage/fomoCorrelator.ts)).
  - [x] **Profiler Preventivo de Logs en Vivo (`latest.log`, `debug.log`)**: Análisis de estado del juego en cliente y servidor para detectar memory leaks, packet/entity spam, tick-lag y sugerir stacks de optimización (Sodium, Lithium, FerriteCore, ModernFix, flags JVM) ([`lib/intelligence/sage/logProfiler.ts`](../../lib/intelligence/sage/logProfiler.ts)).
  - [x] **UI Interactivo con Icono Saltarín**: Panel interactivo del copiloto y disparador en SAGE con animación `.animate-slime` ([`components/sage/parts/SageMimbotCopilot.tsx`](../../components/sage/parts/SageMimbotCopilot.tsx)).
  - *Documento de arquitectura formal:* [`docs/proposals/mimbot-sage-graph.md`](../proposals/mimbot-sage-graph.md).
- [x] **Modularización de Componentes Gigantes (`ModDetailsSheet.tsx`)**:
  - [x] Desacoplamiento de componente monolítico de 2,347 líneas en submódulos especializados en [`web/components/mod-details/`](../../web/components/mod-details).
  - [x] Todos los submódulos cumplen la regla estricta de permanecer por debajo de 500 líneas de código funcional.
- [ ] **Modularización Progresiva de Monolitos (> 500 líneas)**:
  - [x] **Fase 1: `web/components/tabs/ProfileTab.tsx` (1,310 líneas)**:
    - Descompuesto en 11 submódulos en [`web/components/profile/`](../../web/components/profile) (`ProfileAuthForm`, `ProfileHeader`, `ProfileDraftsSection`, `ProfileFavoritesSection`, `ProfileSharesSection`, `ProfileFollowedAuthorsSection`, `ProfileSovereignVaultCard`, `ProfileVaultModals`, `useProfileVault`, `utils`, `types`).
    - Orquestador reducido a 283 líneas; todos los submódulos por debajo de 300 líneas.
  - [ ] **Fase 2: `web/components/tabs/DiscoverTab.tsx` (862 líneas)** y **`web/components/DraftDetailView.tsx` (819 líneas)**:
    - Extraer subcomponentes atómicos para reducir la complejidad ciclomática de las vistas clave.
  - [ ] **Fase 3: `components/fomo/core/FomoVersionOverlay.tsx` (869 líneas)**:
    - Desacoplar selectores de versiones de Minecraft y loaders en subcomponentes modulares.
  - [ ] **Fase 4: `web/hooks/useHomeController.ts` (1,525 líneas)**:
    - Modularizar en sub-hooks de dominio (`useHomeFilters`, `useHomeDrafts`, `useHomeSearch`, `useHomeCommunity`).
- [ ] **Cache Distribuido Redis/Upstash (Opcional)**:
  - Para entornos serverless con múltiples réplicas independientes en Vercel donde el rate limiter en memoria local de Node.js pueda requerir sincronización global.
  - Driver desacoplado en [`web/lib/rateLimiter.ts`](../../web/lib/rateLimiter.ts) con fallback transparente a Map local en ausencia de variables de entorno.
- [ ] **Reducción Progresiva de `any` (Fase 3 - Hooks Orquestadores)**:
  - Migración de tipado estricto en [`web/hooks/useHomeController.ts`](../../web/hooks/useHomeController.ts) conectando contratos de `types/fomo.ts`.
  - Tipado de estado global para drafts, favoritos y colecciones de mods de usuario.
- [ ] **Ampliación de Formatos en Auditoría de Licencias**:
  - Incorporar soporte para manifiestos Quilt (`quilt.mod.json`) y resolución de dependencias transitivas.
- [x] **Soporte de Multi-idioma Extendido para SAGE**:
  - [x] Internacionalización completa de los mensajes de error diagnósticos generados por el pipeline de SAGE hacia inglés/español ([`lib/intelligence/sage/i18n.ts`](../../lib/intelligence/sage/i18n.ts)).

---

## ⚪ Won't Have (Deliberadamente Fuera de Alcance)

- **Inspección en Runtime de Navegadores Automatizados**: La interacción visual en localhost está reservada exclusivamente a la experiencia y testing del desarrollador humano.
- **Carpeta `src/`**: La arquitectura del repositorio se mantendrá estrictamente en la raíz de App Router y directorios funcionales modulares.
- **SAGE Copilot en MIMHub (Web)**: Descartado deliberadamente por diseño arquitectónico; SAGE depende de operaciones intensivas de filesystem local (lectura de `crash-reports/`, `latest.log`, `options.txt`, inspección de bytecode de JARs y caché `safeStorage`), las cuales son exclusivas y nativas del entorno Desktop/Electron y no aplican al catálogo web.


## Revision de cierres 2026-09-06

Auditoría del checkout `ad7f939` (package v11.4.5). Esta sección prevalece sobre los estados y métricas históricos anteriores: registra capacidades existentes, no atribuye todas ellas a una nueva release. Los pendientes activos están en [whosnext](../planning/whosnext.md). Evidencia de implementación no equivale a una prueba visual o a validación de producción.

| Cierre trasladado desde whosnext / Unicorn | Evidencia y alcance comprobado |
|---|---|
| [x] Guard obligatorio y auditor AST fail-closed | `scripts/security/verify-api-guard.ts`, allowlist explícita y fixtures negativos de `scripts/__tests__/api-guard.test.ts`; CI ejecuta auditor. Medición: 113/113 handlers, 94 rutas. Los casos de wrapper todavía faltantes siguen en API-01. |
| [x] Guard de `/api/sage/chat` | `app/api/sage/chat/route.ts`: schema de body y límite 25/min. Guard y schemas no equivalen a validación de todo contenido generado. |
| [x] Secret management — Unicorn §2.1 / Fase 2 puntos 1–2 | `standalone/secret-store.js`, `standalone/main.js`, `lib/core/settings.ts`, `lib/core/migrateLegacyBrowserSecret.ts`, `app/api/settings/route.ts`: cifrado safeStorage en Desktop empaquetado, migración y respuesta redactada; runtime sin IPC conserva nuevas claves en sesión. Test `secure-settings.test.ts` ejecutado con safeStorage simulado; no es una prueba del cifrado nativo en Electron. La migración conserva datos antiguos si falla para evitar pérdida. No afirmar persistencia de claves de MIMHub sin evidencia. |
| [x] Chat streaming y errores diferenciados | `app/api/sage/chat/route.ts`, `geminiStream.ts`, `streamContract.ts`, `errorContract.ts` y `SageMimbotCopilot.tsx`: SSE upstream, NDJSON, cancelación y separación 401/429. Suites de stream y errores ejecutadas. |
| [x] Contexto, cascada y parámetros de inferencia | Endpoint de chat: últimos seis mensajes, memoria del último modelo exitoso, 280/700 tokens y temperatura Bully 0.5. Caché añade contexto del culpable; no responde por sí sola todas las quick questions ni evita toda llamada LLM. No cierra routing semántico de Unicorn §1.4. |
| [x] UX básica de MimBot | `SageMimbotCopilot.tsx` y `components/sage/parts/mimbot/`: tooltips de modo, copiar respuesta, Undo de 4.5 s, etiquetas accesibles y error de cuota inline. Inspección de código; falta cobertura UI/E2E. “Gemini Conectado” queda reabierto en BOT-04. |
| [x] Fronteras arquitectónicas — Unicorn §6.2 | `scripts/architecture/verify-boundaries.ts`, `architecture-boundaries.test.ts`, `.github/workflows/ci.yml`: core modding/intelligence/security no importa UI/runtime, web no importa standalone. Auditor y siete casos de contrato ejecutados. No implica cobertura de cualquier frontera imaginable. |
| [x] Licencias Quilt | `lib/modding/licenseAuditor.ts` y fixture en `license-auditor.test.ts`: lectura de `quilt.mod.json`. La resolución transitiva del ítem histórico sigue abierta. |
| [x] Discover Phase 1 | `web/hooks/useHomeController.ts` compone `useHomeDiscover`; `web/lib/discover/` separa cache, payload y búsqueda; `home-discover.test.ts` importa esas implementaciones. Ya mencionado en changelog v11.4.5 como verificación de PR #45. El resto del controlador sigue pendiente. |
| [x] Reducción inicial del presupuesto de lint | `package.json`: `--max-warnings=471`; commit `7ed6b09`. Se cierra el abandono del techo 9999, no el saneamiento completo de Fase 0. |
| [x] Base de evaluación determinista SAGE | `scripts/evaluation/sage-eval.ts` y corpus fijo; ya registrado en changelog v10.5.0. No cierra evals de respuestas LLM, ni garantiza generalización, ni demuestra ausencia de alucinaciones. Nuevos criterios en SAGE-01–07. |
| [x] ARCH-01 — runtime/persistencia del caché SAGE | PR #55 / merge `d978e2b`: `cacheEngine.ts` conserva su API pública y retira los tres `eval("require")`; persistencia Node/browser queda detrás de adaptadores específicos. `sage-cache-runtime.test.ts` cubre browser save/load/corrupción y Node persistencia/reload/atomic-write/recovery; CI del merge pasa lint/types, Systems, DAST y build Web. No se ejecutó empaquetado Windows/Electron. |
| [x] SAGE-08 — explainer multimodal real | PR #53 importó `lib/intelligence/modExplainer.ts`; PR #62 / merge `a729cba` añadió ejecución del consumidor HTTP real `/api/fomo/explain`. La suite controla proveedor e imágenes y verifica metadata, payload multimodal, grounding, respuesta HTTP y fallback local. Los checks del head #62 pasaron Systems, DAST, build y Codacy; el `main` posterior permanece verde. Este cierre corresponde al explainer multimodal y no equivale a evals generales de MimBot ni a Unicorn §1.3 completo. |

### Correcciones de estado

- El cierre anterior de tests completos de `withApiGuard` se reduce a los casos presentes; `Retry-After`, params dinámicos y excepción del handler requieren pruebas adicionales.
- La validación preventiva existe como endpoint, pero el copiloto usa presencia de clave; se reabre su integración y el indicador de conexión.
- Caché de diagnósticos existente no equivale a historial de chat ni caché de respuestas por 24 horas.
- Multi-proveedor conectado de extremo a extremo no se considera cerrado por la rama OpenAI en el motor; ver BOT-05.
- Las fases generales de Unicorn permanecen parciales cuando sólo hay evidencia de un subsistema (errores SAGE, fixtures existentes, migración puntual o caché).

## Reconciliación de cierres 2026-09-10

| Cierre verificado | Evidencia y alcance comprobado |
|---|---|
| [x] CI-SSH2 — empaquetado Desktop de Server/SFTP | PR #69 integró `serverExternalPackages: ["ssh2"]`; el merge de #68 `d098d7ad5607d2f37dd644f71662d39e5e92c794` contiene esa configuración. MIM Systems Engineering CI #191 sobre ese SHA pasó Lint/Types, Systems, DAST, build Desktop y build Hub. Cierra sólo la regresión de empaquetado; no verifica semántica SFTP ni cierra #58. |
| [x] BOT-05 — subalcance lifecycle/credenciales de MIMBOT-GW | PR #68 / merge `d098d7ad5607d2f37dd644f71662d39e5e92c794`: cancelación y timeout llegan a Gemini/OpenRouter, retry comparte el ciclo cancelable, el mini-chat usa el proveedor seleccionado y las credenciales permanecen fuera de URLs. CI #191 valida runner obligatorio y ambos builds. BOT-05 global y decisiones de producto multi-proveedor permanecen abiertos. |
