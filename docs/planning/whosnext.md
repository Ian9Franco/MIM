# MIM — Who's Next

Roadmap pendiente revisado el 2026-09-10 contra `main` post PR #68/#70/#73–#75. Las evaluaciones son insumos de revisión; sus recomendaciones no autorizan implementaciones ni publicaciones por sí mismas. Los cierres comprobados están en [el backlog histórico](../releases/backlog-v10-historic.md#revision-de-cierres-2026-09-06). Ver [auditoría y flujo de release](../releases/release-audit.md).

## 1. Proceso y contratos API

- [x] **API-02 — Generalizar schemas Zod compartidos (cerrado en mutaciones core).** `build`, `delete`, `staging` y `tweak` usan `bodySchema`/`querySchema` del guard; `/api/settings/validate-keys` expone `useStoredGemini` para validación server-side. Pendiente: inventario del resto de handlers y contratos compartidos con clientes.

## 2. Funcionamiento y UX de MimBot

- [x] **BOT-01 — Historial local opt-in (cerrado).** `chatHistoryStore.ts` persiste por `crashSignature`; toggle y borrado global en Settings; restauración al cambiar de crash; botón borrar por incidente en copiloto.
- [x] **BOT-02 — Primera experiencia antes de BYOK (cerrado, alcance estático).** `MimbotDemoPreview` muestra valor y ejemplo fijo sin llamar al proveedor. Backend gratuito gestionado sigue fuera de alcance hasta decisión de presupuesto/cuota.
- [x] **BOT-03 — Seguimientos contextuales (cerrado).** `deriveFollowUpSuggestions()` genera dos chips tras el primer intercambio a partir de la última respuesta y categoría del crash; excluye preguntas ya hechas.
- [x] **BOT-04 — Estado de conexión veraz (cerrado).** `SageMimbotCopilot` valida con `/api/settings/validate-keys` (`useStoredGemini: true`), muestra badge por estado (`validating`/`valid`/`invalid`/`rate_limited`) y bloquea envío hasta conexión verificada. `probeGeminiApiKey()` centraliza la sonda sin exponer la clave en URL.
- [x] **BOT-05a — Gateway request lifecycle (cerrado).** PR #68: `requestLifecycle.ts`, propagación de `signal`/timeout en SAGE/FOMO/providers, MIM-Bot Chat usa el provider seleccionado sin credenciales en URL.
- [x] **BOT-GW — Model router por intención (cerrado).** `generateWithModelGateway()`: texto (SAGE chat, MIM-Bot chat, deps) → GLM vía OpenRouter cuando hay clave; multimodal y search grounding → Gemini. Desactivable con `MIMBOT_INTENT_ROUTING=false`. Pendiente: eval fixtures, migración `web/` legacy.
- [x] **Naming — MIM-Bot Chat (cerrado).** PR #70: vocabulario `mim-bot-chat` / `mimBotChat()` en código, API mode y docs.
- [x] **BOT-05b — SAGE follow-up multi-proveedor (cerrado).** `sageChatEngine.ts` unifica `/api/sage/chat` y `chatWithSageMimbot()` vía Model Gateway; referencia OpenAI retirada.
- [x] **BOT-JSON — Salida estructurada explain-deps (cerrado).** Schema Zod + parseo con fallback determinista (HTTP 200) en `dependencyExplain.ts`.
- [x] **BOT-06 — Clasificación de cuotas IA (cerrado).** `classifyProviderQuotaError()` distingue RPM/TPM/daily/concurrency; tracker local + `GET /api/settings/ai-quota` + panel en Settings.
- [x] **BOT-06b — Costos OpenRouter en UI (cerrado).** `fetchOpenRouterAccountSnapshot()` consulta `GET /api/v1/auth/key`; el panel de cuotas muestra uso acumulado, límite y enlace a actividad del proveedor.
- [x] **Desktop — Persistencia de credenciales tras upgrade (cerrado).** Electron recupera settings/secrets legacy, importa plaintext a `safeStorage`, fija `MIM_PORTABLE_DIR` y evita auto-switch a `D:` en runtime empaquetado. Ver [desktop-credentials.md](../guides/desktop-credentials.md).
- [x] **BOT-07 — Cola para análisis por lotes (en main, 2026-09-12).** `runAnalysisQueue` (concurrencia por proveedor, retry de cuota, cancelación). Eval live `eval:mimbot` usa la cola. `POST /api/fomo/explain-batch` + botón **MIM-Bot lote** en Descubrir (máx. 12). Falta gate live con secrets confirmados (SAGE-05b).
- [x] **BOT-08 — Caché de las cuatro quick questions durante 24 horas (cerrado).** `quickQuestionCache.ts`: clave `hash(crashSignature + question + mode)`, TTL 24 h, lectura/escritura en `SageMimbotCopilot` para chips canónicos.
- [x] **BOT-09 — Transparencia BYOK (cerrado).** `mimbotByokTransparency.ts` + panel en Settings y modal de configuración; enlaces a términos Google/OpenRouter; sin prometer privacidad absoluta por BYOK.

