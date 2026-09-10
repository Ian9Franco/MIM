# Auditoría Integral de Refactorización y Deuda Técnica (MIM Monorepo)

**Fecha**: 9 de Septiembre de 2026  
**Alcance**: Todo el repositorio (`apps/`, `packages/`, `components/`, `lib/`, `web/`, `app/`, `scripts/`)  
**Objetivo**: Identificar componentes sobredimensionados (> 600 líneas), código duplicado o bifurcado entre surfaces, ciclos de importación y oportunidades de modularización y reutilización.

---

## 1. Resumen Ejecutivo y Métricas de Código

| Métrica | Valor Actual | Umbral Deseado | Estado |
|---|---|---|---|
| **Archivos que violan límite modular (> 600 líneas funcionales)** | **6 archivos** (3 completados) | 0 archivos | 🟡 En Descomposición Progresiva |
| **Archivos en zona de riesgo (450 a 600 líneas funcionales)** | **17 archivos** | Monitoreo | 🟡 Atención Preventiva |
| **Archivos duplicados / bifurcados (`web/` vs `root`)** | **14 módulos clave** | 0 (Shared Packages) | 🟠 Sincronizar en ARCH-5 |
| **Ciclos de dependencia en grafo interno** | **4 ciclos** | 0 ciclos | 🟡 Romper dependencias |
| **Anomalías de acoplamiento inverso (Engine importa UI)** | **2 archivos** | 0 violaciones | 🟡 Extraer contratos |

---

## 2. Archivos que Superan el Límite de Modularidad (> 600 Líneas)

> **Regla de Arquitectura**: Ningún componente o módulo debe superar las **600 líneas de código funcional** (sin contar comentarios ni bloques JSDoc).

```
┌──────────────────────────────────────────────┬──────────────────┬───────────────┬──────────────────────────────────────────┐
│ Archivo                                      │ Líneas Func.     │ Total Líneas  │ Dominio / Surface                        │
├──────────────────────────────────────────────┼──────────────────┼───────────────┼──────────────────────────────────────────┤
│ web/hooks/useHomeController.ts               │ 957 func.        │ 1057 tot.     │ Web / Hub Orchestration Hook             │
│ web/components/tabs/DiscoverTab.tsx          │ 158 func. [OK]   │ 158 tot. [OK] │ Web / Feed & Discover UI (Modularizado)  │
│ components/fomo/core/FomoVersionOverlay.tsx  │ 186 func. [OK]   │ 186 tot. [OK] │ Desktop / Version Modal (Modularizado)   │
│ web/components/DraftDetailView.tsx           │ 188 func. [OK]   │ 188 tot. [OK] │ Web / Modpack Draft (Modularizado)       │
│ components/fomo/sidebar/FomoSidebarDiscover. │ 744 func.        │ 782 tot.      │ Desktop / Navigation Sidebar Branch      │
│ components/fomo/showcase/FomoYoutubeShowcase │ 711 func.        │ 834 tot.      │ Desktop / Video Player & Cards           │
│ web/components/MobileFloatingPlayer.tsx      │ 701 func.        │ 796 tot.      │ Web / Floating Video Player & Gestures   │
│ components/fomo/followed/FomoFollowedShowcas │ 688 func.        │ 746 tot.      │ Desktop / Followed Creator Feed          │
│ web/components/SpotlightMarquees.tsx         │ 662 func.        │ 724 tot.      │ Web / Animated Marquee Grids             │
└──────────────────────────────────────────────┴──────────────────┴───────────────┴──────────────────────────────────────────┘
```

### Propuestas de Descomposición Modular

#### A. `web/hooks/useHomeController.ts` (957 líneas)
- **Problema**: Actúa como un *God Hook* que centraliza estado de filtros, paginación, modales, reproducción de video, drafts de modpack y URLs de consulta en una sola función gigante.
- **Propuesta de Refactorización**:
  1. `useHomeFilters.ts`: Gestión de búsqueda, etiquetas, categorías y loaders.
  2. `useHomePlayer.ts`: Estado del reproductor flotante y control de reproducción.
  3. `useHomeDraftSync.ts`: Sincronización del draft activo con LocalStorage / Vault.
  4. `useHomeController.ts`: Reducir a un compositor delgado (< 150 líneas) que combine los sub-hooks.

#### B. `web/components/tabs/DiscoverTab.tsx` (Completado ✅ — Reducido de 921 a 158 líneas)
- **Modularización implementada** en `web/components/tabs/discover/`:
  1. `discoverConstants.tsx` (272L): Constantes, tabs, badges de modloader, categorías y tipos.
  2. `DiscoverPlatformHeader.tsx` (164L): Banner hero, selector animado de plataforma con `layoutId` y búsqueda.
  3. `DiscoverControls.tsx` (136L): Pestañas de tipo de proyecto con spring animation y filtros contextuales.
  4. `DiscoverFiltersPanel.tsx` (224L): Panel desplegable de filtros avanzados (categorías, versiones, orden).
  5. `DiscoverModCard.tsx` (160L): Renderizado de tarjetas de proyectos y estados de instalación/descarga.
  6. `DiscoverPagination.tsx` (59L): Controles de paginación responsiva.
  7. `DiscoverTab.tsx` (158L): Orquestador delgado.

