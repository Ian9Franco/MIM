# MIM — Roadmap Oficial & Estado de Evolución (v11.4.5)

> Roadmap unificado de evolución técnica de Minecraft Intelligent Manager.  
> **Versión Actual:** v11.4.5 | **Última actualización:** 2026-09-09  
> *(Historial de hitos de versiones anteriores preservado en [docs/releases/roadmap-v10-historic.md](../releases/roadmap-v10-historic.md)).*

---

## 1. Proceso & Seguridad de API (Completado en v11.3.0)

- [x] **Hacer withApiGuard obligatorio, no opcional:**
  - [x] Barrido de 100% de rutas en `web/app/api/` y `app/api/` (116 handlers protegidos).
  - [x] Regla de CI que falla estructuralmente con AST si un `route.ts` no usa `withApiGuard` (`npm run lint:api-guard`).
  - [x] Soporte para allowlist formalizada y documentada de excepciones.
  - [x] Suite de tests exhaustiva del wrapper con casos negativos, validación Zod y rate limits reales.
  - [x] CI/CD: Branch protection ruleset en GitHub configurado para `main` con bypass admin para pushes locales.
  - [x] Helper local interactivo para auditar PRs de IAs en un solo paso (`npm run pr:review`).

---

## 2. Funcionamiento de MimBot & Model Gateway

- [x] *Aplicar withApiGuard a api/sage/chat:* Blindado con rate limit defensivo (25 req/min) y validación Zod estricta.
- [x] *Abstracción Multi-Proveedor (AIProvider Gateway):* Interfaz unificada `AIProvider` con implementaciones `GeminiProvider` y `OpenRouterProvider` (`createAIProvider.ts`).
- [x] *Integración GLM-5.3 Flash (candidato OpenRouter):* `OpenRouterProvider` con GLM (`z-ai/glm-5.3-flash:free` → tier pago). Gemini sigue siendo el default; GLM se activa con `MIMBOT_AI_PROVIDER=openrouter` (ADR-007).
- [x] *Context Builder & Evidence Layer:* Ensamblado determinista de prompts con etiquetas de origen (`[EVIDENCE: MANIFEST]`, `[EVIDENCE: LOCAL]`, `[EVIDENCE: SAGE]`, `[EVIDENCE: FOMO_GRAPH]`, `[EVIDENCE: GALLERY]`) e invariantes de grounding que impiden al LLM sobreescribir hechos o diagnósticos.
- [x] *Migración de rutas y nuevo endpoint de dependencias:* `lib/intelligence/modExplainer.ts`, `sageMimbotEngine.ts`, `app/api/fomo/explain`, `app/api/sage/chat` y `POST /api/fomo/explain-deps`.
- [x] *Soporte BYOK OpenRouter:* Configuración en `lib/core/settings.ts` y `.env.local` con almacenamiento seguro de secretos.
- [ ] *No guardar la API key de Gemini/OpenRouter en texto plano:* Cifrar en disco o usar `safeStorage` del SO en Electron.
- [x] *Recortar el contexto de conversación antes de enviarlo:* Truncado automático a los últimos 6 turnos en `api/sage/chat`.
- [x] *Streaming de respuesta:* Gemini transmite por SSE; MIM adapta el flujo a eventos NDJSON tipados, preserva los errores HTTP previos al stream y renderiza cada delta en el chat.
- [x] *Manejo de rate-limit/cuota de la propia API de Gemini:* Diferenciación explícita de código 429 (`RATE_LIMITED`) con mensaje claro en el chat sin desconfigurar la key.
- [ ] *Persistir el historial del chat:* Guardar historial localmente (opt-in) para no perderlo al cambiar de crash o recargar.

---

## 3. UX/UI de MimBot (En curso)

- [ ] *Mejorar primera experiencia (onboarding sin key):* Ofrecer modo de prueba inicial o preview estático de ejemplos de respuesta antes de exigir la API key.
- [x] *Explicación de modo Bully vs. Estándar:* Tooltips descriptivos y etiquetas claras.
- [x] *Copia de mensajes y código:* Botón de copiar respuesta con feedback visual inmediato.
- [x] *Confirmación de reinicio:* Mecanismo de deshacer (Undo) de 4.5 segundos al resetear la conversación.
- [ ] *Preguntas de seguimiento sugeridas:* Chips contextuales dinámicos ligados a la última respuesta del modelo.
- [x] *Desacoplar error 429 del error 401:* Los límites de cuota se muestran inline sin desloguear la clave.
- [x] *Accesibilidad:* Atributos `aria-label` descriptivos en todos los botones del copiloto.
- [x] *Validación preventiva de API Key:* Ping liviano al guardar la clave antes de marcar "Gemini Conectado" (`/api/settings/validate-keys`).