## 3. Calidad y arquitectura — revisión recruiter

Fuente: [recruiter-review.md](../guides/recruiter-review.md), señales amarillas/rojas y próximos pasos. Las métricas y opiniones del informe requieren fuentes; no se toman sus percentiles, autoría inferida ni usuarios reales como hechos comprobados.

- [ ] **REC-01 — Reducir `any` con baseline reproducible.** **Estado:** 🟡 Activo / En Progreso (2026-09-11)
  - **Línea Base Medida (2026-09-11):** **901 ocurrencias totales** (699 explicit `: any`, 127 assertions `as any`, 75 generic `<any>`) en 212 archivos.
  - **Progreso Actual:** Reducido a **487 ocurrencias totales** (**-414 ocurrencias eliminadas** desde la línea base inicial, superando con holgura la meta de 500-600).
  - **Desglose Actual por Carpeta:**
    - `components/`: 183
    - `app/`: 98
    - `apps/`: 79
    - `hooks/`: 59
    - `lib/`: 52
    - `services/`: 8
    - `scripts/`: 4
    - `workers/`: 4
  - **Refactorizaciones Completadas:**
    - [lib/events/taxonomy.ts](file:///d:/Dev/CodeProjects/MIM/lib/events/taxonomy.ts): Tipado exhaustivo de taxonomía de eventos (`EventSource`, payloads).
    - [lib/events/eventBus.ts](file:///d:/Dev/CodeProjects/MIM/lib/events/eventBus.ts) & [lib/events/eventDebugger.ts](file:///d:/Dev/CodeProjects/MIM/lib/events/eventDebugger.ts): Contrato formal `Handler`, `TimelineOptions`, `TimelineItem`.
    - [lib/storage/smart-cache.ts](file:///d:/Dev/CodeProjects/MIM/lib/storage/smart-cache.ts): Genéricos `<T>` para cache reactivo.
    - [types/fomo.ts](file:///d:/Dev/CodeProjects/MIM/types/fomo.ts) & [apps/hub/types/fomo.ts](file:///d:/Dev/CodeProjects/MIM/apps/hub/types/fomo.ts): Tipado estricto `FomoCategory` e index signatures seguras `Record<string, unknown>`.
    - [hooks/useAlertManager.ts](file:///d:/Dev/CodeProjects/MIM/hooks/useAlertManager.ts): Eliminación completa de `any` usando interfaces de incidentes, proyectos y mods.
    - [apps/hub/hooks/useHomeController.ts](file:///d:/Dev/CodeProjects/MIM/apps/hub/hooks/useHomeController.ts): Tipado de sesión, drafts, y favoritos.
    - [app/api/curseforge/versions/route.ts](file:///d:/Dev/CodeProjects/MIM/app/api/curseforge/versions/route.ts) & [app/api/modrinth/versions/route.ts](file:///d:/Dev/CodeProjects/MIM/app/api/modrinth/versions/route.ts): Tipado estricto de APIs externas de versiones.
    - [apps/hub/app/api/fomo/youtube-posts/route.ts](file:///d:/Dev/CodeProjects/MIM/apps/hub/app/api/fomo/youtube-posts/route.ts): Tipado de posts y traversal seguro de JSON.
- [ ] **REC-02 — Reducir warnings de ESLint.** El techo Desktop bajó de 471 a 400 (medido en CI #221: 395 warnings); el techo Hub bajó de 100 a 75 (medido: 69 warnings). Limpieza modular sin `eslint-disable` cosméticos. Corregidas variables muertas, optional catches e imports huérfanos.
- [ ] **REC-03 — Modularizar responsabilidades y documentar decisiones.** Subalcance UI cerrado en `DiscoverTab.tsx` (921L ➔ 158L en `apps/hub/components/tabs/discover/`), `DraftDetailView.tsx` (865L ➔ 188L en `apps/hub/components/draft-detail/`) y `FomoVersionOverlay.tsx` (925L ➔ 186L en `components/fomo/details/`), con contratos públicos preservados. Drafts Phase 2 integrada en `main` (PR #86: capa `draftRepository` CRUD + tests unitarios + `useHomeDrafts`); sigue `NEEDS_USER` hasta el recorrido autenticado en browser/Supabase real. Phase 3 (Profile/Community) no está desbloqueada.
- [ ] **REC-04 — Cubrir UI y flujos completos.** Agregar 3–5 E2E reproducibles (Discover → detalle → descarga, errores y reintentos) y tests de componentes críticos. Aislar proveedores/datos y documentar ejecución en CI. Reportar cobertura UI separada de SAGE/NBT; no presentar la cobertura acotada como global.
- [ ] **REC-05 — Onboarding verificable y continuidad.** Partir de las guías existentes; documentar mapa de responsabilidades, diagnóstico de fallos y recuperación. Cierre: una persona distinta sigue el recorrido y se registran obstáculos y correcciones. Documentar no equivale a eliminar el bus factor.
- [ ] **REC-06 — Trazabilidad del trabajo con IA.** Documentar decisiones humanas, asistencia de agentes y revisión aplicada con ejemplos verificables de PRs. No deducir identidad o autoría por nombres de commits ni afirmar competencias sin evidencia.
- [ ] **REC-07 — Colaboración externa.** Elegir con Ian un proyecto OSS y una contribución acotada; registrar discusión/review y resultado real. Depende de participación humana; esta tarea no autoriza contactar ni publicar en otro proyecto.
- [ ] **REC-08 — Narrativa de portfolio y pitch de dos minutos.** Traducir sincronización offline, diagnóstico determinista y análisis estático a capacidades transferibles; preparar respuestas con trade-offs para arquitectura, debugging, seguridad, escala y ownership. Validar con Ian rol objetivo y atribuciones personales antes de redactar la versión final.
- [ ] **REC-09 — Alinear claims con evidencia.** Auditar README, estado, evaluaciones y backlog: fecha/alcance de métricas, autores, usuarios, CI, cobertura y garantías. Separar valoración subjetiva de medición; corregir cifras sin fuente, porcentajes de mercado y afirmaciones absolutas de producción/alucinación. Elegir un recorrido crítico para observabilidad y documentar señales y diagnóstico, sin agregar infraestructura sólo para portfolio.

## 4. Evaluación SAGE y MimBot

Fuente: [sage-eval.md](../engines/sage-eval.md) y su generador `scripts/evaluation/sage-eval.ts`. El documento reporta resultados y límites; las tareas siguientes surgen de contrastarlos con el evaluador. Su benchmark determinista no cierra Unicorn §1.3/Fase 3 para MimBot.

- [ ] **SAGE-01 — Procedencia y generalización del corpus (infra lista; no cerrado).** `crash-corpus.json` vacío para logs reales; `crash-corpus-regression.json` aísla 125 snippets sintéticos del gate CI. No es MIM Server (SRV-5): logs remotos van al corpus real cuando existan. Cierre: capturar logs de servidor/host en `crash-corpus.json` con `split: holdout` tras el primer test real.
- [x] **SAGE-02 — Métricas Top-1/Top-3 correctamente denominadas (cerrado).** `sageEvalCore.ts` separa Top-1/Top-3 histórico, atribución con culpable y acierto sistémico sin culpable con numerador/denominador explícitos. Reporte regenerado en `docs/engines/sage-eval.md` (Top-1 atribución medido: 71.4% sobre 70 casos).
- [x] **SAGE-03 — Reporte y umbrales verificables (cerrado).** Gate real en `npm run eval:sage` (Macro F1 ≥ 85%, Top-3 histórico ≥ 95%, latencia ≤ 15 ms) con `--self-test-fail` y suite `sage-eval-metrics.test.ts`.
- [ ] **SAGE-04 — Latencia reproducible.** Informar entorno, versión, calentamiento, repeticiones y p50/p95 además de media; distinguir diagnóstico local de latencia/costo de la llamada LLM. No extrapolar 0.06 ms al chat.
- [x] **SAGE-05 — Fixtures baseline MIMbot (cerrado, estructura).** `mimbot-fixtures.json` con 18 casos, validador `npm run eval:mimbot`.
- [ ] **SAGE-05b — Scoring live MIMbot en CI (parcial).** Job `mimbot-live-eval` en `ci.yml` + cola BOT-07. `npm run eval:mimbot` (estructura) ya está en CI. Live opt-in con `RUN_MIMBOT_LIVE=1` y secrets; no bloquea PRs sin claves. Faltan umbrales de latencia/costo.
- [x] **SAGE-06 — Verificar guardrails en el recorrido real (cerrado).** PR #82: `chatGuardrails.ts` valida respuestas contra el `SageCrashContext`, bloquea atribuciones no soportadas, remedios peligrosos (desactivar antivirus) y prompt injection (`<untrusted-user-content>`), exigiendo referencias a evidencia y emitiendo `X-MIM-SAGE-Guardrail: blocked` con fallback seguro. Suite dedicada en `sage-chat-guardrails.test.ts`.
- [ ] **SAGE-07 — Una fuente de evaluación.** Duplicación resuelta: la fuente canónica es `docs/engines/sage-eval.md`.

## 5. Seguimiento de Unicorn

Ver [matriz de estado del plan](unicorn.md#revision-de-estado-2026-09-06). Permanecen abiertos los alcances completos de tool calling, recuperación contextual, routing por complejidad, capacidades, pipeline de confianza, idempotencia/jobs generales, storage avanzado, matrix/mutation/fault testing y contratos entre dominios. Una implementación parcial no cierra la fase completa. Las decisiones pospuestas no se contabilizan como funcionalidades entregadas.
