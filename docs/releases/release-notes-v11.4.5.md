# MIM v11.4.5 — Blindaje de API y Aislamiento de Eliminación de Mods (PR #44 y PR #45)

**Fecha:** 2026-09-06  
**Estado:** Beta activa

## Cambios verificados

### 🛡️ Blindaje de API y Aislamiento de Eliminación de Mods (PR #44 y PR #45)
- **Nuevo endpoint seguro `POST /api/minecraft/delete`**: Aislado con `withApiGuard` (113/113 rutas cubiertas al 100%) y validación estricta de contención de rutas para mods, resourcepacks, shaderpacks y datapacks dentro de `.minecraft/`.
- **Restricción de `/api/delete`**: Confinado estrictamente a la carpeta de descargas del usuario, bloqueando cualquier intento de path traversal o borrado no autorizado.
- **Migración de UI**: Se migró `InstalledModsSection.tsx` para operar de forma segura contra el nuevo endpoint sin romper la gestión de proyectos.
- **Integración PR #45**: Sincronización documental de arquitectura y dependencias.

### 🌟 Adaptación de MIMHub "web enhanced 1.0" a FOMO Desktop
- **Rankings Comunitarios con Podio Top 3**: Selector de períodos (`7d`, `30d`, `all`) y métricas (`shares`, `saves`), con podio visual exclusivo (#1 Oro con corona y resplandor, #2 Plata, #3 Bronce) adaptado a monitores widescreen.
- **Capa Social y Reacciones**: Botón interactivo `CommunityReactionButton` con feedback optimista y persistencia en Supabase (`community_reactions`), además de sistema de seguir/dejar de seguir perfiles de creadores en `CommunityUserProfile`.
- **Hero "Continuar trabajando" en Drafts**: Tarjeta panorámica en el gestor de borradores para retomar la edición del draft activo más reciente en 1 clic.
- **Profundidad Visual y Ambient Glow**: Resplandor ambiental blurreado en banners (`.mim-details-ambient-image`), badges comunitarios con mención del creador (`@usuario`), y elevación táctil 3D (`.mim-control-3d`).
- **Filtros Avanzados y Lotes en Colecciones**: Buscador en tiempo real por nombre/descripción, filtros rápidos por versión y modloader, y acción masiva "Añadir a Draft" para importar mods compatibles de una sola vez.

## Validación

Todas las compuertas de calidad pre-release fueron ejecutadas y verificadas satisfactoriamente (API Guard 100%, Architecture Boundaries, Test Suites & Benchmarks).
