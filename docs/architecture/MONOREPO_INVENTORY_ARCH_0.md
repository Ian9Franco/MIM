# Inventario de Arquitectura y Grafo de Dependencias (Hito ARCH-0)

Fecha: 2026-09-09.  
Iniciativa: **#60 (Arquitectura de Monorepo y desacoplamiento de superficies)**.  
Herramienta de análisis: [scripts/architecture/analyze-graph.ts](../../scripts/architecture/analyze-graph.ts).

---

## 1. Métricas Cuantitativas del Repositorio

| Métrica | Valor Comprobado |
|---|---|
| **Archivos Fuente Totales (TS/TSX/JS/MJS)** | **587** |
| **Imports Internos Resueltos** | **1200** |
| **Superficie Desktop (`app/`, `components/`, `standalone/`)** | 238 archivos |
| **Superficie Web Hub (`web/`)** | 101 archivos |
| **Engines Puros (`lib/modding/`, `lib/intelligence/`, `lib/server/`, etc.)** | 72 archivos |
| **Infraestructura (`lib/network/`, `lib/core/`, `lib/storage/`)** | 24 archivos |
| **Contratos Puros (`types/`, `*/types.ts`)** | 10 archivos |
| **Tooling & Scripts (`scripts/`)** | 46 archivos |
| **Otros módulos auxiliares (`lib/`, `utils/`, `hooks/`, `constants/`)** | 96 archivos |

---

## 2. Taxonomía de Ownership y Mapeo a Packages

```text
               ┌──────────────────────────────────────────────┐
               │              APPLICATIONS (Apps)             │
               │   apps/desktop (Electron)  |  apps/hub (Web) │
               └──────────────────────┬───────────────────────┘
                                      │ consumes
                                      ▼
               ┌──────────────────────────────────────────────┐
               │             DOMAIN ENGINES (Pkgs)            │
               │  @mim/modding-engine   |  @mim/sage-engine   │
               │  @mim/server-engine    |  @mim/security      │
               └──────────────────────┬───────────────────────┘
                                      │ consumes
                                      ▼
               ┌──────────────────────────────────────────────┐
               │         INFRASTRUCTURE & PLATFORM (Pkgs)     │
               │  @mim/network-resilience | @mim/core-storage │
               └──────────────────────┬───────────────────────┘
                                      │ consumes
                                      ▼
               ┌──────────────────────────────────────────────┐
               │             CORE CONTRACTS (Pkgs)            │
               │              @mim/contracts-core             │
               └──────────────────────────────────────────────┘
```

### Detalle de Clasificación

| Dominio Actual | Destino Propuesto | Responsabilidad y Restricciones |
|---|---|---|
| `app/`, `components/`, `standalone/` | `apps/desktop` | Aplicación Electron + Next.js desktop. Puede consumir todos los packages `@mim/*`. |
| `web/` | `apps/hub` | Hub público Next.js. Prohibido importar `standalone/` o APIs Node exclusivas de Desktop. |
| `lib/instances/types.ts`, `types/` | `packages/contracts-core` | Contratos puros de datos, tipos de manifests, eventos y schemas Zod. Cero dependencias de UI/IO. |
| `lib/network/` | `packages/network-resilience` | Diagnóstico por fases, clasificación de errores, sanitización y política determinista de retry. |
| `lib/modding/`, `lib/mod-scanner/`, `lib/scanner/` | `packages/modding-engine` | Escaneo de buffers, parsers de mods Fabric/Forge/NeoForge/Quilt, NBT y hashing. |
| `lib/intelligence/` | `packages/sage-engine` | Motor determinista SAGE, análisis de crash logs, clasificador y heurísticas. |
| `lib/server/` | `packages/server-engine` | Auditoría de servidores, reconciliación de estados, diff y preflight. |
| `lib/security/`, `lib/apiGuard.ts`, `lib/rateLimiter.ts` | `packages/security-engine` | Aduana, validación de schemas de red, guardias de API y control de cuotas. |
| `scripts/` | `tooling` | Scripts de soporte, benchmarks, linters de arquitectura y workflows de PR. |

---

## 3. Hallazgos Críticos, Ciclos y Anomalías

El análisis automatizado identificó **3 anomalías de frontera** y **4 ciclos de importación** que deben ser saneados antes o durante las extracciones:

