# 📋 ¿Qué falta hacer en MIM? — Resumen Maestro de Tareas Pendientes

> **Propósito:** Este documento consolida punto por punto todo el trabajo pendiente en el proyecto, organizado por áreas de dominio, con enlaces directos a las especificaciones y planes detallados donde se profundiza cada tema.

---

## 🧭 Índice Rápido

1. [🖥️ MIM Server & Sincronización Remota (Issue #58)](#1-mim-server--sincronización-remota-issue-58)
2. [📦 Arquitectura de Monorepo & Workspaces (Issue #60)](#2-arquitectura-de-monorepo--workspaces-issue-60)
3. [🤖 MIMbot & Model Gateway](#3-mimbot--model-gateway)
4. [🧹 Calidad de Código, Refactorings & Deuda Técnica](#4-calidad-de-código-refactorings--deuda-técnica)
5. [📊 Rigor de Evaluación (SAGE & MIMbot Evals)](#5-rigor-de-evaluación-sage--mimbot-evals)
6. [🎨 UI / UX & Experiencia de Usuario](#6-ui--ux--experiencia-de-usuario)
7. [💡 Propuestas Técnicas Futuras (RFCs)](#7-propuestas-técnicas-futuras-rfcs)

---

## 1. 🖥️ MIM Server & Sincronización Remota (Issue #58)

| Ítem Pendiente | Estado | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Persistencia durable de Snapshots:** Crear backend en disco para snapshots (`ISnapshotStore`) y recuperación de planes ante reinicio del servidor o desconexión. | `SRV-3` | 📘 [server-manager.md](./architecture/server-manager.md)<br/>📌 [ROADMAP.md (Sección 9)](./planning/ROADMAP.md#9-server-manager--sincronización-remota-issue-58--en-progreso) |
| **Habilitar Executor & Rollback en UI:** Integrar en Desktop el botón de despliegue atómico con staging `.mim_staging/`, compensación automática y estado `recovery-required`. | `SRV-4` | ⚡ [sprint-action-plan.md](./planning/sprint-action-plan.md)<br/>📘 [server-manager.md](./architecture/server-manager.md) |
| **SAGE Remoto integrado en UI:** Conectar el visualizador de diagnósticos remotos para `latest.log` y crash reports del servidor con correlación de deploys. | `SRV-5` | 📘 [server-manager.md](./architecture/server-manager.md)<br/>🩺 [sage.md](./engines/sage.md) |
| **Módulo de Administración Integrado:** Conectar parser/serializador de `server.properties`, consola RCON sanitizada y backup explorer en la interfaz Desktop. | `SRV-6` | 📘 [server-manager.md](./architecture/server-manager.md) |
| **Sincronización Multiplayer Cliente-Servidor:** Flujo integrado para que jugadores se sincronicen en 1 clic descargando los mods requeridos del servidor AllHost. | `SRV-7` | 📘 [server-manager.md](./architecture/server-manager.md) |

---

## 2. 📦 Arquitectura de Monorepo & Workspaces (Issue #60)

| Ítem Pendiente | Estado | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Mover `web/` a `apps/hub`:** Trasladar la aplicación PWA/Web al workspace `apps/hub`, unificando aliases y eliminando dependencias duplicadas. | `ARCH-5` | ⚡ [sprint-action-plan.md](./planning/sprint-action-plan.md)<br/>📦 [monorepo-inventory.md](./architecture/monorepo-inventory.md) |
| **Surface explícita de Server Manager:** Resolver si Server Manager vive como sección en `apps/desktop` o package modular `@mim/server-ui`. | `ARCH-6` | ⚡ [sprint-action-plan.md](./planning/sprint-action-plan.md) |
| **CI Scoped por Superficie:** Pipeline de GitHub Actions que solo ejecute builds/tests de los packages y apps afectados por cada commit. | `ARCH-7` | ⚡ [sprint-action-plan.md](./planning/sprint-action-plan.md) |
| **Versionado Semántico Independiente:** Política de releases separadas por app/package sin forzar un bump global de versión. | `ARCH-8` | ⚡ [sprint-action-plan.md](./planning/sprint-action-plan.md) |

---

## 3. 🤖 MIMbot & Model Gateway

> **Estado (2026-09-10):** El **Model Gateway (ADR-007)** está **cerrado** en `main` (#68, #70, #73–#75). Lo que queda en esta sección es **backlog de producto/UX** de MIMbot, no infraestructura de gateway.

### ✅ Model Gateway (ADR-007) — cerrado

| Ítem | Tarea | Evidencia |
| :--- | :--- | :--- |
| **Gateway request lifecycle** | `BOT-05a` | PR #68 — cancelación, timeout 15s, retries cancelables, credenciales en headers |
| **Naming MIM-Bot Chat** | — | PR #70 — `mim-bot-chat`, `mimBotChat()`, `MIM_BOT_CHAT_MODE` |
| **Estado de conexión Gemini en copiloto** | `BOT-04` | Validación real vía `/api/settings/validate-keys` + badge en `SageMimbotCopilot` |
| **Model Router por intención** | `BOT-GW` | PR #73 — `modelGateway.ts`: texto → GLM/OpenRouter, multimodal/búsqueda → Gemini |
| **SAGE chat unificado multi-proveedor** | `BOT-05b` | PR #74 — `sageChatEngine.ts` unifica `/api/sage/chat` y `sageMimbotEngine` |
| **Salida JSON en explain-deps** | `BOT-JSON` | PR #74 — Zod + fallback determinista en `dependencyExplain.ts` |
| **Observabilidad de cuotas IA** | `BOT-06` | PR #75 — `quotaClassifier.ts`, `GET /api/settings/ai-quota`, panel en Settings |
| **Seguimientos contextuales post-chat** | `BOT-03` | PR #77 — `deriveFollowUpSuggestions()` — dos chips tras primer intercambio |
| **Caché 24 h quick questions** | `BOT-08` | PR #77 — `quickQuestionCache.ts` — clave crash/pregunta/modo en `SageMimbotCopilot` |
| **Historial local opt-in** | `BOT-01` | PR #78 — `chatHistoryStore.ts` — persistencia por crash + Settings + borrado |
| **Vista previa estática pre-BYOK** | `BOT-02` | PR #78 — `MimbotDemoPreview` — ejemplo fijo sin backend gratuito |
| **Transparencia BYOK** | `BOT-09` | PR #78 — `mimbotByokTransparency.ts` — panel Settings + modal config |
| **Persistencia credenciales Desktop (upgrade release)** | — | PR #79 — recuperación legacy + `MIM_PORTABLE_DIR` / `MIM_DESKTOP_RUNTIME`; [desktop-credentials.md](./guides/desktop-credentials.md) |
| **Costos OpenRouter en UI** | `BOT-06b` | PR #79 — `openRouterAccount.ts`, campo `openRouter` en `GET /api/settings/ai-quota` |
| **Suite eval MIMbot (fixtures baseline)** | `SAGE-05` | PR #79 — `mimbot-fixtures.json` (18 casos), `npm run eval:mimbot` |

Fuera del alcance inicial de ADR-007 (siguen abiertos en otras secciones o backlog): gate CI live MIMbot (`SAGE-05b`), migración de rutas legacy en `web/`, flags de modelo en UI.

### Pendiente — producto MIMbot / UX

| Ítem Pendiente | Tarea | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Cola para Análisis por Lotes (condicional):** Concurrencia acotada, cancelación y espera según cuota real — solo si se incorpora ese flujo. | `BOT-07` | 🟢 [whosnext.md (BOT-07)](./planning/whosnext.md#2-funcionamiento-y-ux-de-mimbot) |

---

## 4. 🧹 Calidad de Código, Refactorings & Deuda Técnica

| Ítem Pendiente | Tarea | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Reducción de `any` en TypeScript:** Bajar uso de `any` en hooks orquestadores (`useHomeController`, `useAlertManager`) y fronteras core. | `REC-01` | 🧹 [refactoring-backlog.md](./planning/refactoring-backlog.md)<br/>🟢 [whosnext.md (REC-01)](./planning/whosnext.md#3-calidad-y-arquitectura--revisión-recruiter) |
| **Reducción de Warnings ESLint:** Reducción progresiva de deuda. Techo Desktop bajó de 471 a 400 (medido en CI #221: 395); Techo Hub bajó de 100 a 75 (medido: 69). | `REC-02` | 🟢 [whosnext.md (REC-02)](./planning/whosnext.md#3-calidad-y-arquitectura--revisión-recruiter) |
| **Modularizar Componentes > 600 Líneas:**<br/>• `DiscoverTab.tsx` (158L, extraído a `web/components/tabs/discover/`)<br/>• `DraftDetailView.tsx` (188L, extraído a `web/components/draft-detail/`)<br/>• `FomoVersionOverlay.tsx` (186L, extraído a `components/fomo/details/`)<br/>• `useHomeController.ts` (Phase 2 verificación final `NEEDS_USER` & Phase 3 Profile/Community). REC-03 global permanece abierto. | `REC-03` | 🧹 [refactoring-backlog.md](./planning/refactoring-backlog.md)<br/>🟢 [whosnext.md (REC-03)](./planning/whosnext.md#3-calidad-y-arquitectura--revisión-recruiter) |
| **Inventario Zod en rutas restantes:** Mutaciones core (`build`, `delete`, `staging`, `tweak`) ya usan `bodySchema`/`querySchema` del guard. Falta inventariar handlers secundarios y extraer contratos compartidos con clientes. | `API-02b` | 🟢 [whosnext.md (API-02)](./planning/whosnext.md#1-proceso-y-contratos-api) |
| **Tests E2E de UI:** Agregar 3–5 recorridos E2E reproducibles (Discover → Detalle → Descarga y manejo de reintentos de red). | `REC-04` | 🟢 [whosnext.md (REC-04)](./planning/whosnext.md#3-calidad-y-arquitectura--revisión-recruiter) |

---

## 5. 📊 Rigor de Evaluación (SAGE & MIMbot Evals)

| Ítem Pendiente | Tarea | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Generalización del Dataset SAGE:** Anonimización formal, registro de licencias y separación de conjunto ciego (unseen logs) para validación. | `SAGE-01` | 📊 [sage-eval.md](./engines/sage-eval.md)<br/>🟢 [whosnext.md (SAGE-01)](./planning/whosnext.md#4-evaluación-sage-y-mimbot) |
| **Métricas Top-1/Top-3 Rigurosas:** Separar formalmente en el reporte casos con culpable atribuible de aciertos sistémicos sin culpable. | `SAGE-02` | 📊 [sage-eval.md](./engines/sage-eval.md)<br/>🟢 [whosnext.md (SAGE-02)](./planning/whosnext.md#4-evaluación-sage-y-mimbot) |
| **Gate Automatizado de CI:** Hacer que `npm run eval:sage` falle el pipeline si las métricas caen por debajo de los umbrales históricos. | `SAGE-03` | 📊 [sage-eval.md](./engines/sage-eval.md)<br/>🟢 [whosnext.md (SAGE-03)](./planning/whosnext.md#4-evaluación-sage-y-mimbot) |
| **Scoring live MIMbot en CI:** Ejecutar fixtures contra LLM real (`RUN_MIMBOT_LIVE=1`) y gate de regresión. | `SAGE-05b` | 🦄 [unicorn.md (§1.3)](./planning/unicorn.md)<br/>Baseline en `scripts/evaluation/mimbot-fixtures.json` |

---

## 6. 🎨 UI / UX & Experiencia de Usuario

| Ítem Pendiente | Plataforma | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Ajuste de Header en Móvil:** Reducir la altura del encabezado en Safari/iOS al abrir detalles de mod para no tapar la descripción/versiones. | MIMhub Mobile | 🎨 [ux-feedback.md](./planning/ux-feedback.md) |
| **Contraste en Tema Modern:** Mejorar legibilidad del bloque de entorno (Cliente/Servidor) sobre fondo claro. | MIMhub Web | 🎨 [ux-feedback.md](./planning/ux-feedback.md) |
| **Selección y Navegación en Descubrir:** 1 clic para abrir detalles, doble clic para seleccionar mod. | MIM Desktop | 🎨 [ux-feedback.md](./planning/ux-feedback.md) |
| **Filtro Dual por Defecto:** Activar búsqueda simultánea en Modrinth y CurseForge por defecto al buscar contenido. | MIM Desktop | 🎨 [ux-feedback.md](./planning/ux-feedback.md) |
| **Rediseño de Seguidos & Editorial:** Nueva interfaz de proyectos seguidos y showcase 3D para sección editorial. | MIMhub / Desktop | 🎨 [ux-feedback.md](./planning/ux-feedback.md) |

---

## 7. 💡 Propuestas Técnicas Futuras (RFCs)

| Propuesta | Concepto | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Vault Criptográfico Local:** Bóveda cifrada para backups de credenciales, partidas y mundos garantizando soberanía total sin cloud obligatoria. | RFC | 🛡️ [vault-data-sovereignty.md](./proposals/vault-data-sovereignty.md) |
| **Search Grounding Desacoplado:** Motor de búsqueda web externo e independiente para enriquecer resúmenes de mods antes de llamar al LLM. | RFC | 🔍 [mod-explainer.md](./proposals/mod-explainer.md) |
| **MIMbot Proactivo:** Notificaciones de perfil para actualizaciones de mods seguidos y resúmenes automáticos de changelogs en el feed. | RFC | 🤖 [mimbot-sage-graph.md](./proposals/mimbot-sage-graph.md) |