---

## 4. Deuda de fondo & Arquitectura

- [x] Verificación estricta de fronteras de arquitectura (`npm run lint:architecture`, AST dependency boundary verifier en CI).
- [ ] Bajar el uso de `any` (935 casos) — priorizar `lib/security/`, `lib/intelligence/sage/` y hooks orquestadores (`useHomeController.ts`).
- [ ] Generalizar esquemas Zod a más rutas (actualmente 17/93).
- [ ] Seguir sumando tests — meta: mantener 100% pass en todas las suites de `npm test`.
- [ ] Revisar el `eval("require")` en `sage/cacheEngine.ts` — reemplazar por imports estáticos si es posible.
- [ ] Modularización progresiva de componentes monolíticos (> 500 líneas):
  - [ ] `web/components/tabs/DiscoverTab.tsx` (862 líneas) y `web/components/DraftDetailView.tsx` (819 líneas).
  - [ ] `components/fomo/core/FomoVersionOverlay.tsx` (869 líneas).
  - [ ] `web/hooks/useHomeController.ts` — continuar modularización por fases; el controller sigue siendo monolítico aunque Discover y Drafts ya no sean responsabilidades propias.
    - [x] Phase 1 — Discover extraído y verificado en PR #43, con caché, decodificación de payloads y búsqueda separadas detrás del mismo contrato público.
    - [ ] Phase 2 — Drafts mergeado en PR #63 con `useHomeDrafts`, contrato/adaptador y regresiones dedicadas; verificación final `BLOCKED` hasta reproducir create/edit/delete/refresh con sesión browser/Supabase.
    - [ ] Phase 3 — Profile/Community no está desbloqueada hasta cerrar la verificación de Phase 2 y la reevaluación de Dumbledore.
- [x] Ampliación de formatos en auditoría de licencias: soporte para manifiestos Quilt (`quilt.mod.json`).

---

## 5. Pipeline de Inferencia & Model Backlog (Pendiente / Futuro)

- [x] *Caché determinista conectada:* Integración de `cacheEngine.ts` con `api/sage/chat` para diagnósticos instantáneos de firmas conocidas.
- [x] *Memoria de modelo en la cascada:* Recordar el último modelo exitoso (`flash-lite-latest` → `3.5-flash-lite` → `3.5-flash` → `3.6-flash`) para evitar round-trips fallidos tras un 429.
- [x] *Presupuestos de tokens diferenciados:* Modo Bully (~250 tokens) vs. Modo Estándar (~700 tokens estructurados).
- [x] *Ajuste de temperatura en modo Bully:* Reducida a 0.5 para conservar estilo satírico sin alucinar dependencias.
- [x] *Ventana de contexto acotada:* Últimos 6 turnos para no inflar consumo de tokens.
- [ ] *Model Router Dinámico:* Ruteo inteligente por costo/latencia según la intención del usuario (GLM primario para texto/explicación, Gemini como especialista multimodal/búsqueda).
- [ ] *Structured JSON Output:* Validación de schemas Zod estrictos sobre la salida generada por el LLM en respuestas estructuradas.
- [ ] *Caché semántico / Hashing de contexto:* Cacheo por hash de payload de evidencia para evitar re-inferencias en consultas idénticas.
- [ ] *Desacoplamiento de Search Grounding:* Motor de búsqueda web externo independiente del vendor del LLM para enriquecimiento de evidencia previa.
- [ ] *Observabilidad y límites de OpenRouter:* Métricas de costo, latencia, rate limits y monitoreo de cuota en UI.

---

## 6. Gestión de Cuota y Resiliencia en Free Tier

- [x] *Diferenciación de error 429 en UI:* Desacoplar cuota/frecuencia de falta de clave.
- [ ] *Diferenciación contextual de límites:* Distinguir en el mensaje si se alcanzó el límite por minuto (RPM ~15 / TPM ~250k) o el límite diario (RPD ~1.500).
- [ ] *Encolamiento de peticiones concurrentes:* Procesar en cola secuencial para no superar el límite de 15 RPM.
- [ ] *Caché persistente local para quick questions:* Guardar respuestas de preguntas frecuentes por 24 horas.

---

## 7. Privacidad y Transparencia en BYOK