### A. Anomalías de Frontera

1. **`lib/events/server.ts` ➔ `lib/server/reconciliation.ts`:**
   - *Problema:* El bus de eventos importa tipos de planes directamente del motor de reconciliación de servidores en lugar de contratos puros.
   - *Solución:* Mover los tipos `ReconciliationPlan` y `PlannedServerAction` a `packages/contracts-core` o `lib/server/types.ts`.

2. **`lib/fomo/fomoDiscoverActions.ts` ➔ `components/fomo/sidebar/fomoSidebarTypes.ts`:**
   - *Problema:* Un módulo de lógica de negocio en `lib/` depende de tipos definidos dentro de la capa de componentes UI (`components/`).
   - *Solución:* Extraer los tipos a `types/fomo.ts` o a la capa de contratos.

3. **`lib/fomo/fomoDiscoverPending.ts` ➔ `components/fomo/sidebar/fomoSidebarTypes.ts`:**
   - *Problema:* Dependencia inversa idéntica a la anterior.

### B. Ciclos de Dependencias Identificados

1. `lib/scanner.ts` ➔ `lib/scanner/parsers.ts` ➔ `lib/scanner.ts`
2. `lib/scanner.ts` ➔ `lib/scanner/scoring.ts` ➔ `lib/scanner.ts`
3. `lib/intelligence/incidentManager.ts` ➔ `lib/intelligence/incidentStorage.ts` ➔ `lib/intelligence/incidentManager.ts`
4. `lib/intelligence/incidentManager.ts` ➔ `lib/intelligence/incidentStorage.ts` ➔ `lib/storage/storage-fallback.ts` ➔ `lib/intelligence/incidentManager.ts`

---

## 4. Análisis de Duplicación (`web/` vs Raíz)

Se detectaron **23 archivos candidatos a duplicación** entre el Hub web y la raíz del proyecto:
- **Rutas de API (`app/api/*` vs `web/app/api/*`):** `bedrock/discover`, `curseforge/discover`, `curseforge/picks`, `curseforge/project`, `fomo/*`, `modrinth/*`.
- **Módulos auxiliares:** `lib/apiGuard.ts`, `lib/rateLimiter.ts`, `lib/vault/vaultEngine.ts`, `lib/intelligence/modExplainer.ts`, `hooks/useSmoothMarquee.ts`, `types/fomo.ts`.

*Estrategia:* En `ARCH-5`, las rutas y módulos duplicados se unificarán importando desde los packages compartidos (`@mim/security-engine`, `@mim/modding-engine`, etc.), eliminando la redundancia de código.

---

## 5. Justificación del Orden de Extracción (ARCH-1 a ARCH-8)

1. **ARCH-1 (npm Workspaces Foundation):**
   - Configurar `workspaces: ["apps/*", "packages/*"]` en `package.json` raíz sin mover aún los archivos principales, garantizando compatibilidad de scripts y `npm ci`.
2. **ARCH-2 (Primera Extracción: Contratos Puros):**
   - **Candidato justificado:** `lib/instances/types.ts` y tipos de red hacia `packages/contracts-core` (`@mim/contracts-core`).
   - *Razón:* Es una hoja en el grafo de dependencias (no tiene dependencias de UI ni de I/O) y es consumido por todos los engines y surfaces.
3. **ARCH-3 (Extracción de Engines Puros):**
   - `@mim/network-resilience` (ya probado en `NET-1` y `NET-2`).
   - `@mim/security-engine` (Aduana, apiGuard, rateLimiter).
   - `@mim/modding-engine` (parsers, hashing, scanner).
   - `@mim/sage-engine` (rompiendo los ciclos de `incidentManager`).
   - `@mim/server-engine` (diff, validator, audit).
4. **ARCH-4 (Apps Desktop):**
   - Mover `app/`, `components/`, `standalone/` a `apps/desktop`.
5. **ARCH-5 (Apps Hub):**
   - Mover `web/` a `apps/hub` y reemplazar duplicados por imports de `@mim/*`.
6. **ARCH-6 (Surface Server Manager):**
   - Composición clara en `apps/desktop` cuando la auditoría y SFTP estén estables.
7. **ARCH-7 & ARCH-8 (CI Scoped & Releases):**
   - Gates de CI por package afectado y versionado semántico de plataforma.
