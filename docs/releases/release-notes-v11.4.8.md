# MIM v11.4.8 — Infraestructura de release

**Fecha:** 2026-09-13  
**Estado:** Beta activa

## Cambios verificados

## Infraestructura de release

- Pipeline de firma Authenticode Windows listo (secrets `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD`); sin secrets el build sigue unsigned. Guía: `docs/guides/windows-code-signing.md`.

## Validación

Todas las compuertas de calidad pre-release fueron ejecutadas y verificadas satisfactoriamente (API Guard 100%, Architecture Boundaries, Test Suites & Benchmarks).
