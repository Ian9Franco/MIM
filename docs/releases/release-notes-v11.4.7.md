# MIM v11.4.7 — Hotfix packaging Desktop (2026-09-13)

**Fecha:** 2026-09-13  
**Estado:** Beta activa

## Cambios verificados

### Hotfix packaging Electron

- Incluye `standalone/trusted-path.js` en el artefacto Windows (antes faltaba y `secret-store.js` / `main.js` fallaban al abrir con `Cannot find module './trusted-path'`).
- `electron-builder` ahora empaqueta `standalone/*.js` completo para no omitir módulos locales nuevos.
- Contrato de release: verifica que los `require('./…')` de `standalone/` queden cubiertos por `build.files`.

## Validación

Las compuertas de calidad pre-release de este hotfix se ejecutan en CI del PR; esta nota no afirma gates omitidos fuera de ese flujo.
