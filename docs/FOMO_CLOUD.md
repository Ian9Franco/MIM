# FOMO Cloud — Documentación Técnica

> **Versión:** 9.3.0 | **Última actualización:** 2026-05-21

---

## ¿Qué es FOMO Cloud?

FOMO Cloud es la plataforma social y de descubrimiento integrada en MIM. Conecta el flujo local de gestión de mods con una capa pública en Supabase para permitir descubrimiento social, showcases de creadores y compartición de contenido.

**El diferenciador real de FOMO no es el reproductor de video — es el ecosistema integrado:**
- Descubrir mods a través de creadores
- Ver showcases mientras se navega la librería
- Extraer mods automáticamente de descripciones de video
- Instalar contenido directamente desde los videos
- Mantener todo dentro de un solo workflow

---

## Filosofía de Diseño

### Showcases: Feature secundaria, no identidad core

El reproductor de video integrado es una **conveniencia**, no la identidad de la aplicación. MIM nunca se presenta como:
- "YouTube sin anuncios"
- "Alternativa a YouTube"
- "Ver YouTube sin ads"

El foco siempre es:
- Descubrimiento de mods
- Integración con showcases de creadores
- Contenido impulsado por creadores
- Navegación multimedia
- Workflows de instalación de mods

### Resiliencia ante fallas de yt-dlp

`yt-dlp` puede dejar de funcionar en cualquier momento por cambios de YouTube. La app debe:
- **Fallar graciosamente**: Mostrar el botón "Abrir en YouTube" cuando el reproductor falla
- **Mantenerse funcional**: Todas las otras features de FOMO funcionan independientemente del reproductor
- **Separar la lógica**: El sistema de reproducción está en `components/fomo/showcase/` y es completamente independiente del resto

---

## Arquitectura

### Componentes (organizados en subfolders)

```
components/fomo/
├── community/
│   ├── CommunityPanel.tsx          — Panel principal de FOMO Cloud
│   ├── CommunityModPool.tsx        — Pool de mods compartidos
│   ├── CommunityClubs.tsx          — Lista y filtros de clubs
│   ├── CommunityClubCard.tsx       — Tarjeta de usuario expandible
│   ├── CommunityUserProfile.tsx    — Vista de perfil de usuario
│   ├── CommunityVideos.tsx         — Videos compartidos por la comunidad
│   ├── CommunityModpacks.tsx       — Modpacks comunitarios
│   ├── CommunityEditProfileModal.tsx — Modal de edición de perfil
│   ├── CommunityDeleteButton.tsx   — Borrado de contenido propio
│   ├── CommunityFavorites.tsx      — Favoritos del usuario
│   ├── CommunityUserAvatar.tsx     — Avatar con color y fallback
│   └── communityActions.ts         — Acciones CRUD de comunidad
│
├── showcase/
│   ├── FomoYoutubeShowcase.tsx     — Vista principal de showcases
│   ├── FomoFloatingPlayer.tsx      — Reproductor flotante PiP
│   └── ShowcaseVideoCard.tsx       — Tarjeta de video individual
```

### Servicios backend

```
lib/fomo/
├── clubService.ts              — Sync con Supabase (club data)
├── clubTypes.ts                — Tipos del sistema de clubs
├── communityShareMeta.ts       — Parsing de metadata compartida
├── communitySharingAlerts.ts   — Alertas de compartición
├── fomoDiscoverActions.ts      — Acciones de descubrimiento
├── fomoDiscoverPending.ts      — Cola de acciones pendientes
├── fomoLayout.ts               — Constantes de layout
├── fomoModBanner.ts            — Banners de mods
└── fomoProjectNavigation.ts    — Navegación entre proyectos
```

---

## Data Model (Supabase)

### `public.profiles`
```json
{
  "id": "uuid",
  "username": "string",
  "avatar_url": "string | null",
  "color": "#hexcolor",
  "club_data": {
    "mods": [{ "projectId", "platform", "title", "iconUrl", "gameVersion", "modloader", "projectType" }],
    "authors": [{ "name" }],
    "youtubeChannels": ["url"]
  }
}
```

### `public.favorite_mods`
Conteos para rankings públicos de mods compartidos por la comunidad.

### `public.showcase_videos`
Cache de extracción de YouTube por canal (compartidos por usuarios).

---

## Flujo de Sincronización

```
Usuario pulsa "Publicar mi club"
        │
        ▼
lib/fomo/clubService.syncMyClubToCloud()
  → Construye el JSON desde IndexedDB (followed_mods, followed_authors)
  → Upsert en Supabase profiles.club_data
  → RLS valida que solo el propietario puede modificar su registro
        │
        ▼
Otros usuarios ven el club actualizado en CommunityClubs
```

---

## Endpoints Relevantes

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/fomo/community-rankings` | Rankings y top mods por conteo en `favorite_mods` |
| `GET /api/fomo/youtube-showcase` | Extracción de videos via `yt-dlp` (con cache y fallbacks) |
| `POST /api/fomo/modpack-download` | Orquestador de descargas internas (no UI pública) |
| `GET /api/fomo/youtube-usage` | Estadísticas de uso de canales (top 4 accesos rápidos) |

### Sobre el endpoint de YouTube Showcase

Este endpoint usa `yt-dlp` para extraer metadata de videos. Es el componente más frágil del sistema porque depende de una herramienta de terceros que reacciona a cambios de YouTube.

**Estrategia de resiliencia:**
- Si el endpoint falla → mostrar botón "Abrir en YouTube" en cada tarjeta
- Si hay error 500 → el resto de FOMO sigue funcionando
- El reproductor flotante puede ser deshabilitado sin afectar el discovery
- Actualizar `yt-dlp` a la última versión suele resolver la mayoría de los problemas

---

## Comportamiento UI

### Panel de FOMO Cloud (`CommunityPanel`)

**Header inmersivo**: Gradientes radiales basados en el color de perfil del usuario, glassmorphismo con `backdrop-blur-3xl`, glow animado en el avatar.

**Tabs con liquid glass pill**: Animación de sliding suave, micro-animations en iconos al activarse.

**Tres secciones principales:**
- **Pool** — Mods compartidos por la comunidad, agrupados por usuario
- **Showcases** — Videos compartidos por usuarios registrados
- **Clubs** — Clubs públicos con mods, autores y canales seguidos

### Tarjetas de Club (`CommunityClubCard`)

- Expansión modal con renderizado en portal
- Cierre con `Escape`, bloqueo de scroll de fondo
- Botones de acción rápida para abrir proyectos en Discover

---

## Seguridad & RLS

- `profiles`: Lectura pública, escritura solo por `auth.uid()` propietario
- `favorite_mods`: Lectura pública, escritura autenticada
- `showcase_videos`: Lectura pública, escritura autenticada
- Storage (`modpack-configs`): Subida solo por propietario con path `uploads/{profile_id}/*`

---

## Próximas Mejoras Propuestas

- [ ] **Focus trap y ARIA roles completos** en modal de club
- [ ] **Inline expansion** (sin modal) para tarjetas en el grid
- [ ] **Notificaciones de nuevos videos** de creadores seguidos
- [ ] **Updater integrado para yt-dlp** para facilitar actualizaciones cuando YouTube rompe la extracción
- [ ] **Telemetría anónima** de uso para priorizar mejoras UX

---

*FOMO Cloud — El ecosistema integrado es el diferenciador real.*
