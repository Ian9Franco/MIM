# MIM v11.4.4 — Sistemas y Criterio Técnico MIM

**Fecha:** 2026-09-06  
**Estado:** Beta activa

## Cambios verificados

### MIMweb — transiciones de superficies coleccionables

- Se agregó `CollectibleTransition` como contexto compartido de transición para coordinar tarjetas coleccionables y su vista de detalle mediante `LayoutGroup` de Framer Motion.
- `CollectibleSurface` ahora puede compartir identidad visual entre tarjeta y detalle usando `layoutId`, y respeta `prefers-reduced-motion` mediante `useReducedMotion`.
- `ModDetailsSheet` consume el contexto de transición para vincular la superficie seleccionada con el detalle correspondiente sin cambiar el contrato de datos del proyecto.
- Las marquesinas editoriales se pausan mientras una superficie coleccionable está abierta, evitando movimiento de fondo durante la transición.
- `BottomNav` incorpora tratamiento de movimiento reducido para no forzar animaciones a usuarios que lo hayan solicitado en el sistema.

### Documentación y versionado

- `package.json`, `PROJECT_STATUS.md`, `ROADMAP.md`, `docs/architecture/MIM.md` y el changelog maestro quedaron sincronizados a v11.4.4.
- El enlace de `PROJECT_STATUS.md` usado por el changelog continúa apuntando a la ruta canónica `docs/planning/PROJECT_STATUS.md`.

## Validación

El `main` posterior al release y al merge documental siguiente completó correctamente Lint & Static Type Check, Systems Test Suite & Benchmark Evaluation, Dynamic Application Security Testing (DAST) Baseline y Next.js Production Build Verification.

## Alcance

Esta nota documenta únicamente cambios observables y verificables presentes en el commit de release v11.4.4. No declara nuevas garantías de madurez, seguridad ni compatibilidad fuera de las ya respaldadas por el código y CI actuales.