#### C. `components/fomo/core/FomoVersionOverlay.tsx` (Completado ✅ — Reducido de 925 a 186 líneas)
- **Modularización implementada** en `components/fomo/details/`:
  1. `FomoOverlayTopBar.tsx` (51L): Barra de navegación con botón volver y título.
  2. `FomoDescriptionTab.tsx` (320L): Renderizado de markdown/HTML, badges de metadata y panel de ayuda contextual.
  3. `FomoGalleryTab.tsx` (76L): Grid de capturas de pantalla con hover interactivo.
  4. `FomoDependenciesTab.tsx` (46L): Lista de dependencias requeridas e incompatibilidades.
  5. `FomoVersionsTab.tsx` (187L): Selector de versiones, filtros por modloader y botón de descarga.
  6. `FomoLightbox.tsx` (84L): Modal flotante de visualización de imágenes a pantalla completa.
  7. `FomoVersionOverlay.tsx` (186L): Contenedor orquestador.

#### D. `web/components/DraftDetailView.tsx` (Completado ✅ — Reducido de 865 a 188 líneas)
- **Modularización implementada** en `web/components/draft-detail/`:
  1. `draftDetailConstants.ts` (24L): Constantes y tipos de pestañas.
  2. `DraftDetailBanner.tsx` (86L): Header con título editable, badges y exportación ZIP.
  3. `DraftDetailTabs.tsx` (48L): Selector animado de pestañas (`summary`, `items`, `members`, `activity`).
  4. `DraftSummaryTab.tsx` (78L): Estadísticas, modloaders y compatibilidad.
  5. `DraftItemsTab.tsx` (134L): Grid de mods incluidos con acciones de eliminación y configuración.
  6. `DraftMembersTab.tsx` (65L): Colaboradores y permisos.
  7. `DraftActivityTab.tsx` (68L): Registro cronológico de cambios.
  8. `DraftMetadataModal.tsx` (179L): Modal de edición de metadata del modpack.
  9. `DraftItemEditModal.tsx` (148L): Modal de edición de versión y configuración de mod individual.
  10. `DraftDetailView.tsx` (188L): Contenedor orquestador.

#### E. `web/components/MobileFloatingPlayer.tsx` (701 líneas) vs `FomoFloatingPlayer.tsx` (535 líneas)
- **Problema**: Existe una duplicación masiva de lógica entre el reproductor de YouTube de Web y el de Desktop, incluyendo manejo de gestos táctiles y minimización.
- **Propuesta de Refactorización**:
  - Extraer el hook `useFloatingPlayerGestures.ts` para compartir cálculo de arrastre (drag physics) y controles de reproducción.

---

## 3. Archivos en Zona de Riesgo (450 a 600 Líneas)

Estos componentes funcionan correctamente pero se encuentran cerca del límite modular y deben vigilarse para evitar su degradación:

1. `components/layout/SettingsComponents.tsx` (598 líneas) ➔ Separar pestañas de configuración (General, JVM, SFTP, Apariencia).
2. `components/fomo/community/draft-tabs/DraftItemsTab.tsx` (588 líneas) ➔ Extraer subcomponentes de tarjeta de mod.
3. `components/layout/TweakSidebar.tsx` (582 líneas) ➔ Extraer paneles de perfiles y modpacks.
4. `components/fomo/community/CommunityDraftDetails.tsx` (576 líneas) ➔ Modularizar comentarios y likes.
5. `web/app/api/fomo/youtube-posts/route.ts` (560 líneas) ➔ Extraer scraper / parser de YouTube a `lib/fomo/youtubeParser.ts`.
6. `components/fomo/showcase/FomoFloatingPlayer.tsx` (535 líneas) ➔ Extraer controles UI y hook de arrastre.
7. `app/api/tweak/route.ts` (523 líneas) ➔ Descomponer handlers de sub-acciones de modding.
8. `components/fomo/sidebar/FomoSidebar.tsx` (499 líneas) ➔ Subdividir ramas de navegación.
9. `components/fomo/followed/FomoFollowedAuthors.tsx` (495 líneas) ➔ Extraer tarjetas de creadores.
10. `components/tweak/parts/PackHierarchyManager.tsx` (491 líneas) ➔ Modularizar árbol de dependencias.
11. `components/fomo/spotlight/SpotlightShowcaseRow.tsx` (490 líneas) ➔ Extraer tarjetas de video.
12. `components/sage/parts/SageMimbotCopilot.tsx` (479 líneas) ➔ Modularizar entrada de chat, lista de mensajes y selector de modelo BYOK.

