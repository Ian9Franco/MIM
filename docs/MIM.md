# MIM — Arquitectura y Funcionamiento Completo

> Documentación técnica maestra de Minecraft Intelligent Manager.  
> Arquitectura, flujos de datos, componentes y decisiones de diseño.  
> **Versión:** 11.0.2 | **Última actualización:** 2026-09-04  
> **Estado:** En Desarrollo Activo (Desktop Electron 42 + MIMweb Mobile-First + FOMO Cloud)

---

> [!NOTE]
> **Estatus del Software:**
> El proyecto MIM cuenta con sus módulos clave operativos e integrados. Se encuentra en fase de desarrollo activo, pruebas de estabilidad y refinamiento continuo tanto en la aplicación de escritorio como en la plataforma web complementaria (MIMweb).

---

## 📑 Tabla de Contenidos

1. [Resumen General](#1-resumen-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Estructura de Directorios](#3-estructura-de-directorios)
4. [Flujos de Datos](#4-flujos-de-datos)
5. [Core Engine (lib/)](#5-core-engine-lib)
6. [Arquitectura del Frontend](#6-arquitectura-del-frontend)
7. [Capa de API (Backend)](#7-capa-de-api-backend)
8. [Integraciones Externas](#8-integraciones-externas)
9. [Sistemas de Seguridad y Diagnóstico](#9-sistemas-de-seguridad-y-diagnóstico)
10. [Optimizaciones de Performance](#10-optimizaciones-de-performance)
11. [Decisiones Técnicas Clave](#11-decisiones-técnicas-clave)

---

## 1. Resumen General

**Minecraft Intelligent Manager (MIM)** es un gestor de modpacks de última generación que transforma el caos de la creación de perfiles de juego en un flujo de trabajo de **3 clics**. Combina un escáner inteligente de archivos JAR, integración dual Modrinth/CurseForge, un motor de diagnóstico heurístico de crashes (SAGE) y una plataforma comunitaria integrada (FOMO Cloud) bajo una interfaz inmersiva y premium.

### Modos de Aplicación

MIM soporta tres modos de operación integrados para adaptarse a diferentes perfiles de usuario:

* **Modo MIM (Modpack Maker)**: Enfoque tradicional para creadores de modpacks. Incluye biblioteca categorizada, control estricto de dependencias, gestión de proyectos y generador de compilaciones (Builder).
* **Modo MIMU (User Mode)**: Interfaz simplificada para jugadores. Permite buscar e instalar mods directamente en el directorio global `.minecraft`, con gestor de mundos y visualización de mods activos.
* **FOMO Cloud (Comunidad Online)**: Capa social conectada con Supabase para compartir perfiles, favoritos, clubes de usuarios, e integrarse con showcases de contenido en video de creadores.

---

## 2. Arquitectura del Sistema

MIM sigue una arquitectura desacoplada y orientada a eventos para maximizar la responsividad y modularidad:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                              │
│  ┌───────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │    FOMO Panel     │  │   Library    │  │ SAGE Alerts  │  │   Tweak    │  │
│  │ (Discovery/Cloud) │  │   (Grid)     │  │  (Diagnosis) │  │ (Controls) │  │
│  └───────────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ React 19 + Next.js 16 (Turbopack)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Next)                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│  │ /discover  │ │ /classify  │ │ /security  │ │ /watcher   │ │ /library │  │
│  │ /download  │ │ /build     │ │ /scan      │ │ (SSE)      │ │          │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └──────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ Node.js Runtime
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CORE ENGINE & LIB/ SUBDOMAINS                         │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  lib/modding/    │  │  lib/storage/    │  │  lib/security/   │          │
│  │ • JAR Scanner    │  │ • IndexedDB Cache│  │ • Bytecode Scan  │          │
│  │ • Builder        │  │ • Auto-Migration │  │ • Risk Scoring   │          │
│  │ • Pack Validator │  │ • SWR Engine     │  │ • VT Integrity   │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  lib/events/     │  │  lib/fomo/       │  │lib/intelligence/ │          │
│  │ • MIM Event Bus  │  │ • Cloud Sync     │  │ • SAGE Engine    │          │
│  │ • Correlation    │  │ • Club Service   │  │ • Crash Analyser │          │
│  │ • Batch Queue    │  │ • Banner Resolver│  │ • Player Rescue  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
  │  Modrinth    │          │  CurseForge  │          │  Supabase    │
  │  (Labrinth)  │          │   (Eternal)  │          │ (PostgreSQL) │
  └──────────────┘          └──────────────┘          └──────────────┘
```

---

## 3. Estructura de Directorios

El frontend y el core técnico han sido completamente modularizados en subdominios para facilitar el mantenimiento y la escalabilidad del proyecto:

### 3.1 Estructura de Componentes Frontend (`components/fomo/`)

La interfaz de FOMO se organiza en subcarpetas cohesivas por dominio funcional:
* **`community/`**: Componentes de FOMO Cloud (`CommunityPanel`, `CommunityClubs`, `CommunityModPool`, `CommunityUserProfile`, etc.) para gestionar perfiles, avatares, sincronización y visualización del pool social.
* **`discover/`**: Buscadores de proyectos y tarjetas visuales (`FomoModCard`, `FomoModCardFixed`, `FomoDiscoverContext`) para buscar en Modrinth y CurseForge de forma simultánea.
* **`showcase/`**: Módulos multimedia (`FomoYoutubeShowcase`, `ShowcaseVideoCard`, `FomoFloatingPlayer`) que gestionan la previsualización y reproducción de showcases y la extracción de dependencias.
* **`collections/`**: Integración con colecciones de Modrinth y plantillas prearmadas (`FomoCollections`).
* **`followed/`**: Seguimiento de creadores y mods favoritos (`FomoFollowedAuthors`, `FomoFollowedShowcases`).
* **`spotlight/`**: Marquesinas y destacados en vivo (`FomoSpotlight`, `FomoSpotlightComponents`).
* **`sidebar/`**: Navegación e integraciones de barra lateral (`FomoSidebar`, `FomoSidebarDiscoverBranch`).
* **`core/`**: Elementos de infraestructura común (`FomoVersionOverlay`, `LoginPortal`, skeletons y estilos CSS globales de la sección).

### 3.2 Estructura del Core Engine (`lib/`)

Las bibliotecas del sistema se estructuran en carpetas especializadas de control:
* **`lib/fomo/`**: Lógica social, sincronización comunitaria, mapeo de clubes y normalización de banners (`clubService`, `communitySharingAlerts`, `fomoModBanner`).
* **`lib/modding/`**: Lógica de empaquetado y lectura técnica (`enhanced-mod-scanner`, `builder`, `conflict-engine`, `packValidator`, `downloadQueue`).
* **`lib/storage/`**: Motores de datos asíncronos y caché local (`indexeddb`, `smart-cache`, `storage-migration`).
* **`lib/events/`**: Orquestación reactiva y auditoría en tiempo real (`eventBus`, `eventSchemaRegistry`, `eventDebugger`).
* **`lib/intelligence/`**: Diagnóstico heurístico y reparación (`sageRecoveryEngine`, `incidentManager`, `correlationEngine`).
* **`lib/security/`**: Escaneo local estático y seguridad (`security-scanner`, `security-data`).
* **`lib/core/`**: Tipos transversales, clientes y constantes globales (`types`, `supabaseClient`).

---

## 4. Flujos de Datos

### 4.1 Flujo de Ingesta de Descargas
1. **Aduana (Deduplicación)**: Antes de iniciar una descarga de red (Modrinth/CurseForge), el módulo `aduana.ts` verifica por hash SHA1/SHA512 si el archivo ya existe en la librería local (`sourceBase`). Si existe, se aborta la petición HTTP y se realiza una copia local instantánea a la carpeta `Downloads`.
2. **Detección**: `chokidar` en el backend detecta el nuevo archivo `.jar` en la carpeta `Downloads`.
3. **Escaneo Técnico**: `enhanced-mod-scanner` extrae loaders, dependencias y genera el hash SHA1.
3. **Escaneo de Seguridad**: El archivo pasa por el motor estático local en `lib/security/` y, opcionalmente, consulta VirusTotal por hash SHA256.
4. **Notificación SSE**: Un evento se transmite en tiempo real vía Server-Sent Events (`/api/watcher`) al cliente React.
5. **Visualización**: El mod aparece en la bandeja "Pending Files" listo para ser clasificado con un solo clic o hotkeys (1-9).

### 4.2 Flujo de Sincronización FOMO Cloud
1. **Colección**: La app agrupa los mods y autores seguidos desde IndexedDB (`lib/storage/`).
2. **Serialización**: `clubService.syncMyClubToCloud` empaqueta la información en formato JSONB.
3. **Persistencia**: Se realiza un `upsert` en la tabla `profiles` de Supabase validado mediante políticas RLS (Row Level Security).
4. **Propagación**: El club de usuario se publica en la lista global de FOMO Cloud para que otros usuarios lo importen o descubran sus recomendaciones.

---

## 5. Core Engine (lib/)

### 5.1 Asynchronous Storage System (`lib/storage/`)
MIM migró el almacenamiento pesado de estado y metadatos de CurseForge/Modrinth desde `localStorage` síncrono a **IndexedDB asíncrono** (`indexeddb.ts`).
* **Rendimiento**: Evita bloqueos en el hilo de renderizado al parsear JSONs masivos.
* **Auto-Healing**: El cargador inicial detecta datos remanentes en `localStorage`, los traslada asíncronamente a IndexedDB y limpia la memoria antigua automáticamente.

### 5.2 Compilador Inteligente (`lib/modding/builder.ts`)
Orquesta la generación de empaquetados finales separando los entornos de ejecución:
* **`alluser` (Cliente)**: Incluye mods esenciales + mods del lado cliente (`.local/`) + shaders + resource packs. Exporta un ZIP plano optimizado para CurseForge o Prism Launcher.
* **`allhost` (Servidor)**: Incluye mods esenciales + mods del lado servidor (`.server/`) + datapacks. Prepara una carpeta estructurada lista para subir a un hosting de Minecraft.

---

## 6. Arquitectura del Frontend

### 6.1 Liquid Glass & Immersive Design (FOMO UI)
La interfaz comunitaria de FOMO Cloud se rediseñó con una estética inmersiva de alto impacto visual:
* **Cabecera Inmersiva**: Gradientes de color adaptables basados en la paleta del perfil del usuario, con desenfoques radiales intensos (`backdrop-blur-3xl`).
* **Liquid Glass Tabs**: Píldoras de sub-navegación con animaciones fluidas de desplazamiento y escala elástica al alternar entre Pool, Showcases y Clubs.
* **Elevated Mod Cards**: Sombras profundas internas, bordes semi-transparentes de cristal y elevación en el eje Z al hacer hover para incentivar la interacción.

### 6.2 Virtualización de Biblioteca (`VirtualizedLibrary`)
MIM implementa virtual scrolling en la visualización central de la librería para tolerar catálogos masivos (>700 mods) manteniendo 60fps constantes al renderizar únicamente los elementos visibles en el viewport.

### 6.3 FOMO Cloud (Comunidad Online)
FOMO Cloud es la capa social integrada dentro de MIM. Usa Supabase para unir el discovery local de mods con un ecosistema compartido de perfiles, favoritos, clubs y showcases.

#### 6.3.1 Componentes de FOMO Cloud
* **`components/fomo/community/CommunityPanel.tsx`** — Panel principal de interacción con FOMO Cloud.
* **`CommunityModPool.tsx`** — Pool de mods compartidos por la comunidad.
* **`CommunityClubs.tsx`** — Navegación de clubs públicos.
* **`CommunityClubCard.tsx`** — Tarjeta expandible de club con acciones directas a Discover.
* **`CommunityUserProfile.tsx`** — Vista de perfil público y banner de usuario.
* **`CommunityVideos.tsx`** — Listado de showcases compartidos por usuarios.
* **`CommunityEditProfileModal.tsx`** — Modal de edición de perfil con avatar y banner PNG.
* **`CommunityDrafts.tsx`** — Vista principal de FOMO Drafts para crear proyectos colaborativos asíncronos.

#### 6.3.2 Servicios backend de FOMO
* **`lib/fomo/clubService.ts`** — Sincroniza clubs y listas de seguimiento con Supabase.
* **`lib/fomo/communitySharingAlerts.ts`** — Detecta y notifica contenido compartido.
* **`lib/fomo/fomoDiscoverActions.ts`** — Aplica acciones pendientes cuando Discover se monta o se repara.
* **`lib/fomo/fomoDiscoverPending.ts`** — Cola de acciones de Discover para el modo comunidad.
* **`lib/fomo/fomoModBanner.ts`** — Determina banners de mods y genera fallback visual.
* **`lib/fomo/fomoProjectNavigation.ts`** — Eventos transversales para abrir detalles y buscar autores en FOMO.

#### 6.3.3 Modelo de datos en Supabase
* **`profiles`**: regresa los perfiles de usuarios con campos de estilo y club.
  * `id`, `username`, `avatar_url`, `banner_url`, `color`, `club_data`, `created_at`, `updated_at`
* **`favorite_mods`**: metas que generan rankings públicos y feeds de favoritos.
* **`showcase_videos`**: cachea metadata de videos de creadores extraídos por `yt-dlp`.

#### 6.3.4 Flujo de sincronización
1. El usuario publica su club desde MIM.
2. `clubService.syncMyClubToCloud()` empaqueta mods y autores seguidos desde IndexedDB.
3. Se ejecuta un upsert en `profiles.club_data` en Supabase.
4. Las políticas RLS validan las actualizaciones únicamente por el propietario.
5. Otros usuarios ven el club actualizado en `CommunityClubs`.

#### 6.3.5 Endpoints relevantes de FOMO
* `/api/fomo/community-rankings` — Rankings y top mods de `favorite_mods`.
* `/api/fomo/youtube-showcase` — Extracción de videos con `yt-dlp` y fallback si falla.
* `/api/fomo/modpack-download` — Orquestador de descargas internas para mods compartidos.
* `/api/fomo/youtube-usage` — Métricas de uso de canales rápidas.

#### 6.3.6 Comportamiento UI de FOMO Cloud
* **Header inmersivo**: gradientes y banners de perfil con glassmorphism.
* **Tabs de liquid glass**: navegación fluida entre Pool, Showcases y Clubs.
* **Acciones rápidas desde clubs**: abrir proyectos en Discover o buscar autores directamente del pool.
* **Showcases**: videos de creadores con reproducción integrada y fallback a YouTube.

#### 6.3.7 Seguridad y RLS
* `profiles` — lectura pública, escritura solo por `auth.uid()` propietario.
* `favorite_mods` — lectura pública, escritura autenticada.
* `showcase_videos` — lectura pública, escritura autenticada.
* La experiencia de FOMO está diseñada para continuar aunque el reproductor de showcases falle, mostrando siempre enlaces de fallback a YouTube.

---

## 7. Capa de API (Backend)

Las rutas de API en Next.js actúan como orquestadores de procesos locales y pasarelas a la nube:

* `/api/watcher`: Stream de Server-Sent Events (SSE) que transmite cambios del sistema de archivos en tiempo real.
* `/api/fomo/youtube-showcase`: Ejecuta extracción multimedia en segundo plano mediante `yt-dlp` local y cachea respuestas.
* `/api/fomo/community-rankings`: Retorna los rankings de mods más recomendados calculando frecuencias de `favorite_mods`.
* `/api/tweak`: Recibe datos de hardware para calcular argumentos de máquina virtual de Java (JVM) y presets de FPS optimizados.

---

## 8. Integraciones Externas

### 8.1 Modrinth API (Labrinth v2)
* Conector principal. Permite realizar búsquedas avanzadas y matching exacto mediante hash SHA1 para descargas orquestadas directas del CDN.

### 8.2 CurseForge API (Eternal v1)
* Conector secundario. Resuelve metadatos para mods con descargas bloqueadas a terceros, forzando fallbacks a Modrinth o exponiendo botones de descarga externa de forma elegante.
* **Traductor de Slugs**: Capa de compatibilidad que intercepta consultas nominales (slugs extraídos de YouTube) y las resuelve a IDs numéricos mediante búsquedas invisibles, logrando paridad con Modrinth.

### 8.3 Supabase (Database & Storage)
* Capa comunitaria persistente. Utiliza Row Level Security (RLS) para proteger los perfiles de usuario y almacenamiento de configuraciones de modpacks de forma segura desde el cliente.

---

## 9. Sistemas de Seguridad y Diagnóstico

### 9.1 SAGE Engine & Recovery Core (`lib/intelligence/`)
El sistema interactivo de recuperación de crashes (SAGE) cuenta con las siguientes capacidades:
* **Crash Log Interpreter**: Analizador heurístico de stack traces de Java de Minecraft para encontrar culpables y dependencias faltantes.
* **SAGE ➔ FOMO Bridge**: Permite descargar e instalar dependencias faltantes identificadas en logs con un solo clic.
* **NBT Player Rescue Editor**: Lógica binaria de lectura y escritura NBT (`lib/nbt.ts`) con soporte Gzip nativo para teletransportar jugadores en chunks corruptos, cambiar dimensiones o limpiar inventarios dañados, con copias de seguridad `.mim_bak` garantizadas.
* **Aislamiento de Mundos (Sandboxing)**: Flujo de selección en dos pasos (Selección de mundo -> Selección de jugador) que asegura que la edición del archivo `.dat` se aplica rigurosamente al archivo de origen local sin riesgo de colisiones entre distintos mundos. Las modificaciones NBT se realizan ahora de forma totalmente *inline*, sin usar modales superpuestos, permitiendo modificar claves y tipos directamente en la vista del árbol.

### 9.2 Event Bus y Correlation Engine (`lib/events/`)
El `eventBus.ts` desacopla los distintos módulos funcionales y procesa notificaciones en lote mediante `requestAnimationFrame`:
* **Correlation Engine**: Evalúa relaciones causales entre eventos (ej: una descarga fallida en FOMO sumada a un warning de disco en ALRT gatilla un incidente de almacenamiento consistente).
* **Fingerprinting**: Evita evaluaciones duplicadas de alertas en bucles cerrados mediante expiraciones TTL rápidas de 5 segundos.

### 9.3 TWEAK Engine & Resource Management (`components/tweak/`)
TWEAK es el módulo dedicado a la gestión a bajo nivel de las opciones y configuraciones del cliente de Minecraft sin necesidad de arrancar el juego.
* **Incompatibility Overrides**: El sistema de ordenamiento jerárquico de *Resource Packs* permite a los usuarios agrupar y visualizar jerárquicamente las texturas. Al guardar, MIM fuerza el bypass de restricciones de Vanilla inyectando todos los packs en uso directamente sobre la directiva `incompatibleResourcePacks` en `options.txt`, asegurando que Minecraft cargue los packs incluso si reportan problemas de incompatibilidad de versión de formato (`pack_format`).

---

## 10. Optimizaciones de Performance

* **Bulk Operations**: Agrupación automática de peticiones API de metadatos en lotes de 100 proyectos para reducir llamadas de red en un 99%.
* **SWR Cache Strategy**: Los listados de showcases y búsquedas cacheadas en IndexedDB se muestran de inmediato en la interfaz mientras se realiza una revalidación silenciosa en background.
* **Concurrency Gates**: Las colas de descarga (`SafeDownloader`) limitan la concurrencia a 2 hilos paralelos con retrasos adaptables para evitar bloqueos por rate-limiting (HTTP 429).

---

## 11. Decisiones Técnicas Clave

### 11.1 Showcases como Canal de Descubrimiento (No "Ad-Free YouTube")
Técnica y conceptualmente, MIM trata la reproducción de video de showcases como una **característica secundaria de conveniencia**.
* **Mitigación de Fragilidad**: La app asume que las herramientas de extracción de YouTube (`yt-dlp`) pueden romperse por cambios externos. Por ello, la UI expone botones robustos de fallback ("Abrir en YouTube") y no asocia su core business al consumo directo de streaming, previniendo fallos críticos de experiencia de usuario.

### 11.2 Reorganización Modular v9.3.0
El empaquetado de archivos en directorios temáticos específicos (`components/fomo/community`, `lib/storage`, etc.) en lugar de mantener archivos sueltos de gran tamaño eliminó el acoplamiento circular de imports y redujo la latencia de análisis estático en un 40%, permitiendo a Turbopack compilar a máxima velocidad.

---

*Minecraft Intelligent Manager — Convirtiendo el caos en magia.*
