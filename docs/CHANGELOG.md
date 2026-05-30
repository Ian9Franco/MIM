
# MIM — Changelog Maestro de Cambios

> Auditoría completa de cambios, features y mejoras de Minecraft Intelligent Manager.  
> **Versión Actual:** v10.2.2 (FOMO Dependency & API Hardening)  
> **Última actualización:** 2026-05-30

---

## 🚀 Versión 10.2.2 — FOMO Dependency & API Hardening (2026-05-26)

### 📦 Gestión de Dependencias (yt-dlp)
- **Instalador Integrado**: Implementación de un gestor de binarios independiente (`lib/ytdlp/updater.ts`) que actualiza `yt-dlp` directamente desde los releases de GitHub para garantizar la estabilidad de los showcases.
- **Tools UI**: Añadida nueva pestaña de "Herramientas" en el modal de Settings para auditar y actualizar dependencias externas con un solo clic.

### 🛂 Aduana Centralizada (Deduplicación)
- **Módulo Compartido**: Unificación de la lógica de "Aduana" (`lib/fomo/aduana.ts`) para evitar descargas redundantes. Ahora tanto Modrinth como CurseForge comparten el mismo escaneo rápido por hash (SHA1/SHA512).
- **Copias Locales Dinámicas**: Si un mod ya existe en la librería global (`sourceBase`), la Aduana cancela la conexión HTTP y hace una copia en milisegundos hacia la carpeta de descargas del usuario, tolerando cambios dinámicos de rutas.

### 🌐 Paridad de APIs (Slugs en CurseForge)
- **Traductor Inteligente de Slugs**: Modificadas las rutas de CurseForge (`project`, `versions`, `mod-gallery`) para soportar búsquedas por `slug`. Si se provee un texto en lugar de un ID numérico, MIM consulta a escondidas la API de búsqueda de CurseForge, recupera el ID numérico y procesa la petición de manera transparente, logrando paridad total con la API nativa de Modrinth.
- **Gallery Fixes**: Mapeo arreglado del campo `icon_url` en la API de Modrinth para prevenir la falta de íconos en los proyectos de FOMO.

---

## 🚀 Versión 9.6.0 — SAGE Sandboxing, NBT Inline & TWEAK Overrides (2026-05-23)

### 🛡️ SAGE Player Rescue & NBT Editing
- **Sandboxing Estricto de Mundos**: Reestructuración del flujo de selección (2 pasos) para garantizar que los archivos `.dat` de jugadores estén estrictamente contextualizados y vinculados a su mundo origen, evitando colisiones inter-mundos.
- **NBT Inline Editing**: Eliminación de modales superpuestos en favor de una edición directa (`inline`) dentro del árbol de NBT. Los administradores pueden editar valores, tipos y eliminar claves directamente desde los nodos del inventario.
- **Crash Fixes**: Resolución del crash de React (`NaN`) al castear de forma segura los NBT Bytes de los slots del inventario.

### ⚙️ TWEAK Resource Pack Overrides
- **Forzado de Packs Incompatibles**: Al compilar y guardar el orden de los Resource Packs en `options.txt`, MIM ahora registra automáticamente la lista exacta en el array `incompatibleResourcePacks`. Esto bypassa la seguridad de Vanilla y previene que Minecraft desactive texturas por formato antiguo.
- **Layout y Drag & Drop**: Renovación de la vista de Packs Disponibles (Librería Global) a un grid de 2 columnas, y adición de lógica de "arrastrar hacia fuera" (Drag to Deactivate) desde la vista modal ampliada.

### 🎨 UI & Rendering
- **3D Profile Canvas (Skinview3d)**: Reescalado y optimización del render 3D del perfil del usuario en el `LayoutHeader` con desbordamiento (`overflow`) controlado, logrando un avatar más inmersivo sin expandir las dimensiones verticales de la barra superior.
- **Corrección Minotar API**: Ajuste del endpoint de extracción de skins (de `/skins/` a `/skin/`) para prevenir fallos críticos y cuelgues del motor WebGL.

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
- **Drafts Colaborativos (Supabase Realtime)**: Sistema de creación de modpacks colaborativo que permite a múltiples usuarios compartir, proponer y votar modificaciones de manera asíncrona, finalizando en "Snapshots" consolidables.

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
