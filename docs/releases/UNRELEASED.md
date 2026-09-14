# Cambios Pendientes (Unreleased)

<!--
Anota aquí los cambios acumulados de PRs o commits.
Al ejecutar 'npm run release:auto', este contenido se trasladará automáticamente
a 'docs/releases/release-notes-vX.X.X.md' y a 'docs/releases/CHANGELOG.md'.
-->

- **API-02b:** contratos Zod compartidos (`lib/api/contracts.ts`), inventario `npm run lint:api-schemas`, schemas en classify/scan/validate/move-files/crosscheck-batch/auto-categorize.
- **SAGE-01:** semilla holdout `SRV5-FIXTURE-001` + `npm run sage:ingest-log` (sin `origin=synthetic`). Logs de VPS real siguen pendientes.
- **SAGE-04:** latencia p50/p95/max + entorno + warmup/repeats en `eval:sage`.
- **SAGE-05b:** umbrales live MimBot en CI (pass rate / p95 / wall); soft-skip sin secrets.
- **Docs:** onboarding/CONTRIBUTING/overview alineados a `apps/hub` y v11.4.8; índices ADR-008; `release.js` actualiza `mim-core.md` y `project-status.md`.
