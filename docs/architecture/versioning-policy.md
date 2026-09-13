# Política de Versionado Semántico y Gobernanza de Releases (ARCH-8)

Fecha de adopción: 2026-09-13.  
Iniciativa: **#60 (Arquitectura de Monorepo & Workspaces — Hito ARCH-8)**.

---

## 1. Principios de Versionado Semántico (SemVer)

La plataforma MIM sigue una estrategia de versionado semántico formal (`MAJOR.MINOR.PATCH`):

```text
       MAJOR . MINOR . PATCH
         ▲       ▲       ▲
         │       │       └─ Correcciones de errores, refactors internos sin cambio de API
         │       └───────── Nuevas funcionalidades hacia atrás compatibles, migraciones no disruptivas
         └───────────────── Cambios breaking en contratos públicos o incompatibilidad de schemas
```

---

## 2. Taxonomía de Versionado por Superficie y Workspace

| Workspace / Package | Estrategia de Versión | Política de Compatibilidad |
|---|---|---|
| **Root (`mim`)** | Plataforma Global | Versión maestra de la suite de software MIM. Sincronizada con tags git (`vX.Y.Z`). |
| **`apps/desktop`** | Vinculada a Plataforma | Distribución ejecutable de escritorio (Electron / Portable / NSIS). Comparte `MAJOR.MINOR.PATCH` con root. |
| **`apps/hub`** | SemVer Independiente / Sincronizado | PWA Web pública de comunidad y descubrimiento. Compatible con APIs públicas del backend. |
| **`packages/contracts-core`** | SemVer Estricto (`0.x` / `1.x`) | Contratos puros de datos (`InstanceManifest`, schemas Zod). **Zero-breaking:** todo cambio incompatible requiere bump de `schemaVersion` o nueva interfaz. |
| **`packages/network-resilience`** | SemVer de Dominio | Clasificación determinista de red, políticas de reintento y diagnósticos. |
| **`packages/server-engine`** | SemVer de Dominio | Reconciliación remota, snapshots durables y preflight de servidor. |

---

## 3. Compatibilidad Retroactiva de Esquemas (`contracts-core`)

1. **Invarianza de Schemas:** Todo schema exportado por `@mim/contracts-core` (como manifiestos de instancias, auditorías de servidor o diagnósticos de red) debe mantener compatibilidad binaria o proveer conversores automáticos de migración (`migrateManifestV1toV2`).
2. **Deprecación Controlada:** Los campos deprecados se marcan con `@deprecated` en TypeScript y se mantienen durante al menos un ciclo completo de release menor antes de su remoción.
3. **Validación en Tiempo de Compilación:** CI valida que ningún cambio en `contracts-core` rompa los consumidores en `apps/desktop` o `apps/hub` mediante compilación estricta de TypeScript.

---

## 4. Flujo Automatizado de Release (1-Click & CI)

El script [scripts/release.js](../../scripts/release.js) centraliza el proceso de release:

```bash
# 1-Click Release Automático (Compuertas de calidad obligatorias + Sync de todos los workspaces + Git Tag + Push)
npm run release:auto [patch|minor|major] "Mensaje editorial de release"

# Modo Interactivo con confirmación de compuertas
npm run release
```

### Acciones del Release Manager:
1. **Verificación de Compuertas:** Ejecuta linters, API guard, arquitectura de fronteras, tests de todos los engines y DAST.
2. **Cálculo SemVer:** Incrementa `MAJOR`, `MINOR` o `PATCH` según el impacto.
3. **Sincronización Transversal de Workspaces:** Actualiza `package.json` raíz, `apps/desktop/package.json`, `apps/hub/package.json` y todos los `packages/*/package.json`.
4. **Generación de Release Notes:** Transfiere automáticamente el contenido de [docs/releases/UNRELEASED.md](../releases/UNRELEASED.md) a `docs/releases/release-notes-vX.Y.Z.md` y actualiza el encabezado de [docs/releases/CHANGELOG.md](../releases/CHANGELOG.md).
5. **Git Tagging:** Crea el tag firmado `vX.Y.Z` y sube a GitHub para disparar la compilación standalone en GitHub Actions.
