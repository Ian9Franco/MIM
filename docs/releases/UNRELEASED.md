# Cambios Pendientes (Unreleased)

<!--
Anota aquí los cambios acumulados de PRs o commits.
Al ejecutar 'npm run release:auto', este contenido se trasladará automáticamente
a 'docs/releases/release-notes-vX.X.X.md' y a 'docs/releases/CHANGELOG.md'.
-->

- **SRV-3 / SRV-7 / SRV-6b:** recovery UI + rollback API (deploy bloqueado con snapshots pendientes); apply de mods cliente desde SFTP/Modrinth; probe de proceso vía `session.lock`.
- **API-02b:** contratos Zod de mutaciones restantes y ajustes de typecheck (`z.record`, `BuildTarget`, audit manifests).
- **BOT-RPM:** cola secuencial Gemini con ventana de 15 req/min.
- **Desktop updater:** el banner aparece si `getVersion` ya conoce una latest distinta (no se pierde al hidratar).