- [ ] *Aviso de privacidad del Free Tier de Google / OpenRouter:* Notificar con claridad las políticas de retención o entrenamiento de capas gratuitas en BYOK.
- [x] *Ping preventivo de clave:* Validar conectividad antes de confirmar el estado de conexión (endpoint seguro sin key en URL).

---

## 8. Resiliencia de Red & Diagnóstico (Issue #57 — COMPLETADO)

- [x] **Hito NET-1: Contratos puros de red y política de retry:**
  - [x] Modelado de fases (`dns`, `tcp`, `tls`, `http`, `timeout`, `abort`) y estados tipados.
  - [x] Sanitización estricta de credenciales (`user:pass`) y tokens en URLs (`sanitizeEndpoint`).
  - [x] Clasificación determinista de errores (`classifyNetworkError`) con soporte para Node, Browser y cabeceras `Retry-After`.
  - [x] Política pura de retry (`calculateNextRetry`) con backoff exponencial, full jitter inyectable y presupuesto global de tiempo (`budgetMs`).
- [x] **Hito NET-2: Adapters de runtime e integración:**
  - [x] Cliente unificado `fetchWithRetry` con tipado `<T>`, soporte de cancelación `AbortSignal` y reporte de diagnóstico `NetworkDiagnosticReport`.
  - [x] Migración retrocompatible de `fetchJsonWithRetry` en `lib/core/`.
  - [x] Endurecimiento de `DraftDownloadBroker` con jitter y control de cuotas/budget en descargas de mods.
  - [x] Suite de tests dedicada `test:network` pasando al 100%.

---

## 9. Server Manager & Sincronización Remota (Issue #58 — En Progreso)

### Estado de aceptación — 2026-09-12

Los checkboxes de implementación debajo registran código existente; no certifican una funcionalidad operativa completa. Esta matriz distingue implementación, integración Desktop y validación.