---

## 4. Oportunidades de Deduplicación y Consolidación (`web/` vs `root`)

Durante el análisis del grafo se detectaron múltiples módulos con lógica paralela o forkeada entre `web/` y la raíz del proyecto. Estos son los candidatos prioritarios para ser unificados en `packages/*` antes o durante **`ARCH-5`**:

| Módulo en `root` | Módulo en `web/` | Diagnóstico | Acción Recomendada |
|---|---|---|---|
| `types/fomo.ts` (192 l.) | `web/types/fomo.ts` (192 l.) | **100% Idénticos** | Mover a `@mim/contracts-core/fomo` |
| `lib/vault/vaultEngine.ts` (289 l.) | `web/lib/vault/vaultEngine.ts` (292 l.) | Fork leve con schema V1 | Unificar en `@mim/vault-engine` |
| `lib/rateLimiter.ts` (72 l.) | `web/lib/rateLimiter.ts` (73 l.) | Mismo algoritmo token-bucket | Unificar en `@mim/network-resilience` |
| `lib/intelligence/modExplainer.ts` (433 l.) | `web/lib/intelligence/modExplainer.ts` (428 l.) | Prompts y lógica gemelos | Extraer a `@mim/intelligence-core` |
| `components/fomo/spotlight/SpotlightMarquees.tsx` | `web/components/SpotlightMarquees.tsx` | Versión desktop vs web con estilos divergentes | Extraer hook común de marquee (`useSmoothMarquee`) |
| `services/curseforge/CurseForgeMapper.ts` | `web/app/api/curseforge/discover/CurseForgeMapper.ts` | Mapeo de categorías y loaders duplicado | Extraer a package `@mim/mod-mappers` |
| `app/api/bedrock/discover/route.ts` | `web/app/api/bedrock/discover/route.ts` | Endpoint de catálogo Bedrock duplicado | Compartir handler puro |

---

## 5. Ciclos de Dependencias y Acoplamientos Inversos

### Ciclos Detectados en el Grafo

1. **`lib/scanner.ts` ⇄ `lib/scanner/parsers.ts` / `lib/scanner/scoring.ts`**:
   - `scanner.ts` importa tipos y parsers de subcarpetas, y `parsers.ts` re-importa interfaces de `scanner.ts`.
   - **Solución**: Crear `lib/scanner/types.ts` puro para que tanto el scanner principal como los submódulos dependan sólo de los tipos sin ciclos.

2. **`lib/intelligence/incidentManager.ts` ⇄ `lib/intelligence/incidentStorage.ts` ⇄ `lib/storage/storage-fallback.ts`**:
   - El gestor de incidentes y su almacén se llaman mutuamente para invalidación de caché.
   - **Solución**: Invertir la dependencia pasando un callback o emitter de eventos.

### Acoplamiento Inverso (Engine dependiente de UI)

1. `lib/fomo/fomoDiscoverActions.ts` ➔ `components/fomo/sidebar/fomoSidebarTypes.ts`
2. `lib/fomo/fomoDiscoverPending.ts` ➔ `components/fomo/sidebar/fomoSidebarTypes.ts`
   - **Problema**: Lógica de infraestructura/engine de `lib/fomo/` está importando tipos definidos dentro de `components/`.
   - **Solución**: Mover las definiciones de `fomoSidebarTypes.ts` a `types/fomo.ts` o `@mim/contracts-core`.

---

## 6. Plan de Acción Recomendado

```mermaid
graph TD
    A["1. Quick Wins: Tipos y Acoplamiento Inverso"] --> B["2. Deduplicación de Utilidades (Vault, RateLimit, Mappers)"]
    B --> C["3. Descomposición de God Components (>600 líneas)"]
    C --> D["4. Hito ARCH-5: Unificación Web -> apps/hub"]
```

1. **Fase 1: Quick Wins (Bajo Riesgo)**:
   - Mover `fomoSidebarTypes.ts` a contratos/tipos puros para eliminar el acoplamiento de `lib/` hacia `components/`.
   - Romper el ciclo de `lib/scanner/` extrayendo `lib/scanner/types.ts`.

2. **Fase 2: Unificación de Motores Duplicados**:
   - Consolidar `vaultEngine.ts`, `rateLimiter.ts` y `modExplainer.ts` para que `web/` consuma directamente desde packages puros sin duplicar código.

3. **Fase 3: Descomposición de God Components**:
   - Subalcance UI: `DiscoverTab.tsx`, `FomoVersionOverlay.tsx` y `DraftDetailView.tsx` extraídos a subcomponentes (< 200L orquestadores).
   - Pendiente: `useHomeController.ts` (957 l.) — Phase 2 verificación autenticada y Phase 3 Profile/Community. REC-03 global permanece abierto.
