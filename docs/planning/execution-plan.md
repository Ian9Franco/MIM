# Plan de ejecución por tareas atómicas

> Para agentes con contexto acotado. Cada tarea cabe en un PR, tiene archivos exactos, comando de verificación y criterio de cierre. No requiere leer todo el repo.

Fecha base: 2026-09-10. Fuentes de verdad: [PENDING.md](../PENDING.md), [whosnext.md](./whosnext.md), issues [#58](https://github.com/Ian9Franco/MIM/issues/58), [#60](https://github.com/Ian9Franco/MIM/issues/60), [#18](https://github.com/Ian9Franco/MIM/issues/18), [#65](https://github.com/Ian9Franco/MIM/issues/65). Issue #57 está cerrado.

---

## 0. Reglas para cualquier agente

1. **Un concern por PR.** Un ID de tarea = una rama = un PR. No mezclar docs con código ni dos motores.
2. **Rama desde `origin/main` actualizado.** Antes de empezar: `git fetch origin && git checkout -b <rama> origin/main`.
3. **Gates mínimos siempre:** `npm run lint:all`, `npm run typecheck` si existe o `npx tsc --noEmit`, y la suite de la tarea. Si la tarea toca `app/api/`, además `npm run lint:api-guard`.
4. **No cambiar claims de docs** ("100%", "completo", métricas) salvo que la tarea sea de docs. No tildar checkboxes de issues sin evidencia de test.
5. **No tocar** `web/hooks/useHomeController.ts` ni Drafts (REC-03 está `NEEDS_USER`, ver #65).
6. **No habilitar escrituras remotas** en UI (SRV-4). Sólo lectura hasta que SRV-3 persistencia esté mergeada y verificada.
7. **Al terminar:** comentar en el issue relacionado con: rama, commit, comandos ejecutados y su salida resumida, qué NO se verificó.
8. Si algo del plan no coincide con el código, **parar y reportar**, no adaptar el plan en silencio.

### Plantilla de reporte de cierre

```text
TAREA: <ID>
RAMA / PR: <nombre> / <#>
CAMBIOS: <archivos>
VERIFICADO: <comandos y resultado>
NO VERIFICADO: <qué queda fuera>
SIGUIENTE: <ID sugerido o "ninguno">
```

---

## 1. Fase 0 — Publicar el WIP local (bloqueante)

El working tree tiene 120 archivos sin commitear que mezclan tres frentes. Hasta que no estén en PRs, nada de lo demás debe arrancar.

### T0.1 — Sincronizar `main`

- **Objetivo:** `main` local igual a `origin/main` sin perder el WIP.
- **Pasos:** `git stash -u` → `git fetch origin` → `git merge --ff-only origin/main` → `git stash pop`. Si hay conflictos, resolver sólo `web/next.config.ts` y `README.md` a favor de `origin/main` y reportar.
- **Cierre:** `git log -1 origin/main` coincide con `git log -1 main`; `git status` muestra el WIP intacto.
- **No hacer:** rebasear el WIP; commitear nada todavía.

### T0.2 — Limpiar artefactos de raíz

- **Archivos:** `.server-browser.cjs`, `.server-fixture.json`, `.server-initial.png`, `.server-mobile.png`, `.server-success.png`, `.server-tests.log`, `.server-types.log`.
- **Acción:** borrarlos. Si `.server-browser.cjs` es un script útil, moverlo a `scripts/dev/` y renombrar sin punto inicial. Agregar `/.server-*` a `.gitignore`.
- **Cierre:** `git status --short | Select-String '^\?\? \.server'` no devuelve nada.

### T0.3 — PR A: reorganización de `docs/`

- **Alcance:** todo lo que está bajo `docs/`, `README.md`, `README.es.md`, `llms.txt`, `LICENSE`.
- **Rama:** `docs/reorg-kebab-case`.
- **Verificación:** que ningún enlace interno rompa. Comando: buscar `\]\((\.\./|\./)[^)]+\.md` en `docs/**/*.md` y confirmar que cada destino existe. Un script simple en Node alcanza.
- **Cierre:** PR abierto contra `main`, título `docs: reorganizar docs/ en carpetas temáticas`, sin archivos fuera del alcance.
- **No incluir:** `docs/planning/ROADMAP.md`, `docs/releases/UNRELEASED.md`, `docs/planning/project-status.md` si contienen cambios que describen código de PR B o C. Si los contienen, dejar esas líneas para el PR correspondiente.

### T0.4 — PR B: Server Manager Fase 1 (lectura SFTP + `/servers`)

- **Alcance:**
  - `app/servers/page.tsx`
  - `app/api/server/inspect/route.ts`
  - `components/server/ServerConnectionForm.tsx`, `ServerInspectionResultView.tsx`, `ServerAuditSummaryCards.tsx`
  - `components/layout/LayoutHeader.tsx` (link a `/servers`)
  - `lib/server/inspectSchema.ts`, `inspectServer.ts`, `transport/buildReadTransport.ts`, `transport/sftpReadTransport.ts`
  - `lib/instances/validatorAdapter.ts`
  - `packages/contracts-core/server.ts`, `packages/server-engine/discovery.ts`
  - `scripts/__tests__/server-sftp-integration.test.ts`, `server-sftp-discovery.test.ts`, `fixtures/sftpFixture.ts`, `scripts/dev/server-audit-fixture.ts`
  - `standalone/main.js`, `package.json` (script `dev:server-fixture`, dep `ssh2`), `package-lock.json` si sólo trae `ssh2`.
  - Docs mínimas: `docs/architecture/server-audit.md`, sección "Estado de aceptación" de `ROADMAP.md §9`, `UNRELEASED.md` entrada de Server Manager.
- **Rama:** `feat/server-manager-readonly-audit`.
- **Verificación:** `npm run test:server`, `npm run lint:api-guard`, `npm run lint:all`, `npm run build`. Recorrido manual: `npm run dev:server-fixture` + abrir `/servers` y auditar contra el fixture.
- **Cierre:** PR abierto contra `main` con `Refs #58`. Comentar en #58 con la plantilla. **No** cerrar #58.

### T0.5 — PR C: MIMbot Model Gateway (ADR-007)

- **Alcance:**
  - `lib/intelligence/ai/*` (createAIProvider, errors, geminiProvider, openRouterProvider, index, types)
  - `lib/intelligence/contextBuilder.ts`, `modExplainer.ts`, `sage/sageMimbotEngine.ts`
  - `app/api/fomo/explain/route.ts`, `app/api/fomo/explain-deps/route.ts`, `app/api/sage/chat/route.ts`
  - `lib/core/settings.ts`, `lib/core/secretStore.ts`
  - `scripts/__tests__/context-builder.test.ts`
  - `docs/adr/ADR-007-mimbot-model-gateway.md`, entrada MIMBOT-GW en `UNRELEASED.md`, `ROADMAP.md §2`.
  - `package.json` / lockfile si trae deps propias.
- **Rama:** `feat/mimbot-model-gateway`.
- **Verificación:** `npx ts-node -r tsconfig-paths/register --project tsconfig.scripts.json scripts/__tests__/context-builder.test.ts`, `npm run test:sage-errors`, `npm run test:sage-stream`, `npm run lint:api-guard`, `npm run lint:all`.
- **Cierre:** PR abierto. Verificar que ninguna key aparece en URL ni en logs (`grep -n "apiKey" app/api/sage/chat/route.ts` y revisar).
- **Bloqueante detectado (2026-09-10):** `npm test` falla en la suite `Critical API Integration & Zod Schema Contracts`, caso `Gemini-backed chat succeeds with mocked provider response` (`scripts/__tests__/api-integration.test.ts`). Error: `[/api/sage/chat] Provider generation failed: Unexpected token 'd', "data: {"ca"...` — el nuevo `GeminiProvider` parsea JSON donde el mock devuelve SSE (`data: ...`). Corregir el provider para aceptar stream SSE o ajustar el mock **sin** bajar cobertura; el test debe volver a pasar antes de abrir el PR C. Las otras 25 suites pasan.
- **Riesgo conocido:** ADR-007 dice "Gemini sigue siendo default hasta un PR posterior". Si el código ya pone GLM como primario, el PR debe decirlo explícitamente en su descripción y actualizar el ADR con una sección "Revisión".

### T0.6 — Reconciliar lockfile

- Sólo si B y C tocan `package-lock.json`. Regenerar en cada rama con `npm install --package-lock-only` y comprobar `npm ci --dry-run`.

---

## 2. Fase 1 — Server Manager: cerrar SRV-3 (PENDING §1, primer ítem)

Depende de PR B mergeado.

### T1.1 — `FileSnapshotStore` en disco

- **Archivo nuevo:** `packages/server-engine/fileSnapshotStore.ts`.
- **Contrato a implementar:** `ISnapshotStore` en `packages/server-engine/snapshotStore.ts` (métodos `saveSnapshot`, `getSnapshot`, `listSnapshots`, `updateSnapshotStatus`, `recordChange`, `getChangeHistory`).
- **Diseño:** una carpeta raíz inyectada por constructor; un JSON por snapshot en `<root>/snapshots/<snapshotId>.json`; journal por servidor en `<root>/journal/<serverId>.ndjson` (append-only). Escritura atómica: escribir a `.tmp` y `rename`. Sin dependencias nuevas.
- **Pureza:** el package no puede importar Next/Electron/React. Usar `node:fs/promises` y `node:path`. Verificar con `npm run lint:architecture`.
- **Test nuevo:** `scripts/__tests__/server-file-snapshot-store.test.ts` usando `fs.mkdtemp`. Casos: guardar/leer, listar ordenado por `createdAt` desc, actualizar status, journal append, **reapertura** (crear una segunda instancia sobre la misma carpeta y leer lo escrito), archivo corrupto devuelve `null` y no lanza.
- **Registrar el test** en `package.json` (`test:server`) y en `scripts/test-runner.js` si la suite lista archivos.
- **Cierre:** tests verdes, `lint:architecture` verde. Tildar en `ROADMAP.md §9` el ítem "Persistencia durable y recuperación tras reinicio" sólo la parte de persistencia; recuperación de planes queda para T1.2.

### T1.2 — Recuperación de plan tras reinicio

- **Alcance:** función pura en `packages/server-engine/` que, dado un `ISnapshotStore` y un `serverId`, devuelva snapshots en estado no terminal y el último `ServerChangeRecord`, para que la UI pueda mostrar "hay una operación sin cerrar".
- **Test:** simular store con snapshot `pending`/`in-progress` (usar los `SnapshotStatus` reales de `contracts-core/server.ts`) y verificar la detección.
- **No hacer:** ejecutar rollback automático. Sólo detectar y exponer.

### T1.3 — Cablear el store en el backend Desktop (solo lectura de estado)

- **Archivo:** `lib/server/inspectServer.ts` o un módulo nuevo `lib/server/snapshotStoreFactory.ts` que elija `FileSnapshotStore` con raíz en el directorio de datos de MIM (buscar cómo se resuelve `buildsBase` en `app/api/server/inspect/route.ts` y usar el mismo padre).
- **Cierre:** `/api/server/inspect` incluye en su respuesta `pendingOperations: number` sin cambiar el resto del contrato. Actualizar `ServerInspectionResultView.tsx` para mostrar un aviso si es > 0.

---

## 3. Fase 2 — Tareas mecánicas de calidad (PENDING §4 y §5)

Independientes entre sí. Cada una es un PR pequeño. Orden sugerido por riesgo bajo → alto.

### T2.1 — SAGE-03: gate de umbrales en `eval:sage`

- **Archivo:** `scripts/evaluation/sage-eval.ts`.
- **Cambio:** reemplazar etiquetas fijas "Exceeded"/"Ultra-fast" por comparación real contra umbrales definidos en una constante al inicio (`MACRO_F1_MIN = 0.85`, `TOP3_MIN = 0.95`, `LATENCY_MAX_MS = 15`). Si no se cumple, `process.exit(1)` después de escribir el reporte.
- **Test:** agregar un caso al corpus que fuerce incumplimiento sólo cuando se pase `--self-test-fail` y comprobar exit code 1. Sin ese flag, exit 0.
- **Cierre:** `npm run eval:sage` sigue verde; el runner de `npm test` falla si se rompe un umbral.

### T2.2 — SAGE-02: separar Top-1/Top-3 con y sin culpable

- **Archivo:** `scripts/evaluation/sage-eval.ts`.
- **Cambio:** dos contadores: casos con `expectedCulprit` (numerador/denominador explícitos) y casos sistémicos sin culpable (acierto por categoría). Mantener la métrica histórica bajo etiqueta `Top-1 (histórico, mezclado)`.
- **Salida:** regenerar `docs/engines/sage-eval.md` y **no** cambiar los números del README hasta que Ian los revise; reportar los nuevos valores en el PR.
- **Test:** fixture mínimo de 4 casos (2 con culpable, 2 sin) con resultado esperado conocido.

### T2.3 — API-02: Zod en una ruta de mutación

- Una ruta por PR. Candidatas sin `bodySchema` hoy: `app/api/build/route.ts`, `app/api/staging/route.ts`, `app/api/tweak/route.ts`, `app/api/scan/route.ts`. Las tres rutas `delete` ya lo tienen. Confirmar con `Grep bodySchema app/api/<ruta>/route.ts` antes de empezar.
- **Patrón:** copiar el uso de `withApiGuard` con `bodySchema` de `app/api/delete/route.ts` o `app/api/server/inspect/route.ts`.
- **Test:** agregar caso al archivo de tests de API existente (`scripts/__tests__/api-integration.test.ts`): payload inválido → 400 con mensaje estructurado.
- **Cierre:** `npm run test:api`, `npm run lint:api-guard`.

### T2.4 — REC-02: bajar una categoría de warnings ESLint

- **Pasos:** `npx eslint app components lib -f json > /tmp/eslint.json` (fuera del repo), agrupar por `ruleId`, elegir la regla con más ocurrencias en **un solo directorio**. Corregir sólo esa regla en ese directorio.
- **Cierre:** medir antes/después; bajar `--max-warnings` en `package.json` exactamente en la cantidad eliminada. No usar `eslint-disable`.

### T2.5 — REC-01: `any` en un hook orquestador

- **Archivo:** `hooks/useAlertManager.ts`. Medir antes con `Grep ": any|as any|<any>" hooks/useAlertManager.ts`.
- **Cambio:** reemplazar por tipos concretos o `unknown` con narrowing. Sin cambiar comportamiento.
- **Cierre:** `npx tsc --noEmit` verde; conteo de `any` en el archivo antes/después en la descripción del PR.

---

## 4. Fase 3 — MIMbot (PENDING §3). Depende de PR C mergeado.

### T3.1 — BOT-04: estado de conexión veraz

- **Archivo:** `components/sage/parts/SageMimbotCopilot.tsx`.
- **Cambio:** estados `saved | validating | valid | invalid | quota`; llamar a `POST /api/settings/validate-keys` al montar si hay key guardada. Nunca poner la key en query string.
- **Test:** test de componente o de la función de transición de estados (extraerla a `lib/intelligence/ai/keyStatus.ts` para poder testearla sin React).

### T3.2 — BOT-08: caché 24 h de quick questions

- **Archivo:** `lib/intelligence/sage/cacheEngine.ts` (ya tiene adaptadores Node/browser).
- **Clave:** `hash(crashSignature + question + mode)`. TTL 24 h. Invalidación al cambiar de crash.
- **Test:** unidad con reloj inyectado.

### T3.3 — BOT-01: historial local opt-in

- Persistir por firma de crash en el adaptador browser existente; toggle en Settings; botón "borrar historial".
- **Test:** guardar, recargar, borrar.

### T3.4 — BOT-03: chips de seguimiento

- Dos sugerencias derivadas de la última respuesta, sin repetir preguntas ya hechas. Lógica pura en `lib/intelligence/` con test; UI después.

### T3.5 — BOT-JSON: salida estructurada

- Schema Zod para la respuesta de `/api/fomo/explain-deps`; si el modelo no cumple, devolver fallback determinista, no error 500.

### T3.6 — Desktop: persistencia credenciales tras upgrade (cerrado)

- **Archivos:** `standalone/main.js`, `standalone/secret-store.js`, `lib/core/settings.ts`, [desktop-credentials.md](../guides/desktop-credentials.md).
- **Problema:** releases nuevas no reutilizaban `%USERPROFILE%\.mim-index\` ni importaban claves legacy en texto plano.
- **Verificación:** `scripts/__tests__/secure-settings.test.ts` (incluido en `npm test`).

### T3.7 — BOT-06b: uso OpenRouter en Settings (cerrado)

- **Archivos:** `lib/intelligence/ai/openRouterAccount.ts`, `app/api/settings/ai-quota/route.ts`, `AiQuotaStatusPanel`.
- **Verificación:** `npm run test:openrouter-account`.

### T3.8 — SAGE-05: fixtures baseline MIMbot (cerrado, estructura)

- **Archivos:** `scripts/evaluation/mimbot-fixtures.json`, `scripts/evaluation/mimbot-eval.ts`.
- **Verificación:** `npm run eval:mimbot`. Live scoring: `RUN_MIMBOT_LIVE=1 npm run eval:mimbot` (requiere claves).
- **Pendiente:** gate CI (SAGE-05b).

---

## 5. Fase 4 — UX (PENDING §6). Sin dependencias. Un cambio por PR.

- **T4.1** Header móvil en Safari al abrir detalle de mod (MIMhub). Archivo en `web/components/`; verificar con viewport 390×844.
- **T4.2** Contraste bloque Cliente/Servidor en tema Modern (MIMhub).
- **T4.3** Discover: 1 clic abre detalle, doble clic selecciona (Desktop, `components/fomo/`).
- **T4.4** Filtro dual Modrinth+CurseForge por defecto (Desktop).

---

## 6. Explícitamente fuera del plan (no arrancar sin decisión de Ian)

- SRV-4 executor en UI, SRV-5/6/7 integración Desktop.
- ARCH-5 (`web/` → `apps/hub`), ARCH-6/7/8.
- REC-03 Phase 3 y cualquier cambio a `useHomeController.ts`.
- Extraer SAGE/NBT/scanner/security a `packages/*`.
- Hosting externo o cuenta de pruebas Supabase.

---

## 7. Cómo elegir la próxima tarea

1. Leer #18 (cola de Harry) y #65 (Council) para ver si hay `ACTIVE ZONE` sobre los archivos de la tarea. Si la hay, elegir otra.
2. Tomar la primera tarea de la fase más baja cuyas dependencias estén mergeadas.
3. Confirmar que los archivos citados existen (`Glob`). Si no, reportar y parar.
4. Ejecutar, verificar, reportar con la plantilla.

Orden por defecto: **T0.1 → T0.2 → T0.3 → T0.4 → T0.5 → T1.1 → T2.1 → T2.3 → T1.2 → T2.2 → T2.4 → T1.3 → T3.1 → resto.**