| Entrega | Código | Integración Desktop | Validación |
|---|---|---|---|
| Conectar y auditar mods (SRV-1/2) | Transporte SSH/SFTP real de solo lectura, huella de host obligatoria, límites y auditoría parcial explícita. | Pantalla `/servers`; compara contra el último build AllHost. | Fixture SFTP local + recorrido HTTP/UI. Hosting externo y `.exe` empaquetado pendientes. |
| Preflight y snapshots (SRV-3) | Contratos, fingerprint, `FileSnapshotStore` en disco, `pendingOperations`. | Aviso en inspect/deploy. | Tests de motor. Recovery UI avanzada y VPS real pendientes. |
| Aplicar y recuperar (SRV-4) | Executor y rollback. | UI en `/servers` (`POST /api/server/deploy`). | Fixture local. Hosting real y recovery post-reinicio pendientes. |
| SAGE remoto (SRV-5) | Motor + tests. | Panel mergeado (PR #89). | Fixture ahora tiene `latest.log` y crash report. Logs de VPS real pendientes. |
| Administración (SRV-6) | Properties, RCON, backups. | Panel mergeado (PR #90). | Fixture tiene `server.properties` y un zip de backup. RCON live y proceso offline pendientes. |
| Multiplayer (SRV-7) | Contratos + reconciliación + tests de motor + API + panel en main. | Diagnóstico only. | Fixture alluser ZIP. Descarga automática de mods y validación en VPS real pendientes. |

Primera entrega integrada en main: **auditoría + deploy + SAGE + admin + sync multiplayer (diagnóstico)**. Configs/mundos completos, descarga automática de mods, hosting externo y packaging Electron siguen abiertos. La versión y el loader remotos los informa el operador.

Reproducción sin hosting: `npm run dev:server-fixture` (ver [guía](../architecture/server-audit.md)).


- [x] **Fase 0 (Foundation):**
  - [x] Contratos puros de `InstanceManifest` y diffing determinista (`diffInstanceManifests`).
  - [x] Escaneo de mods desde memoria (`scanModBuffer`) y adapter de validación.
  - [x] Auditoría pura de servidor y generación de planes de reconciliación.
- [x] **Hito SRV-1: Transporte SFTP de sólo lectura y descubrimiento remoto:**
  - [x] Desacople formal de capacidades: `ReadOnlyFileTransport` vs `WritableFileTransport`.
  - [x] Configuración segura SFTP (`SftpConnectionConfig`) con sanitización de contraseñas y claves.
  - [x] Motor de descubrimiento remoto `discoverRemoteServerState` con garantía estricta de cero mutaciones.
  - [x] Protección activa contra ataques de Path Traversal (`safeResolveRemotePath`).
  - [x] Resolución de acoplamiento: `lib/events/server.ts` migrado a contratos puros en `lib/server/types.ts`.
  - [x] Suite de tests `test:server` ampliada y validada al 100%.
- [x] **Hito SRV-2: UI de auditoría y comparación visual:**
  - [x] Endpoint de API `/api/server/audit` protegido por `withApiGuard`.
  - [x] Grid interactivo `ServerAuditSummaryCards` y tabla de discrepancias `ServerDiffTable` (Faltantes, Sobrantes, Versiones distintas, Duplicados).
  - [x] Visualización de mods client-only e incompatibilidades de entorno.
  - [x] Indicador de salud `ServerHealthBadge` con soporte para auditorías parciales/incompletas.
  - [x] Panel orquestador `ServerAuditPanel` con micro-animaciones Framer Motion y suites de tests al 100%.
- [x] **Hito SRV-3: Preflight, builder y contratos de snapshots (persistencia en disco; recuperación de planes pendiente):**
  - [x] Validación bidireccional exhaustiva (compatibilidad de versión de Minecraft, mod loader, exclusión de client-only mods en servidor y resolución de dependencias requeridas).
  - [x] Reconciliación explícita de archivos de configuración (`diff.configDiffs`).
  - [x] Snapshot obligatorio pre-mutación para cualquier acción destructiva o aditiva (`createPreMutationSnapshot`).
  - [x] Detección determinista de planes obsoletos y drift de estado remoto (`validatePlanFreshness` con fingerprints SHA-256).
  - [x] Persistencia durable en disco (`FileSnapshotStore`: JSON por snapshot + journal NDJSON, reapertura). `MemorySnapshotStore` se conserva para tests y runtime no persistente.
  - [x] Recuperación de planes abiertos tras reinicio (T1.2): `loadPendingServerOperations()` detecta snapshots `active` y expone el último journal; no ejecuta rollback automático.
  - [x] Cableado Desktop read-only (T1.3): `FileSnapshotStore` bajo `.mim-index/server-manager`, `pendingOperations` en inspect, aviso en `/servers`, deploy persiste snapshots y cierra status al completar.
  - [x] Suite de tests `server-preflight-snapshot.test.ts` pasando al 100%.
- [x] **Hito SRV-4: Executor de despliegue con staging, verificación atómica y rollback:**
  - [x] Motor de staging atómico en `.mim_staging/` y validación de hash SHA-256 pre/post ejecución.
  - [x] Bloqueo de concurrencia (`isServerDeploymentLocked`) para impedir despliegues paralelos sobre el mismo servidor.
  - [x] Compensación y rollback automático (`executeRollback`) ante errores o discrepancias.
  - [x] Estado `recovery-required` para protección ante fallos críticos de filesystem.
  - [x] Suite de tests `server-executor-rollback.test.ts` pasando al 100%.
- [x] **Hito SRV-5: SAGE remoto para diagnóstico contextual de logs de servidor:**
  - [x] Ingesta remota de `logs/latest.log` y crash reports vía `ReadOnlyFileTransport`.
  - [x] Clasificación determinista de crashes (dependencias faltantes, incompatibilidades, mixins, OOM, entidades).
  - [x] Correlación automática con cambios recientes (`ServerChangeRecord`) y despliegues (`correlatedDeploymentId`).
  - [x] Panel Desktop `ServerSageDiagnosticPanel` (PR #89).
  - [x] Suite de tests `server-sage-remote.test.ts` pasando al 100%.
- [x] **Hito SRV-6: Administración avanzada (configs, RCON y backups):**
  - [x] Parser bidireccional y serializador de `server.properties` preservando comentarios y claves no administradas.
  - [x] Validador de rangos y directivas de seguridad para propiedades de servidor.
  - [x] Ejecutor RCON con sanitización de comandos peligrosos (`/stop`) y stripping de códigos de formato Minecraft (§ / ANSI).
  - [x] Descubrimiento de backups y extracción segura de metadata de mundos (`level.dat`).
  - [x] Panel Desktop `ServerAdminPanel` (PR #90).
  - [x] Suite de tests `server-admin-rcon.test.ts` pasando al 100%.
- [x] **Hito SRV-7: Sincronización multiplayer cliente-servidor (motor + UI Desktop en main; diagnóstico only):**
  - [x] Generación de manifest distribuible (`generateDistributableManifest`) con exclusión de mods server-only y secretos.
  - [x] Reconciliación de cliente local (`reconcileClientWithServerManifest`) detectando missing mods y version mismatches.
  - [x] Preservación estricta de mods client-only (OptiFine, Sodium, Iris, Shaders).
  - [x] Suite de tests `server-multiplayer-sync.test.ts` pasando al 100%.
  - [ ] API `POST /api/server/sync` + `ServerMultiplayerSyncPanel` — implementado localmente, **sin merge**.
  - [ ] Descarga/instalación automática de mods faltantes en el cliente.

---

## 10. Arquitectura de Monorepo & Desacoplamiento (Issue #60 — En Progreso)

- [x] **Hito ARCH-0: Inventario y análisis de dependencias:**
  - [x] Herramienta automatizada de grafo `scripts/architecture/analyze-graph.ts` (606 archivos, 1242 imports).
  - [x] Detección de ciclos, matriz de acoplamiento e inventario de duplicación en `MONOREPO_INVENTORY_ARCH_0.md`.
  - [x] Resolución de la anomalía de dependencias en el bus de eventos de servidor.
- [x] **Hito ARCH-1: Workspaces Foundation y comandos scoped:**
  - [x] Configuración de `npm workspaces: ["apps/*", "packages/*", "web"]` en `package.json` raíz.
  - [x] Comandos agregados: `build:hub`, `lint:hub`, `build:all`, `lint:all`.
  - [x] Integración de linting y build de producción para el Hub web en `.github/workflows/ci.yml`.
  - [x] Saneamiento de ESLint en `web/app/page.tsx` (cero errores en toda la superficie web).
- [x] **Hito ARCH-2: Primera extracción de contratos puros (`@mim/contracts-core`):**
  - [x] Creación del package modular `@mim/contracts-core` en `packages/contracts-core/`.
  - [x] Módulos de contratos tipados puros: `instances.ts`, `network.ts`, `server.ts` e `index.ts`.
  - [x] Path mapping configurado en `tsconfig.json` y retrocompatibilidad total mediante re-exports transparentes.
  - [x] Regla estricta de pureza arquitectónica y boundaries en `scripts/architecture/verify-boundaries.ts`.
  - [x] Suite de tests `contracts-core-boundaries.test.ts` pasando al 100%.
- [x] **Hito ARCH-3: Extracción de engines de dominio a `packages/*`:**
  - [x] Creación de `@mim/network-resilience` en `packages/network-resilience/` con sanitización, clasificación determinista de fallos y retry policy con backoff/jitter.
  - [x] Creación de `@mim/server-engine` en `packages/server-engine/` con discovery, preflight, reconciliación, auditoría, snapshots, capabilities y safety.
  - [x] Re-exports transparentes y retrocompatibles en `lib/network/` y `lib/server/`.
  - [x] Reglas de pureza arquitectónica actualizadas en `scripts/architecture/verify-boundaries.ts`.
- [x] **Hito ARCH-4: Configuración explícita de `apps/desktop`:**
  - [x] Workspace `@mim/desktop` configurado en `apps/desktop/` con `package.json` y `tsconfig.json`.
  - [x] Scripts de build, prepare:standalone y packaging para Windows.
  - [x] Suite de tests `scripts/__tests__/monorepo-arch3-arch4.test.ts` pasando al 100%.
- [x] **Hito ARCH-5: Traslado de `web/` a `apps/hub`:**
  - [x] Workspace `mim-fomo-web` en `apps/hub/` con `package.json` y `tsconfig.json`.
  - [x] Eliminación de `web/`; renames git preservan historial.
  - [x] Scripts scoped (`build:hub`, `lint:hub`, `build:all`, `lint:all`) y CI (`tsc --project apps/hub/tsconfig.json`).
  - [x] Tests y tooling de arquitectura actualizados a rutas `apps/hub/*`.
  - [ ] Unificación de módulos duplicados hub ↔ root vía `@mim/*` (backlog post-ARCH-5).
- [x] **Hito ARCH-6: Surface explícita de Server Manager (Desktop `/servers`):**
  - [x] Decisión registrada en [ADR-008](../adr/ADR-008-server-manager-desktop-surface.md): sección Desktop, no Hub ni app separada.
  - [x] Ownership: `app/servers/`, `components/server/`, `app/api/server/*` → Desktop; motor en `@mim/server-engine`.
  - [ ] `@mim/server-ui` diferido hasta segundo consumidor o gate ARCH-7.
- [ ] **Hitos ARCH-7 y ARCH-8: CI scoped y versionado semántico (Pendiente).**