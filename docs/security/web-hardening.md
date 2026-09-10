# FOMO Web hardening notes

Esta nota resume las reglas prácticas para que el web app pueda seguir creciendo sin que cada feature toque demasiadas piezas.

## Arquitectura

- Mantener `useHomeController` como orquestador temporal, pero mover lógica pura a `web/lib`.
- Todo helper reutilizable debe vivir fuera de componentes grandes:
  - `web/lib/dependencies.ts`: tipo y orden de dependencias.
  - `web/lib/projectEnvironment.ts`: interpretación cliente/servidor.
  - `web/lib/projectTypes.ts`: tipo de contenido, lado de instalación y loader.
  - `web/lib/shareMeta.ts`: metadata de compartidos, pinned y fallbacks de Supabase.
- `ModDetailsSheet` debe quedar cada vez más cerca de UI pura. Las próximas extracciones recomendadas son:
  - `VersionFilters`
  - `DependencyGroups`
  - `EnvironmentSummary`
  - `DescriptionPanel`
  - `ModDetailsActions`

## Supabase

- Producción debe definir siempre:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- El fallback hardcodeado solo se permite en desarrollo local.
- Toda migración que toque una tabla usada por comunidad debe revisar esta lista:
  - columna o constraint;
  - índice si se ordena/filtra;
  - RLS para `SELECT`, `INSERT`, `UPDATE`, `DELETE`;
  - grants si aplica;
  - compatibilidad con filas viejas.

## SQL

- Preferir migraciones numeradas para cambios nuevos, por ejemplo:
  - `20260711_add_favorite_mods_pinned.sql`
  - `20260711_allow_youtube_favorite_platform.sql`
- Mantener `00_mim_master_schema.sql` como snapshot de referencia, no como la unica fuente operativa.

## HTML externo

- Todo HTML que llegue de Modrinth, CurseForge o traducciones debe pasar por `sanitizeHtml`.
- Evitar sanitizadores duplicados dentro de componentes.
- No permitir `javascript:` ni atributos `on*` en contenido externo.

## Pruebas criticas recomendadas

Automatizar primero estos flujos con Playwright o tests de integración:

1. Abrir detalles, cambiar de tab, cerrar y verificar que la pagina sigue clickeable.
2. Marcar/desmarcar pin en compartidos y confirmar que persiste tras refresh.
3. Compartir YouTube sin mostrar confirmación y sin romper por `favorite_mods_platform_check`.
4. Cargar dependencias obligatorias, opcionales e incompatibles desde mocks de Modrinth y CurseForge.
5. Filtrar versiones por version de Minecraft y modloader al mismo tiempo.

## Performance

- Evitar guardar listas grandes sin TTL en `localStorage`.
- Pausar animaciones o carruseles fuera de pantalla.
- Usar `AbortController` para busquedas y detalles si el usuario cambia rapido de item.
- Considerar IndexedDB para caches grandes de discover/colecciones.
