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
│   ├── CommunityDrafts.tsx         — Vista principal de FOMO Drafts
│   ├── CommunityCreateDraftModal.tsx — Modal para crear nuevos Drafts
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

### Modelos de FOMO Drafts
- **`drafts`**: Proyectos colaborativos (id, owner_id, name, minecraft_version, loader).
- **`draft_members`**: Usuarios invitados con acceso a edición.
- **`draft_items`**: Mods/texturas asociadas al draft.
- **`draft_snapshots`**: Versiones congeladas del manifest.
- **`draft_activity`**: Registro de acciones (Activity Feed).

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

**Cuatro secciones principales:**
- **Pool** — Mods compartidos por la comunidad, agrupados por usuario
- **Drafts** — Construcción colaborativa de modpacks en la nube
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
## 1. Objetivo del Sistema
### ¿Qué es FOMO Drafts?

FOMO Drafts es una capa colaborativa integrada en FOMO Cloud que permite a múltiples usuarios construir ideas de modpacks juntos antes de descargarlos o compilarlos localmente.

El sistema NO reemplaza la arquitectura principal de MIM.

FOMO Drafts actúa únicamente como:
**Collaborative Manifest Layer**

## 2. Filosofía Arquitectónica
### Regla principal
> **Drafts NEVER replace MIM Core**

Toda la inteligencia técnica continúa viviendo dentro de MIM local:
- Scanner
- Builder
- Validator
- Side Resolver
- Library
- Classification
- SAGE
- TWEAK

Drafts solo coordina:
- intención
- descubrimiento
- colaboración
- snapshots
- manifests
## 3. Arquitectura Conceptual

```
FOMO Cloud
    ↓
FOMO Drafts
    ↓
Draft Snapshot
    ↓
Download Queue
    ↓
Pending Files
    ↓
enhanced-mod-scanner
    ↓
Auto Classification
    ↓
Library
    ↓
Builder
```

## 4. Principio Fundamental
> **Drafts NO instala mods**

Drafts únicamente genera **Download Intentions**. Toda instalación real ocurre posteriormente dentro del pipeline original de MIM.

## 5. Separación de Responsabilidades

| Sistema | Responsabilidad |
|---------|----------------|
| FOMO Drafts | Coordinación social |
| MIM Core | Inteligencia técnica |
| Scanner | Clasificación real |
| Builder | Separación client/server |
| Library | Organización persistente |
| SafeDownloader | Descargas |
| SAGE | Diagnóstico |
## 6. Qué Guarda Drafts
Drafts SOLO almacena:
```json
{
  "projectId": "AANobbMI",
  "source": "modrinth",
  "versionId": "abc123"
}
```

## 7. Qué NO Guarda Drafts
Drafts NO conoce:
- `.minecraft`
- `filesystem`
- `builder folders`
- `.client`
- `.server`
- `runtime installs`
- `shaders folder`
- `resourcepacks folder`
- `datapacks folder`
- `overrides`
- `launch instances`

Toda esa lógica permanece exclusivamente dentro de MIM Core.

## 8. Deferred Intelligence System
### Filosofía
> **Drafts collect intentions, MIM materializes structure.**
## 9. Flujo Completo
### 9.1 Crear Draft [COMPLETED]
Usuario crea:
- Name
- Minecraft Version
- Loader
- Visibility

### 9.2 Agregar Mods [COMPLETED]
Los usuarios agregan mods desde:
- Discover
- Community Pool
- Showcases
- Shared links

### 9.3 Crear Snapshot [COMPLETED]
Drafts generan snapshots congelados:
- v12 — Stable SMP
- v13 — Shader Expansion
- v14 — Experimental Worldgen

### 9.4 Install Snapshot
MIM ejecuta:
1. Resolve
2. Validate
3. Download Plan
4. Scan
5. Classify
6. Build
## 10. Arquitectura Supabase [COMPLETED]

