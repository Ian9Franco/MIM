# MIM v11.4.5 — Contención de borrado y MIMHub Enhanced

**Fecha:** 2026-09-06  
**Estado:** Beta activa

## Cambios verificados

### 🛡️ Contención de borrado
- **PR #44 — `POST /api/delete`**: el endpoint quedó confinado a archivos directos dentro de la carpeta Downloads configurada y pre-valida todo el lote antes del primer borrado.
- **Commit `90b5ad1` — `POST /api/minecraft/delete`**: se agregó un endpoint separado, protegido por `withApiGuard`, para eliminar contenido únicamente dentro de categorías permitidas de la instalación de Minecraft configurada (`mods`, `resourcepacks`, `shaderpacks`, `datapacks` y datapacks de mundos).
- **Migración de UI**: `InstalledModsSection.tsx` pasó a usar `/api/minecraft/delete`, separando el descarte de Downloads del borrado de contenido instalado.
- **PR #45 — verificación/documentación de Discover**: verificó la Phase 1 del refactor de `useHomeController.ts` y alineó `docs/whosnext.md` y `docs/planning/ROADMAP.md`; no introdujo el endpoint de borrado de Minecraft.

### 🌟 Adaptación de MIMHub "web enhanced 1.0" a FOMO Desktop
- **Rankings Comunitarios con Podio Top 3**: selector de períodos (`7d`, `30d`, `all`) y métricas (`shares`, `saves`), con presentación de los tres primeros puestos.
- **Capa Social y Reacciones**: reacciones persistidas en Supabase mediante `community_reactions` y seguimiento de perfiles mediante `followed_profiles`.
- **Hero "Continuar trabajando" en Drafts**: acceso destacado para retomar el draft activo más reciente.
- **Profundidad Visual y Ambient Glow**: ajustes visuales en superficies de detalle, controles y tarjetas comunitarias.
- **Filtros y acciones de colección**: búsqueda, filtros por versión/modloader y acciones por lote para trabajar con colecciones.

## Validación

La release v11.4.5 fue generada por el flujo automatizado de release, que ejecuta las compuertas de calidad antes de actualizar versión, crear commit y tag. El `main` posterior también completó satisfactoriamente Lint & Static Type Check, Systems Test Suite, DAST y Production Build.
