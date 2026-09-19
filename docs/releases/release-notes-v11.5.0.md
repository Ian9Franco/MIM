# MIM v11.5.0 — Release v11.5.0 — Sistemas y Criterio Técnico MIM

**Fecha:** 2026-09-19  
**Estado:** Beta activa

## Cambios verificados

- **SRV-3 / SRV-7 / SRV-6b:** recovery UI + rollback API (deploy bloqueado con snapshots pendientes); apply de mods cliente desde SFTP/Modrinth; probe de proceso vía `session.lock`.
- **API-02b:** contratos Zod de mutaciones restantes y ajustes de typecheck (`z.record`, `BuildTarget`, audit manifests).
- **BOT-RPM:** cola secuencial Gemini con ventana de 15 req/min.
- **Desktop updater:** el banner aparece si `getVersion` ya conoce una latest distinta (no se pierde al hidratar).

## Validación

Todas las compuertas de calidad pre-release fueron ejecutadas y verificadas satisfactoriamente (API Guard 100%, Architecture Boundaries, Test Suites & Benchmarks).
