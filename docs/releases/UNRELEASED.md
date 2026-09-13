# Cambios Pendientes (Unreleased)

<!--
Anota aquí los cambios acumulados de PRs o commits.
Al ejecutar 'npm run release:auto', este contenido se trasladará automáticamente
a 'docs/releases/release-notes-vX.X.X.md' y a 'docs/releases/CHANGELOG.md'.
-->

## Infraestructura de release

- Pipeline de firma Authenticode Windows listo (secrets `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD`); sin secrets el build sigue unsigned. Guía: `docs/guides/windows-code-signing.md`.