### 10.1 drafts
```sql
create table drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  minecraft_version text not null,
  loader text not null,
  visibility text default 'private',
  cover_image text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 10.2 draft_members
```sql
create table draft_members (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references drafts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'editor',
  created_at timestamptz default now(),
  unique(draft_id, user_id)
);
```

### 10.3 draft_items
```sql
create table draft_items (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references drafts(id) on delete cascade,
  source text not null,
  project_id text not null,
  version_id text,
  mod_name text,
  added_by uuid references auth.users(id),
  category text,
  created_at timestamptz default now()
);
```

### 10.4 draft_snapshots
```sql
create table draft_snapshots (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references drafts(id) on delete cascade,
  version_number integer not null,
  manifest jsonb not null,
  fingerprint text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

### 10.5 draft_activity
```sql
create table draft_activity (
  id uuid primary key default gen_random_uuid(),

  draft_id uuid references drafts(id) on delete cascade,

  user_id uuid references auth.users(id),

  action text not null,

  payload jsonb,

  created_at timestamptz default now()
);
## 11. RLS Policies [COMPLETED]
### drafts
```sql
create policy "public drafts readable"
on drafts
for select
using (
  visibility = 'public'
  OR owner_id = auth.uid()
);

create policy "owners manage drafts"
on drafts
for all
using (
  owner_id = auth.uid()
);
```

### draft_members
```sql
create policy "members readable"
on draft_members
for select
using (
  exists (
    select 1
    from drafts
    where drafts.id = draft_members.draft_id
    and (
      drafts.owner_id = auth.uid()
      OR draft_members.user_id = auth.uid()
    )
  )
);
```

### draft_items
```sql
create policy "members edit items"
on draft_items
for all
using (
  exists (
    select 1
    from draft_members
    where draft_members.draft_id = draft_items.draft_id
    and draft_members.user_id = auth.uid()
  )
);
```
## 12. Manifest Structure
```json
{
  "minecraft": "1.20.1",
  "loader": "fabric",
  "mods": [
    {
      "source": "modrinth",
      "projectId": "AANobbMI",
      "versionId": "abc123"
    }
  ]
}
```

## 13. Download Architecture
> **Drafts NEVER download directly**

Primero:
1. Resolve Pack

Luego:
2. Dependency Validation
3. Conflict Detection
4. Download Plan Generation

Y finalmente:
5. SafeDownloader

## 14. SafeDownloader v2
### Objetivo
Centralizar toda descarga para:
- evitar rate limits
- evitar spam API
- manejar retries
- controlar concurrencia

## 15. DraftDownloadBroker
```typescript
class DraftDownloadBroker {
  queue = []
  concurrency = 2
}
```

## 16. Concurrency Rules
- **Modrinth:** 4 concurrent requests
- **CurseForge:** 1 concurrent request
- adaptive cooldown enabled
## 17. Retry Strategy
- `429` → exponential backoff
- `500` → retry
- `404` → fallback search

## 18. Cache Strategy
**IndexedDB Cache**

Cachear:
- metadata
- icons
- descriptions
- versions

TTL recomendado:
- 24h - 72h

## 19. Draft Categories
> [!IMPORTANT]
> Las categorías de Drafts NO son categorías técnicas. Son únicamente **social/discovery tags**.

## 20. Categorías Permitidas
Ejemplos:
- Optimization
- Adventure
- Magic
- Vanilla+
- Shaders
- RPG
- Horror
- Worldgen
- Utility

## 21. Qué Drafts NO Clasifica
Drafts NO determina:
- client/server
- resourcepacks
- shaderpacks
- datapacks
- dependencies
- overrides
- builder buckets

Toda clasificación real ocurre posteriormente mediante `enhanced-mod-scanner`.

## 22. Deferred Classification Pipeline
```
Draft Snapshot
    ↓
Download
    ↓
Pending Files
    ↓
Scanner
    ↓
Classification
    ↓
Library
```

## 23. Fingerprint Engine [COMPLETED]
### Objetivo
Detectar:
- drift
- corrupción
- divergencias
- snapshots incompatibles

## 24. Fingerprint Formula
```javascript
sha256(
 loader +
 minecraft_version +
 sorted(mods)
)
```

## 25. UI Architecture [COMPLETED]
### Tabs
- Overview
- Mods
- Activity
- Snapshots
- Members
- Validation

### UX Philosophy
Drafts debe sentirse como **Collaborative Playlist Building**. NO como Enterprise Workspace Software.

## 26. Features Deliberadamente Excluidas
NO incluir inicialmente:
- chat
- live cursors
- zip uploads
- cloud installs
- realtime hardcore sync
- cloud builders
## 27. Sync Strategy
Usar **polling every 10-15 seconds**. NO realtime agresivo.

## 28. Cost Strategy
El diseño está optimizado para:
- Supabase Free Tier
- mínimo bandwidth
- mínimo storage
- mínimo acoplamiento

Porque:
- solo guarda manifests
- metadata mínima
- snapshots JSONB

## 29. Integración con MIM Core
FOMO Drafts reutiliza completamente:
- SafeDownloader
- enhanced-mod-scanner
- Builder
- SAGE
- Event Bus
- IndexedDB
- Library
- Validation Systems

NO duplica lógica técnica.

## 30. Filosofía Final
> **Drafts coordinate ideas. MIM builds reality.**

### Resultado
FOMO Drafts expande MIM desde:
**Local Intelligent Mod Manager**

hacia:
**Collaborative Minecraft Ecosystem Pipeline**

Sin romper la arquitectura original del proyecto.
