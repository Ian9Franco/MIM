# Cambios Pendientes (Unreleased)

<!--
Anota aquí los cambios acumulados de PRs o commits.
Al ejecutar 'npm run release:auto', este contenido se trasladará automáticamente
a 'docs/releases/release-notes-vX.X.X.md' y a 'docs/releases/CHANGELOG.md'.
-->

### Planificación auditada y publicación manual por tag

- SAGE-01 Capa A: cada caso del corpus SAGE declara procedencia (`origin`/`license`/`anonymized`/`split`). Los 125 históricos quedan `unknown`/`train`; hay 10 sintéticos `stress` (truncado, wrappers, Quilt/NeoForge, error combinado) fuera del gate; holdout real sigue vacío. El reporte deja de llamar al set “real-world & representative”.
- SAGE-06 (en revisión): el chat exige una salida estructurada con referencias a evidencia, valida atribuciones y acciones antes del stream y reemplaza respuestas contradictorias, peligrosas o manipuladas por un fallback local seguro. La suite ejecuta el motor y el endpoint reales con proveedores controlados; no constituye verificación post-merge ni cierra otros objetivos de evaluación.
- Reconciliados Who's Next y Unicorn con evidencia de código: los cierres anteriores quedan en el backlog histórico y los alcances incompletos permanecen pendientes.
- Incorporadas tareas de calidad de código, UI/E2E, onboarding, trazabilidad y rigor de evaluación SAGE/MimBot, con criterios de cierre. Son planificación, no nuevas capacidades entregadas.
- Corregida la selección de tag en la release manual de GitHub Actions: el tag solicitado fija checkout, notas y publicación; las entradas inválidas se rechazan antes de compilar. Agregada regresión local del bloque real de resolución y sus consumidores.
- Documentadas las fuentes que usa release:auto y la diferencia entre nombre visible de release, cuerpo editorial y descripción del repositorio.
- API-01: ampliadas las regresiones de los wrappers reales `withApiGuard` para cubrir `Retry-After`, JSON malformado, `paramsSchema`, excepciones estructuradas y valores parseados que llegan al handler. El objetivo API-01 sigue pendiente de reconciliación post-merge por Hermione.
- SAGE-08: verificado post-merge sobre PR #62 / `a729cba`; la suite importa `modExplainer.ts` real y ejecuta también `/api/fomo/explain`, cubriendo metadata, imágenes, grounding y fallback con proveedor controlado. Este cierre no equivale a evals generales de MimBot ni cierra otras fases Unicorn.
- ARCH-01: separada y verificada la persistencia del caché SAGE en adaptadores Node/browser; `cacheEngine.ts` ya no usa `eval("require")`, conserva su API pública y CI valida tests de runtime, typecheck, DAST y build Web. El empaquetado Windows/Electron no fue ejecutado y no se presenta como evidencia.
- **REC-02 (Reducción de Deuda y Techo de Warnings ESLint)**:
  - Limpieza sistemática de código muerto, imports no utilizados, capturas de errores sin variable innecesaria (`optional catch`) y estados no leídos en `lib/`, `components/` y `web/`.
  - Presupuesto Desktop (`lint`) rebajado de `--max-warnings=471` a `--max-warnings=400` (medido en CI #221: 395 warnings; la cifra documental 392 no se reproduce en CI).
  - Presupuesto Hub Web (`lint:hub`) rebajado de `--max-warnings=100` a `--max-warnings=75` (medido: 69 warnings, reducción de -14).
  - Verificados el suite completo de linters (`npm run lint:all`), los 27 suites de pruebas y el build de producción.
- REC-03 Phase 2: mergeada en PR #63 la extracción de Drafts desde `useHomeController` a `useHomeDrafts`, con contrato público preservado, validación defensiva y regresiones dedicadas. La fase sigue pendiente de verificación final porque no se reprodujo todavía el recorrido visible create/edit/delete/refresh con sesión browser/Supabase; Phase 3 permanece bloqueada.
- **Server Manager (lectura SFTP / `/servers`, Refs #58)**:
  - Transporte SFTP de solo lectura con huella de host obligatoria, descubrimiento remoto y `POST /api/server/inspect`.
  - Pantalla Desktop `/servers` (link en el header) que compara mods contra el último build AllHost.
  - Fixture local `npm run dev:server-fixture` y suite `npm run test:server`. Escritura remota, persistencia durable de snapshots y hosting externo siguen pendientes.
  - Build Desktop verificado post-merge: `ssh2` queda marcado como `serverExternalPackages`; MIM Systems Engineering CI #191 sobre `d098d7ad` pasó el build Desktop y el Hub. Esto cierra la regresión de empaquetado, no verifica por sí mismo la semántica funcional SFTP ni cierra #58.
- **Server Manager SRV-4 (deploy UI en Desktop, no cierra #58)**:
  - `POST /api/server/deploy` local a Desktop, mismo guard de origen/host que inspect, plan recalculado en servidor (auditoría parcial no autoriza mutación).
  - Transporte SFTP escribible con la misma verificación de host y contención de rutas; payloads desde el build AllHost.
  - `/servers` ofrece confirmación explícita, progreso `preflight` → `executing` → `completed` | `failed` | `recovery-required`, y bloqueo de nuevos deploys en recuperación.
  - Persistencia durable de snapshots, SAGE remoto, admin/RCON y sync multiplayer siguen pendientes.
- **Server Manager SRV-3 persistencia en disco (T1.1, no cierra #58):**
  - `FileSnapshotStore` en `@mim/server-engine`: un JSON por snapshot, journal NDJSON por servidor, escritura atómica (tmp + rename) y reapertura desde la misma carpeta.
  - `MemorySnapshotStore` se conserva. Detección read-only de operaciones abiertas (`loadPendingServerOperations`, T1.2).
  - Cableado Desktop (T1.3): store en `.mim-index/server-manager`, `pendingOperations` en inspect, aviso en `/servers`, deploy persiste snapshots y marca `discarded`/`restored` al cerrar.
- **MIMBOT-GW / Model Gateway & Context Builder**:
  - BOT-05, subalcance lifecycle/credenciales verificado post-merge en PR #68 / `d098d7ad`: cancelación y timeout se propagan a Gemini/OpenRouter, los retries respetan el mismo ciclo cancelable y MIM-Bot Chat (alcance proyecto) usa el proveedor seleccionado sin credenciales en URLs. BOT-05 global permanece abierto.
  - Abstracción de proveedores `AIProvider` (`GeminiProvider`, `OpenRouterProvider`) con selector `createAIProvider.ts`. Gemini permanece como default; GLM vía OpenRouter es opt-in (`MIMBOT_AI_PROVIDER=openrouter`).
  - GLM-5.3 Flash disponible como candidato (`z-ai/glm-5.3-flash:free` con cascada al tier pago), no como reemplazo silencioso de Gemini.
  - Capa de ensamblado `ContextBuilder` con etiquetado estricto de evidencia (`[EVIDENCE: MANIFEST]`, `[EVIDENCE: LOCAL]`, `[EVIDENCE: SAGE]`, `[EVIDENCE: FOMO_GRAPH]`, `[EVIDENCE: GALLERY]`) e invariantes de grounding que impiden al LLM inventar hechos o contradecir diagnósticos deterministas.
  - Migración de `lib/intelligence/modExplainer.ts`, `lib/intelligence/sage/sageMimbotEngine.ts`, `app/api/fomo/explain/route.ts` y `app/api/sage/chat/route.ts` al nuevo pipeline de proveedores.
  - Nuevo endpoint `POST /api/fomo/explain-deps` para interpretación estructurada del árbol de dependencias de mods.
  - Soporte BYOK de OpenRouter en `lib/core/settings.ts` y variables de entorno.
  - Suite de pruebas unitarias en `scripts/__tests__/context-builder.test.ts` con 100% de aserciones pasando.
- **MIMbot gateway — fases BOT-GW / BOT-05b / BOT-JSON / BOT-06**:
  - BOT-GW: router por intención (`modelGateway.ts`) — texto → OpenRouter/GLM, multimodal/search → Gemini.
  - BOT-05b: `sageChatEngine.ts` unifica chat SAGE HTTP + `sageMimbotEngine`; sin rama OpenAI legacy.
  - BOT-JSON: `dependencyExplain.ts` con schema Zod y fallback determinista en `POST /api/fomo/explain-deps`.
  - BOT-06: clasificación de cuotas (`quotaClassifier.ts`), tracker local, `GET /api/settings/ai-quota`, panel en Ajustes → Conectividad.
- **REC-03 (subalcance UI de tres componentes; REC-03 global permanece abierto)**:
  - `web/components/tabs/DiscoverTab.tsx` reducido de 921 a 158 líneas mediante descomposición en `web/components/tabs/discover/` (`DiscoverPlatformHeader`, `DiscoverControls`, `DiscoverFiltersPanel`, `DiscoverModCard`, `DiscoverPagination`, `discoverConstants`).
  - `web/components/DraftDetailView.tsx` reducido de 865 a 188 líneas mediante descomposición en `web/components/draft-detail/` (`DraftDetailBanner`, `DraftDetailTabs`, `DraftSummaryTab`, `DraftItemsTab`, `DraftMembersTab`, `DraftActivityTab`, `DraftMetadataModal`, `DraftItemEditModal`, `draftDetailConstants`).
  - `components/fomo/core/FomoVersionOverlay.tsx` reducido de 925 a 186 líneas mediante descomposición en `components/fomo/details/` (`FomoOverlayTopBar`, `FomoDescriptionTab`, `FomoGalleryTab`, `FomoDependenciesTab`, `FomoVersionsTab`, `FomoLightbox`).
  - Preservados contratos públicos, animaciones Framer Motion con `layoutId`, integraciones Supabase y accesibilidad. Drafts Phase 2 sigue `NEEDS_USER`; Phase 3 (Profile/Community) pendiente.
