# FOMO Cloud — Resumen y documentación

FOMO Cloud es la plataforma social integrada en MIM para compartir y descubrir mods, colecciones y showcases (YouTube). Es una de las features clave de la aplicación y conecta datos locales (`followed_mods`, `followed_authors`) con una capa pública almacenada en Supabase.

Objetivos
- Compartir los `Seguidos` del usuario (mods, autores, canales) de forma pública y navegable.
- Permitir sincronización bidireccional entre IndexedDB (cliente) y Supabase (nube).
- Ofrecer descubrimiento social (rankings, showcases) y aperturas directas a la vista de descubrimiento en FOMO.

Arquitectura y componentes principales
- `CommunityClubs.tsx`: lista y filtros por tipo (Mods, Texturas, Shaders, Datapacks). Maneja carga inicial, revalidación y sincronización manual (`syncMyClubToCloud`).
- `CommunityClubCard.tsx`: tarjeta de usuario que muestra avatar, resumen y previews de autores, canales y proyectos. Ahora soporta expansión en modal para ver el club en detalle y acciones rápidas (abrir en Discover).
- `CommunityUserProfile`, `CommunityModPool`, `CommunityVideos`, `CommunityFavorites`: componentes auxiliares para explorar perfiles, ver mod pools y videos (Showcases).

Integraciones y flujos
- Seguidos → Club público: Los datos locales en IndexedDB (`followed_mods`, `followed_authors`) son agrupados en el `club` del perfil cuando el usuario sincroniza (manual o automática durante sesión activa).
- Showcases (YouTube): extracción de enlaces y metadatos mediante `GET /api/fomo/youtube-showcase` y lógica local en `useFomoDiscover` para enriquecer proyectos desde descripciones.
- Descubrimiento (Discover): `searchProjectInFomo` permite abrir el panel de descubrimiento con búsquedas prellenadas (título, platform, projectId). Las tarjetas de club exponen botones para abrir cada proyecto en Discover.

Comportamiento UI
- Vista general: la lista de clubs se muestra en un grid con tarjetas compactas para facilitar escaneo.
- Ampliar tarjeta: ahora al pulsar "Ver" en la tarjeta (o al abrirla en modo perfil de usuario) se muestra un modal grande y navegable que ocupa más espacio y facilita revisar autores, canales y proyectos.

Consideraciones de diseño
- Theming: Las tarjetas utilizan estilos glassmorph con variantes para `modern`, `oficial` y `vampire` controladas por `data-theme` en el root.
- Accesibilidad: modal soporta cierre por click fuera, botón de "Cerrar" y cierre por tecla `Escape`. El modal ahora se renderiza en un `portal` para evitar solapamientos y clipping con contenedores padres.

API / Backend
- Supabase: `public.profiles` almacena `club` en `profiles.club_data` (JSON). RLS permite lectura pública y escritura autenticada.
- Endpoints relevantes:
  - `GET /api/fomo/community-rankings` — Rankings basados en `favorite_mods`.
  - `GET /api/fomo/youtube-showcase` — Extracción y cache de videos por canal.
  - Nota: La compartición pública de modpacks está deshabilitada en la UI por ahora; sólo se comparten proyectos y autores.

Siguientes mejoras propuestas
- Añadir animaciones de apertura modal (motion) y focus trap para accesibilidad.
- Añadir opción para ampliar inline la tarjeta en layout (no modal) haciendo que ocupe varias columnas del grid.
- Medir telemetría de uso (anónima) para priorizar mejoras UX en FOMO.

Notas finales
FOMO Cloud es una de las features más importantes de MIM: recomiendo validar su sección en la documentación principal (`README.md` y `docs/MIM.md`) para que aparezca en la lista de features destacadas y en el changelog/roadmap como prioridad de UX.
