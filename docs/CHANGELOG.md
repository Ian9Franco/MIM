# MIM — Changelog Maestro de Cambios

> Auditoría completa de cambios, features y mejoras de Minecraft Intelligent Manager.  
> **Versión Actual:** v9.3.0 (Arquitectura Modular & Premium UI)  
> **Última actualización:** 2026-05-23

---

## 🚀 Versión 9.3.0 — Arquitectura Modular & FOMO Cloud Premium UX (2026-05-21)

### 🏛️ Reorganización de Directorios (Modularización Completa)
- **Frontend Categorizado**: Agrupación de todos los componentes en `components/fomo/` en subcarpetas cohesivas por dominio funcional:
  - `community/` — perfiles, clubs, favoritos y pool comunitario online.
  - `discover/` — buscador de proyectos y tarjetas visuales unificadas.
  - `showcase/` — reproductor flotante PiP y tarjetas de video.
  - `collections/` — importador de colecciones de Modrinth.
  - `followed/` — listados de autores y creadores seguidos.
  - `spotlight/` — destacados y marquesinas de novedades en caliente.
  - `sidebar/` — contenedor de barra lateral y navegación.
  - `core/` — skeletons, layouts comunes y CSS global de FOMO.
- **Core Lib Modularizado**: Segmentación de los módulos lógicos sueltos en `lib/` en carpetas especializadas de control:
  - `lib/fomo/` — lógica de perfil, clubs, normalización de banners y navegaciones.
  - `lib/modding/` — escáner técnico profundo, builder, validador y cola de descargas.
  - `lib/storage/` — motores de persistencia asíncronos y IndexedDB.
  - `lib/events/` — Event Bus centralizado y depurador interactivo.
  - `lib/intelligence/` — motor SAGE, incidente core y correlation engine.
  - `lib/security/` — escaneo de bytecode local y datos Whitelist.
  - `lib/core/` — tipos transversales, constantes y supabaseClient.

### 🎨 FOMO Cloud — Rediseño Premium e Interactivo
- **Liquid Glass sub-navigation**: Implementación de una barra de navegación interna con píldoras de desplazamiento fluido y escala elástica al alternar entre tabs (Pool ➔ Showcases ➔ Clubs).
- **Immersive Header Background**: Desenfoques masivos de cristal (`backdrop-blur-3xl`) acompañados por gradientes radiales interactivos calculados según el color de perfil activo del usuario.
- **Upgraded Card Layouts**: Elevación tridimensional activa en el eje Z al hacer hover sobre las tarjetas de la comunidad, con sombras internas profundas y bordes semi-transparentes de vidrio.

### 📺 Showcases — Estrategia y Resiliencia en Video
- **Showcases como Canal de Descubrimiento**: Filosofía de diseño que reposiciona la reproducción de video como una característica secundaria de conveniencia, evitando catalogar a MIM como un "ad-free YouTube alternative".
- **Graceful Fallbacks**: Inclusión de botones directos de acción **"Abrir en YouTube"** en las tarjetas de showcases para garantizar que la app siga siendo 100% útil si la API de extracción local de `yt-dlp` sufre bloqueos externos.

### 🛠️ Corrección de Imports & Turbopack Resolvers
- **UI Primitives Fix**: Corrección definitiva del error `Module not found: Can't resolve '../ui/primitives'` re-mapeando imports relativos a la ruta absoluta unificada `@/components/ui/primitives`.
- **Database Import Fix**: Resolución del error de carga en `lib/storage/indexeddb.ts` re-enrutando las dependencias de la base de datos local hacia `@/lib/db/...`.

---

## 🚀 Versión 9.2.0 — Asynchronous Storage Architecture (2026-05-20)

### Optimización de Persistencia
- **Migración a IndexedDB**: Reemplazo completo de persistencia síncrona en `localStorage` por la base de datos IndexedDB (`mimDB`) para datos pesados de FOMO.
- **Auto-Migration**: Migración fluida y en segundo plano de datos antiguos hacia IndexedDB con limpieza automática.
- **Showcase Native Player**: Reproductor flotante PiP con barra de progreso de triple capa y volumen analógico.
- **Thumbnail Auto-Healing**: Secuencia de recuperación para corregir imágenes rotas de YouTube en videos.

---

## 🚀 Versión 9.1.2 — FOMO Cloud — UX & Plataforma (2026-05-21)

### Ajustes de Comunidad
- **Modal de Detalle de Clubs**: Renderizado vía portal para evitar problemas de solapamiento. Cierre por tecla `Escape` y bloqueo de scroll de fondo.
- **Pestaña Modpacks**: Retirada temporal de la UI pública para centrar la experiencia en compartir mods y autores.

---

## 🚀 Versión 9.0.0 — FOMO Cloud Online y Social Discovery (2026-05-20)

### Capa Social
- **Autenticación Supabase**: Conexión con Supabase para perfiles comunitarios públicos (`profiles.club_data`).
- **Rankings**: Endpoint `/api/fomo/community-rankings` para ordenar mods preferidos por la comunidad.

---

## 🚀 Beta 5.9 — Architecture & Code Consolidation (2026-05-14)

### Consolidación
- **Bytecode Conflict Engine**: Análisis de colisiones de Mixin y access transformers previos a la ejecución.
- **Modularización de Page.tsx**: Extracción de componentes DOM masivos a portales.

---

*Minecraft Intelligent Manager — Hecho con ⚡ para la comunidad.*
