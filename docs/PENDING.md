# 📋 ¿Qué falta hacer en MIM? — Resumen Maestro de Tareas Pendientes

> **Propósito:** Este documento consolida punto por punto todo el trabajo pendiente en el proyecto, organizado por áreas de dominio, con enlaces directos a las especificaciones y planes detallados donde se profundiza cada tema.

---

## 🧭 Índice Rápido

1. [🖥️ MIM Server & Sincronización Remota (Issue #58)](#1-mim-server--sincronización-remota-issue-58)
2. [📦 Arquitectura de Monorepo & Workspaces (Issue #60)](#2-arquitectura-de-monorepo--workspaces-issue-60)
3. [🤖 MIMbot & Model Gateway (Backlog LLM)](#3-mimbot--model-gateway-backlog-llm)
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

## 3. 🤖 MIMbot & Model Gateway (Backlog LLM)

### ✅ Cerrado recientemente (main)

| Ítem | Tarea | Evidencia |
| :--- | :--- | :--- |
| **Gateway request lifecycle** | `BOT-05a` | PR #68 — cancelación, timeout 15s, retries cancelables, credenciales en headers |
| **Naming MIM-Bot Chat** | — | PR #70 — `mim-bot-chat`, `mimBotChat()`, `MIM_BOT_CHAT_MODE` |
| **Estado de conexión Gemini en copiloto** | `BOT-04` | Validación real vía `/api/settings/validate-keys` + badge en `SageMimbotCopilot` |
| **Model Router por intención** | `BOT-GW` | `modelGateway.ts` — texto → GLM/OpenRouter, multimodal/búsqueda → Gemini |

### Pendiente (gateway y producto)

| Ítem Pendiente | Tarea | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Multi-proveedor en SAGE follow-up:** Revisar rama OpenAI desconectada en `sageMimbotEngine.ts` vs contrato Gemini/OpenRouter. | `BOT-05b` | 🟢 [whosnext.md (BOT-05b)](./planning/whosnext.md#2-funcionamiento-y-ux-de-mimbot) |
| **Structured JSON Output:** Validación estricta con schemas Zod sobre las respuestas generadas por los modelos para prevenir alucinaciones de formato. | `BOT-JSON` | 📌 [ROADMAP.md (Sección 5)](./planning/ROADMAP.md#5-pipeline-de-inferencia--model-backlog-pendiente--futuro) |
| **Caché Semántico / Hashing de Contexto:** Cachear por hash de evidencia para no reenviar inferencias ante consultas idénticas. | `BOT-08` | 🟢 [whosnext.md (BOT-08)](./planning/whosnext.md#2-funcionamiento-y-ux-de-mimbot) |
| **Historial de Conversación Local:** Persistir conversaciones por firma de crash de forma opt-in con botón de borrado explícito. | `BOT-01` | 🟢 [whosnext.md (BOT-01)](./planning/whosnext.md#2-funcionamiento-y-ux-de-mimbot) |
| **Chips de Preguntas Contextuales Dinámicas:** Sugerencias de seguimiento inteligentes ligadas a la última respuesta del modelo. | `BOT-03` | 🟢 [whosnext.md (BOT-03)](./planning/whosnext.md#2-funcionamiento-y-ux-de-mimbot) |
| **Observabilidad de Cuotas & Costos:** Monitoreo inline de RPM/TPM y costo acumulado de OpenRouter en la interfaz de Settings. | `BOT-06` | 🟢 [whosnext.md (BOT-06)](./planning/whosnext.md#2-funcionamiento-y-ux-de-mimbot) |

---

## 4. 🧹 Calidad de Código, Refactorings & Deuda Técnica

| Ítem Pendiente | Tarea | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Reducción de `any` en TypeScript:** Bajar uso de `any` en hooks orquestadores (`useHomeController`, `useAlertManager`) y fronteras core. | `REC-01` | 🧹 [refactoring-backlog.md](./planning/refactoring-backlog.md)<br/>🟢 [whosnext.md (REC-01)](./planning/whosnext.md#3-calidad-y-arquitectura--revisión-recruiter) |
| **Reducción de Warnings ESLint:** Bajar progresivamente el techo de warnings (actualmente en 471) módulo por módulo. | `REC-02` | 🟢 [whosnext.md (REC-02)](./planning/whosnext.md#3-calidad-y-arquitectura--revisión-recruiter) |
| **Modularizar Componentes > 600 Líneas:**<br/>• `DiscoverTab.tsx` (862L)<br/>• `DraftDetailView.tsx` (819L)<br/>• `FomoVersionOverlay.tsx` (869L)<br/>• `useHomeController.ts` (Phase 2 verificación final & Phase 3 Profile/Community). | `REC-03` | 🧹 [refactoring-backlog.md](./planning/refactoring-backlog.md)<br/>🟢 [whosnext.md (REC-03)](./planning/whosnext.md#3-calidad-y-arquitectura--revisión-recruiter) |
| **Inventario Zod en rutas restantes:** Mutaciones core (`build`, `delete`, `staging`, `tweak`) ya usan `bodySchema`/`querySchema` del guard. Falta inventariar handlers secundarios y extraer contratos compartidos con clientes. | `API-02b` | 🟢 [whosnext.md (API-02)](./planning/whosnext.md#1-proceso-y-contratos-api) |
| **Tests E2E de UI:** Agregar 3–5 recorridos E2E reproducibles (Discover → Detalle → Descarga y manejo de reintentos de red). | `REC-04` | 🟢 [whosnext.md (REC-04)](./planning/whosnext.md#3-calidad-y-arquitectura--revisión-recruiter) |

---

## 5. 📊 Rigor de Evaluación (SAGE & MIMbot Evals)

| Ítem Pendiente | Tarea | ¿Dónde se profundiza? |
| :--- | :--- | :--- |
| **Generalización del Dataset SAGE:** Anonimización formal, registro de licencias y separación de conjunto ciego (unseen logs) para validación. | `SAGE-01` | 📊 [sage-eval.md](./engines/sage-eval.md)<br/>🟢 [whosnext.md (SAGE-01)](./planning/whosnext.md#4-evaluación-sage-y-mimbot) |
| **Métricas Top-1/Top-3 Rigurosas:** Separar formalmente en el reporte casos con culpable atribuible de aciertos sistémicos sin culpable. | `SAGE-02` | 📊 [sage-eval.md](./engines/sage-eval.md)<br/>🟢 [whosnext.md (SAGE-02)](./planning/whosnext.md#4-evaluación-sage-y-mimbot) |
| **Gate Automatizado de CI:** Hacer que `npm run eval:sage` falle el pipeline si las métricas caen por debajo de los umbrales históricos. | `SAGE-03` | 📊 [sage-eval.md](./engines/sage-eval.md)<br/>🟢 [whosnext.md (SAGE-03)](./planning/whosnext.md#4-evaluación-sage-y-mimbot) |
| **Suite de Evaluación MIMbot:** Dataset fijo de 15–20 consultas para medir exactitud, alucinaciones, referencias de evidencia y latencia por modelo. | `SAGE-05` | 🦄 [unicorn.md (§1.3)](./planning/unicorn.md)<br/>🟢 [whosnext.md (SAGE-05)](./planning/whosnext.md#4-evaluación-sage-y-mimbot) |

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
