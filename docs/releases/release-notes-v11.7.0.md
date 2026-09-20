# MIM v11.7.0 — Sinceramiento_01: índice local único

**Fecha:** 2026-09-20  
**Estado:** Beta activa

## Cambios verificados

### Sinceramiento_01: índice local único

- **Índice canónico:** `mimIndexPath` configurable; caches, tweak e historial dejan de escribirse en `cwd`, `lib/.mim-index` y `SOURCE_BASE/.mim-index`. Spec: [mim-index.md](../architecture/mim-index.md).
- **Detector de update:** al primer arranque se migran archivos útiles y se borran raíces zombie. Marker en `.migrations/sinceramiento_01.json`.
- **Sin mkdir ansioso:** leer settings ya no crea `staging/` ni `player-rescue/`.
- **FOMO registry** unificado en `_projects/<nombre>/.fomo-registry.json`.
- **SAGE / VirusTotal / semantic cache** escriben en `mimIndexPath/cache/`.

## Validación

Todas las compuertas de calidad pre-release fueron ejecutadas y verificadas satisfactoriamente (API Guard 100%, Architecture Boundaries, Test Suites & Benchmarks).
